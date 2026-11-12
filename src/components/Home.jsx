import {
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  Gauge,
  ListChecks,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  TimerOff,
  Users,
} from "lucide-react";
import Mascot from "./Mascot.jsx";
import Wheel, { CategoryIcon } from "./Wheel.jsx";
import { CopticCross } from "./Ornaments.jsx";
import { categories } from "../data.js";
import {
  activeIndex,
  currentRound,
  isSimultaneous,
  roundCount,
} from "../engine.js";
import { describeSettings, loadPrefs } from "../prefs.js";
import { churchSeason, formatCoptic, nextFeast } from "../calendar.js";
import { DAILY_LENGTH, dailyStatus, spotlight } from "../daily.js";

function TodayCard({ stats, playDaily }) {
  const today = new Date();
  const { coptic, feast, season } = churchSeason(today);
  const coming = !feast && !season ? nextFeast(today) : null;
  const daily = dailyStatus(stats, today);
  const got = daily.done ? daily.result.correct : 0;
  const note = feast
    ? feast.name
    : season
      ? season.name
      : coming
        ? `${coming.name} in ${coming.days} days`
        : "";
  return (
    <section className="home-today" aria-labelledby="today-title">
      <div className="home-today-head">
        <div className="home-today-title">
          <h2 id="today-title">Today’s five</h2>
        </div>
        <div className="home-today-stats">
          <span
            className="home-today-streak"
            role="img"
            aria-label={`${daily.streak}-day streak`}
          >
            <Flame size={18} aria-hidden="true" />
            <strong>{daily.streak}</strong>
          </span>
          {daily.freezes > 0 && (
            <span
              className="home-today-freeze"
              role="img"
              aria-label={`${daily.freezes} streak ${daily.freezes === 1 ? "freeze" : "freezes"} saved`}
              title="A saved freeze covers one missed day"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              <strong>{daily.freezes}</strong>
            </span>
          )}
        </div>
      </div>
      <span className="home-today-date">
        <CalendarDays size={15} aria-hidden="true" />
        <span>
          {formatCoptic(coptic)}
          {note ? ` · ${note}` : ""}
        </span>
      </span>
      <div className="home-today-row">
        <ol
          className="home-today-dots"
          aria-label={
            daily.done
              ? `${got} of ${daily.result.total} correct today`
              : `${DAILY_LENGTH} questions today`
          }
        >
          {Array.from({ length: DAILY_LENGTH }, (_, i) => (
            <li
              key={i}
              className={i < got ? "is-got" : ""}
              style={{ "--d": i }}
            />
          ))}
        </ol>
        {daily.done ? (
          <span className="home-today-done">
            <Check size={18} aria-hidden="true" /> Done
          </span>
        ) : (
          <button
            className="primary-button home-today-play"
            aria-label="Play today’s five"
            onClick={playDaily}
          >
            Play <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

function SettingChips({ settings, locked }) {
  const tier = settings.tier[0].toUpperCase() + settings.tier.slice(1);
  const clock = settings.timed ? `${settings.seconds}s` : "Off";
  return (
    <ul
      className="home-chips"
      aria-label={`${locked ? `${locked.short} only, ` : ""}${describeSettings(settings).replaceAll(" · ", ", ")}`}
    >
      {locked && (
        <li style={{ "--chip-color": locked.color }}>
          <CategoryIcon category={locked} size={15} aria-hidden="true" />
          {locked.short}
        </li>
      )}
      <li>
        <Gauge size={15} aria-hidden="true" />
        {tier}
      </li>
      <li>
        <ListChecks size={15} aria-hidden="true" />
        {settings.questions}
      </li>
      <li>
        {settings.timed ? (
          <Timer size={15} aria-hidden="true" />
        ) : (
          <TimerOff size={15} aria-hidden="true" />
        )}
        {clock}
      </li>
    </ul>
  );
}

export default function Home({
  game,
  navigate,
  openLobby,
  playNow,
  playDaily,
  stats,
  setModal,
}) {
  const prefs = loadPrefs();
  const ongoing = game && game.phase !== "finished";
  const activePlayer = ongoing ? game.players[activeIndex(game)] : null;
  const round = ongoing ? currentRound(game) : 1;
  const rounds = ongoing ? roundCount(game) : 3;
  const simultaneous = ongoing && isSimultaneous(game);
  const solo = ongoing && game.players.length === 1;
  const featured = spotlight();
  const locked =
    prefs.settings.category &&
    categories.find((c) => c.id === prefs.settings.category);
  return (
    <div className="home-tapestry">
      {ongoing && (
        <button className="resume-banner" onClick={() => navigate("game")}>
          <span className="resume-companion" aria-hidden="true">
            <Mascot kind={activePlayer.kind} portrait />
          </span>
          <span className="resume-copy">
            <strong>Resume your game</strong>
            <span>
              {simultaneous
                ? `Question ${round} of ${rounds}`
                : `Round ${round} of ${rounds}`}{" "}
              ·{" "}
              {simultaneous
                ? solo
                  ? "Today’s five"
                  : `${activePlayer.name} vs ${game.players.length - 1} practice bots`
                : `${activePlayer.name}’s turn · ${game.players.length} players`}
            </span>
          </span>
          <span className="resume-action">
            Keep playing <ArrowRight size={18} />
          </span>
        </button>
      )}

      <section className="home-play" aria-labelledby="play-title">
        <h1 id="play-title" className="sr-only">
          Ready for a round?
        </h1>
        <div className="home-wheel">
          <Wheel decorative rotation={0} onSpin={playNow} />
        </div>
        <div className="home-actions">
          <button className="primary-button play-now" onClick={() => playNow()}>
            <Play size={20} fill="currentColor" /> Play now
          </button>
          <button
            className="icon-button customize-button"
            aria-label="Customize"
            title="Customize"
            onClick={() => setModal({ type: "play-sheet" })}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
        <SettingChips settings={prefs.settings} locked={locked} />
      </section>

      <TodayCard stats={stats} playDaily={playDaily} />

      <button className="home-friends" onClick={() => openLobby("friends")}>
        <span className="home-friends-icon" aria-hidden="true">
          <Users size={22} />
        </span>
        <span className="home-friends-copy">
          <strong>Play with friends</strong>
          <span>2–4 players, one phone</span>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>

      <section className="topics-section" aria-labelledby="topics-heading">
        <div className="section-heading">
          <h2 id="topics-heading">On the wheel</h2>
          <span className="spotlight-note">
            This week: <strong>{featured.short}</strong> earns 1.5× XP
          </span>
          <button
            className="text-button"
            onClick={() => navigate("categories")}
          >
            Explore all <ArrowRight size={17} />
          </button>
        </div>
        <div className="topic-grid">
          {categories.map((c) => (
            <button
              aria-label={`Explore ${c.name}`}
              className={`topic-card ${c.id === featured.id ? "is-spotlight" : ""}`}
              key={c.id}
              style={{
                "--topic-color": c.color,
                "--topic-pale": c.pale,
                "--topic-ink": c.ink,
              }}
              onClick={() => setModal({ type: "category", category: c })}
            >
              <span className="topic-tablet" aria-hidden="true">
                <CategoryIcon category={c} size={26} />
              </span>
              <span className="topic-name">{c.name}</span>
              {c.id === featured.id && (
                <span className="topic-spotlight">1.5× XP</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <footer className="play-footer">
        <CopticCross size={22} />
        <span className="play-footer-name">
          kinesa{" "}
          <span lang="ar" dir="rtl">
            كنيسة
          </span>
        </span>
      </footer>
    </div>
  );
}
