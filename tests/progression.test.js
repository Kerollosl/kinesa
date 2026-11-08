import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  scoreAnswer,
  recordAnswer,
  revealAnswers,
  answerQuestion,
  nextTurn,
  matchLength,
  planBotAnswer,
  normalizeSettings,
  TIMEOUT,
} from "../src/engine.js";
import { restoreMatch, MATCH_VERSION } from "../src/session.js";
import {
  migrateStats,
  levelInfo,
  recordCorrect,
  recordMatch,
  masteryFor,
  xpForLevel,
} from "../src/progress.js";
import { questions } from "../src/data.js";

const q = questions[0];
const timed = normalizeSettings({ tier: "medium" });

test("scoring rewards streaks with a combo and fast answers with a capped speed bonus", () => {
  assert.equal(scoreAnswer({ correct: false, streak: 4, settings: timed }), 0);
  assert.equal(scoreAnswer({ correct: true, streak: 0, settings: timed }), 100);
  assert.equal(scoreAnswer({ correct: true, streak: 2, settings: timed }), 150);
  assert.equal(scoreAnswer({ correct: true, streak: 4, settings: timed }), 200);
  assert.equal(
    scoreAnswer({ correct: true, streak: 0, msLeft: 20000, settings: timed }),
    150,
  );
  assert.equal(
    scoreAnswer({ correct: true, streak: 0, msLeft: 99999, settings: timed }),
    150,
  );
  assert.equal(
    scoreAnswer({ correct: true, streak: 0, msLeft: 10000, settings: timed }),
    125,
  );
  const relaxed = normalizeSettings({ timed: false });
  assert.equal(
    scoreAnswer({ correct: true, streak: 0, msLeft: 20000, settings: relaxed }),
    100,
  );
  assert.equal(
    scoreAnswer({
      correct: true,
      streak: 9,
      settings: { ...relaxed, combo: false },
    }),
    100,
  );
});

test("easy play is always relaxed and settings fall back to safe defaults", () => {
  assert.deepEqual(
    [
      normalizeSettings({ tier: "easy", timed: true }).timed,
      normalizeSettings({ tier: "easy" }).seconds,
    ],
    [false, 0],
  );
  assert.equal(normalizeSettings({ tier: "hard" }).seconds, 15);
  assert.equal(normalizeSettings({ questions: 7 }).questions, 10);
  assert.equal(normalizeSettings({ tier: "bogus" }).tier, "medium");
  assert.equal(
    normalizeSettings({ tier: "scholar" }).tier,
    "hard",
    "old tier names carry forward",
  );
});

test("a simultaneous round scores every player at once and timeouts break streaks", () => {
  let game = createGame(
    [
      { name: "Kero" },
      { name: "Mina", isBot: true },
      { name: "Mariam", isBot: true },
    ],
    Math.random,
    { structure: "simultaneous", settings: { questions: 5 } },
  );
  assert.equal(matchLength(game), 5);
  game = {
    ...game,
    phase: "question",
    question: q,
    players: game.players.map((p) => ({ ...p, streak: 2 })),
  };
  game = recordAnswer(game, 1, q.correct, 5000);
  assert.equal(recordAnswer(game, 1, 0), game, "A player cannot answer twice");
  game = recordAnswer(game, 0, q.correct, 20000);
  assert.equal(
    game.phase,
    "question",
    "Simultaneous rounds stay open until revealed",
  );
  game = revealAnswers(game);
  assert.equal(game.phase, "reveal");
  assert.equal(
    game.players[0].score,
    200,
    "×1.5 combo plus the full speed bonus",
  );
  assert.equal(game.players[0].streak, 3);
  assert.equal(game.players[2].score, 0);
  assert.equal(
    game.players[2].streak,
    0,
    "Not answering in time ends the streak",
  );
  assert.equal(game.answers[2].choice, TIMEOUT);
  assert.equal(
    game.selected,
    q.correct,
    "selected mirrors the human player's pick",
  );
  for (let i = 0; i < 5; i++) game = nextTurn({ ...game, phase: "reveal" });
  assert.equal(game.phase, "finished");
});

test("turn-based answers score only the active player and accept a timeout", () => {
  let game = createGame([{ name: "A" }, { name: "B" }]);
  game = { ...game, phase: "question", question: q };
  game = answerQuestion(game, TIMEOUT);
  assert.equal(game.phase, "reveal");
  assert.equal(game.selected, TIMEOUT);
  assert.equal(game.players[0].score, 0);
  assert.deepEqual(Object.keys(game.answers), ["0"]);
});

