import type { AnswerFeedback } from "@/lib/feedback/schema";
import type { QuestionType, Transcript } from "@/lib/types";

/** Where an answer was given. Every feature produces attempts of the same shape. */
export type AttemptSource = "exam" | "drill" | "structure" | "review" | "story";

/** One spoken answer to one question, with what was learned from it. */
export type Attempt = {
  /** For mock tests: `${examId}:${number}`. */
  id: string;
  sessionId: string;
  source: AttemptSource;
  createdAt: number;
  question: { text: string; type: QuestionType; topicId?: string; number?: number };
  recording?: { audioKey: string; mimeType: string; durationMs: number };
  transcript?: Transcript;
  feedback?: AnswerFeedback;
  modelId?: string;
};
