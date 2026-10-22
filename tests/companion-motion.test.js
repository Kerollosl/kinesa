import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FRAME_DELTA,
  advanceCompanion,
  advanceMotionClock,
  advanceSpring,
  companionPose,
  createCompanionState,
  createMotionClock,
  frameDelta,
  retargetCompanion,
  staticCompanionPose,
} from "../src/components/companion-physics.js";

test("damped springs preserve their trajectory across frame rates", () => {
  for (const damping of [0.65, 1, 1.4]) {
    const simulate = (fps) => {
      let state = { value: -8, velocity: 12 };
      for (let i = 0; i < fps; i++) {
        state = advanceSpring(state, 6, 1 / fps, { damping, frequency: 1.4 });
      }
      return state;
    };
    const slow = simulate(30);
    const fast = simulate(120);
    assert.ok(Math.abs(slow.value - fast.value) < 1e-8);
    assert.ok(Math.abs(slow.velocity - fast.velocity) < 1e-8);
  }
});

test("an interrupted greeting retains every joint position and velocity", () => {
  let state = createCompanionState({ kind: "human", seed: 0.2 });
  state = retargetCompanion(state, { reaction: 1, mood: "celebrate" });
  for (let i = 0; i < 22; i++) state = advanceCompanion(state, 1 / 60);
  const before = structuredClone(state);
  const interrupted = retargetCompanion(state, {
    reaction: 2,
    mood: "celebrate",
    look: { x: 1, y: -1 },
  });
  assert.deepEqual(interrupted.joints, before.joints);
  assert.deepEqual(interrupted.greeting, before.greeting);
  assert.equal(interrupted.elapsed, before.elapsed);
  assert.ok(interrupted.greetingUntil > before.greetingUntil);
  assert.ok(Math.abs(before.joints.armRight.r.velocity) > 0.01);
  const next = advanceCompanion(interrupted, 1 / 120);
  assert.ok(
    Math.abs(next.joints.armRight.r.value - before.joints.armRight.r.value) < 1,
  );
  assert.deepEqual(
    state,
    before,
    "Retargeting and advancing do not mutate old state",
  );
});

test("paused clocks preserve their phase and resume without wall-clock catch-up", () => {
  let clock = createMotionClock();
  clock = advanceMotionClock(clock, 1000);
  clock = advanceMotionClock(clock, 1016);
  assert.equal(clock.elapsed, 0.016);
  clock = advanceMotionClock(clock, 90000, false);
  assert.equal(clock.delta, 0);
  assert.equal(clock.elapsed, 0.016);
  clock = advanceMotionClock(clock, 150000);
  assert.equal(clock.delta, 0);
  assert.equal(clock.elapsed, 0.016);
  clock = advanceMotionClock(clock, 150016);
  assert.equal(clock.delta, 0.016);
  assert.equal(clock.elapsed, 0.032);
});

test("bad and delayed frames are finite, clamped, and cannot explode a rig", () => {
  for (const delta of [-1, NaN, Infinity, undefined])
    assert.equal(frameDelta(delta), 0);
  assert.equal(frameDelta(100), MAX_FRAME_DELTA);
  assert.deepEqual(advanceSpring({ value: 3, velocity: 9 }, 10, NaN), {
    value: 3,
    velocity: 9,
  });
  let state = createCompanionState({ kind: "eagle" });
  for (let i = 0; i < 100; i++) {
    state = retargetCompanion(state, {
      reaction: i,
      look: { x: Infinity, y: 200 },
    });
    state = advanceCompanion(state, 100);
  }
  const pose = companionPose(state);
  for (const properties of Object.values(pose.joints)) {
    for (const value of Object.values(properties)) {
      assert.ok(Number.isFinite(value));
      assert.ok(Math.abs(value) < 40);
    }
  }
  assert.ok(pose.blink >= 0 && pose.blink <= 1);
  assert.ok(pose.shadow.opacity >= 0 && pose.shadow.opacity <= 1);
});

test("continuous idle stays frame-rate stable and portrait travel is restrained", () => {
  const simulate = (fps, portrait = false) => {
    let state = createCompanionState({ kind: "lion", seed: 0.37, portrait });
    for (let i = 0; i < fps * 3; i++) state = advanceCompanion(state, 1 / fps);
    return companionPose(state);
  };
  const slow = simulate(30);
  const fast = simulate(120);
  assert.ok(Math.abs(slow.joints.body.y - fast.joints.body.y) < 0.02);
  assert.ok(Math.abs(slow.joints.head.r - fast.joints.head.r) < 0.02);
  const portrait = simulate(60, true);
  assert.ok(Math.abs(portrait.joints.body.y) < Math.abs(fast.joints.body.y));
  assert.ok(Math.abs(portrait.joints.head.r) < Math.abs(fast.joints.head.r));
});

test("a greeting releases smoothly back to live idle without looping forever", () => {
  let state = createCompanionState({ kind: "ox", seed: 0.1 });
  state = retargetCompanion(state, { mood: "celebrate", reaction: 1 });
  let peak = 0;
  for (let i = 0; i < 300; i++) {
    state = advanceCompanion(state, 1 / 60);
    peak = Math.max(peak, state.greeting.value);
  }
  assert.ok(peak > 0.95);
  assert.ok(state.greeting.value < 0.001);
  assert.equal(state.intent.mood, "celebrate");
  assert.ok(Math.abs(state.joints.head.r.velocity) > 0.01);
  assert.equal(staticCompanionPose().blink, 0);
  const still = staticCompanionPose({ mood: "celebrate" });
  assert.ok(still.joints.armLeft.r > 0);
  assert.ok(still.joints.armRight.r < 0);
});
