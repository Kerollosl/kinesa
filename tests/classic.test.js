import test from "node:test";
import assert from "node:assert/strict";
import {
  HELPS,
  METER_MAX,
  PICK,
  WHEEL,
  answerClassic,
  choosePick,
  classicWinners,
  createClassic,
  landOn,
  nextStep,
  playBotTurn,
  fiftyFifty,
} from "../src/classic.js";
import { TIMEOUT } from "../src/engine.js";
import { categories } from "../src/data.js";
import { restoreMatch } from "../src/session.js";

const friends = (n = 2, settings = {}) =>
  createClassic(
    Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}` })),
    () => 0,
    { settings },
  );
const right = (g) => answerClassic(g, g.question.correct, 0);
const wrong = (g) => answerClassic(g, (g.question.correct + 1) % 4, 0);

test("the wheel has six categories and one pick panel", () => {
  assert.equal(WHEEL.length, 7);
  assert.equal(WHEEL.at(-1), PICK);
  assert.deepEqual(
    WHEEL.slice(0, 6),
    categories.map((c) => c.id),
  );
});

test("a right answer keeps the turn and fills the meter; three earns a pick", () => {
  let g = friends();
  for (let n = 1; n <= METER_MAX; n++) {
    g = landOn(g, 0);
    assert.equal(g.phase, "question");
    assert.equal(g.question.category, "bible");
    g = right(g);
    assert.equal(g.players[0].meter, n);
    g = nextStep(g);
    assert.equal(g.turn, 0, "the same player keeps going");
  }
  assert.equal(g.phase, "pick");
  g = choosePick(g, "saints");
  assert.equal(g.challenge, "saints");
  assert.equal(g.question.category, "saints");
  g = right(g);
  assert.deepEqual(g.players[0].won, ["saints"]);
  assert.equal(g.players[0].meter, 0);
  g = nextStep(g);
  assert.equal(g.phase, "spin");
  assert.equal(choosePick({ ...g, phase: "pick" }, "saints").phase, "pick");
});

test("a miss passes the turn, with a cover between friends", () => {
  let g = landOn(friends(), 2);
  g = wrong(g);
  assert.equal(g.players[0].streak, 0);
  g = nextStep(g);
  assert.equal(g.turn, 1);
  assert.equal(g.phase, "handoff");
  assert.equal(g.round, 1);
});

test("landing on the cross goes straight to a pick", () => {
  const g = landOn(friends(), WHEEL.indexOf(PICK));
  assert.equal(g.phase, "pick");
});

test("winning every category ends the game at once", () => {
  let g = friends(2, { length: "quick" });
  g.players[0].won = ["bible", "history"];
  g = { ...g, phase: "pick" };
  g = right(choosePick(g, "feasts"));
  g = nextStep(g);
  assert.equal(g.phase, "finished");
  assert.deepEqual(
    classicWinners(g).map((p) => p.name),
    ["P1"],
  );
});

test("the round limit ends the game and most categories wins", () => {
  let g = friends(2, { length: "quick" });
  g.players[1].won = ["bible"];
  for (let i = 0; i < 16; i++) {
    g = nextStep(wrong(landOn({ ...g, phase: "spin" }, 0)));
    if (g.phase === "finished") break;
  }
  assert.equal(g.phase, "finished");
  assert.equal(g.round, 8);
  assert.deepEqual(
    classicWinners(g).map((p) => p.name),
    ["P2"],
  );
});

test("50/50 hides two wrong options once per question and costs one help", () => {
  let g = landOn(friends(), 0);
  g = fiftyFifty(g, () => 0);
  assert.equal(g.hidden.length, 2);
  assert.ok(!g.hidden.includes(g.question.correct));
  assert.equal(g.players[0].helps, HELPS - 1);
  assert.equal(fiftyFifty(g), g, "only once per question");
  assert.equal(
    answerClassic(g, g.hidden[0]),
    g,
    "hidden options can't be picked",
  );
});

test("timeouts count as a miss", () => {
  const g = answerClassic(landOn(friends(), 1), TIMEOUT, 0);
  assert.equal(g.answers[0].correct, false);
});

test("a practice bot plays its whole turn and hands back", () => {
  let g = createClassic([{ name: "You" }, { name: "Mina", isBot: true }]);
  g = nextStep(wrong(landOn(g, 0)));
  assert.equal(g.phase, "rival");
  assert.equal(g.turn, 1);
  assert.ok(g.rival.steps.length >= 1);
  const last = g.rival.steps.at(-1);
  assert.ok(
    !last.correct ||
      g.rival.steps.length === 10 ||
      g.players[1].won.length === 6,
  );
  g = nextStep(g);
  if (g.phase !== "finished") {
    assert.equal(g.turn, 0);
    assert.equal(g.phase, "spin");
    assert.equal(g.round, 2);
  }
});

test("bots always finish a game", () => {
  for (let seed = 0; seed < 20; seed++) {
    let n = seed + 1;
    const random = () => {
      n = (n * 16807) % 2147483647;
      return n / 2147483647;
    };
    let g = createClassic(
      [{ name: "You" }, { name: "Mina", isBot: true }],
      random,
      { settings: { length: "quick" } },
    );
    for (let i = 0; i < 400 && g.phase !== "finished"; i++) {
      if (g.phase === "spin") g = landOn(g, Math.floor(random() * 7), random);
      else if (g.phase === "pick")
        g = choosePick(
          g,
          categories.find((c) => !g.players[g.turn].won.includes(c.id)).id,
          random,
        );
      else if (g.phase === "question") g = random() < 0.6 ? right(g) : wrong(g);
      else g = nextStep(g, random);
    }
    assert.equal(g.phase, "finished");
  }
});

test("classic games survive a save and reload, and tampering fails closed", () => {
  let g = createClassic([{ name: "You" }, { name: "Mina", isBot: true }]);
  g = right(landOn(g, 3));
  const saved = JSON.parse(
    JSON.stringify({ version: 2, mode: "random", game: g }),
  );
  const back = restoreMatch(saved);
  assert.equal(back.game.structure, "classic");
  assert.equal(back.game.phase, "reveal");
  assert.equal(back.game.players[0].meter, 1);
  assert.equal(back.game.answers[0].correct, true);
  const bad = structuredClone(saved);
  bad.game.players[0].won = ["bible", "bible"];
  assert.equal(restoreMatch(bad), null);
  const meter = structuredClone(saved);
  meter.game.players[0].meter = 9;
  assert.equal(restoreMatch(meter), null);
  const daily = structuredClone(saved);
  daily.mode = "daily";
  assert.equal(restoreMatch(daily), null);
});

test("your companion changes from one game to the next", async () => {
  const { freshCompanion, createGame } = await import("../src/engine.js");
  for (let i = 0; i < 50; i++) {
    const game = createGame([{ name: "You" }, { name: "Bot", isBot: true }]);
    const last = game.players[0].kind;
    const next = freshCompanion(game, last);
    assert.notEqual(next.players[0].kind, last);
    assert.notEqual(next.players[0].kind, next.players[1].kind);
  }
});
