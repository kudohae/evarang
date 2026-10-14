"use client";

import type { Doc, DocKind } from "@/lib/docs/kinds";
import { ApiError, request } from "@/lib/http";

/* The member's account copies, over /api/me/docs. Errors come back as ApiError. */

export type RemoteSummary = { id: string; updatedAt: number; deletedAt?: number; summary: Record<string, unknown> };

const path = (kind: DocKind, id: string) => `/api/me/docs/${kind}/${encodeURIComponent(id)}`;

export const accountDocs = {
  async list(kind: DocKind): Promise<RemoteSummary[]> {
    return (await request<{ docs: RemoteSummary[] }>(`/api/me/docs?kind=${kind}`, { cache: "no-store" })).docs;
  },

  /** null when the account has no such document or nobody is signed in. */
  async get<T = unknown>(kind: DocKind, id: string): Promise<(Doc<T> & { audio: string[] }) | null> {
    try {
      return await request<Doc<T> & { audio: string[] }>(path(kind, id), { cache: "no-store" });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 401)) return null;
      throw e;
    }
  },

  /** A 409 ApiError carries the account's newer copy in `body.doc`. */
  async put(kind: DocKind, id: string, doc: { updatedAt: number; data: unknown }): Promise<void> {
    await request(path(kind, id), { method: "PUT", json: doc });
  },

  async remove(kind: DocKind, id: string): Promise<void> {
    await request(path(kind, id), { method: "DELETE" });
  },

  /** A 503 ApiError means this server has no recording store. */
  async putAudio(kind: DocKind, id: string, key: string, blob: Blob): Promise<void> {
    await request(`${path(kind, id)}/audio/${key}`, { method: "PUT", body: blob, headers: { "content-type": blob.type || "audio/webm" } });
  },

  async getAudio(kind: DocKind, id: string, key: string): Promise<Blob | undefined> {
    const res = await fetch(`${path(kind, id)}/audio/${key}`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return undefined;
    const blob = await res.blob();
    return blob.size ? blob : undefined;
  },

  async setRecordsConsent(agree: boolean): Promise<void> {
    await request("/api/me/records-consent", { method: "POST", json: { agree } });
  },
};
