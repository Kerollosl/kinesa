import { test, expect } from "@playwright/test";
import { createGame } from "../../src/engine.js";
import {
  answerRight,
  answerWrong,
  questions,
  saved,
  seed,
  spinToQuestion,
  vsBot,
  withPlayer,
} from "./helpers.js";

test("Play starts a game against a practice bot in one tap", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".scoreboard .seat")).toHaveCount(2);
  await expect(page.locator(".scoreboard")).toContainText("BOT");
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeVisible();
  await spinToQuestion(page);
  await expect(page.locator(".answer")).toHaveCount(4);
  await answerRight(page);
  await expect(page.locator(".sheet h2")).toHaveText(/Correct!|You won it!/);
  await expect(page.locator(".sheet .btn")).toHaveText(
    /Spin again|Pick a category/,
  );
});

test("a right answer keeps the turn; a miss hands it to the bot, who plays and hands back", async ({
  page,
}) => {
  await seed(page, vsBot({ question: questions[0] }));
  await page.getByRole("button", { name: /Continue/ }).click();
  await answerRight(page);
  await expect(page.locator(".sheet .meter")).toHaveAttribute(
    "aria-label",
    "1 of 3 toward a pick",
  );
  await page.getByRole("button", { name: /Spin again/ }).click();
  await spinToQuestion(page);
  await answerWrong(page);
  await expect(page.locator(".sheet h2")).toHaveText("Not quite");
  await expect(page.locator(".answer.is-correct")).toHaveCount(1);
  await page.getByRole("button", { name: "Mina’s turn" }).click();
  await expect(
    page.getByRole("heading", { name: "Mina’s turn" }),
  ).toBeVisible();
  await expect(page.locator(".rival-steps li").first()).toBeVisible();
  await page.getByRole("button", { name: /Your turn|See results/ }).click();
  const { match } = await saved(page);
  if (match) {
    expect(match.game.turn).toBe(0);
    expect(match.game.round).toBe(2);
    await expect(
      page.getByRole("heading", { name: "Your turn" }),
    ).toBeVisible();
  }
});

test("three right answers earn a pick, and a right pick wins the category", async ({
  page,
}) => {
  const question = questions.find((q) => q.category === "bible");
  await seed(page, withPlayer(vsBot({ question }), 0, { meter: 2 }));
  await page.getByRole("button", { name: /Continue/ }).click();
  await answerRight(page);
  await expect(page.locator(".sheet")).toContainText("You earned a pick!");
  await page.getByRole("button", { name: /Pick a category/ }).click();
  await expect(
    page.getByRole("heading", { name: "Pick a category" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Saints & Heroes" }).click();
  await expect(page.locator(".qv-label")).toHaveText(/Win Saints & Heroes/i);
  await answerRight(page);
  await expect(page.locator(".sheet h2")).toHaveText("You won it!");
  const { match } = await saved(page);
  expect(match.game.players[0].won).toEqual(["saints"]);
  expect(match.game.players[0].meter).toBe(0);
  await page.getByRole("button", { name: /Spin again/ }).click();
  await expect(
    page.getByRole("listitem").filter({ has: page.locator(".is-won") }),
  ).toHaveCount(1);
});

test("50/50 removes two wrong answers once per question", async ({ page }) => {
  const question = questions[3];
  await seed(page, vsBot({ question }));
  await page.getByRole("button", { name: /Continue/ }).click();
  const help = page.getByRole("button", { name: /50\/50/ });
  await expect(help).toContainText("2");
  await help.click();
  await expect(page.locator(".answer.is-hidden")).toHaveCount(2);
  await expect(page.locator(".answer").nth(question.correct)).not.toHaveClass(
    /is-hidden/,
  );
  await expect(help).toBeDisabled();
  await expect(help).toContainText("1");
});

test("winning every category ends the game with results and a fresh rematch", async ({
  page,
}) => {
  const game = withPlayer(vsBot({ phase: "pick" }), 0, {
    won: ["bible", "history", "saints", "traditions", "feasts"],
  });
  await seed(page, game);
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator(".pick-tile:not([disabled])")).toHaveCount(1);
  await page.getByRole("button", { name: "Signs & Symbols" }).click();
  await answerRight(page);
  await page.getByRole("button", { name: "See results" }).click();
  await expect(page.getByRole("heading", { name: "You win!" })).toBeVisible();
  expect((await saved(page)).stats.wins).toBe(1);
  await page.getByRole("button", { name: /Rematch/ }).click();
  await expect(page.getByRole("heading", { name: "Your turn" })).toBeVisible();
  const { match } = await saved(page);
  expect(match.game.players.every((p) => p.won.length === 0)).toBe(true);
});

test("friends pass the phone between turns behind a cover", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Friends/ }).click();
  await page.getByLabel("Player 1 name").fill("Mina");
  await page.getByLabel("Player 2 name").fill("Mary");
  await page.getByRole("button", { name: /Add player/ }).click();
  await page.getByLabel("Player 3 name").fill("Abanoub");
  await page.getByRole("radio", { name: /^Quick/ }).check();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.locator(".scoreboard .seat")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Mina’s turn" }),
  ).toBeVisible();
  await spinToQuestion(page);
  await answerWrong(page);
  await page.getByRole("button", { name: "Pass to Mary" }).click();
  await expect(page.locator(".handoff")).toBeVisible();
  await expect(page.locator(".qv-card")).toHaveCount(0);
  await page.getByRole("button", { name: "I’m Mary" }).click();
  await expect(
    page.getByRole("heading", { name: "Mary’s turn" }),
  ).toBeVisible();
  const { match } = await saved(page);
  expect(match.mode).toBe("friends");
  expect(match.game.settings.length).toBe("quick");
});

test("games survive a refresh without scoring an answer twice", async ({
  page,
}) => {
  const question = questions[5];
  await seed(page, vsBot({ question }));
  await page.getByRole("button", { name: /Continue/ }).click();
  await answerRight(page);
  await expect(page.locator(".sheet")).toBeVisible();
  const before = await saved(page);
  await page.reload();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator(".sheet")).toBeVisible();
  const after = await saved(page);
  expect(after.match.game.players).toEqual(before.match.game.players);
  expect(after.stats.correct).toBe(1);
});

test("blocked storage still lets you play", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("Blocked storage");
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Storage" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await expect(page.locator(".qv, .pick")).toBeVisible();
});

test("older pass-and-play saves still resume", async ({ page }) => {
  const game = {
    ...createGame([{ name: "Mina" }, { name: "Mary" }], () => 0.5),
    phase: "question",
    question: questions[0],
    used: [questions[0].id],
  };
  await seed(page, game, "friends", 1);
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator(".qv-card h1")).toHaveText(questions[0].text);
  await page.locator(".answer").nth(questions[0].correct).click();
  await expect(page.locator(".sheet h2")).toHaveText("Correct!");
  await page.getByRole("button", { name: "Pass to Mary" }).click();
  await expect(
    page.getByRole("heading", { name: "Mary’s turn" }),
  ).toBeVisible();
});