test("practice bots plan a valid pick within the question window", () => {
  const settings = normalizeSettings({ tier: "hard" });
  for (let i = 0; i < 50; i++) {
    const plan = planBotAnswer(q, settings);
    assert.ok(plan.choice >= 0 && plan.choice <= 3);
    assert.ok(plan.delay >= 1800 && plan.delay < settings.seconds * 1000);
  }
  assert.equal(planBotAnswer(q, settings, () => 0).choice, q.correct);
  assert.notEqual(planBotAnswer(q, settings, () => 0.99).choice, q.correct);
});

test("version 1 saves migrate to version 2 with legacy flat scoring", () => {
  const v1Game = {
    players: [
      {
        name: "Kero",
        kind: "lion",
        isBot: false,
        score: 200,
        badges: ["bible"],
      },
      { name: "Mina", kind: "ox", isBot: true, score: 100, badges: [] },
    ],
    turn: 3,
    phase: "reveal",
    used: [q.id],
    question: q,
    selected: q.correct,
  };
  const restored = restoreMatch({ version: 1, mode: "random", game: v1Game });
  assert.ok(restored);
  assert.equal(restored.game.structure, "turns");
  assert.equal(restored.game.settings.combo, false);
  assert.equal(restored.game.settings.timed, false);
  assert.deepEqual(
    restored.game.players.map((p) => p.correct),
    [2, 1],
  );
  assert.equal(restored.game.selected, q.correct);
  assert.equal(
    restoreMatch({
      version: 1,
      mode: "random",
      game: { ...v1Game, players: [{ ...v1Game.players[0], score: 150 }] },
    }),
    null,
    "v1 scores were always multiples of 100",
  );
});

test("version 2 saves round-trip and reject tampering", () => {
  let game = createGame(
    [{ name: "Kero" }, { name: "Mina", isBot: true }],
    Math.random,
    {
      structure: "simultaneous",
    },
  );
  game = { ...game, phase: "question", question: q, used: [q.id] };
  game = recordAnswer(game, 1, 2, 4000);
  const saved = JSON.parse(
    JSON.stringify({ version: MATCH_VERSION, mode: "random", game }),
  );
  const restored = restoreMatch(saved);
  assert.equal(restored.game.structure, "simultaneous");
  assert.deepEqual(restored.game.answers, { 1: { choice: 2, msLeft: 4000 } });
  assert.equal(
    restoreMatch({
      ...saved,
      game: { ...saved.game, phase: "reveal", selected: 9 },
    }),
    null,
  );
  assert.equal(
    restoreMatch({
      ...saved,
      game: {
        ...saved.game,
        players: [{ ...saved.game.players[0], correct: 99 }],
      },
    }),
    null,
  );
  assert.equal(
    restoreMatch({
      ...saved,
      game: { ...saved.game, answers: { 7: { choice: 1 } } },
    }),
    null,
  );
});

test("stats migrate from version 1 and progress through levels and mastery", () => {
  const migrated = migrateStats({
    games: 2,
    correct: 4,
    badges: ["bible", "nope"],
  });
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.badges, ["bible"]);
  assert.equal(migrated.xp, 4 * 10 + 2 * 25);
  assert.deepEqual(migrated.categoryCorrect, { bible: 1 });
  assert.deepEqual(migrateStats(migrated), migrated, "v2 records are stable");
  assert.equal(migrateStats("garbage").games, 0);

  assert.deepEqual(
    [xpForLevel(1), xpForLevel(2), xpForLevel(3)],
    [0, 100, 300],
  );
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(350).level, 3);

  let stats = migrated;
  let unlocked = null;
  for (let i = 0; i < 4; i++) {
    const result = recordCorrect(stats, "bible", i + 1);
    stats = result.stats;
    unlocked ||= result.newMastery;
  }
  assert.equal(stats.categoryCorrect.bible, 5);
  assert.equal(unlocked?.id, "bronze");
  assert.equal(masteryFor(15).id, "silver");
  const first = recordCorrect(stats, "saints", 1);
  assert.equal(first.newBadge, true);
  assert.equal(recordMatch(stats, { won: true }).gained, 50);
});
