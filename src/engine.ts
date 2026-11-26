import { questions } from "./data.ts";
import type {
  AnswerEntry,
  AnyGame,
  CompanionKind,
  Game,
  Player,
  Question,
  Random,
  Settings,
  Tier,
} from "./types.ts";
// Rounds per player in turn-based (pass-and-play) matches.
export const ROUNDS = 3;
export const COMPANION_KINDS: CompanionKind[] = [
  "lion",
  "ox",
  "eagle",
  "human",
];
export const isCompanionKind = (kind: unknown): kind is CompanionKind =>
  COMPANION_KINDS.includes(kind as CompanionKind);
export const TIMEOUT = -1;
export const TIERS: Record<
  Tier,
  { label: string; seconds: number; botAccuracy: number }
> = {
  easy: { label: "Easy", seconds: 0, botAccuracy: 0.55 },
  medium: { label: "Medium", seconds: 20, botAccuracy: 0.65 },
  hard: { label: "Hard", seconds: 15, botAccuracy: 0.75 },
};
// Earlier builds named the tiers kids / youth / scholar.
const TIER_ALIASES: Record<string, Tier> = {
  kids: "easy",
  youth: "medium",
  scholar: "hard",
};
export const QUESTION_COUNTS = [5, 10, 15];
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  timed: true,
  seconds: 20,
  tier: "medium",
  rounds: ROUNDS,
  questions: 10,
  category: null,
  combo: true,
  length: "full",
  plan: null,
  daily: null,
});

// Settings arrive from saves and older builds, so every field is checked.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeSettings(settings: any = {}): Settings {
  settings ??= {};
  const named = TIER_ALIASES[settings.tier] || settings.tier;
  const tier: Tier = Object.hasOwn(TIERS, named) ? named : "medium";
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
    // Classic games: "quick" wins with three categories, "full" with all six.
    length: settings.length === "quick" ? "quick" : "full",
    // A fixed question list (the daily challenge) replaces the wheel.
    plan:
      Array.isArray(settings.plan) && settings.plan.length
        ? settings.plan
            .filter((id: unknown) => typeof id === "string")
            .slice(0, 15)
        : null,
    daily:
      typeof settings.daily === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(settings.daily)
        ? settings.daily
        : null,
  };
}

// Fisher–Yates shuffles a fresh deck: assignments are random, without replacement.
// Supplied player kinds are deliberately ignored; players never choose a symbol.
export function assignCompanions(
  players: { name?: string; isBot?: boolean }[],
  random: Random = Math.random,
): Player[] {
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

// The first player never keeps the companion they had last game: they get
// one of the other three, swapped with whoever held it.
export function freshCompanion<G extends AnyGame>(
  game: G,
  last: unknown,
  random: Random = Math.random,
): G {
  const first = game.players[0];
  if (!first || !isCompanionKind(last) || first.kind !== last) return game;
  const others = COMPANION_KINDS.filter((kind) => kind !== last);
  const kind = others[Math.floor(random() * others.length)];
  return {
    ...game,
    players: game.players.map((p, i) =>
      i === 0 ? { ...p, kind } : p.kind === kind ? { ...p, kind: last } : p,
    ),
  };
}

// "turns": one player answers per turn (pass-and-play).
// "simultaneous": everyone answers the same question together (practice bots).
export function createGame(
  players: { name?: string; isBot?: boolean }[],
  random: Random = Math.random,
  options: { structure?: string; settings?: Partial<Settings> } = {},
): Game {
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

type Shape = Pick<Game, "settings" | "players"> & { structure: string };
export const isSimultaneous = (
  game: { structure: string } | null | undefined,
) => game?.structure === "simultaneous";
export const matchLength = (game: Shape) =>
  isSimultaneous(game)
    ? game.settings.questions
    : game.players.length * (game.settings?.rounds ?? ROUNDS);
export const roundCount = (game: Shape) =>
  isSimultaneous(game)
    ? game.settings.questions
    : (game.settings?.rounds ?? ROUNDS);
export const currentRound = (game: Shape & { turn: number }) =>
  isSimultaneous(game)
    ? Math.min(game.turn + 1, roundCount(game))
    : Math.min(
        Math.floor(game.turn / game.players.length) + 1,
        roundCount(game),
      );
export const activeIndex = (game: AnyGame) =>
  game?.structure === "classic"
    ? game.turn
    : isSimultaneous(game)
      ? Math.max(
          0,
          game.players.findIndex((p) => !p.isBot),
        )
      : game.turn % game.players.length;
export const comboFor = (streak: number) =>
  streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;

// Points for one answer. `streak` is the player's streak before this answer.
export function scoreAnswer({
  correct,
  streak = 0,
  msLeft = 0,
  settings = DEFAULT_SETTINGS,
}: {
  correct: boolean;
  streak?: number;
  msLeft?: number;
  settings?: Settings;
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

export function getQuestion(
  category: string,
  used: string[],
  random: Random = Math.random,
  tier: Tier | null = null,
): Question {
  const all = questions.filter((q) => q.category === category);
  // Easy and Hard play prefer their own pools when those have questions to offer.
  const tiered =
    tier && tier !== "medium" ? all.filter((q) => q.difficulty === tier) : all;
  const source = tiered.length ? tiered : all;
  const unseen = source.filter((q) => !used.includes(q.id));
  const pool = unseen.length ? unseen : source;
  return pool[Math.floor(random() * pool.length)];
}

function applyAnswer(
  player: Player,
  choice: number,
  msLeft: number,
  question: Question,
  settings: Settings,
) {
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
export function recordAnswer(
  game: Game,
  playerIndex: number,
  choice: number,
  msLeft = 0,
): Game {
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
export function revealAnswers(game: Game): Game {
  const question = game.question;
  if (game.phase !== "question" || !question) return game;
  const answers: Record<number, AnswerEntry> = {};
  const players = game.players.map((p, i) => {
    const pending = game.answers?.[i];
    const scored = isSimultaneous(game) || i === activeIndex(game);
    if (!scored) return p;
    const { player, entry } = applyAnswer(
      p,
      pending ? pending.choice : TIMEOUT,
      pending ? (pending.msLeft ?? 0) : 0,
      question,
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
export function answerQuestion(game: Game, selected: number, msLeft = 0) {
  if (game.phase !== "question" || !game.question) return game;
  return revealAnswers(recordAnswer(game, activeIndex(game), selected, msLeft));
}

export function nextTurn(game: Game): Game {
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

export function getWinners<P extends Player>(players: P[]) {
  const max = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === max);
}
export const rankOf = (players: Player[], player: Player) =>
  1 + players.filter((other) => other.score > player.score).length;

// Practice bots plan their pick and thinking time when a question opens.
export function planBotAnswer(
  question: Question,
  settings: Settings,
  random: Random = Math.random,
) {
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

// Parsed storage is untrusted: callers validate what comes back.
export function readSaved(key: string, fallback: unknown): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    /* Private mode still supports in-memory play. */
    return false;
  }
}
