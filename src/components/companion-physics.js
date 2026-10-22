const TAU = Math.PI * 2;
export const MAX_FRAME_DELTA = 1 / 15;
const MAX_STEP = 1 / 120;

const PERSONALITIES = {
  lion: {
    breath: 0.25,
    curiosity: 1.15,
    wing: 1.7,
    wave: 1.0,
    energy: 1.0,
    beat: 4.7,
  },
  ox: {
    breath: 0.2,
    curiosity: 0.72,
    wing: 1.25,
    wave: 0.72,
    energy: 0.72,
    beat: 3.8,
  },
  eagle: {
    breath: 0.29,
    curiosity: 1.3,
    wing: 2.7,
    wave: 0.8,
    energy: 1.1,
    beat: 5.1,
  },
  human: {
    breath: 0.23,
    curiosity: 1.05,
    wing: 1.55,
    wave: 1.1,
    energy: 0.95,
    beat: 4.4,
  },
};

const JOINT_PROPERTIES = {
  body: { x: 0, y: 0, r: 0, sx: 1, sy: 1 },
  head: { x: 0, y: 0, r: 0 },
  wingLeft: { r: 0 },
  wingRight: { r: 0 },
  armLeft: { x: 0, y: 0, r: 0 },
  armRight: { x: 0, y: 0, r: 0 },
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

const ACTION_DURATION = { hello: 2.4, dance: 3.8, celebrate: 3.0, cuddle: 3.1 };
const BEHAVIORS = ["glance", "stretch", "shuffle", "sway"];
const spring = () => ({ value: 0, velocity: 0 });

// These are material/skin controls, not another set of rotating cutouts. The
// neutral texture and grounded stance are preserved at zero deformation.
export const NEUTRAL_DEFORMATION = Object.freeze({
  turn: 0,
  headTurn: 0,
  headPitch: 0,
  spine: 0,
  squash: 0,
  smile: 0,
  brow: 0,
  mane: 0,
  wingFoldLeft: 0,
  wingFoldRight: 0,
  wingCurlLeft: 0,
  wingCurlRight: 0,
  armBendLeft: 0,
  armBendRight: 0,
  plantLeft: 1,
  plantRight: 1,
  ground: 1,
});

// Authored poses use a Hermite spline. Adjacent beats share a tangent, so a
// performer can anticipate, hold, overshoot and recover without stop/start
// easing at every key. The final skin/joint springs retain momentum on retarget.
function poseCurve(time, keys, loop = false) {
  const end = keys.at(-1)[0];
  const t = loop ? ((time % end) + end) % end : clamp(time, 0, end);
  let index = 0;
  while (index < keys.length - 2 && t > keys[index + 1][0]) index++;
  const a = keys[index];
  const b = keys[index + 1];
  const previous =
    index > 0
      ? keys[index - 1]
      : loop
        ? [keys.at(-2)[0] - end, keys.at(-2)[1]]
        : a;
  const after =
    index + 2 < keys.length
      ? keys[index + 2]
      : loop
        ? [keys[1][0] + end, keys[1][1]]
        : b;
  const width = b[0] - a[0];
  const u = clamp((t - a[0]) / width, 0, 1);
  const m0 =
    index === 0 && !loop ? 0 : (b[1] - previous[1]) / (b[0] - previous[0]);
  const m1 =
    index + 1 === keys.length - 1 && !loop
      ? 0
      : (after[1] - a[1]) / (after[0] - a[0]);
  return (
    (2 * u * u * u - 3 * u * u + 1) * a[1] +
    (u * u * u - 2 * u * u + u) * width * m0 +
    (-2 * u * u * u + 3 * u * u) * b[1] +
    (u * u * u - u * u) * width * m1
  );
}

const HELLO_LEAN = [
  [0, 0],
  [0.18, -0.22],
  [0.44, 0.86],
  [0.9, 0.65],
  [1.65, 0.52],
  [2.1, 0.1],
  [2.4, 0],
];
const HELLO_RAISE = [
  [0, 0],
  [0.2, 0.05],
  [0.48, 1],
  [1.55, 0.97],
  [1.96, 0.45],
  [2.4, 0],
];
const HELLO_NOD = [
  [0, 0],
  [0.25, -0.3],
  [0.51, 0.7],
  [0.78, -0.12],
  [1.15, 0.26],
  [1.8, 0.07],
  [2.4, 0],
];
const HUG_OPEN = [
  [0, 0],
  [0.25, -0.12],
  [0.65, 0.88],
  [1.2, 1],
  [1.85, 0.94],
  [2.5, 0.24],
  [3.1, 0],
];
const HUG_NESTLE = [
  [0, 0],
  [0.35, 0.12],
  [0.9, 0.95],
  [1.5, 0.8],
  [2.0, 1],
  [2.65, 0.14],
  [3.1, 0],
];
const WEIGHT_TRANSFER = [
  [0, -0.7],
  [0.14, -1],
  [0.31, -0.54],
  [0.48, 0.65],
  [0.64, 1],
  [0.81, 0.42],
  [1, -0.7],
];
const HEAD_COUNTER = [
  [0, 0.18],
  [0.2, 0.65],
  [0.43, -0.1],
  [0.62, -0.66],
  [0.85, -0.13],
  [1, 0.18],
];
const STEP_LIFT = [
  [0, 0],
  [0.12, 0],
  [0.25, 0.92],
  [0.39, 0.18],
  [0.5, 0],
  [1, 0],
];
const STEP_COMPRESS = [
  [0, 0.05],
  [0.13, 0.56],
  [0.28, -0.15],
  [0.5, 0.05],
  [0.63, 0.52],
  [0.78, -0.11],
  [1, 0.05],
];
const IDLE_WEIGHT = [
  [0, -0.22],
  [0.19, -0.34],
  [0.44, 0.19],
  [0.71, 0.31],
  [0.9, -0.03],
  [1, -0.22],
];
const GLANCE_ARC = [
  [0, 0],
  [0.16, -0.18],
  [0.34, 0.92],
  [0.61, 0.84],
  [0.8, 0.26],
  [1, 0],
];
const STRETCH_ARC = [
  [0, 0],
  [0.16, -0.08],
  [0.42, 0.94],
  [0.62, 1],
  [0.83, 0.2],
  [1, 0],
];
const SHUFFLE_ARC = [
  [0, 0],
  [0.18, -0.38],
  [0.37, 0.88],
  [0.64, 0.5],
  [0.85, -0.12],
  [1, 0],
];

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
    intent: {
      mood: "happy",
      action: "hello",
      dancing: false,
      reaction: 0,
      look: { x: 0, y: 0 },
    },
    greetingUntil: 0,
    greeting: spring(),
    actions: Object.fromEntries(
      Object.keys(ACTION_DURATION).map((name) => [
        name,
        { ...spring(), started: 0, until: 0 },
      ]),
    ),
    attention: { x: spring(), y: spring() },
    gesture: spring(),
    gestureUntil: 0,
    nextGesture: 2.1 + phase * 3.1,
    behavior: {
      name: "rest",
      started: 0,
      until: 0,
      cycle: Math.floor(phase * 4),
    },
    ambient: Object.fromEntries(BEHAVIORS.map((name) => [name, spring()])),
    nextBlink: 1.2 + phase * 3.4,
    blinkStart: -1,
    blink: 0,
    deform: Object.fromEntries(
      Object.entries(NEUTRAL_DEFORMATION).map(([name, value]) => [
        name,
        { value, velocity: 0 },
      ]),
    ),
    performance: "rest",
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
  const dancing = Boolean(options.dancing ?? state.intent.dancing);
  const entersCelebration =
    mood === "celebrate" && state.intent.mood !== "celebrate";
  const requestedAction = Object.hasOwn(ACTION_DURATION, options.action)
    ? options.action
    : entersCelebration
      ? "celebrate"
      : state.intent.action;
  const trigger =
    reaction !== state.intent.reaction ||
    entersCelebration ||
    requestedAction !== state.intent.action;
  let actions = state.actions;
  if (trigger) {
    actions = Object.fromEntries(
      Object.entries(state.actions).map(([name, channel]) => [
        name,
        {
          ...channel,
          // Repeated taps extend the existing performance, preserving its rhythm.
          started:
            name === requestedAction && channel.until <= state.elapsed
              ? state.elapsed
              : channel.started,
          until:
            name === requestedAction
              ? Math.max(channel.until, state.elapsed + ACTION_DURATION[name])
              : Math.min(channel.until, state.elapsed),
        },
      ]),
    );
  }
  if (state.intent.dancing && !dancing) {
    actions = { ...actions, dance: { ...actions.dance, until: state.elapsed } };
  }
  const look = options.look ?? state.intent.look;
  return {
    ...state,
    kind: PERSONALITIES[options.kind] ? options.kind : state.kind,
    portrait: options.portrait ?? state.portrait,
    greetingUntil: trigger
      ? Math.max(state.greetingUntil, state.elapsed + 2.4)
      : state.greetingUntil,
    actions,
    intent: {
      mood,
      action: requestedAction,
      dancing,
      reaction,
      look: {
        x: clamp(finite(look?.x), -1, 1),
        y: clamp(finite(look?.y), -1, 1),
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

/** One deliberate hop: anticipation, airborne arc, and a soft landing. The
 * enclosing springs connect every phase, even when another action interrupts. */
function leapAt(time) {
  if (time < 0 || time > 0.94) return { lift: 0, squash: 0, wing: 0 };
  if (time < 0.2)
    return { lift: 0, squash: Math.sin((time / 0.2) * Math.PI), wing: 0 };
  if (time < 0.7) {
    const flight = (time - 0.2) / 0.5;
    return {
      lift: Math.sin(flight * Math.PI),
      squash: -Math.sin(flight * Math.PI) * 0.35,
      wing: Math.sin(flight * Math.PI),
    };
  }
  return {
    lift: 0,
    squash: Math.sin(((time - 0.7) / 0.24) * Math.PI) * 0.7,
    wing: 0,
  };
}

function targetsFor(state) {
  const profile = PERSONALITIES[state.kind];
  const t = state.elapsed;
  const phase = state.phase;
  const travel = state.portrait ? 0.28 : 1;
  const turn = state.portrait ? 0.48 : 1;
  const skinTravel = state.portrait ? 0.32 : 1;
  const human = state.kind === "human";
  const look = { x: state.attention.x.value, y: state.attention.y.value };
  const greet = state.actions.hello.value;
  const dance = state.actions.dance.value;
  const joy = state.actions.celebrate.value;
  const hug = state.actions.cuddle.value;

  // A quick inhale, held chest, slower exhale, then a little resting space.
  // This does not swing the entire body like a pendulum.
  const breathPhase = (t * profile.breath + phase / TAU) % 1;
  const breath =
    (breathPhase < 0.37
      ? smooth(breathPhase / 0.37)
      : breathPhase < 0.88
        ? 1 - smooth((breathPhase - 0.37) / 0.51)
        : 0) - 0.38;
  const idlePhase = t / (5.7 + (1.2 - profile.energy) * 1.3) + phase / TAU;
  const weight = poseCurve(idlePhase, IDLE_WEIGHT, true);
  const local = t - state.behavior.started;
  const behaviorDuration = Math.max(
    0.1,
    state.behavior.until - state.behavior.started,
  );
  const behaviorTime = clamp(local / behaviorDuration, 0, 1);
  const direction = state.behavior.cycle % 2 ? -1 : 1;
  const glance =
    state.ambient.glance.value *
    poseCurve(behaviorTime, GLANCE_ARC) *
    direction;
  const stretch =
    state.ambient.stretch.value * poseCurve(behaviorTime, STRETCH_ARC);
  const shuffle =
    state.ambient.shuffle.value *
    poseCurve(behaviorTime, SHUFFLE_ARC) *
    direction;
  const sway =
    state.ambient.sway.value * poseCurve(behaviorTime, GLANCE_ARC) * direction;

  const helloAge = t - state.actions.hello.started;
  const helloLean = greet * poseCurve(helloAge, HELLO_LEAN, true);
  const helloRaise = greet * poseCurve(helloAge, HELLO_RAISE, true);
  const helloNod = greet * poseCurve(helloAge, HELLO_NOD, true);
  const helloWrist = Math.sin((helloAge - 0.4) * 9.2) * helloRaise;
  const hugAge = t - state.actions.cuddle.started;
  const hugWrap = hug * poseCurve(hugAge, HUG_OPEN, true);
  const nestle = hug * poseCurve(hugAge, HUG_NESTLE, true);

  // The hips commit to a planted side, the shoulders cross through, then the
  // head catches up. Each layer has a different authored beat and a spring.
  const dancePhase = (t * profile.beat) / TAU + phase / TAU;
  const groove = poseCurve(dancePhase, WEIGHT_TRANSFER, true);
  const shoulder = poseCurve(dancePhase - 0.075, WEIGHT_TRANSFER, true);
  const headFollow = poseCurve(dancePhase - 0.12, HEAD_COUNTER, true);
  const leftStep = clamp(poseCurve(dancePhase, STEP_LIFT, true), 0, 1);
  const rightStep = clamp(poseCurve(dancePhase + 0.5, STEP_LIFT, true), 0, 1);
  const compress = poseCurve(dancePhase, STEP_COMPRESS, true);
  const energy = profile.energy;
  const weightShift =
    weight + shuffle * 0.68 + sway * 0.45 + dance * groove * energy;
  const torsoLean =
    look.x * 0.1 + helloLean * 0.22 - hugWrap * 0.22 + stretch * 0.1;
  const curiosity =
    Math.sin(t * 0.31 + phase) * 0.65 + Math.sin(t * 0.73 + phase * 0.8) * 0.22;

  // Celebration has two different jumps, not a metronomic bouncing loop.
  const celebrationAge =
    (((t - state.actions.celebrate.started) % ACTION_DURATION.celebrate) +
      ACTION_DURATION.celebrate) %
    ACTION_DURATION.celebrate;
  const leap =
    celebrationAge < 1.08
      ? leapAt(celebrationAge)
      : celebrationAge < 2.34
        ? (() => {
            const second = leapAt((celebrationAge - 1.26) * 1.12);
            return {
              lift: second.lift * 0.64,
              squash: second.squash * 0.72,
              wing: second.wing * 0.76,
            };
          })()
        : { lift: 0, squash: 0, wing: 0 };
  const lift = leap.lift * joy * energy;
  const squash = leap.squash * joy;
  const flap = leap.wing * joy;
  const landing =
    joy *
    clamp((celebrationAge - 0.73) / 0.19, 0, 1) *
    (1 - smooth((celebrationAge - 0.97) / 0.3));
  const wingBreath = Math.sin(t * 1.12 + phase) * profile.wing * 0.6;
  const featherLag =
    Math.sin(t * 2.1 + phase * 0.8) * (state.kind === "eagle" ? 0.65 : 0.22);
  const freeHand = Math.sin(t * 1.7 + phase) * (human ? 0.65 : 0.24);
  const armLimit = (angle) => clamp(angle, human ? -55 : -30, human ? 55 : 30);
  const bodyRotation = weightShift * 3.1 + torsoLean * 4.0 - landing * 0.7;
  const headRotation =
    curiosity * profile.curiosity +
    look.x * 3.3 +
    glance * 3.1 +
    helloNod * 2.7 -
    nestle * 3.7 -
    stretch * 1.7 +
    dance * headFollow * 3.3 -
    bodyRotation * 0.26;

  const joints = {
    body: {
      x: (weightShift * 4.6 + torsoLean * 2.2 + look.x * 0.4) * travel,
      y:
        (-breath * 0.6 -
          lift * (state.kind === "eagle" ? 10 : 7) +
          squash * 1.1 -
          stretch * 0.9 +
          dance * compress * 0.9 +
          hugWrap * 0.45) *
        travel,
      r: bodyRotation * turn,
      sx:
        1 +
        (breath * 0.003 + squash * 0.022 - lift * 0.006 + hugWrap * 0.008) *
          travel,
      sy:
        1 +
        (breath * 0.007 - squash * 0.028 + lift * 0.012 - hugWrap * 0.008) *
          travel,
    },
    head: {
      x:
        (look.x * 1.65 +
          glance * 0.65 +
          helloLean * 0.65 +
          nestle * 0.35 -
          dance * shoulder * 0.48) *
        travel,
      y:
        (breath * 0.18 +
          look.y * 1.45 +
          helloNod * 0.5 +
          nestle * 0.8 +
          stretch * 0.4 +
          dance * compress * 0.28) *
        travel,
      r: headRotation * turn,
    },
    wingLeft: {
      r:
        (wingBreath +
          featherLag +
          helloRaise * 1.7 +
          stretch * 8.8 +
          dance * (3 + shoulder * 3.4) * energy +
          flap * 16 +
          hugWrap * 8.5) *
        turn,
    },
    wingRight: {
      r:
        (-wingBreath * 0.82 -
          featherLag * 0.6 -
          helloRaise * 5.2 -
          stretch * 7.3 -
          dance * (3 - groove * 4.2) * energy -
          flap * 18 -
          hugWrap * 10.8) *
        turn,
    },
    armLeft: {
      x: (shuffle * 0.2 - dance * leftStep * 0.25) * travel,
      y:
        (-Math.max(0, shuffle) * 1.1 - dance * leftStep * (human ? 0.4 : 1.6)) *
        travel,
      r:
        armLimit(
          weight * 0.8 +
            freeHand +
            helloLean * (human ? 4 : 1.3) +
            dance * (human ? 8 + shoulder * 12 : shoulder * 5) * energy +
            hugWrap * (human ? 17 : 6) +
            joy * (human ? 9 + flap * 6 : flap * 3) +
            stretch * 2.4,
        ) * turn,
    },
    armRight: {
      x: (shuffle * 0.2 + helloRaise * 0.25 + dance * rightStep * 0.2) * travel,
      y:
        (-Math.max(0, -shuffle) * 1.1 -
          dance * rightStep * (human ? 0.4 : 1.6)) *
        travel,
      r:
        armLimit(
          -weight * 0.6 -
            freeHand * 0.7 -
            helloRaise * (human ? 35 : 12) * profile.wave -
            helloWrist * (human ? 7 : 2.5) -
            dance * (human ? 9 - groove * 13 : -groove * 5) * energy -
            hugWrap * (human ? 22 : 8) -
            joy * (human ? 15 + flap * 7 : flap * 3) -
            stretch * 1.2,
        ) * turn,
    },
    halo: {
      y:
        (Math.sin(t * 0.91 + phase) * 0.35 - lift * 0.9 - nestle * 0.2) *
        travel,
      r:
        (Math.sin(t * 0.57 + phase) * 0.65 -
          headRotation * 0.18 +
          dance * shoulder * 0.8) *
        turn,
    },
  };

  // Curvature/material channels are independently spring-driven, so the chest
  // leads a turn while cheeks, mane, feathers and bent limbs follow through.
  const deform = {
    turn:
      clamp(weightShift * 0.24 + torsoLean * 0.35 + look.x * 0.12, -1, 1) *
      skinTravel,
    headTurn:
      clamp(
        look.x * 0.52 +
          glance * 0.38 +
          helloLean * 0.18 -
          nestle * 0.25 -
          dance * headFollow * 0.28,
        -1,
        1,
      ) * skinTravel,
    headPitch:
      clamp(
        look.y * 0.32 +
          helloNod * 0.19 +
          nestle * 0.42 -
          stretch * 0.22 +
          landing * 0.22,
        -1,
        1,
      ) * skinTravel,
    spine:
      clamp(
        weightShift * 0.46 + torsoLean * 0.72 + breath * 0.1 - nestle * 0.15,
        -1,
        1,
      ) * skinTravel,
    squash:
      clamp(
        squash * 0.7 -
          lift * 0.2 +
          compress * dance * 0.11 +
          breath * 0.1 +
          hugWrap * 0.13,
        -1,
        1,
      ) * skinTravel,
    smile:
      clamp(greet * 0.18 + dance * 0.24 + hugWrap * 0.62 + joy * 0.5, 0, 1) *
      skinTravel,
    brow:
      clamp(
        glance * 0.22 - helloNod * 0.12 - nestle * 0.3 + joy * 0.24,
        -1,
        1,
      ) * skinTravel,
    mane:
      clamp(
        -state.joints.head.r.velocity * 0.007 -
          state.joints.body.x.velocity * 0.006 +
          landing * 0.32,
        -1,
        1,
      ) * skinTravel,
    wingFoldLeft:
      clamp(
        hugWrap * 0.74 +
          stretch * -0.24 +
          dance * leftStep * 0.22 -
          flap * 0.34,
        -1,
        1,
      ) * skinTravel,
    wingFoldRight:
      clamp(
        hugWrap * 0.83 +
          stretch * -0.29 +
          dance * rightStep * 0.25 -
          flap * 0.4 +
          helloRaise * 0.12,
        -1,
        1,
      ) * skinTravel,
    wingCurlLeft:
      clamp(
        -state.joints.wingLeft.r.velocity * 0.01 +
          stretch * 0.17 +
          hugWrap * 0.52 +
          dance * shoulder * 0.2,
        -1,
        1,
      ) * skinTravel,
    wingCurlRight:
      clamp(
        state.joints.wingRight.r.velocity * 0.01 +
          stretch * 0.2 +
          hugWrap * 0.58 -
          dance * groove * 0.21,
        -1,
        1,
      ) * skinTravel,
    armBendLeft:
      clamp(
        helloLean * 0.1 +
          hugWrap * 0.5 +
          dance * (0.18 + leftStep * 0.35) +
          stretch * 0.18,
        -1,
        1,
      ) * skinTravel,
    armBendRight:
      clamp(
        helloRaise * 0.65 +
          helloWrist * 0.12 +
          hugWrap * 0.61 +
          dance * (0.18 + rightStep * 0.35),
        -1,
        1,
      ) * skinTravel,
    plantLeft:
      1 -
      clamp(
        dance * leftStep * 0.9 + Math.max(0, shuffle) * 0.5 + joy * lift,
        0,
        1,
      ) *
        skinTravel,
    plantRight:
      1 -
      clamp(
        dance * rightStep * 0.9 +
          Math.max(0, -shuffle) * 0.5 +
          helloRaise * 0.88 +
          joy * lift,
        0,
        1,
      ) *
        skinTravel,
    ground: 1 - smooth(lift / 0.36),
  };
  const action =
    hug > 0.05
      ? "cuddle"
      : joy > 0.05
        ? "celebrate"
        : greet > 0.05
          ? "hello"
          : dance > 0.05
            ? "dance"
            : state.behavior.name;
  const age =
    action === "hello"
      ? helloAge % 2.4
      : action === "cuddle"
        ? hugAge % 3.1
        : celebrationAge;
  const beat =
    action === "hello"
      ? age < 0.26
        ? "anticipate"
        : age < 0.6
          ? "reach"
          : age < 1.8
            ? "wave"
            : "recover"
      : action === "cuddle"
        ? age < 0.4
          ? "open"
          : age < 2.0
            ? "nestle"
            : "release"
        : action === "celebrate"
          ? age < 0.2
            ? "anticipate"
            : age < 0.7
              ? "airborne"
              : age < 1.1
                ? "land"
                : "follow-through"
          : action === "dance"
            ? "weight-transfer"
            : "listen";
  return { joints, deform, performance: `${action}:${beat}` };
}

function substep(state, seconds) {
  const elapsed = state.elapsed + seconds;
  let next = { ...state, elapsed };
  if (elapsed >= next.nextGesture) {
    const cycle = state.behavior.cycle + 1;
    const name = BEHAVIORS[cycle % BEHAVIORS.length];
    const started = next.nextGesture;
    const duration = 2.6 + (1 + Math.sin(cycle * 2.3 + state.phase)) * 0.7;
    next.behavior = { name, started, until: started + duration, cycle };
    next.gestureUntil = started + duration;
    next.nextGesture =
      started + duration + 1.0 + (1 + Math.sin(cycle + state.phase)) * 0.65;
  }
  if (elapsed >= next.nextBlink) {
    next.blinkStart = next.nextBlink;
    next.nextBlink +=
      3.9 + (1 + Math.sin(next.nextBlink * 1.7 + state.phase)) * 1.15;
  }
  next.greeting = advanceSpring(
    state.greeting,
    elapsed < next.greetingUntil ? 1 : 0,
    seconds,
    { frequency: 2.7, damping: 0.86 },
  );
  next.actions = Object.fromEntries(
    Object.entries(state.actions).map(([name, channel]) => [
      name,
      {
        ...channel,
        ...advanceSpring(
          channel,
          elapsed < channel.until
            ? 1
            : name === "dance" && state.intent.dancing
              ? 0.72
              : 0,
          seconds,
          {
            frequency: name === "cuddle" ? 1.8 : 2.4,
            damping: name === "cuddle" ? 0.9 : 0.84,
          },
        ),
      },
    ]),
  );
  next.attention = {
    x: advanceSpring(state.attention.x, state.intent.look.x, seconds, {
      frequency: 2.3,
      damping: 0.88,
    }),
    y: advanceSpring(state.attention.y, state.intent.look.y, seconds, {
      frequency: 2.3,
      damping: 0.88,
    }),
  };
  next.gesture = advanceSpring(
    state.gesture,
    elapsed < next.gestureUntil ? 1 : 0,
    seconds,
    { frequency: 1.9, damping: 0.9 },
  );
  // Independent channels make the next idle behavior blend over the previous
  // one's follow-through instead of replacing a pose or restarting a clip.
  next.ambient = Object.fromEntries(
    Object.entries(state.ambient).map(([name, channel]) => [
      name,
      advanceSpring(
        channel,
        next.behavior.name === name && elapsed < next.behavior.until ? 1 : 0,
        seconds,
        { frequency: 1.35, damping: 0.92 },
      ),
    ]),
  );
  next.blink = blinkAt(elapsed - next.blinkStart);
  const targets = targetsFor(next);
  next.deform = Object.fromEntries(
    Object.entries(state.deform).map(([name, channel]) => [
      name,
      advanceSpring(channel, targets.deform[name], seconds, {
        frequency:
          name === "mane" || name.startsWith("wingCurl")
            ? 2.2
            : name === "headTurn" || name === "headPitch"
              ? 2.35
              : name === "ground" || name.startsWith("plant")
                ? 4.8
                : 2.8,
        damping: name === "mane" || name.startsWith("wingCurl") ? 0.72 : 0.9,
      }),
    ]),
  );
  next.performance = targets.performance;
  next.joints = Object.fromEntries(
    Object.entries(state.joints).map(([joint, properties]) => [
      joint,
      Object.fromEntries(
        Object.entries(properties).map(([property, jointSpring]) => [
          property,
          advanceSpring(jointSpring, targets.joints[joint][property], seconds, {
            frequency:
              joint === "head"
                ? 2.15
                : property === "sy" || property === "sx"
                  ? 3.4
                  : 2.7,
            damping: joint.startsWith("arm") ? 0.76 : 0.86,
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
        Object.entries(properties).map(([key, jointSpring]) => [
          key,
          jointSpring.value,
        ]),
      ),
    ]),
  );
  const lift = clamp(-joints.body.y, 0, 12);
  const joy = clamp(state.actions.celebrate.value, 0, 1);
  const hug = clamp(state.actions.cuddle.value, 0, 1);
  return {
    joints,
    deform: Object.fromEntries(
      Object.entries(state.deform).map(([name, channel]) => [
        name,
        clamp(
          channel.value,
          name === "smile" || name === "ground" || name.startsWith("plant")
            ? 0
            : -1,
          1,
        ),
      ]),
    ),
    performance: state.performance,
    blink: clamp(state.blink, 0, 1),
    blinkLeft: clamp(state.blink, 0, 1),
    blinkRight: clamp(blinkAt(state.elapsed - state.blinkStart - 0.012), 0, 1),
    effects: {
      sparkles: state.portrait ? 0 : joy,
      hearts: state.portrait ? 0 : hug,
      phase: state.elapsed,
    },
    shadow: { scale: 1 - lift * 0.028, opacity: 0.15 - lift * 0.0075 },
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
      armLeft: { x: 0, y: 0, r: greeting ? 7 * amount : 0 },
      armRight: { x: 0, y: 0, r: greeting ? -11 * amount : 0 },
      halo: { y: 0, r: 0 },
    },
    deform: { ...NEUTRAL_DEFORMATION },
    performance: "rest:still",
    blink: 0,
    blinkLeft: 0,
    blinkRight: 0,
    effects: { sparkles: 0, hearts: 0, phase: 0 },
    shadow: { scale: 1, opacity: 0.15 },
  };
}
