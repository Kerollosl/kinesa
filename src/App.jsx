import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Gamepad2,
  Heart,
  HelpCircle,
  Medal,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import Mascot, { MASCOTS } from "./components/Mascot.jsx";
import Home from "./components/Home.jsx";
import useGlassLight from "./useGlassLight.js";
import { loadMatch, persistMatch } from "./session.js";
import { CategoryIcon } from "./components/Wheel.jsx";
import Game from "./components/Game.jsx";
import Lobby from "./components/Lobby.jsx";
import { categories } from "./data.js";
import {
  answerQuestion,
  getQuestion,
  nextTurn,
  readSaved,
  saveLocal,
} from "./engine.js";

const blankStats = { games: 0, correct: 0, badges: [] };
function loadStats() {
  const s = readSaved("kinesa-stats", blankStats);
  return s &&
    Number.isInteger(s.games) &&
    s.games >= 0 &&
    Number.isInteger(s.correct) &&
    s.correct >= 0 &&
    Array.isArray(s.badges)
    ? {
        ...s,
        badges: s.badges.filter((id) => categories.some((c) => c.id === id)),
      }
    : blankStats;
}
function CrossMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z" fill="currentColor" />
      <circle cx="16" cy="16" r="3" fill="#fff" />
    </svg>
  );
}
export default function App() {
  useGlassLight();
  const [savedMatch] = useState(loadMatch);
  const [matchMode, setMatchMode] = useState(savedMatch?.mode || "random");
  const [page, setPage] = useState("home");
  const [modal, setModal] = useState(null);
  const [mode, setMode] = useState("random");
  const [lobbyKey, setLobbyKey] = useState(0);
  const [rematchPlayers, setRematchPlayers] = useState(null);
  const [game, setGame] = useState(savedMatch?.game || null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [sound, setSound] = useState(
    () => readSaved("kinesa-sound", false) === true,
  );
  const [stats, setStats] = useState(loadStats);
  const [canSave, setCanSave] = useState(true);
  const spinTimer = useRef(null);
  const audio = useRef(null);
  useEffect(() => () => clearTimeout(spinTimer.current), []);
  useEffect(() => {
    saveLocal("kinesa-sound", sound);
  }, [sound]);
  useEffect(() => {
    setCanSave(persistMatch(game, matchMode));
  }, [game, matchMode]);
  const beep = (success = true) => {
    if (!sound) return;
    try {
      audio.current ||= new (
        window.AudioContext || window.webkitAudioContext
      )();
      const ctx = audio.current;
      ctx.resume();
      [0, 0.11, 0.23].forEach((delay, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = (success ? [523, 659, 784] : [330, 294, 262])[i];
        g.gain.setValueAtTime(0.07, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + delay + 0.16,
        );
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + 0.18);
      });
    } catch {
      /* Sound is optional. */
    }
  };
  const navigate = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openLobby = (nextMode, players = null) => {
    clearTimeout(spinTimer.current);
    setSpinning(false);
    setMode(nextMode);
    setRematchPlayers(players);
    setLobbyKey((n) => n + 1);
    setModal(null);
    navigate("lobby");
  };
  const begin = (prepared, nextMode) => {
    clearTimeout(spinTimer.current);
    setSpinning(false);
    setRotation(0);
    setGame(prepared);
    setMode(nextMode);
    setMatchMode(nextMode);
    beep();
    navigate("game");
  };
  const spin = () => {
    if (spinning || game?.phase !== "spin") return;
    const index = Math.floor(Math.random() * categories.length);
    const target = (360 - (index * 60 + 30)) % 360;
    setRotation((r) => r + (360 - (r % 360)) + 1080 + target);
    setSpinning(true);
    beep();
    spinTimer.current = setTimeout(
      () => {
        setGame((g) => {
          const q = getQuestion(categories[index].id, g.used);
          return {
            ...g,
            phase: "question",
            question: q,
            used: [...g.used, q.id],
          };
        });
        setSpinning(false);
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 150
        : 2750,
    );
  };
  const answer = (i) => {
    if (game?.phase !== "question") return;
    const correct = i === game.question.correct;
    beep(correct);
    setGame((g) => answerQuestion(g, i));
    if (correct && !game.players[game.turn % game.players.length].isBot)
      setStats((s) => {
        const next = {
          ...s,
          correct: s.correct + 1,
          badges: [...new Set([...s.badges, game.question.category])],
        };
        saveLocal("kinesa-stats", next);
        return next;
      });
  };
  const advance = () => {
    const next = nextTurn(game);
    setGame(
      next.phase === "spin" && matchMode === "friends"
        ? { ...next, phase: "handoff" }
        : next,
    );
    if (next.phase === "finished") {
      beep();
      setStats((s) => {
        const n = { ...s, games: s.games + 1 };
        saveLocal("kinesa-stats", n);
        return n;
      });
    }
  };
  // Preview opponents are explicitly marked as bots. Timers stop when leaving the match.
  useEffect(() => {
    if (
      page !== "game" ||
      modal ||
      !game ||
      !game.players[game.turn % game.players.length]?.isBot ||
      game.phase === "finished"
    )
      return;
    let timer;
    if (game.phase === "spin" && !spinning) timer = setTimeout(spin, 850);
    if (game.phase === "question")
      timer = setTimeout(
        () =>
          answer(
            Math.random() < 0.65
              ? game.question.correct
              : (game.question.correct + 1 + Math.floor(Math.random() * 3)) % 4,
          ),
        1300,
      );
    return () => clearTimeout(timer);
  }, [game?.phase, game?.turn, page, spinning, modal]);
  return (
    <div
      className={`app-shell ${page === "game" ? "in-match" : page === "lobby" ? "in-lobby" : ""}`}
    >
      <header className="app-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Kinesa home"
        >
          <span className="brand-emblem">
            <CrossMark />
          </span>
          <span>kinesa</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {[
            ["home", Gamepad2, "Play"],
            ["categories", Compass, "Discover"],
            ["collection", Trophy, "Collection"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={
                page === id ||
                (id === "home" && ["game", "lobby"].includes(page))
                  ? "active"
                  : ""
              }
              aria-label={label}
              aria-current={
                page === id ||
                (id === "home" && ["game", "lobby"].includes(page))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="icon-button"
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            aria-pressed={sound}
            onClick={() => setSound((s) => !s)}
          >
            {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            className="icon-button help-button"
            aria-label="How to play"
            onClick={() => setModal({ type: "help" })}
          >
            <HelpCircle size={20} />
          </button>
          <button
            className="guest-pill"
            onClick={() => navigate("collection")}
            aria-label="View your collection"
          >
            <span>K</span>
            <strong>Guest player</strong>
          </button>
        </div>
      </header>
      <main className={`main-content page-${page}`}>
        {page === "home" && (
          <Home
            game={game}
            navigate={navigate}
            openLobby={openLobby}
            setModal={setModal}
          />
        )}
        {page === "lobby" && (
          <Lobby
            key={lobbyKey}
            mode={mode}
            onBack={() => navigate("home")}
            onBegin={begin}
            initialPlayers={rematchPlayers}
          />
        )}
        {page === "categories" && (
          <>
            <PageIntro
              eyebrow="EXPLORE KINESA"
              title="A world of stories."
              description="From the pages of the Bible to the traditions we share. Discover all six categories."
            />
            <div className="explore-grid">
              {categories.map((c, i) => (
                <button
                  className="explore-card"
                  data-glass
                  key={c.id}
                  style={{
                    "--category-color": c.color,
                    "--category-pale": c.pale,
                  }}
                  onClick={() => setModal({ type: "category", category: c })}
                >
                  <span className="explore-number">0{i + 1}</span>
                  <div className="explore-icon">
                    <CategoryIcon category={c} size={44} />
                  </div>
                  <h2>{c.name}</h2>
                  <p>{c.description}</p>
                  <span className="text-button">
                    Get the story <ArrowRight size={19} />
                  </span>
                </button>
              ))}
            </div>
            <div className="info-note">
              <BookOpen size={20} />
              <p>
                We’re playing with a sample deck for now. The full question
                library comes next.
              </p>
            </div>
          </>
        )}
        {page === "collection" && (
          <>
            <PageIntro
              eyebrow="YOUR COLLECTION"
              title="The trophy shelf."
              description="Correct answers earn category badges. Get all six and make yourself at home."
            />
            <div className="stats-row">
              <div>
                <Trophy />
                <strong>{stats.games}</strong>
                <span>Games completed</span>
              </div>
              <div>
                <Zap />
                <strong>{stats.correct}</strong>
                <span>Correct answers</span>
              </div>
              <div>
                <Medal />
                <strong>{stats.badges.length} / 6</strong>
                <span>Category badges</span>
              </div>
            </div>
            <div className="badge-grid">
              {categories.map((c) => {
                const earned = stats.badges.includes(c.id);
                return (
                  <div
                    className={`badge-card ${earned ? "earned" : ""}`}
                    key={c.id}
                  >
                    <div
                      className="badge-medallion"
                      style={{ "--badge-color": earned ? c.color : "#d7dfeb" }}
                    >
                      <CategoryIcon category={c} size={42} />
                      {earned && (
                        <span>
                          <Check size={15} />
                        </span>
                      )}
                    </div>
                    <h3>{c.name}</h3>
                    <p>
                      {earned ? "Earned. Nice work." : "One right answer away"}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="collection-cta">
              <div>
                <h2>There’s room for one more win.</h2>
                <p>Your collection is saved on this device.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => openLobby("random")}
              >
                Find a game <ArrowRight size={20} />
              </button>
            </div>
          </>
        )}
        {page === "game" && game && (
          <Game
            game={game}
            savedLocally={canSave}
            rotation={rotation}
            spinning={spinning}
            spin={spin}
            answer={answer}
            advance={advance}
            onExit={() => navigate("home")}
            onRematch={() => openLobby(matchMode, game.players)}
            onReady={() => setGame((g) => ({ ...g, phase: "spin" }))}
            onHome={() => navigate("home")}
          />
        )}
      </main>
      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal.type === "help" && (
            <>
              <span className="modal-sticker">
                <Gamepad2 size={36} />
              </span>
              <div className="eyebrow">THE 30-SECOND TOUR</div>
              <h2 id="modal-title">
                Easy to play.
                <br />
                Hard to put down.
              </h2>
              <div className="steps">
                {[
                  [
                    "Find your people",
                    "Join a random game or invite your friends. This edition previews both flows locally.",
                  ],
                  [
                    "Meet your companion",
                    "We shuffle the lion, ox, eagle, and human. Each player gets one. No choosing, no duplicates.",
                  ],
                  [
                    "Spin. Answer. Celebrate.",
                    "The wheel picks the category. Correct answers earn 100 points. Play three rounds; the highest score wins.",
                  ],
                ].map(([title, copy], i) => (
                  <div key={title}>
                    <span>{i + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="primary-button full"
                onClick={() => {
                  setModal(null);
                  navigate("home");
                }}
              >
                I’m in <ArrowRight size={20} />
              </button>
            </>
          )}
          {modal.type === "squad" && (
            <>
              <div className="eyebrow">FOUR GOSPELS. FOUR PERSONALITIES.</div>
              <h2 id="modal-title">Who’s your game-day self?</h2>
              <p className="modal-lead">
                You’ll find out when the game deals your companion. Every player
                gets a different one.
              </p>
              <div className="squad-grid">
                {MASCOTS.map((m) => (
                  <div style={{ background: m.bg }} key={m.kind}>
                    <Mascot kind={m.kind} />
                    <h3>{m.name}</h3>
                    <p>
                      {m.kind} · {m.gospel}
                    </p>
                  </div>
                ))}
              </div>
              <button
                className="primary-button full"
                onClick={() => openLobby("random")}
              >
                Let fate decide <Shuffle size={20} />
              </button>
            </>
          )}
          {modal.type === "category" && (
            <>
              <span
                className="modal-sticker"
                style={{ background: modal.category.color }}
              >
                <CategoryIcon category={modal.category} size={36} />
              </span>
              <div className="eyebrow">ONE SIXTH OF THE ADVENTURE</div>
              <h2 id="modal-title">{modal.category.name}</h2>
              <p className="modal-lead">{modal.category.detail}</p>
              <div className="category-example">
                <Sparkles size={24} />
                <p>{modal.category.description}</p>
              </div>
              <button
                className="primary-button full"
                onClick={() => openLobby("random")}
              >
                Put it to the test <ArrowRight size={20} />
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function PageIntro({ eyebrow, title, description }) {
  return (
    <div className="page-intro">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
function Modal({ children, onClose }) {
  const ref = useRef(null);
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") callback.current();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          'button:not(:disabled),input,select,[tabindex="0"]',
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={22} />
        </button>
        {children}
      </section>
    </div>
  );
}
