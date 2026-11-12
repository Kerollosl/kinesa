import { forwardRef } from "react";
import { ArrowRight, BookOpen, Flame, Sparkles, Timer } from "lucide-react";
import Mascot from "../Mascot.jsx";
import { TIMEOUT, comboFor } from "../../engine.js";

const names = (list) =>
  list.length <= 2
    ? list.join(" and ")
    : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

// What the rest of the table did, in one line.
function rivalsLine(game, focus) {
  const others = game.players.filter((_, i) => i !== focus);
  const right = others
    .filter((p) => game.answers?.[game.players.indexOf(p)]?.correct)
    .map((p) => p.name);
  const mine = game.answers?.[focus]?.correct;
  if (!others.length) return null;
  if (right.length === others.length)
    return mine ? "Everyone got this one." : `${names(right)} got it.`;
  if (!right.length)
    return mine ? "Only you got this one!" : "Nobody got this one.";
  return `${names(right)} got it${mine ? " too" : ""}.`;
}

const AnswerFeedback = forwardRef(function AnswerFeedback(
  { game, focus, simultaneous, nextLabel, onNext },
  ref,
) {
  const q = game.question;
  const player = game.players[focus];
  const entry = game.answers?.[focus];
  const correct = !!entry?.correct;
  const timedOut = entry?.choice === TIMEOUT;
  const combo =
    game.settings?.combo === false ? 1 : comboFor(entry?.streak || 0);
  const heading = correct ? "Correct!" : timedOut ? "Time’s up" : "Not quite";
  return (
    <div
      className={`answer-reveal ${correct ? "is-correct" : timedOut ? "is-timeout" : "is-wrong"}`}
      role="status"
      ref={ref}
      tabIndex={-1}
    >
      <div className="feedback-heading">
        <div className="reveal-mascot" aria-hidden="true">
          <Mascot kind={player.kind} mood={correct ? "celebrate" : "happy"} />
        </div>
        <div className="feedback-title">
          <h2>
            {heading}
            {!simultaneous && (
              <span className="feedback-who">{player.name}</span>
            )}
          </h2>
          <div className="feedback-chips">
            {correct ? (
              <span className="feedback-points">
                <Sparkles size={14} aria-hidden="true" />+{entry.points}
              </span>
            ) : timedOut ? (
              <span className="feedback-chip">
                <Timer size={14} aria-hidden="true" /> No answer
              </span>
            ) : null}
            {correct && combo > 1 && (
              <span className="feedback-chip is-combo">×{combo} combo</span>
            )}
            {correct && entry.streak >= 2 && (
              <span className="feedback-chip is-streak">
                <Flame size={14} aria-hidden="true" />
                {entry.streak} in a row
              </span>
            )}
          </div>
        </div>
      </div>
      {simultaneous && (
        <p className="feedback-rivals sr-only">{rivalsLine(game, focus)}</p>
      )}
      <section className="did-you-know" aria-labelledby="did-you-know-title">
        <h3 id="did-you-know-title">Did you know?</h3>
        <p>{q.explanation}</p>
        <span className="did-you-know-source">
          <BookOpen size={14} aria-hidden="true" />
          <span className="sr-only">Source: </span>
          {q.source}
        </span>
      </section>
      <button className="primary-button" onClick={onNext}>
        {nextLabel}
        <ArrowRight size={18} />
      </button>
    </div>
  );
});
export default AnswerFeedback;
