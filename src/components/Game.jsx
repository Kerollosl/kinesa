import { useEffect, useRef } from "react";
import { ArrowLeft, Check, CloudOff, HelpCircle, X } from "lucide-react";
import Mascot from "./Mascot.jsx";
import Wheel, { CategoryIcon } from "./Wheel.jsx";
import { categories } from "../data.js";
import {
  activeIndex,
  currentRound,
  isSimultaneous,
  matchLength,
  roundCount,
} from "../engine.js";
import QuestionTimer from "./game/QuestionTimer.jsx";
import ScoreChips from "./game/ScoreChips.jsx";
import AnswerFeedback from "./game/AnswerFeedback.jsx";
import HandoffCover from "./game/HandoffCover.jsx";
import Standings from "./game/Standings.jsx";
import Results from "./game/Results.jsx";
import { burst } from "./game/burst.js";

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const initial = (name) => name.trim().charAt(0).toUpperCase() || "?";

export default function Game({
  game,
  mode,
  savedLocally,
  rotation,
  spinning,
  spin,
  answer,
  advance,
  clock,
  stats,
  matchMeta,
  onExit,
  onRematch,
  onPractice,
  onEditPlayers,
  onReady,
  onContinue,
  onHelp,
  onInspectPlayer,
  onToast,
}) {
  const simultaneous = isSimultaneous(game);
  const focus = activeIndex(game);
  const player = game.players[focus];
  const q = game.question;
  const cat = q ? categories.find((c) => c.id === q.category) : null;
  const finished = game.phase === "finished";
  const total = matchLength(game);
  const round = currentRound(game);
  const rounds = roundCount(game);
  const answered = Math.min(
    game.turn + (game.phase === "reveal" ? 1 : 0),
    total,
  );
  const myAnswer = game.answers?.[focus];
  const locked = game.phase === "question" && !!myAnswer;
  const nextPlayer = game.players[(game.turn + 1) % game.players.length];
  const phaseHeading = useRef(null);
  const feedbackRef = useRef(null);
  const optionRefs = useRef([]);

  useEffect(() => {
    if (game.phase === "reveal") {
      feedbackRef.current?.focus({ preventScroll: true });
      // Phones keep the score chips in view; the Next button is sticky.
      if (!window.matchMedia("(max-width: 760px)").matches)
        feedbackRef.current?.scrollIntoView({
          block: "nearest",
          behavior: reduced() ? "instant" : "smooth",
        });
      const entry = game.answers?.[focus];
      if (entry?.correct && !player.isBot)
        burst(optionRefs.current[q.correct], [
          cat.color,
          "#ffcf4d",
          "#6955d9",
          "#40c9a2",
        ]);
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
        !myAnswer &&
        index >= 0 &&
        document.activeElement?.closest(".question-stage")
      ) {
        e.preventDefault();
        answer(index);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game.phase, game.turn, player.isBot, myAnswer, answer]);

  const nextLabel =
    game.turn + 1 >= total
      ? "See the results"
      : simultaneous
        ? "Next question"
        : nextPlayer.isBot
          ? `Watch ${nextPlayer.name}’s turn`
          : `Pass to ${nextPlayer.name}`;

  // Who picked what, shown on each option after the reveal (simultaneous rounds).
  const pickers = (i) =>
    simultaneous && game.phase === "reveal"
      ? game.players.filter((_, p) => game.answers?.[p]?.choice === i)
      : [];

  return (
    <div
      className="game-page"
      data-phase={game.phase}
      data-structure={game.structure}
    >
      <div className="game-top">
        <button
          className="text-button game-exit"
          onClick={onExit}
          aria-label="Back to play"
          title="Back to play"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="round-tag sr-only">
          {finished
            ? "MATCH COMPLETE"
            : `${simultaneous ? "Question" : "Round"} ${round} / ${rounds}`}
        </span>
        <div
          className="match-progress"
          hidden={finished}
          role="progressbar"
          aria-label="Questions answered"
          aria-valuenow={answered}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <div className="round-segments">
            {Array.from({ length: rounds }, (_, i) => {
              const per = simultaneous ? 1 : game.players.length;
              return (
                <span key={i}>
                  <i
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, (answered - i * per) / per))})`,
                    }}
                  />
                </span>
              );
            })}
          </div>
        </div>
        {!finished && !["handoff", "standings"].includes(game.phase) && (
          <ScoreChips
            game={game}
            focus={focus}
            simultaneous={simultaneous}
            finished={finished}
            onInspectPlayer={onInspectPlayer}
          />
        )}
        <div className="game-top-tools">
          {!savedLocally && (
            <span
              className="match-save-status"
              role="img"
              aria-label="This session only"
              title="This session only"
            >
              <CloudOff size={18} />
            </span>
          )}
          <button
            className="game-help text-button"
            onClick={onHelp}
            aria-label="Game rules"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
      {game.phase === "handoff" && (
        <HandoffCover
          player={player}
          round={round}
          rounds={rounds}
          onReady={onReady}
          ref={phaseHeading}
        />
      )}
      {game.phase === "standings" && (
        <Standings
          game={game}
          round={round}
          rounds={rounds}
          onContinue={onContinue}
          ref={phaseHeading}
        />
      )}
      {game.phase === "spin" && (
        <section className="spin-stage">
          <div className="turn-heading">
            {!simultaneous && (
              <div className="turn-companion" aria-hidden="true">
                <Mascot kind={player.kind} />
              </div>
            )}
            <h1 ref={phaseHeading} tabIndex={-1}>
              {simultaneous
                ? `Question ${round} of ${rounds}`
                : player.isBot
                  ? `${player.name} is up!`
                  : `${player.name}, you’re up!`}
            </h1>
          </div>
          <div className="game-wheel-scene">
            <Wheel
              rotation={rotation}
              spinning={spinning}
              quick={simultaneous}
              onSpin={spin}
              disabled={
                spinning ||
                player.isBot ||
                !!game.settings?.category ||
                !!game.settings?.plan
              }
            />
          </div>
          <p
            className={`spin-status ${simultaneous ? "sr-only" : ""}`}
            role="status"
          >
            {game.settings?.plan
              ? "Drawing today’s next question…"
              : game.settings?.category
                ? `Drawing a ${categories.find((c) => c.id === game.settings.category)?.name} question…`
                : spinning
                  ? player.isBot
                    ? `${player.name} is spinning…`
                    : "Choosing a category…"
                  : player.isBot
                    ? "Practice bot’s turn"
                    : "Tap the wheel"}
          </p>
        </section>
      )}
      {(game.phase === "question" || game.phase === "reveal") && (
        <section
          key={`${game.turn}-${q.id}`}
          className={`question-stage ${locked ? "is-locked" : ""}`}
          style={{ "--question-color": cat.color, "--question-pale": cat.pale }}
        >
          <div className="question-meta">
            <div className="question-category">
              <CategoryIcon category={cat} size={18} />
              {cat.name}
            </div>
            {game.phase === "question" && (
              <QuestionTimer
                settings={game.settings}
                clock={clock}
                locked={locked}
              />
            )}
          </div>
          <h1 ref={phaseHeading} tabIndex={-1}>
            {q.text}
          </h1>
          <div className="answer-grid">
            {q.answers.map((text, i) => {
              const revealed = game.phase === "reveal";
              const mine = myAnswer?.choice === i;
              const status =
                revealed && i === q.correct
                  ? "correct"
                  : revealed && mine
                    ? "incorrect"
                    : "";
              const who = pickers(i);
              return (
                <button
                  key={i}
                  ref={(el) => (optionRefs.current[i] = el)}
                  className={`answer-option ${status} ${mine && !revealed ? "is-picked" : ""} ${revealed && !status ? "is-dimmed" : ""}`}
                  disabled={revealed || player.isBot || locked}
                  aria-label={`${String.fromCharCode(65 + i)}. ${text}${
                    revealed && i === q.correct
                      ? ". Correct answer"
                      : revealed && mine
                        ? `. ${player.isBot ? `${player.name}’s` : "Your"} answer, incorrect`
                        : mine
                          ? ". Locked in"
                          : ""
                  }`}
                  onClick={() => answer(i)}
                  style={{ "--i": i }}
                >
                  <span className="answer-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="answer-text">{text}</span>
                  {who.length > 0 && (
                    <span className="answer-pickers" aria-hidden="true">
                      {who.map((p) => (
                        <span
                          key={p.kind}
                          className={`picker picker-${p.kind}`}
                          title={p.name}
                        >
                          {initial(p.name)}
                        </span>
                      ))}
                    </span>
                  )}
                  {status === "correct" ? (
                    <Check size={22} className="answer-mark" />
                  ) : status === "incorrect" ? (
                    <X size={22} className="answer-mark" />
                  ) : null}
                </button>
              );
            })}
          </div>
          {game.phase === "question" ? (
            <p
              className={`question-hint ${!locked && !player.isBot ? "sr-only" : ""}`}
              aria-live="polite"
            >
              {locked
                ? "Locked in. Waiting for the others…"
                : player.isBot
                  ? `${player.name} is thinking…`
                  : "Tap an answer"}
            </p>
          ) : (
            <AnswerFeedback
              ref={feedbackRef}
              game={game}
              focus={focus}
              simultaneous={simultaneous}
              nextLabel={nextLabel}
              onNext={advance}
            />
          )}
        </section>
      )}
      {finished && (
        <Results
          ref={phaseHeading}
          game={game}
          mode={mode}
          stats={stats}
          matchMeta={matchMeta}
          onRematch={onRematch}
          onPractice={onPractice}
          onEditPlayers={onEditPlayers}
          onInspectPlayer={onInspectPlayer}
          onToast={onToast}
        />
      )}
    </div>
  );
}
