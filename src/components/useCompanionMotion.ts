import { useEffect, useRef } from "react";
import type { CompanionKind } from "../types.ts";
import {
  advanceCompanion,
  advanceMotionClock,
  companionPose,
  createCompanionState,
  createMotionClock,
  retargetCompanion,
  staticCompanionPose,
} from "./companion-physics.ts";
import type {
  CompanionOptions,
  CompanionPose,
  JointName,
  LookTarget,
} from "./companion-physics.ts";
import { createCompanionSurface } from "./companion-surface.ts";
import type { JointTransform, Point } from "./companion-deformation.ts";

type FrameCallback = (timestamp: number) => void;

interface PartEntry {
  element: SVGElement;
  pivot: Point;
}

interface RigParts {
  joints: PartEntry[];
  lids: PartEntry[];
  lidLines: SVGElement[];
  shadows: PartEntry[];
  emotes: SVGElement[];
}

type MotionOptions = CompanionOptions & {
  kind: CompanionKind;
  portrait: boolean;
  softSurface: boolean;
};

export interface CompanionController {
  update(nextOptions: MotionOptions): void;
  dispose(): void;
}

// Every visible companion shares one RAF. Hidden tabs, offscreen characters,
// paused scenes, and reduced-motion users leave the scheduler entirely.
const subscribers = new Set<FrameCallback>();
let frameRequest: number | null = null;
const activityListeners = new Set<() => void>();
let activityObserver: MutationObserver | null = null;

function watchActivity(callback: () => void) {
  activityListeners.add(callback);
  if (!activityObserver) {
    activityObserver = new MutationObserver(() => {
      for (const listener of activityListeners) listener();
    });
    activityObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["inert"],
    });
  }
  return () => {
    activityListeners.delete(callback);
    if (!activityListeners.size) {
      activityObserver?.disconnect();
      activityObserver = null;
    }
  };
}

function runFrame(timestamp: number) {
  frameRequest = null;
  for (const callback of [...subscribers]) callback(timestamp);
  if (subscribers.size) frameRequest = requestAnimationFrame(runFrame);
}

