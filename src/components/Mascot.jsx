import { useEffect, useRef } from "react";
import "./companion-motion.css";

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

export default function Mascot({
  kind = "lion",
  className = "",
  mood = "happy",
  portrait = false,
  paused = false,
  reaction = 0,
  look = null,
  ...props
}) {
  const companion =
    MASCOTS.find((mascot) => mascot.kind === kind) || MASCOTS[0];
  const host = useRef(null);
  const surface = useRef(null);
  const controller = useRef(null);
  const options = useRef({});
  options.current = { mood, portrait, paused, reaction, look };

  useEffect(() => {
    let cancelled = false;
    const element = host.current;
    element.dataset.renderer = "loading";
    // Each mount owns a fresh canvas: transferControlToOffscreen is one-shot,
    // including during StrictMode, identity changes and hot reloads.
    const canvas = document.createElement("canvas");
    canvas.className = "companion-canvas";
    canvas.width = canvas.height = 200;
    canvas.setAttribute("aria-hidden", "true");
    surface.current.append(canvas);
    import("../three/renderer.js")
      .then(({ mountCompanion }) => {
        if (cancelled) return;
        controller.current = mountCompanion({
          host: element,
          canvas,
          kind: companion.kind,
          options: options.current,
          onError: () => {
            element.dataset.renderer = "poster";
          },
        });
      })
      .catch(() => {
        if (!cancelled) element.dataset.renderer = "poster";
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
      canvas.remove();
    };
  }, [companion.kind]);

  useEffect(() => {
    controller.current?.update(options.current);
  }, [mood, portrait, paused, reaction, look]);

  return (
    <svg
      ref={host}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${companion.name}, the ${companion.kind} companion of ${companion.gospel}`}
      className={`mascot mascot-3d mascot-webgl mascot-${companion.kind} ${portrait ? "mascot-portrait" : ""} ${className}`}
      data-mood={mood}
      {...props}
    >
      <foreignObject x="0" y="0" width="200" height="200">
        <div
          ref={surface}
          className="companion-surface"
          xmlns="http://www.w3.org/1999/xhtml"
        >
          <img
            className="companion-poster"
            src={`/characters/${companion.kind}-3d.png`}
            alt=""
            aria-hidden="true"
          />
        </div>
      </foreignObject>
    </svg>
  );
}
