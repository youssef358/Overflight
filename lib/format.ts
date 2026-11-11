// Dates in the reader's own language and time zone, e.g. "11 Nov 2026, 16:02".
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
