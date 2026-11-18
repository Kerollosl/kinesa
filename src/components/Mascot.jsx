import { useEffect, useRef } from "react";
import { FRAMES, drawCompanion } from "../companions/canvas.js";
import {
  KINDS,
  RIG_INTENT,
  poseFor,
  withSprings,
} from "../companions/motion.js";
import {
  advanceCompanion,
  advanceMotionClock,
  companionPose,
  createCompanionState,
  createMotionClock,
  retargetCompanion,
  staticCompanionPose,
} from "../companions/physics.js";

export const MASCOTS = [
  {
    kind: "lion",
    name: "Leo",
    gospel: "Mark",
    personality: "Brave heart. Big energy.",
    color: "#E5A138",
    bg: "#FFF0CF",
  },
  {
    kind: "ox",
    name: "Lou",
    gospel: "Luke",
    personality: "Steady, kind & surprisingly clever.",
    color: "#BA7956",
    bg: "#F9E5DB",
  },
  {
    kind: "eagle",
    name: "Juno",
    gospel: "John",
    personality: "Big ideas. A bird’s-eye view.",
    color: "#96704F",
    bg: "#F3E9DB",
  },
  {
    kind: "human",
    name: "Mattie",
    gospel: "Matthew",
    personality: "Curious mind. A little mischief.",
    color: "#9380BA",
    bg: "#EDE5F6",
  },
];

// One animation frame for every visible companion; hidden tabs, offscreen
// companions, paused scenes and reduced motion leave the loop.
const live = new Set();
let frame = null;
function loop(now) {
  frame = null;
  for (const draw of live) draw(now / 1000);
  if (live.size) frame = requestAnimationFrame(loop);
}
function subscribe(draw) {
  live.add(draw);
  if (frame === null) frame = requestAnimationFrame(loop);
  return () => {
    live.delete(draw);
    if (!live.size && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}

function render(canvas, opts, time, spring) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!w || !h) return;
  const [x0, y0, x1, y1] = opts.portrait ? FRAMES.portrait : FRAMES.full;
  const unit = Math.min(w / (x1 - x0), h / (y1 - y0));
  ctx.translate(w / 2 - ((x0 + x1) / 2) * unit, h / 2 - ((y0 + y1) / 2) * unit);
  ctx.scale(unit, unit);
  const kind = KINDS[opts.kind] || "leo";
  const pose = withSprings(
    poseFor(kind, opts.act, time, time - opts.since),
    spring,
    opts.act,
  );
  if (opts.look) pose.look = [opts.look.x * 0.8, opts.look.y * 0.6];
  if (opts.portrait) pose.lift = 0;
  // sparkles and hearts only where there's room for them
  if (opts.portrait || w / (window.devicePixelRatio || 1) < 120)
    pose.effects = null;
  drawCompanion(ctx, kind, pose, unit);
}

// Kept from the earlier painted rig so callers don't change: mood
// "celebrate" means cheer, and `dancing` means win.
function actFrom({ act, mood, dancing, action }) {
  if (act) return act;
  if (dancing || action === "dance") return "win";
  if (mood === "celebrate") return "cheer";
  return "idle";
}

export default function Mascot({
  kind = "lion",
  act,
  mood = "happy",
  action,
  dancing = false,
  portrait = false,
  paused = false,
  className = "",
  softSurface: _softSurface,
  reaction: _reaction,
  look: _look,
  ...props
}) {
  const ref = useRef(null);
  const state = useRef({
    kind,
    act: "idle",
    portrait,
    paused,
    since: performance.now() / 1000,
  });
  const resolved = actFrom({ act, mood, dancing, action });
  const companion = MASCOTS.find((m) => m.kind === kind) || MASCOTS[0];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const s = state.current;
    let spring = retargetCompanion(
      createCompanionState({
        kind: s.kind,
        portrait: s.portrait,
        seed: Math.random(),
      }),
      { ...RIG_INTENT[s.act], portrait: s.portrait },
    );
    let clock = createMotionClock();
    let visible = true;
    let unsubscribe = null;
    const draw = (time) => {
      clock = advanceMotionClock(clock, time * 1000);
      spring = advanceCompanion(spring, clock.delta);
      render(canvas, s, time, companionPose(spring));
    };
    const still = () =>
      render(
        canvas,
        s,
        s.since + 0.6,
        staticCompanionPose({ portrait: s.portrait }),
      );
    const refresh = () => {
      const active = visible && !document.hidden && !s.paused && !media.matches;
      if (active && !unsubscribe) {
        clock = advanceMotionClock(clock, 0, false);
        unsubscribe = subscribe(draw);
      }
      if (!active && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (!active) still();
    };
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(box.width * dpr));
      const h = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (!unsubscribe) still();
    };
    // Companions glance toward a pointer or finger over them.
    const target = canvas.closest("button") || canvas;
    const look = (e) => {
      const b = canvas.getBoundingClientRect();
      if (!b.width) return;
      const v = {
        x: Math.max(
          -1,
          Math.min(1, ((e.clientX - b.left) / b.width - 0.5) * 2),
        ),
        y: Math.max(
          -1,
          Math.min(1, ((e.clientY - b.top) / b.height - 0.5) * 2),
        ),
      };
      s.look = v;
      spring = retargetCompanion(spring, { look: v });
    };
    const unlook = () => {
      s.look = null;
      spring = retargetCompanion(spring, { look: { x: 0, y: 0 } });
    };
    target.addEventListener("pointermove", look, { passive: true });
    target.addEventListener("pointerleave", unlook);
    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      refresh();
    });
    seen.observe(canvas);
    document.addEventListener("visibilitychange", refresh);
    media.addEventListener?.("change", refresh);
    s.refresh = refresh;
    s.retarget = (act) => {
      spring = retargetCompanion(spring, {
        ...RIG_INTENT[act],
        reaction: performance.now(),
      });
    };
    resize();
    refresh();
    return () => {
      unsubscribe?.();
      sizes.disconnect();
      seen.disconnect();
      target.removeEventListener("pointermove", look);
      target.removeEventListener("pointerleave", unlook);
      document.removeEventListener("visibilitychange", refresh);
      media.removeEventListener?.("change", refresh);
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    const changed = s.act !== resolved;
    if (changed) s.since = performance.now() / 1000;
    Object.assign(s, { kind, act: resolved, portrait, paused });
    if (changed) s.retarget?.(resolved);
    s.refresh?.();
  }, [kind, resolved, portrait, paused]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`${companion.name}, the ${companion.kind} companion of ${companion.gospel}`}
      className={`mascot mascot-${companion.kind} ${portrait ? "mascot-portrait" : ""} ${className}`}
      data-act={resolved}
      {...props}
    />
  );
}
