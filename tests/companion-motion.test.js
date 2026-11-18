import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FRAME_DELTA,
  NEUTRAL_DEFORMATION,
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

const advanceFor = (state, seconds, fps = 60) => {
  let next = state;
  for (let frame = 0; frame < seconds * fps; frame++)
    next = advanceCompanion(next, 1 / fps);
  return next;
};

test("switching between deliberate actions preserves every spring's momentum", () => {
  let state = retargetCompanion(createCompanionState({ kind: "human" }), {
    action: "dance",
    reaction: 1,
  });
  state = advanceFor(state, 0.6);
  const snapshot = structuredClone(state);
  const interrupted = retargetCompanion(state, {
    action: "cuddle",
    reaction: 2,
  });
  assert.deepEqual(interrupted.joints, snapshot.joints);
  assert.deepEqual(interrupted.attention, snapshot.attention);
  for (const name of Object.keys(interrupted.actions)) {
    assert.equal(interrupted.actions[name].value, snapshot.actions[name].value);
    assert.equal(
      interrupted.actions[name].velocity,
      snapshot.actions[name].velocity,
    );
  }
  const next = advanceCompanion(interrupted, 1 / 120);
  assert.ok(
    Math.abs(next.joints.body.x.value - snapshot.joints.body.x.value) < 0.3,
  );
  assert.ok(next.actions.dance.until <= next.elapsed);
  assert.ok(next.actions.cuddle.until > next.elapsed);
  assert.deepEqual(state, snapshot, "Actions never mutate a previous frame");
});

test("repeated interactions extend the performance without restarting its rhythm", () => {
  let state = retargetCompanion(createCompanionState({ kind: "eagle" }), {
    action: "celebrate",
    reaction: 1,
  });
  state = advanceFor(state, 1.3);
  const repeated = retargetCompanion(state, {
    action: "celebrate",
    reaction: 2,
  });
  assert.equal(
    repeated.actions.celebrate.started,
    state.actions.celebrate.started,
  );
  assert.ok(repeated.actions.celebrate.until > state.actions.celebrate.until);
  assert.deepEqual(repeated.joints, state.joints);
  assert.equal(
    repeated.actions.celebrate.velocity,
    state.actions.celebrate.velocity,
  );
});

test("ongoing dance remains active under other reactions and releases when toggled off", () => {
  let state = retargetCompanion(createCompanionState({ kind: "lion" }), {
    dancing: true,
  });
  state = advanceFor(state, 12);
  assert.equal(state.intent.dancing, true);
  assert.ok(
    state.actions.dance.value > 0.69 && state.actions.dance.value < 0.75,
  );
  const before = companionPose(state);
  state = advanceFor(state, 0.3);
  assert.ok(
    Math.abs(companionPose(state).joints.body.x - before.joints.body.x) > 0.2,
  );
  state = retargetCompanion(state, { action: "cuddle", reaction: 1 });
  state = advanceFor(state, 0.8);
  assert.ok(state.actions.cuddle.value > 0.95);
  assert.ok(
    state.actions.dance.value > 0.69,
    "A hug layers over the ongoing dance",
  );
  const stopped = retargetCompanion(state, { dancing: false });
  assert.deepEqual(stopped.joints, state.joints);
  assert.equal(stopped.actions.dance.velocity, state.actions.dance.velocity);
  state = advanceFor(stopped, 2);
  assert.equal(state.intent.dancing, false);
  assert.ok(Math.abs(state.actions.dance.value) < 0.001);
});

test("celebrations anticipate the hop, lift, land softly, and release their effects", () => {
  let state = retargetCompanion(
    createCompanionState({ kind: "lion", seed: 0 }),
    {
      action: "celebrate",
      reaction: 1,
    },
  );
  state = advanceFor(state, 0.15);
  const anticipation = companionPose(state);
  assert.ok(
    anticipation.joints.body.sy < 0.997,
    "A small squash anticipates the jump",
  );
  assert.ok(
    anticipation.joints.body.y > 0,
    "The feet press into the ground first",
  );
  state = advanceFor(state, 0.4);
  const airborne = companionPose(state);
  assert.ok(airborne.joints.body.y < -5);
  assert.ok(airborne.shadow.scale < anticipation.shadow.scale);
  assert.ok(airborne.effects.sparkles > 0.9);
  state = advanceFor(state, 0.4);
  const landed = companionPose(state);
  assert.ok(landed.joints.body.y > airborne.joints.body.y + 3);
  state = advanceFor(state, 7);
  assert.ok(companionPose(state).effects.sparkles < 0.001);
});

test("the idle director visits several overlapping behaviors without perpetual hopping", () => {
  let state = createCompanionState({ kind: "ox", seed: 0.24 });
  const visited = new Set();
  let largestVerticalTravel = 0;
  for (let frame = 0; frame < 60 * 35; frame++) {
    state = advanceCompanion(state, 1 / 60);
    for (const [name, channel] of Object.entries(state.ambient)) {
      if (channel.value > 0.7) visited.add(name);
    }
    largestVerticalTravel = Math.max(
      largestVerticalTravel,
      Math.abs(state.joints.body.y.value),
    );
  }
  assert.deepEqual(visited, new Set(["glance", "stretch", "shuffle", "sway"]));
  assert.ok(
    largestVerticalTravel < 2,
    "Ambient motion keeps the feet grounded",
  );
  assert.ok(Math.abs(state.joints.head.r.velocity) > 0.01);
});

