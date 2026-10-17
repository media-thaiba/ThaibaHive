/**
 * Local calendar-date helpers for attendance day bucketing.
 *
 * `new Date().toISOString().split("T")[0]` yields the UTC day, which is
 * yesterday for anyone checking in between midnight and 05:30 IST — shift
 * resolution and late calculations are local-time based, so day bucketing
 * must be too.
 */
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
