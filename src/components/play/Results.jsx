import { forwardRef, useEffect, useRef, useState } from "react";
import {
  Award,
  Check,
  Flame,
  Home as HomeIcon,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { MASCOTS } from "../Mascot.jsx";
import Companion from "../Companion.jsx";
import { CategoryIcon } from "../Wheel.jsx";
import { InterlaceRing } from "../Ornaments.jsx";
import { categories } from "../../data.js";
import {
  getWinners,
  isSimultaneous,
  matchLength,
  rankOf,
  roundCount,
} from "../../engine.js";
import { classicWinners, isClassic, standings } from "../../classic.js";
import { levelInfo, masteryFor } from "../../progress.js";
import { renderShareCard, shareResult } from "../game/share-card.js";
import { CategoryPips } from "./Pips.jsx";
import { Avatar, BotTag } from "./Parts.jsx";

const ordinal = (n) =>
  `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || "th"}`;
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function CountUp({ to, ms = 600, delay = 300 }) {
  const [value, setValue] = useState(reducedMotion() ? to : 0);
  useEffect(() => {
    if (reducedMotion() || !to) return setValue(to);
    let raf;
    let start;
    const tick = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return value;
}

// Level medal, XP bar, and anything newly unlocked this game.
function LevelRow({ stats, meta, showUnlocks = true }) {
  const fill = useRef(null);
  const before = levelInfo(meta.xpStart);
  const after = levelInfo(stats.xp);
  const leveled = after.level > before.level;
  const fresh = stats.badges.filter((id) => !meta.badgesStart.includes(id));
  const mastery = categories
    .map((c) => ({
      c,
      now: masteryFor(stats.categoryCorrect[c.id]),
      was: masteryFor(meta.categoryStart[c.id]),
    }))
    .filter(({ now, was }) => now && now.id !== was?.id);
  // Medals first (rarer), then first-time categories.
  const chips = [
    ...mastery.map(({ c, now }) => ({
      key: `m-${c.id}`,
      c,
      tier: now.id,
      label: `${now.label} · ${c.short}`,
    })),
    ...fresh.map((id) => {
      const c = categories.find((x) => x.id === id);
      return { key: id, c, label: `New: ${c.short}` };
    }),
  ];
  useEffect(() => {
    if (!fill.current || reducedMotion()) return;
    fill.current.animate(
      [
        { transform: `scaleX(${leveled ? 0 : before.progress})` },
        { transform: `scaleX(${after.progress})` },
      ],
      {
        duration: 900,
        delay: 400,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "backwards",
      },
    );
  }, []);
  return (
    <section className="level-row" aria-label={`Level ${after.level}`}>
      <span className="level-medal" aria-hidden="true">
        {after.level}
      </span>
      <div className="level-bar-wrap">
        <span
          className="level-bar"
          role="progressbar"
          aria-label="Progress to the next level"
          aria-valuemin={0}
          aria-valuemax={after.span}
          aria-valuenow={after.into}
        >
          <i ref={fill} style={{ transform: `scaleX(${after.progress})` }} />
        </span>
        <span className={`level-note ${leveled ? "is-up" : ""}`}>
          {leveled ? (
            <>
              <Sparkles size={14} aria-hidden="true" /> Level up!
            </>
          ) : (
            `${after.next - stats.xp} XP to level ${after.level + 1}`
          )}
        </span>
      </div>
      {showUnlocks && chips.length > 0 && (
        <ul className="unlocks">
          {chips.slice(0, 3).map(({ key, c, label, tier }) => (
            <li
              key={key}
              className={tier ? `is-${tier}` : ""}
              style={{ "--cat": c.color, "--cat-ink": c.ink }}
            >
              {tier ? (
                <Award size={14} aria-hidden="true" />
              ) : (
                <CategoryIcon category={c} size={14} aria-hidden="true" />
              )}
              {label}
            </li>
          ))}
          {chips.length > 3 && (
            <li className="is-more">+{chips.length - 3} more</li>
          )}
        </ul>
      )}
    </section>
  );
}

const Results = forwardRef(function Results(
  {
    game,
    mode,
    stats,
    matchMeta,
    onRematch,
    onPlay,
    onHome,
    onEditPlayers,
    onToast,
  },
  headingRef,
) {
  const classic = isClassic(game);
  const daily = mode === "daily";
  const simultaneous = isSimultaneous(game);
  const me = game.players.find((p) => !p.isBot);
  const humans = game.players.filter((p) => !p.isBot).length;
  const winners = classic ? classicWinners(game) : getWinners(game.players);
  const tie = winners.length > 1;
  const sorted = classic
    ? standings(game)
    : [...game.players].sort((a, b) => b.score - a.score);
  const total = classic
    ? null
    : simultaneous
      ? matchLength(game)
      : roundCount(game);
  const myRank = me
    ? classic
      ? sorted.findIndex((p) => p === me) + 1
      : rankOf(game.players, me)
    : 0;
  const iWon = daily
    ? me.correct >= total - 1
    : humans === 1
      ? winners.includes(me)
      : true;
  const headline = daily
    ? me.correct === total
      ? "Perfect five!"
      : `${me.correct} of ${total}`
    : tie
      ? "It’s a tie!"
      : humans === 1
        ? winners.includes(me)
          ? "You win!"
          : classic
            ? `${winners[0].name} wins`
            : `You placed ${ordinal(myRank)}`
        : `${winners[0].name} wins!`;
  const sub = daily
    ? matchMeta?.dailyOutcome?.usedFreeze
      ? "A streak freeze covered the day you missed."
      : matchMeta?.dailyOutcome?.earnedFreeze
        ? "Seven days in a row: you earned a streak freeze."
        : "New five tomorrow."
    : null;
  // The winner takes the spotlight; on a shared win, you do.
  const hero = daily || winners.includes(me) ? me : winners[0];
  const streak = stats.daily?.streak ?? 0;
  const gained = matchMeta ? stats.xp - matchMeta.xpStart : 0;
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    setSharing(true);
    const line = daily
      ? `Kinesa daily: ${me.correct}/${total}, ${streak}-day streak.`
      : classic
        ? `${tie ? "A tie" : `${winners[0].name} won`} on Kinesa: ${winners[0].won.length} of 6 categories.`
        : `I scored ${me.correct}/${total} on Kinesa!`;
    try {
      const blob = await renderShareCard({
        headline: daily
          ? `Today: ${me.correct}/${total}`
          : classic
            ? tie
              ? "A tie!"
              : `${winners[0].name} won!`
            : `I scored ${me.correct}/${total}`,
        detail: daily
          ? `Kinesa daily · ${streak}-day streak`
          : classic
            ? `${winners[0].won.length} of 6 categories on Kinesa`
            : "on Kinesa",
        companionKind: hero.kind,
        companionBg: MASCOTS.find((m) => m.kind === hero.kind)?.bg,
      });
      const result = await shareResult({ blob, text: line });
      if (result === "downloaded") onToast("Result image saved");
    } catch {
      onToast("Couldn’t make the image this time", "warn");
    } finally {
      setSharing(false);
    }
  };
  return (
    <section
      className={`results ${iWon ? "is-win" : "is-loss"}`}
      aria-labelledby="results-title"
    >
      {iWon && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i
              key={i}
              style={{
                background: i % 4 === 3 ? "#ecc965" : categories[i % 6].color,
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 8) * 0.12}s`,
                "--drift": `${((i * 53) % 60) - 30}px`,
              }}
            />
          ))}
        </div>
      )}
      <div className="results-hero">
        <span className="results-art" aria-hidden="true">
          <svg viewBox="0 0 320 320">
            <InterlaceRing radius={146} width={14} crossings={24} />
          </svg>
          <Companion
            kind={hero.kind}
            act={
              daily
                ? me.correct >= total - 1
                  ? "win"
                  : me.correct >= 2
                    ? "cheer"
                    : "sad"
                : "win"
            }
          />
          {iWon && !daily && (
            <span className="results-trophy">
              <Trophy size={22} />
            </span>
          )}
        </span>
        <h1 id="results-title" ref={headingRef} tabIndex={-1}>
          {headline}
        </h1>
        {sub && <p className="results-sub">{sub}</p>}
      </div>

      {(daily || (humans === 1 && !classic)) && (
        <ul className="results-stats" aria-label="Your game">
          {!daily && (
            <li>
              <Check size={20} aria-hidden="true" />
              <strong>
                {me.correct}/{total}
              </strong>
              <span>right</span>
            </li>
          )}
          <li>
            <Flame size={20} aria-hidden="true" />
            <strong>
              <CountUp to={daily ? streak : me.bestStreak} />
            </strong>
            <span>{daily ? "day streak" : "best run"}</span>
          </li>
          {matchMeta && (
            <li>
              <Zap size={20} aria-hidden="true" />
              <strong>
                +<CountUp to={gained} />
              </strong>
              <span>XP</span>
            </li>
          )}
          {daily && stats.daily?.freezes > 0 && (
            <li>
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>{stats.daily.freezes}</strong>
              <span>freeze</span>
            </li>
          )}
        </ul>
      )}

      {game.players.length > 1 && (
        <ol className="results-table" aria-label="Final standings">
          {sorted.map((p, i) => {
            const won = winners.includes(p);
            return (
              <li
                key={p.kind}
                className={`${won ? "is-winner" : ""} ${p === me && humans === 1 ? "is-me" : ""}`}
                style={{ "--row": i }}
              >
                <span className="results-rank" aria-label={ordinal(i + 1)}>
                  {won ? <Trophy size={18} aria-hidden="true" /> : i + 1}
                </span>
                <Avatar kind={p.kind} size="sm" />
                <span className="results-name">
                  <strong>{p.name}</strong>
                  {p.isBot && <BotTag />}
                </span>
                {classic ? (
                  <CategoryPips won={p.won} size="xs" />
                ) : (
                  <>
                    <span className="results-score">{p.score}</span>
                    <span
                      className="results-right"
                      aria-label={`${p.correct} right`}
                    >
                      <Check size={14} aria-hidden="true" />
                      {p.correct}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {matchMeta && (
        <LevelRow stats={stats} meta={matchMeta} showUnlocks={humans === 1} />
      )}

      <div className="play-actions results-actions">
        {daily ? (
          <button className="btn btn-go btn-xl" onClick={onPlay}>
            <Play size={20} fill="currentColor" aria-hidden="true" /> Play a
            game
          </button>
        ) : (
          <button className="btn btn-go btn-xl" onClick={onRematch}>
            <RotateCcw size={20} aria-hidden="true" /> Rematch
          </button>
        )}
        <div className="results-tools">
          <button className="btn btn-soft" onClick={onHome}>
            <HomeIcon size={20} aria-hidden="true" /> Home
          </button>
          {mode === "friends" && (
            <button
              className="icon-btn is-soft"
              onClick={onEditPlayers}
              aria-label="Change players"
              title="Change players"
            >
              <Users size={22} />
            </button>
          )}
          <button
            className="icon-btn is-soft"
            onClick={share}
            disabled={sharing}
            aria-label={sharing ? "Making image…" : "Share result"}
            title="Share result"
          >
            <Share2 size={22} />
          </button>
        </div>
      </div>
    </section>
  );
});
export default Results;
