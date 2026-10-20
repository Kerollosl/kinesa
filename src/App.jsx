import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  Gamepad2,
  HelpCircle,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Mascot, { MASCOTS } from "./components/Mascot.jsx";
import Home from "./components/Home.jsx";
import useGlassLight from "./useGlassLight.js";
import { loadMatch, persistMatch } from "./session.js";
import { CategoryIcon } from "./components/Wheel.jsx";
import Game from "./components/Game.jsx";
import Lobby from "./components/Lobby.jsx";
import Discover from "./components/Discover.jsx";
import Collection from "./components/Collection.jsx";
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
        badges: [
          ...new Set(
            s.badges.filter((id) => categories.some((c) => c.id === id)),
          ),
        ],
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
  const [page, setPage] = useState(() =>
    ["categories", "collection"].includes(location.hash.slice(1))
      ? location.hash.slice(1)
      : "home",
  );
  const [modal, setModalState] = useState(null);
  const modalTrigger = useRef(null);
  const setModal = (next) => {
    if (next && !modal) modalTrigger.current = document.activeElement;
    setModalState(next);
  };
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
  const [tabActive, setTabActive] = useState(() => !document.hidden);
  const gameRef = useRef(game);
  gameRef.current = game;
  const spinningRef = useRef(false);
  const mainRef = useRef(null);
  const [toast, setToast] = useState("");
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
      ctx.resume().catch(() => {});
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
  const cancelSpin = () => {
    clearTimeout(spinTimer.current);
    spinningRef.current = false;
    setSpinning(false);
  };
  const updateGame = (next) => {
    gameRef.current = next;
    setGame(next);
  };
  const navigate = (p) => {
    if (p !== "game") cancelSpin();
    if (p !== page) history.pushState({ kinesaPage: p }, "", `#${p}`);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    history.replaceState({ kinesaPage: page }, "", `#${page}`);
    const back = (event) => {
      const target = event.state?.kinesaPage || location.hash.slice(1);
      const next =
        ["home", "categories", "collection", "lobby", "game"].includes(
          target,
        ) &&
        (target !== "game" || gameRef.current)
          ? target
          : "home";
      cancelSpin();
      setModal(null);
      setPage(next);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  useEffect(() => {
    if (["game", "lobby"].includes(page)) return;
    const title = mainRef.current?.querySelector("h1");
    title?.setAttribute("tabindex", "-1");
    title?.focus({ preventScroll: true });
  }, [page]);
  useEffect(() => {
    if (modal) cancelSpin();
  }, [modal]);
  useEffect(() => {
    const visibility = () => {
      setTabActive(!document.hidden);
      if (document.hidden) cancelSpin();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timer);
  }, [toast]);
  const openLobby = (nextMode, players = null) => {
    cancelSpin();
    setMode(nextMode);
    setRematchPlayers(players);
    setLobbyKey((n) => n + 1);
    setModal(null);
    navigate("lobby");
  };
  const startPrepared = (prepared, nextMode) => {
    cancelSpin();
    setModal(null);
    setRotation(0);
    updateGame(prepared);
    setMode(nextMode);
    setMatchMode(nextMode);
    beep();
    navigate("game");
  };
  const begin = (prepared, nextMode) => {
    const current = gameRef.current;
    if (current && current.phase !== "finished") {
      setModal({ type: "replace-match", prepared, nextMode });
      return;
    }
    startPrepared(prepared, nextMode);
  };
  const spin = () => {
    if (spinningRef.current || gameRef.current?.phase !== "spin") return;
    spinningRef.current = true;
    const index = Math.floor(Math.random() * categories.length);
    const target = (360 - (index * 60 + 30)) % 360;
    setRotation((r) => r + (360 - (r % 360)) + 1080 + target);
    setSpinning(true);
    beep();
    spinTimer.current = setTimeout(
      () => {
        const current = gameRef.current;
        if (current?.phase === "spin") {
          const q = getQuestion(categories[index].id, current.used);
          updateGame({
            ...current,
            phase: "question",
            question: q,
            used: [...current.used, q.id],
          });
        }
        spinningRef.current = false;
        setSpinning(false);
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 150
        : 2750,
    );
  };
  const answer = (i) => {
    const current = gameRef.current;
    if (current?.phase !== "question" || !Number.isInteger(i) || i < 0 || i > 3)
      return;
    const correct = i === current.question.correct;
    updateGame(answerQuestion(current, i));
    beep(correct);
    if (
      correct &&
      !current.players[current.turn % current.players.length].isBot
    )
      setStats((s) => {
        const next = {
          ...s,
          correct: s.correct + 1,
          badges: [...new Set([...s.badges, current.question.category])],
        };
        saveLocal("kinesa-stats", next);
        return next;
      });
  };
  const advance = () => {
    const current = gameRef.current;
    if (current?.phase !== "reveal") return;
    const next = nextTurn(current);
    updateGame(
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
      !tabActive ||
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
  }, [game?.phase, game?.turn, page, spinning, modal, tabActive]);
  return (
    <div
      className={`app-shell ${page === "game" ? "in-match" : page === "lobby" ? "in-lobby" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header" inert={!!modal}>
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
            onClick={() => {
              setSound((s) => !s);
              setToast(sound ? "Sound off" : "Sound on");
            }}
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
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        inert={!!modal}
        className={`main-content page-${page}`}
      >
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
          <Discover setModal={setModal} openLobby={openLobby} />
        )}
        {page === "collection" && (
          <Collection stats={stats} setModal={setModal} openLobby={openLobby} />
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
            onHelp={() => setModal({ type: "help" })}
            onInspectPlayer={(player) => setModal({ type: "player", player })}
            onReady={() => {
              const current = gameRef.current;
              if (current?.phase === "handoff")
                updateGame({ ...current, phase: "spin" });
            }}
            onHome={() => navigate("home")}
          />
        )}
      </main>
      <div
        className={`app-toast ${toast ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={16} />
            {toast}
          </>
        )}
      </div>
      {modal && (
        <Modal
          onClose={() => setModal(null)}
          returnFocus={modalTrigger.current}
        >
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
                onClick={() => setModal(null)}
              >
                Got it <ArrowRight size={20} />
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
          {modal.type === "player" &&
            (() => {
              const m = MASCOTS.find((m) => m.kind === modal.player.kind);
              return (
                <div className="player-detail">
                  <div className="eyebrow">{modal.player.name}’S COMPANION</div>
                  <h2 id="modal-title">Meet {m.name}.</h2>
                  <div
                    className="player-detail-art"
                    style={{ "--companion-bg": m.bg }}
                  >
                    <Mascot kind={m.kind} />
                  </div>
                  <p className="modal-lead">
                    The {m.kind} · Gospel of {m.gospel}
                  </p>
                  <p className="companion-personality">{m.personality}</p>
                  <div className="player-detail-stats">
                    <span>
                      <strong>{modal.player.score}</strong> points
                    </span>
                    <span>
                      <strong>{modal.player.badges.length}</strong> categories
                      earned
                    </span>
                  </div>
                  <p className="player-detail-note">
                    Randomly dealt for this match. A different companion for
                    every player.
                  </p>
                  <button
                    className="primary-button full"
                    onClick={() => setModal(null)}
                  >
                    Back to game <ArrowRight size={18} />
                  </button>
                </div>
              );
            })()}
          {modal.type === "replace-match" && (
            <>
              <span className="modal-sticker">
                <Gamepad2 size={32} />
              </span>
              <div className="eyebrow">YOU HAVE A GAME IN PROGRESS</div>
              <h2 id="modal-title">Start a fresh game?</h2>
              <p className="modal-lead">
                Starting this match replaces the current game on this device,
                including its scores and companions.
              </p>
              <div className="replace-match-summary">
                <Users size={20} />
                <span>
                  {game.players.map((p) => p.name).join(", ")}
                  <small>
                    Round {Math.floor(game.turn / game.players.length) + 1} of 3
                    · {game.players.length} players
                  </small>
                </span>
              </div>
              <div className="replace-match-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    setModal(null);
                    navigate("game");
                  }}
                >
                  Resume current game
                </button>
                <button
                  className="primary-button"
                  onClick={() => startPrepared(modal.prepared, modal.nextMode)}
                >
                  Start new game <ArrowRight size={18} />
                </button>
              </div>
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
              <div className="eyebrow">EXPLORE THE WHEEL</div>
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
function Modal({ children, onClose, returnFocus }) {
  const ref = useRef(null);
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const previous = returnFocus || document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") callback.current();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
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
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else document.querySelector("main h1")?.focus({ preventScroll: true });
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
