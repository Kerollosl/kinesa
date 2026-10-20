import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Cross } from "lucide-react";
import Mascot from "./Mascot.jsx";
import Wheel from "./Wheel.jsx";
import { categories } from "../data.js";
import "./game-scene.css";

const crew = [
  {
    kind: "human",
    name: "Mattie",
    line: "Good to see you!",
    replies: [
      "Good to see you!",
      "Curiosity looks good on you.",
      "Ready when you are.",
    ],
    className: "gs-mattie",
  },
  {
    kind: "eagle",
    name: "Juno",
    line: "Ready to soar?",
    replies: [
      "Ready to soar?",
      "I’ve got a good feeling.",
      "High-five. Higher flight.",
    ],
    className: "gs-juno",
  },
  {
    kind: "ox",
    name: "Lou",
    line: "You’ve got this.",
    replies: [
      "You’ve got this.",
      "Slow and steady. Smart and ready.",
      "Always on your team.",
    ],
    className: "gs-lou",
  },
  {
    kind: "lion",
    name: "Leo",
    line: "Let’s play!",
    replies: ["Let’s play!", "Brave guesses welcome.", "A roaring good start."],
    className: "gs-leo",
  },
];

export default function GameScene({
  compact = false,
  paused = false,
  onPreview,
}) {
  const id = useId().replaceAll(":", "");
  const [reaction, setReaction] = useState(null);
  const [rotation, setRotation] = useState(-16);
  const [spinning, setSpinning] = useState(false);
  const [party, setParty] = useState(0);
  const timer = useRef(null);
  const spinTimer = useRef(null);
  const reactionId = useRef(0);
  const greetings = useRef({});
  const rotationRef = useRef(-16);
  const spinLocked = useRef(false);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(spinTimer.current);
    },
    [],
  );

  function cheer(member) {
    clearTimeout(timer.current);
    const count = greetings.current[member.kind] || 0;
    greetings.current[member.kind] = count + 1;
    setReaction({
      ...member,
      line: member.replies[count % member.replies.length],
      id: ++reactionId.current,
    });
    timer.current = setTimeout(() => setReaction(null), 2600);
  }
  function spin() {
    if (spinLocked.current) return;
    spinLocked.current = true;
    clearTimeout(timer.current);
    setReaction(null);
    setSpinning(true);
    const index = Math.floor(Math.random() * categories.length);
    const target = (360 - (index * 60 + 30)) % 360;
    const value = rotationRef.current;
    const nextRotation = value + (360 - (value % 360)) + 720 + target;
    rotationRef.current = nextRotation;
    setRotation(nextRotation);
    setParty((value) => value + 1);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    spinTimer.current = setTimeout(
      () => {
        setSpinning(false);
        spinLocked.current = false;
        onPreview?.(categories[index]);
      },
      reduced ? 180 : 2800,
    );
  }

  return (
    <div
      className={`game-scene ${compact ? "game-scene-compact" : ""} ${spinning ? "gs-party" : ""} ${paused ? "gs-motion-paused" : ""}`}
    >
      <div className="gs-floor-shadow" aria-hidden="true" />
      <svg
        className="gs-platform"
        viewBox="0 0 600 190"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`stage-side-${id}`}
            x1="30"
            y1="120"
            x2="570"
            y2="120"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B5A5EC" />
            <stop offset=".4" stopColor="#D1C5F8" />
            <stop offset="1" stopColor="#9485D5" />
          </linearGradient>
          <linearGradient
            id={`stage-top-${id}`}
            x1="300"
            y1="12"
            x2="300"
            y2="145"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FCFBFF" />
            <stop offset="1" stopColor="#DDD6F9" />
          </linearGradient>
        </defs>
        <path
          d="M30 80V103C30 142 151 173 300 173C449 173 570 142 570 103V80"
          fill={`url(#stage-side-${id})`}
        />
        <ellipse
          cx="300"
          cy="80"
          rx="270"
          ry="70"
          fill={`url(#stage-top-${id})`}
        />
        <path
          d="M31 83C38 119 155 149 300 149C444 149 560 120 569 84"
          stroke="white"
          strokeWidth="2"
          opacity=".75"
        />
        <ellipse
          cx="300"
          cy="81"
          rx="185"
          ry="39"
          fill="#C6BBEC"
          opacity=".24"
        />
      </svg>
      <div className="gs-wheel-support" aria-hidden="true" />
      <button
        type="button"
        className="gs-wheel-button"
        onClick={spin}
        aria-label="Give the trivia wheel a practice spin"
        disabled={spinning}
      >
        <Wheel rotation={rotation} spinning={spinning} decorative />
        <span className="gs-wheel-caption">
          {spinning ? "Spinning…" : "Practice spin"}
        </span>
      </button>
      <div className="gs-token gs-token-book" aria-hidden="true">
        <BookOpen size={25} strokeWidth={1.8} />
      </div>
      <div className="gs-token gs-token-cross" aria-hidden="true">
        <Cross size={24} strokeWidth={1.8} />
      </div>
      <span className="gs-pebble gs-pebble-one" aria-hidden="true" />
      <span className="gs-pebble gs-pebble-two" aria-hidden="true" />
      {crew.map((member) => {
        const active = reaction?.kind === member.kind;
        return (
          <button
            type="button"
            key={member.kind}
            className={`gs-character ${member.className} ${active ? "gs-cheering" : ""}`}
            onClick={() => cheer(member)}
            aria-label={`High-five ${member.name}`}
          >
            <span className="gs-character-shadow" aria-hidden="true" />
            <span
              key={`art-${active ? reaction.id : party}`}
              className="gs-character-art"
            >
              <Mascot kind={member.kind} aria-hidden="true" />
            </span>
            {active && (
              <span className="gs-reaction" key={`bubble-${reaction.id}`}>
                {reaction.line}
              </span>
            )}
          </button>
        );
      })}
      <span className="gs-screen-reader" role="status">
        {reaction
          ? `${reaction.name}: ${reaction.line}`
          : spinning
            ? "The practice wheel is spinning!"
            : ""}
      </span>
    </div>
  );
}
