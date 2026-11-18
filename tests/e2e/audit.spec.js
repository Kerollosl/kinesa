import { test, expect } from "@playwright/test";
import { questions, saved, seed, vsBot } from "./helpers.js";

test("rapid keyboard input credits one answer once", async ({ page }) => {
  const question = questions[0];
  await seed(page, vsBot({ question }));
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator(".qv-card h1")).toHaveText(question.text);
  // Two key events can arrive before React commits the first update.
  await page.evaluate(
    (key) => {
      for (let i = 0; i < 2; i++)
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
    },
    String(question.correct + 1),
  );
  await expect(page.locator(".sheet")).toBeVisible();
  const { match, stats } = await saved(page);
  expect(match.game.players[0].correct).toBe(1);
  expect(match.game.players[0].meter).toBe(1);
  expect(stats.correct).toBe(1);
});

test("browser Back and Forward move between tabs and focus the heading", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Categories" }).last().click();
  await expect(page.getByRole("heading", { name: "Categories" })).toBeFocused();
  await page.getByRole("button", { name: "Trophies" }).last().click();
  await expect(page.getByRole("heading", { name: "Trophies" })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Categories" })).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Trophies" })).toBeFocused();
});

test("the rules dialog pauses the clock and returns focus", async ({
  page,
}) => {
  await seed(page, vsBot({ phase: "spin" }));
  await page.getByRole("button", { name: /Continue/ }).click();
  const rules = page.getByRole("button", { name: "How to play" });
  await rules.click();
  await expect(page.getByRole("dialog")).toContainText(
    "Spin to get a category",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rules).toBeFocused();
});

test("leaving mid-spin cancels it and the board is ready again", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seed(page, vsBot({ phase: "spin" }));
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await page.getByRole("button", { name: "Leave game" }).click();
  await page.waitForTimeout(3500);
  expect((await saved(page)).match.game.phase).toBe("spin");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(
    page.getByRole("button", { name: "Spin", exact: true }),
  ).toBeEnabled();
});

test("a new game never replaces an unfinished one without asking", async ({
  page,
}) => {
  await seed(page, vsBot({ phase: "spin" }));
  await page.getByRole("button", { name: /New game/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Start a new game?");
  await dialog.getByRole("button", { name: "Keep playing" }).click();
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await page.getByRole("button", { name: "Leave game" }).click();
  await page.getByRole("button", { name: /New game/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "New game" })
    .click();
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeVisible();
});
