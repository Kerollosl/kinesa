import { questions } from "./data.js";
// Rounds per player in turn-based (pass-and-play) matches.
export const ROUNDS = 3;
export const COMPANION_KINDS = ["lion", "ox", "eagle", "human"];
export const TIMEOUT = -1;
export const TIERS = {
  easy: { label: "Easy", seconds: 0, botAccuracy: 0.55 },
  medium: { label: "Medium", seconds: 20, botAccuracy: 0.65 },
  hard: { label: "Hard", seconds: 15, botAccuracy: 0.75 },
};
// Earlier builds named the tiers kids / youth / scholar.
const TIER_ALIASES = { kids: "easy", youth: "medium", scholar: "hard" };
export const QUESTION_COUNTS = [5, 10, 15];
export const DEFAULT_SETTINGS = Object.freeze({
  timed: true,
  seconds: 20,
  tier: "medium",
  rounds: ROUNDS,
  questions: 10,
  category: null,
  combo: true,
});

export function normalizeSettings(settings = {}) {
  const named = TIER_ALIASES[settings.tier] || settings.tier;
  const tier = Object.hasOwn(TIERS, named) ? named : "medium";
  // Easy play is always relaxed; other tiers carry their own countdown.
  const timed = tier !== "easy" && settings.timed !== false;
  return {
    timed,
    seconds: timed ? TIERS[tier].seconds : 0,
    tier,
    rounds:
      Number.isInteger(settings.rounds) &&
      settings.rounds >= 1 &&
      settings.rounds <= 5
        ? settings.rounds
        : ROUNDS,
    questions: QUESTION_COUNTS.includes(settings.questions)
      ? settings.questions
      : 10,
    category: typeof settings.category === "string" ? settings.category : null,
    combo: settings.combo !== false,
  };
}

