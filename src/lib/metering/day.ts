/* Usage days run midnight to midnight Korean time (UTC+9, no daylight saving). */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Korean calendar date of a moment, as "YYYY-MM-DD". */
export function kstDay(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The next 00:00 in Korea after `at`, when free allowances refill. */
export function nextKstMidnight(at: Date): Date {
  const startOfDay = Date.parse(`${kstDay(at)}T00:00:00Z`) - KST_OFFSET_MS;
  return new Date(startOfDay + DAY_MS);
}
