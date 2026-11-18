// Plays complete classic, friends, daily and topic games on phone and desktop,
// saves a screenshot at every phase, probes small-phone layout, and exits
// non-zero on any console error. Starts its own Vite server.
//
//   node scripts/play-through.mjs [label]           → test-results/play-through/<label>/
//   node scripts/play-through.mjs before --docs     → docs/redesign/before/
//
// PLAYWRIGHT_CHROMIUM_EXECUTABLE selects a local Chromium build if needed.
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const label = process.argv[2] || "latest";
const toDocs = process.argv.includes("--docs");
const outDir = toDocs
  ? `docs/redesign/${label}`
  : `test-results/play-through/${label}`;
const port = Number(process.env.KINESA_PORT || 5287);
const VIEWPORTS = {
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};

await mkdir(outDir, { recursive: true });
const server = await createServer({
  server: { port, strictPort: true, host: "127.0.0.1" },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader"],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
    : {}),
});

const problems = [];
const summary = [];

const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
async function session(name, options, run) {
  if (only && !only.test(name)) return;
  const context = await browser.newContext({
    ...options,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const taken = new Set();
  const shot = async (step, { full = false, always = false } = {}) => {
    if (taken.has(step) && !always) return;
    taken.add(step);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `${outDir}/${name}-${step}.jpg`,
      type: "jpeg",
      quality: 72,
      fullPage: full,
    });
  };
  const started = Date.now();
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await run(page, shot);
  } catch (error) {
    problems.push(
      `${name}: ${String(error)
        .split("\n")
        .slice(0, process.env.ONLY ? 14 : 1)
        .join("\n    ")}`,
    );
    await page
      .screenshot({
        path: `${outDir}/${name}-FAILED.jpg`,
        type: "jpeg",
        quality: 72,
      })
      .catch(() => {});
  }
  if (errors.length)
    problems.push(
      `${name}: ${errors.length} console error(s): ${errors.slice(0, 3).join(" | ")}`,
    );
  summary.push(
    `${name}: ${((Date.now() - started) / 1000).toFixed(1)}s, ${errors.length} console errors`,
  );
  await context.close();
}

const visible = (locator) =>
  locator
    .first()
    .isVisible()
    .catch(() => false);
const main = (page) => page.locator("main");
const button = (page, name) => main(page).getByRole("button", { name }).first();

