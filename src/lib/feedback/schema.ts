import { z } from "zod";
import { SKILL_IDS } from "@/lib/domain/skills";
import { GRADES } from "@/lib/types";

const Grade = z.enum(GRADES);
const Skill = z.enum(SKILL_IDS);

export const SkillMarkSchema = z.object({
  skill: Skill,
  verdict: z.enum(["strong", "weak"]).describe("이 답변에서 이 이름표가 강점인지 약점인지"),
});

export const AnswerFeedbackSchema = z.object({
  number: z.number().int().describe("문항 번호"),
  verdict: z.string().describe("이 답변에 대한 한 문장 판정. 한국어."),
  performance: Grade.describe("이 답변 하나만 봤을 때의 수준"),
  task: z.object({
    result: z.enum(["full", "partial", "missed"]).describe("질문이 요구한 과제를 해냈는지"),
    comment: z.string().describe("무엇을 했고 무엇을 빠뜨렸는지. 한국어."),
  }),
  corrections: z
    .array(
      z.object({
        original: z.string().describe("답변 원문에서 그대로 복사한 구간. 반드시 transcript의 정확한 부분 문자열."),
        corrected: z.string().describe("고친 영어 표현"),
        kind: z.enum(["grammar", "vocabulary", "expression"]),
        reason: z.string().describe("왜 고쳐야 하는지. 한국어, 한두 문장."),
        skill: Skill.optional().describe("이 교정이 속하는 이름표"),
      }),
    )
    .describe("명백한 오류만. 중요도 순."),
  upgrades: z
    .array(
      z.object({
        original: z.string().describe("답변 원문에서 그대로 복사한 구간"),
        better: z.string().describe("한 단계 위 등급에서 쓸 만한 표현"),
        reason: z.string().describe("어떤 점이 나아지는지. 한국어."),
        skill: Skill.optional().describe("이 표현이 키우는 이름표"),
      }),
    )
    .describe("틀리진 않았지만 더 높은 수준으로 바꿀 수 있는 표현"),
  structure: z.object({
    opening: z.boolean().describe("질문에 바로 답하는 첫 문장이 있는가"),
    development: z.boolean().describe("구체적 예시·세부 사항으로 전개되는가"),
    closing: z.boolean().describe("마무리 문장이 있는가"),
    comment: z.string().describe("구성에 대한 평. 한국어."),
  }),
  strengths: z.array(z.string()).describe("실제로 잘한 점. 한국어. 근거가 되는 표현을 따옴표로 인용."),
  model_answer: z.string().describe("사용자의 내용을 살려 한 단계 위 등급으로 다시 쓴 영어 답변"),
  skills: z.array(SkillMarkSchema).describe("이 답변에서 뚜렷하게 드러난 강점과 약점 이름표. 근거가 없으면 넣지 않는다."),
});

export const AnswerBatchSchema = z.object({
  items: z.array(AnswerFeedbackSchema),
});

const Criterion = z.object({
  key: z.enum(["functions", "content", "accuracy", "text_type"]),
  rating: z.number().int().describe("1~5. 5가 가장 높음"),
  comment: z.string().describe("판단 근거. 한국어. 답변에서 인용 포함."),
});

export const OverallSchema = z.object({
  grade: Grade,
  range_low: Grade.describe("가능성 있는 등급 범위의 하단"),
  range_high: Grade.describe("가능성 있는 등급 범위의 상단"),
  verdict: z.string().describe("등급 판정 이유. 한국어 2~4문장. 구체적 근거 포함."),
  criteria: z.array(Criterion).describe("네 기준 각각 하나씩"),
  next_grade: Grade,
  to_next: z
    .array(
      z.object({
        title: z.string().describe("짧은 제목. 한국어."),
        detail: z.string().describe("무엇을 어떻게 바꿔야 하는지. 한국어."),
        before: z.string().describe("사용자 답변에서 인용한 실제 문장"),
        after: z.string().describe("같은 내용을 다음 등급 수준으로 고친 문장"),
      }),
    )
    .describe("다음 등급으로 가기 위해 가장 효과가 큰 변화. 중요도 순."),
  patterns: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        examples: z.array(z.string()).describe("여러 문항에서 실제로 나온 표현"),
        skill: Skill.optional().describe("이 습관에 해당하는 이름표"),
      }),
    )
    .describe("여러 답변에 반복해서 나타난 습관이나 오류"),
  plan: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .describe("다음 응시 전까지 할 구체적 연습"),
});

export type SkillMark = z.infer<typeof SkillMarkSchema>;
export type AnswerFeedback = z.infer<typeof AnswerFeedbackSchema>;
export type OverallFeedback = z.infer<typeof OverallSchema>;
/** Older name of the same shape, kept for the report components. */
export type QuestionFeedback = AnswerFeedback;
/** Older name of the batch schema. */
export const QuestionBatchSchema = AnswerBatchSchema;
