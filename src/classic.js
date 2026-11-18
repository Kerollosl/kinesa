// Classic play: spin, answer, keep your turn while you're right.
// Every three right answers (or landing on the cross) earns a pick: choose a
// category and answer one harder question to win it. Win every category first.
import { categories, questions } from "./data.js";
import {
  TIMEOUT,
  assignCompanions,
  normalizeSettings,
  planBotAnswer,
  scoreAnswer,
} from "./engine.js";

export const PICK = "pick";
// Six category panels plus the cross panel, clockwise from the pointer.
export const WHEEL = [...categories.map((c) => c.id), PICK];
export const METER_MAX = 3;
export const HELPS = 2;
export const LENGTHS = {
  quick: { goal: 3, rounds: 8 },
  full: { goal: 6, rounds: 15 },
};
// A bot's turn ends after this many questions even if it never misses.
const BOT_TURN_LIMIT = 10;

export const isClassic = (game) => game?.structure === "classic";
export const goalOf = (game) => LENGTHS[game.settings.length].goal;
export const roundLimit = (game) => LENGTHS[game.settings.length].rounds;
const humans = (game) => game.players.filter((p) => !p.isBot).length;

export function createClassic(players, random = Math.random, options = {}) {
  return {
    structure: "classic",
    settings: normalizeSettings(options.settings),
    players: assignCompanions(players, random).map((p) => ({
      ...p,
      won: [],
      meter: 0,
      helps: HELPS,
    })),
    turn: 0,
    round: 1,
    phase: "spin",
    question: null,
    challenge: null,
    hidden: [],
    used: [],
    answers: {},
    selected: null,
    rival: null,
  };
}

export const spinIndex = (random = Math.random) =>
  Math.min(WHEEL.length - 1, Math.floor(random() * WHEEL.length));

// Prefers unseen questions at the wanted difficulty, then any unseen, then any.
export function drawQuestion(category, used, difficulty, random = Math.random) {
  const all = questions.filter((q) => q.category === category);
  const unseen = all.filter((q) => !used.includes(q.id));
  const wanted = (list) =>
    difficulty ? list.filter((q) => q.difficulty === difficulty) : list;
  const pool = [wanted(unseen), unseen, wanted(all), all].find((l) => l.length);
  return pool[Math.floor(random() * pool.length)];
}

// Normal questions follow the tier; a pick asks a step harder.
const difficultyFor = (tier, challenge) =>
  challenge
    ? tier === "easy"
      ? "medium"
      : "hard"
    : tier === "medium"
      ? null
      : tier;

export function askQuestion(game, category, random = Math.random, challenge) {
  const question = drawQuestion(
    category,
    game.used,
    difficultyFor(game.settings.tier, challenge),
    random,
  );
  return {
    ...game,
    phase: "question",
    question,
    challenge: challenge ? category : null,
    hidden: [],
    used: [...game.used, question.id],
    answers: {},
    selected: null,
  };
}

// The wheel stopped on WHEEL[index].
export function landOn(game, index, random = Math.random) {
  if (game.phase !== "spin") return game;
  const id = WHEEL[index];
  if (id === PICK) return { ...game, phase: "pick" };
  return askQuestion(game, id, random, false);
}

export const pickable = (player) =>
  categories.filter((c) => !player.won.includes(c.id)).map((c) => c.id);

export function choosePick(game, category, random = Math.random) {
  if (game.phase !== "pick") return game;
  if (!pickable(game.players[game.turn]).includes(category)) return game;
  return askQuestion(game, category, random, true);
}

// 50/50: hides two wrong options for this question.
export function fiftyFifty(game, random = Math.random) {
  const player = game.players[game.turn];
  if (
    game.phase !== "question" ||
    !game.question ||
    game.hidden.length ||
    player.helps < 1 ||
    game.answers[game.turn]
  )
    return game;
  const wrong = [0, 1, 2, 3].filter((i) => i !== game.question.correct);
  const keep = wrong[Math.floor(random() * wrong.length)];
  return {
    ...game,
    hidden: wrong.filter((i) => i !== keep),
    players: game.players.map((p, i) =>
      i === game.turn ? { ...p, helps: p.helps - 1 } : p,
    ),
  };
}

