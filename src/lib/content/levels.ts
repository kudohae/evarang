import type { Grade, Level } from "@/lib/types";

/** Self Assessment levels, worded after the real screen. */
export const SELF_LEVELS: { level: Level; text: string; sample: string }[] = [
  {
    level: 1,
    text: "나는 10단어 이하의 단어로 말할 수 있습니다.",
    sample: "Hello. Me... student. Seoul. Coffee. Thank you.",
  },
  {
    level: 2,
    text: "나는 기본적인 물건, 색깔, 요일, 음식, 의류, 숫자 등을 말할 수 있습니다. 항상 완벽한 문장을 구사하지는 못하고 간단한 질문도 하기 어렵습니다.",
    sample: "Hi. My name is Minji. I am student. I like... pizza. My house, Seoul. My family, four people. I like blue.",
  },
  {
    level: 3,
    text: "나는 나 자신, 직장, 친한 사람과 장소, 일상에 대한 기본적인 정보를 간단한 문장으로 전달할 수 있습니다. 간단한 질문을 할 수 있습니다.",
    sample:
      "Hi, my name is Minji. I'm a university student in Seoul. I live with my family. On weekends, I watch movies with my friends. My favorite food is pizza. What about you?",
  },
  {
    level: 4,
    text: "나는 나 자신, 일상, 일/학교와 취미에 대해 간단한 대화를 할 수 있습니다. 이런 친숙한 주제와 일상에 대해 일련의 간단한 문장들을 쉽게 만들어 낼 수 있습니다. 내가 원하는 것을 얻기 위한 질문도 할 수 있습니다.",
    sample:
      "Hi, I'm Minji. I'm a third-year student at a university in Seoul, and I live with my parents and my younger brother. On weekends, I usually go to a café near my house and read, because it's quiet and the coffee is really good. I also like jogging along the river in the evening.",
  },
  {
    level: 5,
    text: "나는 친숙한 주제와 가정, 일/학교, 개인 및 사회적 관심사에 대해 대화할 수 있습니다. 일어난 일과 일어나고 있는 일, 일어날 일에 대해 합리적으로 자신 있게 말할 수 있고, 필요한 경우 설명도 할 수 있습니다. 일상에서 예기치 못한 상황이 생겨도 임기응변으로 대처할 수 있습니다.",
    sample:
      "Sure. I'm Minji, and I'm finishing my degree in business this year. I used to be pretty shy, but joining a hiking club two years ago really changed that. Now I'm the one who plans our trips, which means I deal with everything from booking buses to calming people down when the weather ruins our plans. Next year I'm hoping to work in marketing, ideally somewhere I can travel.",
  },
  {
    level: 6,
    text: "나는 개인적, 사회적 또는 전문적 주제에 나의 의견을 제시하여 토론할 수 있습니다. 다양하고 어려운 주제에 대해 정확하고 자세하게 설명할 수 있습니다.",
    sample:
      "Well, I'd describe myself as someone who's always trying to balance two things: a pretty demanding job in product design and a real need for time outdoors. Honestly, I think that tension says a lot about my generation. We're told to be productive all the time, yet the things that actually make us better at work, like rest and perspective, are the first things we sacrifice. So these days I'm deliberate about protecting my weekends.",
  },
];

/** Used in Pre-Test Setup and the sample question. */
export const SETUP_PROMPT = "Please describe what you can see around you right now.";
export const SAMPLE_QUESTION = "Tell me about the weather today where you are. What is it like, and do you like this kind of weather?";

/** ACTFL ladder used by the report. Descriptions are our own summary. */
export const GRADE_INFO: Record<Grade, { name: string; summary: string }> = {
  NL: { name: "Novice Low", summary: "몇 개의 단어를 나열하는 수준입니다. 문장으로 의사를 전달하기 어렵습니다." },
  NM: { name: "Novice Mid", summary: "외운 단어와 짧은 표현으로 기본 정보를 전달합니다. 문장은 거의 만들지 못합니다." },
  NH: { name: "Novice High", summary: "익숙한 주제에서 짧은 문장을 만들기 시작하지만, 문장이 자주 끊기고 오류가 많습니다." },
  IL: { name: "Intermediate Low", summary: "익숙한 주제에 대해 짧고 단순한 문장으로 말합니다. 문장끼리 잘 이어지지 않습니다." },
  IM1: { name: "Intermediate Mid 1", summary: "일상 주제에서 문장을 꾸준히 만들어 내지만, 내용이 짧고 반복적입니다." },
  IM2: { name: "Intermediate Mid 2", summary: "일상 주제를 여러 문장으로 무난하게 설명합니다. 묘사와 경험 서술이 고르게 나오지는 않습니다." },
  IM3: { name: "Intermediate Mid 3", summary: "문장을 연결해 짧은 문단을 만들기 시작합니다. 시제와 정확성이 아직 흔들립니다." },
  IH: { name: "Intermediate High", summary: "대부분의 과제를 문단 단위로 수행하고 과거·현재·미래를 넘나듭니다. 어려운 과제에서는 무너지는 순간이 있습니다." },
  AL: { name: "Advanced Low", summary: "묘사, 서술, 문제 해결을 문단 단위로 안정적으로 해냅니다. 예상 밖의 상황에도 대처합니다." },
};
