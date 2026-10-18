import { useEffect, useRef, useState } from "react";
import { BookOpen, Cross, Sparkles, Zap } from "lucide-react";
import Mascot from "./Mascot.jsx";
import Wheel from "./Wheel.jsx";
import "./game-scene.css";

const crew = [
  {
    kind: "human",
    name: "Mattie",
    line: "Oh, it’s ON!",
    className: "gs-mattie",
  },
  { kind: "eagle", name: "Juno", line: "Born to soar!", className: "gs-juno" },
  { kind: "ox", name: "Lou", line: "Let’s do this!", className: "gs-lou" },
  { kind: "lion", name: "Leo", line: "Bring it on!", className: "gs-leo" },
];

export default function GameScene({ compact = false }) {
  const [reaction, setReaction] = useState(null);
  const [rotation, setRotation] = useState(-16);
  const [spinning, setSpinning] = useState(false);
  const [party, setParty] = useState(0);
  const timer = useRef(null);
  const spinTimer = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(spinTimer.current);
    },
    [],
  );

  function cheer(member) {
    clearTimeout(timer.current);
    setReaction({ ...member, id: Date.now() });
    timer.current = setTimeout(() => setReaction(null), 1900);
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setRotation((value) => value + 720 + 60);
    setParty((value) => value + 1);
    spinTimer.current = setTimeout(() => setSpinning(false), 2800);
  }

  return (
    <div
      className={`game-scene ${compact ? "game-scene-compact" : ""} ${spinning ? "gs-party" : ""}`}
    >
      <div className="gs-backdrop" aria-hidden="true">
        <div className="gs-backdrop-circle" />
        <div className="gs-orbit gs-orbit-one" />
        <div className="gs-orbit gs-orbit-two" />
      </div>
      <div className="gs-sticker">
        <Zap size={16} fill="currentColor" /> SMALL CREW. BIG ENERGY.
      </div>
      <svg
        className="gs-platform"
        viewBox="0 0 600 190"
        fill="none"
        aria-hidden="true"
      >
        <ellipse
          cx="300"
          cy="124"
          rx="272"
          ry="57"
          fill="#182D42"
          opacity=".15"
        />
        <path
          d="M30 80V106C30 146 151 177 300 177C449 177 570 146 570 106V80"
          fill="#497BB4"
          stroke="#182D42"
          strokeWidth="5"
        />
        <path
          d="M91 121V146M163 140V163M251 149V175M348 149V175M437 140V163M510 121V146"
          stroke="#182D42"
          strokeWidth="4"
        />
        <ellipse
          cx="300"
          cy="80"
          rx="270"
          ry="70"
          fill="#D7F960"
          stroke="#182D42"
          strokeWidth="5"
        />
        <ellipse
          cx="300"
          cy="79"
          rx="239"
          ry="54"
          stroke="#182D42"
          strokeWidth="2.5"
          strokeDasharray="9 9"
          opacity=".6"
        />
        <ellipse cx="300" cy="79" rx="200" ry="38" fill="#C0E64D" />
        <path
          d="M49 77Q73 48 118 41M478 119Q523 109 546 90"
          stroke="#F2FFAD"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      <div className="gs-wheel-support" aria-hidden="true" />
      <button
        className="gs-wheel-button"
        onClick={spin}
        aria-label="Give the trivia wheel a practice spin"
        disabled={spinning}
      >
        <Wheel rotation={rotation} spinning={spinning} decorative />
        <span className="gs-wheel-caption">
          {spinning ? "WOOHOO!" : "SPIN ME"}
        </span>
      </button>

      <div className="gs-token gs-token-book" aria-hidden="true">
        <BookOpen size={28} strokeWidth={2.5} />
        <i />
      </div>
      <div className="gs-token gs-token-cross" aria-hidden="true">
        <Cross size={26} strokeWidth={2.5} />
        <i />
      </div>
      <div className="gs-token gs-token-star" aria-hidden="true">
        <Sparkles size={26} strokeWidth={2.5} />
        <i />
      </div>

      {crew.map((member) => {
        const active = reaction?.kind === member.kind;
        return (
          <button
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
                {member.line}
                <span>✦</span>
              </span>
            )}
          </button>
        );
      })}

      <svg
        className="gs-spark gs-spark-a"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M20 2L25 15L38 20L25 25L20 38L15 25L2 20L15 15Z"
          fill="#FF8168"
          stroke="#182D42"
          strokeWidth="2.5"
        />
      </svg>
      <svg
        className="gs-spark gs-spark-b"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M20 2L25 15L38 20L25 25L20 38L15 25L2 20L15 15Z"
          fill="#D7F960"
          stroke="#182D42"
          strokeWidth="2.5"
        />
      </svg>
      <div className="gs-confetti gs-confetti-one" aria-hidden="true" />
      <div className="gs-confetti gs-confetti-two" aria-hidden="true" />
      <div className="gs-confetti gs-confetti-three" aria-hidden="true" />
      <div className="gs-footer-sticker" aria-hidden="true">
        <span>4</span> GOSPELS.
        <br />
        <span>1</span> GOOD TIME.
      </div>
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
