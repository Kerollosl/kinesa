import { forwardRef } from "react";
import type { ClassicGame } from "../../types.ts";
import { categories } from "../../data.ts";
import Wheel, { CLASSIC_SEGMENTS } from "../Wheel.tsx";
import { CopticCross } from "../Ornaments.tsx";
import { PICK, WHEEL, roundLimit } from "../../classic.ts";
import { CategoryPips, Meter } from "./Pips.tsx";
import { Avatar, BotTag, PlayTop } from "./Parts.tsx";

// Everyone's categories at a glance; the player whose turn it is stands out.
export function Scoreboard({
  game,
  active = game.turn,
}: {
  game: ClassicGame;
  active?: number;
}) {
  const two = game.players.length === 2;
  return (
    <ol
      className={`scoreboard ${two ? "is-versus" : ""}`}
      aria-label="Categories won"
    >
      {game.players.map((p, i) => (
        <li key={p.kind} className={`seat ${i === active ? "is-active" : ""}`}>
          <Avatar kind={p.kind} size="md" />
          <span className="seat-name">
            <strong>{p.name}</strong>
            {p.isBot && <BotTag />}
          </span>
          <CategoryPips won={p.won} size="sm" />
          <span className="sr-only">
            {p.name}: {p.won.length} of 6 categories
            {i === active ? ", playing now" : ""}
          </span>
        </li>
      ))}
      {two && (
        <span className="versus" aria-hidden="true">
          vs
        </span>
      )}
    </ol>
  );
}

const Board = forwardRef<
  HTMLHeadingElement,
  {
    game: ClassicGame;
    rotation: number;
    spinning: boolean;
    landed: number | null;
    onSpin: () => void;
    onExit: () => void;
    onRules?: (() => void) | null;
    hint?: boolean;
  }
>(function Board(
  { game, rotation, spinning, landed, onSpin, onExit, onRules, hint },
  ref,
) {
  const player = game.players[game.turn];
  if (!player) return null;
  const landedId = landed === null ? null : WHEEL[landed];
  const landedCat = categories.find((c) => c.id === landedId);
  const solo = game.players.filter((p) => !p.isBot).length === 1;
  const status =
    landedId === PICK
      ? "Your pick!"
      : landedCat
        ? landedCat.name
        : spinning
          ? "Spinning…"
          : solo
            ? "Your turn"
            : `${player.name}’s turn`;
  return (
    <section className="board" aria-labelledby="board-title">
      <PlayTop onExit={onExit} onRules={onRules}>
        <span className="round-tag">
          Round {game.round} of {roundLimit(game)}
        </span>
      </PlayTop>
      <Scoreboard game={game} />
      <div className="board-wheel">
        <Wheel
          segments={CLASSIC_SEGMENTS}
          rotation={rotation}
          spinning={spinning}
          landed={landed}
          onSpin={onSpin}
          disabled={spinning || landed !== null}
        />
      </div>
      <div className="board-foot">
        <h1
          id="board-title"
          ref={ref}
          tabIndex={-1}
          className={`board-status ${landedCat || landedId === PICK ? "is-landed" : ""}`}
          style={landedCat ? { "--land": landedCat.color } : undefined}
          aria-live="polite"
        >
          {status}
        </h1>
        <div className="board-meter">
          <Meter value={player.meter} />
          <span className="meter-goal" aria-hidden="true">
            <CopticCross size={18} eye={false} />
          </span>
          {hint && (
            <span className="meter-hint">3 right = pick a category</span>
          )}
        </div>
        <button
          className="btn btn-go btn-xl btn-block"
          onClick={onSpin}
          disabled={spinning || landed !== null}
        >
          Spin
        </button>
      </div>
    </section>
  );
});
export default Board;
