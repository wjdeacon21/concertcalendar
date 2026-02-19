export interface DigestShow {
  bill: string[];          // display names, full cast
  matchedArtists: string[]; // normalized names that matched this user
  venue: string;
  date: string;            // YYYY-MM-DD
  time: string | null;
  ticket_url: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatBill(bill: string[], matchedArtists: Set<string>): string {
  return bill
    .map((name) => {
      const normalized = name.toLowerCase().trim().replace(/^the\s+/i, "");
      const isMatch = matchedArtists.has(normalized);
      return isMatch
        ? `<strong style="color:#2F4F3F;">${name}</strong>`
        : `<span style="color:#888;">${name}</span>`;
    })
    .join('<span style="color:#bbb;"> + </span>');
}

export function buildDigestHtml({
  shows,
  unsubscribeUrl,
}: {
  shows: DigestShow[];
  unsubscribeUrl: string;
}): string {
  // Group shows by date
  const byDate = new Map<string, DigestShow[]>();
  for (const show of shows) {
    const group = byDate.get(show.date) ?? [];
    group.push(show);
    byDate.set(show.date, group);
  }

  const dateBlocks = Array.from(byDate.entries())
    .map(([date, dateShows]) => {
      const cards = dateShows
        .map((show) => {
          const matchedSet = new Set(show.matchedArtists);
          const billHtml = formatBill(show.bill, matchedSet);
          const timeStr = show.time ? ` &middot; ${show.time}` : "";
          const ticketLink = show.ticket_url
            ? `<a href="${show.ticket_url}" style="display:inline-block;margin-top:10px;font-size:12px;color:#2F4F3F;text-decoration:none;border:1px solid #2F4F3F;border-radius:20px;padding:4px 12px;">Get tickets</a>`
            : "";

          return `
            <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:10px;border:1px solid #e8e2d9;">
              <p style="margin:0;font-size:16px;font-family:Georgia,serif;color:#2A2A2A;line-height:1.4;">${billHtml}</p>
              <p style="margin:6px 0 0;font-size:13px;color:#888;font-family:system-ui,sans-serif;">${show.venue}${timeStr}</p>
              ${ticketLink}
            </div>`;
        })
        .join("");

      return `
        <div style="margin-bottom:32px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#999;font-family:system-ui,sans-serif;">${formatDate(date)}</p>
          ${cards}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your upcoming shows</title>
</head>
<body style="margin:0;padding:0;background:#F6F2EA;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F2EA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:22px;font-family:Georgia,serif;font-weight:500;color:#2F4F3F;">Concert Calendar</p>
              <p style="margin:6px 0 0;font-size:14px;color:#888;">Your upcoming shows</p>
            </td>
          </tr>

          <!-- Shows -->
          <tr>
            <td>${dateBlocks}</td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;border-top:1px solid #e0d9ce;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You're getting this because you connected Spotify to Concert Calendar.
                <br />
                <a href="${unsubscribeUrl}" style="color:#aaa;">Manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDigestText({ shows }: { shows: DigestShow[] }): string {
  const byDate = new Map<string, DigestShow[]>();
  for (const show of shows) {
    const group = byDate.get(show.date) ?? [];
    group.push(show);
    byDate.set(show.date, group);
  }

  const lines: string[] = ["Your upcoming shows\n"];

  for (const [date, dateShows] of byDate.entries()) {
    lines.push(formatDate(date));
    for (const show of dateShows) {
      const bill = show.bill.join(" + ");
      const time = show.time ? ` · ${show.time}` : "";
      lines.push(`  ${bill} @ ${show.venue}${time}`);
      if (show.ticket_url) lines.push(`  Tickets: ${show.ticket_url}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
