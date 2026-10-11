import type { Topic } from "@/lib/content/topics";

/*
  Question sets for the survey items the first bank did not cover:
  the remaining leisure activities and hobbies (written one by one),
  and every sport (built from one template with the sport's own wording).
*/

const RP_INTRO = "I'd like to give you a situation and ask you to act it out.";
const RP_PROBLEM = "I'm sorry, but there is a problem that I need you to resolve.";
const RP_END = "That's the end of the situation.";

const LEISURE_AND_HOBBIES: Topic[] = [
  {
    id: "club",
    label: "클럽 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to clubs. Tell me about a club you like to go to. Where is it, what does it look like inside, and what kind of music do they play?",
      "Tell me about the people you usually go clubbing with. Why do you enjoy going out with them?",
    ],
    routine: ["What do you usually do on a night out at a club? Tell me everything from getting ready at home to going back home."],
    past: [
      "Tell me about the most memorable night you had at a club. Who were you with, and what happened?",
      "Tell me about the first time you went to a club. How old were you, and what was your impression?",
    ],
    compare: ["How has nightlife in your country changed compared to a few years ago? Talk about the places people go and what they do there."],
    issue: ["Some neighborhoods complain about noise and safety problems near clubs. What do you think about this issue, and how could it be managed?"],
    askAva: "I sometimes go to clubs on weekends. Ask me three or four questions about the clubs I go to.",
    roleplay: {
      ask: `${RP_INTRO} You want to reserve a table at a club for a friend's birthday party. Call the club and ask three or four questions.`,
      problem: `${RP_PROBLEM} The morning after a night at the club, you realize you left your phone there. Call the club, explain the situation, and ask for two or three ways to get it back.`,
      experience: `${RP_END} Have you ever lost something important while you were out? Tell me what happened and whether you got it back.`,
    },
  },
  {
    id: "museum",
    label: "박물관 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to museums. Tell me about a museum you like. Where is it, what does it look like, and what can people see there?",
      "What kinds of exhibitions do you like to see, and why do they interest you?",
    ],
    routine: ["What do you usually do when you visit a museum? Tell me how you plan the visit and how you spend your time there."],
    past: [
      "Tell me about a memorable museum visit. Which museum was it, who were you with, and what did you see?",
      "Think about the first museum you remember visiting as a child. What was it like, and how did you feel about it?",
    ],
    compare: ["How are museums today different from museums in the past? Talk about the exhibitions, the technology, or the visitors."],
    issue: ["Some people think museums should be free for everyone, while others think visitors should pay. What is your opinion on this issue?"],
    askAva: "I like visiting museums when I travel. Ask me three or four questions about the museums I have been to.",
    roleplay: {
      ask: `${RP_INTRO} There is a special exhibition at a museum you want to visit. Call the museum and ask three or four questions about the exhibition.`,
      problem: `${RP_PROBLEM} You arrive at the museum with your friends, but the exhibition you wanted to see is closed today for maintenance. Explain the situation to your friends and suggest two or three other plans.`,
      experience: `${RP_END} Have you ever gone somewhere and found it was closed or not what you expected? Tell me what happened.`,
    },
  },
  {
    id: "sports_watch",
    label: "스포츠 관람",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like watching sports. What sports do you like to watch, and which team or player do you support?",
      "Tell me about a stadium or arena you have been to. What does it look like, and what is the atmosphere like during a game?",
    ],
    routine: ["What do you usually do when you watch a game, either at the stadium or at home? Who do you watch with, and what do you eat or drink?"],
    past: [
      "Tell me about the most exciting game you have ever watched. What happened, and why was it so memorable?",
      "Tell me about the first time you watched a game live at a stadium. Who took you, and what do you remember about it?",
    ],
    compare: ["How has the way people watch sports changed over the years? Compare watching sports in the past with watching sports today."],
    issue: ["Some people complain that ticket prices for sports games have become too expensive for ordinary fans. What do you think about this?"],
    askAva: "I love watching baseball games. Ask me three or four questions about the games I watch.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy tickets for a game this weekend. Call the ticket office and ask three or four questions about the tickets and seats.`,
      problem: `${RP_PROBLEM} You arrive at the stadium, but the game has been canceled because of heavy rain. Call your friend who was going to meet you there, explain the situation, and suggest two or three alternatives.`,
      experience: `${RP_END} Have you ever had an event you were looking forward to canceled? Tell me what happened and what you did instead.`,
    },
  },
  {
    id: "home_improve",
    label: "주거 개선",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like improving your home. Tell me about something you changed or fixed in your home recently. What did you do, and why?",
      "Which part of your home would you most like to improve, and how would you change it?",
    ],
    routine: ["Tell me how you usually go about a home improvement project. How do you plan it, where do you get the materials, and who helps you?"],
    past: [
      "Tell me about a home improvement project that did not go as planned. What happened, and how did you deal with it?",
      "Tell me about the first time you fixed or decorated something in your home by yourself. How did it turn out?",
    ],
    compare: ["How has home decorating changed in your country over the years? Talk about popular styles or the way people improve their homes."],
    issue: ["Renovating a home has become very expensive. Why do you think this is, and how does it affect people?"],
    askAva: "I just repainted my living room. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to repaint your bedroom. Go to a hardware store and ask the clerk three or four questions about what you need.`,
      problem: `${RP_PROBLEM} The paint you ordered arrives, but it is the wrong color. Call the store, explain the problem, and suggest two or three ways to solve it.`,
      experience: `${RP_END} Have you ever ordered something and received the wrong item? Tell me what happened and how it was resolved.`,
    },
  },
  {
    id: "bar",
    label: "술집·바 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to bars. Tell me about a bar you like to go to. Where is it, what does it look like, and what do they serve?",
      "Who do you usually go to bars with, and what do you talk about?",
    ],
    routine: ["What do you usually do when you go to a bar? Tell me what you order and how you spend the evening."],
    past: [
      "Tell me about a memorable evening you had at a bar. Who were you with, and what happened?",
      "Tell me about a time when something unexpected happened at a bar. How did you handle it?",
    ],
    compare: ["How has drinking culture in your country changed compared to the past? Talk about where people drink and how much."],
    issue: ["Some people feel pressure to drink at company dinners in your country. What do you think about this culture?"],
    askAva: "I like going to a small bar near my office. Ask me three or four questions about that bar.",
    roleplay: {
      ask: `${RP_INTRO} You want to hold a small party for your coworkers at a bar. Call the bar and ask three or four questions about reserving a space.`,
      problem: `${RP_PROBLEM} When you get the bill at the bar, you see that you were charged for drinks you did not order. Explain the problem to the staff and suggest two or three ways to fix it.`,
      experience: `${RP_END} Have you ever been charged the wrong amount at a store or restaurant? Tell me what happened.`,
    },
  },
  {
    id: "billiards",
    label: "당구 치기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you play pool or billiards. Tell me about the place where you usually play. What does it look like, and what is the atmosphere like?",
    ],
    routine: ["Tell me about how you usually play billiards. Who do you play with, how long do you play, and what do you do afterwards?"],
    past: [
      "How did you learn to play billiards? Tell me who taught you and what it was like at first.",
      "Tell me about a memorable game of billiards you played. What made it special?",
    ],
    compare: ["How have billiard halls in your country changed over the years? Talk about the facilities and the people who go there."],
    issue: ["Billiard halls used to have a bad image in some countries. Why do you think that was, and has it changed?"],
    askAva: "I play billiards with my friends sometimes. Ask me three or four questions about it.",
  },
  {
    id: "chess",
    label: "체스하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you play chess. Tell me where and with whom you usually play, and what you like about the game.",
    ],
    routine: ["Tell me about how you usually play chess. Do you play online or in person, and how often?"],
    past: [
      "How did you learn to play chess? Tell me about the person who taught you and how you improved.",
      "Tell me about a memorable chess game you played. What happened during the game?",
    ],
    compare: ["How has the way people play board games like chess changed with the internet?"],
    issue: ["Some parents want their children to play board games instead of video games. What do you think about this?"],
    askAva: "I play chess too. Ask me three or four questions about how I play.",
  },
  {
    id: "sns",
    label: "SNS에 글 올리기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you post on social media. Which social media do you use, and what kinds of things do you usually post?",
      "Tell me about the people you follow on social media. Why do you follow them?",
    ],
    routine: ["Tell me about your social media habits. When do you post, how often do you check it, and how long do you spend on it each day?"],
    past: [
      "Tell me about a post you made that got a lot of attention or that you remember well. What was it about?",
      "When did you first start using social media? Tell me how you started and how your use has changed.",
    ],
    compare: ["How has social media changed since you first started using it?"],
    issue: ["Some people say social media makes people feel worse about their own lives. What do you think about this issue?"],
    askAva: "I post on social media quite often. Ask me three or four questions about what I post.",
  },
  {
    id: "texting",
    label: "친구들과 문자 대화",
    kind: "survey",
    describe: [
      "You indicated in the survey that you text your friends. Tell me about how you usually keep in touch with your friends. What app do you use, and what do you talk about?",
    ],
    routine: ["When during the day do you usually text your friends, and how many people do you talk to in a typical day?"],
    past: [
      "Tell me about a time when a text message caused a misunderstanding. What happened, and how did you clear it up?",
      "Tell me about a memorable conversation you had with a friend by text.",
    ],
    compare: ["How has the way people communicate with friends changed compared to the past? Compare texting with calling or meeting in person."],
    issue: ["Some people say young people would rather text than talk face to face. What problems might this cause?"],
    askAva: "I text my friends all day. Ask me three or four questions about how I keep in touch with them.",
  },
  {
    id: "test_prep",
    label: "시험 대비 과정 수강",
    kind: "survey",
    describe: [
      "You indicated in the survey that you take test preparation courses. Tell me about the course you are taking. What test is it for, and what is the class like?",
    ],
    routine: ["Tell me about how you study for your test. What do you do in class, and how do you study on your own?"],
    past: [
      "Why did you decide to take this course? Tell me what happened that made you sign up.",
      "Tell me about a test you took in the past that was very important to you. How did you prepare, and how did it go?",
    ],
    compare: ["How has the way people prepare for tests changed? Compare studying in academies with studying online."],
    issue: ["Many people in your country feel a lot of pressure to get high test scores for jobs. What do you think about this?"],
    askAva: "I'm preparing for an exam too. Ask me three or four questions about how I'm studying.",
    roleplay: {
      ask: `${RP_INTRO} You want to sign up for a test preparation course. Call the academy and ask three or four questions about the course.`,
      problem: `${RP_PROBLEM} The academy has suddenly changed the class schedule, and you cannot attend at the new time. Call the academy, explain the situation, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had a schedule change that caused you a problem? Tell me what happened and how you solved it.`,
    },
  },
  {
    id: "spa",
    label: "스파·마사지숍 가기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you go to spas or massage shops. Tell me about a place you like to go. What does it look like, and what services do they offer?",
    ],
    routine: ["What do you usually do when you go to a spa? Tell me everything from the moment you arrive."],
    past: [
      "Tell me about a memorable visit to a spa or massage shop. What made it special?",
      "Tell me about the first time you went to a spa. Who did you go with, and how did you feel?",
    ],
    compare: ["Why do you think more people go to spas and massage shops these days than in the past?"],
    issue: ["Stress is a serious problem for many workers. What do you think causes it, and how can people deal with it?"],
    askAva: "I go to a spa sometimes to relax. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to book a massage at a new spa. Call the spa and ask three or four questions about their services.`,
      problem: `${RP_PROBLEM} You arrive for your appointment, but the spa has double-booked your time slot. Explain the situation to the staff and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had a problem with a reservation or appointment? Tell me what happened.`,
    },
  },
  {
    id: "job_hunt",
    label: "구직활동",
    kind: "survey",
    describe: [
      "You indicated in the survey that you are looking for a job. Tell me what kind of job you are looking for and why you are interested in it.",
    ],
    routine: ["Tell me about how you look for jobs. Where do you find job postings, and what do you do to prepare your applications?"],
    past: [
      "Tell me about a job interview you had. What questions did they ask, and how did it go?",
      "Tell me about how you decided what career you wanted. What experiences influenced your decision?",
    ],
    compare: ["How has the job market for young people changed compared to when your parents were young?"],
    issue: ["Youth unemployment is a concern in many countries. What do you think are the causes, and what could be done about it?"],
    askAva: "I'm looking for a new job too. Ask me three or four questions about my job search.",
    roleplay: {
      ask: `${RP_INTRO} You saw a job posting you are interested in. Call the company and ask three or four questions about the position.`,
      problem: `${RP_PROBLEM} You have a job interview tomorrow, but you have just found out it is at the same time as an important family event. Call the company, explain the situation, and suggest two or three alternatives.`,
      experience: `${RP_END} Have you ever had two important things scheduled at the same time? Tell me how you handled it.`,
    },
  },
  {
    id: "volunteer",
    label: "자원봉사",
    kind: "survey",
    describe: [
      "You indicated in the survey that you do volunteer work. Tell me about the volunteer work you do. Where do you volunteer, and what do you do there?",
    ],
    routine: ["Tell me about a typical day of volunteering. How do you get there, and what do you do from start to finish?"],
    past: [
      "How did you first start volunteering? Tell me what made you begin.",
      "Tell me about a memorable experience you had while volunteering. What happened, and how did it affect you?",
    ],
    compare: ["How has volunteering in your country changed over the years? Talk about the kinds of activities and the people who take part."],
    issue: ["Some schools require students to do volunteer work. Do you think volunteering should be required? Why or why not?"],
    askAva: "I volunteer at an animal shelter. Ask me three or four questions about my volunteer work.",
    roleplay: {
      ask: `${RP_INTRO} You want to volunteer at a local community center. Call the center and ask three or four questions about volunteering there.`,
      problem: `${RP_PROBLEM} You promised to help at a volunteer event this weekend, but you have become sick. Call the organizer, explain the situation, and suggest two or three ways to help.`,
      experience: `${RP_END} Have you ever had to break a promise because of something unexpected? Tell me what happened.`,
    },
  },
  {
    id: "drive",
    label: "드라이브",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like to go for drives. Tell me about a place you like to drive to. What is the route like, and what do you see along the way?",
    ],
    routine: ["What do you usually do when you go for a drive? Who do you go with, what do you listen to, and where do you stop?"],
    past: [
      "Tell me about a memorable drive you went on. Where did you go, and what happened?",
      "Tell me about when you first learned to drive. Who taught you, and how did it go?",
    ],
    compare: ["How have cars and driving changed over the years in your country?"],
    issue: ["Traffic accidents are still a serious problem. What causes most accidents, and what should be done to make roads safer?"],
    askAva: "I like going for long drives on weekends. Ask me three or four questions about my drives.",
  },
  {
    id: "read_kids",
    label: "아이에게 책 읽어주기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you read books to children. Tell me about the children you read to and the kinds of books you read to them.",
    ],
    routine: ["Tell me about how you usually read to children. When do you read, how do you choose the books, and how do they react?"],
    past: [
      "Tell me about a memorable time you read a book to a child. What happened?",
      "Think about the books you liked when you were a child. Who read them to you, and what do you remember?",
    ],
    compare: ["How are children's books and reading habits different today compared to when you were young?"],
    issue: ["Many children now spend more time on screens than with books. What effects might this have?"],
    askAva: "I read to my niece every weekend. Ask me three or four questions about it.",
  },
  {
    id: "instrument",
    label: "악기 연주하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you play a musical instrument. Tell me about the instrument you play. What does it look and sound like, and why did you choose it?",
    ],
    routine: ["Tell me about how you practice. When and where do you practice, and what do you usually play?"],
    past: [
      "How did you learn to play your instrument? Tell me about your teacher and how you improved.",
      "Tell me about a time you performed in front of other people. How did you feel, and how did it go?",
    ],
    compare: ["How has the way people learn musical instruments changed? Compare learning from a teacher with learning from online videos."],
    issue: ["Some people think every child should learn a musical instrument at school. What do you think about this?"],
    askAva: "I play the guitar. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to take lessons for a new instrument. Call a music school and ask three or four questions about the lessons.`,
      problem: `${RP_PROBLEM} Right before an important performance, a part of your instrument breaks. Call a friend who also plays, explain the situation, and suggest two or three solutions.`,
      experience: `${RP_END} Have you ever had something go wrong right before an important event? Tell me what happened.`,
    },
  },
  {
    id: "singing",
    label: "노래 부르기·합창",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like singing. Where do you usually sing, and what kinds of songs do you like to sing?",
    ],
    routine: ["Tell me about how you usually spend time singing. Do you go to karaoke, sing in a choir, or sing at home? Who do you sing with?"],
    past: [
      "Tell me about a memorable time you sang in front of other people. What happened?",
      "When did you start enjoying singing? Tell me how it began.",
    ],
    compare: ["How has karaoke or singing culture changed in your country over the years?"],
    issue: ["Some people say audition programs on TV give young people unrealistic dreams about becoming singers. What do you think?"],
    askAva: "I love going to karaoke. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to join a local choir. Call the choir leader and ask three or four questions about joining.`,
      problem: `${RP_PROBLEM} On the day of the choir's concert, you lose your voice. Call the choir leader, explain the situation, and suggest two or three options.`,
      experience: `${RP_END} Have you ever been unable to do something you had promised because you were sick? Tell me about it.`,
    },
  },
  {
    id: "dance",
    label: "춤추기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like dancing. What kind of dancing do you do, and where do you usually dance?",
    ],
    routine: ["Tell me about a typical dance class or practice session. What do you do from start to finish?"],
    past: [
      "How did you get interested in dancing? Tell me about the first time you danced in a class or in public.",
      "Tell me about a memorable performance or dance event you took part in.",
    ],
    compare: ["How has dancing become more or less popular in your country? Talk about the styles people like and where they learn."],
    issue: ["Some people say dance should be taught as a sport at school. What do you think about this idea?"],
    askAva: "I take a dance class every week. Ask me three or four questions about it.",
    roleplay: {
      ask: `${RP_INTRO} You want to sign up for a dance class. Call the dance studio and ask three or four questions about the classes.`,
      problem: `${RP_PROBLEM} You hurt your ankle a week before a dance performance. Call your dance teacher, explain the situation, and suggest two or three options.`,
      experience: `${RP_END} Have you ever been injured before something you had prepared for? Tell me what happened.`,
    },
  },
  {
    id: "writing",
    label: "글쓰기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like writing. What kinds of things do you write, such as letters, short stories, or poems? Tell me about them.",
    ],
    routine: ["Tell me about your writing habits. When and where do you write, and what helps you get ideas?"],
    past: [
      "Tell me about something you wrote that is special to you. What was it about, and why is it important?",
      "When did you start writing for fun? Tell me how it began.",
    ],
    compare: ["How has the way people write changed? Compare handwritten letters in the past with messages and posts today."],
    issue: ["Some people worry that people no longer write long or careful texts because of smartphones. What do you think?"],
    askAva: "I keep a diary and write short stories. Ask me three or four questions about my writing.",
  },
  {
    id: "drawing",
    label: "그림 그리기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like drawing. What do you usually draw, and what materials do you use?",
    ],
    routine: ["Tell me about how you usually spend time drawing. Where do you draw, and how long does it take to finish a piece?"],
    past: [
      "How did you become interested in drawing? Tell me about the first drawing you were proud of.",
      "Tell me about a memorable drawing you made. What was it, and what happened with it?",
    ],
    compare: ["How has drawing changed now that many people draw on tablets instead of paper?"],
    issue: ["Some people think art classes at school are not as important as other subjects. What is your opinion?"],
    askAva: "I like drawing too. Ask me three or four questions about what I draw.",
  },
  {
    id: "stocks",
    label: "주식 투자",
    kind: "survey",
    describe: [
      "You indicated in the survey that you invest in stocks. Tell me about how you invest. What kinds of companies do you invest in, and how do you choose them?",
    ],
    routine: ["Tell me about your investing routine. How often do you check your stocks, and where do you get information?"],
    past: [
      "How did you start investing? Tell me what made you begin and what your first investment was.",
      "Tell me about a time you made or lost money on an investment. What happened, and what did you learn?",
    ],
    compare: ["How has investing changed in your country? Why do you think more young people invest these days?"],
    issue: ["Some people worry that young people take too many risks when they invest. What do you think about this issue?"],
    askAva: "I've started investing in stocks recently. Ask me three or four questions about it.",
  },
  {
    id: "travel_blogs",
    label: "여행 잡지·블로그 읽기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you read travel magazines or blogs. Tell me about a travel blog or magazine you like. What kind of content does it have?",
    ],
    routine: ["When do you usually read travel blogs or magazines, and how do you use the information?"],
    past: [
      "Tell me about a trip you took because of something you read in a travel blog or magazine. How did it go?",
      "Tell me about a time when information from a blog turned out to be wrong. What happened?",
    ],
    compare: ["How has the way people plan trips changed? Compare guidebooks in the past with blogs and videos today."],
    issue: ["Some travel blogs are paid to write positive reviews. Why is this a problem, and how can readers tell?"],
    askAva: "I read travel blogs all the time. Ask me three or four questions about them.",
  },
  {
    id: "photo",
    label: "사진 촬영하기",
    kind: "survey",
    describe: [
      "You indicated in the survey that you like taking photos. What do you usually take photos of, and what camera or phone do you use?",
    ],
    routine: ["Tell me about how you usually take photos. Where do you go, and what do you do with the photos afterwards?"],
    past: [
      "Tell me about a photo you took that you are especially proud of. Where and when did you take it?",
      "How did you become interested in photography? Tell me how it started.",
    ],
    compare: ["How has photography changed since smartphones became common?"],
    issue: ["Some people take photos of strangers and post them online without asking. What do you think about this issue?"],
    askAva: "I like taking photos too. Ask me three or four questions about my photography.",
    roleplay: {
      ask: `${RP_INTRO} You want to buy a new camera. Go to a camera store and ask the clerk three or four questions.`,
      problem: `${RP_PROBLEM} You borrowed a friend's camera for a trip, and you dropped it and broke the lens. Call your friend, explain the situation, and suggest two or three ways to make it right.`,
      experience: `${RP_END} Have you ever broken or lost something that belonged to someone else? Tell me what happened.`,
    },
  },
];

