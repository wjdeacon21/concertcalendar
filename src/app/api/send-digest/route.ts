import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildDigestHtml, buildDigestText, type DigestShow } from "@/lib/email/digestTemplate";
import { normalizeArtistName } from "@/lib/normalize";

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Authorization
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Accept ?mode=daily or ?mode=weekly (default: weekly)
  const mode = (new URL(request.url).searchParams.get("mode") ?? "weekly") as
    | "daily"
    | "weekly";
  const dayWindow = mode === "daily" ? 1 : 7;

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://watsondeacon.com";
  const from = process.env.DIGEST_FROM ?? "concerts@watsondeacon.com";

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + dayWindow);
  const windowEndStr = windowEnd.toISOString().split("T")[0];

  // Fetch users opted into this digest frequency
  const { data: profiles, error: profilesError } = await serviceClient
    .from("profiles")
    .select("id, email, city_id, digest_preference")
    .eq("digest_preference", mode);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: "no_subscribers" });
  }

  let sent = 0;
  let skipped = 0;

  for (const profile of profiles) {
    if (!profile.email || !profile.city_id) { skipped++; continue; }

    // Paginate through all of this user's artists
    const artistSet = new Set<string>();
    const PAGE_SIZE = 1000;
    let offset = 0;
    while (true) {
      const { data: page } = await serviceClient
        .from("user_artists")
        .select("artists(name)")
        .eq("user_id", profile.id)
        .range(offset, offset + PAGE_SIZE - 1);
      if (!page || page.length === 0) break;
      for (const row of page) {
        const name = (row.artists as unknown as { name: string } | null)?.name;
        if (name) artistSet.add(name);
      }
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    if (artistSet.size === 0) { skipped++; continue; }

    // Fetch upcoming concerts in the window for this city
    const { data: concerts } = await serviceClient
      .from("concerts")
      .select("id, artist_name, venue, date, time, ticket_url, bill, show_id")
      .eq("city_id", profile.city_id)
      .gte("date", todayStr)
      .lt("date", windowEndStr)
      .order("date", { ascending: true });

    if (!concerts || concerts.length === 0) { skipped++; continue; }

    // Match in memory and deduplicate by show_id
    const showMap = new Map<string, {
      matchedArtists: string[];
      rawBill: string[];
      venue: string;
      date: string;
      time: string | null;
      ticket_url: string | null;
    }>();

    for (const c of concerts) {
      if (!artistSet.has(c.artist_name)) continue;
      const key = c.show_id ?? c.id;
      const existing = showMap.get(key);
      if (existing) {
        existing.matchedArtists.push(c.artist_name);
      } else {
        showMap.set(key, {
          matchedArtists: [c.artist_name],
          rawBill: (c.bill as string[] | null) ?? [c.artist_name],
          venue: c.venue,
          date: c.date,
          time: c.time ?? null,
          ticket_url: c.ticket_url ?? null,
        });
      }
    }

    if (showMap.size === 0) { skipped++; continue; }

    const shows: DigestShow[] = Array.from(showMap.values()).map(
      ({ rawBill, matchedArtists, ...rest }) => ({
        ...rest,
        bill: rawBill,
        matchedArtists: matchedArtists.map(normalizeArtistName),
      })
    );

    const unsubscribeUrl = `${appUrl}/unsubscribe?uid=${profile.id}`;
    const subject =
      mode === "daily"
        ? "Tonight in your city"
        : "Your shows this week";

    const { error: sendError } = await resend.emails.send({
      from,
      to: profile.email,
      subject,
      html: buildDigestHtml({ shows, unsubscribeUrl }),
      text: buildDigestText({ shows }),
    });

    if (sendError) {
      console.error(`Failed to send to ${profile.email}:`, sendError);
      skipped++;
    } else {
      sent++;
    }
  }

  return NextResponse.json({ sent, skipped, mode, window_days: dayWindow });
}

export { POST as GET };
