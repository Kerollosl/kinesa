import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
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
test("one through four players are supported, with distinct companions", () => {
  for (let n = 1; n <= 4; n++)
    assert.equal(createGame(players.slice(0, n)).players.length, n);
  assert.throws(() => createGame([]));
  assert.throws(() => createGame([...players, players[0]]));
  assert.throws(() => createGame([players[0], players[0]]));
  assert.equal(
    createGame([{ kind: "lion", name: "   " }]).players[0].name,
    "Player 1",
  );
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
  assert.deepEqual(
    game.players.map((p) => p.score),
    [300, 300, 0, 0],
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
