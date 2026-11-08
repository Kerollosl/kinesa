import { categories } from "./data.js";
import { readSaved, saveLocal } from "./engine.js";

export const STATS_KEY = "kinesa-stats";
export const STATS_VERSION = 2;
export const MASTERY = [
  { id: "gold", label: "Gold", min: 30 },
  { id: "silver", label: "Silver", min: 15 },
  { id: "bronze", label: "Bronze", min: 5 },
];
export const XP = { correct: 10, streakStep: 2, match: 25, win: 25 };

const isCount = (n) => Number.isInteger(n) && n >= 0;
const knownCategory = (id) => categories.some((c) => c.id === id);

export function blankStats() {
  return {
    version: STATS_VERSION,
    games: 0,
    correct: 0,
    badges: [],
    xp: 0,
    bestStreak: 0,
    categoryCorrect: {},
    daily: { lastDate: null, streak: 0, best: 0, freezes: 0, results: {} },
  };
}

// Accepts v1 ({games, correct, badges}) and v2 records; anything else starts fresh.
export function migrateStats(raw) {
  const base = blankStats();
  if (
    !raw ||
    typeof raw !== "object" ||
    !isCount(raw.games) ||
    !isCount(raw.correct) ||
    !Array.isArray(raw.badges)
  )
    return base;
  const badges = [...new Set(raw.badges.filter(knownCategory))];
  if (raw.version !== STATS_VERSION) {
    return {
      ...base,
      games: raw.games,
      correct: raw.correct,
      badges,
      // Earlier play earns its XP back; each earned badge counts as one correct answer.
      xp: raw.correct * XP.correct + raw.games * XP.match,
      categoryCorrect: Object.fromEntries(badges.map((id) => [id, 1])),
    };
  }
  const categoryCorrect = {};
  for (const [id, n] of Object.entries(raw.categoryCorrect || {}))
    if (knownCategory(id) && isCount(n)) categoryCorrect[id] = n;
  const daily = raw.daily && typeof raw.daily === "object" ? raw.daily : {};
  const results = {};
  for (const [date, r] of Object.entries(daily.results || {}))
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      r &&
      isCount(r.correct) &&
      isCount(r.total)
    )
      results[date] = {
        correct: r.correct,
        total: r.total,
        score: isCount(r.score) ? r.score : 0,
      };
  return {
    ...base,
    games: raw.games,
    correct: raw.correct,
    badges,
    xp: isCount(raw.xp) ? raw.xp : 0,
    bestStreak: isCount(raw.bestStreak) ? raw.bestStreak : 0,
    categoryCorrect,
    daily: {
      lastDate:
        typeof daily.lastDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(daily.lastDate)
          ? daily.lastDate
          : null,
      streak: isCount(daily.streak) ? daily.streak : 0,
      best: isCount(daily.best) ? daily.best : 0,
      freezes: isCount(daily.freezes) ? Math.min(2, daily.freezes) : 0,
      results,
    },
  };
}
export const loadStats = () => migrateStats(readSaved(STATS_KEY, null));
export const saveStats = (stats) => saveLocal(STATS_KEY, stats);

// Level L starts at 50·L·(L−1) XP: 0, 100, 300, 600, 1000…
export const xpForLevel = (level) => 50 * level * (level - 1);
export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    floor,
    next,
    into: xp - floor,
    span: next - floor,
    progress: (xp - floor) / (next - floor),
  };
}
export function masteryFor(count = 0) {
  return MASTERY.find((tier) => count >= tier.min) || null;
}
export function nextMastery(count = 0) {
  return [...MASTERY].reverse().find((tier) => count < tier.min) || null;
}

// XP for one correct answer, with a little extra for keeping a streak alive.
export const xpForCorrect = (streak) =>
  XP.correct + XP.streakStep * Math.min(5, Math.max(0, streak - 1));

export function recordCorrect(stats, category, streak, multiplier = 1) {
  const count = (stats.categoryCorrect[category] || 0) + 1;
  const gained = Math.round(xpForCorrect(streak) * multiplier);
  return {
    stats: {
      ...stats,
      correct: stats.correct + 1,
      badges: [...new Set([...stats.badges, category])],
      categoryCorrect: { ...stats.categoryCorrect, [category]: count },
      bestStreak: Math.max(stats.bestStreak, streak),
      xp: stats.xp + gained,
    },
    gained,
    newBadge: !stats.badges.includes(category),
    newMastery:
      masteryFor(count)?.id !== masteryFor(count - 1)?.id
        ? masteryFor(count)
        : null,
  };
}

export function recordMatch(stats, { won = false } = {}) {
  const gained = XP.match + (won ? XP.win : 0);
  return {
    stats: { ...stats, games: stats.games + 1, xp: stats.xp + gained },
    gained,
  };
}
