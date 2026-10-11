"use client";

import { getAudio } from "@/lib/client/db";
import type { ExamResult } from "@/lib/exam/result";

export function newSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function wantsResearch(r: ExamResult): boolean {
  return Boolean(r.consent?.research && r.research && !r.research.deleted);
}

/** A fingerprint of what the research copy holds, so unchanged results are not re-sent. */
export function researchSignature(r: ExamResult): string {
  return [r.evaluations.length, r.actualGrade ?? "", r.answers.filter((a) => a.transcript).length].join("|");
}

/**
 * Sends the research copy: the record first, then any recordings not yet uploaded.
 * Returns the updated bookkeeping; never throws.
 */
export async function syncResearch(r: ExamResult): Promise<NonNullable<ExamResult["research"]>> {
  const research = { ...r.research!, uploaded: [...r.research!.uploaded] };
  try {
    // Local bookkeeping (and the secret inside it) is not part of the stored record.
    const { research: _local, ...record } = r;
    void _local;
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: r.id, secret: research.secret, consentVersion: r.consent!.version, result: record }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `저장 실패 (${res.status})`);

    for (const a of r.answers) {
      if (research.uploaded.includes(a.number)) continue;
      const blob = await getAudio(a.audioKey);
      if (!blob?.size) {
        research.uploaded.push(a.number);
        continue;
      }
      const up = await fetch(`/api/records/${r.id}/audio/${a.number}`, {
        method: "PUT",
        body: blob,
        headers: { "content-type": blob.type || "audio/webm", "x-record-secret": research.secret },
      });
      if (!up.ok) throw new Error((await up.json().catch(() => ({}))).error ?? `녹음 저장 실패 (${up.status})`);
      research.uploaded.push(a.number);
    }
    research.syncedAt = Date.now();
    research.error = undefined;
  } catch (e) {
    research.error = (e as Error).message;
  }
  return research;
}

export async function deleteResearch(r: ExamResult): Promise<void> {
  const res = await fetch(`/api/records/${r.id}`, { method: "DELETE", headers: { "x-record-secret": r.research?.secret ?? "" } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `삭제 실패 (${res.status})`);
}
