import { test, expect } from "@playwright/test";
import { questions, categories } from "../../src/data.js";

test("Discover samples explain answers without changing game progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  const text = await page.locator(".le-question legend").textContent();
  const sample = questions.find((q) => q.text === text);
  await page
    .locator(".le-sample-answer")
    .nth((sample.correct + 1) % 4)
    .click();
  await expect(page.locator(".le-sample-reveal")).toContainText(
    sample.explanation,
  );
  await expect(page.locator(".le-sample-reveal")).toContainText(sample.source);
  await expect(page.locator(".le-answer-correct")).toHaveCount(1);
  await expect(page.locator(".le-sample-answer").first()).toBeDisabled();
  await page
    .getByRole("button", { name: "Try another sample", exact: true })
    .click();
  await expect(page.locator(".le-question legend")).not.toHaveText(text);
  await expect(page.locator(".le-question legend")).toBeFocused();
  await page
    .locator(".le-topic-card")
    .filter({ hasText: "Bible Stories" })
    .click();
  await expect(page.locator("#discovery-heading")).toHaveText("Bible Stories");
  await expect(page.locator(".le-question legend")).toBeFocused();
  await expect(page.locator(".le-topic-selected")).toContainText(
    "Bible Stories",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("kinesa-stats")),
  ).toBeNull();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("kinesa-match"))),
  ).toBeNull();
});

test("Collection shows actual progress, badge details, and survives a direct refresh", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "kinesa-stats",
      JSON.stringify({ games: 2, correct: 4, badges: ["bible"] }),
    ),
  );
  await page.goto("/#collection");
  await expect(
    page.getByRole("heading", { name: "The trophy shelf." }),
  ).toBeVisible();
  await expect(page.locator(".le-badge-earned")).toHaveCount(1);
  await page
    .locator(".le-badge-card")
    .filter({ hasText: "Coptic History" })
    .click();
  await expect(page.locator(".le-badge-detail")).toBeFocused();
  await expect(page.locator(".le-badge-detail")).toContainText(
    "Answer a question in Coptic History correctly",
  );
  await page
    .locator(".le-badge-detail")
    .getByRole("button", { name: "Explore the category" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Coptic History");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The trophy shelf." }),
  ).toBeVisible();
  await expect(page.locator(".le-badge-earned")).toHaveCount(1);
  // Games, correct answers, badges, day streak; the level has its own row.
  await expect(page.locator(".le-stat strong")).toHaveText([
    "2",
    "4",
    "1 / 6",
    "0",
  ]);
  await expect(page.locator(".le-level-name")).toHaveText("Level 1");
});

test("friends setup has no room codes and clears the retired room preview", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "kinesa-room-preview",
      JSON.stringify({ code: "FULL24", names: ["Mina", "Mary"] }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Play with friends/ }).click();
  await expect(
    page.getByRole("heading", { name: "Who’s playing?" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Join a room/ })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Room code")).toHaveCount(0);
  await expect(page.getByText("Guest player")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("kinesa-room-preview")),
  ).toBeNull();
});
