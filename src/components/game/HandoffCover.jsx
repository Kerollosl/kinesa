import { forwardRef } from "react";
import { ArrowRight, EyeOff } from "lucide-react";
import Mascot, { MASCOTS } from "../Mascot.jsx";
import { InterlaceRing } from "../Ornaments.jsx";

// Full-bleed cover between turns: nothing from the last turn shows through.
const HandoffCover = forwardRef(function HandoffCover(
  { player, round, rounds, onReady },
  ref,
) {
  const companion = MASCOTS.find((m) => m.kind === player.kind);
  return (
    <section
      className="handoff-stage handoff-cover"
      style={{
        "--companion-bg": companion.bg,
        "--companion-color": companion.color,
      }}
      aria-labelledby="handoff-title"
    >
      <div className="handoff-avatar">
        <svg className="handoff-ring" viewBox="0 0 320 320" aria-hidden="true">
          <InterlaceRing radius={146} width={14} crossings={24} />
        </svg>
        <Mascot kind={player.kind} mood="celebrate" />
      </div>
      <h1 id="handoff-title" ref={ref} tabIndex={-1}>
        Pass to {player.name}.
      </h1>
      <p className="handoff-note">
        <EyeOff size={16} aria-hidden="true" /> Questions stay hidden until{" "}
        {player.name} is ready.
      </p>
      <button className="primary-button" onClick={onReady}>
        I’m {player.name} — let’s play <ArrowRight size={20} />
      </button>
      <span className="handoff-footnote">
        Round {round} of {rounds} · {player.score} points so far
      </span>
    </section>
  );
});
export default HandoffCover;
