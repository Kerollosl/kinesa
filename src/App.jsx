import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CloudOff,
  Flame,
  Home as HomeIcon,
  HelpCircle,
  LayoutGrid,
  Settings as SettingsIcon,
  Trophy,
  X,
} from "lucide-react";
import Home from "./components/Home.jsx";
import Game from "./components/Game.jsx";
import ClassicGame from "./components/play/ClassicGame.jsx";
import Lobby from "./components/Lobby.jsx";
import Discover from "./components/Discover.jsx";
import Collection from "./components/Collection.jsx";
import Settings from "./components/Settings.jsx";
import {
  HelpDialog,
  CategoryDialog,
  ReplaceDialog,
} from "./components/Dialogs.jsx";
import { rotationFor } from "./components/Wheel.jsx";
import { CopticCross } from "./components/Ornaments.jsx";
import { loadMatch, persistMatch } from "./session.js";
import { categories, questions } from "./data.js";
import {
  TIMEOUT,
  activeIndex,
  answerQuestion,
  createGame,
  getQuestion,
  getWinners,
  isSimultaneous,
  nextTurn,
  planBotAnswer,
  readSaved,
  recordAnswer,
  revealAnswers,
  saveLocal,
} from "./engine.js";
import {
  WHEEL,
  answerClassic,
  choosePick,
  classicWinners,
  createClassic,
  isClassic,
  landOn,
  nextStep,
  spinIndex,
  fiftyFifty,
} from "./classic.js";
import {
  levelInfo,
  loadStats,
  recordCorrect,
  recordMatch,
  saveStats,
} from "./progress.js";
import { createSound } from "./sound.js";
import { botNames, loadPrefs } from "./prefs.js";
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
// Classic spins are a real moment; quick rounds only flash the wheel.
const SPIN_MS = 2400;
const LAND_MS = 750;
const SPIN_QUICK_MS = 900;
// A short beat after everyone locks in, so the reveal lands as one moment.
const LOCK_BEAT_MS = 650;
const TOPIC_LENGTH = 10;
const PAGES = ["home", "categories", "collection", "lobby", "game"];

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
  const [lobbyKey, setLobbyKey] = useState(0);
  const [rematchPlayers, setRematchPlayers] = useState(null);
  const [game, setGame] = useState(savedMatch?.game || null);
  const [rotation, setRotationState] = useState(0);
  const rotationRef = useRef(0);
  const setRotation = (value) => {
    rotationRef.current = value;
    setRotationState(value);
  };
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(null);
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
  const phaseHeading = useRef(null);
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
    setToast("Storage is blocked, so progress won’t be kept.", "warn");
  }
  const spinTimer = useRef(null);
  const pegTimers = useRef([]);
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
    pegTimers.current.forEach(clearTimeout);
    pegTimers.current = [];
    spinningRef.current = false;
    setSpinning(false);
    setLanded(null);
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
        PAGES.includes(target) && (target !== "game" || gameRef.current)
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
  // Each new play screen moves focus to its heading.
  useEffect(() => {
    if (page !== "game" || ["question", "reveal"].includes(game?.phase)) return;
    phaseHeading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, game?.phase, game?.turn]);
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

  // ---- Starting games -------------------------------------------------
  const startPrepared = (prepared, nextMode) => {
    cancelSpin();
    clearTimeout(revealTimer.current);
    setModal(null);
    setRotation(0);
    updateGame(prepared);
    setMatchMeta(matchBaseline(statsRef.current));
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
  // Play: a classic game against one practice bot, in one tap.
  const playNow = () => {
    const prefs = loadPrefs();
    begin(
      createClassic(
        [
          { name: prefs.name || "You" },
          { name: botNames(1, prefs.name)[0], isBot: true },
        ],
        Math.random,
        { settings: { ...prefs.settings, category: null } },
      ),
      "random",
    );
  };
  // Ten questions from one category, against practice bots.
  const playTopic = (category) => {
    const prefs = loadPrefs();
    begin(
      createGame(
        [
          { name: prefs.name || "You" },
          ...botNames(3, prefs.name).map((bot) => ({ name: bot, isBot: true })),
        ],
        Math.random,
        {
          structure: "simultaneous",
          settings: { ...prefs.settings, category, questions: TOPIC_LENGTH },
        },
      ),
      "random",
    );
  };
  // Today's five: solo, timed, the same questions for everyone on this date.
  const playDaily = () => {
    if (dailyStatus(statsRef.current).done) {
      setToast("Done for today. New five tomorrow!");
      return;
    }
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
  const openFriends = (players = null) => {
    cancelSpin();
    setRematchPlayers(players);
    setLobbyKey((n) => n + 1);
    setModal(null);
    navigate("lobby");
  };
  // Same players and settings, a fresh companion deal.
  const rematch = () => {
    const current = gameRef.current;
    if (!current) return;
    const players = current.players.map((p) => ({
      name: p.name,
      isBot: p.isBot,
    }));
    startPrepared(
      isClassic(current)
        ? createClassic(players, Math.random, { settings: current.settings })
        : createGame(players, Math.random, {
            structure: current.structure,
            settings: current.settings,
          }),
      matchMode,
    );
  };

  // ---- Spinning ---------------------------------------------------------
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
    const current = gameRef.current;
    if (spinningRef.current || current?.phase !== "spin") return;
    spinningRef.current = true;
    const classic = isClassic(current);
    const quick = !classic && isSimultaneous(current);
    const count = classic ? WHEEL.length : categories.length;
    const index = classic
      ? spinIndex()
      : Math.floor(Math.random() * categories.length);
    const from = rotationRef.current;
    const to = rotationFor(from, index, count, quick ? 2 : 4);
    setRotation(to);
    setSpinning(true);
    play("spin");
    const ms = reducedMotion() ? 150 : quick ? SPIN_QUICK_MS : SPIN_MS;
    // A soft click each time a panel passes the pointer, slowing with the wheel.
    if (!reducedMotion() && soundRef.current) {
      const seg = 360 / count;
      const total = to - from;
      for (let k = 1; k * seg < total && k < 40; k++) {
        const at = ms * (1 - Math.cbrt(1 - (k * seg) / total));
        pegTimers.current.push(setTimeout(() => play("peg"), at));
      }
    }
    spinTimer.current = setTimeout(() => {
      setSpinning(false);
      if (!classic) {
        const g = gameRef.current;
        if (g?.phase === "spin") drawQuestion(g, categories[index].id);
        spinningRef.current = false;
        return;
      }
      // Classic: show where it landed for a beat, then ask.
      pegTimers.current = [];
      setLanded(index);
      play("lock");
      navigator.vibrate?.(soundRef.current ? 12 : 0);
      spinTimer.current = setTimeout(
        () => {
          const g = gameRef.current;
          if (g?.phase === "spin") updateGame(landOn(g, index));
          setLanded(null);
          spinningRef.current = false;
        },
        reducedMotion() ? 300 : LAND_MS,
      );
    }, ms);
  };
  const pick = (categoryId) => {
    const current = gameRef.current;
    if (!isClassic(current)) return;
    updateGame(choosePick(current, categoryId));
  };

  // ---- Question clock ---------------------------------------------------
  // Elapsed time pauses with dialogs, hidden tabs and navigation.
  const questionKey =
    game?.phase === "question" && game.question
      ? `${game.used.length}:${game.question.id}`
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
  const msLeftAt = (ms) => {
    const s = gameRef.current?.settings;
    return s?.timed ? s.seconds * 1000 - ms : 0;
  };
  const botPlans = useRef({ key: null, plans: {} });

  // ---- Answers ------------------------------------------------------------
  // Awards progress for every human answer once it is revealed.
  const settle = (after) => {
    let next = statsRef.current;
    let unlocked = false;
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
      if (result.newBadge || result.newMastery) unlocked = true;
    });
    if (next !== statsRef.current) setStats(next);
    const focus = after.answers[activeIndex(after)];
    if (focus) {
      play(
        focus.challenge && focus.correct
          ? "unlock"
          : focus.correct
            ? focus.streak >= 3
              ? "streak"
              : "correct"
            : "wrong",
      );
      navigator.vibrate?.(
        soundRef.current ? (focus.correct ? 18 : [12, 60, 12]) : 0,
      );
    }
    if (unlocked && !focus?.challenge) play("unlock");
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
    settle(revealed);
  };
  const answer = (i) => {
    const current = gameRef.current;
    if (current?.phase !== "question" || !Number.isInteger(i) || i < 0 || i > 3)
      return;
    if (isClassic(current)) {
      if (current.answers[current.turn]) return;
      const revealed = answerClassic(current, i, msLeft());
      if (revealed === current) return;
      updateGame(revealed);
      settle(revealed);
      return;
    }
    const me = activeIndex(current);
    if (current.answers?.[me]) return;
    if (!isSimultaneous(current)) {
      const revealed = answerQuestion(current, i, msLeft());
      updateGame(revealed);
      settle(revealed);
      return;
    }
    updateGame(recordAnswer(current, me, i, msLeft()));
    play("lock");
    revealTimer.current = setTimeout(
      reveal,
      reducedMotion() ? 120 : LOCK_BEAT_MS,
    );
  };
  const help = () => {
    const current = gameRef.current;
    if (!isClassic(current)) return;
    const next = fiftyFifty(current);
    if (next !== current) {
      play("lock");
      updateGame(next);
    }
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
          if (isClassic(g)) {
            if (g.answers[g.turn]) return;
            const revealed = answerClassic(g, TIMEOUT, 0);
            updateGame(revealed);
            settle(revealed);
          } else if (isSimultaneous(g)) reveal();
          else {
            const revealed = answerQuestion(g, TIMEOUT, 0);
            updateGame(revealed);
            settle(revealed);
          }
        }
      }
    };
    const timer = setInterval(tick, 150);
    return () => clearInterval(timer);
  }, [clockRunning, questionKey]);
  // Category-locked and planned (daily) rounds skip the wheel.
  useEffect(() => {
    if (
      page !== "game" ||
      isClassic(game) ||
      game?.phase !== "spin" ||
      !(game.settings?.category || game.settings?.plan)
    )
      return;
    const timer = setTimeout(() => {
      const current = gameRef.current;
      if (current?.phase === "spin")
        drawQuestion(current, current.settings.category);
    }, 350);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.turn, page]);
  // Older mixed practice rounds spin the wheel themselves.
  useEffect(() => {
    if (
      page !== "game" ||
      !tabActive ||
      modal ||
      spinning ||
      game?.phase !== "spin" ||
      !isSimultaneous(game) ||
      game.settings?.category ||
      game.settings?.plan
    )
      return;
    const timer = setTimeout(spin, game.turn === 0 ? 200 : 450);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.turn, page, spinning, modal, tabActive]);

  // ---- Moving on ----------------------------------------------------------
  const finishMatch = (next) => {
    updateGame(next);
    const humans = next.players.filter((p) => !p.isBot);
    const human = humans[0];
    const winners = isClassic(next)
      ? classicWinners(next)
      : getWinners(next.players);
    const won =
      matchMode !== "daily" &&
      humans.length === 1 &&
      next.players.length > 1 &&
      winners.length === 1 &&
      winners[0] === human;
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
  };
  const advance = () => {
    const current = gameRef.current;
    if (isClassic(current)) {
      if (!["reveal", "rival"].includes(current.phase)) return;
      const next = nextStep(current);
      if (next.phase === "finished") return finishMatch(next);
      if (next.phase === "pick") play("unlock");
      updateGame(next);
      return;
    }
    if (current?.phase !== "reveal") return;
    const next = nextTurn(current);
    if (next.phase === "finished") return finishMatch(next);
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
      isClassic(game) ||
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
        settle(revealed);
      }, 1300);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.turn, page, spinning, modal, tabActive]);

  const gameProps = {
    game,
    mode: matchMode,
    rotation,
    spinning,
    clock: { running: clockRunning, key: questionKey, msLeft, elapsed },
    stats,
    matchMeta,
    headingRef: phaseHeading,
    onExit: () => navigate("home"),
    onRules: () => setModal({ type: "help" }),
    onRematch: rematch,
    onPlay: playNow,
    onEditPlayers: () =>
      openFriends(game?.players.filter((p) => !p.isBot) || null),
    onToast: setToast,
    onReady: () => {
      const current = gameRef.current;
      if (current?.phase === "handoff")
        updateGame({ ...current, phase: "spin" });
    },
  };
  const daily = dailyStatus(stats);
  const level = levelInfo(stats.xp).level;
  const inPlay = ["game", "lobby"].includes(page);
  const navItems = [
    ["home", HomeIcon, "Home"],
    ["categories", LayoutGrid, "Categories"],
    ["collection", Trophy, "Trophies"],
  ];
  return (
    <div className={`app ${inPlay ? "is-playing" : ""}`} data-page={page}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!inPlay && (
        <header className="app-header" inert={!!modal}>
          <button
            className="brand"
            onClick={() => navigate("home")}
            aria-label="Kinesa home"
          >
            <span className="brand-mark">
              <CopticCross size={22} />
            </span>
            <span className="brand-word">kinesa</span>
          </button>
          <nav className="tabs" aria-label="Main">
            {navItems.map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={page === id ? "is-active" : ""}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="header-tools">
            <button
              className="level-pill"
              onClick={() => navigate("collection")}
              aria-label={`Level ${level}. See trophies`}
              title="Your level"
            >
              {level}
            </button>
            <span
              className={`streak-pill ${daily.streak ? "is-lit" : ""}`}
              role="img"
              aria-label={`${daily.streak}-day streak`}
              title="Daily streak"
            >
              <Flame size={18} aria-hidden="true" />
              {daily.streak}
            </span>
            <button
              className="icon-btn"
              aria-label="How to play"
              onClick={() => setModal({ type: "help" })}
            >
              <HelpCircle size={22} />
            </button>
            <button
              className="icon-btn"
              aria-label="Settings"
              onClick={() => setModal({ type: "settings" })}
            >
              <SettingsIcon size={22} />
            </button>
          </div>
        </header>
      )}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        inert={!!modal}
        className={`main page-${page}`}
      >
        {page === "home" && (
          <Home
            game={game}
            stats={stats}
            onResume={() => navigate("game")}
            onPlay={playNow}
            onFriends={() => openFriends()}
            onDaily={playDaily}
          />
        )}
        {page === "lobby" && (
          <Lobby
            key={lobbyKey}
            onBack={() => navigate("home")}
            onBegin={begin}
            initialPlayers={rematchPlayers}
          />
        )}
        {page === "categories" && (
          <Discover
            stats={stats}
            onOpen={(category) => setModal({ type: "category", category })}
          />
        )}
        {page === "collection" && <Collection stats={stats} onPlay={playNow} />}
        {page === "game" &&
          game &&
          (isClassic(game) ? (
            <ClassicGame
              {...gameProps}
              landed={landed}
              onSpin={spin}
              onPick={pick}
              onAnswer={answer}
              onHelp={help}
              onNext={advance}
            />
          ) : (
            <Game
              {...gameProps}
              spin={spin}
              answer={answer}
              advance={advance}
              onContinue={() => {
                const current = gameRef.current;
                if (current?.phase === "standings")
                  updateGame({ ...current, phase: "handoff" });
              }}
            />
          ))}
        {page === "game" && game && !canSave && (
          <span
            className="save-warning"
            role="img"
            aria-label="This game isn’t being saved"
            title="This game isn’t being saved"
          >
            <CloudOff size={16} />
          </span>
        )}
      </main>
      {!inPlay && (
        <nav className="bottom-tabs" aria-label="Main" inert={!!modal}>
          {navItems.map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={page === id ? "is-active" : ""}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      <div
        className={`toast ${toast ? "is-visible" : ""} ${toastTone === "warn" ? "is-warn" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            {toastTone === "warn" ? (
              <CloudOff size={18} aria-hidden="true" />
            ) : (
              <Check size={18} aria-hidden="true" />
            )}
            {toast}
          </>
        )}
      </div>
      {modal && (
        <Modal
          onClose={() => setModal(null)}
          returnFocus={modalTrigger.current}
        >
          {modal.type === "settings" && (
            <Settings
              sound={sound}
              onSound={(on) => setSound(on)}
              onHelp={() => setModal({ type: "help" })}
              onDone={() => setModal(null)}
            />
          )}
          {modal.type === "help" && (
            <HelpDialog onDone={() => setModal(null)} />
          )}
          {modal.type === "category" && (
            <CategoryDialog
              category={modal.category}
              stats={stats}
              onPlay={() => playTopic(modal.category.id)}
            />
          )}
          {modal.type === "replace-match" && game && (
            <ReplaceDialog
              game={game}
              onResume={() => {
                setModal(null);
                navigate("game");
              }}
              onReplace={() => startPrepared(modal.prepared, modal.nextMode)}
            />
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
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
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
          className="icon-btn modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={22} />
        </button>
        {children}
      </section>
    </div>
  );
}
