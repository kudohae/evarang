/* How close a spoken attempt came to the corrected sentence, word by word. No AI involved. */

const FILLERS = new Set(["um", "uh", "er", "erm", "hmm", "uhm", "ah"]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLERS.has(w));
}

/** Share of the target's words said in order (longest common subsequence / target length), 0–1. */
export function sayScore(said: string, target: string): number {
  const a = words(said);
  const b = words(target);
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length] / b.length;
}

/**
 * Right when most of the target was said in order and, given the original mistake (`before`), every word
 * the correction introduced is there.
 */
export function saidRight(said: string, target: string, before = ""): boolean {
  const spoken = new Set(words(said));
  const old = new Set(words(before));
  const fixes = before ? words(target).filter((w) => !old.has(w)) : [];
  return sayScore(said, target) >= 0.8 && fixes.every((w) => spoken.has(w));
}

/** The target's words, each marked with whether it was said (in order, by the same LCS as sayScore). */
export function wordDiff(said: string, target: string): { word: string; said: boolean }[] {
  const shown = target.split(/\s+/).filter(Boolean);
  const a = words(said);
  const b = shown.map((w) => words(w)[0] ?? "");
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] && b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Array<boolean>(b.length).fill(false);
  for (let i = a.length, j = b.length; i > 0 && j > 0; ) {
    if (a[i - 1] === b[j - 1] && b[j - 1]) {
      hit[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return shown.map((word, j) => ({ word, said: hit[j] || !b[j] }));
}
