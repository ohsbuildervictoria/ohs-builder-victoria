// The five standard safety-quiz questions. Identical to the set migration 008
// seeded and migration 031 seeds for every new organisation; a builder whose
// bank is empty can add them from Policies → Safety Quiz and then edit them.
export const STANDARD_QUIZ = [
  {
    question: "What should you do FIRST if you witness a serious incident on site?",
    options: [
      "Take a photo for the report",
      "Ensure the area is safe and call for help / first aid",
      "Continue working and tell the supervisor later",
      "Move the injured person immediately",
    ],
    answerIndex: 1,
  },
  {
    question: "When is a SWMS required to be signed?",
    options: [
      "Only after an incident occurs",
      "Once a year regardless of task",
      "Before commencing any high-risk construction work",
      "It is optional for experienced workers",
    ],
    answerIndex: 2,
  },
  {
    question: "Which PPE is mandatory at all times on this site?",
    options: [
      "Hard hat, hi-vis and steel-capped boots",
      "Only when operating machinery",
      "Gloves and glasses only",
      "PPE is recommended but not enforced",
    ],
    answerIndex: 0,
  },
  {
    question: "What does an untagged piece of scaffolding mean?",
    options: [
      "It is brand new and safe to use",
      "It can be used with supervisor approval",
      "Do NOT use it — it has not been inspected/approved",
      "Only the top level is unsafe",
    ],
    answerIndex: 2,
  },
  {
    question: "Under Victorian OHS law, who must be notified of a notifiable incident?",
    options: [
      "The project architect only",
      "WorkSafe Victoria — immediately by phone",
      "The client within 48 hours",
      "No notification required for near misses",
    ],
    answerIndex: 1,
  },
];
