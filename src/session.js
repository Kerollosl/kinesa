import { categories, questions } from "./data.js";
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
export const loadMatch = () => restoreMatch(readSaved(KEY, null));
export function persistMatch(game, mode) {
  return saveLocal(
    KEY,
    game && game.phase !== "finished"
      ? { version: MATCH_VERSION, mode, game }
      : null,
  );
}
