import type { Attempt } from "@/lib/domain/attempt";
import type { ExamResult } from "@/lib/exam/result";
import type { AnswerFeedback } from "@/lib/feedback/schema";

/** Feedback saved before skill tags existed has no `skills`; treat it as "not classified". */
export function normalizeFeedback(f: unknown): AnswerFeedback {
  const fb = f as AnswerFeedback;
  return Array.isArray(fb.skills) ? fb : { ...fb, skills: [] };
}

/** A mock test as attempts: its questions, answers and one evaluation (the latest unless named). */
export function attemptsFromExam(result: ExamResult, evaluationId?: string): Attempt[] {
  const evaluation = evaluationId
    ? result.evaluations.find((e) => e.id === evaluationId)
    : result.evaluations[result.evaluations.length - 1];
  return result.questions.map((q) => {
    const answer = result.answers.find((a) => a.number === q.number);
    const fb = evaluation?.questions.find((f) => f.number === q.number);
    const attempt: Attempt = {
      id: `${result.id}:${q.number}`,
      sessionId: result.id,
      source: "exam",
      createdAt: result.createdAt,
      question: { text: q.text, type: q.type, topicId: q.topicId, number: q.number },
    };
    if (answer) {
      attempt.recording = { audioKey: answer.audioKey, mimeType: answer.mimeType, durationMs: answer.durationMs };
      if (answer.transcript) attempt.transcript = answer.transcript;
    }
    if (fb && evaluation) {
      attempt.feedback = normalizeFeedback(fb);
      attempt.modelId = evaluation.modelId;
    }
    return attempt;
  });
}
