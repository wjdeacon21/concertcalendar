import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";
import { normalizeArtistName } from "@/lib/normalize";

const OMR_URL = "https://www.ohmyrockness.com/shows?all=true";
const OMR_ORIGIN = "https://www.ohmyrockness.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawShow {
  artists: string[];
  date: string;       // YYYY-MM-DD
  time: string;       // "07:00 PM"
  venue: string;
  showUrl: string | null;
}

interface ConcertRow {
  artist_name: string;
  venue: string;
  date: string;
  time: string | null;
  ticket_url: string | null;
  source_id: string;
  city_id: string;
  bill: string[];
  show_id: string;
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

async function scrapeShows(): Promise<RawShow[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--ignore-certificate-errors",
    ],
    timeout: 30000,
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    await page.goto(OMR_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector(".row.vevent", { timeout: 15000 });

    // Extraction runs in browser context — no Node variables accessible here
    const rawShows = await page.$$eval(".row.vevent", (rows) =>
      rows.map((row) => {
        // Artists: actual performers only (no-class or non-profiled anchors)
        const artistEls = Array.from(
          row.querySelectorAll(".bands.summary a")
        ).filter((a) => {
          const cls = (a as HTMLAnchorElement).className.trim();
          return cls === "" || cls === "non-profiled" || cls.split(/\s+/).includes("non-profiled");
        });

        const artists = artistEls
          .map((a) => a.textContent?.trim() ?? "")
          .filter(Boolean);

        // ISO datetime from .value-title title attribute
        const datetimeAttr =
          row.querySelector(".value-title")?.getAttribute("title") ?? "";

        // Venue name
        const venue =
          row.querySelector(".fn.org")?.textContent?.trim() ?? "Unknown Venue";

        // Show URL: hCard .url first, then first anchor in row
        const rawHref =
          row.querySelector("a.url")?.getAttribute("href") ??
          row.querySelector("a")?.getAttribute("href") ??
          null;

        return { artists, datetimeAttr, venue, rawHref };
      })
    );

    // Post-process in Node context
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shows: RawShow[] = [];

    for (const raw of rawShows) {
      if (raw.artists.length === 0 || !raw.datetimeAttr) continue;

      // Date portion from ISO string (already NYC-local from OMR)
      const datePart = raw.datetimeAttr.split("T")[0];
      if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) continue;

      // Drop past shows
      if (new Date(datePart + "T00:00:00") < today) continue;

      const dt = new Date(raw.datetimeAttr);
      const time = !isNaN(dt.getTime())
        ? dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : "";

      const showUrl = raw.rawHref
        ? raw.rawHref.startsWith("http")
          ? raw.rawHref
          : `${OMR_ORIGIN}${raw.rawHref}`
        : null;

      shows.push({
        artists: raw.artists,
        date: datePart,
        time,
        venue: raw.venue,
        showUrl,
      });
    }

    return shows;
  } finally {
    await browser.close();
  }
}

// ─── Transformation ───────────────────────────────────────────────────────────

function buildConcertRows(shows: RawShow[], cityId: string): ConcertRow[] {
  const seen = new Map<string, ConcertRow>();

  for (const show of shows) {
    for (const rawArtist of show.artists) {
      const artistName = normalizeArtistName(rawArtist);
      if (!artistName) continue;

      // Deterministic source_id — idempotent across repeated ingestion runs
      const venuePart = show.venue
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 30);
      const artistPart = artistName
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 40);
      const sourceId = `omr:${artistPart}:${venuePart}:${show.date}`;
      const showId = `omr:${venuePart}:${show.date}`;

      if (!seen.has(sourceId)) {
        seen.set(sourceId, {
          artist_name: artistName,
          venue: show.venue,
          date: show.date,
          time: show.time || null,
          ticket_url: show.showUrl,
          source_id: sourceId,
          city_id: cityId,
          bill: show.artists,
          show_id: showId,
        });
      }
    }
  }

  return Array.from(seen.values());
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  // Resolve NYC city_id
  const { data: cityRow, error: cityError } = await serviceClient
    .from("cities")
    .select("id")
    .eq("name", "New York City")
    .single();

  if (cityError || !cityRow) {
    return NextResponse.json({ error: "nyc_city_not_found" }, { status: 500 });
  }

  // Scrape
  let shows: RawShow[];
  try {
    shows = await scrapeShows();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "scrape_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (shows.length === 0) {
    return NextResponse.json({ count: 0, message: "no_upcoming_shows" });
  }

  // Build rows — one per artist per show
  const concertRows = buildConcertRows(shows, cityRow.id);

  // Upsert in batches to stay within Supabase payload limits
  const BATCH_SIZE = 500;
  let totalUpserted = 0;

  for (let i = 0; i < concertRows.length; i += BATCH_SIZE) {
    const batch = concertRows.slice(i, i + BATCH_SIZE);

    const { error: upsertError } = await serviceClient
      .from("concerts")
      .upsert(batch, { onConflict: "source_id", ignoreDuplicates: false });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    totalUpserted += batch.length;
  }

  // Chain into matching so new concerts are immediately linked to users
  const matchUrl = new URL("/api/match-concerts", request.url);
  const matchRes = await fetch(matchUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const matchData = matchRes.ok ? await matchRes.json() : { error: "match_failed" };

  return NextResponse.json({
    concerts: totalUpserted,
    shows: shows.length,
    matches: matchData,
  });
}

export { POST as GET };
