import { z } from "zod";
import type { QuestionType } from "@/lib/types";

/* One judgement of a four-part structured answer (문장 구조화 연습). */

const Part = z.enum(["opening", "reason", "example", "feeling"]);

export const StructureFeedbackSchema = z.object({
  parts: z
    .array(
      z.object({
        part: Part,
        verdict: z.enum(["good", "ok", "weak"]).describe("이 부분이 제 역할을 했는지: good 잘함, ok 보통, weak 부족"),
        length: z.string().describe("길이에 대한 평. 목표 시간과 비교해 짧은지 긴지. 한국어 한 문장."),
        content: z.string().describe("내용이 이 부분의 역할(두괄식·이유·예시·감정)에 맞는지, 앞뒤와 이어지는지. 한국어 한두 문장."),
        better: z.string().describe("사용자의 내용을 살려 이 부분을 더 잘 말한 영어 문장"),
      }),
    )
    .describe("네 부분 각각 하나씩, 순서대로"),
  flow: z.string().describe("네 부분이 하나의 답변으로 이어지는지. 연결어와 흐름에 대한 평. 한국어."),
  overall: z.string().describe("총평과 가장 먼저 고칠 한 가지. 한국어 2~3문장."),
  model_answer: z.string().describe("네 부분을 이어 한 단계 위 수준으로 다시 쓴 영어 답변. 말하듯 자연스럽게."),
});

export type StructureFeedback = z.infer<typeof StructureFeedbackSchema>;

export const StructureRequestSchema = z.object({
  model: z.string(),
  ref: z.string().min(1).max(100),
  level: z.number().int().min(1).max(6),
  question: z.object({ type: z.string(), text: z.string().max(2000) }),
  parts: z
    .array(z.object({ part: Part, transcript: z.string().max(6000), seconds: z.number().min(0).max(600), words: z.number().int().min(0) }))
    .length(4),
});

export type StructureRequest = z.infer<typeof StructureRequestSchema>;

const ROLE: Record<string, string> = {
  opening: "Opening (두괄식): answers the question directly in the first sentence, before any detail.",
  reason: "Reason: gives a clear reason for the answer, introduced with a reason marker.",
  example: "Example: supports the reason with a concrete example or a specific personal experience.",
  feeling: "Feeling/thought: closes with the speaker's own feeling, opinion or takeaway.",
};

const TARGET: Record<string, string> = { opening: "4–12 s", reason: "8–20 s", example: "15–40 s", feeling: "4–12 s" };

export function structureSystemPrompt(): string {
  return `You coach Korean learners preparing for the OPIc English speaking test. The learner answered one question in four separately recorded parts that should form one well-structured answer:
${Object.values(ROLE)
  .map((r) => `- ${r}`)
  .join("\n")}

Judge each part on two things: length (compare the seconds and word count with the target: ${Object.entries(TARGET)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ")}) and content (does it do its role, and does it connect to the parts before and after?). Then judge the flow of the four parts as one answer.

Rules:
- Transcripts are verbatim speech recognition: fillers are real; recognition may mishear a word. Pronunciation is not assessed.
- Write all comments in Korean. Keep English quotes and rewritten English in English.
- "better" keeps the learner's own facts and ideas, said one level above their current level, in natural spoken English.
- "model_answer" joins the four parts into one answer of about 60–90 seconds, one level above the learner.
- Be direct and specific; quote the learner's words as evidence. No praise the transcript does not support.`;
}

export function structureUserPrompt(req: Pick<StructureRequest, "level" | "question" | "parts">): string {
  const parts = req.parts.map((p) => `### ${p.part} — ${p.seconds.toFixed(1)} s, ${p.words} words\n${p.transcript.trim() || "(no speech)"}`).join("\n\n");
  return `Self-assessed level: ${req.level} (1–6).
Question (${req.question.type as QuestionType}): ${req.question.text}

${parts}`;
}
