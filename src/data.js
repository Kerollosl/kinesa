import bank from "./content/questions.json" with { type: "json" };
export const categories = [
  {
    id: "bible",
    name: "Bible Stories",
    short: "Bible",
    color: "#27467f",
    pale: "#e2e8f3",
    ink: "#ffffff",
    icon: "book",
    description: "Big miracles. Unforgettable journeys.",
    detail:
      "From the garden of Eden to the journeys of the apostles, rediscover the stories that shaped our faith.",
  },
  {
    id: "history",
    name: "Coptic History",
    short: "History",
    color: "#a3302b",
    pale: "#f5e2dd",
    ink: "#ffffff",
    icon: "church",
    description: "Ancient roots. Incredible stories.",
    detail:
      "Explore the roots of the Coptic Church in Egypt, its apostolic beginnings, and its enduring heritage.",
  },
  {
    id: "saints",
    name: "Saints & Heroes",
    short: "Saints",
    color: "#5e3473",
    pale: "#ede2f1",
    ink: "#ffffff",
    icon: "sparkles",
    description: "Ordinary people. Extraordinary faith.",
    detail:
      "Meet the saints, desert fathers and mothers whose lives continue to inspire generations.",
  },
  {
    id: "traditions",
    name: "Church Traditions",
    short: "Traditions",
    color: "#2c6a4d",
    pale: "#dfece4",
    ink: "#ffffff",
    icon: "cross",
    description: "The beautiful things we pass down.",
    detail:
      "Discover the meaning behind the liturgy, worship, and traditions of the Coptic Orthodox Church.",
  },
  {
    id: "feasts",
    name: "Feasts & Fasts",
    short: "Feasts",
    color: "#d9a21f",
    pale: "#f8eccb",
    ink: "#2a1d10",
    icon: "sun",
    description: "A whole year of reasons to gather.",
    detail:
      "Journey through the church calendar, from the joy of the Resurrection to seasons of fasting and reflection.",
  },
  {
    id: "symbols",
    name: "Signs & Symbols",
    short: "Symbols",
    color: "#b85c25",
    pale: "#f5e2d3",
    ink: "#ffffff",
    icon: "leaf",
    description: "Little details. Deeper meaning.",
    detail:
      "Look a little closer at the symbols, art, and visual language woven into our faith.",
  },
];
// The question bank lives in content/questions.json (validated by
// scripts/validate-questions.mjs). The game reads this legacy shape, which
// saved matches and tests also rely on.

export const questions = bank.map((q) => ({
  id: q.id,
  category: q.category,
  difficulty: q.difficulty,
  text: q.question,
  answers: q.options,
  correct: q.answerIndex,
  explanation: q.explanation,
  source: q.source,
}));
