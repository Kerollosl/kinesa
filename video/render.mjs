// Renders kinesa-big-spin.html to an MP4, frame by frame, in parallel.
//   node render.mjs [out-dir] [--workers 4] [--from 0 --to 720] [--no-video]
// Needs ffmpeg with libx264. PLAYWRIGHT_CHROMIUM_EXECUTABLE picks a local
// Chromium build. Audio is synthesized by the page and loudness-normalized
// to -16 LUFS with a two-pass ffmpeg loudnorm.
import { chromium } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = args[0] && !args[0].startsWith("--") ? args[0] : "out";
const workers = Number(opt("workers", 4));
const FPS = 24, DURATION = 30;
const total = FPS * DURATION;
const from = Number(opt("from", 0)), to = Number(opt("to", total));
const url = new URL("kinesa-big-spin.html?render", import.meta.url).href;
const launch = () =>
  chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
  });
await mkdir(`${out}/frames`, { recursive: true });

async function worker(w) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.evaluate(() => window.KINESA.ready);
  for (let f = from + w; f < to; f += workers) {
    const file = `${out}/frames/${String(f).padStart(5, "0")}.png`;
    if (existsSync(file) && !args.includes("--force")) continue;
    const png = await page.evaluate((t) => {
      window.KINESA.renderFrame(t);
      return document.getElementById("c").toDataURL("image/png");
    }, f / FPS);
    await writeFile(file, Buffer.from(png.split(",")[1], "base64"));
    if (f % 48 === w) console.log(`worker ${w}: frame ${f}`);
  }
  await browser.close();
  if (errors.length) throw new Error(errors.join("\n"));
}

const started = Date.now();
if (!args.includes("--no-video")) await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
console.log(`frames done in ${((Date.now() - started) / 1000).toFixed(0)}s`);

// Sound: synthesize, then normalize to -16 LUFS (two passes).
{
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.evaluate(() => window.KINESA.ready);
  const wav = await page.evaluate(() => window.KINESA.audioWav());
  await writeFile(`${out}/raw.wav`, Buffer.from(wav, "base64"));
  await browser.close();
}
const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", `${out}/raw.wav`, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(probe.stderr.match(/\{[\s\S]*\}/)[0]);
const filter = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", `${out}/raw.wav`, "-af", filter, "-ar", "48000", `${out}/audio.wav`]);

const frames = (await readdir(`${out}/frames`)).filter((f) => f.endsWith(".png")).length;
if (frames >= total) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(FPS), "-i", `${out}/frames/%05d.png`,
    "-i", `${out}/audio.wav`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
    `${out}/kinesa-big-spin.mp4`,
  ]);
  // One frame per second, for review.
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", `${out}/kinesa-big-spin.mp4`, "-vf", "fps=1,scale=480:-1,tile=5x6", "-frames:v", "1", `${out}/contact-sheet.jpg`]);
  console.log(`wrote ${out}/kinesa-big-spin.mp4`);
} else console.log(`${frames}/${total} frames present; MP4 not assembled`);
