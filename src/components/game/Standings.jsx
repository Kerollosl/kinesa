import { forwardRef } from "react";
import { ArrowRight, Check, Flame, Trophy } from "lucide-react";
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
      <div className="standings-body">
        <header className="standings-head">
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
        </header>
        <ol className="rank-list">
          {sorted.map((p, index) => {
            const rank = rankOf(game.players, p);
            const top = rank === 1 && leader.score > 0;
            return (
              <li key={p.kind} style={{ "--row": index }}>
                <div className={`rank-row is-static ${top ? "is-winner" : ""}`}>
                  <span className="rank-pos">
                    <span className="sr-only">{rank}</span>
                    <span aria-hidden="true">
                      {top ? <Trophy size={18} /> : rank}
                    </span>
                  </span>
                  <span className="rank-avatar">
                    <Mascot kind={p.kind} portrait />
                  </span>
                  <span className="rank-name">
                    <strong>{p.name}</strong>
                  </span>
                  <span
                    className="rank-correct"
                    aria-label={`${p.correct} correct`}
                  >
                    <Check size={14} aria-hidden="true" />
                    {p.correct}
                  </span>
                  {p.streak >= 2 ? (
                    <span
                      className="rank-streak"
                      aria-label={`${p.streak} in a row`}
                    >
                      <Flame size={14} aria-hidden="true" />
                      {p.streak}
                    </span>
                  ) : (
                    <span className="rank-streak" aria-hidden="true" />
                  )}
                  <span className="rank-points">{p.score}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="action-bar">
        <div className="action-bar-row">
          <button className="primary-button" onClick={onContinue}>
            Next round · {round} of {rounds} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
});
export default Standings;
