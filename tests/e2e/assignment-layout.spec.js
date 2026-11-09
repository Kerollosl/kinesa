import { test, expect } from "@playwright/test";

test.use({ deviceScaleFactor: 2, reducedMotion: "no-preference" });

for (const width of [360, 390, 430, 768, 1440]) {
  test(`assignment artwork stays between its labels at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: /Play with friends/ }).click();
    await page
      .getByRole("textbox", { name: "Player 1 name" })
      .fill("Kerollos Lowandy");
    await page.getByRole("button", { name: /Add a friend/ }).click();
    await page.getByRole("button", { name: /Add a friend/ }).click();
    for (const [index, name] of [
      "Kerollos Lowandy",
      "Mariam",
      "Bishoy",
      "Mina",
    ].entries()) {
      await page
        .getByLabel(`Player ${index + 1} name`, { exact: true })
        .fill(name);
    }
    await page
      .getByRole("button", { name: "Deal our companions", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Game on", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".assignment-front")).toHaveCount(4);
    // A nested canvas inside a flipped SVG is the WebKit paint-over failure mode.
    await expect(
      page.locator(".assignment-art foreignObject, .assignment-art canvas"),
    ).toHaveCount(0);
    const kinds = await page
      .locator(".assignment-slot")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.companion));
    expect(new Set(kinds).size).toBe(4);
    for (const card of await page.locator(".assignment-front").all()) {
      await expect(card).toHaveCSS("opacity", "1");
      const player = await card.locator(".assigned-player").boundingBox();
      const art = await card.locator(".assignment-art").boundingBox();
      const identity = await card.locator(".assignment-identity").boundingBox();
      const actor = await card.locator(".mascot").boundingBox();
      expect(player.y + player.height).toBeLessThanOrEqual(art.y);
      expect(art.y + art.height).toBeLessThanOrEqual(identity.y);
      expect(actor.x).toBeGreaterThanOrEqual(art.x);
      expect(actor.y).toBeGreaterThanOrEqual(art.y);
      expect(actor.x + actor.width).toBeLessThanOrEqual(
        art.x + art.width + 0.5,
      );
      expect(actor.y + actor.height).toBeLessThanOrEqual(
        art.y + art.height + 0.5,
      );
      const heading = card.locator("h2");
      await heading.scrollIntoViewIfNeeded();
      expect(
        await heading.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ) === element
          );
        }),
      ).toBe(true);
    }
    await page
      .locator(".assignment-stage")
      .screenshot({ path: testInfo.outputPath("assignment.png") });
    await page.getByRole("button", { name: "Game on", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Spin the wheel", exact: true }),
    ).toBeEnabled();
  });
}
