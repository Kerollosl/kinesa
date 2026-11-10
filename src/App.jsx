import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CloudOff,
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
import { loadMatch, persistMatch } from "./session.js";
import { CategoryIcon } from "./components/Wheel.jsx";
import Game from "./components/Game.jsx";
import Lobby from "./components/Lobby.jsx";
import Discover from "./components/Discover.jsx";
import Collection from "./components/Collection.jsx";
import { categories, questions } from "./data.js";
import {
  TIMEOUT,
  activeIndex,
  answerQuestion,
  createGame,
  currentRound,
  getQuestion,
  getWinners,
  isSimultaneous,
  nextTurn,
  planBotAnswer,
  readSaved,
  recordAnswer,
  revealAnswers,
  roundCount,
  saveLocal,
} from "./engine.js";
import {
  loadStats,
  recordCorrect,
  recordMatch,
  saveStats,
} from "./progress.js";
import { createSound } from "./sound.js";
import { PRACTICE_BOTS, loadPrefs, savePrefs } from "./prefs.js";
import { CopticCross } from "./components/Ornaments.jsx";
import PlaySheet from "./components/PlaySheet.jsx";
import AboutLinks from "./components/AboutLinks.jsx";
import {
  DAILY_LENGTH,
  SPOTLIGHT_MULTIPLIER,
  dailyPlan,
  dailyStatus,
  recordDaily,
  spotlight,
} from "./daily.js";
import { dayKey } from "./calendar.js";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SPIN_MS = 2200;
// A short beat after everyone locks in, so the reveal lands as one moment.
const LOCK_BEAT_MS = 650;

