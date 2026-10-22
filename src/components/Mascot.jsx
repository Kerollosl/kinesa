import { useId } from "react";
import useCompanionMotion from "./useCompanionMotion.js";
import { COMPANION_RIGS, RIG_ARTWORK, rigPlacement } from "./companion-rig.js";
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

function RigPart({ part, id }) {
  const placement = rigPlacement(part);
  const art = RIG_ARTWORK[part.art || "parts"];
  const { x, y, width, height } = placement;
  const clip =
    part.outline === "ox-head"
      ? `M${x} ${y}h${width * 0.35}v9h${width * 0.35}v-9H${x + width}v${height}H${x + 4}v${-height * 0.51}H${x}Z`
      : part.trimCorners
        ? `M${x + 1.8} ${y}H${x + width}v${height - 7}h${-width * 0.25}v7h${-width * 0.5}v-7H${x + 1.8}Z`
        : null;
  return (
    <g className="companion-painted-part">
      <defs>
        <clipPath id={id}>
          {clip ? (
            <path d={clip} />
          ) : (
            <rect x={x} y={y} width={width} height={height} />
          )}
        </clipPath>
      </defs>
      <image
        href={art.href}
        x={placement.imageX}
        y={placement.imageY}
        width={art.width * placement.scale}
        height={art.height * placement.scale}
        preserveAspectRatio="none"
        clipPath={`url(#${id})`}
      />
    </g>
  );
}

function Eyelids({ rig, id }) {
  const art = RIG_ARTWORK.eyelids;
  return rig.eyes.map((eye, index) => {
    const [sourceX, sourceY] = rig.blink.centers[index];
    const scale = rig.blink.scale;
    return (
      <g key={index}>
        <defs>
          <radialGradient id={`${id}-lid-feather-${index}`}>
            <stop offset="0" stopColor="white" />
            <stop offset=".8" stopColor="white" />
            <stop offset="1" stopColor="black" />
          </radialGradient>
          <mask id={`${id}-lid-mask-${index}`}>
            <ellipse
              cx={eye.x}
              cy={eye.y}
              rx={eye.rx * 1.28}
              ry={eye.ry * 1.28}
              fill={`url(#${id}-lid-feather-${index})`}
            />
          </mask>
        </defs>
        <g
          data-lid
          visibility="hidden"
          data-pivot={`${eye.x} ${eye.y - eye.ry}`}
          transform={`translate(0 ${eye.y - eye.ry}) scale(1 0) translate(0 ${-eye.y + eye.ry})`}
        >
          <image
            href={art.href}
            x={eye.x - sourceX * scale}
            y={eye.y + 3 - sourceY * scale}
            width={art.width * scale}
            height={art.height * scale}
            mask={`url(#${id}-lid-mask-${index})`}
            preserveAspectRatio="none"
          />
        </g>
      </g>
    );
  });
}

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
  const id = useId().replaceAll(":", "");
  const companion =
    MASCOTS.find((mascot) => mascot.kind === kind) || MASCOTS[0];
  const rig = COMPANION_RIGS[companion.kind];
  const rootRef = useCompanionMotion({
    kind: companion.kind,
    mood,
    portrait,
    paused,
    reaction,
    look,
  });
  const joint = (name) => ({
    "data-joint": name,
    "data-pivot": rig.pivots[name].join(" "),
  });
  return (
    <svg
      ref={rootRef}
      viewBox={portrait ? "40 28 120 120" : "0 0 200 200"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${companion.name}, the ${companion.kind} companion of ${companion.gospel}`}
      className={`mascot mascot-rig mascot-${companion.kind} ${portrait ? "mascot-portrait" : ""} ${className}`}
      data-renderer="painted"
      data-mood={mood}
      {...props}
    >
      {!portrait && (
        <ellipse
          className="mascot-shadow"
          data-contact-shadow
          data-pivot="100 183"
          cx="100"
          cy="183"
          rx="37"
          ry="4.2"
          fill="#705A75"
          opacity=".12"
        />
      )}
      <g className="mascot-body" data-joint="body" data-pivot="100 181">
        <g {...joint("wingLeft")}>
          <RigPart part={rig.wingLeft} id={`${id}-wing-left`} />
        </g>
        <g {...joint("wingRight")}>
          <RigPart part={rig.wingRight} id={`${id}-wing-right`} />
        </g>
        <RigPart part={rig.body} id={`${id}-torso`} />
        <g {...joint("armLeft")}>
          <RigPart part={rig.armLeft} id={`${id}-arm-left`} />
        </g>
        <g {...joint("armRight")}>
          <RigPart part={rig.armRight} id={`${id}-arm-right`} />
        </g>
        {rig.collar && (
          <g>
            <defs>
              <linearGradient
                id={`${id}-collar-fade`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor="white" />
                <stop offset=".75" stopColor="white" />
                <stop offset="1" stopColor="black" />
              </linearGradient>
              <mask id={`${id}-collar-mask`}>
                <rect
                  x={rig.collar[0]}
                  y={rig.collar[1]}
                  width={rig.collar[2]}
                  height={rig.collar[3]}
                  fill={`url(#${id}-collar-fade)`}
                />
              </mask>
            </defs>
            <g mask={`url(#${id}-collar-mask)`}>
              <RigPart part={rig.body} id={`${id}-collar`} />
            </g>
          </g>
        )}
        <g {...joint("head")}>
          <RigPart part={rig.head} id={`${id}-head`} />
          <Eyelids rig={rig} id={id} />
          {companion.kind === "human" && (
            <g data-joint="halo" data-pivot="100 18">
              <defs>
                <linearGradient
                  id={`${id}-halo`}
                  x1="70"
                  y1="13"
                  x2="130"
                  y2="23"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#FFF1B0" />
                  <stop offset=".4" stopColor="#E5AE37" />
                  <stop offset="1" stopColor="#BA7820" />
                </linearGradient>
              </defs>
              <ellipse
                cx="100"
                cy="18"
                rx="27"
                ry="7"
                transform="rotate(-8 100 18)"
                stroke={`url(#${id}-halo)`}
                strokeWidth="5"
              />
              <path
                d="M75 19Q89 7 121 12"
                stroke="#FFF1AE"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
