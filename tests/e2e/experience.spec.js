import { test, expect } from "@playwright/test";
import { answerRight, currentQuestion, saved } from "./helpers.js";

test("a category opens a short card and plays ten of its questions", async ({
  page,
}) => {
  await page.goto("/#categories");
  await page.getByRole("button", { name: /Feasts & Fasts/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText("Feasts & Fasts");
  await dialog.getByRole("button", { name: /Play 10 questions/ }).click();
  await expect(page.locator(".qv-label")).toHaveText(/Feasts & Fasts/i);
  await expect(page.locator(".chips .chip")).toHaveCount(4);
  const q = await currentQuestion(page);
  expect(q.category).toBe("feasts");
  await answerRight(page);
  await expect(page.locator(".sheet h2")).toHaveText("Correct!");
  await expect(
    page.getByRole("button", { name: /Next question/ }),
  ).toBeVisible();
});

test("Today’s five plays once a day and then shows done", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /today’s five/i }).click();
  for (let i = 0; i < 5; i++) {
    await answerRight(page);
    await page
      .getByRole("button", { name: i === 4 ? "See results" : "Next question" })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Perfect five!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Home" }).click();
  await expect(
    page.getByRole("button", { name: /Today’s five: done, 5 of 5/ }),
  ).toBeVisible();
  const { stats } = await saved(page);
  expect(stats.daily.streak).toBe(1);
});

test("Trophies show real progress and survive a refresh", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "kinesa-stats",
      JSON.stringify({
        version: 2,
        games: 3,
        wins: 2,
        correct: 12,
        badges: ["bible"],
        xp: 180,
        bestStreak: 4,
        categoryCorrect: { bible: 6 },
        daily: { lastDate: null, streak: 0, best: 0, freezes: 0, results: {} },
      }),
    ),
  );
  await page.goto("/#collection");
  await expect(page.getByRole("heading", { name: "Trophies" })).toBeVisible();
  await expect(page.locator(".stat-grid")).toContainText("2Wins");
  await expect(page.locator(".medal-list li").first()).toContainText("Bronze");
  await page.reload();
  await expect(page.locator(".level-card")).toContainText("Level 2");
});

test("Settings save level and length, and the next game uses them", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your name").fill("Kiro");
  await dialog.getByRole("radio", { name: /^Hard/ }).check();
  await dialog.getByRole("radio", { name: /^Quick/ }).check();
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const { match } = await saved(page);
  expect(match.game.settings.tier).toBe("hard");
  expect(match.game.settings.length).toBe("quick");
  expect(match.game.players[0].name).toBe("Kiro");
  await expect(page.locator(".round-tag")).toHaveText("Round 1 of 8");
});

test("friends setup is just names and clears the retired room preview", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("kinesa-room-preview", "{}"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Friends/ }).click();
  await expect(
    page.getByRole("heading", { name: "Who’s playing?" }),
  ).toBeVisible();
  await expect(page.getByText(/room code/i)).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("kinesa-room-preview")),
  ).toBeNull();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: /Add player/ }).click();
  await expect(page.getByRole("button", { name: /Add player/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove player 4" }).click();
  await expect(page.locator(".lobby-row")).toHaveCount(3);
});