// Advances whatever the current screen asks for until results appear.
// Answers follow a right, right, wrong pattern so every state shows up.
async function playMatch(page, shot) {
  let answered = 0;
  for (let i = 0; i < 600; i++) {
    if (await visible(page.locator(".results"))) {
      await page.waitForTimeout(1800);
      await shot("results");
      await shot("results-full", { full: true });
      return answered;
    }
    if (await visible(page.locator(".rival"))) {
      await page.waitForTimeout(2200);
      await shot("rival");
      await page.locator(".rival .btn-go").click();
      continue;
    }
    if (await visible(page.locator(".handoff"))) {
      await shot("handoff");
      await page.locator(".handoff .btn-go").click();
      continue;
    }
    if (await visible(page.locator(".pick"))) {
      await shot("pick");
      await page.locator(".pick-tile:not([disabled])").first().click();
      continue;
    }
    const spin = page.locator(".board .btn-go:not([disabled])");
    if (await visible(spin)) {
      await shot("spin");
      await spin.click();
      await page.waitForTimeout(700);
      await shot("spinning");
      await page.waitForTimeout(2600);
      continue;
    }
    const sheet = page.locator(".sheet .btn");
    if (await visible(sheet)) {
      await sheet.click();
      continue;
    }
    const options = page.locator(".qv .answer:not([disabled])");
    if (await visible(options)) {
      await shot("question");
      const correct = await page.evaluate(
        () => JSON.parse(localStorage.getItem("kinesa-match"))?.game?.question?.correct ?? 0,
      );
      const right = answered % 3 !== 2;
      const hidden = await page.evaluate(
        () => JSON.parse(localStorage.getItem("kinesa-match"))?.game?.hidden || [],
      );
      const wrong = [0, 1, 2, 3].find((n) => n !== correct && !hidden.includes(n));
      await page.locator(".qv .answer").nth(right ? correct : wrong).click();
      answered++;
      await page.waitForTimeout(1100);
      await shot(right ? "feedback-right" : "feedback-wrong");
      continue;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`match did not finish, answered ${answered}`);
}

async function chooseQuick(page, shot) {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("radio", { name: /^Quick/ }).check();
  await shot("settings");
  await page.getByRole("button", { name: "Done" }).click();
}

for (const [device, options] of Object.entries(VIEWPORTS)) {
  await session(`${device}-classic`, options, async (page, shot) => {
    await shot("home");
    await chooseQuick(page, shot);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await playMatch(page, shot);
    await page.getByRole("button", { name: "Home" }).click();
    await shot("home-after");
  });
  await session(`${device}-friends`, options, async (page, shot) => {
    await page.getByRole("button", { name: /Friends/ }).click();
    await page.getByRole("button", { name: /Add player/ }).click();
    for (const [n, name] of ["Kero", "Marina", "Abanoub"].entries())
      await page.getByLabel(`Player ${n + 1} name`).fill(name);
    await page.getByRole("radio", { name: /^Quick/ }).check();
    await shot("setup");
    await page.getByRole("button", { name: "Start" }).click();
    await playMatch(page, shot);
  });
  await session(`${device}-daily`, options, async (page, shot) => {
    await page.getByRole("button", { name: /today’s five/i }).click();
    await playMatch(page, shot);
    await page.goto(base, { waitUntil: "networkidle" });
    await shot("home-after");
  });
  await session(`${device}-topic`, options, async (page, shot) => {
    await page.goto(base + "#categories", { waitUntil: "networkidle" });
    await page.locator(".cat-tile").nth(1).click();
    await shot("dialog");
    await page.getByRole("button", { name: /Play 10 questions/ }).click();
    await playMatch(page, shot);
  });
  await session(`${device}-pages`, options, async (page, shot) => {
    for (const hash of ["#categories", "#collection"]) {
      await page.goto(base + hash, { waitUntil: "networkidle" });
      await shot(hash.slice(1));
    }
    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "How to play" }).first().click();
    await shot("help");
  });
}

// Small-phone layout probe: no horizontal scroll and no text under 13px.
for (const width of [360, 390]) {
  await session(
    `probe-${width}`,
    { viewport: { width, height: 740 }, isMobile: true, hasTouch: true },
    async (page) => {
      for (const hash of ["", "#categories", "#collection"]) {
        await page.goto(base + hash, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
        const report = await page.evaluate(() => {
          const tiny = [];
          for (const el of document.querySelectorAll("body *")) {
            if (
              !el.offsetParent ||
              el.closest("[aria-hidden='true'], .sr-only, svg, canvas")
            )
              continue;
            const text = [...el.childNodes]
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent.trim())
              .join("");
            if (text && parseFloat(getComputedStyle(el).fontSize) < 13)
              tiny.push(
                `${getComputedStyle(el).fontSize} "${text.slice(0, 24)}"`,
              );
          }
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            tiny: [...new Set(tiny)].slice(0, 6),
          };
        });
        if (report.overflow > 0)
          problems.push(
            `probe ${width}px ${hash || "#home"}: ${report.overflow}px horizontal overflow`,
          );
        if (report.tiny.length)
          summary.push(
            `probe ${width}px ${hash || "#home"} sub-13px text: ${report.tiny.join(", ")}`,
          );
      }
    },
  );
}

await browser.close();
await server.close();
console.log(`Screenshots → ${outDir}`);
for (const line of summary) console.log(`  ${line}`);
if (problems.length) {
  console.error("Problems:");
  for (const line of problems) console.error(`  ✗ ${line}`);
  process.exit(1);
}
console.log("✓ play-through clean");
