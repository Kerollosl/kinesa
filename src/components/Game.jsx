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
  HelpCircle,
  Sparkles,
  Target,
  CircleCheck,
  CloudOff,
} from "lucide-react";
import Mascot, { MASCOTS } from "./Mascot.jsx";
import "./match-experience.css";
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
  onHelp,
  onInspectPlayer,
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
    } else {
      phaseHeading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
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
          e.target.closest(
            'input,textarea,select,a,button:not(.answer-option),[contenteditable="true"]',
          ))
      )
        return;
      const index =
        "1234".indexOf(e.key) >= 0
          ? "1234".indexOf(e.key)
          : "abcd".indexOf(e.key.toLowerCase());
      if (
        game.phase === "question" &&
        !player.isBot &&
        index >= 0 &&
        document.activeElement?.closest(".question-stage")
      ) {
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
    <div className="game-page" data-phase={game.phase}>
      <div className="game-top">
        <button
          className="text-button game-exit"
          onClick={onExit}
          aria-label="Back to play"
          title="Back to play"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="round-tag">
          {finished
            ? "ALL ROUNDS COMPLETE"
            : `Round ${Math.floor(game.turn / game.players.length) + 1} / ${ROUNDS}`}
        </span>
        <div className="game-top-tools">
          <span
            className="match-save-status"
            role="img"
            aria-label={
              savedLocally ? "Saved on this device" : "This session only"
            }
            title={savedLocally ? "Saved on this device" : "This session only"}
          >
            {savedLocally ? <CircleCheck size={18} /> : <CloudOff size={18} />}
          </span>
          <button
            className="game-help text-button"
            onClick={onHelp}
            aria-label="Game rules"
          >
            <HelpCircle size={20} />
          </button>
        </div>
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
          {answered} / {game.players.length * ROUNDS}
        </span>
      </div>
      <div
        className="scoreboard"
        style={{ "--player-count": game.players.length }}
      >
        {game.players.map((p, i) => (
          <button
            onClick={() => onInspectPlayer(p)}
            title={`Meet ${MASCOTS.find((m) => m.kind === p.kind).name}, ${p.name}’s companion`}
            className={`score-player ${active === i && !finished ? "current" : ""}`}
            key={p.kind}
            aria-label={`${p.name}: ${p.score} points${active === i && !finished ? ", " + playerStatus : ""}. View companion`}
          >
            <div className="score-avatar">
              <Mascot kind={p.kind} portrait />
            </div>
            <div>
              <strong title={p.name}>
                {p.name}
                {p.isBot && <small className="bot-tag">BOT</small>}
              </strong>
              <span>
                {p.score} <span className="score-unit">pts</span>
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
          </button>
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
          <div className="turn-heading">
            <div className="turn-companion" aria-hidden="true">
              <Mascot kind={player.kind} />
            </div>
            <h1 ref={phaseHeading} tabIndex={-1}>
              {player.isBot
                ? `${player.name} is up!`
                : `${player.name}, you’re up!`}
            </h1>
          </div>
          <p role="status">
            {spinning
              ? "Choosing your next category…"
              : player.isBot
                ? "Practice bot’s turn"
                : "Spin for a category"}
          </p>
          <div className="game-wheel-scene">
            <Wheel rotation={rotation} spinning={spinning} />
          </div>
          <button
            className="primary-button spin-button"
            disabled={spinning || player.isBot}
            onClick={spin}
          >
            <RotateCcw size={20} />
            {spinning ? "Choosing a category…" : "Spin the wheel"}
          </button>
          <details className="wheel-category-key">
            <summary>Categories</summary>
            <div className="wheel-legend">
              {categories.map((c) => (
                <span key={c.id}>
                  <span
                    className="legend-category-icon"
                    style={{ "--legend-color": c.color }}
                  >
                    <CategoryIcon category={c} size={14} />
                  </span>
                  {c.name}
                </span>
              ))}
            </div>
          </details>
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
                  aria-label={`${String.fromCharCode(65 + i)}. ${text}${revealed && i === q.correct ? ". Correct answer" : revealed && i === game.selected ? ". Your answer, incorrect" : ""}`}
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
            <div className="question-hints sr-only">
              <p className="take-time">
                <Heart size={15} />{" "}
                {player.isBot ? (
                  <>
                    Practice opponent is thinking
                    <span className="thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </>
                ) : (
                  "Take your time. There’s no countdown."
                )}
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
              <div className="feedback-heading">
                <div className="reveal-mascot" aria-hidden="true">
                  <Mascot
                    kind={player.kind}
                    mood={game.selected === q.correct ? "celebrate" : "happy"}
                  />
                </div>
                <h2>
                  {game.selected === q.correct
                    ? "Correct · +100"
                    : "Not this time"}
                </h2>
              </div>
              {game.selected !== q.correct && (
                <p className="correct-answer-label">{q.answers[q.correct]}</p>
              )}
              <details className="answer-detail">
                <summary>Why this answer?</summary>
                <p>{q.explanation}</p>
                <span className="source">{q.source}</span>
              </details>
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
          <Trophy className="winner-trophy" size={38} />
          <h1 ref={phaseHeading} tabIndex={-1}>
            {winners.length > 1
              ? "A shared celebration!"
              : `${winners[0].name} takes the crown!`}
          </h1>

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
          <div className="match-recap">
            <div>
              <Target size={17} />
              <strong>
                {game.players.reduce((sum, p) => sum + p.score / 100, 0)}
                <small> / {game.players.length * ROUNDS}</small>
              </strong>
              <span>Correct answers</span>
            </div>
            <div>
              <Sparkles size={17} />
              <strong>
                {new Set(game.players.flatMap((p) => p.badges)).size}
                <small> / 6</small>
              </strong>
              <span>Categories earned</span>
            </div>
            <div>
              <Trophy size={17} />
              <strong>
                {winners[0].score}
                <small> pts</small>
              </strong>
              <span>Leading score</span>
            </div>
          </div>
          <div className="results-leaderboard-heading">
            <h2>The final standings</h2>
          </div>
          <ol className="final-scores">
            {[...game.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <li key={p.kind}>
                  <button
                    className={`final-score-row ${winners.some((w) => w.kind === p.kind) ? "is-winner" : ""}`}
                    onClick={() => onInspectPlayer(p)}
                  >
                    <span className="result-rank">
                      {1 +
                        game.players.filter((other) => other.score > p.score)
                          .length}
                    </span>
                    <span className="result-avatar">
                      <Mascot kind={p.kind} portrait />
                    </span>
                    <span className="result-player">
                      <strong>
                        {p.name}
                        {p.isBot && <small className="bot-tag">BOT</small>}
                      </strong>
                      <span>
                        {p.score / 100} of {ROUNDS} correct
                        {p.score === ROUNDS * 100 ? " · Perfect game!" : ""}
                      </span>
                      <span className="result-score-track" aria-hidden="true">
                        <i
                          style={{
                            width: `${Math.max(2, (p.score / (ROUNDS * 100)) * 100)}%`,
                          }}
                        />
                      </span>
                    </span>
                    <span className="result-points">
                      <strong>{p.score}</strong>
                      <small>points</small>
                    </span>
                  </button>
                </li>
              ))}
          </ol>
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
