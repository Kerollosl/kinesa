import type { ComponentType } from "react";
import { Check, Disc3, Play, Trophy, type LucideIcon } from "lucide-react";
import { CategoryIcon } from "./Wheel.tsx";
import { CopticCross } from "./Ornaments.tsx";
import { masteryFor } from "../progress.ts";
import { spotlight } from "../daily.ts";
import { questions } from "../data.ts";
import { activeIndex } from "../engine.ts";
import { Avatar } from "./play/Parts.tsx";
import type { AnyGame, Category, Stats } from "../types.ts";

const RULES: [LucideIcon | ComponentType<{ size?: number }>, string][] = [
  [Disc3, "Spin to get a category."],
  [Check, "Right? Spin again. Wrong? Next player."],
  [
    CopticCross,
    "Every 3 right answers, or landing on the cross, lets you pick a category. Get it right to win it.",
  ],
  [Trophy, "Win all 6 categories first (3 in Quick)."],
];

export function HelpDialog({ onDone }: { onDone: () => void }) {
  return (
    <div className="dialog help">
      <h2 id="modal-title">How to play</h2>
      <ol className="rules">
        {RULES.map(([Icon, text], i) => (
          <li key={i}>
            <span className="rule-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <p className="fine">
        Stuck? 50/50 removes two wrong answers, twice a game.
      </p>
      <button className="btn btn-go btn-block" onClick={onDone}>
        Got it
      </button>
    </div>
  );
}

export function CategoryDialog({
  category: c,
  stats,
  onPlay,
}: {
  category: Category;
  stats: Stats;
  onPlay: () => void;
}) {
  const count = stats.categoryCorrect[c.id] || 0;
  const tier = masteryFor(count);
  const boosted = spotlight().id === c.id;
  const total = questions.filter((q) => q.category === c.id).length;
  return (
    <div
      className="dialog category-dialog"
      style={{ "--cat": c.color, "--cat-ink": c.ink, "--cat-pale": c.pale }}
    >
      <span className="dialog-badge" aria-hidden="true">
        <CategoryIcon category={c} size={40} />
      </span>
      <h2 id="modal-title">{c.name}</h2>
      <p className="dialog-lead">{c.detail}</p>
      <ul className="dialog-facts">
        <li>{total} questions</li>
        <li>{count} right so far</li>
        {tier && <li className={`is-${tier.id}`}>{tier.label}</li>}
        {boosted && <li className="is-boost">1.5× XP this week</li>}
      </ul>
      <button className="btn btn-go btn-block" onClick={onPlay}>
        <Play size={20} fill="currentColor" aria-hidden="true" /> Play 10
        questions
      </button>
    </div>
  );
}

export function ReplaceDialog({
  game,
  onResume,
  onReplace,
}: {
  game: AnyGame;
  onResume: () => void;
  onReplace: () => void;
}) {
  const player = game.players[activeIndex(game)];
  return (
    <div className="dialog">
      <span className="dialog-avatar">
        <Avatar kind={player.kind} size="lg" />
      </span>
      <h2 id="modal-title">Start a new game?</h2>
      <p className="dialog-lead">
        This ends your current game
        {game.players.length > 1
          ? ` with ${game.players
              .filter((p) => p !== game.players.find((x) => !x.isBot))
              .map((p) => p.name)
              .join(", ")}`
          : ""}
        .
      </p>
      <div className="dialog-actions">
        <button className="btn btn-soft" onClick={onResume}>
          Keep playing
        </button>
        <button className="btn btn-go" onClick={onReplace}>
          New game
        </button>
      </div>
    </div>
  );
}