export function answerClassic(game, choice, msLeft = 0) {
  if (
    game.phase !== "question" ||
    !game.question ||
    !Number.isInteger(choice) ||
    choice < TIMEOUT ||
    choice > 3 ||
    game.hidden.includes(choice)
  )
    return game;
  const q = game.question;
  const player = game.players[game.turn];
  const correct = choice === q.correct;
  const points = scoreAnswer({
    correct,
    streak: player.streak,
    msLeft,
    settings: game.settings,
  });
  const streak = correct ? player.streak + 1 : 0;
  const challenge = game.challenge;
  const next = {
    ...player,
    score: player.score + points,
    correct: player.correct + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(player.bestStreak, streak),
    badges: correct
      ? [...new Set([...player.badges, q.category])]
      : player.badges,
    // The meter carries across turns and empties after every pick.
    meter: challenge
      ? 0
      : correct
        ? Math.min(METER_MAX, player.meter + 1)
        : player.meter,
    won:
      challenge && correct && !player.won.includes(challenge)
        ? [...player.won, challenge]
        : player.won,
  };
  return {
    ...game,
    phase: "reveal",
    selected: choice,
    players: game.players.map((p, i) => (i === game.turn ? next : p)),
    answers: {
      [game.turn]: { choice, correct, points, streak, challenge: !!challenge },
    },
  };
}

const finish = (game) => ({
  ...game,
  phase: "finished",
  question: null,
  challenge: null,
  hidden: [],
});
const someoneWon = (game) =>
  game.players.some((p) => p.won.length >= goalOf(game));

// Plays one practice bot's whole turn at once and records what happened.
export function playBotTurn(game, random = Math.random) {
  let g = { ...game, phase: "spin" };
  const steps = [];
  for (let n = 0; n < BOT_TURN_LIMIT; n++) {
    const bot = g.players[g.turn];
    let category;
    let challenge = bot.meter >= METER_MAX;
    if (!challenge) {
      const id = WHEEL[spinIndex(random)];
      challenge = id === PICK;
      category = challenge ? null : id;
    }
    if (challenge) {
      const open = pickable(bot);
      category = open[Math.floor(random() * open.length)];
    }
    g = askQuestion(g, category, random, challenge);
    const plan = planBotAnswer(g.question, g.settings, random);
    const left = g.settings.timed ? g.settings.seconds * 1000 - plan.delay : 0;
    g = answerClassic(g, plan.choice, Math.max(0, left));
    const correct = g.answers[g.turn].correct;
    steps.push({ category, correct, challenge });
    if (!correct || someoneWon(g)) break;
  }
  return {
    ...g,
    phase: "rival",
    question: null,
    challenge: null,
    hidden: [],
    answers: {},
    selected: null,
    rival: { player: g.turn, steps },
  };
}

// Passes play to the next seat; bots play their turn straight away.
function endTurn(game, random) {
  const turn = (game.turn + 1) % game.players.length;
  const round = turn === 0 ? game.round + 1 : game.round;
  if (round > roundLimit(game)) return finish({ ...game, round: game.round });
  const next = {
    ...game,
    turn,
    round,
    question: null,
    challenge: null,
    hidden: [],
    answers: {},
    selected: null,
    rival: null,
  };
  if (next.players[turn].isBot) return playBotTurn(next, random);
  return { ...next, phase: humans(game) > 1 ? "handoff" : "spin" };
}

// After the reveal: spin again, take a pick, or pass the turn.
export function nextStep(game, random = Math.random) {
  if (game.phase === "rival")
    return someoneWon(game) ? finish(game) : endTurn(game, random);
  if (game.phase !== "reveal") return game;
  if (someoneWon(game)) return finish(game);
  const entry = game.answers[game.turn];
  const player = game.players[game.turn];
  const clear = {
    question: null,
    challenge: null,
    hidden: [],
    answers: {},
    selected: null,
  };
  if (!entry?.correct) return endTurn(game, random);
  if (!game.challenge && player.meter >= METER_MAX)
    return { ...game, ...clear, phase: "pick" };
  return { ...game, ...clear, phase: "spin" };
}

// Most categories wins; ties go to more right answers, then shared.
export function standings(game) {
  return [...game.players].sort(
    (a, b) =>
      b.won.length - a.won.length || b.correct - a.correct || b.score - a.score,
  );
}
export function classicWinners(game) {
  const [top] = standings(game);
  return game.players.filter(
    (p) => p.won.length === top.won.length && p.correct === top.correct,
  );
}
