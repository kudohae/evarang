/**
 * Background Survey.
 * Structure follows the real test: work, school, housing, then four
 * activity groups where the total selection must reach twelve.
 * `topic` links an item to a question set in the bank; items without one can
 * still be selected (as on the real test) but never produce questions.
 */

export type Choice = { id: string; label: string };
export type ActivityItem = Choice & { topic?: string };

export const WORK_OPTIONS: Choice[] = [
  { id: "business", label: "사업/회사" },
  { id: "home_office", label: "재택근무/재택사업" },
  { id: "teacher", label: "교사/교육자" },
  { id: "military", label: "군 복무" },
  { id: "none", label: "일 경험 없음" },
];

export const WORK_FOLLOWUPS: Record<string, { id: string; question: string; options: Choice[]; showIf?: (a: Record<string, string>) => boolean }[]> = {
  business: [
    { id: "employed", question: "현재 귀하는 직업이 있으십니까?", options: [{ id: "yes", label: "네" }, { id: "no", label: "아니요" }] },
    {
      id: "tenure",
      question: "귀하의 근무 기간은 얼마나 되십니까?",
      options: [
        { id: "first_short", label: "첫 직장 — 2개월 미만" },
        { id: "first_long", label: "첫 직장 — 2개월 이상" },
        { id: "experienced", label: "첫 직장 아님 — 경험 많음" },
      ],
      showIf: (a) => a.employed === "yes",
    },
    {
      id: "manager",
      question: "귀하는 부하 직원을 관리하는 관리직을 맡고 있습니까?",
      options: [{ id: "yes", label: "네" }, { id: "no", label: "아니요" }],
      showIf: (a) => a.employed === "yes" && a.tenure !== "first_short",
    },
  ],
  home_office: [
    { id: "employed", question: "현재 귀하는 직업이 있으십니까?", options: [{ id: "yes", label: "네" }, { id: "no", label: "아니요" }] },
    {
      id: "tenure",
      question: "귀하의 근무 기간은 얼마나 되십니까?",
      options: [
        { id: "first_short", label: "첫 직장 — 2개월 미만" },
        { id: "first_long", label: "첫 직장 — 2개월 이상" },
        { id: "experienced", label: "첫 직장 아님 — 경험 많음" },
      ],
      showIf: (a) => a.employed === "yes",
    },
  ],
  teacher: [
    {
      id: "where",
      question: "현재 귀하는 어디에서 학생을 가르치십니까?",
      options: [
        { id: "college", label: "대학 이상" },
        { id: "school", label: "초등·중·고등학교" },
        { id: "lifelong", label: "평생교육" },
      ],
    },
    { id: "employed", question: "현재 귀하는 직업이 있으십니까?", options: [{ id: "yes", label: "네" }, { id: "no", label: "아니요" }] },
  ],
};

export const COURSE_IF_STUDENT: Choice[] = [
  { id: "degree", label: "학위 과정 수업" },
  { id: "lifelong", label: "전문 기술 향상을 위한 평생 학습" },
  { id: "language", label: "어학 수업" },
];

export const COURSE_IF_NOT_STUDENT: Choice[] = [
  ...COURSE_IF_STUDENT,
  { id: "none5", label: "수강 후 5년 이상 지남" },
];

export const HOUSING_OPTIONS: Choice[] = [
  { id: "alone", label: "개인주택이나 아파트에 홀로 거주" },
  { id: "roommates", label: "친구나 룸메이트와 함께 주택이나 아파트에 거주" },
  { id: "family", label: "가족(배우자/자녀/기타 가족 일원)과 함께 주택이나 아파트에 거주" },
  { id: "dorm", label: "학교 기숙사" },
  { id: "barracks", label: "군대 막사" },
];

export const LEISURE: ActivityItem[] = [
  { id: "movies", label: "영화 보기", topic: "movies" },
  { id: "club", label: "클럽/나이트클럽 가기" },
  { id: "shows", label: "공연 보기", topic: "performances" },
  { id: "concerts", label: "콘서트 보기", topic: "performances" },
  { id: "museum", label: "박물관 가기" },
  { id: "park", label: "공원 가기", topic: "park" },
  { id: "camping", label: "캠핑하기", topic: "camping" },
  { id: "beach", label: "해변 가기", topic: "beach" },
  { id: "sports_watch", label: "스포츠 관람" },
  { id: "home_improve", label: "주거 개선" },
  { id: "bar", label: "술집/바에 가기" },
  { id: "cafe", label: "카페/커피전문점 가기", topic: "cafe" },
  { id: "games", label: "게임하기 (비디오·카드·보드·휴대폰)", topic: "games" },
  { id: "billiards", label: "당구 치기" },
  { id: "chess", label: "체스하기" },
  { id: "sns", label: "SNS에 글 올리기" },
  { id: "texting", label: "친구들과 문자 대화하기" },
  { id: "test_prep", label: "시험 대비 과정 수강하기" },
  { id: "news", label: "뉴스를 보거나 듣기", topic: "news" },
  { id: "tv", label: "TV 시청하기", topic: "tv" },
  { id: "reality", label: "리얼리티쇼 시청하기", topic: "tv" },
  { id: "shopping", label: "쇼핑하기", topic: "shopping" },
  { id: "spa", label: "스파/마사지숍 가기" },
  { id: "job_hunt", label: "구직활동하기" },
  { id: "volunteer", label: "자원봉사하기" },
  { id: "drive", label: "차로 드라이브하기" },
];

