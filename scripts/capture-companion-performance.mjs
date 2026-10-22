import { chromium, expect } from "@playwright/test";

// A close view of the real homepage components. Only the camera/layout is
// enlarged for the recording; every pose is produced by the shipped rig.
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "no-preference",
  recordVideo: {
    dir: "/tmp/kinesa-performance",
    size: { width: 1280, height: 900 },
  },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(process.env.KINESA_PREVIEW_URL || "http://127.0.0.1:5173");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
    .app-header,.play-heading,.mode-section,.topics-section,.companions-banner,.play-footer,.app-toast,.resume-banner {display:none!important}
    #main-content {padding:28px!important;max-width:1120px!important;margin:0 auto!important}
    .play-layout {display:block!important}
    .play-feature {min-height:0!important;max-width:1060px!important;overflow:visible!important;margin:auto!important}
    .feature-copy {padding:22px 34px 0!important}
    .feature-copy h2 {font-size:27px!important;line-height:1.15!important;margin:0!important;max-width:none!important}
    .feature-copy p,.feature-label,.scene-controls,.feature-bottom {display:none!important}
    .feature-art {width:800px!important;max-width:800px!important;margin:0 auto!important;inset:auto!important}
    .feature-art .game-scene {max-width:800px!important}
    .crew-play-controls {padding-bottom:12px!important}
    .crew-play-actions button {font-size:14px!important;min-height:44px!important;padding:12px 20px!important}
    .crew-play-hint {font-size:13px!important;min-height:24px!important}
  `,
  });
  await expect(page.locator(".game-scene .mascot[data-skinning]")).toHaveCount(
    4,
  );
  await page.waitForTimeout(1600);
  const leo = page.locator(".gs-leo");
  const box = await leo.boundingBox();
  await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.35, {
    steps: 18,
  });
  await page.waitForTimeout(650);
  await page.mouse.move(box.x + box.width * 0.88, box.y + box.height * 0.25, {
    steps: 28,
  });
  await page.waitForTimeout(650);
  await page
    .getByRole("button", { name: "Say hi with the crew", exact: true })
    .click();
  await page.mouse.move(1100, 110);
  await page.waitForTimeout(2900);
  await page
    .getByRole("button", { name: "Dance with the crew", exact: true })
    .click();
  await page.mouse.move(1100, 110);
  await page.waitForTimeout(4500);
  await page
    .getByRole("button", { name: "Send love with the crew", exact: true })
    .click();
  await page.mouse.move(1100, 110);
  await page.waitForTimeout(3500);
  await page
    .getByRole("button", { name: "Celebrate with the crew", exact: true })
    .click();
  await page.mouse.move(1100, 110);
  await page.waitForTimeout(3500);
  await page
    .getByRole("button", { name: "Dance with the crew", exact: true })
    .click();
  await page.mouse.move(1100, 110);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "docs/kinesa-performance.png" });
  const video = page.video();
  await context.close();
  await video.saveAs("docs/kinesa-companions-motion.webm");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Companion performance recorded from the live app. No browser errors.",
  );
} finally {
  await browser.close();
}
