import {
  ArrowRight,
  CalendarDays,
  Check,
  Play,
  Plus,
  Users,
} from "lucide-react";
import Wheel, { CLASSIC_SEGMENTS } from "./Wheel.jsx";
import { categories } from "../data.js";
import {
  activeIndex,
  currentRound,
  isSimultaneous,
  roundCount,
} from "../engine.js";
import { isClassic } from "../classic.js";
import { churchSeason, formatCoptic, nextFeast } from "../calendar.js";
import { DAILY_LENGTH, dailyStatus } from "../daily.js";
import { CategoryPips } from "./play/Pips.jsx";
import { Avatar, BotTag } from "./play/Parts.jsx";

// The game you left: who's playing, where it stands, whose turn.
function ResumeCard({ game, onResume }) {
  const player = game.players[activeIndex(game)];
  const humans = game.players.filter((p) => !p.isBot).length;
  let status;
  if (isClassic(game))
    status =
      humans === 1
        ? game.players[game.turn].isBot
          ? `${player.name}’s turn`
          : "Your turn"
        : `${player.name}’s turn`;
  else if (game.settings?.daily)
    status = `Today’s five · ${currentRound(game)} of ${roundCount(game)}`;
  else if (isSimultaneous(game))
    status = `${categories.find((c) => c.id === game.settings?.category)?.name || "Practice"} · ${currentRound(game)} of ${roundCount(game)}`;
  else status = `${player.name}’s turn · round ${currentRound(game)}`;
  return (
    <button className="resume" onClick={onResume}>
      <span className="resume-label">Your game</span>
      {isClassic(game) ? (
        <span className="resume-seats">
          {game.players.map((p) => (
            <span key={p.kind} className="resume-seat">
              <Avatar kind={p.kind} size="sm" />
              <span className="resume-name">
                {p.name}
                {p.isBot && <BotTag />}
              </span>
              <CategoryPips won={p.won} size="xs" label={false} />
            </span>
          ))}
        </span>
      ) : (
        <span className="resume-seats">
          <span className="resume-seat">
            <Avatar kind={player.kind} size="sm" />
          </span>
        </span>
      )}
      <span className="resume-foot">
        <span className="resume-status">{status}</span>
        <span className="resume-go">
          Continue <ArrowRight size={18} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

export default function Home({
  game,
  stats,
  onResume,
  onPlay,
  onFriends,
  onDaily,
}) {
  const ongoing = game && game.phase !== "finished";
  const daily = dailyStatus(stats);
  const got = daily.done ? daily.result.correct : 0;
  const today = new Date();
  const { coptic, feast, season } = churchSeason(today);
  const coming = !feast && !season ? nextFeast(today) : null;
  const note =
    feast?.name ||
    season?.name ||
    (coming ? `${coming.name} in ${coming.days} days` : "");
  return (
    <div className="home">
      <h1 className="sr-only">Kinesa: Coptic trivia</h1>
      {ongoing && <ResumeCard game={game} onResume={onResume} />}
      <section className="home-hero" aria-label="Play">
        <div className="home-wheel">
          <Wheel segments={CLASSIC_SEGMENTS} />
        </div>
        <button className="btn btn-go btn-mega" onClick={onPlay}>
          {ongoing ? (
            <>
              <Plus size={28} strokeWidth={3} aria-hidden="true" /> New game
            </>
          ) : (
            <>
              <Play size={28} fill="currentColor" aria-hidden="true" /> Play
            </>
          )}
        </button>
      </section>
      <div className="home-modes">
        <button className="mode-tile is-friends" onClick={onFriends}>
          <span className="mode-icon" aria-hidden="true">
            <Users size={26} />
          </span>
          <strong>Friends</strong>
          <span className="mode-note">2–4 players, one phone</span>
        </button>
        <button
          className={`mode-tile is-daily ${daily.done ? "is-done" : ""}`}
          onClick={onDaily}
          aria-label={
            daily.done
              ? `Today’s five: done, ${got} of ${DAILY_LENGTH}`
              : "Play today’s five"
          }
        >
          <span className="mode-icon" aria-hidden="true">
            {daily.done ? (
              <Check size={26} strokeWidth={3} />
            ) : (
              <CalendarDays size={26} />
            )}
          </span>
          <strong>Today’s 5</strong>
          <span className="mode-dots" aria-hidden="true">
            {Array.from({ length: DAILY_LENGTH }, (_, i) => (
              <i key={i} className={i < got ? "is-got" : ""} />
            ))}
          </span>
        </button>
      </div>
      <p className="home-day">
        {formatCoptic(coptic)}
        {note ? ` · ${note}` : ""}
      </p>
    </div>
  );
}
