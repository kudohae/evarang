import { ApiError, request } from "@/lib/http";
import { MODELS, type Usage } from "@/lib/models";

/*
  The free model ladder shared by every feature that asks for feedback.
  - A model with no daily quota left is skipped; work restarts on the next one.
  - A model at its per-minute limit before any of this work came back hands the work to the next model.
  - Once some work came back, a per-minute limit is waited out on the same model, so one result never mixes graders.
  - When every model still up is at its per-minute limit, the work waits in line on the best of them.
*/

const RATE_RETRIES = 4;
const LIGHT_START = "gemini-3.5-flash-lite";

class LadderSignal extends Error {
  readonly cause: ApiError;
  constructor(cause: ApiError) {
    super(cause.message);
    this.cause = cause;
  }
}

/** The model has no free quota left today. */
export class OutForToday extends LadderSignal {}
/** The model is at its per-minute limit and nothing has come back from it yet. */
export class BusyNow extends LadderSignal {}
/** The member's own usage allowance is spent; no other model will help. */
export class QuotaReached extends LadderSignal {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `spill` says whether a per-minute limit should hand the work to another model (true) or be waited out (false). */
export async function postFeedback<T>(path: string, body: unknown, spill: () => boolean, headers?: HeadersInit): Promise<T & { usage: Usage }> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request<T & { usage: Usage }>(path, { method: "POST", json: body, headers });
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.kind === "quota") throw new QuotaReached(e);
      if (e.kind === "daily") throw new OutForToday(e);
      if (e.kind === "rate" && spill()) throw new BusyNow(e);
      // Per-minute limits clear quickly, so wait as long as the provider asks.
      if (e.kind === "rate" && attempt < RATE_RETRIES) {
        await sleep(Math.min(Math.max(e.retryAfter ?? 15, 3), 60) * 1000);
        continue;
      }
      throw e;
    }
  }
}

/** Models to try, in order. Light work starts at Flash-Lite and never spends the bigger models' small quotas. */
function ladder(available: string[], weight: "full" | "light"): string[] {
  const ids = MODELS.map((m) => m.id);
  const from = weight === "light" ? Math.max(0, ids.indexOf(LIGHT_START)) : 0;
  return ids.slice(from).filter((id) => available.includes(id));
}

export async function runOnLadder<T>(
  available: string[],
  weight: "full" | "light",
  run: (modelId: string, mayHandOff: boolean) => Promise<T>,
): Promise<T> {
  const busy: string[] = [];
  for (const id of ladder(available, weight)) {
    try {
      return await run(id, true);
    } catch (e) {
      if (e instanceof BusyNow) busy.push(id);
      else if (!(e instanceof OutForToday)) throw e;
    }
  }
  for (const id of busy) {
    try {
      return await run(id, false);
    } catch (e) {
      if (!(e instanceof OutForToday)) throw e;
    }
  }
  throw new Error("오늘 쓸 수 있는 무료 평가 한도를 모두 썼습니다. 한도는 매일 오후 4시(11월~3월은 오후 5시)에 다시 채워집니다.");
}

/** Runs tasks with at most `limit` in flight; the first failure stops the rest. */
export async function pool(tasks: (() => Promise<void>)[], limit: number): Promise<void> {
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      try {
        while (queue.length) await queue.shift()!();
      } catch (e) {
        queue.length = 0; // stop the other workers from spending quota on a run that will be thrown away
        throw e;
      }
    }),
  );
}

/** Up to 8 answers per request, in evenly sized batches: 15 → 8 + 7, 12 → 6 + 6. */
export const MAX_BATCH = 8;

export function split<T>(items: T[]): T[][] {
  const count = Math.ceil(items.length / MAX_BATCH);
  const size = Math.ceil(items.length / count);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
