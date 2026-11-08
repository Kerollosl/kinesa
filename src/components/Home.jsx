import { useState } from "react";
import {
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import GameScene from "./GameScene.jsx";
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
import "./home-tapestry.css";

export default function Home({ game, navigate, openLobby, playNow, setModal }) {
  const [motionPaused, setMotionPaused] = useState(false);
  const [previewCategory, setPreviewCategory] = useState(null);
  const prefs = loadPrefs();
  const ongoing = game && game.phase !== "finished";
  const activePlayer = ongoing ? game.players[activeIndex(game)] : null;
  const round = ongoing ? currentRound(game) : 1;
  const rounds = ongoing ? roundCount(game) : 3;
  const simultaneous = ongoing && isSimultaneous(game);
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
                ? `${activePlayer.name} vs ${game.players.length - 1} practice bots`
                : `${activePlayer.name}’s turn · ${game.players.length} players`}
            </span>
          </span>
          <span className="resume-action">
            Keep playing <ArrowRight size={18} />
          </span>
        </button>
      )}

      <section className="play-hero" aria-labelledby="play-title">
        <div className="play-hero-copy">
          <div className="mobile-home-title">
            <h1 id="play-title">Ready for a round?</h1>
          </div>
          <p className="play-hero-lead">
            Scripture, saints, feasts and the story of the Coptic Church.
            Everyone answers at once; the fastest and steadiest win.
          </p>
          <div className="play-hero-actions">
            <button
              className="primary-button play-now"
              onClick={() => playNow()}
            >
              <Play size={20} fill="currentColor" /> Play now
            </button>
            <button
              className="secondary-button"
              onClick={() => setModal({ type: "play-sheet" })}
            >
              <SlidersHorizontal size={18} /> Customize
            </button>
          </div>
          <p className="play-hero-meta">
            {locked ? `${locked.short} only · ` : ""}
            {describeSettings(prefs.settings)} · vs 3 practice bots
          </p>
        </div>
        <div className="play-hero-roundel" aria-hidden="true">
          <Wheel decorative rotation={0} />
        </div>
      </section>

      <button className="friends-card" onClick={() => openLobby("friends")}>
        <span className="friends-card-icon" aria-hidden="true">
          <Users size={24} />
        </span>
        <span className="friends-card-copy">
          <strong>Play with friends</strong>
          <span>2–4 players take turns on one phone</span>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>

      <section className="topics-section" aria-labelledby="topics-heading">
        <div className="section-heading">
          <h2 id="topics-heading">On the wheel</h2>
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
              className="topic-card"
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
            </button>
          ))}
        </div>
      </section>

      <section
        className="companions-section"
        aria-labelledby="companions-heading"
      >
        <div className="section-heading">
          <h2 id="companions-heading">Your Gospel companions</h2>
          <button
            className="text-button"
            onClick={() => setModal({ type: "squad" })}
          >
            Meet the four <ArrowRight size={17} />
          </button>
        </div>
        <p className="companions-lead">
          Each match deals you one of four companions, after the traditional
          symbols of the Gospel writers.
        </p>
        <div className="companions-stage">
          <div className="feature-art">
            <GameScene paused={motionPaused} onPreview={setPreviewCategory} />
          </div>
          <div className="scene-controls">
            <div
              className="scene-invitation"
              aria-live="polite"
              aria-atomic="true"
            >
              {previewCategory ? (
                <>
                  <CategoryIcon category={previewCategory} size={17} />
                  <span>
                    Landed on <strong>{previewCategory.name}</strong>
                  </span>
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  <span>Try the wheel, or tap a companion</span>
                </>
              )}
            </div>
            <button
              className="scene-motion-toggle"
              aria-label={
                motionPaused
                  ? "Resume scene animation"
                  : "Pause scene animation"
              }
              aria-pressed={motionPaused}
              onClick={() => setMotionPaused((paused) => !paused)}
            >
              {motionPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          </div>
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
        <p>
          “Kinesa” is the Arabic word for church. A local preview with sample
          questions.
        </p>
      </footer>
    </div>
  );
}
