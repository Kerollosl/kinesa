import { useState } from "react";
import {
  ArrowRight,
  Globe2,
  Users,
  Play,
  ArrowUpRight,
  Pause,
  RotateCcw,
} from "lucide-react";
import GameScene from "./GameScene.jsx";
import Mascot from "./Mascot.jsx";
import { CategoryIcon } from "./Wheel.jsx";
import { categories } from "../data.js";
import {
  activeIndex,
  currentRound,
  isSimultaneous,
  roundCount,
} from "../engine.js";
import "./home-experience.css";

export default function Home({ game, navigate, openLobby, setModal }) {
  const [motionPaused, setMotionPaused] = useState(false);
  const [previewCategory, setPreviewCategory] = useState(null);
  const ongoing = game && game.phase !== "finished";
  const activePlayer = ongoing ? game.players[activeIndex(game)] : null;
  const round = ongoing ? currentRound(game) : 1;
  const rounds = ongoing ? roundCount(game) : 3;
  const simultaneous = ongoing && isSimultaneous(game);
  return (
    <div className="home-experience">
      <div className="play-heading">
        <div className="mobile-home-title">
          <h1>Let’s play.</h1>
        </div>
        <button
          className="play-help"
          onClick={() => setModal({ type: "help" })}
        >
          How to play <ArrowUpRight size={16} />
        </button>
      </div>

      {ongoing && (
        <button className="resume-banner" onClick={() => navigate("game")}>
          <span className="resume-companion" aria-hidden="true">
            <Mascot kind={activePlayer.kind} portrait />
          </span>
          <span className="resume-copy">
            <span className="resume-eyebrow">
              GAME IN PROGRESS · {simultaneous ? "QUESTION" : "ROUND"} {round}{" "}
              OF {rounds}
            </span>
            <strong>Resume your game</strong>
            <span>
              {simultaneous
                ? `${activePlayer.name} vs ${game.players.length - 1} practice bots`
                : `${activePlayer.name}’s turn · ${game.players.length} players`}
            </span>
          </span>
          <span className="resume-rounds" aria-hidden="true">
            {Array.from({ length: Math.min(rounds, 5) }, (_, i) => (
              <i
                key={i}
                className={
                  (i + 1) / Math.min(rounds, 5) <= round / rounds
                    ? "reached"
                    : ""
                }
              />
            ))}
          </span>
          <span className="resume-action">
            <Play size={15} fill="currentColor" /> Keep playing{" "}
            <ArrowRight size={18} />
          </span>
        </button>
      )}

      <div className="play-layout">
        <section
          data-glass
          className="play-feature"
          aria-labelledby="feature-heading"
        >
          <div className="feature-copy">
            <h2 id="feature-heading">Meet the companions</h2>
          </div>
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
                  <span>Try the wheel</span>
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
          <div className="feature-bottom">
            <button onClick={() => setModal({ type: "squad" })}>
              Meet the four <ArrowUpRight size={16} />
            </button>
          </div>
        </section>

        <section className="mode-section" aria-labelledby="mode-heading">
          <div className="mode-heading-row">
            <h2 id="mode-heading">Start a game</h2>
            <span className="preview-label">Preview</span>
          </div>
          <div className="mode-grid">
            <button
              data-glass
              className="mode-card random-mode"
              onClick={() => openLobby("random")}
            >
              <div className="mode-topline">
                <span className="mode-icon">
                  <Globe2 size={24} strokeWidth={1.8} />
                </span>
                <ArrowUpRight size={21} className="mode-arrow" />
              </div>
              <div className="mode-copy">
                <h3>Random game</h3>
                <p>3 practice bots</p>
              </div>
            </button>
            <button
              data-glass
              className="mode-card friends-mode"
              onClick={() => openLobby("friends")}
            >
              <div className="mode-topline">
                <span className="mode-icon">
                  <Users size={24} strokeWidth={1.8} />
                </span>
                <ArrowUpRight size={21} className="mode-arrow" />
              </div>
              <div className="mode-copy">
                <h3>Play with friends</h3>
                <p>2–4 players · one device</p>
              </div>
            </button>
          </div>
          <p className="mode-preview-note">Local preview · sample questions</p>
        </section>
      </div>

      <section className="topics-section" aria-labelledby="topics-heading">
        <div className="topics-heading">
          <div>
            <h2 id="topics-heading">On the wheel</h2>
          </div>
          <button
            className="text-button"
            onClick={() => navigate("categories")}
          >
            Explore all <ArrowRight size={17} />
          </button>
        </div>
        <div className="topic-grid">
          {categories.map((c, i) => (
            <button
              data-glass
              aria-label={`Explore ${c.name}`}
              className="topic-card"
              key={c.id}
              style={{ "--topic-color": c.color, "--topic-pale": c.pale }}
              onClick={() => setModal({ type: "category", category: c })}
            >
              <span className="topic-illustration">
                <CategoryIcon category={c} size={32} />
              </span>
              <span className="topic-name">
                {c.short}
                <ArrowUpRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <button
        className="companions-banner"
        onClick={() => setModal({ type: "squad" })}
      >
        <span className="companion-portraits" aria-hidden="true">
          {["lion", "ox", "eagle", "human"].map((kind) => (
            <span key={kind}>
              <Mascot kind={kind} portrait />
            </span>
          ))}
        </span>
        <span className="companions-copy">
          <strong>Meet the Gospel crew</strong>
        </span>
        <span className="companions-link">
          Meet your companions <ArrowRight size={18} />
        </span>
      </button>
      <footer className="play-footer">
        <span>
          kinesa{" "}
          <span lang="ar" dir="rtl">
            كنيسة
          </span>
        </span>
        <p>A little knowledge. A little connection.</p>
        <span>Made for game night.</span>
      </footer>
    </div>
  );
}
