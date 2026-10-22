import { createStudio } from "./studio.js";

// Geometry, shader compilation, spring updates, and the GPU copy all stay off
// the page thread. Each transferred 2D canvas is presented by the compositor.
const entries = new Map();
const pendingMounts = new Map();
const pendingUpdates = new Map();
let frame = null;
let contextLost = false;

const studio = createStudio({
  onContextLost() {
    contextLost = true;
    cancelFrame();
    for (const id of [...entries.keys(), ...pendingMounts.keys()]) {
      postMessage({
        type: "error",
        id,
        reason: "The graphics context was lost.",
      });
    }
  },
  onContextRestored() {
    contextLost = false;
    for (const entry of entries.values()) {
      entry.ready = false;
      entry.dirty = true;
      entry.last = null;
    }
    schedule();
  },
});

const notifications = new Set();
let notificationTimer = null;
function snapshot(entry) {
  entry.revision++;
  notifications.add(entry);
  if (notificationTimer !== null) return;
  // Publish after the render callback returns, when transferred canvases can
  // present their bitmaps. The page never needs a synchronous GPU readback.
  notificationTimer = setTimeout(() => {
    notificationTimer = null;
    for (const current of notifications) {
      if (entries.get(current.id) !== current) continue;
      postMessage({
        type: "frame",
        id: current.id,
        diagnostics: studio.diagnostics(current),
      });
    }
    notifications.clear();
  }, 0);
}

function fail(id, error) {
  const entry = entries.get(id);
  if (entry && contextLost) {
    entry.last = null;
    entry.dirty = true;
    entry.ready = false;
    postMessage({ type: "error", id, reason: error?.message || String(error) });
    return;
  }
  if (entry) {
    studio.disposeEntry(entry);
    entries.delete(id);
  }
  pendingMounts.delete(id);
  pendingUpdates.delete(id);
  postMessage({ type: "error", id, reason: error?.message || String(error) });
}

function moving(entry) {
  return entry.active && !entry.options.paused && !entry.reduced;
}

function hasWork() {
  if (pendingUpdates.size) return true;
  if (contextLost) return false;
  for (const definition of pendingMounts.values()) {
    if (definition.active !== false) return true;
  }
  for (const entry of entries.values()) {
    if (entry.active && (entry.dirty || moving(entry))) return true;
  }
  return false;
}

function schedule() {
  if (frame !== null || !hasWork()) return;
  if (typeof self.requestAnimationFrame === "function") {
    try {
      frame = { type: "raf", id: self.requestAnimationFrame(tick) };
      return;
    } catch {
      // Older worker implementations may expose RAF without an owning window.
    }
  }
  frame = { type: "timer", id: setTimeout(() => tick(performance.now()), 16) };
}

function cancelFrame() {
  if (frame?.type === "raf") self.cancelAnimationFrame(frame.id);
  else if (frame) clearTimeout(frame.id);
  frame = null;
}

function flushUpdates() {
  for (const [id, patch] of pendingUpdates) {
    const entry = entries.get(id);
    if (entry) {
      studio.updateEntry(entry, patch);
      // An acknowledged pause retains the exact most recently painted pose.
      // Inactive entries still acknowledge state without spending GPU work.
      snapshot(entry);
    } else {
      const pending = pendingMounts.get(id);
      if (pending) Object.assign(pending, patch);
    }
  }
  pendingUpdates.clear();
}

function tick(timestamp) {
  frame = null;
  flushUpdates();
  if (contextLost) return;

  // Defer construction until a visible mount survives the current message
  // batch. Quick navigation can cancel a pending rig before shader work starts.
  for (const [id, definition] of pendingMounts) {
    if (definition.active === false) continue;
    pendingMounts.delete(id);
    try {
      entries.set(id, studio.createEntry(definition));
    } catch (error) {
      fail(id, error);
    }
  }

  for (const [id, entry] of entries) {
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
          studio.drawEntry(entry);
          entry.lastPaint = timestamp;
          snapshot(entry);
        }
      } else {
        entry.last = null;
        if (entry.dirty) {
          studio.drawEntry(entry);
          entry.lastPaint = timestamp;
          snapshot(entry);
        }
      }
    } catch (error) {
      fail(id, error);
    }
  }
  schedule();
}

self.addEventListener("message", ({ data: message }) => {
  const { type, id } = message;
  if (type === "mount") {
    const previous = entries.get(id);
    if (previous) studio.disposeEntry(previous);
    entries.delete(id);
    pendingUpdates.delete(id);
    pendingMounts.set(id, { ...message, active: message.active !== false });
    if (contextLost)
      postMessage({
        type: "error",
        id,
        reason: "The graphics context is unavailable.",
      });
  } else if (type === "remove") {
    const entry = entries.get(id);
    if (entry) studio.disposeEntry(entry);
    entries.delete(id);
    pendingMounts.delete(id);
    pendingUpdates.delete(id);
  } else if (
    type === "update" ||
    type === "resize" ||
    type === "active" ||
    type === "reduced"
  ) {
    const patch = pendingUpdates.get(id) || {};
    for (const key of ["options", "size", "active", "reduced"]) {
      if (message[key] !== undefined) patch[key] = message[key];
    }
    pendingUpdates.set(id, patch);
  } else if (type === "snapshot") {
    const entry = entries.get(id);
    if (entry) snapshot(entry);
  } else if (type === "dispose") {
    cancelFrame();
    for (const entry of entries.values()) studio.disposeEntry(entry);
    entries.clear();
    pendingMounts.clear();
    pendingUpdates.clear();
    notifications.clear();
    if (notificationTimer !== null) clearTimeout(notificationTimer);
    notificationTimer = null;
    studio.dispose();
    return;
  }
  schedule();
});