function subscribe(callback: FrameCallback) {
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

function pivotFor(element: SVGElement): Point {
  const values = (element.dataset.pivot || "100 100")
    .trim()
    .split(/[ ,]+/)
    .map(Number);
  return {
    x: Number.isFinite(values[0]) ? values[0] : 100,
    y: Number.isFinite(values[1]) ? values[1] : 100,
  };
}

const number = (value: number) => Math.round(value * 1000) / 1000;

function writeAttribute(
  element: Element,
  name: string,
  value: string | number,
) {
  const next = String(value);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

function transformFor(pose: JointTransform, pivot: Point) {
  const x = number(pose.x || 0);
  const y = number(pose.y || 0);
  const r = number(pose.r || 0);
  const sx = number(pose.sx ?? 1);
  const sy = number(pose.sy ?? 1);
  return `translate(${x} ${y}) translate(${pivot.x} ${pivot.y}) rotate(${r}) scale(${sx} ${sy}) translate(${-pivot.x} ${-pivot.y})`;
}

function collectParts(root: SVGSVGElement): RigParts {
  const entries = (selector: string): PartEntry[] =>
    [...root.querySelectorAll<SVGElement>(selector)].map((element) => ({
      element,
      pivot: pivotFor(element),
    }));
  return {
    joints: entries("[data-joint]"),
    lids: entries("[data-lid]"),
    lidLines: [...root.querySelectorAll<SVGElement>("[data-lid-line]")],
    shadows: entries("[data-contact-shadow]"),
    emotes: [...root.querySelectorAll<SVGElement>("[data-emote]")],
  };
}

function paint(parts: RigParts, pose: CompanionPose) {
  for (const { element, pivot } of parts.joints) {
    // data-joint values are authored in Mascot; unknown names simply miss.
    const joint = pose.joints[element.dataset.joint as JointName] as
      JointTransform | undefined;
    if (joint) writeAttribute(element, "transform", transformFor(joint, pivot));
  }
  for (const { element, pivot } of parts.lids) {
    const blink =
      (element.dataset.eye === "1" ? pose.blinkRight : pose.blinkLeft) ??
      pose.blink;
    writeAttribute(element, "visibility", blink > 0.001 ? "visible" : "hidden");
    writeAttribute(element, "transform", transformFor({ sy: blink }, pivot));
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
  for (const element of parts.emotes) {
    const index = Number(element.dataset.index);
    const emote = element.dataset.emote;
    const strength =
      (emote === "hearts" || emote === "sparkles" ? pose.effects[emote] : 0) ||
      0;
    if (strength < 0.001) {
      writeAttribute(element, "opacity", 0);
      continue;
    }
    const phase = pose.effects.phase || 0;
    const heart = element.dataset.emote === "hearts";
    const drift = (phase * (heart ? 0.42 : 0.34) + index * 0.27) % 1;
    const alpha = strength * Math.sin(drift * Math.PI);
    const x = 100 + Math.sin(index * 2.7 + phase * 0.5) * (heart ? 56 : 72);
    const y = (heart ? 92 : 108) - drift * (heart ? 66 : 94);
    writeAttribute(element, "opacity", number(Math.max(0, alpha)));
    writeAttribute(
      element,
      "transform",
      transformFor(
        {
          x,
          y,
          r: Math.sin(phase + index) * 14,
          sx: 0.45 + alpha * 0.3,
          sy: 0.45 + alpha * 0.3,
        },
        { x: 0, y: 0 },
      ),
    );
  }
}

function makeController(
  root: SVGSVGElement,
  initialOptions: MotionOptions,
): CompanionController {
  let options = initialOptions;
  let pointerLook: LookTarget = { x: 0, y: 0 };
  let state = retargetCompanion(
    createCompanionState({ ...options, seed: Math.random() }),
    options,
  );
  let clock = createMotionClock();
  let parts = collectParts(root);
  // Cast: the SVG root only needs the shared EventTarget/Node surface, but the
  // union of element types cannot pick a typed addEventListener overload.
  const pointerTarget = (root.closest("button") || root) as HTMLElement;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = media.matches;
  let visible = !document.hidden;
  let intersecting = true;
  let disposed = false;
  let unsubscribe: (() => void) | null = null;
  let touchActive = false;
  let surface: ReturnType<typeof createCompanionSurface> | null = null;

  function drawPose(pose: CompanionPose) {
    paint(parts, pose);
    surface?.draw(pose);
  }

  function retarget() {
    state = retargetCompanion(state, {
      ...options,
      look: options.look ?? pointerLook,
    });
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType === "touch" && !touchActive) return;
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
    touchActive = false;
    pointerLook = { x: 0, y: 0 };
    retarget();
  }

  function onPointerDown(event: PointerEvent) {
    touchActive = true;
    onPointerMove(event);
  }

  function onPointerUp(event: PointerEvent) {
    touchActive = false;
    if (event.pointerType === "touch") onPointerLeave();
  }

  function onFocusIn() {
    pointerLook = { x: 0, y: -0.25 };
    retarget();
  }

  function onFocusOut(event: FocusEvent) {
    if (
      event.relatedTarget instanceof Node &&
      pointerTarget.contains(event.relatedTarget)
    )
      return;
    onPointerLeave();
  }

  function updateFrame(timestamp: number) {
    clock = advanceMotionClock(clock, timestamp);
    state = advanceCompanion(state, clock.delta);
    drawPose(companionPose(state));
  }

  function refresh() {
    if (!reduced && !options.portrait && options.softSurface && !surface) {
      surface = createCompanionSurface(root, options.kind);
      surface?.draw(companionPose(state));
    }
    surface?.setEnabled(!reduced && !options.portrait && options.softSurface);
    const active =
      !disposed &&
      visible &&
      intersecting &&
      !root.closest("[inert]") &&
      !options.paused &&
      !reduced;
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
  const stopWatchingActivity = watchActivity(refresh);

  function onVisibility() {
    visible = !document.hidden;
    refresh();
  }

  function onMotionPreference(event: MediaQueryListEvent) {
    reduced = event.matches;
    refresh();
  }

  document.addEventListener("visibilitychange", onVisibility);
  pointerTarget.addEventListener("pointermove", onPointerMove, {
    passive: true,
  });
  pointerTarget.addEventListener("pointerleave", onPointerLeave);
  pointerTarget.addEventListener("pointerdown", onPointerDown, {
    passive: true,
  });
  pointerTarget.addEventListener("pointerup", onPointerUp, { passive: true });
  pointerTarget.addEventListener("pointercancel", onPointerLeave, {
    passive: true,
  });
  pointerTarget.addEventListener("focusin", onFocusIn);
  pointerTarget.addEventListener("focusout", onFocusOut);
  media.addEventListener?.("change", onMotionPreference);
  // Older WebKit exposes MediaQueryList's original listener API.
  if (!media.addEventListener) media.addListener?.(onMotionPreference);

  paint(parts, reduced ? staticCompanionPose(options) : companionPose(state));
  refresh();

  return {
    update(nextOptions: MotionOptions) {
      if (
        nextOptions.kind !== options.kind ||
        nextOptions.portrait !== options.portrait ||
        nextOptions.softSurface !== options.softSurface
      ) {
        surface?.dispose();
        surface = null;
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
      stopWatchingActivity();
      surface?.dispose();
      document.removeEventListener("visibilitychange", onVisibility);
      pointerTarget.removeEventListener("pointermove", onPointerMove);
      pointerTarget.removeEventListener("pointerleave", onPointerLeave);
      pointerTarget.removeEventListener("pointerdown", onPointerDown);
      pointerTarget.removeEventListener("pointerup", onPointerUp);
      pointerTarget.removeEventListener("pointercancel", onPointerLeave);
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
  softSurface = true,
  paused = false,
  reaction = 0,
  action = "hello",
  dancing = false,
  look = null,
}: MotionOptions) {
  const rootRef = useRef<SVGSVGElement>(null);
  const controllerRef = useRef<CompanionController | null>(null);
  const options: MotionOptions = {
    kind,
    mood,
    portrait,
    softSurface,
    paused,
    reaction,
    action,
    dancing,
    look,
  };
  const optionsRef = useRef(options);
  optionsRef.current = options;

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
  }, [
    kind,
    mood,
    portrait,
    softSurface,
    paused,
    reaction,
    action,
    dancing,
    look,
  ]);

  return rootRef;
}
