import { test, expect } from "@playwright/test";
import { questions, seed, vsBot } from "./helpers.js";

// No sideways scroll, readable text and thumb-sized targets on every screen.
async function check(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const small = [];
    const tiny = [];
    for (const el of document.querySelectorAll("button, a[href], input")) {
      const box = el.getBoundingClientRect();
      if (!box.width || getComputedStyle(el).visibility === "hidden") continue;
      if (el.closest(".is-hidden, .sr-only, .skip-link")) continue;
      if (box.height < 40 || box.width < 40)
        small.push(
          `${el.className || el.tagName}:${Math.round(box.width)}x${Math.round(box.height)}`,
        );
    }
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!node.textContent.trim() || !el || el.closest(".sr-only, svg"))
        continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 13 && el.getClientRects().length)
        tiny.push(`${node.textContent.trim()}:${size}`);
    }
    return { overflow: doc.scrollWidth - doc.clientWidth, small, tiny };
  });
  expect(report.overflow, "horizontal overflow").toBeLessThanOrEqual(0);
  expect(report.small, "tap targets under 40px").toEqual([]);
  expect(report.tiny, "text under 13px").toEqual([]);
}

for (const [width, height] of [
  [360, 640],
  [390, 844],
  [430, 932],
  [1024, 768],
]) {
  test(`screens fit at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seed(page, vsBot({ question: questions[10] }));
    await page.evaluate(() => document.fonts.ready);
    await check(page);
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.locator(".answer")).toHaveCount(4);
    await check(page);
    const box = await page.locator(".answer").last().boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    await page.locator(".answer").nth(questions[10].correct).click();
    const next = page.locator(".sheet .btn");
    await expect(next).toBeVisible();
    await check(page);
    await next.click();
    await expect(
      page.getByRole("button", { name: "Spin", exact: true }),
    ).toBeVisible();
    const spin = await page
      .getByRole("button", { name: "Spin", exact: true })
      .boundingBox();
    expect(spin.y + spin.height).toBeLessThanOrEqual(height);
    await check(page);
    for (const tab of ["Categories", "Trophies"]) {
      await page.goto(
        `/#${tab === "Categories" ? "categories" : "collection"}`,
      );
      await expect(page.getByRole("heading", { name: tab })).toBeVisible();
      await check(page);
    }
  });
}
