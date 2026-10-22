import { advanceSpring } from "./spring.js";

const TAU = Math.PI * 2;
export const MAX_MOTION_DELTA = 1 / 15;
const SUBSTEP = 1 / 120;

const PERSONALITIES = {
  lion: { breath: 0.24, curiosity: 1, wing: 0.7, tail: 0.3, perk: 0.16 },
  ox: { breath: 0.19, curiosity: 0.72, wing: 0.55, tail: 0.22, perk: 0.1 },
  eagle: { breath: 0.27, curiosity: 1.15, wing: 1.25, tail: 0.07, perk: 0.025 },
  human: { breath: 0.22, curiosity: 0.9, wing: 0.75, tail: 0.02, perk: 0.04 },
};

const JOINT_FIELDS = {
  body: ["rx", "ry", "rz", "x", "y", "z"],
  chest: ["rx", "ry", "sx", "sy", "sz"],
  head: ["rx", "ry", "rz", "x", "y", "z"],
  wingLeft: ["rx", "ry", "rz"],
  wingRight: ["rx", "ry", "rz"],
  elbowLeft: ["rx", "ry", "rz"],
  elbowRight: ["rx", "ry", "rz"],
  armLeft: ["rx", "ry", "rz"],
  armRight: ["rx", "ry", "rz"],
  forearmLeft: ["rx", "ry", "rz"],
  forearmRight: ["rx", "ry", "rz"],
  handLeft: ["rx", "ry", "rz"],
  handRight: ["rx", "ry", "rz"],
  tail: ["rx", "ry", "rz"],
  earLeft: ["rx", "ry", "rz"],
  earRight: ["rx", "ry", "rz"],
  halo: ["rx", "ry", "rz", "y"],
  footLeft: ["rx", "rz"],
  footRight: ["rx", "rz"],
};

export const MOTION_JOINTS = Object.keys(JOINT_FIELDS);
const identityJoint = () => ({
  rx: 0,
  ry: 0,
  rz: 0,
  x: 0,
  y: 0,
  z: 0,
  sx: 1,
  sy: 1,
  sz: 1,
});
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const makeSprings = (values) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, { value, velocity: 0 }]),
  );
const kindFor = (kind) => (PERSONALITIES[kind] ? kind : "lion");

/** Native 3D joint deltas, in radians and model-space units. State is immutable:
 * callers keep the returned value from each intent or simulation update. */
export function createMotion(kind = "lion", seed = 0.5) {
  kind = kindFor(kind);
  const offset = Object.keys(PERSONALITIES).indexOf(kind) * 0.193;
  const fraction = (clamp(finite(seed, 0.5), 0, 1) + offset) % 1;
  return {
    kind,
    phase: fraction * TAU,
    elapsed: 0,
    intent: { mood: "happy", reaction: 0, look: null, hovered: false },
    gesture: { startedAt: -1000, holdUntil: -1000 },
    interest: { x: 0, y: 0, until: 0, nextAt: 2.4 + fraction * 3.3, count: 0 },
    nextBlink: 1.35 + fraction * 2.6,
    blinkStartedAt: -1000,
    blink: 0,
    perkStartedAt: -1000,
    springs: {
      root: makeSprings({ rx: 0, ry: 0.14, rz: 0, y: 0 }),
      joints: Object.fromEntries(
        Object.entries(JOINT_FIELDS).map(([joint, keys]) => [
          joint,
          makeSprings(
            Object.fromEntries(
              keys.map((key) => [key, key.startsWith("s") ? 1 : 0]),
            ),
          ),
        ]),
      ),
      gaze: makeSprings({ x: 0, y: 0 }),
    },
  };
}

/** Retargeting never edits a spring's current position or velocity. Repeated
 * greetings extend the hold, so a second high-five cannot restart a pose. */
