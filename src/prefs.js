import { normalizeSettings, readSaved, saveLocal } from "./engine.js";

// What "Play now" uses: the player's name and their last customized settings.
const KEY = "kinesa-play-prefs";
export const PRACTICE_BOTS = ["Mina", "Mariam", "Bishoy"];

export function loadPrefs() {
  const raw = readSaved(KEY, null);
  const nickname = readSaved("kinesa-nickname", "");
  return {
    name: typeof nickname === "string" ? nickname.slice(0, 20) : "",
    settings: normalizeSettings(
      raw && typeof raw === "object" ? raw.settings : {},
    ),
  };
}
export function savePrefs({ name, settings }) {
  if (typeof name === "string")
    saveLocal("kinesa-nickname", name.trim().slice(0, 20));
  saveLocal(KEY, { version: 1, settings: normalizeSettings(settings) });
}
export const describeSettings = (s) =>
  [
    s.tier[0].toUpperCase() + s.tier.slice(1),
    `${s.questions} questions`,
    s.timed ? `${s.seconds}s clock` : "No clock",
  ].join(" · ");
