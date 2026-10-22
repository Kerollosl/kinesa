import { test, expect } from "@playwright/test";

test.use({
  reducedMotion: "no-preference",
  viewport: { width: 1440, height: 1000 },
});

const sceneRigs =
  ".game-scene .gs-character > .gs-character-art > svg.mascot-rig";

async function readyScene(page) {
  await page.goto("/");
  await expect(page.locator(sceneRigs)).toHaveCount(4);
  await expect(
    page.locator(
      `${sceneRigs} [data-joint='head'] > .companion-painted-part > image`,
    ),
  ).toHaveCount(4);
  await page.evaluate(async () => {
    await Promise.all(
      ["rig", "torsos", "eyelids"].map(async (part) => {
        const image = new Image();
        image.src = `/characters/kinesa-companion-${part}.webp`;
        await image.decode();
      }),
    );
  });
  await expect
    .poll(() =>
      page
        .locator(sceneRigs)
        .evaluateAll((roots) =>
          roots.every((root) =>
            [...root.querySelectorAll("[data-joint]")].every((joint) =>
              joint.hasAttribute("transform"),
            ),
          ),
        ),
    )
    .toBe(true);
  await page.locator(".game-scene").evaluate((scene) => {
    window.__originalSceneCompanions = [
      ...scene.querySelectorAll(".gs-character-art > svg.mascot-rig"),
    ];
  });
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

// Sample the real SVG joint attributes on painted frames. This deliberately
// checks local transforms: moving the entire illustration cannot satisfy it.
async function sampleRig(page, { frames = 24, greetAt = [] } = {}) {
  return page.locator(".gs-leo .mascot-rig").evaluate(
    async (root, { frames, greetAt }) => {
      const snapshots = [];
      const button = root.closest("button");
      for (let index = 0; index < frames; index++) {
        const timestamp = await new Promise(requestAnimationFrame);
        snapshots.push({
          timestamp,
          greetingVisible: Boolean(button.querySelector(".gs-reaction")),
          angles: Object.fromEntries(
            [...root.querySelectorAll("[data-joint]")].map((joint) => [
              joint.dataset.joint,
              Number(
                joint.getAttribute("transform").match(/rotate\(([^)]+)\)/)?.[1],
              ),
            ]),
          ),
        });
        if (greetAt.includes(index)) button.click();
      }
      return snapshots;
    },
    { frames, greetAt },
  );
}

function range(samples, joint) {
  const values = samples.map((sample) => sample.angles[joint]);
  return Math.max(...values) - Math.min(...values);
}

async function sampleScene(page, frames = 16) {
  return page.locator(".game-scene").evaluate(async (scene, count) => {
    const snapshots = [];
    for (let index = 0; index < count; index++) {
      await new Promise(requestAnimationFrame);
      snapshots.push(
        [...scene.querySelectorAll(".mascot-rig [data-joint]")].map((joint) =>
          joint.getAttribute("transform"),
        ),
      );
    }
    return snapshots;
  }, frames);
}

test("rendered heads, wings, and arms idle independently and greet without pose resets", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await readyScene(page);
  const idle = await sampleRig(page);
  const greeting = await sampleRig(page, {
    frames: 42,
    greetAt: [0, 10, 22, 30],
  });

  for (const joint of [
    "head",
    "wingLeft",
    "wingRight",
    "armLeft",
    "armRight",
  ]) {
    expect(
      range(idle, joint),
      `${joint} has independent idle motion`,
    ).toBeGreaterThan(0);
    expect(
      range(greeting, joint),
      `${joint} remains live during greetings`,
    ).toBeGreaterThan(0);
    const fullRange = range(greeting, joint);
    for (let i = 1; i < greeting.length; i++) {
      const elapsed =
        (greeting[i].timestamp - greeting[i - 1].timestamp) / 1000;
      const step = Math.abs(
        greeting[i].angles[joint] - greeting[i - 1].angles[joint],
      );
      // Allow a delayed browser frame, while rejecting a jump across a large
      // fraction of the gesture in an ordinary painted frame.
      expect(step).toBeLessThan(fullRange * Math.min(0.7, elapsed * 12) + 0.5);
    }
  }
  expect(range(greeting, "armRight")).toBeGreaterThan(range(idle, "armRight"));
  expect(await sameCompanions(page)).toBe(true);
  await expect(page.locator(sceneRigs)).toHaveCount(4);
  expect(greeting.some((sample) => sample.greetingVisible)).toBe(true);
  expect(errors).toEqual([]);
});