// ── Sports, one template ─────────────────────────────────

type Sport = {
  id: string;
  label: string;
  /** "play tennis" — what you do */
  vp: string;
  /** "playing tennis" */
  ving: string;
  /** "tennis" — the activity as a noun */
  noun: string;
  /** where it usually happens */
  place: string;
};

const SPORTS: Sport[] = [
  { id: "basketball", label: "농구", vp: "play basketball", ving: "playing basketball", noun: "basketball", place: "court" },
  { id: "baseball", label: "야구·소프트볼", vp: "play baseball or softball", ving: "playing baseball", noun: "baseball", place: "field" },
  { id: "soccer", label: "축구", vp: "play soccer", ving: "playing soccer", noun: "soccer", place: "field" },
  { id: "football", label: "미식축구", vp: "play American football", ving: "playing football", noun: "American football", place: "field" },
  { id: "hockey", label: "하키", vp: "play hockey", ving: "playing hockey", noun: "hockey", place: "rink" },
  { id: "cricket", label: "크리켓", vp: "play cricket", ving: "playing cricket", noun: "cricket", place: "field" },
  { id: "golf", label: "골프", vp: "play golf", ving: "playing golf", noun: "golf", place: "golf course or driving range" },
  { id: "volleyball", label: "배구", vp: "play volleyball", ving: "playing volleyball", noun: "volleyball", place: "court" },
  { id: "tennis", label: "테니스", vp: "play tennis", ving: "playing tennis", noun: "tennis", place: "court" },
  { id: "badminton", label: "배드민턴", vp: "play badminton", ving: "playing badminton", noun: "badminton", place: "court" },
  { id: "pingpong", label: "탁구", vp: "play table tennis", ving: "playing table tennis", noun: "table tennis", place: "place" },
  { id: "ski", label: "스키·스노보드", vp: "go skiing or snowboarding", ving: "skiing or snowboarding", noun: "skiing and snowboarding", place: "ski resort" },
  { id: "skate", label: "아이스 스케이트", vp: "go ice skating", ving: "ice skating", noun: "ice skating", place: "rink" },
  { id: "fishing", label: "낚시", vp: "go fishing", ving: "fishing", noun: "fishing", place: "spot" },
  { id: "taekwondo", label: "태권도", vp: "practice taekwondo", ving: "practicing taekwondo", noun: "taekwondo", place: "studio" },
];

