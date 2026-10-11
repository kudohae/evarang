export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const GRADES = ["NL", "NM", "NH", "IL", "IM1", "IM2", "IM3", "IH", "AL"] as const;
export type Grade = (typeof GRADES)[number];

export type QuestionType =
  | "intro"
  | "describe"
  | "routine"
  | "past"
  | "compare"
  | "issue"
  | "ask_ava"
  | "rp_ask"
  | "rp_problem"
  | "rp_experience";

export type ExamQuestion = {
  number: number;
  topicId: string;
  topicLabel: string;
  type: QuestionType;
  text: string;
  scored: boolean;
};

export type Adjustment = "easier" | "same" | "harder";

export type SurveyAnswers = {
  work: string;
  workFollowups: Record<string, string>;
  student: "yes" | "no";
  course: string;
  housing: string;
  leisure: string[];
  hobbies: string[];
  sports: string[];
  trips: string[];
};

export type TranscriptWord = { text: string; start: number; end: number; confidence: number };

export type Transcript = {
  text: string;
  words: TranscriptWord[];
  audioSeconds: number;
  /** Which recogniser produced it. Missing on results saved before the fallback existed. */
  engine?: "assemblyai" | "gemini";
  /** Word timings were estimated from loudness, not returned by the recogniser. */
  approxTiming?: boolean;
};

/** Why the backup recogniser was used: the primary ran out of credit, or failed for another reason. */
export type FallbackReason = "credits" | "unavailable";

export type TranscribeResponse = Transcript & { fallback?: FallbackReason };

export type AnswerRecord = {
  number: number;
  audioKey: string;
  mimeType: string;
  durationMs: number;
  replayed: boolean;
  transcript?: Transcript;
  transcriptError?: string;
};
