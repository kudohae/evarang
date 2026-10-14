import type { OverallFeedback, QuestionFeedback } from "@/lib/feedback/schema";
import type { Usage } from "@/lib/models";
import type { Adjustment, AnswerRecord, ExamQuestion, Grade, Level, SurveyAnswers } from "@/lib/types";

export type Evaluation = {
  id: string;
  modelId: string;
  createdAt: number;
  overall?: OverallFeedback;
  questions: QuestionFeedback[];
  usage: Usage;
  errors: string[];
};

export type ExamResult = {
  id: string;
  createdAt: number;
  /** Last local change, for sync. Missing on results saved before sync existed. */
  updatedAt?: number;
  finishedAt: number;
  timedOut: boolean;
  survey: SurveyAnswers;
  startLevel: Level;
  adjustment: Adjustment;
  finalLevel: Level;
  questions: ExamQuestion[];
  answers: AnswerRecord[];
  evaluations: Evaluation[];
  /** The candidate's real OPIc grade, if they have one. Never sent to the evaluator; kept to compare estimates against. */
  actualGrade?: Grade | "none";
  /** What the candidate agreed to before the survey. */
  consent?: { version: string; research: boolean; at: number };
  /** Local bookkeeping for the research copy. The secret never leaves this browser except to prove ownership. */
  research?: { secret: string; uploaded: number[]; syncedAt?: number; deleted?: boolean; error?: string };
  /** Old per-record account bookkeeping (user_exams). Read only, to migrate legacy records; sync state now lives in the docs store. */
  account?: { uploaded: number[]; signature?: string; syncedAt?: number; error?: string };
};

export const CONSENT_VERSION = "2026-10-14";

export function latestEvaluation(r: ExamResult): Evaluation | undefined {
  return r.evaluations[r.evaluations.length - 1];
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
