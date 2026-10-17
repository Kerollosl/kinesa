import { questions } from "./data.js";
export const ROUNDS = 3;
export function createGame(players) {
  if (!Array.isArray(players) || players.length < 1 || players.length > 4)
    throw new Error("Choose one to four players.");
  if (new Set(players.map((p) => p.kind)).size !== players.length)
    throw new Error("Each player needs a unique companion.");
  return {
    players: players.map((p, i) => ({
      ...p,
      name: p.name.trim().slice(0, 20) || `Player ${i + 1}`,
      score: 0,
      badges: [],
    })),
    turn: 0,
    used: [],
    phase: "spin",
    question: null,
    selected: null,
  };
}
export function getQuestion(category, used, random = Math.random) {
  const all = questions.filter((q) => q.category === category);
  const unseen = all.filter((q) => !used.includes(q.id));
  const pool = unseen.length ? unseen : all;
  return pool[Math.floor(random() * pool.length)];
}
export function answerQuestion(game, selected) {
  if (game.phase !== "question" || !game.question) return game;
  const correct = selected === game.question.correct;
  const index = game.turn % game.players.length;
  return {
    ...game,
    phase: "reveal",
    selected,
    players: game.players.map((p, i) =>
      i === index && correct
        ? {
            ...p,
            score: p.score + 100,
            badges: [...new Set([...p.badges, game.question.category])],
          }
        : p,
    ),
  };
}
export function nextTurn(game) {
  const turn = game.turn + 1;
  return {
    ...game,
    turn,
    phase: turn >= game.players.length * ROUNDS ? "finished" : "spin",
    question: null,
    selected: null,
  };
}
export function getWinners(players) {
  const max = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === max);
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
  } catch {
    /* Private mode still supports in-memory play. */
  }
}
