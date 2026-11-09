import { categories, questions } from "./data.js";
import { dayKey, isoWeek } from "./calendar.js";

export const DAILY_LENGTH = 5;
export const DAILY_XP = 30;
export const SPOTLIGHT_MULTIPLIER = 1.5;

// FNV-1a hash into mulberry32: the same date always deals the same set.
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Five questions from five different categories, in a dealt order.
export function dailyPlan(date = new Date()) {
  const random = seeded(`kinesa-daily-${dayKey(date)}`);
  const order = categories.map((c) => c.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, DAILY_LENGTH).map((id) => {
    const pool = questions.filter(
      (q) => q.category === id && q.difficulty !== "easy",
    );
    const source = pool.length
      ? pool
      : questions.filter((q) => q.category === id);
    return source[Math.floor(random() * source.length)].id;
  });
}

// One category a week earns extra XP.
export const spotlight = (date = new Date()) =>
  categories[isoWeek(date) % categories.length];

const shift = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function dailyStatus(stats, date = new Date()) {
  const key = dayKey(date);
  const { lastDate, streak, best, freezes, results } = stats.daily;
  const alive =
    lastDate === key ||
    lastDate === dayKey(shift(date, -1)) ||
    (freezes > 0 && lastDate === dayKey(shift(date, -2)));
  return {
    key,
    done: !!results[key],
    result: results[key] || null,
    streak: alive ? streak : 0,
    best,
    freezes,
  };
}

// Records today's result once. A missed day spends a streak freeze if one is saved;
// every seventh day in a row earns a freeze (up to two).
export function recordDaily(
  stats,
  { correct, total, score },
  date = new Date(),
) {
  const key = dayKey(date);
  const daily = stats.daily;
  if (daily.results[key])
    return { stats, usedFreeze: false, earnedFreeze: false };
  const yesterday = dayKey(shift(date, -1));
  const dayBefore = dayKey(shift(date, -2));
  let streak = 1;
  let freezes = daily.freezes;
  let usedFreeze = false;
  if (daily.lastDate === yesterday) streak = daily.streak + 1;
  else if (daily.lastDate === dayBefore && freezes > 0) {
    streak = daily.streak + 1;
    freezes -= 1;
    usedFreeze = true;
  }
  const earnedFreeze = streak % 7 === 0 && freezes < 2;
  if (earnedFreeze) freezes += 1;
  // Keep two months of results on the device.
  const recent = Object.fromEntries(
    Object.entries(daily.results)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 59),
  );
  return {
    stats: {
      ...stats,
      xp: stats.xp + DAILY_XP,
      daily: {
        lastDate: key,
        streak,
        best: Math.max(daily.best, streak),
        freezes,
        results: { ...recent, [key]: { correct, total, score } },
      },
    },
    usedFreeze,
    earnedFreeze,
  };
}