export const HOBBIES: ActivityItem[] = [
  { id: "read_kids", label: "아이에게 책 읽어주기" },
  { id: "music", label: "음악 감상하기", topic: "music" },
  { id: "instrument", label: "악기 연주하기" },
  { id: "singing", label: "혼자 노래 부르거나 합창하기" },
  { id: "dance", label: "춤추기" },
  { id: "writing", label: "글쓰기 (편지·단문·시 등)" },
  { id: "drawing", label: "그림 그리기" },
  { id: "cooking", label: "요리하기", topic: "cooking" },
  { id: "pets", label: "애완동물 기르기", topic: "pets" },
  { id: "reading", label: "독서", topic: "reading" },
  { id: "stocks", label: "주식 투자하기" },
  { id: "newspaper", label: "신문 읽기", topic: "news" },
  { id: "travel_blogs", label: "여행 관련 잡지나 블로그 읽기" },
  { id: "photo", label: "사진 촬영하기" },
];

export const SPORTS: ActivityItem[] = [
  { id: "basketball", label: "농구" },
  { id: "baseball", label: "야구/소프트볼" },
  { id: "soccer", label: "축구" },
  { id: "football", label: "미식축구" },
  { id: "hockey", label: "하키" },
  { id: "cricket", label: "크리켓" },
  { id: "golf", label: "골프" },
  { id: "volleyball", label: "배구" },
  { id: "tennis", label: "테니스" },
  { id: "badminton", label: "배드민턴" },
  { id: "pingpong", label: "탁구" },
  { id: "swimming", label: "수영", topic: "swimming" },
  { id: "cycling", label: "자전거", topic: "cycling" },
  { id: "ski", label: "스키/스노보드" },
  { id: "skate", label: "아이스 스케이트" },
  { id: "jogging", label: "조깅", topic: "walking" },
  { id: "walking", label: "걷기", topic: "walking" },
  { id: "yoga", label: "요가", topic: "yoga" },
  { id: "hiking", label: "하이킹/트레킹", topic: "hiking" },
  { id: "fishing", label: "낚시" },
  { id: "gym", label: "헬스", topic: "gym" },
  { id: "taekwondo", label: "태권도" },
  { id: "fitness_class", label: "운동 수업 수강하기", topic: "gym" },
  { id: "no_exercise", label: "운동을 전혀 하지 않음" },
];

export const TRIPS: ActivityItem[] = [
  { id: "biz_domestic", label: "국내 출장", topic: "business_trip" },
  { id: "biz_overseas", label: "해외 출장", topic: "business_trip" },
  { id: "staycation", label: "집에서 보내는 휴가", topic: "staycation" },
  { id: "travel_domestic", label: "국내 여행", topic: "domestic_travel" },
  { id: "travel_overseas", label: "해외 여행", topic: "overseas_travel" },
];

export const ACTIVITY_GROUPS = [
  { key: "leisure", title: "여가 활동", hint: "두 개 이상 선택", min: 2, items: LEISURE },
  { key: "hobbies", title: "취미나 관심사", hint: "한 개 이상 선택", min: 1, items: HOBBIES },
  { key: "sports", title: "주로 하는 운동", hint: "한 개 이상 선택", min: 1, items: SPORTS },
  { key: "trips", title: "휴가나 출장", hint: "한 개 이상 선택", min: 1, items: TRIPS },
] as const;

export const ACTIVITY_TOTAL_MIN = 12;

const ALL_ITEMS: ActivityItem[] = [...LEISURE, ...HOBBIES, ...SPORTS, ...TRIPS];

export function itemLabel(id: string): string {
  return ALL_ITEMS.find((i) => i.id === id)?.label ?? id;
}

export function topicsFromSelection(ids: string[]): string[] {
  const topics = new Set<string>();
  for (const id of ids) {
    const t = ALL_ITEMS.find((i) => i.id === id)?.topic;
    if (t) topics.add(t);
  }
  return [...topics];
}
