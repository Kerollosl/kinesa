const TAU = Math.PI * 2;
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const frameDelta = (seconds) => clamp(finite(seconds), 0, 1 / 15);

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
