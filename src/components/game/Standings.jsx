import { forwardRef } from "react";
import { ArrowRight } from "lucide-react";
import Mascot from "../Mascot.jsx";
import { rankOf } from "../../engine.js";

// Between rounds of pass-and-play: who leads, before the next player takes the phone.
const Standings = forwardRef(function Standings(
  { game, round, rounds, onContinue },
  ref,
) {
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  const tied = sorted.filter((p) => p.score === leader.score).length > 1;
  return (
    <section className="standings-stage" aria-labelledby="standings-title">
      <h1 id="standings-title" ref={ref} tabIndex={-1}>
        Round {round - 1} done.
      </h1>
      <p className="standings-lead">
        {leader.score === 0
          ? "Still all square. Anything can happen."
          : tied
            ? "It’s a tie at the top."
            : `${leader.name} leads with ${leader.score} points.`}
      </p>
      <ol className="standings-list">
        {sorted.map((p) => (
          <li key={p.kind}>
            <span className="standings-rank">{rankOf(game.players, p)}</span>
            <span className="standings-avatar">
              <Mascot kind={p.kind} portrait />
            </span>
            <span className="standings-name">
              <strong>{p.name}</strong>
              <span>
                {p.correct} correct
                {p.streak >= 2 ? ` · ${p.streak} in a row` : ""}
              </span>
            </span>
            <strong className="standings-score">{p.score}</strong>
          </li>
        ))}
      </ol>
      <button className="primary-button" onClick={onContinue}>
        Next round · {round} of {rounds} <ArrowRight size={18} />
      </button>
    </section>
  );
});
export default Standings;
