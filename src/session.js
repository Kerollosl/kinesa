import { categories, questions } from "./data.js";
import { HELPS, LENGTHS, METER_MAX } from "./classic.js";
import {
  COMPANION_KINDS,
  ROUNDS,
  TIMEOUT,
  matchLength,
  normalizeSettings,
  readSaved,
  saveLocal,
} from "./engine.js";
const KEY = "kinesa-match";
export const MATCH_VERSION = 2;
const PHASES = ["spin", "question", "reveal", "handoff", "standings"];
const isCount = (n, max = Infinity) =>
  Number.isInteger(n) && n >= 0 && n <= max;
const validCategory = (id) => categories.some((c) => c.id === id);

// Version 1 matches were turn-based with flat 100-point answers. Carry them
// forward exactly: untimed, no combo, and correct counts derived from score.
function migrateV1(value) {
  const g = value?.game;
  if (!g || !Array.isArray(g.players)) return null;
  if (
    g.players.some(
      (p) => !p || !isCount(p.score, ROUNDS * 100) || p.score % 100 !== 0,
    )
  )
    return null;
  return {
    version: MATCH_VERSION,
    mode: value.mode,
    game: {
      ...g,
      structure: "turns",
      settings: {
        ...normalizeSettings({ timed: false }),
        timed: false,
        seconds: 0,
        combo: false,
      },
      players: g.players.map((p) => ({
        ...p,
        correct: p.score / 100,
        streak: 0,
        bestStreak: 0,
      })),
      answers: {},
    },
  };
}

