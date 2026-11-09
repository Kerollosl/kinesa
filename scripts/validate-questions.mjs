// Validates the question bank: run with `npm run validate:questions` (also part of `npm test`).
import { readFileSync } from "node:fs";
import { categories } from "../src/data.js";

const MIN_PER_CATEGORY = Number(process.env.KINESA_MIN_PER_CATEGORY ?? 20);
const DIFFICULTIES = ["easy", "medium", "hard"];
const ids = new Set(categories.map((c) => c.id));
const errors = [];
const load = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const norm = (text) => text.trim().toLowerCase().replace(/\s+/g, " ");

function check(list, file, { shipped }) {
  if (!Array.isArray(list)) return errors.push(`${file}: expected an array`);
  const seen = new Set();
  const seenQuestions = new Map();
  list.forEach((q, n) => {
    const at = `${file} #${n} (${q?.id ?? "no id"})`;
    const fail = (message) => errors.push(`${at}: ${message}`);
    if (!q || typeof q !== "object") return fail("not an object");
    if (typeof q.id !== "string" || !/^[a-z]+-\d+$/.test(q.id))
      fail("id must look like category-number");
    else if (seen.has(q.id)) fail("duplicate id");
    seen.add(q.id);
    if (!ids.has(q.category)) fail(`unknown category "${q.category}"`);
    else if (!q.id?.startsWith(`${q.category}-`))
      fail("id does not match its category");
    if (!DIFFICULTIES.includes(q.difficulty))
      fail(`difficulty must be one of ${DIFFICULTIES.join(", ")}`);
    if (typeof q.question !== "string" || q.question.trim().length < 8)
      fail("question is missing");
    else if (q.question.length > 160)
      fail("question is longer than 160 characters");
    else {
      const key = norm(q.question);
      if (seenQuestions.has(key))
        fail(`same question text as ${seenQuestions.get(key)}`);
      seenQuestions.set(key, q.id);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4)
      fail("needs exactly four options");
    else {
      if (q.options.some((o) => typeof o !== "string" || !o.trim()))
        fail("options must be non-empty text");
      else if (new Set(q.options.map(norm)).size !== 4)
        fail("options must all be different");
      if (q.options.some((o) => /\b(all|none) of the above\b/i.test(o)))
        fail("no all/none of the above");
    }
    if (
      !Number.isInteger(q.answerIndex) ||
      q.answerIndex < 0 ||
      q.answerIndex > 3
    )
      fail("answerIndex must be 0–3 (exactly one correct option)");
    if (typeof q.explanation !== "string" || q.explanation.trim().length < 20)
      fail("explanation is missing");
    if (typeof q.source !== "string" || q.source.trim().length < 4)
      fail("source is missing");
    if (shipped) {
      if (q.confidence === "review" || /\bTODO\b/i.test(JSON.stringify(q)))
        fail("flagged for review: move it to review-queue.json until checked");
      const extra = Object.keys(q).filter(
        (k) =>
          ![
            "id",
            "category",
            "difficulty",
            "question",
            "options",
            "answerIndex",
            "explanation",
            "source",
          ].includes(k),
      );
      if (extra.length) fail(`unexpected fields: ${extra.join(", ")}`);
    }
  });
  return seen;
}

const bank = load("../src/content/questions.json");
const queue = load("../src/content/review-queue.json");
const shippedIds = check(bank, "questions.json", { shipped: true });
const queuedIds = check(queue, "review-queue.json", { shipped: false });
for (const id of queuedIds)
  if (shippedIds.has(id))
    errors.push(`review-queue.json: ${id} is also in questions.json`);

const counts = Object.fromEntries(
  categories.map((c) => [c.id, { total: 0, easy: 0, medium: 0, hard: 0 }]),
);
for (const q of bank)
  if (counts[q.category]) {
    counts[q.category].total++;
    counts[q.category][q.difficulty] =
      (counts[q.category][q.difficulty] || 0) + 1;
  }
for (const [id, c] of Object.entries(counts))
  if (c.total < MIN_PER_CATEGORY)
    errors.push(
      `${id}: ${c.total} questions, needs at least ${MIN_PER_CATEGORY}`,
    );
const answers = [0, 1, 2, 3].map(
  (i) => bank.filter((q) => q.answerIndex === i).length,
);

console.log(`Question bank: ${bank.length} shipped, ${queue.length} in review`);
for (const [id, c] of Object.entries(counts))
  console.log(
    `  ${id.padEnd(11)} ${String(c.total).padStart(3)}  (easy ${c.easy}, medium ${c.medium}, hard ${c.hard})`,
  );
console.log(`  answer positions A–D: ${answers.join(" / ")}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("✓ question bank is valid");
