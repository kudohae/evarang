/**
 * Question bank.
 * Each topic holds every question type the composer may ask about it.
 * Wording imitates the long, multi-part prompts of the real interview.
 */

export type RolePlay = { ask: string; problem: string; experience: string };

import { EXTRA_TOPICS } from "@/lib/content/topics-extra";

export type Topic = {
  id: string;
  label: string;
  kind: "survey" | "random";
  describe: string[];
  routine: string[];
  past: string[];
  compare: string[];
  issue: string[];
  askAva: string;
  roleplay?: RolePlay;
};

const RP_INTRO = "I'd like to give you a situation and ask you to act it out.";
const RP_PROBLEM = "I'm sorry, but there is a problem that I need you to resolve.";
const RP_END = "That's the end of the situation.";

const BASE_TOPICS: Topic[] = [
  // ───────────── Survey topics ─────────────
  {
    id: "home",
    label: "거주지",
    kind: "survey",
    describe: [
      "You indicated in the survey that you live in a house or an apartment. Tell me about the place where you live. What does it look like? How many rooms does it have? Please describe your home in as much detail as possible.",
      "Which room in your home do you like the most? What does it look like, what is in it, and why do you like spending time there?",
    ],
    routine: [
      "Tell me about the household chores you usually do at home. Who does what in your home, and how often do you do them?",
      "What do you usually do at home on weekdays and on weekends? Walk me through a typical day at home from morning to night.",
    ],
    past: [
      "Have there been any changes to your home since you first moved in? Maybe you bought new furniture or redecorated a room. Tell me what changed and why.",
      "Tell me about a memorable thing that happened at your home. It could be something funny, surprising, or difficult. What happened, who was there, and how did it end?",
      "Think about the home you lived in when you were a child. How was it different from the place you live in now? Tell me about that home in detail.",
    ],
    compare: [
      "Compare the homes people lived in when you were young with the homes people live in today. What has changed in terms of size, design, or the things people have at home?",
    ],
    issue: [
      "Housing costs have become a serious concern for many people in your country. Tell me about this issue. Why is it happening, and how does it affect young people?",
    ],
    askAva: "I live in an apartment in the city. Ask me three or four questions about my home.",
    roleplay: {
      ask: `${RP_INTRO} You are looking for a new apartment to rent. Call a real estate agent and ask three or four questions about an apartment you are interested in.`,
      problem: `${RP_PROBLEM} You moved into the new apartment, but you found that the heating does not work and the windows leak. Call the landlord, explain the problem, and suggest two or three ways to solve it.`,
      experience: `${RP_END} Have you ever had a problem with the place you lived in, such as something breaking or a conflict with a neighbor? Tell me what happened and how you dealt with it.`,
    },
  },
  {
    id: "movies",
    label: "영화 보기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like to watch movies. What kinds of movies do you like, and why? Tell me about your favorite genre and some movies you enjoyed.",
      "Tell me about a movie theater you often go to. Where is it, what does it look like, and why do you like going there?",
    ],
    routine: [
      "Tell me about what you usually do when you go to see a movie. Who do you go with, and what do you do before and after the movie?",
    ],
    past: [
      "Tell me about the most memorable movie you have ever seen. What was it about, when did you see it, and why do you still remember it?",
      "Think about the first movie you remember watching in a theater. How old were you, who were you with, and how did you feel about it?",
      "Have you ever had an unexpected experience while watching a movie, such as a problem in the theater or something funny that happened? Tell me the whole story.",
    ],
    compare: [
      "How have movies changed compared to when you were younger? Talk about the stories, the technology, or the way people watch movies now.",
    ],
    issue: [
      "Many people now watch movies on streaming services instead of going to theaters. What do you think about this trend? How has it affected theaters and the movie industry?",
    ],
    askAva: "I enjoy watching movies, too. Ask me three or four questions about the movies I like.",
    roleplay: {
      ask: `${RP_INTRO} You want to see a movie with a friend this weekend. Call the movie theater and ask three or four questions to get the information you need to buy tickets.`,
      problem: `${RP_PROBLEM} You arrive at the theater and find out that the tickets you bought are for the wrong day, and the show is sold out. Call your friend, explain the situation, and offer two or three alternatives.`,
      experience: `${RP_END} Have you ever had a plan with a friend that went wrong because of a mistake? Tell me what happened and how you handled it.`,
    },
  },
  {
    id: "performances",
    label: "공연·콘서트 보기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to concerts or shows. What kinds of performances do you like to see? Tell me about the performers or genres you enjoy.",
      "Describe a concert hall or performance venue you have been to. Where is it, what does it look like inside, and what is the atmosphere like?",
    ],
    routine: [
      "What do you usually do when you go to a concert? Tell me how you get tickets, who you go with, and what you do before and after the show.",
    ],
    past: [
      "Tell me about the most memorable concert or show you have ever been to. Who performed, who were you with, and what made it special?",
      "Tell me about the first concert or performance you went to. When was it, and how did you feel about it?",
    ],
    compare: [
      "How has the way people enjoy live performances changed over the years? Compare concerts in the past with concerts today.",
    ],
    issue: [
      "Concert tickets have become very expensive, and some people buy tickets only to resell them at higher prices. What do you think about this problem, and how could it be solved?",
    ],
    askAva: "I like going to concerts, too. Ask me three or four questions about the concerts I go to.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy tickets for a concert next month. Call the ticket office and ask three or four questions about the concert and the tickets.`,
      problem: `${RP_PROBLEM} On the day of the concert, you get sick and cannot go. Call your friend who was going with you, explain the situation, and suggest two or three options for the tickets.`,
      experience: `${RP_END} Have you ever had to cancel or change plans at the last minute? Tell me what happened, why it happened, and how it worked out.`,
    },
  },
  {
    id: "park",
    label: "공원 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to parks. Tell me about a park you often visit. Where is it, what does it look like, and what can people do there?",
    ],
    routine: [
      "What do you usually do when you go to the park? How often do you go, who do you go with, and how long do you stay?",
      "Tell me how you spend time at the park in different seasons. What do you do there in spring, summer, fall, and winter?",
    ],
    past: [
      "Tell me about a memorable experience you had at a park. When was it, who were you with, and what happened?",
      "Think about a park you went to when you were a child. What did you do there, and how is it different from the parks you go to now?",
    ],
    compare: [
      "Compare the parks in your city now with the parks from when you were younger. How have the facilities and the people who use them changed?",
    ],
    issue: [
      "Some people say cities need more green spaces and parks. Why do you think parks are important, and what problems happen when a city does not have enough of them?",
    ],
    askAva: "I like going to the park near my house. Ask me three or four questions about that park.",
    roleplay: {
      ask: `${RP_INTRO} You want to have a picnic with friends at a park you have never been to. Call the park office and ask three or four questions about the park.`,
      problem: `${RP_PROBLEM} You planned a picnic in the park with your friends, but on that day it starts raining heavily. Call your friends, explain the situation, and suggest two or three other plans.`,
      experience: `${RP_END} Have you ever had an outdoor plan ruined by bad weather or something else? Tell me what happened and what you did instead.`,
    },
  },
  {
    id: "beach",
    label: "해변 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like going to the beach. Tell me about a beach you like. Where is it, what does it look like, and why do you like it?",
    ],
    routine: [
      "What do you usually do when you go to the beach? Tell me what you bring, who you go with, and how you spend the day.",
    ],
    past: [
      "Tell me about the most memorable trip you took to the beach. When was it, who were you with, and what made it memorable?",
      "Have you ever had a problem or an unexpected situation at the beach? Tell me what happened from beginning to end.",
    ],
    compare: [
      "How are beaches in your country different now compared to the past? Talk about the facilities, the crowds, or the environment.",
    ],
    issue: [
      "Pollution and trash on beaches have become a big problem. Tell me about this issue and what people or the government should do about it.",
    ],
    askAva: "I love going to the beach. Ask me three or four questions about the beaches I visit.",
  },
  {
    id: "camping",
    label: "캠핑하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go camping. Tell me about a place where you like to go camping. What is it like, and why do you like it?",
    ],
    routine: [
      "What do you usually do to prepare for a camping trip? Tell me what you pack and what you do once you arrive at the campsite.",
    ],
    past: [
      "Tell me about a memorable camping trip you went on. Where did you go, who did you go with, and what happened?",
      "Tell me about the first time you went camping. How old were you, and what was the experience like?",
    ],
    compare: [
      "Camping has become very popular in recent years. How is camping today different from camping in the past?",
    ],
    issue: [
      "As more people go camping, some campsites have problems with noise, trash, and damage to nature. What do you think about these problems, and how can they be solved?",
    ],
    askAva: "I like going camping, too. Ask me three or four questions about my camping trips.",
    roleplay: {
      ask: `${RP_INTRO} You want to rent camping equipment for a weekend trip. Call a rental shop and ask three or four questions about the equipment.`,
      problem: `${RP_PROBLEM} When you arrive at the campsite, you find that the tent you rented is broken. Call the rental shop, explain the problem, and ask for two or three possible solutions.`,
      experience: `${RP_END} Have you ever rented or bought something that turned out to be broken or wrong? Tell me what happened and how you solved it.`,
    },
  },
  {
    id: "cafe",
    label: "카페 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to cafés or coffee shops. Tell me about a café you often go to. Where is it, what does it look like, and why do you like it?",
    ],
    routine: [
      "What do you usually do when you go to a café? How often do you go, who do you go with, and what do you usually order?",
    ],
    past: [
      "Tell me about a memorable experience you had at a café. When was it, who were you with, and what happened?",
      "Think about the first time you visited your favorite café. How did you find it, and what was your first impression?",
    ],
    compare: [
      "How have cafés in your country changed over the past few years? Compare the cafés of the past with the cafés of today.",
    ],
    issue: [
      "Some people say there are too many cafés in your country and that many of them close quickly. What do you think about this situation?",
    ],
    askAva: "I go to a café near my office almost every day. Ask me three or four questions about that café.",
    roleplay: {
      ask: `${RP_INTRO} A new café has opened near your home. Go to the café and ask the staff three or four questions about the menu and the place.`,
      problem: `${RP_PROBLEM} You ordered drinks for a meeting, but when you open the bag, the order is completely wrong. Call the café, explain the situation, and suggest two or three ways to fix it.`,
      experience: `${RP_END} Have you ever received the wrong order at a restaurant or café? Tell me what happened and how it was resolved.`,
    },
  },
  {
    id: "shopping",
    label: "쇼핑하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like to go shopping. Tell me about a store or shopping area you often go to. What does it look like, and what can you buy there?",
    ],
    routine: [
      "Tell me about your shopping habits. How often do you go shopping, what do you usually buy, and do you prefer shopping online or in stores?",
    ],
    past: [
      "Tell me about something special you bought recently. What was it, where did you buy it, and why did you buy it?",
      "Have you ever had a problem with something you bought, such as a wrong size or a broken item? Tell me what happened and how you dealt with it.",
    ],
    compare: [
      "How has shopping changed compared to when you were young? Compare the way people shopped in the past with the way they shop today.",
    ],
    issue: [
      "Online shopping has grown very quickly. What effects has this had on small local stores and on the people who work there?",
    ],
    askAva: "I like shopping, too. Ask me three or four questions about where and how I shop.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy a gift for a friend at a department store. Ask the clerk three or four questions to help you choose a good gift.`,
      problem: `${RP_PROBLEM} You bought a jacket online, but when it arrives, it is the wrong color and size. Call the store, explain the situation, and suggest two or three ways to solve the problem.`,
      experience: `${RP_END} Have you ever had to return or exchange something you bought? Tell me what happened and whether the problem was solved.`,
    },
  },
  {
    id: "tv",
    label: "TV·리얼리티쇼 시청",
    kind: "survey",
    describe: [
      "You indicated in the survey that you watch TV or reality shows. What kinds of programs do you like to watch? Tell me about your favorite show and why you like it.",
    ],
    routine: [
      "Tell me about your TV-watching habits. When do you usually watch, who do you watch with, and how do you choose what to watch?",
    ],
    past: [
      "Tell me about a TV program or episode that you still remember. What happened in it, and why was it memorable for you?",
      "When did you first become interested in your favorite show? Tell me how you started watching it.",
    ],
    compare: [
      "How are TV programs today different from the programs you watched when you were a child?",
    ],
    issue: [
      "Some people say reality shows give a false picture of real life and can have a bad influence on viewers. What do you think about this?",
    ],
    askAva: "I watch a lot of TV shows, too. Ask me three or four questions about the shows I like.",
  },
  {
    id: "music",
    label: "음악 감상",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like listening to music. What kinds of music do you like? Who are your favorite singers or musicians, and why do you like them?",
    ],
    routine: [
      "When and where do you usually listen to music? Tell me about the devices you use and the situations in which you listen to music.",
    ],
    past: [
      "How did you first become interested in music? Tell me about the music you liked when you were younger and how your taste has changed.",
      "Tell me about a memorable experience related to music. Maybe you heard a song at an important moment or saw a musician live.",
    ],
    compare: [
      "How has the way people listen to music changed over the years? Compare the past with the present.",
    ],
    issue: [
      "Many musicians say they earn very little money from streaming services. What do you think about this issue?",
    ],
    askAva: "I enjoy listening to music, too. Ask me three or four questions about the music I like.",
  },
  {
    id: "cooking",
    label: "요리하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like cooking. What kinds of food do you like to cook? Tell me about a dish you are good at making.",
    ],
    routine: [
      "Tell me about how you usually prepare a meal. Where do you get the ingredients, and what steps do you go through when you cook?",
    ],
    past: [
      "Tell me about the first time you cooked something by yourself. What did you make, and how did it turn out?",
      "Tell me about a memorable meal you cooked for other people. What was the occasion, and how did it go?",
    ],
    compare: [
      "How have people's cooking and eating habits changed compared to the past?",
    ],
    issue: [
      "More and more people eat delivery food or processed food instead of cooking at home. What problems might this cause?",
    ],
    askAva: "I like to cook at home. Ask me three or four questions about my cooking.",
    roleplay: {
      ask: `${RP_INTRO} You want to sign up for a cooking class. Call the cooking school and ask three or four questions about the class.`,
      problem: `${RP_PROBLEM} You invited friends for dinner, but right before they arrive, you burn the main dish. Call one of your friends, explain the situation, and suggest two or three alternatives.`,
      experience: `${RP_END} Have you ever had a kitchen accident or a cooking disaster? Tell me what happened.`,
    },
  },
  {
    id: "reading",
    label: "독서",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like reading. What kinds of books do you enjoy? Tell me about a writer or a book you like.",
    ],
    routine: [
      "Tell me about your reading habits. When and where do you usually read, and how do you choose books?",
    ],
    past: [
      "Tell me about a book that left a strong impression on you. When did you read it, what was it about, and how did it affect you?",
      "How did you become interested in reading? Tell me about the books you read when you were young.",
    ],
    compare: [
      "How have people's reading habits changed over time? Compare reading in the past with reading today.",
    ],
    issue: [
      "Some people worry that young people do not read books anymore because of smartphones. What do you think about this concern?",
    ],
    askAva: "I like reading books, too. Ask me three or four questions about the books I read.",
  },
  {
    id: "walking",
    label: "걷기·조깅",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go walking or jogging. Tell me about the place where you usually walk or jog. What does it look like?",
    ],
    routine: [
      "Tell me about your walking or jogging routine. When do you go, how long do you go for, and what do you bring with you?",
    ],
    past: [
      "How did you start walking or jogging regularly? Tell me what made you begin and how it has changed your life.",
      "Tell me about a memorable experience you had while walking or jogging. What happened?",
    ],
    compare: [
      "How has people's interest in walking and jogging changed in recent years? Why do you think this has happened?",
    ],
    issue: [
      "Some people say cities are not safe or comfortable for walkers and joggers. What problems do people face, and how could cities improve?",
    ],
    askAva: "I go jogging every morning. Ask me three or four questions about my jogging routine.",
  },
  {
    id: "gym",
    label: "헬스·운동 수업",
    kind: "survey",
    describe: [
      "You indicated in the survey that you work out at a gym. Tell me about the gym you go to. Where is it, what does it look like, and what equipment does it have?",
    ],
    routine: [
      "Tell me about your workout routine. What do you do first, what exercises do you do, and how long do you stay at the gym?",
    ],
    past: [
      "How did you first start working out at a gym? Tell me what made you start and how you felt in the beginning.",
      "Have you ever had an unexpected experience or an injury while working out? Tell me what happened.",
    ],
    compare: [
      "How have gyms and the way people exercise changed compared to the past?",
    ],
    issue: [
      "Many people sign up for a gym membership but stop going after a few weeks. Why do you think this happens, and what could help people keep exercising?",
    ],
    askAva: "I also go to a gym regularly. Ask me three or four questions about my gym.",
    roleplay: {
      ask: `${RP_INTRO} You want to join a new gym near your home. Call the gym and ask three or four questions about the membership and facilities.`,
      problem: `${RP_PROBLEM} You paid for a three-month gym membership, but you hurt your leg and cannot exercise for two months. Call the gym, explain the situation, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had to stop doing something you paid for because of an unexpected problem? Tell me about it.`,
    },
  },
  {
    id: "swimming",
    label: "수영",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go swimming. Tell me about the place where you swim. What does it look like, and what facilities does it have?",
    ],
    routine: [
      "Tell me about what you usually do when you go swimming, from the moment you arrive to when you leave.",
    ],
    past: [
      "How did you learn to swim? Tell me about the first time you went swimming and how you felt.",
      "Tell me about a memorable experience you had while swimming. What happened?",
    ],
    compare: [
      "How are swimming pools and swimming lessons different now compared to when you were young?",
    ],
    issue: [
      "Some people say every child should learn to swim for safety reasons. What do you think about this idea?",
    ],
    askAva: "I like swimming, too. Ask me three or four questions about where and how I swim.",
    roleplay: {
      ask: `${RP_INTRO} You want to take swimming lessons at a new sports center. Call the center and ask three or four questions about the lessons.`,
      problem: `${RP_PROBLEM} When you arrive at the pool, you realize you left your swimsuit and goggles at home. Explain the situation to the staff and ask about two or three options.`,
      experience: `${RP_END} Have you ever forgotten something important when you went somewhere? Tell me what happened and what you did.`,
    },
  },
  {
    id: "cycling",
    label: "자전거",
    kind: "survey",
    describe: [
      "You indicated in the survey that you ride a bicycle. Tell me about your bike and the places where you usually ride it.",
    ],
    routine: [
      "Tell me about your cycling routine. When do you ride, how far do you go, and what do you do to stay safe?",
    ],
    past: [
      "How did you learn to ride a bike? Tell me about that experience in detail.",
      "Tell me about a memorable bike ride you went on. Where did you go, and what happened?",
    ],
    compare: [
      "How has cycling changed in your country? Compare cycling in the past with cycling today.",
    ],
    issue: [
      "Accidents between bicycles, cars, and people walking have become a concern. What causes these problems, and how can they be prevented?",
    ],
    askAva: "I like riding my bike on weekends. Ask me three or four questions about my bike rides.",
    roleplay: {
      ask: `${RP_INTRO} You want to rent a bicycle while traveling. Call a bike rental shop and ask three or four questions.`,
      problem: `${RP_PROBLEM} You rented a bike, but the tire goes flat in the middle of your ride, far from the shop. Call the shop, explain the situation, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had a problem with a vehicle or a bike while you were going somewhere? Tell me what happened.`,
    },
  },
  {
    id: "hiking",
    label: "하이킹·트레킹",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go hiking. Tell me about a mountain or trail you like to hike. What is it like?",
    ],
    routine: [
      "What do you usually do to prepare for a hike, and what do you do during the hike?",
    ],
    past: [
      "Tell me about a memorable hiking trip. Where did you go, who did you go with, and what happened?",
      "Have you ever had a difficult or dangerous experience while hiking? Tell me what happened from start to finish.",
    ],
    compare: [
      "How has hiking culture changed in your country? Compare hikers in the past with hikers today.",
    ],
    issue: [
      "Some popular mountains are damaged because too many people visit them. What do you think should be done to protect them?",
    ],
    askAva: "I enjoy hiking, too. Ask me three or four questions about the places I hike.",
  },
  {
    id: "yoga",
    label: "요가",
    kind: "survey",
    describe: [
      "You indicated in the survey that you do yoga. Tell me about where you do yoga and what a yoga class is like.",
    ],
    routine: [
      "Tell me about your yoga routine. How often do you do it, and what does a typical session look like?",
    ],
    past: [
      "How did you get interested in yoga? Tell me about your first yoga class.",
      "Tell me about how yoga has changed you since you started. Give me a specific example.",
    ],
    compare: [
      "Why do you think yoga has become more popular recently? How is it different from the way people exercised in the past?",
    ],
    issue: [
      "Stress is a serious problem for many people today. What causes it, and what can people do to manage it?",
    ],
    askAva: "I do yoga a few times a week. Ask me three or four questions about my yoga practice.",
  },
  {
    id: "staycation",
    label: "집에서 보내는 휴가",
    kind: "survey",
    describe: [
      "You indicated in the survey that you spend your vacations at home. Tell me what you like to do when you have a vacation at home.",
    ],
    routine: [
      "Who do you usually spend time with during a vacation at home, and what do you do together?",
    ],
    past: [
      "Tell me about your last vacation at home. What did you do each day, and how did you feel about it?",
      "Tell me about a memorable vacation you spent at home. What made it special?",
    ],
    compare: [
      "How do people spend their vacations differently now compared to the past?",
    ],
    issue: [
      "Many workers in your country say they cannot take enough vacation time. Why is that, and what effects does it have?",
    ],
    askAva: "I also like to stay home during my vacations. Ask me three or four questions about how I spend them.",
  },
  {
    id: "domestic_travel",
    label: "국내 여행",
    kind: "survey",
    describe: [
      "You indicated in the survey that you travel within your country. Tell me about a place in your country that you like to visit. What is it like?",
    ],
    routine: [
      "What do you usually do to prepare for a trip, and what do you like to do when you arrive at your destination?",
    ],
    past: [
      "Tell me about a memorable trip you took in your country. Where did you go, who did you go with, and what happened?",
      "Tell me about the first trip you remember taking as a child. Where did you go, and what do you remember about it?",
      "Have you ever had a problem while traveling, such as losing something or missing a train? Tell me the whole story.",
    ],
    compare: [
      "How has traveling in your country changed over the years? Talk about transportation, popular places, or the way people plan trips.",
    ],
    issue: [
      "Some popular tourist areas suffer from too many visitors. What problems does this cause for local residents?",
    ],
    askAva: "I travel around my country a lot. Ask me three or four questions about my trips.",
    roleplay: {
      ask: `${RP_INTRO} You are planning a weekend trip and want to book a guesthouse. Call the guesthouse and ask three or four questions.`,
      problem: `${RP_PROBLEM} On the day of your trip, your train is canceled. Call the guesthouse, explain the situation, and suggest two or three options.`,
      experience: `${RP_END} Have you ever had a trip or plan changed because of a transportation problem? Tell me what happened.`,
    },
  },
  {
    id: "overseas_travel",
    label: "해외 여행",
    kind: "survey",
    describe: [
      "You indicated in the survey that you travel abroad. Tell me about a country you have visited. What is it like, and how is it different from your country?",
    ],
    routine: [
      "What do you usually do to prepare for a trip abroad? Tell me everything from planning to packing.",
    ],
    past: [
      "Tell me about your first trip abroad. Where did you go, who did you go with, and what was it like?",
      "Tell me about something unexpected that happened during a trip abroad. What happened, and how did you handle it?",
    ],
    compare: [
      "How has traveling abroad changed compared to the past? Talk about cost, booking, or the places people visit.",
    ],
    issue: [
      "Some people say international tourism harms the environment and local cultures. What do you think about this?",
    ],
    askAva: "I love traveling to other countries. Ask me three or four questions about my travels.",
    roleplay: {
      ask: `${RP_INTRO} You are planning a trip abroad. Call a travel agency and ask three or four questions about a tour package.`,
      problem: `${RP_PROBLEM} You arrive at the airport and find that your flight has been canceled. Talk to the airline staff, explain your situation, and ask for two or three alternatives.`,
      experience: `${RP_END} Have you ever had a serious problem while traveling? Tell me what happened and how you solved it.`,
    },
  },
  {
    id: "business_trip",
    label: "국내·해외 출장",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go on business trips. Tell me about a place you have visited for work. What was it like?",
    ],
    routine: [
      "What do you usually do to prepare for a business trip, and what is a typical day like during the trip?",
    ],
    past: [
      "Tell me about a memorable business trip. Where did you go, what was the purpose, and what happened?",
      "Have you ever had a problem during a business trip? Tell me what happened and how you dealt with it.",
    ],
    compare: [
      "How have business trips changed now that many meetings can be held online?",
    ],
    issue: [
      "Some companies have reduced business travel to save money and protect the environment. What do you think about this change?",
    ],
    askAva: "I travel for work sometimes. Ask me three or four questions about my business trips.",
  },
  {
    id: "games",
    label: "게임하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you play games. What kinds of games do you like to play? Tell me about your favorite game.",
    ],
    routine: [
      "When and where do you usually play games, and who do you play with?",
    ],
    past: [
      "How did you start playing your favorite game? Tell me about the first time you played it.",
      "Tell me about a memorable experience you had while playing a game.",
    ],
    compare: [
      "How are games today different from the games people played when you were a child?",
    ],
    issue: [
      "Some parents worry that their children spend too much time playing games. What do you think about this concern?",
    ],
    askAva: "I play games sometimes, too. Ask me three or four questions about the games I play.",
  },
  {
    id: "pets",
    label: "애완동물 기르기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you have a pet. Tell me about your pet. What does it look like, and what is its personality like?",
    ],
    routine: [
      "Tell me about how you take care of your pet every day. What do you do for it?",
    ],
    past: [
      "How did you first get your pet? Tell me the story from the beginning.",
      "Tell me about a memorable or funny thing that happened with your pet.",
    ],
    compare: [
      "How has the way people treat pets changed compared to the past?",
    ],
    issue: [
      "Many pets are abandoned every year. Why do you think this happens, and what should be done about it?",
    ],
    askAva: "I have a dog. Ask me three or four questions about my dog.",
  },
  {
    id: "news",
    label: "뉴스 보기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you follow the news. What kinds of news are you interested in, and how do you usually get the news?",
    ],
    routine: [
      "Tell me about when and how you usually check the news during the day.",
    ],
    past: [
      "Tell me about a news story that you remember well. What was it about, and why did it interest you?",
      "How did you first become interested in the news? Tell me about it.",
    ],
    compare: [
      "How has the way people get the news changed over the years?",
    ],
    issue: [
      "Fake news spreads easily online. Why is it a problem, and what can people do to avoid being misled?",
    ],
    askAva: "I read the news every morning. Ask me three or four questions about how I follow the news.",
  },

  // ───────────── Random topics (돌발) ─────────────
  {
    id: "recycling",
    label: "재활용",
    kind: "random",
    describe: [
      "Tell me about how people recycle in your country. What items do they recycle, and how do they separate them?",
    ],
    routine: [
      "Tell me about how you recycle at home. When and where do you take out the recycling?",
    ],
    past: [
      "Tell me about a time when you had a problem or a memorable experience related to recycling.",
      "When did you first learn about recycling? Tell me how you learned it.",
    ],
    compare: [
      "How have recycling rules and habits in your country changed over the years?",
    ],
    issue: [
      "Plastic waste is a global problem. What do you think governments and companies should do to reduce it?",
    ],
    askAva: "In my country, we recycle a little differently. Ask me three or four questions about recycling where I live.",
  },
  {
    id: "weather",
    label: "날씨·계절",
    kind: "random",
    describe: [
      "Tell me about the weather and the seasons in your country. What is each season like?",
    ],
    routine: [
      "What do people in your country usually do in each season? Tell me about seasonal activities.",
    ],
    past: [
      "Tell me about a memorable experience you had because of the weather, such as a storm, heavy snow, or a heat wave.",
      "Think about the weather when you were a child. Tell me about something you remember doing in a particular season.",
    ],
    compare: [
      "How has the weather in your country changed compared to when you were young?",
    ],
    issue: [
      "Climate change is causing more extreme weather. What effects have you noticed, and what should people do about it?",
    ],
    askAva: "The weather where I live is quite different from yours. Ask me three or four questions about it.",
  },
  {
    id: "bank",
    label: "은행",
    kind: "random",
    describe: [
      "Tell me about the banks in your country. What do they look like, and what services do they offer?",
    ],
    routine: [
      "What do you usually do when you go to the bank? Tell me the steps, from entering the bank to leaving.",
    ],
    past: [
      "Tell me about a memorable experience you had at a bank, such as a problem or something unexpected.",
    ],
    compare: [
      "How has banking changed over the years? Compare banking in the past with banking today.",
    ],
    issue: [
      "Many bank branches are closing because people use mobile banking. What problems does this cause for some people?",
    ],
    askAva: "I need to open a bank account. Ask me three or four questions about what kind of account I want.",
    roleplay: {
      ask: `${RP_INTRO} You want to open a new bank account. Call the bank and ask three or four questions about opening an account.`,
      problem: `${RP_PROBLEM} You find that your bank card is missing and there is a payment you did not make. Call the bank, explain the situation, and ask what they can do.`,
      experience: `${RP_END} Have you ever lost something important, like a wallet or a card? Tell me what happened and how you handled it.`,
    },
  },
  {
    id: "hotel",
    label: "호텔",
    kind: "random",
    describe: [
      "Tell me about hotels in your country. What are they usually like, and what facilities do they have?",
    ],
    routine: [
      "What do you usually do when you stay at a hotel? Tell me from check-in to check-out.",
    ],
    past: [
      "Tell me about a memorable hotel stay. Where was it, and what made it memorable?",
      "Have you ever had a problem at a hotel? Tell me what happened and how it was solved.",
    ],
    compare: [
      "How have hotels and the way people book them changed over the years?",
    ],
    issue: [
      "Short-term rentals have become popular and compete with hotels. What are the good and bad effects of this?",
    ],
    askAva: "I'm planning to stay at a hotel next month. Ask me three or four questions about my plan.",
    roleplay: {
      ask: `${RP_INTRO} You want to book a hotel room for a trip. Call the hotel and ask three or four questions about the room and services.`,
      problem: `${RP_PROBLEM} You arrive at the hotel, but they say they have no record of your reservation. Explain the situation to the front desk and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had a problem with a reservation? Tell me what happened and how it was resolved.`,
    },
  },
  {
    id: "transportation",
    label: "교통",
    kind: "random",
    describe: [
      "Tell me about public transportation in your country. What kinds are there, and which one do people use the most?",
    ],
    routine: [
      "How do you usually get around? Tell me about the transportation you use every day.",
    ],
    past: [
      "Tell me about a memorable experience you had while using public transportation.",
      "Think about transportation when you were a child. How did you usually get to school?",
    ],
    compare: [
      "How has transportation in your city changed over the past ten years?",
    ],
    issue: [
      "Traffic jams and air pollution are problems in many cities. What causes them, and what solutions do you suggest?",
    ],
    askAva: "I usually take the subway to work. Ask me three or four questions about my commute.",
    roleplay: {
      ask: `${RP_INTRO} You want to rent a car for a trip. Call a rental car company and ask three or four questions.`,
      problem: `${RP_PROBLEM} While driving the rental car, it breaks down on the highway. Call the company, explain the situation, and ask for two or three options.`,
      experience: `${RP_END} Have you ever had a problem while getting somewhere? Tell me what happened.`,
    },
  },
  {
    id: "internet",
    label: "인터넷",
    kind: "random",
    describe: [
      "Tell me about how you use the internet. What websites or apps do you use most, and why?",
    ],
    routine: [
      "Tell me about your typical internet use in a day. When do you go online, and what do you do?",
    ],
    past: [
      "Tell me about when you first started using the internet. What was it like?",
      "Tell me about a time when the internet helped you solve a problem, or a time when it caused a problem.",
    ],
    compare: [
      "How has the internet changed people's daily lives over the past twenty years?",
    ],
    issue: [
      "Many people are worried about privacy and personal information online. What do you think about this issue?",
    ],
    askAva: "I use the internet a lot for work. Ask me three or four questions about how I use it.",
  },
  {
    id: "phones",
    label: "휴대폰·기술",
    kind: "random",
    describe: [
      "Tell me about the phone you use. What does it look like, and what do you use it for the most?",
    ],
    routine: [
      "How do you use your phone during a typical day? Tell me from morning to night.",
    ],
    past: [
      "Tell me about your first mobile phone. When did you get it, and what was it like?",
      "Have you ever had a problem with your phone, like breaking or losing it? Tell me what happened.",
    ],
    compare: [
      "How have phones changed since you first started using one? Compare old phones with phones today.",
    ],
    issue: [
      "Some people say we depend too much on smartphones. What problems does this cause?",
    ],
    askAva: "I just bought a new phone. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy a new phone. Go to a phone store and ask the clerk three or four questions.`,
      problem: `${RP_PROBLEM} The new phone you bought stops working after two days. Go back to the store, explain the problem, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had a problem with an electronic device you bought? Tell me what happened.`,
    },
  },
  {
    id: "holidays",
    label: "명절·휴일",
    kind: "random",
    describe: [
      "Tell me about a major holiday in your country. When is it, and what do people do?",
    ],
    routine: [
      "What do you and your family usually do during holidays?",
    ],
    past: [
      "Tell me about a memorable holiday you spent with your family or friends.",
      "Tell me about how you spent holidays when you were a child.",
    ],
    compare: [
      "How have holiday traditions in your country changed over the years?",
    ],
    issue: [
      "Some people feel holidays have become stressful because of travel, costs, and family pressure. What do you think?",
    ],
    askAva: "We have a big holiday coming up in my country. Ask me three or four questions about it.",
  },
  {
    id: "furniture",
    label: "가구",
    kind: "random",
    describe: [
      "Tell me about the furniture in your home. What is your favorite piece of furniture, and why?",
    ],
    routine: [
      "How do you usually shop for furniture? Where do you go, and what do you look for?",
    ],
    past: [
      "Tell me about a piece of furniture you bought recently. Why did you buy it, and how did you choose it?",
      "Have you ever had a problem with furniture, such as delivery issues or something breaking?",
    ],
    compare: [
      "How is furniture today different from furniture in the past?",
    ],
    issue: [
      "Cheap furniture is often thrown away after a short time. What problems does this cause?",
    ],
    askAva: "I just bought a new sofa. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy a new desk. Call a furniture store and ask three or four questions.`,
      problem: `${RP_PROBLEM} The desk is delivered, but it is damaged. Call the store, explain the problem, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever received a damaged delivery? Tell me what happened and how you resolved it.`,
    },
  },
  {
    id: "appointments",
    label: "약속·예약",
    kind: "random",
    describe: [
      "Tell me about the kinds of appointments people usually make, like with a doctor or a hair salon. How do people make them?",
    ],
    routine: [
      "How do you usually make and keep track of your appointments?",
    ],
    past: [
      "Tell me about a time when you missed an appointment or were late. What happened?",
    ],
    compare: [
      "How has the way people make appointments changed compared to the past?",
    ],
    issue: [
      "Some clinics and restaurants suffer because people make reservations and do not show up. What do you think should be done?",
    ],
    askAva: "I have a doctor's appointment next week. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You need to see a dentist. Call the dental clinic and ask three or four questions to make an appointment.`,
      problem: `${RP_PROBLEM} You realize you cannot make it to your appointment because of an urgent meeting. Call the clinic, explain the situation, and suggest two or three options.`,
      experience: `${RP_END} Have you ever had to change an important appointment at the last minute? Tell me about it.`,
    },
  },
  {
    id: "neighborhood",
    label: "동네·이웃",
    kind: "random",
    describe: [
      "Tell me about your neighborhood. What does it look like, and what places are there?",
    ],
    routine: [
      "What do you usually do in your neighborhood? Tell me about the places you visit often.",
    ],
    past: [
      "Tell me about a memorable experience with a neighbor.",
      "How has your neighborhood changed since you first moved there?",
    ],
    compare: [
      "How are relationships between neighbors different today compared to the past?",
    ],
    issue: [
      "Noise between floors is a common problem in apartments. Why does it happen, and how can neighbors solve it?",
    ],
    askAva: "I just moved to a new neighborhood. Ask me three or four questions about it.",
  },
  {
    id: "geography",
    label: "지형·지리",
    kind: "random",
    describe: [
      "Tell me about the geography of your country. Are there many mountains, rivers, or beaches?",
    ],
    routine: [
      "What outdoor activities do people in your country enjoy because of its geography?",
    ],
    past: [
      "Tell me about a natural place in your country that you visited and remember well.",
    ],
    compare: [
      "How has development changed the natural landscape of your country?",
    ],
    issue: [
      "Some natural areas are being destroyed for construction. What do you think about this?",
    ],
    askAva: "My country has very different geography from yours. Ask me three or four questions about it.",
  },
  {
    id: "health",
    label: "건강",
    kind: "random",
    describe: [
      "Tell me about someone you know who is very healthy. What do they do to stay healthy?",
    ],
    routine: [
      "What do you do to stay healthy? Tell me about your daily habits.",
    ],
    past: [
      "Tell me about a time when you were sick or injured. What happened, and how did you recover?",
      "Have you ever changed a habit to become healthier? Tell me about it.",
    ],
    compare: [
      "How have people's ideas about health changed compared to the past?",
    ],
    issue: [
      "Many people today have unhealthy lifestyles. What are the main causes, and what can be done?",
    ],
    askAva: "I try to stay healthy. Ask me three or four questions about what I do.",
  },
  {
    id: "fashion",
    label: "패션·의류",
    kind: "random",
    describe: [
      "Tell me about the clothes people in your country usually wear. What styles are popular now?",
    ],
    routine: [
      "How do you usually shop for clothes? Where do you go, and how do you choose what to buy?",
    ],
    past: [
      "Tell me about a piece of clothing that is special to you. Where did you get it, and why is it special?",
    ],
    compare: [
      "How have fashion trends changed compared to when you were young?",
    ],
    issue: [
      "Fast fashion produces a lot of waste. What do you think about this problem?",
    ],
    askAva: "I like shopping for clothes. Ask me three or four questions about my style.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy a suit for an important event. Go to a clothing store and ask the clerk three or four questions.`,
      problem: `${RP_PROBLEM} The day before the event, you find the suit you bought has a hole in it. Call the store, explain the situation, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever bought clothes that turned out to have a problem? Tell me what happened.`,
    },
  },
  {
    id: "restaurants",
    label: "음식점·음식",
    kind: "random",
    describe: [
      "Tell me about a restaurant you like. Where is it, what does it look like, and what food does it serve?",
    ],
    routine: [
      "What do you usually do when you go out to eat? Tell me how you choose a restaurant and what you order.",
    ],
    past: [
      "Tell me about a memorable meal you had at a restaurant. What made it memorable?",
      "Have you ever had a bad experience at a restaurant? Tell me what happened.",
    ],
    compare: [
      "How have restaurants and eating-out culture changed in your country?",
    ],
    issue: [
      "Food delivery apps have become very popular. What effects have they had on restaurants and on people's lives?",
    ],
    askAva: "I love trying new restaurants. Ask me three or four questions about the restaurants I like.",
    roleplay: {
      ask: `${RP_INTRO} You want to reserve a table at a restaurant for a family dinner. Call the restaurant and ask three or four questions.`,
      problem: `${RP_PROBLEM} When you arrive, the restaurant has given your table to someone else. Explain the situation to the manager and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had a problem at a restaurant? Tell me what happened and how it ended.`,
    },
  },
];

export const TOPICS: Topic[] = [...BASE_TOPICS, ...EXTRA_TOPICS];

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

export const INTRO_QUESTION = "Let's start the interview now. Tell me a little bit about yourself.";
