import { forwardRef } from "react";
import { ArrowRight, EyeOff } from "lucide-react";
import Companion from "../Companion.jsx";
import { InterlaceRing } from "../Ornaments.jsx";
import { CategoryPips, Meter } from "./Pips.jsx";

// Full-screen cover between turns: nothing from the last turn shows through.
const Handoff = forwardRef(function Handoff(
  { player, note, onReady, showProgress = true },
  ref,
) {
  return (
    <section className="handoff" aria-labelledby="handoff-title">
      <div className="handoff-art">
        <svg viewBox="0 0 320 320" aria-hidden="true">
          <InterlaceRing radius={146} width={14} crossings={24} />
        </svg>
        <Companion kind={player.kind} act="wave" />
      </div>
      <p className="handoff-kicker">
        <EyeOff size={16} aria-hidden="true" /> Pass the phone
      </p>
      <h1 id="handoff-title" ref={ref} tabIndex={-1}>
        {player.name}’s turn
      </h1>
      {showProgress && player.won && (
        <div className="handoff-progress">
          <CategoryPips won={player.won} />
          <Meter value={player.meter} size="sm" />
        </div>
      )}
      {note && <p className="handoff-note">{note}</p>}
      <div className="play-actions">
        <button className="btn btn-go btn-xl btn-block" onClick={onReady}>
          I’m {player.name}
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
});
export default Handoff;
