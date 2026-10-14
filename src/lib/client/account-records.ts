"use client";

import { getAudio, putAudio } from "@/lib/client/db";
import type { ExamResult } from "@/lib/exam/result";

/*
  The account copy of a test, for members who turned it on.
  The browser stays the working copy; the account copy follows it, so another device can open the same report.
*/

export type AccountExam = {
  id: string;
  createdAt: string;
  startLevel: number | null;
  finalLevel: number | null;
  questionCount: number | null;
  grade: string | null;
  model: string | null;
};

async function failure(res: Response, fallback: string): Promise<Error> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(data.error ?? `${fallback} (${res.status})`);
}

/** What the account copy holds; unchanged results are not re-sent. */
export function accountSignature(r: ExamResult): string {
  return [r.evaluations.length, r.actualGrade ?? "", r.answers.filter((a) => a.transcript).length, r.finalLevel].join("|");
}

/** Sends the record, then any recordings not yet uploaded. Returns the new bookkeeping; never throws. */
export async function syncToAccount(r: ExamResult): Promise<NonNullable<ExamResult["account"]>> {
  const account = { uploaded: [...(r.account?.uploaded ?? [])], signature: r.account?.signature, syncedAt: r.account?.syncedAt, error: undefined as string | undefined };
  try {
    // Local bookkeeping (the research secret among it) stays in this browser.
    const { research: _r, account: _a, ...record } = r;
    void _r;
    void _a;
    const res = await fetch(`/api/me/exams/${r.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ result: record }) });
    if (!res.ok) throw await failure(res, "저장 실패");

    for (const a of r.answers) {
      if (account.uploaded.includes(a.number)) continue;
      const blob = await getAudio(a.audioKey).catch(() => undefined);
      // Nothing recorded, or the recording lives only in the account already.
      if (!blob?.size) continue;
      const up = await fetch(`/api/me/exams/${r.id}/audio/${a.number}`, { method: "PUT", body: blob, headers: { "content-type": blob.type || "audio/webm" } });
      // No recording store on this server: keep the record, skip the audio, try again on a later sync.
      if (up.status === 503) break;
      if (!up.ok) throw await failure(up, "녹음 저장 실패");
      account.uploaded.push(a.number);
    }
    account.signature = accountSignature(r);
    account.syncedAt = Date.now();
  } catch (e) {
    account.error = (e as Error).message;
  }
  return account;
}

export async function listAccountExams(): Promise<AccountExam[]> {
  const res = await fetch("/api/me/exams", { cache: "no-store" });
  if (!res.ok) throw await failure(res, "기록을 불러오지 못했습니다");
  return ((await res.json()) as { exams: AccountExam[] }).exams;
}

/** A test that is not in this browser, loaded from the account. */
export async function loadFromAccount(id: string): Promise<ExamResult | null> {
  const res = await fetch(`/api/me/exams/${id}`, { cache: "no-store" });
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) throw await failure(res, "기록을 불러오지 못했습니다");
  const { data, audio } = (await res.json()) as { data: ExamResult; audio: number[] };
  const r: ExamResult = { ...data, account: { uploaded: audio, syncedAt: Date.now() } };
  return { ...r, account: { ...r.account!, signature: accountSignature(r) } };
}

export async function deleteFromAccount(id: string): Promise<void> {
  const res = await fetch(`/api/me/exams/${id}`, { method: "DELETE" });
  if (!res.ok) throw await failure(res, "삭제 실패");
}

export async function setRecordsConsent(agree: boolean): Promise<void> {
  const res = await fetch("/api/me/records-consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agree }) });
  if (!res.ok) throw await failure(res, "설정을 바꾸지 못했습니다");
}

/**
 * A recording by its local key ("<examId>:<n>"). Looks in this browser first, then in the account,
 * and keeps a fetched copy here for next time.
 */
export async function loadRecording(audioKey: string): Promise<Blob | undefined> {
  const local = await getAudio(audioKey).catch(() => undefined);
  if (local?.size) return local;
  const [examId, n] = audioKey.split(":");
  if (!examId || !n) return undefined;
  const res = await fetch(`/api/me/exams/${examId}/audio/${n}`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return undefined;
  const blob = await res.blob();
  if (!blob.size) return undefined;
  await putAudio(audioKey, blob).catch(() => {});
  return blob;
}
