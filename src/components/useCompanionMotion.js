import { useEffect, useRef } from "react";
import {
  advanceCompanion,
  advanceMotionClock,
  companionPose,
  createCompanionState,
  createMotionClock,
  retargetCompanion,
  staticCompanionPose,
} from "./companion-physics.js";

// Every visible companion shares one RAF. Hidden tabs, offscreen characters,
// paused scenes, and reduced-motion users leave the scheduler entirely.
const subscribers = new Set();
let frameRequest = null;

function runFrame(timestamp) {
  frameRequest = null;
  for (const callback of [...subscribers]) callback(timestamp);
  if (subscribers.size) frameRequest = requestAnimationFrame(runFrame);
}

function subscribe(callback) {
  subscribers.add(callback);
  if (frameRequest === null) frameRequest = requestAnimationFrame(runFrame);
  return () => {
    subscribers.delete(callback);
    if (!subscribers.size && frameRequest !== null) {
      cancelAnimationFrame(frameRequest);
      frameRequest = null;
    }
  };
}

function pivotFor(element) {
  const values = (element.dataset.pivot || "100 100")
    .trim()
    .split(/[ ,]+/)
    .map(Number);
  return {
    x: Number.isFinite(values[0]) ? values[0] : 100,
    y: Number.isFinite(values[1]) ? values[1] : 100,
  };
}

const number = (value) => Math.round(value * 1000) / 1000;

function writeAttribute(element, name, value) {
  const next = String(value);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

function transformFor(pose, pivot) {
  const x = number(pose.x || 0);
  const y = number(pose.y || 0);
  const r = number(pose.r || 0);
  const sx = number(pose.sx ?? 1);
  const sy = number(pose.sy ?? 1);
  return `translate(${x} ${y}) translate(${pivot.x} ${pivot.y}) rotate(${r}) scale(${sx} ${sy}) translate(${-pivot.x} ${-pivot.y})`;
}

function collectParts(root) {
  const entries = (selector) =>
    [...root.querySelectorAll(selector)].map((element) => ({
      element,
      pivot: pivotFor(element),
    }));
  return {
    joints: entries("[data-joint]"),
    lids: entries("[data-lid]"),
    lidLines: [...root.querySelectorAll("[data-lid-line]")],
    shadows: entries("[data-contact-shadow]"),
  };
}

function paint(parts, pose) {
  for (const { element, pivot } of parts.joints) {
    const joint = pose.joints[element.dataset.joint];
    if (joint) writeAttribute(element, "transform", transformFor(joint, pivot));
  }
  for (const { element, pivot } of parts.lids) {
    writeAttribute(
      element,
      "visibility",
      pose.blink > 0.001 ? "visible" : "hidden",
    );
    writeAttribute(
      element,
      "transform",
      transformFor({ sy: pose.blink }, pivot),
    );
  }
  for (const element of parts.lidLines) {
    writeAttribute(
      element,
      "opacity",
      number(Math.max(0, (pose.blink - 0.8) * 5)),
    );
  }
  for (const { element, pivot } of parts.shadows) {
    writeAttribute(
      element,
      "transform",
      transformFor({ sx: pose.shadow.scale }, pivot),
    );
    writeAttribute(element, "opacity", number(pose.shadow.opacity));
  }
}

function makeController(root, initialOptions) {
  let options = initialOptions;
  let pointerLook = { x: 0, y: 0 };
  let state = retargetCompanion(
    createCompanionState({ ...options, seed: Math.random() }),
    options,
  );
  let clock = createMotionClock();
  let parts = collectParts(root);
  const pointerTarget = root.closest("button") || root;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = media.matches;
  let visible = !document.hidden;
  let intersecting = true;
  let disposed = false;
  let unsubscribe = null;

  function retarget() {
    state = retargetCompanion(state, {
      ...options,
      look: options.look ?? pointerLook,
    });
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;
    const bounds = root.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerLook = {
      x: Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
      ),
      y: Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
      ),
    };
    retarget();
  }

  function onPointerLeave() {
    pointerLook = { x: 0, y: 0 };
    retarget();
  }

  function onFocusIn() {
    pointerLook = { x: 0, y: -0.25 };
    retarget();
  }

  function onFocusOut(event) {
    if (event.relatedTarget && pointerTarget.contains(event.relatedTarget))
      return;
    onPointerLeave();
  }

  function updateFrame(timestamp) {
    clock = advanceMotionClock(clock, timestamp);
    state = advanceCompanion(state, clock.delta);
    paint(parts, companionPose(state));
  }

  function refresh() {
    const active =
      !disposed && visible && intersecting && !options.paused && !reduced;
    if (active && !unsubscribe) {
      clock = advanceMotionClock(clock, 0, false);
      unsubscribe = subscribe(updateFrame);
    } else if (!active && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      clock = advanceMotionClock(clock, 0, false);
    }
    if (reduced) paint(parts, staticCompanionPose(options));
  }

  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          ([entry]) => {
            if (disposed) return;
            intersecting = entry.isIntersecting;
            refresh();
          },
          { rootMargin: "40px" },
        )
      : null;
  observer?.observe(root);

  function onVisibility() {
    visible = !document.hidden;
    refresh();
  }

  function onMotionPreference(event) {
    reduced = event.matches;
    refresh();
  }

  document.addEventListener("visibilitychange", onVisibility);
  pointerTarget.addEventListener("pointermove", onPointerMove, {
    passive: true,
  });
  pointerTarget.addEventListener("pointerleave", onPointerLeave);
  pointerTarget.addEventListener("focusin", onFocusIn);
  pointerTarget.addEventListener("focusout", onFocusOut);
  media.addEventListener?.("change", onMotionPreference);
  // Older WebKit exposes MediaQueryList's original listener API.
  if (!media.addEventListener) media.addListener?.(onMotionPreference);

  paint(parts, reduced ? staticCompanionPose(options) : companionPose(state));
  refresh();

  return {
    update(nextOptions) {
      if (
        nextOptions.kind !== options.kind ||
        nextOptions.portrait !== options.portrait
      ) {
        parts = collectParts(root);
      }
      options = nextOptions;
      retarget();
      refresh();
    },
    dispose() {
      disposed = true;
      unsubscribe?.();
      unsubscribe = null;
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      pointerTarget.removeEventListener("pointermove", onPointerMove);
      pointerTarget.removeEventListener("pointerleave", onPointerLeave);
      pointerTarget.removeEventListener("focusin", onFocusIn);
      pointerTarget.removeEventListener("focusout", onFocusOut);
      media.removeEventListener?.("change", onMotionPreference);
      if (!media.removeEventListener)
        media.removeListener?.(onMotionPreference);
    },
  };
}

export default function useCompanionMotion({
  kind,
  mood = "happy",
  portrait = false,
  paused = false,
  reaction = 0,
  look = null,
}) {
  const rootRef = useRef(null);
  const controllerRef = useRef(null);
  const optionsRef = useRef(null);
  optionsRef.current = { kind, mood, portrait, paused, reaction, look };

  useEffect(() => {
    if (!rootRef.current) return undefined;
    const controller = makeController(rootRef.current, optionsRef.current);
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(optionsRef.current);
  }, [kind, mood, portrait, paused, reaction, look]);

  return rootRef;
}
