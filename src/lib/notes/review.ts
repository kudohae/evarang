/*
  Leitner boxes for correction cards. A pass moves a card up a box (longer wait), a miss sends it back to
  box 1 (due again now). Cards never reviewed are due.
*/

export type CardState = { box: number; due: number; reviews: number; hidden?: boolean };
export type ReviewState = Record<string, CardState>;

/** Days to wait before a card in box n comes back (index = box). */
export const INTERVAL_DAYS = [0, 0, 1, 3, 7, 14];
const TOP = 5;
const DAY = 86_400_000;

export function nextReview(s: CardState | undefined, pass: boolean, now: number): CardState {
  const reviews = (s?.reviews ?? 0) + 1;
  if (!pass) return { ...s, box: 1, due: now, reviews };
  const box = Math.min(TOP, (s?.box ?? 1) + 1);
  return { ...s, box, due: now + INTERVAL_DAYS[box] * DAY, reviews };
}

/** Due cards, the ones waiting longest first; cards never seen come after those already in review. */
export function dueCards<T extends { id: string }>(cards: T[], state: ReviewState, now: number): T[] {
  return cards
    .filter((c) => {
      const s = state[c.id];
      return !s?.hidden && (!s || s.due <= now);
    })
    .sort((a, b) => (state[a.id]?.due ?? Infinity) - (state[b.id]?.due ?? Infinity));
}