test("scene pause freezes every joint and resumes the same four character instances", async ({
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
  const frozen = await sampleScene(page);
  for (const pose of frozen) expect(pose).toEqual(frozen[0]);

  // Reading the first resumed frame catches remounts and pose resets without
  // depending on an exact idle phase, frame rate, or pixel position.
  const firstResumedPose = await page
    .locator(".game-scene")
    .evaluate(async (scene) => {
      const button = document.querySelector(
        "[aria-label='Resume scene animation']",
      );
      button.click();
      await new Promise(requestAnimationFrame);
      return [...scene.querySelectorAll(".mascot-rig [data-joint]")].map(
        (joint) => joint.getAttribute("transform"),
      );
    });
  expect(firstResumedPose).toEqual(frozen[0]);
  const resumed = await sampleScene(page);
  expect(
    resumed.some((pose) => JSON.stringify(pose) !== JSON.stringify(frozen[0])),
  ).toBe(true);
  expect(await sameCompanions(page)).toBe(true);
});

test("changing reduced-motion preference makes the existing rigs static and then live again", async ({
  page,
}) => {
  await readyScene(page);
  await page
    .getByRole("button", { name: "High-five Lou", exact: true })
    .click();
  const moving = await sampleScene(page);
  expect(
    moving.some((pose) => JSON.stringify(pose) !== JSON.stringify(moving[0])),
  ).toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    )
    .toBe(true);
  const still = await sampleScene(page);
  for (const pose of still) expect(pose).toEqual(still[0]);

  // Interactions still respond while the accessibility setting is active.
  await page
    .getByRole("button", { name: "High-five Leo", exact: true })
    .click();
  await expect(page.locator(".gs-leo .gs-reaction")).toBeVisible();
  const staticGreeting = await sampleScene(page);
  for (const pose of staticGreeting) expect(pose).toEqual(staticGreeting[0]);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  const liveAgain = await sampleScene(page);
  expect(
    liveAgain.some(
      (pose) => JSON.stringify(pose) !== JSON.stringify(liveAgain[0]),
    ),
  ).toBe(true);
  expect(await sameCompanions(page)).toBe(true);
});

test("pointer attention follows smoothly while retaining the original painted face", async ({
  page,
}) => {
  await readyScene(page);
  const root = page.locator(".gs-leo .mascot-rig");
  const head = root.locator("[data-joint='head']");
  const artwork = await head
    .locator(".companion-painted-part > image")
    .getAttribute("href");
  const box = await root.boundingBox();
  const horizontalOffset = () =>
    head.evaluate((node) =>
      Number(node.getAttribute("transform").match(/translate\(([^ ]+)/)[1]),
    );
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.3);
  await expect.poll(horizontalOffset).toBeLessThan(-0.5);
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.3, {
    steps: 8,
  });
  await expect.poll(horizontalOffset).toBeGreaterThan(0.5);
  await expect(head.locator(".companion-painted-part > image")).toHaveAttribute(
    "href",
    artwork,
  );
  expect(await sameCompanions(page)).toBe(true);
});

test("opening help freezes background companions and closing it resumes their poses", async ({
  page,
}) => {
  await readyScene(page);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "How to play", exact: true })
    .click();
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  const frozen = await sampleScene(page);
  for (const pose of frozen) expect(pose).toEqual(frozen[0]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const resumed = await sampleScene(page);
  expect(
    resumed.some((pose) => JSON.stringify(pose) !== JSON.stringify(frozen[0])),
  ).toBe(true);
  expect(await sameCompanions(page)).toBe(true);
});