test("full action and ambient trajectories agree across 30 and 120 fps", () => {
  const run = (fps) => {
    let state = createCompanionState({ kind: "eagle", seed: 0.42 });
    state = retargetCompanion(state, {
      action: "dance",
      reaction: 1,
      look: { x: 0.8, y: -0.2 },
    });
    state = advanceFor(state, 2, fps);
    state = retargetCompanion(state, { action: "cuddle", reaction: 2 });
    return companionPose(advanceFor(state, 6, fps));
  };
  const slow = run(30);
  const fast = run(120);
  for (const [joint, properties] of Object.entries(slow.joints)) {
    for (const [property, value] of Object.entries(properties)) {
      assert.ok(
        Math.abs(value - fast.joints[joint][property]) < 0.025,
        `${joint}.${property} has the same trajectory`,
      );
    }
  }
});

test("all actions and character personalities remain finite and portraits stay restrained", () => {
  for (const kind of ["lion", "ox", "eagle", "human"]) {
    for (const action of ["hello", "dance", "celebrate", "cuddle"]) {
      const initial = { kind, seed: 0.21 };
      let full = retargetCompanion(createCompanionState(initial), {
        action,
        reaction: 1,
      });
      let portrait = retargetCompanion(
        createCompanionState({ ...initial, portrait: true }),
        { action, reaction: 1 },
      );
      let peakFull = 0;
      let peakPortrait = 0;
      for (let frame = 0; frame < 240; frame++) {
        full = advanceCompanion(full, 1 / 60);
        portrait = advanceCompanion(portrait, 1 / 60);
        const pose = companionPose(full);
        peakFull = Math.max(peakFull, Math.abs(pose.joints.body.y));
        peakPortrait = Math.max(
          peakPortrait,
          Math.abs(companionPose(portrait).joints.body.y),
        );
        for (const joint of Object.values(pose.joints)) {
          for (const value of Object.values(joint)) {
            assert.ok(Number.isFinite(value));
            assert.ok(Math.abs(value) < 65);
          }
        }
        assert.ok(pose.joints.body.sx > 0.95 && pose.joints.body.sx < 1.05);
        assert.ok(pose.joints.body.sy > 0.95 && pose.joints.body.sy < 1.05);
      }
      assert.ok(peakPortrait < peakFull * 0.4);
      assert.equal(companionPose(portrait).effects.hearts, 0);
      assert.equal(companionPose(portrait).effects.sparkles, 0);
    }
  }
});

test("a continuous groove can blend every reaction while keeping faces and limbs within a gentle range", () => {
  for (const kind of ["lion", "ox", "eagle", "human"]) {
    let state = retargetCompanion(createCompanionState({ kind }), {
      dancing: true,
    });
    for (const [index, action] of [
      "hello",
      "cuddle",
      "celebrate",
      "hello",
    ].entries()) {
      state = retargetCompanion(state, { action, reaction: index + 1 });
      for (let frame = 0; frame < 180; frame++) {
        state = advanceCompanion(state, 1 / 60);
        const pose = companionPose(state);
        assert.ok(Math.abs(pose.joints.head.r) < 15);
        assert.ok(Math.abs(pose.joints.body.r) < 9);
        assert.ok(Math.abs(pose.joints.armLeft.r) < 58);
        assert.ok(Math.abs(pose.joints.armRight.r) < 58);
        assert.ok(pose.joints.body.sx > 0.95 && pose.joints.body.sx < 1.05);
        assert.ok(pose.joints.body.sy > 0.95 && pose.joints.body.sy < 1.05);
      }
    }
  }
});

test("a greeting has coherent anticipation, one-handed reach and recovery while its support foot stays planted", () => {
  let state = retargetCompanion(
    createCompanionState({ kind: "human", seed: 0.15 }),
    {
      action: "hello",
      reaction: 1,
    },
  );
  let left = 0;
  let right = 0;
  let leftPlant = 1;
  let rightPlant = 1;
  const beats = new Set();
  for (let frame = 0; frame < 144; frame++) {
    state = advanceCompanion(state, 1 / 60);
    const pose = companionPose(state);
    left = Math.max(left, Math.abs(pose.joints.armLeft.r));
    right = Math.max(right, Math.abs(pose.joints.armRight.r));
    leftPlant = Math.min(leftPlant, pose.deform.plantLeft);
    rightPlant = Math.min(rightPlant, pose.deform.plantRight);
    beats.add(pose.performance);
  }
  assert.ok(right > 25, "The greeting has a deliberate reach");
  assert.ok(
    left < right * 0.4,
    "The support arm does not mirror the waving arm",
  );
  assert.ok(leftPlant > 0.96);
  assert.ok(rightPlant < 0.4);
  assert.ok(beats.has("hello:anticipate"));
  assert.ok(beats.has("hello:reach"));
  assert.ok(beats.has("hello:wave"));
  assert.ok(beats.has("hello:recover"));
});

