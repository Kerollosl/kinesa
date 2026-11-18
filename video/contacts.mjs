// Checks every hand that should touch something, every 1/24 s across the pushes.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto(new URL("kinesa-big-spin.html?render", import.meta.url).href);
await page.evaluate(() => window.KINESA.ready);
const bad = await page.evaluate(() => {
  const out = [];
  for (let f = 0; f < 30 * 24; f++) {
    const t = f / 24;
    for (const r of window.KINESA.contacts(t)) if (r.gap > 1 || r.short > 0.5) out.push({ t: +t.toFixed(3), ...r });
  }
  return out;
});
console.log(bad.length ? `${bad.length} contact misses, first: ${JSON.stringify(bad.slice(0, 6))}` : "all contacts touch");
await browser.close();
