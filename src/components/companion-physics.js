const TAU = Math.PI * 2;
export const MAX_FRAME_DELTA = 1 / 15;
const MAX_STEP = 1 / 120;

const PERSONALITIES = {
  lion: { breath: 0.25, curiosity: 1.15, wing: 1.7, wave: 1.0 },
  ox: { breath: 0.2, curiosity: 0.72, wing: 1.25, wave: 0.72 },
  eagle: { breath: 0.29, curiosity: 1.3, wing: 2.7, wave: 0.8 },
  human: { breath: 0.23, curiosity: 1.05, wing: 1.55, wave: 1.1 },
};

const JOINT_PROPERTIES = {
  body: { x: 0, y: 0, r: 0, sx: 1, sy: 1 },
  head: { x: 0, y: 0, r: 0 },
  wingLeft: { r: 0 },
  wingRight: { r: 0 },
  armLeft: { r: 0 },
  armRight: { r: 0 },
  halo: { y: 0, r: 0 },
};

export const JOINT_NAMES = Object.keys(JOINT_PROPERTIES);

const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function frameDelta(seconds) {
  return clamp(finite(seconds), 0, MAX_FRAME_DELTA);
}

/** Exact damped-spring integration for a fixed target. Retargeting changes no
 * position or velocity, including when a greeting interrupts another one. */
export function advanceSpring(
  spring,
  target,
  seconds,
  { frequency = 2.6, damping = 0.78 } = {},
) {
  const dt = frameDelta(seconds);
  const goal = finite(target);
  const value = finite(spring?.value, goal);
  const velocity = finite(spring?.velocity);
  if (!dt) return { value, velocity };

  const omega = TAU * clamp(finite(frequency, 2.6), 0.05, 20);
  const ratio = clamp(finite(damping, 0.78), 0.05, 4);
  const offset = value - goal;
  let nextOffset;
  let nextVelocity;

  if (Math.abs(ratio - 1) < 0.0001) {
    const decay = Math.exp(-omega * dt);
    const coefficient = velocity + omega * offset;
    nextOffset = (offset + coefficient * dt) * decay;
    nextVelocity = (velocity - omega * coefficient * dt) * decay;
  } else if (ratio < 1) {
    const damped = omega * Math.sqrt(1 - ratio * ratio);
    const decay = Math.exp(-ratio * omega * dt);
    const sine = Math.sin(damped * dt);
    const cosine = Math.cos(damped * dt);
    nextOffset =
      decay *
      (offset * cosine + ((velocity + ratio * omega * offset) / damped) * sine);
    nextVelocity =
      decay *
      (velocity * cosine -
        ((ratio * omega * velocity + omega * omega * offset) / damped) * sine);
  } else {
    const root = Math.sqrt(ratio * ratio - 1);
    const a = -omega * (ratio - root);
    const b = -omega * (ratio + root);
    const coefficient = (velocity - b * offset) / (a - b);
    const rest = offset - coefficient;
    nextOffset = coefficient * Math.exp(a * dt) + rest * Math.exp(b * dt);
    nextVelocity =
      a * coefficient * Math.exp(a * dt) + b * rest * Math.exp(b * dt);
  }

  return {
    value: finite(goal + nextOffset, goal),
    velocity: finite(nextVelocity),
  };
}

export function createMotionClock() {
  return { last: null, elapsed: 0, delta: 0 };
}

/** A suspended clock forgets its wall-clock baseline, retaining its phase. */
export function advanceMotionClock(clock, timestamp, active = true) {
  if (!active || !Number.isFinite(timestamp)) {
    return { ...clock, last: null, delta: 0 };
  }
  const delta =
    clock.last === null ? 0 : frameDelta((timestamp - clock.last) / 1000);
  return { last: timestamp, elapsed: clock.elapsed + delta, delta };
}

export function createCompanionState({
  kind = "lion",
  portrait = false,
  seed = 0.5,
} = {}) {
  const phase = clamp(finite(seed, 0.5), 0, 1);
  return {
    kind: PERSONALITIES[kind] ? kind : "lion",
    portrait: Boolean(portrait),
    phase: phase * TAU,
    elapsed: 0,
    intent: { mood: "happy", reaction: 0, look: { x: 0, y: 0 } },
    greetingUntil: 0,
    greeting: { value: 0, velocity: 0 },
    gesture: { value: 0, velocity: 0 },
    gestureUntil: 0,
    nextGesture: 3.6 + phase * 4.1,
    nextBlink: 1.2 + phase * 3.4,
    blinkStart: -1,
    blink: 0,
    joints: Object.fromEntries(
      Object.entries(JOINT_PROPERTIES).map(([joint, properties]) => [
        joint,
        Object.fromEntries(
          Object.entries(properties).map(([key, value]) => [
            key,
            { value, velocity: 0 },
          ]),
        ),
      ]),
    ),
  };
}

export function retargetCompanion(state, options = {}) {
  const mood = options.mood ?? state.intent.mood;
  const reaction = finite(options.reaction, state.intent.reaction);
  const greeting =
    reaction !== state.intent.reaction ||
    (mood === "celebrate" && state.intent.mood !== "celebrate");
  return {
    ...state,
    kind: PERSONALITIES[options.kind] ? options.kind : state.kind,
    portrait: options.portrait ?? state.portrait,
    greetingUntil: greeting
      ? Math.max(state.greetingUntil, state.elapsed + 1.45)
      : state.greetingUntil,
    intent: {
      mood,
      reaction,
      look: {
        x: clamp(finite(options.look?.x), -1, 1),
        y: clamp(finite(options.look?.y), -1, 1),
      },
    },
  };
}