// Rehydrate only known fields and canonical questions. Corrupt saves fail closed.
export function restoreMatch(value) {
  if (!value || !["friends", "random", "daily"].includes(value.mode))
    return null;
  if (value.version === 1) value = migrateV1(value);
  if (!value || value.version !== MATCH_VERSION) return null;
  const g = value.game;
  if (
    !g ||
    !Array.isArray(g.players) ||
    g.players.length < 1 ||
    g.players.length > 4
  )
    return null;
  if (g.structure === "classic") return restoreClassic(value.mode, g);
  const structure = g.structure === "simultaneous" ? "simultaneous" : "turns";
  const savedSettings =
    g.settings && typeof g.settings === "object" ? g.settings : {};
  const settings = {
    ...normalizeSettings(savedSettings),
    // Migrated matches keep their legacy scoring.
    ...(savedSettings.combo === false ? { combo: false } : {}),
    ...(savedSettings.timed === false ? { timed: false, seconds: 0 } : {}),
  };
  if (settings.category && !validCategory(settings.category))
    settings.category = null;
  if (
    settings.plan &&
    !settings.plan.every((id) => questions.some((q) => q.id === id))
  )
    return null;
  const shell = { structure, settings, players: g.players };
  const length = matchLength(shell);
  if (
    g.players.some(
      (p) =>
        !p ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 20 ||
        !COMPANION_KINDS.includes(p.kind) ||
        !isCount(p.score, length * 250) ||
        !isCount(p.correct, length) ||
        !isCount(p.streak, length) ||
        !isCount(p.bestStreak, length) ||
        !Array.isArray(p.badges) ||
        !p.badges.every(validCategory),
    )
  )
    return null;
  if (new Set(g.players.map((p) => p.kind)).size !== g.players.length)
    return null;
  if (!isCount(g.turn, length - 1) || !PHASES.includes(g.phase)) return null;
  const question = questions.find((q) => q.id === g.question?.id) || null;
  const asking = ["question", "reveal"].includes(g.phase);
  if (asking && !question) return null;
  const validChoice = (n) => Number.isInteger(n) && n >= TIMEOUT && n <= 3;
  if (g.phase === "reveal" && !validChoice(g.selected)) return null;
  const answers = {};
  if (asking && g.answers && typeof g.answers === "object") {
    for (const [key, entry] of Object.entries(g.answers)) {
      const index = Number(key);
      if (!g.players[index] || !entry || !validChoice(entry.choice))
        return null;
      answers[index] =
        g.phase === "reveal"
          ? {
              choice: entry.choice,
              points: isCount(entry.points, 250) ? entry.points : 0,
              correct: entry.choice === question.correct,
              streak: isCount(entry.streak, length) ? entry.streak : 0,
            }
          : {
              choice: entry.choice,
              msLeft: isCount(entry.msLeft, 60000) ? entry.msLeft : 0,
            };
    }
  }
  return {
    mode: value.mode,
    game: {
      structure,
      settings,
      players: g.players.map((p) => ({
        name: p.name,
        kind: p.kind,
        isBot: p.isBot === true,
        score: p.score,
        correct: p.correct,
        streak: p.streak,
        bestStreak: p.bestStreak,
        badges: [...new Set(p.badges)],
      })),
      turn: g.turn,
      phase: g.phase,
      used: Array.isArray(g.used)
        ? g.used.filter((id) => questions.some((q) => q.id === id))
        : [],
      question: asking ? question : null,
      selected: g.phase === "reveal" ? g.selected : null,
      answers,
    },
  };
}
const CLASSIC_PHASES = [
  "spin",
  "question",
  "reveal",
  "pick",
  "handoff",
  "rival",
];
// Classic games: categories won, the pick meter and 50/50 helps per player.
function restoreClassic(mode, g) {
  if (!["friends", "random"].includes(mode)) return null;
  const settings = normalizeSettings(g.settings || {});
  const { rounds } = LENGTHS[settings.length];
  const asked = Array.isArray(g.used) ? g.used.length : 0;
  const most = asked + 1;
  const okPlayer = (p) =>
    p &&
    typeof p.name === "string" &&
    p.name.trim() &&
    p.name.length <= 20 &&
    COMPANION_KINDS.includes(p.kind) &&
    isCount(p.score, most * 250) &&
    isCount(p.correct, most) &&
    isCount(p.streak, most) &&
    isCount(p.bestStreak, most) &&
    Array.isArray(p.badges) &&
    p.badges.every(validCategory) &&
    Array.isArray(p.won) &&
    p.won.every(validCategory) &&
    new Set(p.won).size === p.won.length &&
    isCount(p.meter, METER_MAX) &&
    isCount(p.helps, HELPS);
  if (!g.players.every(okPlayer)) return null;
  if (new Set(g.players.map((p) => p.kind)).size !== g.players.length)
    return null;
  if (!isCount(g.turn, g.players.length - 1)) return null;
  if (!Number.isInteger(g.round) || g.round < 1 || g.round > rounds)
    return null;
  if (!CLASSIC_PHASES.includes(g.phase)) return null;
  const question = questions.find((q) => q.id === g.question?.id) || null;
  const asking = ["question", "reveal"].includes(g.phase);
  if (asking && !question) return null;
  const challenge =
    asking && validCategory(g.challenge) && g.challenge === question.category
      ? g.challenge
      : null;
  const hidden =
    g.phase === "question" &&
    Array.isArray(g.hidden) &&
    g.hidden.length === 2 &&
    g.hidden.every(
      (i) => Number.isInteger(i) && i >= 0 && i <= 3 && i !== question.correct,
    )
      ? [...new Set(g.hidden)]
      : [];
  let answers = {};
  let selected = null;
  if (g.phase === "reveal") {
    const entry = g.answers?.[g.turn];
    const choice = entry?.choice;
    if (!Number.isInteger(choice) || choice < TIMEOUT || choice > 3)
      return null;
    selected = choice;
    answers = {
      [g.turn]: {
        choice,
        correct: choice === question.correct,
        points: isCount(entry.points, 250) ? entry.points : 0,
        streak: isCount(entry.streak, most) ? entry.streak : 0,
        challenge: !!challenge,
      },
    };
  }
  const steps = Array.isArray(g.rival?.steps)
    ? g.rival.steps
        .filter((s) => s && validCategory(s.category))
        .slice(0, 10)
        .map((s) => ({
          category: s.category,
          correct: s.correct === true,
          challenge: s.challenge === true,
        }))
    : [];
  if (g.phase === "rival" && !g.players[g.turn].isBot) return null;
  return {
    mode,
    game: {
      structure: "classic",
      settings,
      players: g.players.map((p) => ({
        name: p.name,
        kind: p.kind,
        isBot: p.isBot === true,
        score: p.score,
        correct: p.correct,
        streak: p.streak,
        bestStreak: p.bestStreak,
        badges: [...new Set(p.badges)],
        won: [...p.won],
        meter: p.meter,
        helps: p.helps,
      })),
      turn: g.turn,
      round: g.round,
      phase: g.phase,
      used: Array.isArray(g.used)
        ? g.used.filter((id) => questions.some((q) => q.id === id))
        : [],
      question: asking ? question : null,
      challenge,
      hidden,
      answers,
      selected,
      rival: g.phase === "rival" ? { player: g.turn, steps } : null,
    },
  };
}

export const loadMatch = () => restoreMatch(readSaved(KEY, null));
export function persistMatch(game, mode) {
  return saveLocal(
    KEY,
    game && game.phase !== "finished"
      ? { version: MATCH_VERSION, mode, game }
      : null,
  );
}
