// What a companion is doing, as a pure function of time. The game asks for
// acts (idle, wave, cheer, win, sad); `since` is seconds since the act began.
import { basePose, clamp, lerp } from "./model.js";

export const KINDS = { lion: "leo", ox: "lou", eagle: "juno", human: "mattie" };
export const ACTS = ["idle", "wave", "cheer", "win", "sad"];
const PHASE = { leo: 0.3, lou: 1.7, juno: 2.6, mattie: 0.9 };
const BLINK = { leo: 3.3, lou: 3.9, juno: 2.9, mattie: 4.2 };

const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a)));
function blinkAt(t, period) {
  const u = ((t % period) + period) % period;
  return u < 0.14 ? Math.sin((u / 0.14) * Math.PI) : 0;
}
// A hop: anticipation squash, lift with stretch, landing squash.
function hop(P, s, at, height) {
  const air = bump(s, at, at + 0.46);
  P.lift = Math.max(P.lift, height * air);
  const squash =
    0.11 * bump(s, at - 0.14, at) + 0.12 * bump(s, at + 0.44, at + 0.62);
  P.sy *= 1 - squash + 0.05 * air;
  P.sx *= 1 + squash * 0.8 - 0.03 * air;
}

export function poseFor(kind, act, time, since = time) {
  const t = time + PHASE[kind];
  const s = Math.max(0, since);
  const P = basePose({ turn: 0.08 * Math.sin(t * 0.37), face: "happy", t });
  const breathe = Math.sin(t * 2.1);
  P.sy = 1 + 0.012 * breathe;
  P.sx = 1 - 0.008 * breathe;
  P.blink = blinkAt(t, BLINK[kind]);
  P.headTilt = 0.035 * Math.sin(t * 0.8);
  P.look = [0.25 * Math.sin(t * 0.45), 0.1 * Math.sin(t * 0.7)];
  P.flap = 0.06 * Math.sin(t * 1.9);
  P.arms = {
    L: { ang: 1.95 + 0.05 * Math.sin(t * 1.3) },
    R: { ang: 1.2 - 0.05 * Math.sin(t * 1.3) },
  };
  if (act === "wave") {
    // a greeting wave, then a little wave now and again
    const cycle = s < 2.6 ? s : (s - 2.6) % 5;
    const w = clamp(cycle / 0.25) * (1 - clamp((cycle - 1.9) / 0.35));
    P.arms.R = {
      ang: lerp(1.2, -1.2 + 0.38 * Math.sin(cycle * 10), w),
      len: 0.9,
    };
    if (w > 0.2) P.face = "grin";
    P.headTilt += 0.08 * w;
    P.flap += 0.12 * w;
  } else if (act === "cheer") {
    // three happy hops, then a bounce every few seconds
    [0.1, 0.75, 1.4].forEach((h, i) => hop(P, s, h, 34 - i * 6));
    if (s > 2.2) hop(P, (s - 2.2) % 3.2, 0.2, 16);
    const up = clamp(s / 0.2) * (s < 2.2 ? 1 : 0.4);
    P.arms = {
      L: { ang: lerp(1.95, -2.25, up) },
      R: { ang: lerp(1.2, -0.9, up) },
    };
    P.face = s < 2.2 ? "joy" : "grin";
    P.flap += 0.35 * bump(s % 0.65, 0, 0.65) * (s < 2.2 ? 1 : 0.3);
  } else if (act === "win") {
    const beat = 0.8;
    hop(P, s % beat, 0.12, 26);
    const wave = Math.sin(s * 8);
    P.arms = { L: { ang: -2.25 + 0.3 * wave }, R: { ang: -0.9 - 0.3 * wave } };
    P.face = "joy";
    P.turn = 0.16 * Math.sin(s * 2.4);
    P.flap += 0.3 * Math.abs(Math.sin(s * 4));
  } else if (act === "sad") {
    const droop = clamp(s / 0.5);
    P.face = "sad";
    P.headTilt += 0.12 * droop;
    P.sy *= 1 - 0.04 * droop + 0.01 * Math.sin(s * 1.4);
    P.sx *= 1 + 0.03 * droop;
    P.arms = { L: { ang: 1.75 }, R: { ang: 1.4 } };
    P.flap = -0.12 * droop;
    P.look = [0.1 * Math.sin(s * 0.6), 0.55];
  }
  return P;
}
