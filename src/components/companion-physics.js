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
  const breath = Math.sin(t * TAU * profile.breath + phase);
  const lean = Math.sin(t * 0.46 + phase * 0.7);
  const curiosity =
    Math.sin(t * 0.63 + phase * 1.3) * 1.1 + Math.sin(t * 0.27 + phase) * 0.6;
  const look = { x: state.attention.x.value, y: state.attention.y.value };
  const greet = state.actions.hello.value;
  const dance = state.actions.dance.value;
  const joy = state.actions.celebrate.value;
  const hug = state.actions.cuddle.value;
  const glance = state.ambient.glance.value;
  const stretch = state.ambient.stretch.value;
  const shuffle = state.ambient.shuffle.value;
  const sway = state.ambient.sway.value;
  const wave = Math.sin(t * 7.1 + phase);
  const beat = Math.sin(t * profile.beat * 2 + phase);
  const groove = Math.sin(t * profile.beat + phase);
  const local = t - state.behavior.started;
  const glanceDirection = Math.sin(local * 0.85 + phase);
  const foot = Math.sin(t * 3.6 + phase);
  const wing = Math.sin(t * 1.32 + phase) * profile.wing;
  const flutter =
    Math.sin(t * 3.3 + phase) *
    Math.sin(t * 0.71 + phase * 0.4) *
    (state.kind === "eagle" ? 1.6 : 0.55);
  const fidget =
    Math.sin(t * 3.7 + phase) *
    Math.sin(t * 0.59 + phase) *
    (state.kind === "human" ? 2.1 : 0.75);
  const headTurn =
    (curiosity * profile.curiosity +
      look.x * 3.3 +
      glance * glanceDirection * 3.2) *
    turn;
  const actionAge = t - state.actions.celebrate.started;
  const leap = leapAt(actionAge % 1.1);
  const lift = leap.lift * joy * profile.energy;
  const squash = leap.squash * joy;
  const flap = leap.wing * joy;
  const shuffleShift = shuffle * foot;
  const stretchReach = stretch * (0.75 + Math.sin(local * 0.8) * 0.25);
  const human = state.kind === "human";
  const armWave = human ? 1 : 0.36;
  const armLimit = (angle) => clamp(angle, human ? -55 : -30, human ? 55 : 30);

  return {
    body: {
      x:
        (lean * 0.35 +
          look.x * 0.4 +
          shuffleShift * 0.9 +
          dance * groove * 4.8 * profile.energy +
          sway * Math.sin(local * 1.1) * 1.0) *
        travel,
      y:
        (-breath * 0.65 -
          lift * (state.kind === "eagle" ? 10 : 7) +
          squash * 1.1 -
          stretchReach * 1.1 -
          dance * (1 + beat) * 0.75 +
          hug * 0.55) *
        travel,
      r:
        (lean * 0.6 +
          look.x * 0.35 +
          shuffleShift * 0.75 +
          dance * groove * 4.7 * profile.energy +
          sway * Math.sin(local * 1.1) * 1.3 -
          hug * 1.2) *
        turn,
      sx:
        1 +
        (breath * 0.003 + squash * 0.022 - lift * 0.006 + hug * 0.008) * travel,
      sy:
        1 +
        (breath * 0.007 - squash * 0.028 + lift * 0.012 - hug * 0.008) * travel,
    },
    head: {
      x:
        (Math.sin(t * 0.4 + phase) * 0.25 +
          look.x * 1.65 +
          glance * glanceDirection * 0.6) *
        travel,
      y:
        (breath * 0.25 +
          look.y * 1.45 +
          stretchReach * 0.5 +
          dance * beat * 0.65 +
          hug * 0.7) *
        travel,
      r:
        headTurn +
        (greet * Math.sin(t * 3.7 + phase) * 1.1 -
          dance * groove * 3.2 -
          hug * 3.8 -
          stretchReach * 1.5) *
          turn,
    },
    wingLeft: {
      r:
        (wing +
          flutter +
          greet * (7 + wave * 4) +
          stretchReach * 8.5 +
          dance * (5 + beat * 5) * profile.energy +
          flap * 17 +
          hug * 16) *
        turn,
    },
    wingRight: {
      r:
        (-wing -
          flutter -
          greet * (7 + wave * 4) -
          stretchReach * 8.5 -
          dance * (5 - beat * 5) * profile.energy -
          flap * 17 -
          hug * 16) *
        turn,
    },
    armLeft: {
      x: shuffleShift * 0.4 * travel,
      y:
        (-Math.max(0, foot) * shuffle * 1.5 -
          dance * Math.max(0, beat) * (human ? 0.6 : 1.2)) *
        travel,
      r:
        armLimit(
          lean * 1.2 +
            fidget +
            greet * (human ? 24 + wave * 7 : 9 + wave * 4) * profile.wave +
            dance * (human ? 14 + beat * 10 : beat * 6) * profile.energy +
            hug * 18 * armWave +
            joy * (human ? 12 + flap * 8 : flap * 3) +
            stretchReach * 3,
        ) * turn,
    },
    armRight: {
      x: shuffleShift * 0.4 * travel,
      y:
        (-Math.max(0, -foot) * shuffle * 1.5 -
          dance * Math.max(0, -beat) * (human ? 0.6 : 1.2)) *
        travel,
      r:
        armLimit(
          -lean * 1.5 -
            fidget -
            greet * (human ? 38 + wave * 9 : 12 + wave * 5) * profile.wave -
            dance * (human ? 20 - beat * 12 : -beat * 6) * profile.energy -
            hug * 24 * armWave -
            joy * (human ? 16 + flap * 8 : flap * 3) -
            stretchReach * 3,
        ) * turn,
    },
    halo: {
      y: (Math.sin(t * 1.08 + phase) * 0.5 - lift * 0.9) * travel,
      r:
        (Math.sin(t * 0.7 + phase) * 0.9 -
          headTurn * 0.2 +
          dance * beat * 1.2) *
        turn,
    },
  };
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
  next.joints = Object.fromEntries(
    Object.entries(state.joints).map(([joint, properties]) => [
      joint,
      Object.fromEntries(
        Object.entries(properties).map(([property, jointSpring]) => [
          property,
          advanceSpring(jointSpring, targets[joint][property], seconds, {
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
    blink: 0,
    blinkLeft: 0,
    blinkRight: 0,
    effects: { sparkles: 0, hearts: 0, phase: 0 },
    shadow: { scale: 1, opacity: 0.15 },
  };
}