// Fisher–Yates shuffles a fresh deck: assignments are random, without replacement.
// Supplied player kinds are deliberately ignored; players never choose a symbol.
export function assignCompanions(players, random = Math.random) {
  if (!Array.isArray(players) || players.length < 1 || players.length > 4)
    throw new Error("Choose one to four players.");
  const deck = [...COMPANION_KINDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return players.map((player, index) => ({
    name:
      String(player.name ?? "")
        .trim()
        .slice(0, 20) || `Player ${index + 1}`,
    isBot: player.isBot === true,
    kind: deck[index],
    score: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    badges: [],
  }));
}

// "turns": one player answers per turn (pass-and-play).
// "simultaneous": everyone answers the same question together (practice bots).
export function createGame(players, random = Math.random, options = {}) {
  return {
    structure: options.structure === "simultaneous" ? "simultaneous" : "turns",
    settings: normalizeSettings(options.settings),
    players: assignCompanions(players, random),
    turn: 0,
    used: [],
    phase: "spin",
    question: null,
    selected: null,
    answers: {},
  };
}

export const isSimultaneous = (game) => game?.structure === "simultaneous";
export const matchLength = (game) =>
  isSimultaneous(game)
    ? game.settings.questions
    : game.players.length * (game.settings?.rounds ?? ROUNDS);
export const roundCount = (game) =>
  isSimultaneous(game)
    ? game.settings.questions
    : (game.settings?.rounds ?? ROUNDS);
export const currentRound = (game) =>
  isSimultaneous(game)
    ? Math.min(game.turn + 1, roundCount(game))
    : Math.min(
        Math.floor(game.turn / game.players.length) + 1,
        roundCount(game),
      );
export const activeIndex = (game) =>
  isSimultaneous(game)
    ? Math.max(
        0,
        game.players.findIndex((p) => !p.isBot),
      )
    : game.turn % game.players.length;
export const comboFor = (streak) => (streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1);

// Points for one answer. `streak` is the player's streak before this answer.
export function scoreAnswer({
  correct,
  streak = 0,
  msLeft = 0,
  settings = DEFAULT_SETTINGS,
}) {
  if (!correct) return 0;
  const combo = settings.combo === false ? 1 : comboFor(streak + 1);
  const window = (settings.seconds || 0) * 1000;
  const speed =
    settings.timed && window > 0
      ? Math.round((50 * Math.min(1, Math.max(0, msLeft / window))) / 5) * 5
      : 0;
  return Math.round(100 * combo) + (settings.combo === false ? 0 : speed);
}

export function getQuestion(category, used, random = Math.random, tier = null) {
  const all = questions.filter((q) => q.category === category);
  // Easy and Hard play prefer their own pools when those have questions to offer.
  const tiered =
    tier && tier !== "medium" ? all.filter((q) => q.difficulty === tier) : all;
  const source = tiered.length ? tiered : all;
  const unseen = source.filter((q) => !used.includes(q.id));
  const pool = unseen.length ? unseen : source;
  return pool[Math.floor(random() * pool.length)];
}

function applyAnswer(player, choice, msLeft, question, settings) {
  const correct = choice === question.correct;
  const points = scoreAnswer({
    correct,
    streak: player.streak,
    msLeft,
    settings,
  });
  const streak = correct ? player.streak + 1 : 0;
  return {
    player: {
      ...player,
      score: player.score + points,
      correct: player.correct + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(player.bestStreak, streak),
      badges: correct
        ? [...new Set([...player.badges, question.category])]
        : player.badges,
    },
    entry: { choice, points, correct, streak },
  };
}

// Records one player's pick. Simultaneous rounds keep the question open until revealAnswers.
export function recordAnswer(game, playerIndex, choice, msLeft = 0) {
  if (
    game.phase !== "question" ||
    !game.question ||
    !Number.isInteger(playerIndex) ||
    !game.players[playerIndex] ||
    game.answers?.[playerIndex] ||
    !Number.isInteger(choice) ||
    choice < TIMEOUT ||
    choice > 3
  )
    return game;
  return {
    ...game,
    answers: {
      ...game.answers,
      [playerIndex]: { choice, msLeft: Math.max(0, Math.round(msLeft)) },
    },
  };
}

// Scores every recorded answer at once; anyone who did not answer timed out.
export function revealAnswers(game) {
  if (game.phase !== "question" || !game.question) return game;
  const answers = {};
  const players = game.players.map((p, i) => {
    const pending = game.answers?.[i];
    const scored = isSimultaneous(game) || i === activeIndex(game);
    if (!scored) return p;
    const { player, entry } = applyAnswer(
      p,
      pending ? pending.choice : TIMEOUT,
      pending ? pending.msLeft : 0,
      game.question,
      game.settings ?? DEFAULT_SETTINGS,
    );
    answers[i] = entry;
    return player;
  });
  const human = activeIndex(game);
  return {
    ...game,
    players,
    phase: "reveal",
    answers,
    selected: answers[human]?.choice ?? TIMEOUT,
  };
}

// Turn-based convenience: the active player answers and the result is revealed at once.
export function answerQuestion(game, selected, msLeft = 0) {
  if (game.phase !== "question" || !game.question) return game;
  return revealAnswers(recordAnswer(game, activeIndex(game), selected, msLeft));
}

export function nextTurn(game) {
  const turn = game.turn + 1;
  return {
    ...game,
    turn,
    phase: turn >= matchLength(game) ? "finished" : "spin",
    question: null,
    selected: null,
    answers: {},
  };
}

export function getWinners(players) {
  const max = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === max);
}
export const rankOf = (players, player) =>
  1 + players.filter((other) => other.score > player.score).length;

// Practice bots plan their pick and thinking time when a question opens.
export function planBotAnswer(question, settings, random = Math.random) {
  const accuracy = TIERS[settings.tier]?.botAccuracy ?? 0.65;
  const choice =
    random() < accuracy
      ? question.correct
      : (question.correct + 1 + Math.floor(random() * 3)) % 4;
  const window = settings.timed ? settings.seconds * 1000 : 9000;
  const delay = Math.round(
    1800 + random() * Math.max(1200, window * 0.6 - 1800),
  );
  return { choice, delay };
}

export function readSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    /* Private mode still supports in-memory play. */
    return false;
  }
}