test("the original artwork and high-fives work without graphics workers or WebGL", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() {
        throw new Error("No workers available");
      }
    };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (/^(webgl2?|experimental-webgl)$/.test(type))
        throw new Error("No WebGL available");
      return getContext.call(this, type, ...args);
    };
  });
  await readyScene(page);
  await expect(
    page.locator(`${sceneRigs}[data-renderer='painted']`),
  ).toHaveCount(4);
  await expect(page.locator(`${sceneRigs} canvas`)).toHaveCount(0);
  await page
    .getByRole("button", { name: "High-five Juno", exact: true })
    .click();
  await expect(page.locator(".gs-juno .gs-reaction")).toBeVisible();
  await expect(page.getByRole("button", { name: /Random game/ })).toBeEnabled();
});

test("the crew keeps dancing, blends a greeting into the rhythm, and winds down without replacing artwork", async ({
  page,
}) => {
  await readyScene(page);
  const dance = page.getByRole("button", {
    name: "Dance with the crew",
    exact: true,
  });
  await dance.click();
  await expect(dance).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`${sceneRigs}[data-dancing='true']`)).toHaveCount(
    4,
  );
  // A session remains live beyond the lifetime of a one-shot greeting.
  await page.waitForTimeout(5200);
  const dancing = await sampleRig(page, { frames: 40, greetAt: [4, 18] });
  expect(range(dancing, "body")).toBeGreaterThan(1);
  expect(range(dancing, "head")).toBeGreaterThan(0.5);
  expect(await sameCompanions(page)).toBe(true);
  await expect(dance).toHaveAttribute("aria-pressed", "true");
  await dance.click();
  await expect(dance).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(`${sceneRigs}[data-dancing='false']`)).toHaveCount(
    4,
  );
  expect(await sameCompanions(page)).toBe(true);
});

test("holding a companion sends love once, pause freezes the effects, and movement cancels a hold", async ({
  page,
}) => {
  await readyScene(page);
  const leo = page.getByRole("button", { name: "High-five Leo", exact: true });
  const box = await leo.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await expect(page.locator(".gs-leo .mascot-rig")).toHaveAttribute(
    "data-action",
    "cuddle",
  );
  await page.mouse.up();
  await expect(page.locator(".gs-leo .gs-reaction")).toHaveText(
    "Sending a little love your way.",
  );
  await expect
    .poll(() =>
      page
        .locator(".gs-leo [data-emote='hearts']")
        .evaluateAll((nodes) =>
          nodes.some((node) => Number(node.getAttribute("opacity")) > 0.02),
        ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Pause scene animation", exact: true })
    .click();
  await expect(leo).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Give the trivia wheel a practice spin",
      exact: true,
    }),
  ).toBeEnabled();
  const readEffects = () =>
    page
      .locator(".gs-leo [data-emote]")
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute("transform"),
          node.getAttribute("opacity"),
        ]),
      );
  const frozen = await readEffects();
  await page.waitForTimeout(250);
  expect(await readEffects()).toEqual(frozen);
  await page
    .getByRole("button", { name: "Resume scene animation", exact: true })
    .click();
  const lou = page.getByRole("button", { name: "High-five Lou", exact: true });
  await lou.dispatchEvent("pointerdown", {
    pointerType: "touch",
    button: 0,
    clientX: 50,
    clientY: 50,
  });
  await lou.dispatchEvent("pointermove", {
    pointerType: "touch",
    clientX: 90,
    clientY: 90,
  });
  await lou.dispatchEvent("pointercancel", { pointerType: "touch" });
  await page.waitForTimeout(650);
  await expect(page.locator(".gs-lou .mascot-rig")).toHaveAttribute(
    "data-action",
    "hello",
  );
  expect(await sameCompanions(page)).toBe(true);
});

test("opening help during a practice spin freezes the wheel and defers its result until closed", async ({
  page,
}) => {
  await readyScene(page);
  await page
    .getByRole("button", {
      name: "Give the trivia wheel a practice spin",
      exact: true,
    })
    .click();
  await page.waitForTimeout(400);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "How to play", exact: true })
    .click();
  const wheel = page.locator(".game-scene .wheel");
  const rotation = () =>
    wheel.evaluate((node) => getComputedStyle(node).transform);
  const frozen = await rotation();
  await page.waitForTimeout(400);
  expect(await rotation()).toEqual(frozen);
  await expect(page.getByText("Landed on", { exact: false })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByText("Landed on", { exact: false })).toBeVisible();
  expect(await rotation()).not.toEqual(frozen);
});
