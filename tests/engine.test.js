import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  assignCompanions,
  COMPANION_KINDS,
  answerQuestion,
  nextTurn,
  getWinners,
  getQuestion,
  ROUNDS,
} from "../src/engine.js";
import { questions, categories } from "../src/data.js";
const players = [
  { kind: "lion", name: "Mina" },
  { kind: "ox", name: "Mary" },
  { kind: "eagle", name: "John" },
  { kind: "human", name: "Mariam" },
];
test("one through four players receive unique assignments and input choices are ignored", () => {
  for (let count = 1; count <= 4; count++) {
    const game = createGame(
      players.slice(0, count).map((p) => ({ ...p, kind: "lion" })),
      () => 0,
    );
    assert.equal(game.players.length, count);
    assert.equal(new Set(game.players.map((p) => p.kind)).size, count);
    for (const p of game.players) assert.ok(COMPANION_KINDS.includes(p.kind));
  }
  assert.throws(() => createGame([]));
  assert.throws(() => createGame([...players, players[0]]));
  assert.equal(createGame([{ name: "  " }]).players[0].name, "Player 1");
  assert.notEqual(
    createGame([{ name: "Player", kind: "lion" }], () => 0).players[0].kind,
    "lion",
  );
});
test("assignment samples without replacement, does not mutate inputs, and uses the full shuffle space", () => {
  const original = structuredClone(players);
  const permutations = new Set();
  // All 4*3*2 Fisher–Yates index combinations produce all 24 permutations.
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 3; b++)
      for (let c = 0; c < 2; c++) {
        const rolls = [(a + 0.5) / 4, (b + 0.5) / 3, (c + 0.5) / 2];
        let n = 0;
        const result = assignCompanions(players, () => rolls[n++]);
        permutations.add(result.map((p) => p.kind).join(","));
        assert.equal(new Set(result.map((p) => p.kind)).size, 4);
      }
  assert.equal(permutations.size, 24);
  assert.deepEqual(players, original);
});
test("rematches deal a fresh deck while resetting scores and preserving bot status", () => {
  const first = createGame(
    [{ name: "You" }, { name: "Mina", isBot: true }],
    () => 0,
  );
  first.players[0].score = 300;
  const second = createGame(first.players, () => 0.99);
  assert.notEqual(first.players[0].kind, second.players[0].kind);
  assert.equal(second.players[0].score, 0);
  assert.equal(second.players[1].isBot, true);
});
test("a full four-player match gives each player three turns, scores correctly, and supports a shared win", () => {
  let game = createGame(players);
  const turns = [0, 0, 0, 0];
  for (let i = 0; i < ROUNDS * 4; i++) {
    turns[game.turn % 4]++;
    game = { ...game, phase: "question", question: questions[0] };
    game = answerQuestion(game, i % 4 < 2 ? questions[0].correct : 0);
    assert.equal(
      answerQuestion(game, questions[0].correct),
      game,
      "An answer cannot be scored twice",
    );
    game = nextTurn(game);
  }
  assert.deepEqual(turns, [3, 3, 3, 3]);
  assert.equal(game.phase, "finished");
  // Three in a row reaches the ×1.5 combo on the third answer.
  assert.deepEqual(
    game.players.map((p) => p.score),
    [350, 350, 0, 0],
  );
  assert.deepEqual(
    game.players.map((p) => p.correct),
    [3, 3, 0, 0],
  );
  assert.deepEqual(
    getWinners(game.players).map((p) => p.name),
    ["Mina", "Mary"],
  );
  assert.deepEqual(game.players[0].badges, ["bible"]);
});
test("the deck avoids seen questions in a category until exhausted", () => {
  for (const c of categories) {
    const first = getQuestion(c.id, [], () => 0);
    const second = getQuestion(c.id, [first.id], () => 0);
    assert.notEqual(first.id, second.id);
    assert.ok(getQuestion(c.id, [first.id, second.id], () => 0));
  }
});
test("every sample question has valid options, an explanation, and a source note", () => {
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
  for (const q of questions) {
    assert.equal(q.answers.length, 4);
    assert.ok(q.correct >= 0 && q.correct < 4);
    assert.ok(q.explanation && q.source);
    assert.ok(categories.some((c) => c.id === q.category));
  }
});

test("resume validation rejects corrupt state and restores questions from the canonical deck", async () => {
  const { restoreMatch } = await import("../src/session.js");
  const game = createGame(players);
  assert.equal(restoreMatch({ version: 0, game, mode: "friends" }), null);
  assert.equal(
    restoreMatch({ version: 1, game: { ...game, turn: 100 }, mode: "friends" }),
    null,
  );
  assert.equal(
    restoreMatch({
      version: 1,
      game: { ...game, players: [game.players[0], game.players[0]] },
      mode: "friends",
    }),
    null,
  );
  const question = questions[0];
  const valid = restoreMatch({
    version: 1,
    mode: "friends",
    game: {
      ...game,
      phase: "question",
      question: { ...question, text: "Tampered text", correct: 3 },
    },
  });
  assert.equal(valid.game.question.text, question.text);
  assert.equal(valid.game.question.correct, question.correct);
  assert.deepEqual(
    valid.game.players.map((p) => p.kind),
    game.players.map((p) => p.kind),
  );
  assert.equal(
    restoreMatch({
      version: 1,
      mode: "friends",
      game: { ...game, phase: "reveal", question, selected: 8 },
    }),
    null,
  );
  assert.equal(
    restoreMatch({
      version: 1,
      mode: "friends",
      game: { ...game, phase: "finished" },
    }),
    null,
  );
});
