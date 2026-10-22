import { createStudio } from "./studio.js";

// Compatibility path for browsers without transferable OffscreenCanvas. It
// shares the same sculpted models, cameras, poses and studio as the worker.
const entries = new Set();
const byHost = new WeakMap();
let frame = null;
let installed = false;
let lost = false;
const studio = createStudio({
  onContextLost() {
    lost = true;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    for (const entry of entries) entry.onError?.();
  },
  onContextRestored() {
    lost = false;
    for (const entry of entries) {
      entry.dirty = true;
      entry.last = null;
    }
    schedule();
  },
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function sizeOf(host) {
  const bounds = host.getBoundingClientRect();
  return clamp(
    Math.round(
      Math.max(bounds.width, bounds.height) *
        Math.min(devicePixelRatio || 1, 1.75),
    ),
    48,
    512,
  );
}
function active(entry) {
  return (
    entry.intersecting && !document.hidden && !entry.host.closest("[inert]")
  );
}
function moving(entry) {
  return entry.active && !entry.options.paused && !entry.reduced;
}
function paint(entry) {
  if (studio.drawEntry(entry)) {
    entry.host.dataset.renderer = "webgl";
    if (!entry.notified) {
      entry.notified = true;
      entry.onReady?.();
    }
  }
}
function tick(timestamp) {
  frame = null;
  for (const entry of entries) {
    if (!entry.active) {
      entry.last = null;
      continue;
    }
    try {
      if (moving(entry)) {
        const delta =
          entry.last === null
            ? 0
            : Math.min((timestamp - entry.last) / 1000, 1 / 15);
        entry.last = timestamp;
        studio.advanceEntry(entry, delta);
        if (
          !entry.options.portrait ||
          entry.dirty ||
          entry.lastPaint === null ||
          timestamp - entry.lastPaint >= 1000 / 30
        ) {
          paint(entry);
          entry.lastPaint = timestamp;
        }
      } else {
        entry.last = null;
        if (entry.dirty) paint(entry);
      }
    } catch {
      entry.onError?.();
      entry.active = false;
    }
  }
  schedule();
}
function schedule() {
  if (
    frame === null &&
    !lost &&
    [...entries].some((entry) => entry.active && (entry.dirty || moving(entry)))
  )
    frame = requestAnimationFrame(tick);
}
function activity() {
  for (const entry of entries)
    studio.updateEntry(entry, { active: active(entry) });
  schedule();
}
function installLifecycle() {
  if (installed) return;
  installed = true;
  document.addEventListener("visibilitychange", activity);
  const observer = new MutationObserver(activity);
  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["inert"],
  });
}
export function mountCompanion({
  host,
  canvas,
  kind,
  options,
  onReady,
  onError,
}) {
  let entry;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  try {
    entry = studio.createEntry({
      kind,
      canvas,
      size: sizeOf(host),
      options,
      reduced: media.matches,
    });
  } catch {
    onError?.();
    return { update() {}, dispose() {} };
  }
  Object.assign(entry, {
    host,
    onReady,
    onError,
    intersecting: true,
    hovered: false,
    look: { x: 0, y: 0 },
  });
  entry.active = active(entry);
  entries.add(entry);
  byHost.set(host, entry);
  installLifecycle();
  const target = host.closest("button") || host;
  function intent() {
    studio.updateEntry(entry, {
      options: {
        ...options,
        look: options.look ?? (entry.hovered ? entry.look : null),
        hovered: entry.hovered,
      },
    });
    schedule();
  }
  function pointer(event) {
    if (event.pointerType === "touch") return;
    entry.hovered = true;
    const bounds = host.getBoundingClientRect();
    entry.look = {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
      y: clamp(1 - ((event.clientY - bounds.top) / bounds.height) * 2, -1, 1),
    };
    intent();
  }
  function leave() {
    entry.hovered = false;
    intent();
  }
  function focus() {
    entry.hovered = true;
    entry.look = { x: 0, y: -0.2 };
    intent();
  }
  function reduced(event) {
    studio.updateEntry(entry, { reduced: event.matches });
    schedule();
  }
  target.addEventListener("pointermove", pointer, { passive: true });
  target.addEventListener("pointerleave", leave);
  target.addEventListener("focusin", focus);
  target.addEventListener("focusout", leave);
  media.addEventListener("change", reduced);
  const intersection = new IntersectionObserver(
    ([result]) => {
      entry.intersecting = result.isIntersecting;
      studio.updateEntry(entry, { active: active(entry) });
      schedule();
    },
    { rootMargin: "40px" },
  );
  intersection.observe(host);
  const resize = new ResizeObserver(() => {
    studio.updateEntry(entry, { size: sizeOf(host) });
    schedule();
  });
  resize.observe(host);
  schedule();
  return {
    update(next) {
      options = next;
      entry.options = { ...next };
      intent();
    },
    dispose() {
      entries.delete(entry);
      byHost.delete(host);
      studio.disposeEntry(entry);
      intersection.disconnect();
      resize.disconnect();
      target.removeEventListener("pointermove", pointer);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", focus);
      target.removeEventListener("focusout", leave);
      media.removeEventListener("change", reduced);
      if (!entries.size && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
}
export function getCompanionDiagnostics(host) {
  const entry = byHost.get(host);
  return entry ? studio.diagnostics(entry) : null;
}
