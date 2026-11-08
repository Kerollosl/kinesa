import { Check, Flame } from "lucide-react";
import Mascot, { MASCOTS } from "../Mascot.jsx";
import { TIMEOUT } from "../../engine.js";

// Live state for each chip: thinking → locked in → cheer or groan on reveal.
function chipState(game, i, focus, simultaneous) {
  const answer = game.answers?.[i];
  if (game.phase === "question") {
    if (simultaneous) return answer ? "locked" : "thinking";
    return i === focus ? "thinking" : "idle";
  }
  if (game.phase === "reveal" && answer)
    return answer.correct ? "cheer" : "groan";
  return "idle";
}
const bubble = (state, answer) =>
  state === "cheer"
    ? `+${answer.points}`
    : state === "groan"
      ? answer.choice === TIMEOUT
        ? "Time!"
        : "Missed"
      : null;

export default function ScoreChips({
  game,
  focus,
  simultaneous,
  finished,
  onInspectPlayer,
}) {
  return (
    <div
      className="scoreboard score-chips"
      style={{ "--player-count": game.players.length }}
    >
      {game.players.map((p, i) => {
        const state = finished
          ? "idle"
          : chipState(game, i, focus, simultaneous);
        const answer = game.answers?.[i];
        const current = !finished && !simultaneous && i === focus;
        const label = {
          thinking: simultaneous ? "thinking" : "answering",
          locked: "locked in",
          cheer: `correct, plus ${answer?.points} points`,
          groan: answer?.choice === TIMEOUT ? "ran out of time" : "missed",
          idle: current ? "up now" : "",
        }[state];
        return (
          <button
            key={p.kind}
            onClick={() => onInspectPlayer(p)}
            title={`Meet ${MASCOTS.find((m) => m.kind === p.kind).name}, ${p.name}’s companion`}
            className={`score-player state-${state} ${current ? "current" : ""} ${simultaneous && i === focus ? "is-you" : ""}`}
            aria-label={`${p.name}${p.isBot ? " (practice bot)" : ""}: ${p.score} points${label ? `, ${label}` : ""}. View companion`}
          >
            <span className="score-avatar">
              <Mascot kind={p.kind} portrait />
            </span>
            <span className="chip-copy">
              <strong title={p.name}>
                {p.name}
                {p.isBot && <small className="bot-tag">BOT</small>}
              </strong>
              <span className="chip-score">
                <span key={p.score} className="chip-points">
                  {p.score}
                </span>
                {p.streak >= 2 && !finished && (
                  <span className="chip-streak" title={`${p.streak} in a row`}>
                    <Flame size={13} aria-hidden="true" />
                    {p.streak}
                  </span>
                )}
              </span>
            </span>
            {/* Live state sits on the chip's corner, never over the companion's face. */}
            {state === "thinking" && simultaneous && (
              <span className="chip-thinking" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
            {state === "locked" && (
              <span className="chip-locked" aria-hidden="true">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            {bubble(state, answer) && (
              <span
                key={`${game.turn}-${state}`}
                className={`chip-bubble is-${state}`}
                aria-hidden="true"
              >
                {bubble(state, answer)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
