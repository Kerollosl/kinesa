import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MOTION_DELTA,
  MOTION_JOINTS,
  advanceMotion,
  createMotion,
  motionPose,
  setMotionIntent,
  staticMotionPose,
} from "../src/three/motion.js";

function simulate(state, seconds, fps = 60) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) {
    state = advanceMotion(state, 1 / fps);
  }
  return state;
}

function allNumbers(value) {
  if (typeof value === "number") return [value];
  return Object.values(value).flatMap((nested) => allNumbers(nested));
}

test("3D idle and greeting trajectories agree across 30, 60, and 120Hz", () => {
  const run = (fps) => {
    let state = createMotion("human", 0.37);
    state = simulate(state, 0.5, fps);
    state = setMotionIntent(state, {
      mood: "celebrate",
      reaction: 1,
      look: { x: 0.7, y: -0.4 },
    });
    return motionPose(simulate(state, 1.5, fps));
  };
  const reference = allNumbers(run(120));
  for (const fps of [30, 60]) {
    const sampled = allNumbers(run(fps));
    for (let index = 0; index < reference.length; index++) {
      assert.ok(Math.abs(sampled[index] - reference[index]) < 0.0001);
    }
  }
});

test("rapid greetings extend intent while preserving every spring position and velocity", () => {
  let state = setMotionIntent(createMotion("human", 0.22), {
    reaction: 1,
    mood: "celebrate",
  });
  state = simulate(state, 0.6);
  const previous = structuredClone(state);
  const interrupted = setMotionIntent(state, {
    reaction: 2,
    look: { x: -1, y: 1 },
  });
  assert.deepEqual(interrupted.springs, previous.springs);
  assert.equal(interrupted.elapsed, previous.elapsed);
  assert.equal(interrupted.gesture.startedAt, previous.gesture.startedAt);
  assert.ok(interrupted.gesture.holdUntil > previous.gesture.holdUntil);
  assert.ok(Math.abs(interrupted.springs.joints.handRight.rx.velocity) > 0.01);
  const advanced = advanceMotion(interrupted, 1 / 120);
  assert.ok(
    Math.abs(
      advanced.springs.joints.armRight.rz.value -
        previous.springs.joints.armRight.rz.value,
    ) < 0.08,
  );
  assert.deepEqual(
    state,
    previous,
    "Changing intent and advancing never mutate saved state",
  );
});

test("pointer attention leads with eyes, then head yaw, then weighted torso follow", () => {
  const initial = simulate(createMotion("lion", 0.2), 1);
  const neutral = motionPose(initial);
  const state = simulate(
    setMotionIntent(initial, { hovered: true, look: { x: 1, y: 1 } }),
    0.1,
  );
  const pose = motionPose(state);
  const eyeProgress = pose.gaze.x - neutral.gaze.x;
  const headProgress = (pose.joints.head.ry - neutral.joints.head.ry) / 0.32;
  const torsoProgress = (pose.joints.body.ry - neutral.joints.body.ry) / 0.075;
  assert.ok(eyeProgress > headProgress);
  assert.ok(headProgress > torsoProgress);
  assert.ok(pose.joints.head.rx < neutral.joints.head.rx);
  const turned = motionPose(
    simulate(setMotionIntent(initial, { look: { x: -1, y: -1 } }), 0.6),
  );
  assert.ok(
    turned.joints.head.ry < -0.2,
    "The head turns in 3D yaw, rather than only tilting on screen",
  );
  assert.ok(turned.joints.head.rx > 0.07);
  assert.ok(turned.root.ry > 0 && turned.root.ry < 0.3);
});

