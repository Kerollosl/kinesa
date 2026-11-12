import { forwardRef, useEffect, useRef, useState } from "react";
import {
  Award,
  BookOpenCheck,
  Check,
  Flame,
  Medal,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
  Zap,
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
// Numbers climb to their value once; reduced motion shows the value at once.
function CountUp({ to, ms = 520, delay = 260 }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced || !to) {
      setValue(to);
      return;
    }
    let raf;
    let start;
    const tick = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return value;
}

// One flat row: level medal, the XP bar filling, and what is left to the next level.
function LevelRow({ stats, meta }) {
  const fill = useRef(null);
  const before = levelInfo(meta.xpStart);
  const after = levelInfo(stats.xp);
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
    <section className="result-level" aria-labelledby="result-level-title">
      <h2 id="result-level-title" className="sr-only">
        {leveled
          ? `Level up! You’re level ${after.level}`
          : `Level ${after.level}`}
      </h2>
      <span className="result-medal" aria-hidden="true">
        {after.level}
      </span>
      <div className="result-level-bar">
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
        <span className={`result-level-note ${leveled ? "is-up" : ""}`}>
          {leveled ? (
            <>
              <Sparkles size={14} aria-hidden="true" /> Level up!
            </>
          ) : (
            `${after.next - stats.xp} XP to level ${after.level + 1}`
          )}
        </span>
      </div>
      {(newBadges.length > 0 || mastery.length > 0) && (
        <ul className="result-unlocks">
          {newBadges.map((id) => {
            const c = categories.find((x) => x.id === id);
            return (
              <li
                key={`badge-${id}`}
                aria-label={`New badge: ${c.name}`}
                style={{ "--unlock-color": c.color, "--unlock-ink": c.ink }}
              >
                <span className="unlock-badge" aria-hidden="true">
                  <CategoryIcon category={c} size={14} />
                </span>
                <span aria-hidden="true">{c.short}</span>
              </li>
            );
          })}
          {mastery.map(({ c, now }) => (
            <li
              key={`mastery-${c.id}`}
              className={`is-${now.id}`}
              aria-label={`${now.label} in ${c.name}`}
              style={{ "--unlock-color": c.color, "--unlock-ink": c.ink }}
            >
              <span className="unlock-badge" aria-hidden="true">
                <Award size={14} />
              </span>
              <span aria-hidden="true">
                {now.label} · {c.short}
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
      onToast("Couldn’t make the image this time", "warn");
    } finally {
      setSharing(false);
    }
  };
  const gained = matchMeta ? stats.xp - matchMeta.xpStart : 0;
  const HeroIcon = iWon
    ? Trophy
    : myRank > 0 && myRank <= 3
      ? Medal
      : BookOpenCheck;
  const lastStat = daily
    ? { icon: Flame, value: streak, label: `${streak}-day streak` }
    : {
        icon: Flame,
        value: focusPlayer.bestStreak,
        label: `Best streak ${focusPlayer.bestStreak}`,
      };
  const note = daily
    ? matchMeta?.dailyOutcome?.usedFreeze
      ? "A saved freeze covered the day you missed."
      : matchMeta?.dailyOutcome?.earnedFreeze
        ? "Seven in a row: you earned a streak freeze."
        : "Come back tomorrow for a new five."
    : "";
  return (
    <section className={`result-screen ${iWon ? "is-win" : "is-loss"}`}>
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
      <div className="result-body">
        <header className="result-summary">
          <span className="result-emblem" aria-hidden="true">
            <svg viewBox="0 0 320 320">
              <InterlaceRing radius={136} width={18} crossings={18} />
            </svg>
            <HeroIcon size={26} />
          </span>
          <h1 ref={headingRef} tabIndex={-1}>
            {headline}
          </h1>
        </header>
        <ul className="result-stats" aria-label="Your match">
          <li aria-label={`${focusPlayer.correct} of ${total} correct`}>
            <Check size={18} aria-hidden="true" />
            <strong>
              {focusPlayer.correct}/{total}
            </strong>
          </li>
          {matchMeta && (
            <li aria-label={`${gained} XP earned`}>
              <Zap size={18} aria-hidden="true" />
              <strong>
                +<CountUp to={gained} />
              </strong>
            </li>
          )}
          <li aria-label={lastStat.label}>
            <lastStat.icon size={18} aria-hidden="true" />
            <strong>
              <CountUp to={lastStat.value} />
            </strong>
          </li>
          {daily && stats.daily?.freezes > 0 && (
            <li aria-label={`${stats.daily.freezes} streak freezes saved`}>
              <ShieldCheck size={18} aria-hidden="true" />
              <strong>{stats.daily.freezes}</strong>
            </li>
          )}
        </ul>
        {note && <p className="result-note">{note}</p>}
        {matchMeta && <LevelRow stats={stats} meta={matchMeta} />}
        {!solo && (
          <ol className="rank-list" aria-label="Final standings">
            {sorted.map((p, index) => {
              const rank = rankOf(game.players, p);
              const winner = winners.includes(p);
              return (
                <li key={p.kind} style={{ "--row": index }}>
                  <button
                    className={`rank-row ${winner ? "is-winner" : ""} ${simultaneous && p === me ? "is-me" : ""}`}
                    onClick={() => onInspectPlayer(p)}
                  >
                    <span className="rank-pos">
                      <span className="sr-only">{ordinal(rank)}</span>
                      <span aria-hidden="true">
                        {winner ? <Trophy size={18} /> : rank}
                      </span>
                    </span>
                    <span className="rank-avatar">
                      <Mascot kind={p.kind} portrait />
                    </span>
                    <span className="rank-name">
                      <strong>{p.name}</strong>
                      {p.isBot && <small className="bot-tag">BOT</small>}
                    </span>
                    <span
                      className="rank-correct"
                      aria-label={`${p.correct} of ${total} correct`}
                    >
                      <Check size={14} aria-hidden="true" />
                      {p.correct}
                    </span>
                    <span className="rank-points">{p.score}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="action-bar">
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
        <div className="action-bar-row">
          {daily ? (
            <button className="primary-button" onClick={onPractice}>
              <Play size={18} fill="currentColor" /> Play a practice round
            </button>
          ) : (
            <>
              <button className="primary-button" onClick={() => onRematch()}>
                <RotateCcw size={18} /> Rematch
              </button>
              <button
                className="icon-button"
                aria-label="Different category"
                title="Different category"
                aria-expanded={picking}
                aria-controls="category-rematch"
                onClick={() => setPicking((v) => !v)}
              >
                <Shuffle size={20} />
              </button>
            </>
          )}
          <button
            className="icon-button"
            aria-label={sharing ? "Making image…" : "Share result"}
            title="Share result"
            onClick={share}
            disabled={sharing}
          >
            <Share2 size={20} />
          </button>
          {mode === "friends" && (
            <button
              className="icon-button"
              aria-label="Change players"
              title="Change players"
              onClick={onEditPlayers}
            >
              <Users size={20} />
            </button>
          )}
        </div>
      </div>
      <div className="share-art" ref={shareArt} aria-hidden="true">
        <Mascot kind={focusPlayer.kind} portrait softSurface={false} paused />
      </div>
    </section>
  );
});
export default Results;
