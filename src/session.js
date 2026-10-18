import { categories, questions } from "./data.js";
import { COMPANION_KINDS, ROUNDS, readSaved, saveLocal } from "./engine.js";
const KEY = "kinesa-match";
// Rehydrate only known fields and canonical questions. Old/corrupt saves fail closed.
export function restoreMatch(value) {
  if (
    !value ||
    value.version !== 1 ||
    !["friends", "random"].includes(value.mode)
  )
    return null;
  const g = value.game;
  if (
    !g ||
    !Array.isArray(g.players) ||
    g.players.length < 1 ||
    g.players.length > 4
  )
    return null;
  const validCategory = (id) => categories.some((c) => c.id === id);
  if (
    g.players.some(
      (p) =>
        !p ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 20 ||
        !COMPANION_KINDS.includes(p.kind) ||
        !Number.isInteger(p.score) ||
        p.score < 0 ||
        p.score > ROUNDS * 100 ||
        p.score % 100 !== 0 ||
        !Array.isArray(p.badges) ||
        !p.badges.every(validCategory),
    )
  )
    return null;
  if (new Set(g.players.map((p) => p.kind)).size !== g.players.length)
    return null;
  const max = ROUNDS * g.players.length;
  if (
    !Number.isInteger(g.turn) ||
    g.turn < 0 ||
    g.turn >= max ||
    !["spin", "question", "reveal", "handoff"].includes(g.phase)
  )
    return null;
  const question = questions.find((q) => q.id === g.question?.id) || null;
  if (["question", "reveal"].includes(g.phase) && !question) return null;
  if (
    g.phase === "reveal" &&
    (!Number.isInteger(g.selected) || g.selected < 0 || g.selected > 3)
  )
    return null;
  return {
    mode: value.mode,
    game: {
      players: g.players.map((p) => ({
        name: p.name,
        kind: p.kind,
        isBot: p.isBot === true,
        score: p.score,
        badges: [...new Set(p.badges)],
      })),
      turn: g.turn,
      phase: g.phase,
      used: Array.isArray(g.used)
        ? g.used.filter((id) => questions.some((q) => q.id === id))
        : [],
      question: ["question", "reveal"].includes(g.phase) ? question : null,
      selected: g.phase === "reveal" ? g.selected : null,
    },
  };
}
export const loadMatch = () => restoreMatch(readSaved(KEY, null));
export function persistMatch(game, mode) {
  return saveLocal(
    KEY,
    game && game.phase !== "finished" ? { version: 1, mode, game } : null,
  );
}
