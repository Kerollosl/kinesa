import { test, expect } from "@playwright/test";
import { questions } from "../../src/data.js";

async function friendsLobby(page, count = 4) {
  await page.goto("/");
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await page.getByLabel("What should we call you?").fill("Mina");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
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
      await expect(
        page.getByRole("heading", {
          name: `Pass to ${["Mina", "Mary", "John", "Mariam"][(i + 1) % 4]}.`,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: /^I’m .* — let’s play$/ }).click();
    }
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
  await page.getByRole("button", { name: "One more round?" }).click();
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await page.getByRole("button", { name: "Deal our companions" }).click();
  expect(
    new Set(
      await page
        .locator(".assignment-slot")
        .evaluateAll((ns) => ns.map((n) => n.dataset.companion)),
    ).size,
  ).toBe(4);
  await page.getByRole("button", { name: "Game on", exact: true }).click();
  await expect(page.locator(".score-player").first()).toContainText("0 points");
  expect(errors).toEqual([]);
});

test("random match preview fills with labeled bots and bots play their own turns", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Random game/ }).click();
  await expect(
    page.getByText(/Real online matchmaking comes next/),
  ).toBeVisible();
  await page.getByLabel("What should we call you?").fill("Kerollos");
  await page.getByRole("button", { name: "Find a game", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Getting the gang together…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Game on", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".assigned-player small")).toHaveCount(3);
  const kinds = await page
    .locator(".assignment-slot")
    .evaluateAll((ns) => ns.map((n) => n.dataset.companion));
  expect(new Set(kinds).size).toBe(4);
  await page.getByRole("button", { name: "Game on", exact: true }).click();
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const text = await page.locator(".question-stage h1").textContent();
  const q = questions.find((q) => q.text === text);
  await page.locator(".answer-option").nth(q.correct).click();
  await page
    .getByRole("button", { name: "Watch Mina’s turn", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mina is up!" }),
  ).toBeVisible();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await expect(page.locator(".answer-option").first()).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Watch Mariam’s turn", exact: true }),
  ).toBeVisible();
  const stats = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-stats")),
  );
  expect(stats.correct).toBe(1); // Bot points never inflate the player's collection.
});

test("matchmaking can be cancelled without starting a stale game", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Random game/ }).click();
  await page.getByRole("button", { name: "Find a game", exact: true }).click();
  await page.getByRole("button", { name: "Cancel matchmaking" }).click();
  await expect(
    page.getByRole("button", { name: "Find a game", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to play", exact: true }).click();
  await page.waitForTimeout(2800);
  await expect(
    page.getByRole("heading", { name: "Start a game" }),
  ).toBeVisible();
  await expect(page.locator(".assignment-slot")).toHaveCount(0);
});

test("friends preview supports joining its sample room and rejects unknown codes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await page.getByRole("button", { name: "Join a room", exact: true }).click();
  await page.getByLabel("Room code").fill("WRONG1");
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Try AMEN24");
  await page.getByRole("button", { name: "AMEN24", exact: true }).click();
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(page.locator(".friend-seat")).toHaveCount(3);
  await page.getByRole("button", { name: "Deal our companions" }).click();
  await expect(page.locator(".assignment-slot")).toHaveCount(3);
});

test("mobile scene reactions, keyboard dialogs, and navigation work without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const name of ["Leo", "Lou", "Juno", "Mattie", "Leo", "Lou"]) {
    await page
      .getByRole("button", { name: `High-five ${name}`, exact: true })
      .click();
    await expect(page.locator(".gs-reaction")).toBeVisible();
    await expect(page.locator(".gs-character-art .mascot")).toHaveCount(4);
  }
  await page
    .getByRole("button", { name: "Give the trivia wheel a practice spin" })
    .click();
  await expect(
    page.getByRole("button", { name: "Give the trivia wheel a practice spin" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "How to play", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await expect(page.locator(".explore-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Collection", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The trophy shelf." }),
  ).toBeVisible();
  await friendsLobby(page, 2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
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
  await expect(
    page.getByRole("heading", { name: "Look at you go! +100" }),
  ).toBeVisible();
});

test("small-phone hero text and interactive character bounds fit without clipping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/");
  const metrics = await page
    .locator(".mobile-home-title h1")
    .evaluate((e) => ({ client: e.clientWidth, scroll: e.scrollWidth }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client);
  const bounds = await page.locator(".game-scene").evaluate((scene) => {
    const parent = scene.getBoundingClientRect();
    return [...scene.querySelectorAll(".gs-character")].map((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= parent.left - 1 && r.right <= parent.right + 1;
    });
  });
  expect(bounds.every(Boolean)).toBe(true);
  const animation = await page
    .locator(".gs-character-art")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test("mobile mode actions are visible immediately and the game dock cannot cover answers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const bounds = await page
    .locator(".mode-card")
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().bottom));
  expect(Math.max(...bounds)).toBeLessThan(650);
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
  await expect(
    page.getByRole("heading", { name: "Look at you go! +100" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Resume your game/ }).click();
  await expect(
    page.getByRole("heading", { name: "Look at you go! +100" }),
  ).toBeVisible();
  await expect(page.locator(".answer-option").first()).toBeDisabled();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kinesa-match")),
  );
  expect(restored.game.players.map((p) => p.kind)).toEqual(
    initial.game.players.map((p) => p.kind),
  );
  expect(restored.game.players[0].score).toBe(100);
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
  await page.getByLabel("What should we call you?").fill("Mina");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
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
