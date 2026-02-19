import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeArtistName } from "@/lib/normalize";
import SyncPrompt from "./SyncPrompt";
import DateHeader from "@/components/DateHeader";
import ConcertCard, { type BillItem } from "@/components/ConcertCard";
import ViewToggle from "@/components/ViewToggle";

interface Show {
  show_id: string;
  bill: BillItem[];
  venue: string;
  date: string;
  time: string | null;
  ticket_url: string | null;
}

export default async function WeeklyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Check whether artist sync has run yet
  const { count } = await supabase
    .from("user_artists")
    .select("artist_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) === 0) return <SyncPrompt />;

  const today = new Date().toISOString().split("T")[0];

  // Fetch all matched concerts via inner join, sorted by date
  const { data: rows } = await supabase
    .from("concerts")
    .select("id, artist_name, venue, date, time, ticket_url, bill, show_id, user_concert_matches!inner(user_id)")
    .eq("user_concert_matches.user_id", user.id)
    .gte("date", today)
    .order("date", { ascending: true });

  // Deduplicate by show_id, collecting all matched artist_names per show
  const showMap = new Map<string, {
    show_id: string;
    rawBill: string[];
    venue: string;
    date: string;
    time: string | null;
    ticket_url: string | null;
    matchedArtists: string[];
  }>();

  for (const row of rows ?? []) {
    const key = row.show_id ?? row.id;
    const existing = showMap.get(key);
    if (existing) {
      existing.matchedArtists.push(row.artist_name);
    } else {
      showMap.set(key, {
        show_id: key,
        rawBill: (row.bill as string[] | null) ?? [row.artist_name],
        venue: row.venue,
        date: row.date,
        time: row.time ?? null,
        ticket_url: row.ticket_url ?? null,
        matchedArtists: [row.artist_name],
      });
    }
  }

  // Build final show list with pre-computed bill highlight flags
  const shows: Show[] = Array.from(showMap.values()).map(
    ({ rawBill, matchedArtists, ...rest }) => ({
      ...rest,
      bill: rawBill.map((name) => ({
        name,
        isMatch: matchedArtists.includes(normalizeArtistName(name)),
      })),
    })
  );

  // Group by date (rows already sorted by date from Supabase)
  const byDate = new Map<string, Show[]>();
  for (const show of shows) {
    const group = byDate.get(show.date) ?? [];
    group.push(show);
    byDate.set(show.date, group);
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (byDate.size === 0) {
    return (
      <div>
        <ViewToggle />
        <div className="flex min-h-[40vh] items-center justify-center text-center">
          <p className="font-serif text-xl text-charcoal/55">
            Nothing this week. Time to rest your ears.
          </p>
        </div>
      </div>
    );
  }

  // ── Concerts list ─────────────────────────────────────────────────────────
  const dateEntries = Array.from(byDate.entries());

  return (
    <div>
      <ViewToggle />
      <div className="mt-8">
        {dateEntries.map(([date, dateShows], i) => (
          <section key={date}>
            <DateHeader date={date} isFirst={i === 0} />
            <div className="space-y-3">
              {dateShows.map((show) => (
                <ConcertCard
                  key={show.show_id}
                  bill={show.bill}
                  venue={show.venue}
                  time={show.time}
                  ticket_url={show.ticket_url}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
