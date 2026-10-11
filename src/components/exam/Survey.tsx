"use client";

import { Button, ChoiceRow, Icon } from "@/components/ui";
import { Frame } from "@/components/exam/Frame";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_TOTAL_MIN,
  COURSE_IF_NOT_STUDENT,
  COURSE_IF_STUDENT,
  HOUSING_OPTIONS,
  WORK_FOLLOWUPS,
  WORK_OPTIONS,
  type Choice,
} from "@/lib/content/survey";
import type { SurveyAnswers } from "@/lib/types";

type GroupKey = (typeof ACTIVITY_GROUPS)[number]["key"];

export const EMPTY_SURVEY: SurveyAnswers = {
  work: "",
  workFollowups: {},
  student: "no",
  course: "",
  housing: "",
  leisure: [],
  hobbies: [],
  sports: [],
  trips: [],
};

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-10 first:mt-0">
      <legend className="mb-3 text-[16px] font-semibold">{title}</legend>
      <div className="-mx-4 flex flex-col gap-0.5">{children}</div>
    </fieldset>
  );
}

function Radios({ options, value, onPick }: { options: Choice[]; value: string; onPick: (id: string) => void }) {
  return options.map((o) => (
    <ChoiceRow key={o.id} type="radio" checked={value === o.id} onChange={() => onPick(o.id)}>
      {o.label}
    </ChoiceRow>
  ));
}

export function activityTotal(a: SurveyAnswers) {
  return a.leisure.length + a.hobbies.length + a.sports.length + a.trips.length;
}

function pageComplete(page: number, a: SurveyAnswers): boolean {
  if (page === 0) {
    if (!a.work) return false;
    const followups = WORK_FOLLOWUPS[a.work] ?? [];
    return followups.every((f) => (f.showIf && !f.showIf(a.workFollowups)) || a.workFollowups[f.id]);
  }
  if (page === 1) return Boolean(a.course);
  if (page === 2) return Boolean(a.housing);
  return ACTIVITY_GROUPS.every((g) => a[g.key].length >= g.min) && activityTotal(a) >= ACTIVITY_TOTAL_MIN;
}

export function Survey({
  page,
  answers: a,
  onChange,
  onNext,
  onBack,
}: {
  page: number;
  answers: SurveyAnswers;
  onChange: (a: SurveyAnswers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = (patch: Partial<SurveyAnswers>) => onChange({ ...a, ...patch });
  const total = activityTotal(a);
  const done = pageComplete(page, a);

  const toggle = (key: GroupKey, id: string) => {
    const list = a[key];
    set({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } as Partial<SurveyAnswers>);
  };

  const actions = (
    <>
      <Button variant="quiet" onClick={onBack}>
        <Icon name="back" className="size-4" />
        이전
      </Button>
      <Button onClick={onNext} disabled={!done}>
        다음
        <Icon name="arrow" className="size-4" />
      </Button>
    </>
  );

  if (page === 0) {
    const followups = (WORK_FOLLOWUPS[a.work] ?? []).filter((f) => !f.showIf || f.showIf(a.workFollowups));
    return (
      <Frame step={0} title="Background Survey" lead="답변에 맞춰 시험 문항이 정해집니다. 실제 시험과 같은 순서로 묻습니다." actions={actions} aside="Part 1 / 4">
        <Question title="현재 귀하는 어느 분야에 종사하고 계십니까?">
          <Radios options={WORK_OPTIONS} value={a.work} onPick={(work) => set({ work, workFollowups: {} })} />
        </Question>
        {followups.map((f) => (
          <Question key={f.id} title={f.question}>
            <Radios
              options={f.options}
              value={a.workFollowups[f.id] ?? ""}
              onPick={(v) => set({ workFollowups: { ...a.workFollowups, [f.id]: v } })}
            />
          </Question>
        ))}
      </Frame>
    );
  }

  if (page === 1) {
    return (
      <Frame step={0} title="Background Survey" actions={actions} aside="Part 2 / 4">
        <Question title="현재 귀하는 학생이십니까?">
          <Radios
            options={[
              { id: "yes", label: "네" },
              { id: "no", label: "아니요" },
            ]}
            value={a.student}
            onPick={(v) => set({ student: v as "yes" | "no", course: "" })}
          />
        </Question>
        <Question title={a.student === "yes" ? "현재 어떤 강의를 듣고 있습니까?" : "최근 어떤 강의를 수강했습니까?"}>
          <Radios options={a.student === "yes" ? COURSE_IF_STUDENT : COURSE_IF_NOT_STUDENT} value={a.course} onPick={(course) => set({ course })} />
        </Question>
      </Frame>
    );
  }

  if (page === 2) {
    return (
      <Frame step={0} title="Background Survey" actions={actions} aside="Part 3 / 4">
        <Question title="현재 귀하는 어디에 살고 계십니까?">
          <Radios options={HOUSING_OPTIONS} value={a.housing} onPick={(housing) => set({ housing })} />
        </Question>
      </Frame>
    );
  }

  return (
    <Frame
      step={0}
      title="Background Survey"
      lead={`아래 네 질문에서 모두 ${ACTIVITY_TOTAL_MIN}개 이상을 고르세요.`}
      actions={actions}
      aside={
        <span className="tabular">
          Part 4 / 4 · <span className={total >= ACTIVITY_TOTAL_MIN ? "font-semibold text-ink" : ""}>{total}</span>
          <span className="text-ink-3"> / {ACTIVITY_TOTAL_MIN}개 선택</span>
        </span>
      }
    >
      {ACTIVITY_GROUPS.map((g) => (
        <fieldset key={g.key} className="mt-12 first:mt-0">
          <legend className="mb-3 flex w-full items-baseline justify-between gap-4">
            <span className="text-[16px] font-semibold">
              {g.key === "leisure" && "귀하는 여가 활동으로 주로 무엇을 하십니까?"}
              {g.key === "hobbies" && "귀하의 취미나 관심사는 무엇입니까?"}
              {g.key === "sports" && "귀하는 주로 어떤 운동을 즐기십니까?"}
              {g.key === "trips" && "귀하는 어떤 휴가나 출장을 다녀온 경험이 있습니까?"}
            </span>
            <span className={`tabular shrink-0 text-[13px] ${a[g.key].length >= g.min ? "text-ink-2" : "text-ink-3"}`}>{g.hint}</span>
          </legend>
          <div className="-mx-4 grid grid-cols-1 gap-x-2 gap-y-0.5 sm:grid-cols-2">
            {g.items.map((item) => (
              <ChoiceRow key={item.id} type="checkbox" checked={a[g.key].includes(item.id)} onChange={() => toggle(g.key, item.id)}>
                {item.label}
              </ChoiceRow>
            ))}
          </div>
        </fieldset>
      ))}
    </Frame>
  );
}
