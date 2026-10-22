// DOM input and lifecycle stay light. All sculpting, simulation and GPU work
// run in one background studio, including writes to the avatar canvases.
const entries = new Map();
const byHost = new WeakMap();
let studio = null;
let failed = false;
let sequence = 0;
let lifecycleInstalled = false;
const workerId = "kinesa-studio-1";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function send(message, transfer) {
  if (studio && !failed) studio.postMessage(message, transfer || []);
}
function getStudio() {
  if (failed) return null;
  if (studio) return studio;
  try {
    studio = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
      name: "Kinesa 3D studio",
    });
    studio.addEventListener("message", ({ data }) => {
      const entry = entries.get(data.id);
      if (!entry) return;
      if (data.type === "error") {
        entry.ready = false;
        if (entry.diagnostics)
          entry.diagnostics = {
            ...entry.diagnostics,
            drawn: false,
            renderer: "poster",
          };
        entry.onError?.();
        return;
      }
      if (data.type !== "frame") return;
      entry.diagnostics = {
        ...data.diagnostics,
        renderThread: "worker",
        worker: true,
        workerId,
      };
      if (
        data.diagnostics.drawn &&
        !entry.ready &&
        !entry.presentationScheduled
      ) {
        entry.presentationScheduled = true;
        requestAnimationFrame(() => {
          entry.presentationScheduled = false;
          if (entries.get(entry.id) !== entry || !entry.diagnostics?.drawn)
            return;
          entry.ready = true;
          entry.host.dataset.renderer = "webgl";
          entry.onReady?.();
        });
      }
    });
    studio.addEventListener("error", () => {
      failed = true;
      studio.terminate();
      for (const entry of entries.values()) {
        if (entry.diagnostics)
          entry.diagnostics = {
            ...entry.diagnostics,
            drawn: false,
            renderer: "poster",
          };
        entry.onError?.();
      }
    });
    return studio;
  } catch {
    failed = true;
    return null;
  }
}
function active(entry) {
  return (
    entry.intersecting && !document.hidden && !entry.host.closest("[inert]")
  );
}
function synchronizeActivity() {
  for (const entry of entries.values())
    send({ type: "active", id: entry.id, active: active(entry) });
}
function installLifecycle() {
  if (lifecycleInstalled) return;
  lifecycleInstalled = true;
  document.addEventListener("visibilitychange", synchronizeActivity);
  const observer = new MutationObserver(synchronizeActivity);
  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["inert"],
  });
}
function pixelSize(host) {
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

// Older browsers retain the same original 3D models through the main-thread
// renderer. The static rendered poster remains available if WebGL is absent.
function mountLegacy(args) {
  let controller = null;
  let disposed = false;
  let options = args.options;
  import("./renderer-main.js")
    .then((module) => {
      if (disposed) return;
      controller = module.mountCompanion({ ...args, options });
      const diagnostics = () => module.getCompanionDiagnostics(args.host);
      byHost.set(args.host, { legacy: diagnostics });
    })
    .catch(() => {
      if (!disposed) args.onError?.();
    });
  return {
    update(next) {
      options = next;
      controller?.update(next);
    },
    dispose() {
      disposed = true;
      controller?.dispose();
      byHost.delete(args.host);
    },
  };
}

export function mountCompanion(args) {
  const { host, canvas, kind, onReady, onError } = args;
  if (
    typeof OffscreenCanvas === "undefined" ||
    typeof Worker === "undefined" ||
    !canvas.transferControlToOffscreen
  )
    return mountLegacy(args);
  if (!getStudio()) {
    onError?.();
    return { update() {}, dispose() {} };
  }
  installLifecycle();
  const entry = {
    id: ++sequence,
    host,
    canvas,
    kind,
    onReady,
    onError,
    options: { ...args.options },
    intersecting: true,
    ready: false,
    diagnostics: null,
    hovered: false,
    look: { x: 0, y: 0 },
  };
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const target = host.closest("button") || host;
  function intent() {
    return {
      ...entry.options,
      look: entry.options.look ?? (entry.hovered ? entry.look : null),
      hovered: entry.hovered,
    };
  }
  function updateIntent() {
    send({ type: "update", id: entry.id, options: intent() });
  }
  function pointer(event) {
    if (event.pointerType === "touch") return;
    const bounds = host.getBoundingClientRect();
    entry.hovered = true;
    entry.look = {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
      y: clamp(1 - ((event.clientY - bounds.top) / bounds.height) * 2, -1, 1),
    };
    updateIntent();
  }
  function leave() {
    entry.hovered = false;
    updateIntent();
  }
  function focus() {
    entry.hovered = true;
    entry.look = { x: 0, y: -0.2 };
    updateIntent();
  }
  function reduced(event) {
    send({ type: "reduced", id: entry.id, reduced: event.matches });
  }
  let size = pixelSize(host);
  entries.set(entry.id, entry);
  byHost.set(host, entry);
  try {
    const offscreen = canvas.transferControlToOffscreen();
    send(
      {
        type: "mount",
        id: entry.id,
        kind,
        canvas: offscreen,
        size,
        options: intent(),
        reduced: media.matches,
        active: active(entry),
      },
      [offscreen],
    );
  } catch {
    entries.delete(entry.id);
    byHost.delete(host);
    onError?.();
    return { update() {}, dispose() {} };
  }
  target.addEventListener("pointermove", pointer, { passive: true });
  target.addEventListener("pointerleave", leave);
  target.addEventListener("focusin", focus);
  target.addEventListener("focusout", leave);
  media.addEventListener("change", reduced);
  const intersection = new IntersectionObserver(
    ([result]) => {
      entry.intersecting = result.isIntersecting;
      send({ type: "active", id: entry.id, active: active(entry) });
    },
    { rootMargin: "40px" },
  );
  intersection.observe(host);
  const resize = new ResizeObserver(() => {
    const next = pixelSize(host);
    if (next !== size) {
      size = next;
      send({ type: "resize", id: entry.id, size });
    }
  });
  resize.observe(host);
  return {
    update(options) {
      entry.options = { ...options };
      updateIntent();
    },
    dispose() {
      entries.delete(entry.id);
      byHost.delete(host);
      send({ type: "remove", id: entry.id });
      intersection.disconnect();
      resize.disconnect();
      target.removeEventListener("pointermove", pointer);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", focus);
      target.removeEventListener("focusout", leave);
      media.removeEventListener("change", reduced);
    },
  };
}

export function getCompanionDiagnostics(host) {
  const entry = byHost.get(host);
  if (!entry) return null;
  if (entry.legacy)
    return { ...entry.legacy(), renderThread: "main", worker: false };
  return entry.diagnostics;
}
