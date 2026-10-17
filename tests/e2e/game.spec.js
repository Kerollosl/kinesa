import { test, expect } from "@playwright/test";
import { questions } from "../../src/data.js";

test("four players can complete a match, share a win, collect badges, and rematch", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Start a game", exact: true }).click();
  await page.getByRole("button", { name: "4", exact: true }).click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("textbox", { name: `Player ${i + 1} name` })
      .fill(["Mina", "Mary", "John", "Mariam"][i]);
  // Selecting an occupied companion swaps it, preserving unique assignments.
  await page
    .getByRole("combobox", { name: "Player 1 companion" })
    .selectOption("ox");
  const selected = await page
    .locator("select")
    .evaluateAll((selects) => selects.map((s) => s.value));
  expect(new Set(selected).size).toBe(4);
  await page.getByRole("button", { name: "Let’s do this" }).click();
  for (let i = 0; i < 12; i++) {
    await expect(
      page.getByRole("heading", {
        name: `${["Mina", "Mary", "John", "Mariam"][i % 4]}, you’re up!`,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Spin the wheel", exact: true })
      .click();
    await expect(page.locator(".answer-option")).toHaveCount(4);
    const text = await page.locator(".question-stage h1").textContent();
    const q = questions.find((q) => q.text === text);
    await page
      .locator(".answer-option")
      .nth(i % 4 < 2 ? q.correct : (q.correct + 1) % 4)
      .click();
    await expect(page.locator(".answer-option.correct")).toHaveCount(1);
    await expect(page.locator(".answer-option").first()).toBeDisabled();
    await page
      .getByRole("button", {
        name: i === 11 ? "See the results" : "Next turn",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "A shared celebration!" }),
  ).toBeVisible();
  await expect(page.locator(".winner-mascots strong")).toHaveText([
    "Mina",
    "Mary",
  ]);
  const stats = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-stats")),
  );
  expect(stats.games).toBe(1);
  expect(stats.correct).toBe(6);
  expect(stats.badges.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "One more round?" }).click();
  await expect(
    page.getByRole("heading", { name: "Mina, you’re up!" }),
  ).toBeVisible();
  await expect(page.locator(".score-player").first()).toContainText("0 points");
  expect(errors).toEqual([]);
});

test("mobile navigation, dialog keyboard behavior, and a solo match", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Start a game", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start a game", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Start a game", exact: true }).click();
  await page.getByRole("button", { name: "Solo", exact: true }).click();
  await page.getByRole("button", { name: "Let’s do this" }).click();
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Spin the wheel", exact: true })
      .click();
    await expect(page.locator(".answer-option")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".answer-option").first().click();
    await page
      .getByRole("button", {
        name: i === 2 ? "See the results" : "Next turn",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Player 1 takes the crown!" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the club", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Explore categories", exact: true })
    .click();
  await expect(page.locator(".explore-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Your collection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your little treasure trove." }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Your collection", exact: true })
    .click();
  await expect(page.locator(".stats-row>div").first()).toContainText("1");
});

test("a game can be resumed after exploring and storage failure does not block play", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("Blocked storage");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start a game", exact: true }).click();
  await page.getByRole("button", { name: "Let’s do this" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: /Your game is waiting/ }).click();
  await expect(
    page.getByRole("heading", { name: "Player 1, you’re up!" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const text = await page.locator(".question-stage h1").textContent();
  const current = questions.find((q) => q.text === text);
  await page.locator(".answer-option").nth(current.correct).click();
  await expect(
    page.getByRole("heading", { name: "Look at you go! +100" }),
  ).toBeVisible();
});
