import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  // Authorization
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all user profiles (id + city_id)
  const { data: profiles, error: profilesError } = await serviceClient
    .from("profiles")
    .select("id, city_id");

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ count: 0, message: "no_users" });
  }

  const today = new Date().toISOString().split("T")[0];
  let totalMatches = 0;

  for (const profile of profiles) {
    if (!profile.city_id) continue;

    // Paginate through user_artists to build the full artist name set.
    // Supabase returns at most 1000 rows per request, so users with large
    // Spotify libraries require multiple pages.
    const artistSet = new Set<string>();
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (true) {
      const { data: page, error: pageError } = await serviceClient
        .from("user_artists")
        .select("artists(name)")
        .eq("user_id", profile.id)
        .range(offset, offset + PAGE_SIZE - 1);

      if (pageError || !page || page.length === 0) break;

      for (const row of page) {
        const name = (row.artists as { name: string } | null)?.name;
        if (name) artistSet.add(name);
      }

      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    if (artistSet.size === 0) continue;

    // Fetch all upcoming concerts for this city — typically a few hundred rows,
    // so loading them all is fine. Matching in memory avoids the URL-length
    // limit that a large .in() filter would hit.
    const { data: upcomingConcerts, error: concertsError } = await serviceClient
      .from("concerts")
      .select("id, artist_name")
      .eq("city_id", profile.city_id)
      .gte("date", today);

    if (concertsError || !upcomingConcerts || upcomingConcerts.length === 0) continue;

    const matchingIds = upcomingConcerts
      .filter((c) => artistSet.has(c.artist_name))
      .map((c) => c.id);

    if (matchingIds.length === 0) continue;

    // Upsert matches — ON CONFLICT DO NOTHING via ignoreDuplicates
    const matchRows = matchingIds.map((concert_id) => ({
      user_id: profile.id,
      concert_id,
    }));

    const { error: matchError } = await serviceClient
      .from("user_concert_matches")
      .upsert(matchRows, { onConflict: "user_id,concert_id", ignoreDuplicates: true });

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    totalMatches += matchRows.length;
  }

  return NextResponse.json({ count: totalMatches });
}

export { POST as GET };
