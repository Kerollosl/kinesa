import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  RotateCcw,
  Heart,
  Trophy,
  Hand,
  Keyboard,
  Users,
} from "lucide-react";
import Mascot from "./Mascot.jsx";
import Wheel, { CategoryIcon } from "./Wheel.jsx";
import { categories } from "../data.js";
import { ROUNDS, getWinners } from "../engine.js";
export default function Game({
  game,
  savedLocally,
  rotation,
  spinning,
  spin,
  answer,
  advance,
  onExit,
  onRematch,
  onHome,
  onReady,
}) {
  const active = game.turn % game.players.length;
  const player = game.players[active];
  const q = game.question;
  const cat = q ? categories.find((c) => c.id === q.category) : null;
  const finished = game.phase === "finished";
  const winners = finished ? getWinners(game.players) : [];
  const nextPlayer = game.players[(game.turn + 1) % game.players.length];
  const answered = Math.min(
    game.turn + (game.phase === "reveal" ? 1 : 0),
    game.players.length * ROUNDS,
  );
  const phaseHeading = useRef(null);
  const feedbackRef = useRef(null);
  useEffect(() => {
    if (game.phase === "reveal") {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    } else phaseHeading.current?.focus();
  }, [game.phase]);
  useEffect(() => {
    const key = (e) => {
      if (
        e.repeat ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        document.querySelector('[role="dialog"]') ||
        (e.target instanceof HTMLElement &&
          e.target.closest('input,textarea,select,[contenteditable="true"]'))
      )
        return;
      const index =
        "1234".indexOf(e.key) >= 0
          ? "1234".indexOf(e.key)
          : "abcd".indexOf(e.key.toLowerCase());
      if (game.phase === "question" && !player.isBot && index >= 0) {
        e.preventDefault();
        answer(index);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game.phase, game.turn, player.isBot, answer]);
  const playerStatus = spinning
    ? "Spinning"
    : game.phase === "question"
      ? "Choosing"
      : game.phase === "reveal"
        ? game.selected === q?.correct
          ? "+100!"
          : "Answered"
        : game.phase === "handoff"
          ? "Up next"
          : "Playing";
  return (
    <div className="game-page">
      <div className="game-top">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={17} /> Back to play
        </button>
        <span className="round-tag">
          {finished
            ? "ALL ROUNDS COMPLETE"
            : `ROUND ${Math.floor(game.turn / game.players.length) + 1} OF ${ROUNDS}`}
        </span>
        <span className="sample-tag">
          {savedLocally ? "Saved on this device" : "This session only"}
        </span>
      </div>
      <div
        className="match-progress"
        role="progressbar"
        aria-label="Questions answered"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={game.players.length * ROUNDS}
      >
        <div className="round-segments">
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span key={i}>
              <i
                style={{
                  width: `${Math.max(0, Math.min(100, ((answered - i * game.players.length) / game.players.length) * 100))}%`,
                }}
              />
            </span>
          ))}
        </div>
        <span>
          {finished
            ? "Match complete"
            : `Turn ${active + 1} of ${game.players.length}`}{" "}
          <b>·</b> {answered} / {game.players.length * ROUNDS} answered
        </span>
      </div>
      <div
        className="scoreboard"
        style={{ "--player-count": game.players.length }}
      >
        {game.players.map((p, i) => (
          <div
            className={`score-player ${active === i && !finished ? "current" : ""}`}
            key={p.kind}
            aria-label={`${p.name}: ${p.score} points${active === i && !finished ? ", " + playerStatus : ""}`}
          >
            <div className="score-avatar">
              <Mascot kind={p.kind} />
            </div>
            <div>
              <strong title={p.name}>
                {p.name}
                {p.isBot && <small className="bot-tag">BOT</small>}
              </strong>
              <span>
                {p.score} points{" "}
                {active === i && !finished && <b>• {playerStatus}</b>}
              </span>
            </div>
            <div className="mini-badges">
              {p.badges.map((id) => (
                <span
                  key={id}
                  style={{
                    background: categories.find((c) => c.id === id).color,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {game.phase === "handoff" && (
        <section className="handoff-stage">
          <div className="handoff-eyebrow">
            <Hand size={19} /> PASS THE DEVICE
          </div>
          <h1 ref={phaseHeading} tabIndex={-1}>
            Pass to {player.name}.
          </h1>
          <p>Your companion’s ready. Your question is still a surprise.</p>
          <div className="handoff-avatar">
            <span className="handoff-orbit" />
            <Mascot kind={player.kind} />
            <span className="handoff-wave">✦</span>
          </div>
          <button className="primary-button" onClick={onReady}>
            I’m {player.name} — let’s play <ArrowRight size={20} />
          </button>
          <span className="handoff-footnote">
            Round {Math.floor(game.turn / game.players.length) + 1} ·{" "}
            {player.score} points so far
          </span>
        </section>
      )}
      {game.phase === "spin" && (
        <section className="spin-stage">
          <div className="eyebrow">YOUR SPIN. YOUR SHOT.</div>
          <h1 ref={phaseHeading} tabIndex={-1}>
            {player.isBot
              ? `${player.name} is up!`
              : `${player.name}, you’re up!`}
          </h1>
          <p>Give the wheel a spin. Let’s see where we’re headed.</p>
          <div className="game-wheel-scene">
            <div className="game-companion">
              <Mascot kind={player.kind} />
              <span>You’ve got this!</span>
            </div>
            <Wheel rotation={rotation} spinning={spinning} />
            <span className="spin-spark">✧</span>
          </div>
          <button
            className="primary-button spin-button"
            disabled={spinning || player.isBot}
            onClick={spin}
          >
            <RotateCcw size={20} />
            {spinning ? "Round and round…" : "Spin the wheel"}
          </button>
          <div className="wheel-legend">
            {categories.map((c) => (
              <span key={c.id}>
                <i style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </section>
      )}
      {(game.phase === "question" || game.phase === "reveal") && (
        <section
          className="question-stage"
          style={{ "--question-color": cat.color, "--question-pale": cat.pale }}
        >
          <div className="question-category">
            <CategoryIcon category={cat} size={20} />
            {cat.name}
          </div>
          <div className="question-header">
            <span>{player.name}’s question</span>
            <span>100 POINTS</span>
          </div>
          <h1 ref={phaseHeading} tabIndex={-1}>
            {q.text}
          </h1>
          <div className="answer-grid">
            {q.answers.map((text, i) => {
              const revealed = game.phase === "reveal";
              return (
                <button
                  key={text}
                  className={`answer-option ${revealed && i === q.correct ? "correct" : ""} ${revealed && i === game.selected && i !== q.correct ? "incorrect" : ""}`}
                  disabled={revealed || player.isBot}
                  onClick={() => answer(i)}
                >
                  <span className="answer-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{text}</span>
                  {revealed && i === q.correct ? (
                    <Check size={22} />
                  ) : revealed && i === game.selected ? (
                    <X size={22} />
                  ) : null}
                </button>
              );
            })}
          </div>
          {game.phase === "question" ? (
            <div className="question-hints">
              <p className="take-time">
                <Heart size={15} />{" "}
                {player.isBot
                  ? "Practice opponent is thinking…"
                  : "No rush. You know more than you think."}
              </p>
              {!player.isBot && (
                <span className="keyboard-hint">
                  <Keyboard size={15} /> Answer with A–D or 1–4
                </span>
              )}
            </div>
          ) : (
            <div
              className={`answer-reveal ${game.selected === q.correct ? "is-correct" : ""}`}
              role="status"
              ref={feedbackRef}
              tabIndex={-1}
            >
              <div className="reveal-mascot">
                <Mascot
                  kind={player.kind}
                  mood={game.selected === q.correct ? "celebrate" : "happy"}
                />
              </div>
              <div>
                <h2>
                  {game.selected === q.correct
                    ? player.isBot
                      ? `${player.name} got it! +100`
                      : "Look at you go! +100"
                    : "Not quite. Here’s the answer."}
                </h2>
                {game.selected !== q.correct && (
                  <p className="correct-answer-label">
                    Correct answer: <strong>{q.answers[q.correct]}</strong>
                  </p>
                )}
                <p>{q.explanation}</p>
                <span className="source">{q.source}</span>
              </div>
              <button className="primary-button" onClick={advance}>
                {game.turn + 1 >= game.players.length * ROUNDS
                  ? "See the results"
                  : nextPlayer.isBot
                    ? `Watch ${nextPlayer.name}’s turn`
                    : `Pass to ${nextPlayer.name}`}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </section>
      )}
      {finished && (
        <section className="results-stage">
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  "--i": i,
                  background: categories[i % 6].color,
                  left: `${(i * 19) % 100}%`,
                  animationDelay: `${i * 0.11}s`,
                }}
              />
            ))}
          </div>
          <div className="eyebrow">FAITH. FRIENDS. A FEW BRAGGING RIGHTS.</div>
          <Trophy className="winner-trophy" size={38} />
          <h1 ref={phaseHeading} tabIndex={-1}>
            {winners.length > 1
              ? "A shared celebration!"
              : `${winners[0].name} takes the crown!`}
          </h1>
          <p>
            {winners.length > 1
              ? "Great minds, equal points. There’s room for everyone on this podium."
              : "A lovely little victory. An even better time together."}
          </p>
          <div className="winner-mascots">
            {winners.map((p) => (
              <div key={p.kind}>
                <Mascot kind={p.kind} mood="celebrate" />
                <strong>
                  {p.name}
                  {p.isBot && <small className="bot-tag">BOT</small>}
                </strong>
              </div>
            ))}
          </div>
          <div className="final-scores">
            {[...game.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <div key={p.kind}>
                  <span>
                    {winners.some((w) => w.kind === p.kind) ? "✦" : "✧"}
                  </span>
                  <strong>
                    {p.name}
                    {p.isBot && <small className="bot-tag">BOT</small>}
                  </strong>
                  <b>
                    {p.score} <small>points</small>
                  </b>
                </div>
              ))}
          </div>
          <div className="results-actions">
            <button className="primary-button" onClick={onRematch}>
              <RotateCcw size={18} /> One more round?
            </button>
            <button className="secondary-button" onClick={onHome}>
              Back to play
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
