import { describe, expect, it } from "vitest";
import { attemptsFromExam } from "@/lib/domain/from-exam";
import type { ExamResult } from "@/lib/exam/result";
import type { AnswerFeedback } from "@/lib/feedback/schema";

function feedback(number: number, extra: Partial<AnswerFeedback> = {}): AnswerFeedback {
  return {
    number,
    verdict: "ok",
    performance: "IM2",
    task: { result: "full", comment: "" },
    corrections: [{ original: "I go", corrected: "I went", kind: "grammar", reason: "과거", skill: "tense.past" }],
    upgrades: [],
    structure: { opening: true, development: true, closing: false, comment: "" },
    strengths: [],
    model_answer: "",
    skills: [{ skill: "tense.past", verdict: "weak" }],
    ...extra,
  };
}

const usage = { inputTokens: 0, outputTokens: 0 };

function exam(): ExamResult {
  return {
    id: "abc123xyz",
    createdAt: 1000,
    finishedAt: 2000,
    timedOut: false,
    survey: {} as ExamResult["survey"],
    startLevel: 4,
    adjustment: "same",
    finalLevel: 4,
    questions: [
      { number: 1, topicId: "intro", topicLabel: "자기소개", type: "intro", text: "Tell me about yourself.", scored: false },
      { number: 2, topicId: "movies", topicLabel: "영화", type: "past", text: "Tell me about a movie you saw.", scored: true },
      { number: 3, topicId: "movies", topicLabel: "영화", type: "describe", text: "Describe a theater.", scored: true },
    ],
    answers: [
      {
        number: 2,
        audioKey: "abc123xyz:2",
        mimeType: "audio/webm",
        durationMs: 40_000,
        replayed: false,
        transcript: { text: "I go to the theater.", words: [], audioSeconds: 40 },
      },
      { number: 3, audioKey: "abc123xyz:3", mimeType: "audio/webm", durationMs: 30_000, replayed: false, transcriptError: "실패" },
    ],
    evaluations: [{ id: "e1", modelId: "gemini-3.8-flash", createdAt: 3000, questions: [feedback(2)], usage, errors: [] }],
  };
}

describe("attemptsFromExam", () => {
  it("converts an exam into attempts", () => {
    const attempts = attemptsFromExam(exam());
    expect(attempts.map((a) => a.id)).toEqual(["abc123xyz:1", "abc123xyz:2", "abc123xyz:3"]);
    expect(attempts.every((a) => a.source === "exam" && a.sessionId === "abc123xyz")).toBe(true);
    expect(attempts[1].question).toEqual({ text: "Tell me about a movie you saw.", type: "past", topicId: "movies", number: 2 });
    expect(attempts[1].recording).toEqual({ audioKey: "abc123xyz:2", mimeType: "audio/webm", durationMs: 40_000 });
    expect(attempts[1].transcript?.text).toBe("I go to the theater.");
    expect(attempts[1].feedback?.skills).toEqual([{ skill: "tense.past", verdict: "weak" }]);
    expect(attempts[1].modelId).toBe("gemini-3.8-flash");
    expect(attempts[2].transcript).toBeUndefined();
    expect(attempts[2].recording).toBeDefined();
    expect(attempts[0].recording).toBeUndefined();
  });

  it("legacy evaluation without skills", () => {
    const r = exam();
    const legacy = feedback(2) as Partial<AnswerFeedback>;
    delete legacy.skills;
    legacy.corrections = [{ original: "I go", corrected: "I went", kind: "grammar", reason: "과거" }];
    r.evaluations = [
      { id: "old", modelId: "claude-sonnet-4-6", createdAt: 3000, questions: [legacy as AnswerFeedback], usage, errors: [] },
      { id: "new", modelId: "gemini-3.8-flash", createdAt: 4000, questions: [feedback(2)], usage, errors: [] },
    ];

    const old = attemptsFromExam(r, "old")[1];
    expect(old.feedback?.skills).toEqual([]);
    expect(old.feedback?.corrections).toEqual([{ original: "I go", corrected: "I went", kind: "grammar", reason: "과거" }]);
    expect(old.modelId).toBe("claude-sonnet-4-6");

    expect(attemptsFromExam(r)[1].modelId).toBe("gemini-3.8-flash");

    r.evaluations = [];
    const none = attemptsFromExam(r)[1];
    expect(none.feedback).toBeUndefined();
    expect(none.modelId).toBeUndefined();
  });
});