function sportTopic(s: Sport): Topic {
  return {
    id: s.id,
    label: s.label,
    kind: "survey",
    describe: [
      `You indicated in the survey that you ${s.vp}. Tell me about the ${s.place} where you usually ${s.vp}. Where is it, what is it like, and who do you go with?`,
      `What do you like about ${s.noun}? Tell me what makes it fun and what skills or equipment it requires.`,
    ],
    routine: [`Tell me about what you usually do when you ${s.vp}. How do you get ready, and what happens from start to finish?`],
    past: [
      `How did you first get into ${s.noun}? Tell me who introduced you to it and what your first experience was like.`,
      `Tell me about a memorable experience you had while ${s.ving}. What happened, and why do you still remember it?`,
    ],
    compare: [`How has ${s.noun} changed in your country over the years? Talk about how popular it is, the facilities, or the way people enjoy it.`],
    issue: [`Some people say ${s.noun} can be expensive or lead to injuries. What problems do people face when they ${s.vp}, and how could they be solved?`],
    askAva: `I ${s.vp} too. Ask me three or four questions about how I enjoy it.`,
    roleplay: {
      ask: `${RP_INTRO} You want to take ${s.noun} lessons at a sports center. Call the center and ask three or four questions about the lessons.`,
      problem: `${RP_PROBLEM} You arrive for your ${s.noun} lesson, but the instructor is sick and the lesson has been canceled. Talk to the staff, explain your situation, and suggest two or three alternatives.`,
      experience: `${RP_END} Have you ever had a plan for sports or exercise canceled or ruined? Tell me what happened and what you did instead.`,
    },
  };
}

export const EXTRA_TOPICS: Topic[] = [...LEISURE_AND_HOBBIES, ...SPORTS.map(sportTopic)];
