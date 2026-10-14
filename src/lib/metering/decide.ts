/**
 * Whether work of `units` may run today, given what was already used.
 * Work for a reference already counted today (a retry, the next batch of the same test, another model) is
 * not counted again, so it always passes while the action has any free allowance at all.
 */
export function decide(usedToday: number, units: number, free: number, alreadyCounted: boolean): { ok: boolean; remaining: number } {
  const left = Math.max(0, free - usedToday);
  if (free <= 0) return { ok: false, remaining: 0 };
  if (alreadyCounted) return { ok: true, remaining: left };
  if (usedToday + units > free) return { ok: false, remaining: left };
  return { ok: true, remaining: left - units };
}
