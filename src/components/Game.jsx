import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Wheel from "./Wheel.jsx";
import { categories } from "../data.js";
import {
  TIMEOUT,
  activeIndex,
  currentRound,
  isSimultaneous,
  matchLength,
  roundCount,
} from "../engine.js";
import QuestionView, { RevealSheet, Timer } from "./play/QuestionView.jsx";
import Handoff from "./play/Handoff.jsx";
import Results from "./play/Results.jsx";
import { Avatar, BotTag, PlayTop } from "./play/Parts.jsx";

const names = (list) =>
  list.length <= 2
    ? list.join(" and ")
    : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

// What the rest of the table did, in one line.
function rivalsLine(game, focus) {
  const others = game.players.filter((_, i) => i !== focus);
  if (!others.length) return null;
  const right = others
    .filter((p) => game.answers?.[game.players.indexOf(p)]?.correct)
    .map((p) => p.name);
  const mine = game.answers?.[focus]?.correct;
  if (right.length === others.length)
    return mine ? "Everyone got it." : `${names(right)} got it.`;
  if (!right.length) return mine ? "Only you got it!" : "Nobody got it.";
  return `${names(right)} got it${mine ? " too" : ""}.`;
}

// Score chips for quick rounds against practice bots.
function Chips({ game, focus }) {
  if (game.players.length < 2) return null;
  const revealed = game.phase === "reveal";
  return (
    <ol className="chips" aria-label="Scores">
      {game.players.map((p, i) => {
        const entry = game.answers?.[i];
        const waiting =
          game.phase === "question" && isSimultaneous(game) && !entry;
        return (
          <li
            key={p.kind}
            className={`chip ${i === focus ? "is-me" : ""} ${revealed && entry ? (entry.correct ? "is-right" : "is-miss") : ""}`}
            aria-label={`${p.name}${p.isBot ? " (bot)" : ""}: ${p.score} points${waiting ? ", thinking" : entry && !revealed ? ", locked in" : ""}`}
          >
            <Avatar kind={p.kind} size="xs" />
            <strong>{p.score}</strong>
            {!waiting && entry && !revealed && (
              <i className="chip-dot" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Quick rounds (Today's five, topic practice) and older pass-and-play saves.
export default function Game({
  game,
  mode,
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
  onPlay,
  onEditPlayers,
  onReady,
  onContinue,
  onRules,
  onToast,
  headingRef,
}) {
  const sheetRef = useRef(null);
  const simultaneous = isSimultaneous(game);
  const focus = activeIndex(game);
  const player = game.players[focus];
  const total = matchLength(game);
  const round = currentRound(game);
  const rounds = roundCount(game);

  if (game.phase === "finished")
    return (
      <Results
        ref={headingRef}
        game={game}
        mode={mode}
        stats={stats}
        matchMeta={matchMeta}
        onRematch={() => onRematch()}
        onPlay={onPlay}
        onHome={onExit}
        onEditPlayers={onEditPlayers}
        onToast={onToast}
      />
    );
  if (game.phase === "handoff")
    return (
      <Handoff
        ref={headingRef}
        player={player}
        showProgress={false}
        note={`Round ${round} of ${rounds} · ${player.score} points`}
        onReady={onReady}
      />
    );
  if (game.phase === "standings") {
    const sorted = [...game.players].sort((a, b) => b.score - a.score);
    return (
      <section className="standings" aria-labelledby="standings-title">
        <PlayTop onExit={onExit} onRules={onRules} />
        <h1 id="standings-title" ref={headingRef} tabIndex={-1}>
          Round {round - 1} done
        </h1>
        <ol className="results-table">
          {sorted.map((p, i) => (
            <li key={p.kind} style={{ "--row": i }}>
              <span className="results-rank">{i + 1}</span>
              <Avatar kind={p.kind} size="sm" />
              <span className="results-name">
                <strong>{p.name}</strong>
                {p.isBot && <BotTag />}
              </span>
              <span className="results-score">{p.score}</span>
            </li>
          ))}
        </ol>
        <div className="play-actions">
          <button className="btn btn-go btn-xl btn-block" onClick={onContinue}>
            Next round <ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }
  if (game.phase === "spin") {
    const auto =
      simultaneous || !!game.settings?.category || !!game.settings?.plan;
    return (
      <section className="board is-quick" aria-labelledby="spin-title">
        <PlayTop onExit={onExit} onRules={onRules}>
          <span className="round-tag">
            {simultaneous ? "Question" : "Round"} {round} of {rounds}
          </span>
        </PlayTop>
        <div className="board-wheel">
          <Wheel
            rotation={rotation}
            spinning={spinning}
            onSpin={auto || player.isBot ? null : spin}
            disabled={spinning}
          />
        </div>
        <div className="board-foot">
          <h1
            id="spin-title"
            ref={headingRef}
            tabIndex={-1}
            className="board-status"
          >
            {auto
              ? "Get ready…"
              : player.isBot
                ? `${player.name}’s turn`
                : `${player.name}’s turn`}
          </h1>
          {!auto && !player.isBot && (
            <button
              className="btn btn-go btn-xl btn-block"
              onClick={spin}
              disabled={spinning}
            >
              Spin
            </button>
          )}
        </div>
      </section>
    );
  }

  const q = game.question;
  const cat = categories.find((c) => c.id === q.category);
  const entry = game.answers?.[focus];
  const revealed = game.phase === "reveal";
  const locked = game.phase === "question" && !!entry;
  const answered = Math.min(game.turn + (revealed ? 1 : 0), total);
  const nextPlayer = game.players[(game.turn + 1) % game.players.length];
  const action =
    game.turn + 1 >= total
      ? "See results"
      : simultaneous
        ? "Next question"
        : nextPlayer.isBot
          ? `${nextPlayer.name}’s turn`
          : `Pass to ${nextPlayer.name}`;
  const pickers = (i) =>
    simultaneous && game.players.length > 1
      ? game.players.filter((_, p) => game.answers?.[p]?.choice === i)
      : [];
  const top = (
    <>
      <button
        className="icon-btn"
        onClick={onExit}
        aria-label="Leave game"
        title="Leave game (it’s saved)"
      >
        <ArrowLeft size={24} />
      </button>
      <span
        className="qv-count"
        role="progressbar"
        aria-label="Questions answered"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
      >
        {simultaneous ? round : game.turn + 1}
        <small>/{simultaneous ? rounds : total}</small>
      </span>
      <Chips game={game} focus={focus} />
    </>
  );
  const timedOut = entry?.choice === TIMEOUT;
  return (
    <QuestionView
      key={`${game.turn}-${q.id}`}
      question={q}
      category={cat}
      top={top}
      timer={
        !revealed && (
          <Timer settings={game.settings} clock={clock} locked={locked} />
        )
      }
      phase={game.phase}
      choice={entry ? entry.choice : null}
      disabled={player.isBot}
      pickers={pickers}
      onAnswer={answer}
      celebrate={!!entry?.correct && !player.isBot}
      footer={
        (locked || player.isBot) && (
          <p className="qv-wait" aria-live="polite">
            {locked
              ? "Locked in. Waiting for the others…"
              : `${player.name} is thinking…`}
          </p>
        )
      }
      sheet={
        revealed && (
          <RevealSheet
            ref={sheetRef}
            tone={entry?.correct ? "good" : "bad"}
            kind={player.kind}
            question={q}
            title={
              entry?.correct ? "Correct!" : timedOut ? "Time’s up" : "Not quite"
            }
            note={
              entry?.correct
                ? simultaneous
                  ? rivalsLine(game, focus)
                  : null
                : null
            }
            badge={
              entry?.correct ? (
                <span className="sheet-points">+{entry.points}</span>
              ) : null
            }
            action={action}
            onAction={advance}
          />
        )
      }
    />
  );
}
