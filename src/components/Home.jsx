import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
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
import "./home-experience.css";

export default function Home({ game, navigate, openLobby, setModal }) {
  const [motionPaused, setMotionPaused] = useState(false);
  const [previewCategory, setPreviewCategory] = useState(null);
  const ongoing = game && game.phase !== "finished";
  const activePlayer = ongoing
    ? game.players[game.turn % game.players.length]
    : null;
  const round = ongoing ? Math.floor(game.turn / game.players.length) + 1 : 1;
  return (
    <div className="home-experience">
      <div className="play-heading">
        <div className="mobile-home-title">
          <span className="play-kicker">Your next game night starts here.</span>
          <h1>Let’s play.</h1>
          <p>Bible stories. Coptic roots. Good company.</p>
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
              GAME IN PROGRESS · ROUND {round} OF 3
            </span>
            <strong>Resume your game</strong>
            <span>
              {activePlayer.name}’s turn · {game.players.length} players
            </span>
          </span>
          <span className="resume-rounds" aria-hidden="true">
            {[1, 2, 3].map((r) => (
              <i key={r} className={r <= round ? "reached" : ""} />
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
            <span className="feature-label">
              <span /> BIBLE & COPTIC TRIVIA
            </span>
            <h2 id="feature-heading">
              Faith meets
              <br />
              friendly competition.
            </h2>
            <p>
              One wheel. Six topics. A different Gospel companion for everyone.
            </p>
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
                  <span>Try a spin. Give the crew a high-five.</span>
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
            <span>
              <Users size={14} /> 2–4 players <i /> 3 rounds
            </span>
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
                <p>A quick match with three practice opponents.</p>
              </div>
              <span className="mode-meta">
                <span className="mode-status" /> Play a practice match{" "}
                <ArrowRight size={14} />
              </span>
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
                <p>Gather 2–4 friends and pass this device around.</p>
              </div>
              <span className="mode-meta">
                Set up your game <ChevronRight size={14} />
              </span>
            </button>
          </div>
          <p className="mode-preview-note">
            Sample questions. No account needed. Online play is coming later.
          </p>
        </section>
      </div>

      <section className="topics-section" aria-labelledby="topics-heading">
        <div className="topics-heading">
          <div>
            <h2 id="topics-heading">Every spin, a new story.</h2>
            <p>Take a look at what’s on the wheel.</p>
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
              <span className="topic-number" aria-hidden="true">
                0{i + 1}
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
          <strong>Four companions. One is yours.</strong>
          <span>
            A Gospel symbol, randomly assigned to every player. Always unique.
          </span>
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
