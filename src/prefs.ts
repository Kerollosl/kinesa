import { normalizeSettings, readSaved, saveLocal } from "./engine.ts";
import type { Random, Settings } from "./types.ts";

// What "Play now" uses: the player's name and their last customized settings.
const KEY = "kinesa-play-prefs";
export const PRACTICE_BOTS = [
  "Mina",
  "Mariam",
  "Bishoy",
  "Demiana",
  "Kirollos",
  "Marina",
];
// Practice bot names for a game, never the player's own name.
export function botNames(
  count: number,
  exclude = "",
  random: Random = Math.random,
) {
  const pool = PRACTICE_BOTS.filter(
    (n) => n.toLowerCase() !== exclude.trim().toLowerCase(),
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function loadPrefs() {
  const raw = readSaved(KEY, null);
  const nickname = readSaved("kinesa-nickname", "");
  return {
    name: typeof nickname === "string" ? nickname.slice(0, 20) : "",
    settings: normalizeSettings(
      raw && typeof raw === "object" && "settings" in raw ? raw.settings : {},
    ),
  };
}
export function savePrefs({
  name,
  settings,
}: {
  name?: string;
  settings: Partial<Settings>;
}) {
  if (typeof name === "string")
    saveLocal("kinesa-nickname", name.trim().slice(0, 20));
  saveLocal(KEY, { version: 1, settings: normalizeSettings(settings) });
}
export const describeSettings = (s: Settings) =>
  [
    s.tier[0].toUpperCase() + s.tier.slice(1),
    `${s.questions} questions`,
    s.timed ? `${s.seconds}s clock` : "No clock",
  ].join(" · ");