export function setMotionIntent(state, options = {}) {
  const previous = state.intent;
  const mood = options.mood ?? previous.mood;
  const reaction = finite(options.reaction, previous.reaction);
  const hovered =
    options.hovered === undefined ? previous.hovered : Boolean(options.hovered);
  const look =
    options.look === undefined
      ? previous.look
      : options.look === null
        ? null
        : {
            x: clamp(finite(options.look?.x), -1, 1),
            y: clamp(finite(options.look?.y), -1, 1),
          };
  const trigger =
    (reaction > 0 && reaction !== previous.reaction) ||
    (mood === "celebrate" && previous.mood !== "celebrate");
  let gesture = state.gesture;
  if (trigger) {
    const active = state.elapsed < gesture.holdUntil + 0.65;
    gesture = {
      startedAt: active ? gesture.startedAt : state.elapsed,
      holdUntil: Math.max(gesture.holdUntil, state.elapsed + 1.25),
    };
  }
  return {
    ...state,
    intent: { mood, reaction, look, hovered },
    gesture,
    perkStartedAt:
      hovered && !previous.hovered ? state.elapsed : state.perkStartedAt,
  };
}

function blinkAmount(age) {
  if (age < 0 || age >= 0.22) return 0;
  return age < 0.09 ? smooth(age / 0.09) : 1 - smooth((age - 0.09) / 0.13);
}

function gestureAt(state) {
  const age = state.elapsed - state.gesture.startedAt;
  const release = 1 - smooth((state.elapsed - state.gesture.holdUntil) / 0.65);
  return {
    anticipation:
      smooth(age / 0.1) * (1 - smooth((age - 0.1) / 0.15)) * release,
    lift: smooth((age - 0.13) / 0.34) * release,
  };
}

