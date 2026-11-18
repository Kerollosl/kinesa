import { forwardRef } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { categories } from "../../data.js";
import { CategoryIcon } from "../Wheel.jsx";
import Companion from "../Companion.jsx";
import { goalOf } from "../../classic.js";
import { Scoreboard } from "./Board.jsx";
import { PlayTop } from "./Parts.jsx";

// A practice bot's turn, replayed as a quick run of answers.
const Rival = forwardRef(function Rival(
  { game, onNext, onExit, onRules },
  ref,
) {
  const bot = game.players[game.rival.player];
  const steps = game.rival.steps;
  const won = steps.filter((s) => s.challenge && s.correct);
  const over = bot.won.length >= goalOf(game);
  const summary = won.length
    ? `Won ${won.map((s) => categories.find((c) => c.id === s.category).name).join(" and ")}!`
    : steps.length > 1
      ? `${steps.filter((s) => s.correct).length} right, then a miss.`
      : "Missed the first one.";
  return (
    <section className="rival" aria-labelledby="rival-title">
      <PlayTop onExit={onExit} onRules={onRules} />
      <div className="rival-hero">
        <span className="rival-art" aria-hidden="true">
          <Companion kind={bot.kind} act={won.length ? "cheer" : "sad"} />
        </span>
        <h1 id="rival-title" ref={ref} tabIndex={-1}>
          {bot.name}’s turn
        </h1>
      </div>
      <ol className="rival-steps" aria-label="What happened">
        {steps.map((s, i) => {
          const c = categories.find((x) => x.id === s.category);
          return (
            <li
              key={i}
              className={`${s.correct ? "is-right" : "is-miss"} ${s.challenge ? "is-pick" : ""}`}
              style={{ "--cat": c.color, "--cat-ink": c.ink, "--n": i }}
            >
              <span className="rival-cat" aria-hidden="true">
                <CategoryIcon category={c} size={20} />
              </span>
              <span className="sr-only">
                {s.challenge ? `Pick: ${c.name}` : c.name},{" "}
                {s.correct ? "right" : "wrong"}
              </span>
              <span className="rival-mark" aria-hidden="true">
                {s.correct ? (
                  <Check size={14} strokeWidth={4} />
                ) : (
                  <X size={14} strokeWidth={4} />
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <p
        className="rival-summary"
        style={{ "--n": steps.length }}
        role="status"
      >
        {summary}
      </p>
      <div className="rival-pips" style={{ "--n": steps.length }}>
        <Scoreboard game={game} active={game.rival.player} />
      </div>
      <div className="play-actions">
        <button className="btn btn-go btn-xl btn-block" onClick={onNext}>
          {over ? "See results" : "Your turn"}
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
});
export default Rival;