test("wing greetings bend through X/Y/Z depth while feet remain grounded", () => {
  const state = simulate(
    setMotionIntent(createMotion("eagle", 0.1), { reaction: 1 }),
    0.8,
  );
  const pose = motionPose(state);
  assert.ok(Math.abs(pose.joints.wingLeft.rx) > 0.005);
  assert.ok(Math.abs(pose.joints.wingLeft.ry) > 0.1);
  assert.ok(pose.joints.wingLeft.rz < -0.4);
  assert.ok(pose.joints.wingRight.rz > 0.4);
  assert.ok(Math.abs(pose.joints.elbowLeft.ry) > 0.05);
  assert.equal(pose.root.y, 0);
  assert.equal(pose.joints.footLeft.y, 0);
  assert.equal(pose.joints.footRight.y, 0);
  assert.ok(pose.joints.chest.sy > 0.97 && pose.joints.chest.sy < 1.03);
});

test("a completed gesture returns to the same ongoing idle without a looping wave", () => {
  let greeting = createMotion("ox", 0.3);
  let idle = greeting;
  greeting = setMotionIntent(greeting, { mood: "celebrate", reaction: 1 });
  greeting = simulate(greeting, 5);
  idle = simulate(idle, 5);
  const actual = motionPose(greeting);
  const expected = motionPose(idle);
  for (const joint of MOTION_JOINTS) {
    for (const property of [
      "rx",
      "ry",
      "rz",
      "x",
      "y",
      "z",
      "sx",
      "sy",
      "sz",
    ]) {
      assert.ok(
        Math.abs(
          actual.joints[joint][property] - expected.joints[joint][property],
        ) < 0.001,
      );
    }
  }
  assert.equal(greeting.intent.mood, "celebrate");
  assert.ok(
    Math.abs(greeting.springs.joints.tail.ry.velocity) > 0.001,
    "Idle remains alive after greeting ends",
  );
});

test("zero/invalid dt freezes phase and delayed frames stay finite and bounded", () => {
  let state = setMotionIntent(createMotion("human", 0.6), { reaction: 1 });
  state = simulate(state, 0.4);
  for (const dt of [0, -1, NaN, Infinity, undefined])
    assert.equal(advanceMotion(state, dt), state);
  const delayed = advanceMotion(state, 10000);
  assert.ok(
    Math.abs(delayed.elapsed - state.elapsed - MAX_MOTION_DELTA) < 1e-12,
  );
  for (let frame = 0; frame < 80; frame++) {
    state = setMotionIntent(state, {
      reaction: frame + 2,
      look: { x: Infinity, y: -200 },
      hovered: true,
    });
    state = advanceMotion(state, 1000);
  }
  const pose = motionPose(state);
  for (const number of allNumbers(pose))
    assert.ok(Number.isFinite(number) && Math.abs(number) < 3);
  assert.ok(Math.abs(pose.root.y) <= 0.05);
  assert.ok(Math.abs(pose.gaze.x) <= 1 && Math.abs(pose.gaze.y) <= 1);
  assert.ok(pose.blink >= 0 && pose.blink <= 1);
});

test("native blinks close and reopen while different characters stay asynchronous", () => {
  const closedAt = [];
  for (const kind of ["lion", "ox", "eagle", "human"]) {
    let state = createMotion(kind);
    let maximum = 0;
    let peakTime = 0;
    for (let frame = 0; frame < 600; frame++) {
      state = advanceMotion(state, 1 / 120);
      if (state.blink > maximum) {
        maximum = state.blink;
        peakTime = state.elapsed;
      }
    }
    assert.ok(maximum > 0.98);
    closedAt.push(peakTime);
    assert.equal(motionPose(simulate(state, 0.25, 120)).blink, 0);
  }
  assert.equal(new Set(closedAt.map((time) => Math.round(time * 100))).size, 4);
});

test("reduced-motion stills preserve recognizable 3D gestures without advancing a clock", () => {
  const neutral = staticMotionPose({ kind: "human" });
  const greeting = staticMotionPose({ kind: "human", mood: "celebrate" });
  assert.equal(neutral.root.ry, 0.14);
  assert.equal(neutral.blink, 0);
  assert.equal(greeting.root.y, 0);
  assert.ok(greeting.joints.armRight.rz > 1);
  assert.notEqual(greeting.joints.handRight.ry, 0);
  assert.deepEqual(neutral, staticMotionPose({ kind: "human" }));
});