function targetsFor(state) {
  const t = state.elapsed;
  const p = state.phase;
  const personality = PERSONALITIES[state.kind];
  const human = state.kind === "human";
  const eagle = state.kind === "eagle";
  const breath = Math.sin(t * TAU * personality.breath + p);
  const weight = Math.sin(t * 0.43 + p * 0.7);
  const curiosity = Math.sin(t * 0.57 + p) * 0.035 * personality.curiosity;
  const perkAge = t - state.perkStartedAt;
  const perk = smooth(perkAge / 0.12) * (1 - smooth((perkAge - 0.2) / 0.38));
  const { anticipation, lift } = gestureAt(state);
  const wave = Math.sin(t * 7.8 + p);
  const wingBeat = Math.sin(t * 4.6 + p * 0.6);
  const interestWeight = 1 - smooth((t - state.interest.until) / 0.9);
  const focus = state.intent.look || {
    x: state.interest.x * interestWeight,
    y: state.interest.y * interestWeight,
  };
  const focusX = focus.x;
  const focusY = focus.y;
  const pose = {
    root: {
      rx: Math.sin(t * 0.35 + p) * 0.006,
      ry: 0.14 + Math.sin(t * 0.36 + p) * 0.08 + focusX * 0.042,
      rz: weight * 0.006,
      y: 0,
    },
    joints: Object.fromEntries(
      MOTION_JOINTS.map((joint) => [joint, identityJoint()]),
    ),
    gaze: {
      x: clamp(focusX + Math.sin(t * 0.47 + p) * 0.07, -1, 1),
      y: clamp(focusY + Math.cos(t * 0.39 + p) * 0.04 - lift * 0.05, -1, 1),
    },
  };
  const j = pose.joints;
  Object.assign(j.body, {
    rx: breath * 0.008 + anticipation * 0.045 - lift * 0.014,
    ry: focusX * 0.075 + weight * 0.018,
    rz: weight * 0.012 - lift * 0.012,
    x: weight * 0.012,
    y: -anticipation * 0.018 + lift * 0.004,
    z: breath * 0.003 + anticipation * 0.008,
  });
  Object.assign(j.chest, {
    rx: breath * 0.009 - lift * 0.018,
    ry: focusX * 0.028,
    sx: 1 + breath * 0.008,
    sy: 1 + breath * 0.012 - anticipation * 0.016,
    sz: 1 + breath * 0.016 + lift * 0.008,
  });
  Object.assign(j.head, {
    rx:
      -focusY * 0.12 +
      Math.sin(t * 0.51 + p) * 0.018 +
      anticipation * 0.07 -
      lift * 0.035,
    ry: focusX * 0.32 + curiosity + lift * Math.sin(t * 1.7 + p) * 0.025,
    rz: Math.sin(t * 0.32 + p * 1.2) * 0.018 - lift * 0.025,
    x: focusX * 0.009,
    y: breath * 0.003 - anticipation * 0.008,
    z: Math.sin(t * 0.28 + p) * 0.003 + lift * 0.004,
  });
  const flex = Math.sin(t * 0.92 + p) * 0.018 * personality.wing;
  const spread = lift * (eagle ? 0.7 : 0.4) + (eagle ? perk * 0.1 : 0);
  for (const [side, sign] of [
    ["Left", 1],
    ["Right", -1],
  ]) {
    Object.assign(j[`wing${side}`], {
      rx:
        Math.sin(t * 0.8 + p) * 0.018 +
        lift * wingBeat * (eagle ? 0.14 : 0.065),
      ry:
        sign *
        (Math.sin(t * 0.64 + p) * 0.045 +
          anticipation * 0.09 -
          lift * (eagle ? 0.34 : 0.21)),
      rz: -sign * (flex + spread + lift * wingBeat * (eagle ? 0.09 : 0.035)),
    });
    Object.assign(j[`elbow${side}`], {
      rx: lift * wingBeat * 0.07,
      ry: -sign * (lift * 0.17 + flex * 0.8),
      rz: -sign * lift * 0.08,
    });
    Object.assign(j[`arm${side}`], {
      rx: Math.sin(t * 0.62 + p + sign) * 0.022 - lift * (human ? 0.2 : 0.06),
      ry: sign * (weight * 0.025 + anticipation * 0.04),
      rz:
        -sign *
        (weight * 0.015 +
          lift *
            (human
              ? side === "Right"
                ? 1.8
                : 0.45
              : side === "Right"
                ? 0.95
                : 0.16)),
    });
    Object.assign(j[`forearm${side}`], {
      rx: lift * (human ? -0.4 : -0.24),
      ry: sign * lift * (human ? 0.28 : 0.06),
      rz: -sign * lift * (human ? 0.12 : 0.04),
    });
    Object.assign(j[`hand${side}`], {
      rx: lift * wave * (human ? 0.23 : 0.08),
      ry: sign * lift * (human ? 0.25 + wave * 0.18 : 0.08),
      rz: -sign * lift * wave * (human ? 0.17 : 0.095),
    });
    Object.assign(j[`ear${side}`], {
      rx: -perk * personality.perk + Math.sin(t * 0.43 + p + sign) * 0.015,
      ry: sign * (curiosity * 0.4 + perk * personality.perk * 0.35),
      rz: sign * (perk * personality.perk * 0.5 + lift * 0.035),
    });
    Object.assign(j[`foot${side}`], {
      rx: -j.body.rx * 0.15,
      rz: -j.body.rz * 0.25,
    });
  }
  Object.assign(j.tail, {
    rx: Math.sin(t * 0.77 + p) * 0.04,
    ry: Math.sin(t * (state.kind === "ox" ? 0.7 : 1.08) + p) * personality.tail,
    rz: Math.sin(t * 0.61 + p * 1.1) * 0.055 + lift * 0.035,
  });
  Object.assign(j.halo, {
    rx: Math.sin(t * 0.71 + p) * 0.018,
    ry: Math.sin(t * 0.37 + p) * 0.045 - focusX * 0.03,
    rz: Math.sin(t * 0.53 + p) * 0.035,
    y: Math.sin(t * 0.94 + p) * 0.012,
  });
  return pose;
}

function springGroup(previous, target, dt, settings) {
  return Object.fromEntries(
    Object.entries(previous).map(([key, spring]) => [
      key,
      advanceSpring(spring, target[key], dt, settings),
    ]),
  );
}

