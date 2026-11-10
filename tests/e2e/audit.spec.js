import { test, expect } from "@playwright/test";
import { createGame } from "../../src/engine.js";
import { questions } from "../../src/data.js";

async function seedMatch(page, { phase = "question", mode = "friends" } = {}) {
  const question = questions[0];
  const game = {
    ...createGame([{ name: "Mina" }, { name: "Mary" }], () => 0.5),
    phase,
    question: phase === "question" ? question : null,
    used: phase === "question" ? [question.id] : [],
  };
  await page.addInitScript(
    (value) => {
      if (!sessionStorage.getItem("audit-seeded")) {
        localStorage.setItem("kinesa-match", JSON.stringify(value));
        sessionStorage.setItem("audit-seeded", "true");
      }
    },
    { version: 1, mode, game },
  );
  await page.goto("/");
  return { game, question };
}

test("rapid keyboard input credits one answer once in both the match and collection", async ({
  page,
}) => {
  const { question } = await seedMatch(page);
  await page.getByRole("button", { name: /Resume your game/ }).click();
  await expect(page.locator(".question-stage h1")).toHaveText(question.text);
  // Two input events can arrive before React has committed the first update.
  await page.evaluate(
    (key) => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    },
    String(question.correct + 1),
  );
  await expect(page.locator(".answer-reveal")).toBeVisible();
  const result = await page.evaluate(() => ({
    match: JSON.parse(localStorage.getItem("kinesa-match")),
    stats: JSON.parse(localStorage.getItem("kinesa-stats")),
  }));
  expect(result.match.game.players[0].score).toBe(100);
  expect(result.stats.correct).toBe(1);
  expect(result.stats.badges).toEqual([question.category]);
});

test("browser Back and Forward restore screens and focus their heading", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator("main")).toHaveClass(/page-categories/);
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(page.locator("main")).toHaveClass(/page-collection/);
  await page.goBack();
  await expect(page.locator("main")).toHaveClass(/page-categories/);
  await expect(page.locator("main h1")).toBeFocused();
  await page.goBack();
  await expect(page.locator("main")).toHaveClass(/page-home/);
  await expect(page.locator("main h1")).toBeFocused();
  await page.goForward();
  await expect(page.locator("main")).toHaveClass(/page-categories/);
  await expect(page.locator("main h1")).toBeFocused();
});

test("mobile rules pause input, dismiss back to the question, and restore focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { question } = await seedMatch(page);
  await page.getByRole("button", { name: /Resume your game/ }).click();
  const rules = page.getByRole("button", { name: "Game rules", exact: true });
  await rules.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press(String(question.correct + 1));
  await expect(page.locator(".answer-reveal")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("main")).toHaveClass(/page-game/);
  await expect(page.locator(".question-stage h1")).toHaveText(question.text);
  await expect(rules).toBeFocused();
  await expect(page.locator(".answer-option").first()).toBeEnabled();
});

test("leaving during a wheel spin pauses the match until the player resumes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const { game } = await seedMatch(page, { phase: "spin" });
  await page.getByRole("button", { name: /Resume your game/ }).click();
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Spin the wheel", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Back to play", exact: true }).click();
  await page.waitForTimeout(2900);
  const paused = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(paused.game.phase).toBe("spin");
  expect(paused.game.used).toEqual([]);
  await page.getByRole("button", { name: /Resume your game/ }).click();
  await expect(
    page.getByRole("button", { name: "Spin the wheel", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kinesa-match")).game.players.map(
        (p) => p.kind,
      ),
    ),
  ).toEqual(game.players.map((p) => p.kind));
});

test("a prepared new match cannot replace an unfinished match without a deliberate choice", async ({
  page,
}) => {
  const { game, question } = await seedMatch(page);
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await page.getByRole("textbox", { name: "Player 1 name" }).fill("John");
  await page
    .getByRole("textbox", { name: "Player 2 name", exact: true })
    .fill("Mariam");
  await page
    .getByRole("button", { name: "Deal our companions", exact: true })
    .click();
  await page.getByRole("button", { name: "Game on", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Start a fresh game?", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(saved.game.players.map((p) => p.kind)).toEqual(
    game.players.map((p) => p.kind),
  );
  expect(saved.game.question.id).toBe(question.id);
  await dialog
    .getByRole("button", { name: "Resume current game", exact: true })
    .click();
  await expect(page.locator(".question-stage h1")).toHaveText(question.text);
  await expect(page.locator(".score-player strong")).toHaveText([
    "Mina",
    "Mary",
  ]);
});

test("confirming a new game starts the exact companions shown in its reveal", async ({
  page,
}) => {
  await seedMatch(page);
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await page.getByRole("textbox", { name: "Player 1 name" }).fill("John");
  await page.getByRole("textbox", { name: "Player 2 name" }).fill("Mariam");
  await page.getByRole("button", { name: "Deal our companions" }).click();
  const kinds = await page
    .locator(".assignment-slot")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.companion));
  await page.getByRole("button", { name: "Game on", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start new game", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(saved.game.players.map((p) => p.kind)).toEqual(kinds);
  expect(saved.game.players.map((p) => p.name)).toEqual(["John", "Mariam"]);
  expect(saved.game.players.map((p) => p.score)).toEqual([0, 0]);
  expect(saved.game.phase).toBe("spin");
});