function blinkAt(time) {
  if (time < 0 || time > 0.23) return 0;
  if (time < 0.075) return smooth(time / 0.075);
  if (time < 0.11) return 1;
  return 1 - smooth((time - 0.11) / 0.12);
}

function targetsFor(state) {
  const profile = PERSONALITIES[state.kind];
  const t = state.elapsed;
  const phase = state.phase;
  const travel = state.portrait ? 0.36 : 1;
  const turn = state.portrait ? 0.62 : 1;
  const breath = Math.sin(t * TAU * profile.breath + phase);
  const lean = Math.sin(t * 0.46 + phase * 0.7);
  const curiosity =
    Math.sin(t * 0.63 + phase * 1.3) * 1.1 + Math.sin(t * 0.27 + phase) * 0.6;
  const look = state.intent.look;
  const greet = state.greeting.value;
  const gesture = state.gesture.value;
  const wave = Math.sin(t * 7.1 + phase);
  const wing = Math.sin(t * 1.32 + phase) * profile.wing;
  const headTurn =
    (curiosity * profile.curiosity + look.x * 2.15 - gesture * 1.8) * turn;

  return {
    body: {
      x: (lean * 0.28 + look.x * 0.25) * travel,
      y: (-breath * 0.55 - greet * 0.3) * travel,
      r: (lean * 0.5 + look.x * 0.25 - gesture * 0.3) * turn,
      sx: 1 + breath * 0.003 + greet * 0.006,
      sy: 1 + breath * 0.007 - greet * 0.003,
    },
    head: {
      x: (Math.sin(t * 0.4 + phase) * 0.25 + look.x * 1.4) * travel,
      y: (breath * 0.25 + look.y * 1.15 + gesture * 0.4) * travel,
      r: headTurn + greet * Math.sin(t * 3.7 + phase) * 0.9 * turn,
    },
    wingLeft: {
      r: (wing + greet * (6 + wave * 3.5) + gesture * 2.1) * turn,
    },
    wingRight: {
      r: (-wing - greet * (6 + wave * 3.5) - gesture * 1.5) * turn,
    },
    armLeft: {
      r:
        (lean * 1.2 +
          greet *
            (state.kind === "human" ? 24 + wave * 7 : 9 + wave * 4) *
            profile.wave) *
        turn,
    },
    armRight: {
      r:
        (-lean * 1.5 -
          greet *
            (state.kind === "human" ? 38 + wave * 9 : 12 + wave * 5) *
            profile.wave) *
        turn,
    },
    halo: {
      y: Math.sin(t * 1.08 + phase) * 0.5 * travel,
      r: (Math.sin(t * 0.7 + phase) * 0.9 - headTurn * 0.2) * turn,
    },
  };
}

function substep(state, seconds) {
  const elapsed = state.elapsed + seconds;
  let next = { ...state, elapsed };
  if (elapsed >= next.nextGesture) {
    next.gestureUntil = elapsed + 0.55;
    next.nextGesture =
      elapsed + 5.3 + (1 + Math.sin(elapsed + state.phase)) * 2;
  }
  if (elapsed >= next.nextBlink) {
    next.blinkStart = elapsed;
    next.nextBlink =
      elapsed + 3.9 + (1 + Math.sin(elapsed * 1.7 + state.phase)) * 1.15;
  }
  next.greeting = advanceSpring(
    state.greeting,
    elapsed < next.greetingUntil ? 1 : 0,
    seconds,
    { frequency: 2.7, damping: 0.86 },
  );
  next.gesture = advanceSpring(
    state.gesture,
    elapsed < next.gestureUntil ? 1 : 0,
    seconds,
    { frequency: 1.9, damping: 0.9 },
  );
  next.blink = blinkAt(elapsed - next.blinkStart);
  const targets = targetsFor(next);
  next.joints = Object.fromEntries(
    Object.entries(state.joints).map(([joint, properties]) => [
      joint,
      Object.fromEntries(
        Object.entries(properties).map(([property, spring]) => [
          property,
          advanceSpring(spring, targets[joint][property], seconds, {
            frequency: joint === "head" ? 2.15 : 2.7,
            damping: joint.startsWith("arm") ? 0.7 : 0.86,
          }),
        ]),
      ),
    ]),
  );
  return next;
}

export function advanceCompanion(state, seconds) {
  const dt = frameDelta(seconds);
  if (!dt) return state;
  const count = Math.ceil(dt / MAX_STEP);
  let next = state;
  for (let i = 0; i < count; i++) next = substep(next, dt / count);
  return next;
}

export function companionPose(state) {
  const joints = Object.fromEntries(
    Object.entries(state.joints).map(([joint, properties]) => [
      joint,
      Object.fromEntries(
        Object.entries(properties).map(([key, spring]) => [key, spring.value]),
      ),
    ]),
  );
  const lift = Math.min(2.5, Math.abs(joints.body.y));
  return {
    joints,
    blink: clamp(state.blink, 0, 1),
    shadow: { scale: 1 - lift * 0.018, opacity: 0.15 - lift * 0.012 },
  };
}

export function staticCompanionPose({ mood = "happy", portrait = false } = {}) {
  const greeting = mood === "celebrate";
  const amount = portrait ? 0.6 : 1;
  return {
    joints: {
      body: { x: 0, y: 0, r: 0, sx: 1, sy: 1 },
      head: { x: 0, y: 0, r: greeting ? -1.3 * amount : 0 },
      wingLeft: { r: greeting ? 5 * amount : 0 },
      wingRight: { r: greeting ? -5 * amount : 0 },
      armLeft: { r: greeting ? 7 * amount : 0 },
      armRight: { r: greeting ? -11 * amount : 0 },
      halo: { y: 0, r: 0 },
    },
    blink: 0,
    shadow: { scale: 1, opacity: 0.15 },
  };
}
