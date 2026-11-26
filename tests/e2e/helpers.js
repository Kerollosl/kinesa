import { expect } from "@playwright/test";
import { createClassic } from "../../src/classic.ts";
import { questions } from "../../src/data.ts";

export { questions };

// A classic game against one practice bot, optionally already asking `question`.
export function vsBot({ question = null, ...patch } = {}) {
  const game = createClassic(
    [{ name: "You" }, { name: "Mina", isBot: true }],
    () => 0.5,
  );
  return {
    ...game,
    ...(question ? { phase: "question", question, used: [question.id] } : {}),
    ...patch,
  };
}
export const withPlayer = (game, index, patch) => ({
  ...game,
  players: game.players.map((p, i) => (i === index ? { ...p, ...patch } : p)),
});

// Saves a game before the app loads (once per test, so reloads keep progress).
export async function seed(page, game, mode = "random", version = 2) {
  await page.addInitScript(
    (value) => {
      if (!sessionStorage.getItem("kinesa-seeded")) {
        localStorage.setItem("kinesa-match", JSON.stringify(value));
        sessionStorage.setItem("kinesa-seeded", "1");
      }
    },
    { version, mode, game },
  );
  await page.goto("/");
}
export const saved = (page) =>
  page.evaluate(() => ({
    match: JSON.parse(localStorage.getItem("kinesa-match")),
    stats: JSON.parse(localStorage.getItem("kinesa-stats")),
  }));
export async function currentQuestion(page) {
  const text = await page.locator(".qv-card h1").textContent();
  return questions.find((q) => q.text === text);
}
export async function answerRight(page) {
  const q = await currentQuestion(page);
  await page.locator(".answer").nth(q.correct).click();
  return q;
}
export async function answerWrong(page) {
  const q = await currentQuestion(page);
  const hidden = (await saved(page)).match?.game?.hidden || [];
  const wrong = [0, 1, 2, 3].find(
    (i) => i !== q.correct && !hidden.includes(i),
  );
  await page.locator(".answer").nth(wrong).click();
  return q;
}
// Spins until the wheel gives a question (taking any pick it offers).
export async function spinToQuestion(page) {
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await expect(page.locator(".qv, .pick")).toBeVisible();
  if (await page.locator(".pick").isVisible())
    await page.locator(".pick-tile:not([disabled])").first().click();
  await expect(page.locator(".qv-card h1")).toBeVisible();
}
