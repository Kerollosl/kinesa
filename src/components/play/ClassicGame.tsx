import { useRef } from "react";
import type { Ref } from "react";
import type {
  ClassicGame as ClassicGameState,
  MatchMeta,
  MatchMode,
  QuestionClock,
  Stats,
} from "../../types.ts";
import { categories } from "../../data.ts";
import { TIMEOUT } from "../../engine.ts";
import { METER_MAX, goalOf, roundLimit } from "../../classic.ts";
import { CategoryIcon } from "../Wheel.tsx";
import Board from "./Board.tsx";
import Pick from "./Pick.tsx";
import Rival from "./Rival.tsx";
import Handoff from "./Handoff.tsx";
import Results from "./Results.tsx";
import QuestionView, { RevealSheet, Timer } from "./QuestionView.tsx";
import { Meter } from "./Pips.tsx";
import { Avatar } from "./Parts.tsx";
import { ArrowLeft } from "lucide-react";

// The label on the next-step button after a reveal.
function nextLabel(game: ClassicGameState) {
  const player = game.players[game.turn];
  const entry = game.answers[game.turn];
  if (!player) return "See results";
  if (game.players.some((p) => p.won.length >= goalOf(game)))
    return "See results";
  if (entry?.correct)
    return !game.challenge && player.meter >= METER_MAX
      ? "Pick a category"
      : "Spin again";
  const seat = (game.turn + 1) % game.players.length;
  if (seat === 0 && game.round + 1 > roundLimit(game)) return "See results";
  const next = game.players[seat];
  if (!next) return "See results";
  return next.isBot ? `${next.name}’s turn` : `Pass to ${next.name}`;
}

export default function ClassicGame({
  game,
  mode,
  rotation,
  spinning,
  landed,
  clock,
  stats,
  matchMeta,
  onSpin,
  onPick,
  onAnswer,
  onHelp,
  onNext,
  onReady,
  onExit,
  onRules,
  onRematch,
  onPlay,
  onEditPlayers,
  onToast,
  headingRef,
}: {
  game: ClassicGameState;
  landed: number | null;
  onSpin: () => void;
  onPick: (id: string) => void;
  onAnswer: (i: number) => void;
  onHelp: () => void;
  onNext: () => void;
  onExit: () => void;
  onRules: () => void;
  onRematch: () => void;
  onPlay: () => void;
  onEditPlayers: () => void;
  onToast: (text: string, tone?: "ok" | "warn") => void;
  onReady: () => void;
  headingRef: Ref<HTMLHeadingElement>;
  mode: MatchMode;
  rotation: number;
  spinning: boolean;
  clock: QuestionClock;
  stats: Stats;
  matchMeta?: MatchMeta | null;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const player = game.players[game.turn];
  if (!player) return null;
  const common = { game, onExit, onRules, ref: headingRef };
  if (game.phase === "spin")
    return (
      <Board
        {...common}
        rotation={rotation}
        spinning={spinning}
        landed={landed}
        onSpin={onSpin}
        hint={stats.games < 3}
      />
    );
  if (game.phase === "pick") return <Pick {...common} onPick={onPick} />;
  if (game.phase === "rival") return <Rival {...common} onNext={onNext} />;
  if (game.phase === "handoff")
    return <Handoff player={player} onReady={onReady} ref={headingRef} />;
  if (game.phase === "finished")
    return (
      <Results
        ref={headingRef}
        game={game}
        mode={mode}
        stats={stats}
        matchMeta={matchMeta}
        onRematch={onRematch}
        onPlay={onPlay}
        onHome={onExit}
        onEditPlayers={onEditPlayers}
        onToast={onToast}
      />
    );
  const q = game.question;
  const cat = categories.find((c) => c.id === q?.category);
  if (!q || !cat) return null;
  const entry = game.answers[game.turn];
  const revealed = game.phase === "reveal";
  const solo = game.players.filter((p) => !p.isBot).length === 1;
  const won = revealed && entry?.correct && game.challenge;
  const timedOut = entry?.choice === TIMEOUT;
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
      <span className="qv-player">
        <Avatar kind={player.kind} size="sm" />
        <span className="qv-player-name">{solo ? "You" : player.name}</span>
        <Meter value={player.meter} size="sm" />
      </span>
    </>
  );
  const sheet = revealed && (
    <RevealSheet
      ref={sheetRef}
      tone={entry?.correct ? "good" : "bad"}
      kind={player.kind}
      question={q}
      title={
        won
          ? `${solo ? "You" : player.name} won it!`
          : entry?.correct
            ? "Correct!"
            : timedOut
              ? "Time’s up"
              : "Not quite"
      }
      note={
        won
          ? cat.name
          : entry?.correct
            ? !game.challenge && player.meter >= METER_MAX
              ? "You earned a pick!"
              : null
            : null
      }
      badge={
        won ? (
          <span
            className="sheet-medal"
            style={{ "--cat": cat.color, "--cat-ink": cat.ink }}
            aria-hidden="true"
          >
            <CategoryIcon category={cat} size={26} />
          </span>
        ) : entry?.correct && !game.challenge ? (
          <Meter value={player.meter} />
        ) : null
      }
      action={nextLabel(game)}
      onAction={onNext}
    />
  );
  return (
    <QuestionView
      key={`${game.used.length}-${q.id}`}
      question={q}
      category={cat}
      label={game.challenge ? `Win ${cat.name}` : null}
      top={top}
      timer={
        !revealed && (
          <Timer settings={game.settings} clock={clock} locked={!!entry} />
        )
      }
      phase={game.phase}
      choice={entry ? entry.choice : null}
      hidden={game.hidden}
      avatarKind={null}
      onAnswer={onAnswer}
      celebrate={!!entry?.correct}
      footer={
        <div className="qv-tools">
          <button
            className="help-btn"
            onClick={onHelp}
            disabled={player.helps < 1 || game.hidden.length > 0}
            aria-label={`50/50: remove two wrong answers. ${player.helps} left`}
          >
            <span className="help-btn-face" aria-hidden="true">
              50/50
            </span>
            <span className="help-btn-count" aria-hidden="true">
              {player.helps}
            </span>
          </button>
        </div>
      }
      sheet={sheet}
    />
  );
}
