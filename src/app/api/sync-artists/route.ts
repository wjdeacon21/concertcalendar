import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeArtistName } from "@/lib/normalize";

async function refreshSpotifyToken(refreshToken: string): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error("token_refresh_failed");

  const data = await res.json();
  return data.access_token as string;
}

async function fetchAllLikedArtists(accessToken: string): Promise<string[]> {
  const artistNames = new Set<string>();
  let url: string | null = "https://api.spotify.com/v1/me/tracks?limit=50";

  while (url) {
    const currentUrl: string = url;
    const res: Response = await fetch(currentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error("spotify_unauthorized");
      throw new Error(`spotify_error_${res.status}`);
    }

    const data: { items?: { track?: { artists?: { name?: string }[] } }[]; next?: string | null } =
      await res.json();

    for (const item of data.items ?? []) {
      for (const artist of item.track?.artists ?? []) {
        if (artist.name) {
          artistNames.add(normalizeArtistName(artist.name));
        }
      }
    }

    url = data.next ?? null;
  }

  return Array.from(artistNames);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get session (for Spotify provider token) + verified user
  const [{ data: { session } }, { data: { user }, error: userError }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accessToken = session?.provider_token;
  if (!accessToken) {
    return NextResponse.json({ error: "no_spotify_token" }, { status: 401 });
  }

  const userId = user.id;

  // Fetch all liked song artists from Spotify, refreshing the token once if needed
  let artistNames: string[];
  try {
    artistNames = await fetchAllLikedArtists(accessToken);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "spotify_unauthorized") {
      const refreshToken = session?.provider_refresh_token;
      if (!refreshToken) {
        return NextResponse.json({ error: "spotify_token_expired" }, { status: 401 });
      }
      try {
        const newAccessToken = await refreshSpotifyToken(refreshToken);
        artistNames = await fetchAllLikedArtists(newAccessToken);
      } catch {
        return NextResponse.json({ error: "spotify_token_expired" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (artistNames.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // Use service-role client for writes (bypasses RLS for artist/user_artist inserts)
  const { createClient: createServiceClient } = await import("@supabase/supabase-js");
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upsert all artists
  const { data: upsertedArtists, error: artistError } = await serviceClient
    .from("artists")
    .upsert(
      artistNames.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: false }
    )
    .select("id, name");

  if (artistError) {
    return NextResponse.json({ error: artistError.message }, { status: 500 });
  }

  if (!upsertedArtists || upsertedArtists.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // Insert user_artist links
  const userArtistRows = upsertedArtists.map((artist) => ({
    user_id: userId,
    artist_id: artist.id,
  }));

  const { error: linkError } = await serviceClient
    .from("user_artists")
    .upsert(userArtistRows, { onConflict: "user_id,artist_id", ignoreDuplicates: true });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // Immediately run matching for this user so new concerts appear without delay
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const matchUrl = new URL("/api/match-concerts", request.url);
    try {
      await fetch(matchUrl.toString(), {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
    } catch {
      // non-fatal: sync succeeded, matching will run on next cron tick
    }
  }

  return NextResponse.json({ count: upsertedArtists.length });
}
