export interface BillItem {
  name: string;
  isMatch: boolean;
}

export interface ConcertCardProps {
  bill: BillItem[];
  venue: string;
  time: string | null;
  ticket_url: string | null;
}

export default function ConcertCard({ bill, venue, time, ticket_url }: ConcertCardProps) {
  const inner = (
    <div
      className="
        min-h-[44px] rounded-xl border border-charcoal/10 bg-cream p-6
        shadow-sm ring-1 ring-charcoal/5
        transition-all duration-200 ease-in-out
        group-hover:-translate-y-0.5 group-hover:shadow-md
      "
    >
      {/* Bill */}
      <p className="font-serif text-lg font-medium leading-snug text-charcoal">
        {bill.map((item, i) => (
          <span key={i}>
            {i > 0 && <span className="text-charcoal/35"> + </span>}
            {item.isMatch ? (
              <strong className="font-semibold text-charcoal">{item.name}</strong>
            ) : (
              <span className="text-charcoal/55">{item.name}</span>
            )}
          </span>
        ))}
      </p>

      {/* Venue · time */}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 font-sans text-sm text-charcoal/60">
        <span>{venue}</span>
        {time && (
          <>
            <span className="text-charcoal/30">·</span>
            <span>{time}</span>
          </>
        )}
      </p>
    </div>
  );

  if (ticket_url) {
    return (
      <a
        href={ticket_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        aria-label={`${bill.map((b) => b.name).join(" + ")} at ${venue}${time ? `, ${time}` : ""}`}
      >
        {inner}
      </a>
    );
  }

  return <div className="group">{inner}</div>;
}
