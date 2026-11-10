import { test, expect } from "@playwright/test";
import { questions } from "../../src/data.js";

async function friendsLobby(page, count = 4) {
  await page.goto("/");
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await page.getByRole("textbox", { name: "Player 1 name" }).fill("Mina");
  for (let i = 2; i < count; i++)
    await page.getByRole("button", { name: /Add a friend/ }).click();
  for (let i = 0; i < count; i++)
    await page
      .getByRole("textbox", { name: `Player ${i + 1} name` })
      .fill(["Mina", "Mary", "John", "Mariam"][i]);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: "Deal our companions" }).click();
  await expect(page.locator(".assignment-slot")).toHaveCount(count);
  const kinds = await page
    .locator(".assignment-slot")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.companion));
  expect(new Set(kinds).size).toBe(count);
  await page.getByRole("button", { name: "Game on", exact: true }).click();
}

test("a four-player friends match randomly assigns unique companions, scores ties, and offers a fresh rematch", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await friendsLobby(page);
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
    const current = questions.find((q) => q.text === text);
    await page
      .locator(".answer-option")
      .nth(i % 4 < 2 ? current.correct : (current.correct + 1) % 4)
      .click();
    await expect(page.locator(".answer-option.correct")).toHaveCount(1);
    await expect(page.locator(".answer-option").first()).toBeDisabled();
    await page
      .getByRole("button", {
        name:
          i === 11
            ? "See the results"
            : `Pass to ${["Mina", "Mary", "John", "Mariam"][(i + 1) % 4]}`,
        exact: true,
      })
      .click();
    if (i < 11) {
      if ((i + 1) % 4 === 0) {
        await expect(
          page.getByRole("heading", { name: `Round ${(i + 1) / 4} done.` }),
        ).toBeVisible();
        await page.getByRole("button", { name: /^Next round/ }).click();
      }
      await expect(
        page.getByRole("heading", {
          name: `Pass to ${["Mina", "Mary", "John", "Mariam"][(i + 1) % 4]}.`,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: /^I’m .* — let’s play$/ }).click();
    }
  }
  // Mina and Mary answered every question correctly; speed bonuses decide any tie.
  await expect(
    page.getByRole("heading", {
      name: /takes the crown!|A shared celebration!/,
    }),
  ).toBeVisible();
  const leaders = await page
    .locator(".final-score-row strong")
    .evaluateAll((nodes) => nodes.slice(0, 4).map((n) => n.textContent));
  expect(leaders.filter((t) => t === "Mina" || t === "Mary").length).toBe(2);
  await expect(page.locator(".podium-step")).toHaveCount(3);
  const stats = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-stats")),
  );
  expect(stats.games).toBe(1);
  expect(stats.correct).toBe(6);
  // Rematch is one tap: same roster, fresh companions, scores reset.
  await page.getByRole("button", { name: "Rematch", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mina, you’re up!" }),
  ).toBeVisible();
  const rematch = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(new Set(rematch.game.players.map((p) => p.kind)).size).toBe(4);
  expect(rematch.game.players.every((p) => p.score === 0)).toBe(true);
  expect(errors).toEqual([]);
});

test("Play now starts a practice match in one tap where bots answer alongside the player", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Play now/ }).click();
  await expect(
    page.getByRole("heading", { name: "Question 1 of 10" }),
  ).toBeVisible();
  await expect(page.locator(".score-player .bot-tag")).toHaveCount(3);
  const kinds = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")).game.players.map(
      (p) => p.kind,
    ),
  );
  expect(new Set(kinds).size).toBe(4);
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await expect(page.locator(".question-timer")).toBeVisible();
  const text = await page.locator(".question-stage h1").textContent();
  const q = questions.find((q) => q.text === text);
  await page.locator(".answer-option").nth(q.correct).click();
  // Everyone's pick is revealed together; bots lock in when the player does.
  await expect(page.locator(".answer-option.correct")).toHaveCount(1);
  await expect(page.locator(".answer-reveal h2")).toContainText("Correct!");
  await expect(page.locator(".did-you-know p")).toHaveText(q.explanation);
  expect(await page.locator(".answer-pickers .picker").count()).toBe(4);
  await page
    .getByRole("button", { name: "Next question", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Question 2 of 10" }),
  ).toBeVisible();
  const stats = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-stats")),
  );
  expect(stats.correct).toBe(1); // Bot answers never inflate the player's collection.
});

test("Customize saves the round setup and the next Play now uses it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Your name").fill("Kerollos");
  await sheet.getByRole("radio", { name: /^Easy/ }).check();
  await sheet.getByRole("radio", { name: "5", exact: true }).check();
  await sheet.getByRole("button", { name: "Play", exact: true }).click();
  // Easy play is untimed and starts at the wheel.
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".question-timer")).toContainText("No clock");
  await expect(page.locator(".score-player").first()).toContainText("Kerollos");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(saved.game.settings).toMatchObject({
    tier: "easy",
    timed: false,
    questions: 5,
  });
  await page.getByRole("button", { name: "Back to play", exact: true }).click();
  await expect(page.locator(".play-hero-meta")).toContainText(
    "Easy · 5 questions · No clock",
  );
});

test("blocked storage still supports friend matches and correct answers", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("Blocked storage");
      },
    }),
  );
  await friendsLobby(page, 2);
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const text = await page.locator(".question-stage h1").textContent();
  const q = questions.find((q) => q.text === text);
  await page.locator(".answer-option").nth(q.correct).click();
  await expect(page.locator(".answer-reveal h2")).toContainText("Correct!");
});

