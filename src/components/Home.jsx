import { useState, useEffect } from "react";
import {
  ArrowRight,
  ChevronRight,
  Globe2,
  Users,
  Shuffle,
  Play,
} from "lucide-react";
import GameScene from "./GameScene.jsx";
import { CategoryIcon } from "./Wheel.jsx";
import { categories } from "../data.js";
function CrossMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z" fill="currentColor" />
    </svg>
  );
}
export default function Home({ game, navigate, openLobby, setModal }) {
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width:620px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width:620px)");
    const change = () => setCompact(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const HeroTitle = compact ? "h2" : "h1";
  const hero = (
    <section className="home-hero">
      <div className="hero-copy">
        <div className="hero-eyebrow">
          <span>COPTIC ROOTS.</span> TRIVIA WITH SOUL.
        </div>
        <HeroTitle>
          Ready,
          <br />
          set,{" "}
          <span>
            amen.
            <svg viewBox="0 0 285 16" aria-hidden="true">
              <path d="M3 11Q130 -3 280 8M20 15Q140 6 260 12" />
            </svg>
          </span>
        </HeroTitle>
        <p>
          A few good friends. A few tough questions.
          <br />
          And absolutely no mercy on game night.
        </p>
        <div className="hero-facts">
          <span>
            <Users size={16} /> UP TO 4 PLAYERS
          </span>
          <span>
            <Shuffle size={16} /> ONE WILD SPIN
          </span>
        </div>
        <span className="hero-doodle" aria-hidden="true">
          ↝
        </span>
      </div>
      <div className="mobile-scene-heading">
        <h2>Four Gospels. All game.</h2>
        <p>Tap a companion. They don’t bite.</p>
      </div>
      <div className="hero-scene">
        <GameScene />
      </div>
      <div className="hero-strip">
        <span>✦ BIBLE BRAINS</span>
        <span>✦ COPTIC PRIDE</span>
        <span>✦ FRIENDLY RIVALRIES</span>
        <span>✦ BIG AMEN ENERGY</span>
      </div>
    </section>
  );
  const modes = (
    <section className="mode-section" aria-labelledby="mode-heading">
      <div className="section-heading">
        <h2 id="mode-heading">How are we playing?</h2>
        <span>Your game. Your kind of company.</span>
      </div>
      <div className="mode-grid">
        <button
          className="mode-card random-mode"
          onClick={() => openLobby("random")}
        >
          <div className="mode-icon">
            <Globe2 size={35} />
            <span className="mode-mini-star">✦</span>
          </div>
          <div className="mode-copy">
            <span className="mode-tag">MIX IT UP</span>
            <h3>Random game</h3>
            <p>New opponents. Instant competition.</p>
          </div>
          <span className="mode-arrow">
            <ArrowRight size={27} />
          </span>
          <span className="mode-decoration" aria-hidden="true">
            ✳
          </span>
        </button>
        <button
          className="mode-card friends-mode"
          onClick={() => openLobby("friends")}
        >
          <div className="mode-icon">
            <Users size={35} />
            <span className="mode-mini-star">+</span>
          </div>
          <div className="mode-copy">
            <span className="mode-tag">MAKE IT PERSONAL</span>
            <h3>Play with friends</h3>
            <p>Bring your crew. Settle the score.</p>
          </div>
          <span className="mode-arrow">
            <ArrowRight size={27} />
          </span>
          <span className="mode-decoration" aria-hidden="true">
            ✳
          </span>
        </button>
      </div>
      <p className="mode-preview-note">
        Play the frontend preview: practice opponents or a friends lobby on this
        device.
      </p>
    </section>
  );
  return (
    <>
      {" "}
      <div className="home-greeting">
        <span>
          <span className="status-spark">✦</span> A GOOD DAY FOR A GREAT GAME
        </span>
        <button
          className="text-button"
          onClick={() => setModal({ type: "help" })}
        >
          How to play <ChevronRight size={16} />
        </button>
      </div>
      {game && game.phase !== "finished" && (
        <button className="resume-banner" onClick={() => navigate("game")}>
          <Play size={20} />
          <span>
            {game.players[game.turn % game.players.length].name}’s turn · Round{" "}
            {Math.floor(game.turn / game.players.length) + 1}.{" "}
            <strong>Resume your game</strong>
          </span>
          <ArrowRight size={20} />
        </button>
      )}
      {compact && (
        <div className="mobile-home-title">
          <h1>
            Ready, set, <span>amen.</span>
          </h1>
          <p>Your people. New rivals. Pick your game.</p>
        </div>
      )}
      {compact ? (
        <>
          {modes}
          {hero}
        </>
      ) : (
        <>
          {hero}
          {modes}
        </>
      )}
      <section className="home-bottom">
        <div className="category-rail-panel">
          <div className="section-heading">
            <h2>Six ways to show off.</h2>
            <button
              className="text-button"
              onClick={() => navigate("categories")}
            >
              All categories <ArrowRight size={17} />
            </button>
          </div>
          <div className="category-rail">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setModal({ type: "category", category: c })}
              >
                <span
                  className="category-token"
                  style={{ "--token-color": c.color }}
                >
                  <CategoryIcon category={c} size={27} />
                </span>
                <strong>{c.short}</strong>
              </button>
            ))}
          </div>
        </div>
        <button
          className="squad-callout"
          onClick={() => setModal({ type: "squad" })}
        >
          <span className="squad-icon">
            <Shuffle size={30} />
          </span>
          <div>
            <span className="eyebrow">MEET YOUR ALTER EGO</span>
            <h3>
              Four Gospels.
              <br />
              One surprise teammate.
            </h3>
            <p>Randomly assigned. Uniquely yours.</p>
          </div>
          <ArrowRight size={20} />
        </button>
      </section>
      <footer className="home-footer">
        <span>
          <CrossMark /> FAITH HAS A FUN SIDE.
        </span>
        <p>Made for the people you call family.</p>
        <span className="edition-tag">FIRST EDITION / SAMPLE DECK</span>
      </footer>
    </>
  );
}
