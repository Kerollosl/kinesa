import { chromium, expect } from "@playwright/test";
import { questions } from "../src/data.js";
// Run against `npm run dev` to regenerate the repository's visual previews.
const browser = await chromium.launch({ headless: true });
const errors = [];
// Prime off-screen compositing layers before Chromium captures a full page.
// Translucent panes are otherwise sometimes omitted after a viewport resize.
async function capture(page, path) {
  await page.evaluate(async () => {
    const paint = () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += innerHeight) {
      scrollTo({ top: y, behavior: "instant" });
      await paint();
    }
    scrollTo({ top: 0, behavior: "instant" });
    await paint();
  });
  await page.screenshot({ path, fullPage: true });
}
const watch = (page) =>
  page.on("pageerror", (error) => errors.push(error.message));
const context = await browser.newContext({
  viewport: { width: 1440, height: 1120 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
watch(page);
await page.goto("http://localhost:5173");
await expect(page.getByRole("button", { name: /Random game/ })).toBeVisible();
await page.evaluate(() => document.fonts.ready);
await capture(page, "docs/kinesa-desktop.png");
await page.setViewportSize({ width: 390, height: 844 });
await capture(page, "docs/kinesa-mobile.png");
await page.getByRole("button", { name: "Discover", exact: true }).click();
const sampleText = await page.locator(".le-question legend").textContent();
const sample = questions.find((q) => q.text === sampleText);
await page.locator(".le-sample-answer").nth(sample.correct).click();
await page.setViewportSize({ width: 1440, height: 1120 });
await capture(page, "docs/kinesa-discover.png");
await page.setViewportSize({ width: 390, height: 844 });
await capture(page, "docs/kinesa-discover-mobile.png");
await page.getByRole("button", { name: "Collection", exact: true }).click();
await capture(page, "docs/kinesa-collection-empty.png");
await page.getByRole("button", { name: "Play", exact: true }).click();
await page.getByRole("button", { name: /Play with friends/ }).click();
await page.setViewportSize({ width: 1440, height: 1000 });
await capture(page, "docs/kinesa-setup.png");
await page.setViewportSize({ width: 390, height: 844 });
await page.getByLabel("What should we call you?").fill("Mina");
await page.getByRole("button", { name: "Create room", exact: true }).click();
await page.getByRole("button", { name: /Add a friend/ }).click();
await page.getByRole("button", { name: /Add a friend/ }).click();
for (let i = 1; i < 4; i++)
  await page
    .getByRole("textbox", { name: `Player ${i + 1} name` })
    .fill(["Mina", "Mary", "John", "Mariam"][i]);
await capture(page, "docs/kinesa-room.png");
await page.getByRole("button", { name: "Deal our companions" }).click();
await expect(
  page.getByRole("button", { name: "Game on", exact: true }),
).toBeEnabled();
await capture(page, "docs/kinesa-assignment.png");
await page.getByRole("button", { name: "Game on", exact: true }).click();
await page.getByRole("button", { name: "Spin the wheel", exact: true }).click();
await expect(page.locator(".answer-option")).toHaveCount(4);
await page.setViewportSize({ width: 1440, height: 1000 });
await capture(page, "docs/kinesa-gameplay.png");
await page.setViewportSize({ width: 390, height: 844 });
const openingText = await page.locator(".question-stage h1").textContent();
const openingQuestion = questions.find((q) => q.text === openingText);
await page.locator(".answer-option").nth(openingQuestion.correct).click();
await capture(page, "docs/kinesa-feedback.png");
await page.getByRole("button", { name: "Back to play", exact: true }).click();
await capture(page, "docs/kinesa-resume.png");
await page.getByRole("button", { name: /Resume your game/ }).click();
await page.getByRole("button", { name: "Pass to Mary", exact: true }).click();
await capture(page, "docs/kinesa-handoff.png");
for (let i = 1; i < 12; i++) {
  await page.getByRole("button", { name: /^I’m .* — let’s play$/ }).click();
  await page
    .getByRole("button", { name: "Spin the wheel", exact: true })
    .click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const text = await page.locator(".question-stage h1").textContent();
  const question = questions.find((q) => q.text === text);
  const correct = i % 4 < 3 - Math.floor(i / 4);
  await page
    .locator(".answer-option")
    .nth(correct ? question.correct : (question.correct + 1) % 4)
    .click();
  await page.locator(".answer-reveal .primary-button").click();
}
await page.setViewportSize({ width: 1440, height: 1120 });
await capture(page, "docs/kinesa-results.png");
await page.setViewportSize({ width: 390, height: 844 });
await capture(page, "docs/kinesa-results-mobile.png");
await page.locator(".final-score-row").first().click();
await page
  .getByRole("dialog")
  .screenshot({ path: "docs/kinesa-companion.png" });
await page.keyboard.press("Escape");
await page
  .locator(".results-actions")
  .getByRole("button", { name: "Back to play", exact: true })
  .click();
await page.getByRole("button", { name: "Collection", exact: true }).click();
await page.locator(".le-badge-earned").first().click();
await page.setViewportSize({ width: 1440, height: 1120 });
await capture(page, "docs/kinesa-collection.png");
await page.setViewportSize({ width: 390, height: 844 });
await capture(page, "docs/kinesa-collection-mobile.png");
await context.close();
const movie = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: "/tmp/kinesa-video", size: { width: 1280, height: 900 } },
});
const demo = await movie.newPage();
watch(demo);
await demo.goto("http://localhost:5173");
await expect(demo.getByRole("button", { name: /Random game/ })).toBeVisible();
await demo.evaluate(() => document.fonts.ready);
await demo.waitForTimeout(800);
await demo.getByRole("button", { name: "High-five Leo", exact: true }).click();
await demo.waitForTimeout(900);
await demo.getByRole("button", { name: "High-five Juno", exact: true }).click();
await demo.waitForTimeout(800);
await demo
  .getByRole("button", { name: "Give the trivia wheel a practice spin" })
  .click();
await demo.waitForTimeout(2900);
await demo.getByRole("button", { name: "Discover", exact: true }).click();
await demo.locator(".le-sample-answer").first().click();
await demo.waitForTimeout(1000);
await demo.getByRole("button", { name: "Play", exact: true }).click();
await demo.getByRole("button", { name: /Play with friends/ }).click();
await demo.getByLabel("What should we call you?").fill("Mina");
await demo.getByRole("button", { name: "Create room", exact: true }).click();
await demo.getByRole("button", { name: /Add a friend/ }).click();
await demo.getByRole("button", { name: /Add a friend/ }).click();
await demo.waitForTimeout(700);
await demo.getByRole("button", { name: "Deal our companions" }).click();
await demo.waitForTimeout(2200);
await demo.getByRole("button", { name: "Game on", exact: true }).click();
await demo.getByRole("button", { name: "Spin the wheel", exact: true }).click();
await expect(demo.locator(".answer-option")).toHaveCount(4);
await demo.waitForTimeout(1000);
await demo.locator(".answer-option").first().click();
await demo.waitForTimeout(1200);
const video = demo.video();
await movie.close();
await video.saveAs("docs/kinesa-motion.webm");
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log("Final screenshots and motion recording saved. No browser errors.");
