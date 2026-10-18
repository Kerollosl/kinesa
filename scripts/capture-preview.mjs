import { chromium, expect } from "@playwright/test";
// Run against `npm run dev` to regenerate the repository's visual previews.
const browser = await chromium.launch({ headless: true });
const errors = [];
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
await page.screenshot({ path: "docs/kinesa-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "docs/kinesa-mobile.png", fullPage: true });
await page.getByRole("button", { name: /Play with friends/ }).click();
await page.getByLabel("What should we call you?").fill("Mina");
await page.getByRole("button", { name: "Create room", exact: true }).click();
await page.getByRole("button", { name: /Add a friend/ }).click();
await page.getByRole("button", { name: /Add a friend/ }).click();
for (let i = 1; i < 4; i++)
  await page
    .getByRole("textbox", { name: `Player ${i + 1} name` })
    .fill(["Mina", "Mary", "John", "Mariam"][i]);
await page.getByRole("button", { name: "Deal our companions" }).click();
await expect(
  page.getByRole("button", { name: "Game on", exact: true }),
).toBeEnabled();
await page.screenshot({ path: "docs/kinesa-assignment.png", fullPage: true });
await page.getByRole("button", { name: "Game on", exact: true }).click();
await page.getByRole("button", { name: "Spin the wheel", exact: true }).click();
await expect(page.locator(".answer-option")).toHaveCount(4);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: "docs/kinesa-gameplay.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.locator(".answer-option").first().click();
await page.getByRole("button", { name: "Pass to Mary", exact: true }).click();
await page.screenshot({ path: "docs/kinesa-handoff.png", fullPage: true });
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