function step(state, dt) {
  const t = state.elapsed + dt;
  let next = { ...state, elapsed: t };
  if (t >= state.interest.nextAt) {
    const count = state.interest.count + 1;
    next.interest = {
      x: Math.sin(count * 2.31 + state.phase) * 0.55,
      y: Math.sin(count * 1.73 + state.phase) * 0.22,
      until: t + 1.4 + (1 + Math.sin(count + state.phase)) * 0.4,
      nextAt: t + 5 + (1 + Math.sin(count * 1.3 + state.phase)) * 1.1,
      count,
    };
    next.perkStartedAt = t;
  }
  if (t >= state.nextBlink) {
    next.blinkStartedAt = t;
    next.nextBlink = t + 3.1 + (1 + Math.sin(t * 1.4 + state.phase)) * 1.2;
  }
  next.blink = blinkAmount(t - next.blinkStartedAt);
  const targets = targetsFor(next);
  next.springs = {
    root: springGroup(state.springs.root, targets.root, dt, {
      frequency: 0.9,
      damping: 1,
    }),
    joints: Object.fromEntries(
      Object.entries(state.springs.joints).map(([joint, springs]) => {
        const settings =
          joint === "body" || joint === "chest"
            ? { frequency: 1.05, damping: 0.9 }
            : joint === "head"
              ? { frequency: 2.25, damping: 0.9 }
              : joint.startsWith("hand") || joint.startsWith("forearm")
                ? { frequency: 3.6, damping: 0.78 }
                : joint.startsWith("arm")
                  ? { frequency: 2.65, damping: 0.78 }
                  : { frequency: 2.4, damping: 0.86 };
        return [
          joint,
          springGroup(springs, targets.joints[joint], dt, settings),
        ];
      }),
    ),
    gaze: springGroup(state.springs.gaze, targets.gaze, dt, {
      frequency: 5.6,
      damping: 0.94,
    }),
  };
  return next;
}

export function advanceMotion(state, seconds) {
  const dt = clamp(finite(seconds), 0, MAX_MOTION_DELTA);
  if (!dt) return state;
  const count = Math.ceil(dt / SUBSTEP);
  let next = state;
  for (let index = 0; index < count; index++) next = step(next, dt / count);
  return next;
}

const valuesFor = (springs) =>
  Object.fromEntries(
    Object.entries(springs).map(([key, spring]) => [key, spring.value]),
  );

export function motionPose(state) {
  return {
    root: valuesFor(state.springs.root),
    joints: Object.fromEntries(
      Object.entries(state.springs.joints).map(([joint, springs]) => [
        joint,
        { ...identityJoint(), ...valuesFor(springs) },
      ]),
    ),
    gaze: {
      x: clamp(state.springs.gaze.x.value, -1, 1),
      y: clamp(state.springs.gaze.y.value, -1, 1),
    },
    blink: clamp(state.blink, 0, 1),
  };
}

/** Reduced-motion presentation is an explicit still, without advancing time. */
export function staticMotionPose({ kind = "lion", mood = "happy" } = {}) {
  const pose = motionPose(createMotion(kind));
  if (mood !== "celebrate") return pose;
  const human = kind === "human";
  const eagle = kind === "eagle";
  pose.joints.head.rx = -0.035;
  pose.joints.head.rz = -0.02;
  pose.joints.wingLeft.ry = eagle ? -0.22 : -0.13;
  pose.joints.wingRight.ry = -pose.joints.wingLeft.ry;
  pose.joints.wingLeft.rz = eagle ? -0.5 : -0.3;
  pose.joints.wingRight.rz = -pose.joints.wingLeft.rz;
  pose.joints.armLeft.rz = human ? 0.35 : 0.18;
  pose.joints.armRight.rz = human ? 1.5 : 0.18;
  pose.joints.forearmRight.rx = human ? -0.3 : -0.04;
  pose.joints.handRight.ry = human ? -0.3 : -0.06;
  return pose;
}
