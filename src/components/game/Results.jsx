import { forwardRef, useEffect, useRef, useState } from "react";
import {
  Award,
  Flame,
  Home,
  Play,
  ShieldCheck,
  RotateCcw,
  Share2,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Mascot, { MASCOTS } from "../Mascot.jsx";
import { CategoryIcon } from "../Wheel.jsx";
import { categories } from "../../data.js";
import {
  getWinners,
  isSimultaneous,
  matchLength,
  rankOf,
  roundCount,
} from "../../engine.js";
import { levelInfo, masteryFor } from "../../progress.js";
import { renderShareCard, shareResult } from "./share-card.js";
import { InterlaceRing } from "../Ornaments.jsx";

const ordinal = (n) =>
  `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || "th"}`;
const PODIUM_ORDER = [1, 0, 2];

function ProgressCard({ stats, meta }) {
  const fill = useRef(null);
  const before = levelInfo(meta.xpStart);
  const after = levelInfo(stats.xp);
  const gained = stats.xp - meta.xpStart;
  const leveled = after.level > before.level;
  const newBadges = stats.badges.filter((id) => !meta.badgesStart.includes(id));
  const mastery = categories
    .map((c) => ({
      c,
      now: masteryFor(stats.categoryCorrect[c.id]),
      was: masteryFor(meta.categoryStart[c.id]),
    }))
    .filter(({ now, was }) => now && now.id !== was?.id);
  useEffect(() => {
    const el = fill.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    el.animate(
      [
        { transform: `scaleX(${leveled ? 0 : before.progress})` },
        { transform: `scaleX(${after.progress})` },
      ],
      {
        duration: 900,
        delay: 350,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        fill: "backwards",
      },
    );
  }, []);
  return (
    <section
      className="results-progress"
      aria-labelledby="results-progress-title"
    >
      <div className="results-level">
        <span className="level-medal" aria-hidden="true">
          {after.level}
        </span>
        <div>
          <h2 id="results-progress-title">
            {leveled
              ? `Level up! You’re level ${after.level}`
              : `Level ${after.level}`}
          </h2>
          <span className="xp-gained">+{gained} XP this game</span>
        </div>
      </div>
      <div
        className="xp-track"
        role="progressbar"
        aria-label="Progress to the next level"
        aria-valuemin={0}
        aria-valuemax={after.span}
        aria-valuenow={after.into}
      >
        <i ref={fill} style={{ transform: `scaleX(${after.progress})` }} />
      </div>
      <span className="xp-caption">
        {after.next - stats.xp} XP to level {after.level + 1}
      </span>
      {(newBadges.length > 0 || mastery.length > 0) && (
        <ul className="results-unlocks">
          {newBadges.map((id) => {
            const c = categories.find((x) => x.id === id);
            return (
              <li key={`badge-${id}`} style={{ "--unlock-color": c.color }}>
                <span className="unlock-icon">
                  <CategoryIcon category={c} size={18} />
                </span>
                <span>
                  <strong>New badge</strong> {c.name}
                </span>
              </li>
            );
          })}
          {mastery.map(({ c, now }) => (
            <li
              key={`mastery-${c.id}`}
              className={`is-${now.id}`}
              style={{ "--unlock-color": c.color }}
            >
              <span className="unlock-icon">
                <Award size={18} />
              </span>
              <span>
                <strong>{now.label}</strong> in {c.name}
              </span>
            </li>
          ))}
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
    onPractice,
    onEditPlayers,
    onHome,
    onInspectPlayer,
    onToast,
  },
  headingRef,
) {
  const simultaneous = isSimultaneous(game);
  const total = simultaneous ? matchLength(game) : roundCount(game);
  const winners = getWinners(game.players);
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const me = game.players.find((p) => !p.isBot);
  const myRank = me ? rankOf(game.players, me) : 0;
  const shared =
    me && game.players.filter((p) => p.score === me.score).length > 1;
  const daily = mode === "daily";
  const solo = game.players.length === 1;
  const iWon = daily
    ? me.correct >= total - 1
    : simultaneous
      ? myRank === 1
      : true;
  const [picking, setPicking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareArt = useRef(null);
  const focusPlayer = simultaneous ? me : winners[0];
  const headline = daily
    ? me.correct === total
      ? "A perfect five!"
      : "Today’s five, done."
    : simultaneous
      ? myRank === 1
        ? shared
          ? "Tied for first!"
          : "You win!"
        : `You placed ${ordinal(myRank)}`
      : winners.length > 1
        ? "A shared celebration!"
        : `${winners[0].name} takes the crown!`;
  const streak = stats.daily?.streak ?? 0;
  const sub = daily
    ? `${me.correct} of ${total} correct · ${me.score} points`
    : simultaneous
      ? `${me.correct} of ${total} correct · best streak ${me.bestStreak}`
      : `${winners[0].correct} of ${total} correct · ${winners[0].score} points`;
  const share = async () => {
    setSharing(true);
    try {
      const blob = await renderShareCard({
        headline: daily
          ? `Today: ${me.correct}/${total}`
          : simultaneous
            ? `I scored ${me.correct}/${total}`
            : `${winners[0].name} won!`,
        detail: daily
          ? `Kinesa daily · ${streak}-day streak`
          : simultaneous
            ? `on Kinesa${me.bestStreak >= 3 ? ` · ${me.bestStreak} in a row` : ""}`
            : `${winners[0].score} points in our Kinesa match`,
        companionSvg: shareArt.current?.querySelector("svg"),
        companionBg: MASCOTS.find((m) => m.kind === focusPlayer.kind)?.bg,
      });
      const result = await shareResult({
        blob,
        text: daily
          ? `Kinesa daily: ${me.correct}/${total}, ${streak}-day streak.`
          : simultaneous
            ? `I scored ${me.correct}/${total} on Kinesa!`
            : `${winners[0].name} won our Kinesa match!`,
      });
      if (result === "downloaded") onToast("Result image saved");
    } catch {
      onToast("Couldn’t make the image this time");
    } finally {
      setSharing(false);
    }
  };
  return (
    <section className={`results-stage ${iWon ? "is-win" : "is-loss"}`}>
      {iWon && (
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
      )}
      <div className="results-hero">
        <span className="results-emblem" aria-hidden="true">
          <svg viewBox="0 0 320 320">
            <InterlaceRing radius={136} width={18} crossings={18} />
          </svg>
          <Trophy className="winner-trophy" size={34} />
        </span>
        <h1 ref={headingRef} tabIndex={-1}>
          {headline}
        </h1>
        <p className="results-sub">{sub}</p>
      </div>
      {daily && (
        <div className="daily-streak-card">
          <Flame size={30} aria-hidden="true" />
          <div>
            <strong>{streak}-day streak</strong>
            <span>
              {matchMeta?.dailyOutcome?.usedFreeze
                ? "A saved freeze covered the day you missed."
                : matchMeta?.dailyOutcome?.earnedFreeze
                  ? "Seven in a row: you earned a streak freeze."
                  : "Come back tomorrow for a new five."}
            </span>
          </div>
          {stats.daily?.freezes > 0 && (
            <span className="daily-freezes" title="Streak freezes saved">
              <ShieldCheck size={16} aria-hidden="true" /> {stats.daily.freezes}
            </span>
          )}
        </div>
      )}
      {!solo && (
        <ol className="podium" aria-label="Podium">
          {PODIUM_ORDER.filter((i) => sorted[i]).map((i) => {
            const p = sorted[i];
            const rank = rankOf(game.players, p);
            return (
              <li
                key={p.kind}
                className={`podium-step rank-${Math.min(rank, 3)}`}
                style={{ "--step": PODIUM_ORDER.indexOf(i) }}
              >
                <span className="podium-mascot">
                  <Mascot
                    kind={p.kind}
                    mood={rank === 1 ? "celebrate" : "happy"}
                  />
                </span>
                <strong className="podium-name">
                  {p.name}
                  {p.isBot && <small className="bot-tag">BOT</small>}
                </strong>
                <span className="podium-block">
                  <span className="podium-rank">{ordinal(rank)}</span>
                  <span className="podium-score">{p.score}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {matchMeta && <ProgressCard stats={stats} meta={matchMeta} />}
      {daily ? (
        <div className="results-actions is-single">
          <button className="primary-button" onClick={onPractice}>
            <Play size={18} fill="currentColor" /> Play a practice round
          </button>
        </div>
      ) : (
        <div className="results-actions">
          <button className="primary-button" onClick={() => onRematch()}>
            <RotateCcw size={18} /> Rematch
          </button>
          <button
            className="secondary-button"
            aria-expanded={picking}
            aria-controls="category-rematch"
            onClick={() => setPicking((v) => !v)}
          >
            <Shuffle size={18} /> Different category
          </button>
        </div>
      )}
      {picking && !daily && (
        <div
          className="category-rematch"
          id="category-rematch"
          role="group"
          aria-label="Play a category"
        >
          {categories.map((c) => (
            <button
              key={c.id}
              style={{ "--chip-color": c.color, "--chip-pale": c.pale }}
              onClick={() => onRematch(c.id)}
            >
              <CategoryIcon category={c} size={16} /> {c.short}
            </button>
          ))}
          <button
            style={{ "--chip-color": "#6955d9", "--chip-pale": "#efeafe" }}
            onClick={() => onRematch(null)}
          >
            <Sparkles size={16} /> Mix
          </button>
        </div>
      )}
      <div className="results-secondary">
        <button className="text-button" onClick={share} disabled={sharing}>
          <Share2 size={17} /> {sharing ? "Making image…" : "Share result"}
        </button>
        {mode === "friends" && (
          <button className="text-button" onClick={onEditPlayers}>
            <Users size={17} /> Change players
          </button>
        )}
        <button className="text-button" onClick={onHome}>
          <Home size={17} /> Back to play
        </button>
      </div>
      {!solo && <h2 className="results-standings-title">Final standings</h2>}
      {!solo && (
        <ol className="final-scores">
          {sorted.map((p) => (
            <li key={p.kind}>
              <button
                className={`final-score-row ${winners.includes(p) ? "is-winner" : ""}`}
                onClick={() => onInspectPlayer(p)}
              >
                <span className="result-rank">{rankOf(game.players, p)}</span>
                <span className="result-avatar">
                  <Mascot kind={p.kind} portrait />
                </span>
                <span className="result-player">
                  <strong>
                    {p.name}
                    {p.isBot && <small className="bot-tag">BOT</small>}
                  </strong>
                  <span>
                    {p.correct} of {total} correct
                    {p.correct === total
                      ? " · Perfect game!"
                      : p.bestStreak >= 3
                        ? ` · best streak ${p.bestStreak}`
                        : ""}
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
      )}
      <div className="share-art" ref={shareArt} aria-hidden="true">
        <Mascot kind={focusPlayer.kind} portrait softSurface={false} paused />
      </div>
    </section>
  );
});
export default Results;
