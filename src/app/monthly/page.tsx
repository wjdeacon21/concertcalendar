import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeArtistName } from "@/lib/normalize";
import MonthlyCalendar, { type MonthlyShow } from "@/components/MonthlyCalendar";
import ViewToggle from "@/components/ViewToggle";

export default async function MonthlyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const today = new Date().toISOString().split("T")[0];

  // Fetch 6 months of matched concerts so the client can navigate freely
  const sixMonthsOut = new Date();
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);
  const endDate = sixMonthsOut.toISOString().split("T")[0];

  const { data: rows } = await supabase
    .from("concerts")
    .select("id, artist_name, venue, date, time, ticket_url, bill, show_id, user_concert_matches!inner(user_id)")
    .eq("user_concert_matches.user_id", user.id)
    .gte("date", today)
    .lte("date", endDate)
    .order("date", { ascending: true });

  // Deduplicate by show_id, collecting matched artists per show
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

  // Compute isMatch flags and group by date
  const showsByDate: Record<string, MonthlyShow[]> = {};

  for (const { rawBill, matchedArtists, ...rest } of showMap.values()) {
    const show: MonthlyShow = {
      ...rest,
      bill: rawBill.map((name) => ({
        name,
        isMatch: matchedArtists.includes(normalizeArtistName(name)),
      })),
    };
    if (!showsByDate[show.date]) showsByDate[show.date] = [];
    showsByDate[show.date].push(show);
  }

  return (
    <div>
      <ViewToggle />
      <div className="mt-8">
        <MonthlyCalendar showsByDate={showsByDate} />
      </div>
    </div>
  );
}