test("a hug changes torso, expression and feather curvature together, and retargeting keeps every skin spring", () => {
  let state = retargetCompanion(
    createCompanionState({ kind: "lion", seed: 0.2 }),
    {
      action: "cuddle",
      reaction: 1,
    },
  );
  state = advanceFor(state, 1.25);
  const pose = companionPose(state);
  assert.ok(pose.deform.smile > 0.4);
  assert.ok(pose.deform.headPitch > 0.25);
  assert.ok(pose.deform.spine < -0.12);
  assert.ok(pose.deform.wingFoldLeft > 0.45);
  assert.ok(pose.deform.wingFoldRight > 0.5);
  assert.ok(pose.deform.armBendRight > 0.35);
  const snapshot = structuredClone(state);
  const interrupted = retargetCompanion(state, {
    action: "celebrate",
    reaction: 2,
    look: { x: 1, y: -1 },
  });
  assert.deepEqual(interrupted.deform, snapshot.deform);
  assert.deepEqual(interrupted.joints, snapshot.joints);
  const next = advanceCompanion(interrupted, 1 / 120);
  for (const [name, channel] of Object.entries(snapshot.deform)) {
    assert.ok(
      Math.abs(next.deform[name].value - channel.value) < 0.08,
      `${name} blends rather than snapping into a new shape`,
    );
  }
  assert.deepEqual(state, snapshot);
});

test("long-running idle changes skin curvature and attention without losing ground contact", () => {
  let state = createCompanionState({ kind: "lion", seed: 0.29 });
  const values = Object.fromEntries(
    ["turn", "headTurn", "headPitch", "spine", "mane"].map((name) => [
      name,
      [],
    ]),
  );
  for (let frame = 0; frame < 60 * 35; frame++) {
    state = advanceCompanion(state, 1 / 60);
    const pose = companionPose(state);
    for (const name of Object.keys(values))
      values[name].push(pose.deform[name]);
    assert.equal(pose.deform.ground, 1);
  }
  for (const [name, samples] of Object.entries(values)) {
    assert.ok(
      Math.max(...samples) - Math.min(...samples) > 0.06,
      `${name} keeps organic follow-through beyond the first interaction`,
    );
  }
});

test("skin performances stay bounded and agree across frame rates, including a mid-flight interruption", () => {
  const simulate = (fps, portrait = false) => {
    let state = retargetCompanion(
      createCompanionState({ kind: "eagle", seed: 0.23, portrait }),
      {
        dancing: true,
        action: "celebrate",
        reaction: 1,
      },
    );
    const peaks = Object.fromEntries(
      Object.keys(NEUTRAL_DEFORMATION).map((name) => [name, 0]),
    );
    const track = (seconds) => {
      for (let frame = 0; frame < seconds * fps; frame++) {
        state = advanceCompanion(state, 1 / fps);
        for (const [name, value] of Object.entries(
          companionPose(state).deform,
        )) {
          peaks[name] = Math.max(peaks[name], Math.abs(value));
        }
      }
    };
    track(0.5);
    state = retargetCompanion(state, {
      action: "cuddle",
      reaction: 2,
      look: { x: -1, y: 0.4 },
    });
    track(4);
    return { pose: companionPose(state), peaks };
  };
  const slow = simulate(30);
  const fast = simulate(120);
  const portrait = simulate(60, true);
  for (const [name, value] of Object.entries(slow.pose.deform)) {
    assert.ok(Number.isFinite(value));
    assert.ok(value >= -1 && value <= 1);
    assert.ok(
      Math.abs(value - fast.pose.deform[name]) < 0.025,
      `${name} has the same physical performance at different refresh rates`,
    );
    if (!["ground", "plantLeft", "plantRight"].includes(name)) {
      assert.ok(
        portrait.peaks[name] <= fast.peaks[name] * 0.4 + 0.001,
        `${name} is restrained in a portrait`,
      );
    }
  }
  assert.deepEqual(
    staticCompanionPose({ mood: "celebrate" }).deform,
    NEUTRAL_DEFORMATION,
  );
});

test("the feet release for flight and recover contact as the body lands", () => {
  let state = retargetCompanion(createCompanionState({ kind: "ox", seed: 0 }), {
    action: "celebrate",
    reaction: 1,
  });
  assert.equal(companionPose(state).deform.ground, 1);
  state = advanceFor(state, 0.55);
  const airborne = companionPose(state);
  assert.ok(airborne.deform.ground < 0.15);
  assert.ok(airborne.joints.body.y < -3);
  state = advanceFor(state, 0.5);
  assert.ok(companionPose(state).deform.ground > 0.85);
  state = advanceFor(state, 4);
  assert.ok(companionPose(state).deform.ground > 0.999);
});
