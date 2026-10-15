"use client";

import { accountDocs } from "@/lib/docs/account";
import { localDocs } from "@/lib/docs/local";
import { pushDoc } from "@/lib/docs/sync";
import { mergeReviewState, type ReviewState } from "@/lib/notes/review";

/*
  The note review state is one document edited on every device, so plain "later copy wins" would throw away
  reviews made elsewhere. It is merged card by card with the account copy on load and before every send.
*/

const ID = "reviewstate";
type NoteDoc = { cards: ReviewState };

async function local(): Promise<ReviewState> {
  return (await localDocs.get<NoteDoc>("note", ID).catch(() => undefined))?.data?.cards ?? {};
}

/** `accountOk`: the account copy was read (or sync is off). When false, saves stay in this browser. */
export async function loadReviewState(keep: boolean): Promise<{ state: ReviewState; accountOk: boolean }> {
  const here = await local();
  if (!keep) return { state: here, accountOk: true };
  try {
    const remote = await accountDocs.get<NoteDoc>("note", ID);
    return { state: mergeReviewState(here, remote?.data?.cards ?? {}), accountOk: true };
  } catch {
    return { state: here, accountOk: false };
  }
}

/** Saves here; with sync on and the account readable, merges with the account copy and sends the result. */
export async function saveReviewState(state: ReviewState, o: { keep: boolean; accountOk: boolean; audio: boolean }): Promise<ReviewState> {
  await localDocs.put("note", ID, { cards: state });
  if (!o.keep || !o.accountOk) return state;
  let merged = state;
  try {
    const remote = await accountDocs.get<NoteDoc>("note", ID);
    merged = mergeReviewState(state, remote?.data?.cards ?? {});
  } catch {
    return state;
  }
  await localDocs.put("note", ID, { cards: merged });
  await pushDoc("note", ID, { audio: o.audio });
  return merged;
}
