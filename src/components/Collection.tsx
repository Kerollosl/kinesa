import {
  Check,
  Flame,
  Gamepad2,
  Play,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { categories } from "../data.ts";
import { CategoryIcon } from "./Wheel.tsx";
import { MASTERY, levelInfo, masteryFor, nextMastery } from "../progress.ts";
import { dailyStatus } from "../daily.ts";
import AboutLinks from "./AboutLinks.tsx";
import type { Stats } from "../types.ts";

// Level, a few numbers, and Bronze → Silver → Gold in every category.
export default function Collection({
  stats,
  onPlay,
}: {
  stats: Stats;
  onPlay: () => void;
}) {
  const level = levelInfo(stats.xp);
  const daily = dailyStatus(stats);
  const gold = MASTERY[0].min;
  return (
    <div className="page trophies">
      <h1>Trophies</h1>
      <section className="level-card" aria-label={`Level ${level.level}`}>
        <span className="level-medal is-big" aria-hidden="true">
          {level.level}
        </span>
        <div className="level-card-body">
          <strong>Level {level.level}</strong>
          <span
            className="level-bar"
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={level.span}
            aria-valuenow={level.into}
          >
            <i style={{ transform: `scaleX(${level.progress})` }} />
          </span>
          <span className="level-note">
            {level.next - stats.xp} XP to level {level.level + 1}
          </span>
        </div>
      </section>
      <ul className="stat-grid" aria-label="Your numbers">
        {(
          [
            [Gamepad2, stats.games, "Games"],
            [Trophy, stats.wins, "Wins"],
            [Zap, stats.correct, "Right answers"],
            [Flame, daily.streak, "Day streak"],
          ] as [LucideIcon, number, string][]
        ).map(([Icon, value, label]) => (
          <li key={label}>
            <Icon size={22} aria-hidden="true" />
            <strong>{value}</strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <h2>Category medals</h2>
      <ul className="medal-list">
        {categories.map((c) => {
          const count = stats.categoryCorrect[c.id] || 0;
          const tier = masteryFor(count);
          const next = nextMastery(count);
          return (
            <li
              key={c.id}
              style={{ "--cat": c.color, "--cat-ink": c.ink }}
              className={tier ? `is-${tier.id}` : ""}
            >
              <span className="medal-icon" aria-hidden="true">
                <CategoryIcon category={c} size={24} />
              </span>
              <span className="medal-body">
                <strong>{c.name}</strong>
                <span
                  className="medal-bar"
                  role="progressbar"
                  aria-label={`${c.name}: ${count} right`}
                  aria-valuemin={0}
                  aria-valuemax={gold}
                  aria-valuenow={Math.min(count, gold)}
                >
                  <i
                    style={{
                      transform: `scaleX(${Math.min(1, count / gold)})`,
                    }}
                  />
                  {MASTERY.map((m) => (
                    <b
                      key={m.id}
                      className={count >= m.min ? "is-hit" : ""}
                      style={{ left: `${(m.min / gold) * 100}%` }}
                    />
                  ))}
                </span>
                <span className="medal-note">
                  {next
                    ? `${next.min - count} more for ${next.label}`
                    : "All gold!"}
                </span>
              </span>
              <span className="medal-tag">
                {tier ? (
                  tier.label
                ) : (
                  <span className="medal-count">{count}</span>
                )}
                {tier?.id === "gold" && <Check size={14} aria-hidden="true" />}
              </span>
            </li>
          );
        })}
      </ul>
      {stats.games === 0 && (
        <button className="btn btn-go btn-block" onClick={onPlay}>
          <Play size={20} fill="currentColor" aria-hidden="true" /> Play your
          first game
        </button>
      )}
      <p className="fine about">
        Saved on this device. <AboutLinks />
      </p>
    </div>
  );
}
