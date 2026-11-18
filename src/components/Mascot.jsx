import { useEffect, useRef } from "react";
import { FRAMES, drawCompanion } from "../companions/canvas.js";
import { KINDS, poseFor } from "../companions/motion.js";

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

function render(canvas, opts, time) {
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
  const pose = poseFor(kind, opts.act, time, time - opts.since);
  if (opts.portrait) pose.lift = 0;
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
    let visible = true;
    let unsubscribe = null;
    const draw = (time) => render(canvas, state.current, time);
    const still = () =>
      render(canvas, state.current, state.current.since + 0.6);
    const refresh = () => {
      const active =
        visible && !document.hidden && !state.current.paused && !media.matches;
      if (active && !unsubscribe) unsubscribe = subscribe(draw);
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
    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      refresh();
    });
    seen.observe(canvas);
    document.addEventListener("visibilitychange", refresh);
    media.addEventListener?.("change", refresh);
    state.current.refresh = refresh;
    resize();
    refresh();
    return () => {
      unsubscribe?.();
      sizes.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      media.removeEventListener?.("change", refresh);
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    if (s.act !== resolved) s.since = performance.now() / 1000;
    Object.assign(s, { kind, act: resolved, portrait, paused });
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
