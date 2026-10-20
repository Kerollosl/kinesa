import { useId } from "react";
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

const artwork = "/characters/kinesa-companions-3d.png";
const atlas = { width: 1448, height: 1086 };
const poses = ["idle", "blink", "celebrate"];

// Keep the camera, character scale and feet fixed between expressions. The
// authored atlas has irregular gutters, so use explicit source windows rather
// than dividing it into a grid or independently fitting each pose to its box.
const frames = {
  lion: {
    center: 200,
    scale: 0.48,
    windows: [
      [25, 18, 350, 347],
      [25, 368, 350, 344],
      [20, 712, 365, 350],
    ],
  },
  ox: {
    center: 552,
    scale: 0.48,
    windows: [
      [390, 12, 325, 353],
      [390, 366, 325, 346],
      [390, 713, 324, 349],
    ],
  },
  eagle: {
    center: 914,
    scale: 0.46,
    windows: [
      [760, 35, 310, 333],
      [760, 382, 310, 330],
      [714, 713, 398, 349],
    ],
  },
  human: {
    center: 1274,
    scale: 0.48,
    windows: [
      [1120, 12, 310, 353],
      [1120, 366, 310, 346],
      [1120, 710, 310, 352],
    ],
  },
};
const footBaselines = [354, 704, 1051];

export default function Mascot({
  kind = "lion",
  className = "",
  mood = "happy",
  portrait = false,
  ...props
}) {
  const id = useId().replaceAll(":", "");
  const companion =
    MASCOTS.find((mascot) => mascot.kind === kind) || MASCOTS[0];
  const frame = frames[companion.kind];
  const offsetX = 100 - frame.center * frame.scale;

  return (
    <svg
      viewBox={portrait ? "40 28 120 120" : "0 0 200 200"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${companion.name}, the ${companion.kind} companion of ${companion.gospel}`}
      className={`mascot mascot-3d mascot-${companion.kind} ${portrait ? "mascot-portrait" : ""} ${className}`}
      data-mood={mood}
      {...props}
    >
      <defs>
        {frame.windows.map(([x, y, width, height], index) => (
          <clipPath id={`companion-${id}-${poses[index]}`} key={poses[index]}>
            <rect
              x={offsetX + x * frame.scale}
              y={180 + (y - footBaselines[index]) * frame.scale}
              width={width * frame.scale}
              height={height * frame.scale}
            />
          </clipPath>
        ))}
      </defs>
      {!portrait && (
        <ellipse
          className="mascot-shadow"
          cx="100"
          cy="182"
          rx="40"
          ry="5"
          fill="#705A75"
          opacity=".12"
        />
      )}
      <g className="mascot-body">
        {poses.map((pose, index) => (
          <g
            className={`mascot-render-${pose}`}
            clipPath={`url(#companion-${id}-${pose})`}
            key={pose}
          >
            <image
              href={artwork}
              x={offsetX}
              y={180 - footBaselines[index] * frame.scale}
              width={atlas.width * frame.scale}
              height={atlas.height * frame.scale}
              preserveAspectRatio="none"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
