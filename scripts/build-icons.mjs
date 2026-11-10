// Renders docs/store/icon-source.svg (and the launch screen) with Chromium, then
// `python3 -I scripts/flatten-icons.py` flattens to opaque RGB and writes every size:
//   node scripts/build-icons.mjs && python3 -I scripts/flatten-icons.py
// Output is opaque, full-bleed, no baked corners (the OS or the manifest mask adds them).
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BG = "#3d1f4a";
const icon = await readFile("docs/store/icon-source.svg", "utf8");
const browser = await chromium.launch();
async function render(svg, size, out) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:${BG}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await writeFile(out, await page.screenshot({ type: "png" }));
  await page.close();
}
await render(icon, 1024, "docs/store/app-icon-1024-raw.png");
// Launch screen: the same cross, smaller, on the same purple.
const splash = icon
  .replace('viewBox="0 0 1024 1024" width="1024" height="1024"', 'viewBox="0 0 2732 2732" width="2732" height="2732"')
  .replace('<rect width="1024" height="1024" fill="#3d1f4a"/>', '<rect width="2732" height="2732" fill="#3d1f4a"/>')
  .replace(/<circle[^>]*\/>\s*<circle[^>]*\/>/, "")
  .replace("translate(512 512) scale(15.2)", "translate(1366 1366) scale(11)");
await render(splash, 2732, "resources/splash-raw.png");
await browser.close();
console.log("rendered; now run scripts/flatten-icons.py");
