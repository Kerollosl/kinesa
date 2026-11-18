// Renders a few stills: node stills.mjs out-dir t1 t2 ...
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const [out, ...times] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(new URL("kinesa-big-spin.html?render", import.meta.url).href);
await page.evaluate(() => window.KINESA.ready);
for (const t of times.map(Number)) {
  const t0 = Date.now();
  const report = await page.evaluate((t) => window.KINESA.renderFrame(t), t);
  const png = await page.evaluate(() => document.getElementById("c").toDataURL("image/png"));
  await writeFile(`${out}/t${t.toFixed(2).padStart(5, "0")}.png`, Buffer.from(png.split(",")[1], "base64"));
  const bad = report.filter((r) => r.gap > 1.5 || r.short > 0.5);
  console.log(`t=${t} ${Date.now() - t0}ms${bad.length ? " CONTACT " + JSON.stringify(bad) : ""}`);
}
if (errors.length) console.log("ERRORS", errors.slice(0, 5).join("\n"));
await browser.close();