test("mobile mode actions and navigation stay clear of game content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const play = await page
    .getByRole("button", { name: /^Play now/ })
    .boundingBox();
  expect(play.y + play.height).toBeLessThan(700);
  // Thumb-reach navigation: a bottom bar on phones.
  const dock = await page
    .getByRole("navigation", { name: "Main navigation" })
    .boundingBox();
  expect(dock.y + dock.height).toBeGreaterThanOrEqual(844 - 1);
  expect(dock.y).toBeGreaterThan(700);
  await friendsLobby(page, 4);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const fourth = await page.locator(".answer-option").last().boundingBox();
  expect(fourth.y + fourth.height).toBeLessThan(844);
  await page.locator(".answer-option").last().click();
  await expect(page.locator(".answer-reveal")).toBeInViewport();
  await expect(page.locator(".answer-reveal .primary-button")).toBeInViewport();
});

test("matches survive refresh without reshuffling companions or scoring an answer twice", async ({
  page,
}) => {
  await friendsLobby(page, 2);
  const initial = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const text = await page.locator(".question-stage h1").textContent();
  const q = questions.find((q) => q.text === text);
  await page.keyboard.press(String(q.correct + 1));
  await expect(page.locator(".answer-reveal h2")).toContainText("Correct!");
  const scored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kinesa-match")).game.players[0].score,
  );
  expect(scored).toBeGreaterThanOrEqual(100);
  await page.reload();
  await page.getByRole("button", { name: /Resume your game/ }).click();
  await expect(page.locator(".answer-reveal h2")).toContainText("Correct!");
  await expect(page.locator(".answer-option").first()).toBeDisabled();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(restored.game.players.map((p) => p.kind)).toEqual(
    initial.game.players.map((p) => p.kind),
  );
  expect(restored.game.players[0].score).toBe(scored);
  expect(restored.game.players[0].correct).toBe(1);
  await page.getByRole("button", { name: "Pass to Mary", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pass to Mary." }),
  ).toBeVisible();
  await expect(page.locator(".answer-option")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Resume your game/ }).click();
  await expect(
    page.getByRole("heading", { name: "Pass to Mary." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I’m Mary — let’s play", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mary, you’re up!" }),
  ).toBeVisible();
  expect(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("kinesa-stats")),
      )
    ).correct,
  ).toBe(1);
});

test("players can revise the room after a companion reveal and start with the revised roster", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Game setup progress" }),
  ).toContainText("Set up");
  await page.getByRole("textbox", { name: "Player 1 name" }).fill("Mina");
  await page.getByRole("textbox", { name: "Player 2 name" }).fill("Mary");
  await page.getByRole("button", { name: "Deal our companions" }).click();
  await expect(
    page.locator('.setup-progress [aria-current="step"]'),
  ).toContainText("Meet your companions");
  await page.getByRole("button", { name: "Edit players", exact: true }).click();
  await expect(
    page.locator('.setup-progress [aria-current="step"]'),
  ).toContainText("Set up");
  await expect(
    page.getByRole("textbox", { name: "Player 2 name" }),
  ).toHaveValue("Mary");
  await page.getByRole("button", { name: /Add a friend/ }).click();
  await page.getByRole("textbox", { name: "Player 3 name" }).fill("John");
  await page.getByRole("button", { name: "Deal our companions" }).click();
  const dealt = await page
    .locator(".assignment-slot")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.companion));
  expect(new Set(dealt).size).toBe(3);
  await expect(page.locator(".assigned-player")).toHaveText([
    "Mina",
    "Mary",
    "John",
  ]);
  await page.getByRole("button", { name: "Game on", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(saved.game.players.map((p) => p.kind)).toEqual(dealt);
  expect(saved.game.players.map((p) => p.name)).toEqual([
    "Mina",
    "Mary",
    "John",
  ]);
  await page.getByRole("button", { name: "Back to play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Resume your game/ }),
  ).toContainText("Mina’s turn");
});

for (const width of [360, 390, 768, 1440]) {
  test(`companions leave the wheel and answer controls clear at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 400 ? 844 : 1000 });
    await friendsLobby(page, 4);
    const companion = await page.locator(".turn-companion").boundingBox();
    const wheel = await page.locator(".game-wheel-scene").boundingBox();
    expect(companion.y + companion.height).toBeLessThanOrEqual(wheel.y);
    const spin = page.getByRole("button", {
      name: "Spin the wheel",
      exact: true,
    });
    await spin.scrollIntoViewIfNeeded();
    expect(
      await spin.evaluate((button) => {
        const r = button.getBoundingClientRect();
        return (
          document
            .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            ?.closest('[role="button"]') === button
        );
      }),
    ).toBe(true);
    await spin.click();
    await expect(page.locator(".answer-option")).toHaveCount(4);
    for (const option of await page.locator(".answer-option").all()) {
      await option.scrollIntoViewIfNeeded();
      expect(
        await option.evaluate((button) => {
          const r = button.getBoundingClientRect();
          return (
            document
              .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
              ?.closest("button") === button
          );
        }),
      ).toBe(true);
    }
    const text = await page.locator(".question-stage h1").textContent();
    const question = questions.find((q) => q.text === text);
    await page.locator(".answer-option").nth(question.correct).click();
    const resultCompanion = await page.locator(".reveal-mascot").boundingBox();
    const next = page.locator(".answer-reveal .primary-button");
    const nextBox = await next.boundingBox();
    expect(resultCompanion.y + resultCompanion.height).toBeLessThanOrEqual(
      nextBox.y,
    );
    // "Did you know?" is part of the reward, shown without an extra tap.
    await expect(page.locator(".did-you-know p")).toHaveText(
      question.explanation,
    );
    await expect(page.locator(".did-you-know .source-chip")).toContainText(
      question.source,
    );
    await expect(next).toBeEnabled();
  });
}
