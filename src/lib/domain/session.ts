import type { Attempt } from "@/lib/domain/attempt";

/** A practice sitting outside the mock test. Mock tests stay ExamResult and are read through from-exam. */
export type SessionKind = "drill" | "structure" | "review" | "story-drill";

export type Session = {
  id: string;
  kind: SessionKind;
  createdAt: number;
  /** For lists: what was practised ("과거 경험 · 여행"). */
  title?: string;
  /** Shape is owned by each feature. */
  settings: Record<string, unknown>;
  attempts: Attempt[];
};
