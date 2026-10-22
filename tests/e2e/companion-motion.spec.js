import { test, expect } from "@playwright/test";

// Motion samples share the software GPU; keep this file sequential even when
// independent game-flow specs use separate browser workers.
test.describe.configure({ mode: "serial", timeout: 90000 });

test.use({
  reducedMotion: "no-preference",
  viewport: { width: 1440, height: 1000 },
});

const sceneRigs =
  ".game-scene .gs-character > .gs-character-art > svg.mascot-webgl";

async function readyScene(page) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.__companionWorkerCount = 0;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        window.__companionWorkerCount++;
      }
    };
  });
  await page.goto("/");
  await expect(page.locator(sceneRigs)).toHaveCount(4);
  await expect(page.locator(`${sceneRigs}[data-renderer='webgl']`)).toHaveCount(
    4,
    {
      timeout: 30000,
    },
  );
  await page.evaluate(async (selector) => {
    // Import the same module instance used by Mascot, including Vite's HMR
    // timestamp. A bare URL can create a fresh module with an empty WeakMap.
    const rendererURL = performance
      .getEntriesByType("resource")
      .find(
        (entry) => new URL(entry.name).pathname === "/src/three/renderer.js",
      ).name;
    const { getCompanionDiagnostics } = await import(rendererURL);
    window.__getCompanionDiagnostics = getCompanionDiagnostics;
    window.__originalSceneCompanions = [...document.querySelectorAll(selector)];
    window.__nextCompanionFrame = async (root, after) => {
      const started = performance.now();
      while (performance.now() - started < 20000) {
        await new Promise(requestAnimationFrame);
        const diagnostics = getCompanionDiagnostics(root);
        if (diagnostics && diagnostics.drawCount > after) {
          return {
            timestamp: performance.now(),
            ...structuredClone(diagnostics),
          };
        }
      }
      throw new Error("The companion worker did not paint a new frame");
    };
  }, sceneRigs);
  await expect
    .poll(
      () =>
        page.locator(sceneRigs).evaluateAll((roots) =>
          roots.every((root) => {
            const diagnostics = window.__getCompanionDiagnostics(root);
            return (
              diagnostics?.worker &&
              diagnostics.renderThread === "worker" &&
              diagnostics.drawn
            );
          }),
        ),
      { timeout: 15000 },
    )
    .toBe(true);
}

async function sameCompanions(page) {
  return page
    .locator(sceneRigs)
    .evaluateAll((roots) =>
      roots.every(
        (root, index) => root === window.__originalSceneCompanions[index],
      ),
    );
}

// Read physical Three joint quaternions only after the worker paints a new
// frame. Main-thread RAFs keep running while the GPU works and are not evidence
// that a new character pose reached the screen.
async function sampleRig(page, { frames = 8, greetAt = [] } = {}) {
  return page.locator(".gs-leo .mascot-webgl").evaluate(
    async (root, { frames, greetAt }) => {
      const snapshots = [];
      const button = root.closest("button");
      let previous = window.__getCompanionDiagnostics(root).drawCount;
      for (let index = 0; index < frames; index++) {
        const diagnostics = await window.__nextCompanionFrame(root, previous);
        previous = diagnostics.drawCount;
        snapshots.push({
          ...diagnostics,
          greetingVisible: Boolean(button.querySelector(".gs-reaction")),
        });
        if (greetAt.includes(index)) button.click();
      }
      return snapshots;
    },
    { frames, greetAt },
  );
}

function quaternionDistance(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  return 2 * Math.acos(Math.min(1, Math.abs(dot)));
}

function motionRange(samples, joint) {
  const first = samples[0].joints[joint].quaternion;
  return Math.max(
    ...samples.map((sample) =>
      quaternionDistance(first, sample.joints[joint].quaternion),
    ),
  );
}

async function scenePose(page) {
  return page.locator(sceneRigs).evaluateAll((roots) =>
    roots.map((root) => {
      const diagnostics = window.__getCompanionDiagnostics(root);
      return { joints: diagnostics.joints, pose: diagnostics.pose };
    }),
  );
}

async function waitSceneState(page, field, value) {
  await expect
    .poll(
      () =>
        page
          .locator(sceneRigs)
          .evaluateAll(
            (roots, { field, value }) =>
              roots.every(
                (root) =>
                  window.__getCompanionDiagnostics(root)?.[field] === value,
              ),
            { field, value },
          ),
      { timeout: 15000 },
    )
    .toBe(true);
}

