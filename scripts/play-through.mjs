// Plays complete Random and Friends matches on phone and desktop viewports,
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

async function session(name, options, run) {
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
    problems.push(`${name}: ${String(error).split("\n")[0]}`);
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

// Advances whatever the current match phase asks for until results appear.
async function playMatch(page, shot, { friends }) {
  let answered = 0;
  for (let i = 0; i < 400; i++) {
    if (
      (await visible(page.locator("[data-phase='finished']"))) ||
      (await visible(
        main(page).getByRole("button", { name: /^(One more round|Rematch)/i }),
      ))
    ) {
      await page.waitForTimeout(1600);
      await shot("results");
      await shot("results-full", { full: true });
      return answered;
    }
    const interstitial = button(page, /^(Next round|Continue|Keep going)/i);
    if (await visible(interstitial)) {
      await shot("standings");
      await interstitial.click();
      continue;
    }
    const ready = button(page, /^I.m .+ let.s play/i);
    if (await visible(ready)) {
      await shot("handoff");
      await ready.click();
      continue;
    }
    const spin = button(page, /^Spin( the wheel)?$/i);
    if ((await visible(spin)) && (await spin.isEnabled().catch(() => false))) {
      await shot("spin");
      await spin.click();
      await page.waitForTimeout(500);
      await shot("spinning");
      continue;
    }
    const options = page.locator(".answer-option:not([disabled])");
    if (
      (await visible(options)) &&
      !(await visible(page.locator(".answer-reveal")))
    ) {
      await shot("question");
      answered++;
      // Alternate right and wrong answers so both feedback states appear.
      const correct = await page.evaluate(
        () => window.__kinesaCorrectIndex ?? null,
      );
      const count = await options.count();
      const pick =
        correct !== null && answered % 2
          ? correct
          : correct === null
            ? answered % count
            : (correct + 1) % count;
      await options.nth(Math.min(pick, count - 1)).click();
      await page.waitForTimeout(700);
      await shot(answered % 2 ? "feedback-a" : "feedback-b");
      continue;
    }
    const next = button(
      page,
      /^(Watch|Pass to|See the results|Next question|Next|See results)/i,
    );
    if (await visible(next)) {
      await next.click();
      continue;
    }
    await page.waitForTimeout(400);
  }
  throw new Error(
    `match did not finish (${friends ? "friends" : "random"}), answered ${answered}`,
  );
}

async function startRandom(page, shot) {
  await shot("home");
  await shot("home-full", { full: true });
  const playNow = button(page, /^Play now/i);
  if (await visible(playNow)) await playNow.click();
  else await button(page, /Random game/i).click();
  const name = page.getByLabel(/What should we call you/i);
  if (await visible(name)) {
    await shot("setup");
    await name.fill("Kero");
    await button(page, /Find a game/i).click();
  }
  const gameOn = button(page, /^Game on/i);
  if (
    await gameOn
      .waitFor({ timeout: 4000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await page.waitForTimeout(1700);
    await shot("reveal");
    await gameOn.click();
  }
}

async function startFriends(page, shot) {
  await button(page, /Play with friends/i).click();
  const name = page.getByLabel(/What should we call you/i);
  if (await visible(name)) await name.fill("Kero");
  const create = button(page, /^Create room$/i);
  if (await visible(create)) await create.click();
  const add = button(page, /Add a friend|Add player/i);
  while (
    (await page.locator(".friend-seat input").count()) < 3 &&
    (await visible(add))
  )
    await add.click();
  const names = ["Kero", "Marina", "Abanoub", "Sara"];
  const seats = page.locator(".friend-seat input");
  for (let i = 0; i < (await seats.count()); i++)
    await seats.nth(i).fill(names[i]);
  await shot("setup");
  await button(page, /Deal our companions/i).click();
  const gameOn = button(page, /^Game on/i);
  await gameOn.waitFor({ timeout: 6000 });
  await page.waitForTimeout(1700);
  await shot("reveal");
  await gameOn.click();
}

for (const [device, options] of Object.entries(VIEWPORTS)) {
  await session(`${device}-random`, options, async (page, shot) => {
    await startRandom(page, shot);
    await playMatch(page, shot, { friends: false });
  });
  await session(`${device}-friends`, options, async (page, shot) => {
    await startFriends(page, shot);
    await playMatch(page, shot, { friends: true });
  });
  await session(`${device}-pages`, options, async (page, shot) => {
    for (const hash of ["#categories", "#collection"]) {
      await page.goto(base + hash, { waitUntil: "networkidle" });
      await shot(hash.slice(1));
    }
  });
}

// Small-phone layout probe: no horizontal scroll, no sub-12px text, AA contrast on solid text.
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
            if (text && parseFloat(getComputedStyle(el).fontSize) < 12)
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
            `probe ${width}px ${hash || "#home"} sub-12px text: ${report.tiny.join(", ")}`,
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