const matchBaseline = (stats) => ({
  xpStart: stats.xp,
  badgesStart: [...stats.badges],
  categoryStart: { ...stats.categoryCorrect },
});
export default function App() {
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
  const [stats, setStatsState] = useState(loadStats);
  const statsRef = useRef(stats);
  const setStats = (next) => {
    statsRef.current = next;
    if (!saveStats(next)) warnStorage();
    setStatsState(next);
  };
  const [matchMeta, setMatchMeta] = useState(() =>
    savedMatch ? readSaved("kinesa-match-meta", null) : null,
  );
  const [canSave, setCanSave] = useState(true);
  const [tabActive, setTabActive] = useState(() => !document.hidden);
  const gameRef = useRef(game);
  gameRef.current = game;
  const spinningRef = useRef(false);
  const mainRef = useRef(null);
  const [toast, setToastText] = useState("");
  const [toastTone, setToastTone] = useState("ok");
  const setToast = (text, tone = "ok") => {
    setToastTone(tone);
    setToastText(text);
  };
  // Storage can be full or blocked (private browsing). Play continues in
  // memory; say so once instead of silently losing progress.
  const storageWarned = useRef(false);
  function warnStorage() {
    if (storageWarned.current) return;
    storageWarned.current = true;
    setToast(
      "Storage is full or blocked, so progress won’t be kept after you close Kinesa.",
      "warn",
    );
  }
  const spinTimer = useRef(null);
  const revealTimer = useRef(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const sfx = useRef(null);
  sfx.current ||= createSound(() => soundRef.current);
  const play = (cue) => sfx.current.play(cue);
  useEffect(
    () => () => {
      clearTimeout(spinTimer.current);
      clearTimeout(revealTimer.current);
    },
    [],
  );
  useEffect(() => {
    saveLocal("kinesa-sound", sound);
  }, [sound]);
  useEffect(() => {
    const saved = persistMatch(game, matchMode);
    setCanSave(saved);
    if (!saved && game) warnStorage();
  }, [game, matchMode]);
  useEffect(() => {
    saveLocal("kinesa-match-meta", matchMeta);
  }, [matchMeta]);
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
    const timer = setTimeout(
      () => setToastText(""),
      toastTone === "warn" ? 6000 : 2400,
    );
    return () => clearTimeout(timer);
  }, [toast, toastTone]);
  // Practice play starts in one tap with the saved name and settings.
  const playNow = (overrides = {}) => {
    const prefs = loadPrefs();
    const { name = prefs.name, ...settings } = overrides;
    begin(
      createGame(
        [
          { name: name || "You" },
          ...PRACTICE_BOTS.map((bot) => ({ name: bot, isBot: true })),
        ],
        Math.random,
        {
          structure: "simultaneous",
          settings: { ...prefs.settings, ...settings },
        },
      ),
      "random",
    );
  };
  // Today's five: solo, timed, the same questions for everyone on this date.
  const playDaily = () => {
    if (dailyStatus(statsRef.current).done) return;
    const prefs = loadPrefs();
    begin(
      createGame([{ name: prefs.name || "You" }], Math.random, {
        structure: "simultaneous",
        settings: {
          tier: "medium",
          questions: DAILY_LENGTH,
          plan: dailyPlan(),
          daily: dayKey(),
        },
      }),
      "daily",
    );
  };
  const openLobby = (nextMode, players = null) => {
    if (nextMode === "random") {
      playNow();
      return;
    }
    cancelSpin();
    setMode(nextMode);
    setRematchPlayers(players);
    setLobbyKey((n) => n + 1);
    setModal(null);
    navigate("lobby");
  };
  const startPrepared = (prepared, nextMode) => {
    cancelSpin();
    clearTimeout(revealTimer.current);
    setModal(null);
    setRotation(0);
    updateGame(prepared);
    setMatchMeta(matchBaseline(statsRef.current));
    setMode(nextMode);
    setMatchMode(nextMode);
    play("start");
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
  // One-tap rematch: same players and settings, a fresh companion deal.
  const rematch = (category) => {
    const current = gameRef.current;
    if (!current) return;
    const settings =
      category === undefined
        ? current.settings
        : { ...current.settings, category };
    startPrepared(
      createGame(current.players, Math.random, {
        structure: current.structure,
        settings,
      }),
      matchMode,
    );
  };
  const drawQuestion = (current, categoryId) => {
    const planned = current.settings?.plan?.[current.turn];
    const q = planned
      ? questions.find((item) => item.id === planned)
      : getQuestion(
          categoryId,
          current.used,
          Math.random,
          current.settings?.tier,
        );
    updateGame({
      ...current,
      phase: "question",
      question: q,
      used: [...current.used, q.id],
      answers: {},
    });
  };
  const spin = () => {
    if (spinningRef.current || gameRef.current?.phase !== "spin") return;
    spinningRef.current = true;
    const index = Math.floor(Math.random() * categories.length);
    const target = (360 - (index * 60 + 30)) % 360;
    setRotation((r) => r + (360 - (r % 360)) + 1080 + target);
    setSpinning(true);
    play("spin");
    spinTimer.current = setTimeout(
      () => {
        const current = gameRef.current;
        if (current?.phase === "spin")
          drawQuestion(current, categories[index].id);
        spinningRef.current = false;
        setSpinning(false);
      },
      reducedMotion() ? 150 : SPIN_MS,
    );
  };

  // Question clock: elapsed time pauses with dialogs, hidden tabs and navigation.
  const questionKey =
    game?.phase === "question" && game.question
      ? `${game.turn}:${game.question.id}`
      : null;
  const clockRunning = !!questionKey && page === "game" && tabActive && !modal;
  const clock = useRef({ key: null, elapsed: 0, since: null });
  const syncClock = () => {
    const c = clock.current;
    if (questionKey !== c.key)
      Object.assign(c, { key: questionKey, elapsed: 0, since: null });
    if (clockRunning && c.since === null) c.since = performance.now();
    if (!clockRunning && c.since !== null) {
      c.elapsed += performance.now() - c.since;
      c.since = null;
    }
  };
  syncClock();
  const elapsed = useCallback(() => {
    const c = clock.current;
    return c.elapsed + (c.since === null ? 0 : performance.now() - c.since);
  }, []);
  const msLeft = useCallback(() => {
    const s = gameRef.current?.settings;
    return s?.timed ? Math.max(0, s.seconds * 1000 - elapsed()) : 0;
  }, [elapsed]);
  const botPlans = useRef({ key: null, plans: {} });

  // Awards progress for every human answer once the round is revealed.
  const settle = (before, after) => {
    let next = statsRef.current;
    const meta = { newBadges: [], newMastery: [] };
    after.players.forEach((p, i) => {
      const entry = after.answers[i];
      if (p.isBot || !entry?.correct) return;
      const result = recordCorrect(
        next,
        after.question.category,
        entry.streak,
        after.question.category === spotlight().id ? SPOTLIGHT_MULTIPLIER : 1,
      );
      next = result.stats;
      if (result.newBadge) meta.newBadges.push(after.question.category);
      if (result.newMastery) meta.newMastery.push(after.question.category);
    });
    if (next !== statsRef.current) setStats(next);
    const focus = after.answers[activeIndex(after)];
    if (focus) {
      play(
        focus.correct ? (focus.streak >= 3 ? "streak" : "correct") : "wrong",
      );
      navigator.vibrate?.(
        soundRef.current ? (focus.correct ? 18 : [12, 60, 12]) : 0,
      );
    }
    if (meta.newBadges.length || meta.newMastery.length) play("unlock");
    return before;
  };
  const reveal = () => {
    clearTimeout(revealTimer.current);
    const current = gameRef.current;
    if (current?.phase !== "question") return;
    let next = current;
    // Practice bots who are still thinking lock in their planned pick.
    if (isSimultaneous(current)) {
      const { plans } = botPlans.current;
      current.players.forEach((p, i) => {
        if (p.isBot && !next.answers[i] && plans[i])
          next = recordAnswer(
            next,
            i,
            plans[i].choice,
            Math.max(0, msLeftAt(plans[i].delay)),
          );
      });
    }
    const revealed = revealAnswers(next);
    updateGame(revealed);
    settle(current, revealed);
  };
  const msLeftAt = (ms) => {
    const s = gameRef.current?.settings;
    return s?.timed ? s.seconds * 1000 - ms : 0;
  };
  const answer = (i) => {
    const current = gameRef.current;
    if (current?.phase !== "question" || !Number.isInteger(i) || i < 0 || i > 3)
      return;
    const me = activeIndex(current);
    if (current.answers?.[me]) return;
    if (!isSimultaneous(current)) {
      const revealed = answerQuestion(current, i, msLeft());
      updateGame(revealed);
      settle(current, revealed);
      return;
    }
    updateGame(recordAnswer(current, me, i, msLeft()));
    play("lock");
    revealTimer.current = setTimeout(
      reveal,
      reducedMotion() ? 120 : LOCK_BEAT_MS,
    );
  };
  // A single light tick drives bot thinking time and the countdown.
  useEffect(() => {
    if (!clockRunning) return;
    const current = gameRef.current;
    if (botPlans.current.key !== questionKey) {
      const plans = {};
      if (isSimultaneous(current))
        current.players.forEach((p, i) => {
          if (p.isBot)
            plans[i] = planBotAnswer(current.question, current.settings);
        });
      botPlans.current = { key: questionKey, plans };
    }
    let warned = 0;
    const tick = () => {
      const g = gameRef.current;
      if (g?.phase !== "question") return;
      const t = elapsed();
      if (isSimultaneous(g)) {
        let next = g;
        for (const [i, plan] of Object.entries(botPlans.current.plans))
          if (!next.answers[i] && t >= plan.delay)
            next = recordAnswer(
              next,
              Number(i),
              plan.choice,
              msLeftAt(plan.delay),
            );
        if (next !== g) updateGame(next);
      }
      if (g.settings?.timed) {
        const left = g.settings.seconds * 1000 - t;
        const second = Math.ceil(left / 1000);
        if (second <= 3 && second >= 1 && second !== warned) {
          warned = second;
          play("tick");
        }
        if (left <= 0) {
          if (isSimultaneous(g)) reveal();
          else {
            const revealed = answerQuestion(g, TIMEOUT, 0);
            updateGame(revealed);
            settle(g, revealed);
          }
        }
      }
    };
    const timer = setInterval(tick, 150);
    return () => clearInterval(timer);
  }, [clockRunning, questionKey]);
  // Category-locked and planned (daily) matches skip the wheel.
  useEffect(() => {
    if (
      page !== "game" ||
      game?.phase !== "spin" ||
      !(game.settings?.category || game.settings?.plan)
    )
      return;
    const timer = setTimeout(() => {
      const current = gameRef.current;
      if (current?.phase === "spin")
        drawQuestion(current, current.settings.category);
    }, 200);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.turn, page]);
  const advance = () => {
    const current = gameRef.current;
    if (current?.phase !== "reveal") return;
    const next = nextTurn(current);
    if (next.phase === "finished") {
      updateGame(next);
      const human = next.players.find((p) => !p.isBot);
      const won =
        matchMode === "random" &&
        !!human &&
        getWinners(next.players).includes(human);
      let nextStats = recordMatch(statsRef.current, { won }).stats;
      if (matchMode === "daily" && human) {
        const outcome = recordDaily(nextStats, {
          correct: human.correct,
          total: next.settings.questions,
          score: human.score,
        });
        nextStats = outcome.stats;
        setMatchMeta((meta) => ({
          ...meta,
          dailyOutcome: {
            usedFreeze: outcome.usedFreeze,
            earnedFreeze: outcome.earnedFreeze,
          },
        }));
      }
      setStats(nextStats);
      play("finish");
      return;
    }
    if (matchMode === "friends" && next.phase === "spin") {
      const rotationDone = next.turn % next.players.length === 0;
      updateGame({ ...next, phase: rotationDone ? "standings" : "handoff" });
      return;
    }
    updateGame(next);
  };
  // Legacy turn-based practice matches (restored from older saves) still play bot turns.
  useEffect(() => {
    if (
      page !== "game" ||
      !tabActive ||
      modal ||
      !game ||
      isSimultaneous(game) ||
      !game.players[activeIndex(game)]?.isBot ||
      game.phase === "finished"
    )
      return;
    let timer;
    if (game.phase === "spin" && !spinning) timer = setTimeout(spin, 850);
    if (game.phase === "question")
      timer = setTimeout(() => {
        const plan = planBotAnswer(game.question, game.settings);
        const current = gameRef.current;
        if (current?.phase !== "question") return;
        const revealed = answerQuestion(current, plan.choice, 0);
        updateGame(revealed);
        settle(current, revealed);
      }, 1300);
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
            <CopticCross size={22} />
          </span>
          <span className="brand-word">kinesa</span>
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
            playNow={playNow}
            playDaily={playDaily}
            stats={stats}
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
          <Discover
            setModal={setModal}
            openLobby={openLobby}
            onQuiz={(category) => playNow({ category })}
          />
        )}
        {page === "collection" && (
          <Collection stats={stats} setModal={setModal} openLobby={openLobby} />
        )}
        {page === "game" && game && (
          <Game
            game={game}
            mode={matchMode}
            savedLocally={canSave}
            rotation={rotation}
            spinning={spinning}
            spin={spin}
            answer={answer}
            advance={advance}
            clock={{ running: clockRunning, key: questionKey, msLeft, elapsed }}
            stats={stats}
            matchMeta={matchMeta}
            onExit={() => navigate("home")}
            onRematch={rematch}
            onPractice={() => playNow()}
            onEditPlayers={() => openLobby(matchMode, game.players)}
            onHelp={() => setModal({ type: "help" })}
            onInspectPlayer={(player) => setModal({ type: "player", player })}
            onReady={() => {
              const current = gameRef.current;
              if (current?.phase === "handoff")
                updateGame({ ...current, phase: "spin" });
            }}
            onContinue={() => {
              const current = gameRef.current;
              if (current?.phase === "standings")
                updateGame({ ...current, phase: "handoff" });
            }}
            onHome={() => navigate("home")}
            onToast={setToast}
          />
        )}
      </main>
      <div
        className={`app-toast ${toast ? "is-visible" : ""} ${toastTone === "warn" ? "is-warn" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            {toastTone === "warn" ? (
              <CloudOff size={16} />
            ) : (
              <Check size={16} />
            )}
            {toast}
          </>
        )}
      </div>
      {modal && (
        <Modal
          onClose={() => setModal(null)}
          returnFocus={modalTrigger.current}
          variant={modal.type === "play-sheet" ? "sheet" : "dialog"}
        >
          {modal.type === "play-sheet" && (
            <PlaySheet
              onPlay={(choice) => {
                savePrefs(choice);
                playNow({ name: choice.name, ...choice.settings });
              }}
            />
          )}
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
                    "Tap Play now for a practice match against clearly labeled bots, or pass one phone around with two to four friends.",
                  ],
                  [
                    "Meet your companion",
                    "We shuffle the lion, ox, eagle, and human. Each player gets one. No choosing, no duplicates.",
                  ],
                  [
                    "Spin. Answer. Celebrate.",
                    "The wheel picks the category, then a 20-second clock starts. Correct answers earn 100 points, streaks of three or more multiply them, and fast answers add a bonus. Easy and relaxed play have no clock.",
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
              <p className="modal-about">
                <AboutLinks />
              </p>
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
              <button className="primary-button full" onClick={() => playNow()}>
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
                    {isSimultaneous(game) ? "Question" : "Round"}{" "}
                    {currentRound(game)} of {roundCount(game)} ·{" "}
                    {game.players.length} players
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
                onClick={() => playNow({ category: modal.category.id })}
              >
                Play {modal.category.short} questions <ArrowRight size={20} />
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function Modal({ children, onClose, returnFocus, variant = "dialog" }) {
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
      className={`modal-backdrop is-${variant}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal is-${variant}`}
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