async function staticSceneSamples(page) {
  return page.locator(".game-scene").evaluate(async (scene) => {
    const snapshots = [];
    for (let index = 0; index < 16; index++) {
      await new Promise(requestAnimationFrame);
      snapshots.push(
        [...scene.querySelectorAll(".mascot-webgl")].map((root) => {
          const diagnostics = window.__getCompanionDiagnostics(root);
          return { joints: diagnostics.joints, pose: diagnostics.pose };
        }),
      );
    }
    return snapshots;
  });
}

test("four sculpted characters share one render worker and blend continuous 3D gestures", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await readyScene(page);
  expect(await page.evaluate(() => window.__companionWorkerCount)).toBe(1);

  const rendered = await page.locator(sceneRigs).evaluateAll(async (roots) =>
    Promise.all(
      roots.map(async (root) => {
        const diagnostics = window.__getCompanionDiagnostics(root);
        const canvas = root.querySelector("canvas");
        // The visible canvas is owned by OffscreenCanvas in the worker. Snapshot
        // its displayed bitmap without asking it for a second drawing context.
        const bitmap = await createImageBitmap(canvas);
        const sample = document.createElement("canvas");
        sample.width = bitmap.width;
        sample.height = bitmap.height;
        const context = sample.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = context.getImageData(
          0,
          0,
          sample.width,
          sample.height,
        ).data;
        let painted = 0;
        const colors = new Set();
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 100) {
            painted++;
            colors.add(
              `${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`,
            );
          }
        }
        return {
          kind: diagnostics.kind,
          workerId: diagnostics.workerId,
          contextCount: diagnostics.contextCount,
          meshes: diagnostics.meshes,
          vertices: diagnostics.vertices,
          geometryBounds: diagnostics.geometryBounds,
          painted,
          colors: colors.size,
        };
      }),
    ),
  );
  expect(rendered.map((character) => character.kind).sort()).toEqual([
    "eagle",
    "human",
    "lion",
    "ox",
  ]);
  expect(new Set(rendered.map((character) => character.workerId)).size).toBe(1);
  expect(rendered[0].workerId).toBeTruthy();
  for (const character of rendered) {
    expect(
      character.contextCount,
      `${character.kind} uses the shared GPU context`,
    ).toBe(1);
    expect(
      character.meshes,
      `${character.kind} has articulated surfaces`,
    ).toBeGreaterThan(10);
    expect(
      character.vertices,
      `${character.kind} has real mesh geometry`,
    ).toBeGreaterThan(10000);
    expect(
      character.geometryBounds[2],
      `${character.kind} has sculpted depth`,
    ).toBeGreaterThan(0.5);
    expect(
      character.painted,
      `${character.kind} paints opaque pixels`,
    ).toBeGreaterThan(200);
    expect(
      character.colors,
      `${character.kind} has shaded depth`,
    ).toBeGreaterThan(12);
  }

  const idle = await sampleRig(page);
  const greeting = await sampleRig(page, {
    frames: 24,
    greetAt: [0, 6, 12, 18],
  });
  for (const joint of [
    "head",
    "wingLeft",
    "wingRight",
    "armLeft",
    "armRight",
  ]) {
    expect(
      motionRange(idle, joint),
      `${joint} idles independently`,
    ).toBeGreaterThan(0.000001);
    expect(
      motionRange(greeting, joint),
      `${joint} stays live during repeated greetings`,
    ).toBeGreaterThan(0.0001);
    for (let index = 1; index < greeting.length; index++) {
      const step = quaternionDistance(
        greeting[index - 1].joints[joint].quaternion,
        greeting[index].joints[joint].quaternion,
      );
      // Account for coalesced worker messages, while rejecting an unblended
      // jump across the gesture in one painted frame. Simulation caps dt1/15.
      const frames = greeting[index].drawCount - greeting[index - 1].drawCount;
      expect(step, `${joint} interpolates instead of restarting`).toBeLessThan(
        0.5 * frames,
      );
    }
  }
  for (const axis of [0, 1, 2]) {
    const values = greeting.map(
      (sample) => sample.joints.wingLeft.quaternion[axis],
    );
    expect(
      Math.max(...values) - Math.min(...values),
      `wing rotates around axis ${axis}`,
    ).toBeGreaterThan(0.0001);
  }
  expect(motionRange(greeting, "armRight")).toBeGreaterThan(
    motionRange(idle, "armRight"),
  );
  expect(greeting.some((sample) => sample.greetingVisible)).toBe(true);
  expect(await sameCompanions(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("pointer focus turns physical heads in depth", async ({ page }) => {
  await readyScene(page);
  const root = page.locator(".gs-leo .mascot-webgl");
  const box = await root.boundingBox();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.3);
  await expect
    .poll(
      () =>
        root.evaluate(
          (node) => window.__getCompanionDiagnostics(node).pose.joints.head.ry,
        ),
      { timeout: 15000 },
    )
    .toBeLessThan(-0.12);
  const left = await root.evaluate(
    (node) => window.__getCompanionDiagnostics(node).joints.head.quaternion,
  );
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.3, {
    steps: 8,
  });
  await expect
    .poll(
      () =>
        root.evaluate(
          (node) => window.__getCompanionDiagnostics(node).pose.joints.head.ry,
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0.12);
  const right = await root.evaluate(
    (node) => window.__getCompanionDiagnostics(node).joints.head.quaternion,
  );
  expect(quaternionDistance(left, right)).toBeGreaterThan(0.2);
  expect(await sameCompanions(page)).toBe(true);
});

test("pause freezes physical joints and resumes the same four character instances", async ({
  page,
}) => {
  await readyScene(page);
  await page
    .getByRole("button", { name: "High-five Mattie", exact: true })
    .click();
  await page
    .getByRole("button", { name: "High-five Juno", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pause scene animation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume scene animation", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await waitSceneState(page, "paused", true);
  const frozen = await staticSceneSamples(page);
  for (const pose of frozen) expect(pose).toEqual(frozen[0]);

  await page
    .getByRole("button", { name: "Resume scene animation", exact: true })
    .click();
  await waitSceneState(page, "paused", false);
  await expect
    .poll(async () => JSON.stringify(await scenePose(page)), { timeout: 15000 })
    .not.toBe(JSON.stringify(frozen[0]));
  expect(await sameCompanions(page)).toBe(true);
});

test("reduced-motion preference makes existing characters static and then live again", async ({
  page,
}) => {
  await readyScene(page);
  const before = await scenePose(page);
  await expect
    .poll(async () => JSON.stringify(await scenePose(page)), { timeout: 15000 })
    .not.toBe(JSON.stringify(before));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitSceneState(page, "reduced", true);
  const still = await staticSceneSamples(page);
  for (const pose of still) expect(pose).toEqual(still[0]);
  const leo = page.locator(".gs-leo .mascot-webgl");
  const paintedBefore = await leo.evaluate(
    (root) => window.__getCompanionDiagnostics(root).drawCount,
  );
  await page
    .getByRole("button", { name: "High-five Leo", exact: true })
    .click();
  await expect(page.locator(".gs-leo .gs-reaction")).toBeVisible();
  await expect
    .poll(
      () =>
        leo.evaluate(
          (root) => window.__getCompanionDiagnostics(root).drawCount,
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(paintedBefore);
  // An explicit greeting may choose another accessible still. The earlier
  // samples establish that reduced motion itself does not advance poses.
  const staticGreeting = await scenePose(page);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await waitSceneState(page, "reduced", false);
  await expect
    .poll(async () => JSON.stringify(await scenePose(page)), { timeout: 15000 })
    .not.toBe(JSON.stringify(staticGreeting));
  expect(await sameCompanions(page)).toBe(true);
});

test("unavailable WebGL keeps the rendered 3D portraits and character interactions usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // Exercise the main-thread compatibility fallback, then make WebGL itself
    // unavailable so the final rendered-poster fallback is covered as well.
    Object.defineProperty(window, "OffscreenCanvas", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      "transferControlToOffscreen",
      { value: undefined, configurable: true },
    );
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (/^(webgl2?|experimental-webgl)$/.test(type)) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(
    page.locator(`${sceneRigs}[data-renderer='poster']`),
  ).toHaveCount(4);
  await expect
    .poll(() =>
      page
        .locator(`${sceneRigs} .companion-poster`)
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image.complete &&
              image.naturalWidth === 512 &&
              image.naturalHeight === 512,
          ),
        ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "High-five Leo", exact: true })
    .click();
  await expect(page.locator(".gs-leo .gs-reaction")).toBeVisible();
  await expect(page.getByRole("button", { name: /Random game/ })).toBeEnabled();
});
