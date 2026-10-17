import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Users,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  Check,
  Trophy,
  Compass,
  Sparkles,
  Home,
  Heart,
  RotateCcw,
  ChevronRight,
  Medal,
  BookOpen,
} from "lucide-react";
import Mascot, { MASCOTS } from "./components/Mascot.jsx";
import Wheel, { CategoryIcon } from "./components/Wheel.jsx";
import { categories } from "./data.js";
import {
  ROUNDS,
  createGame,
  getQuestion,
  answerQuestion,
  nextTurn,
  getWinners,
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
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z" fill="currentColor" />
      <circle cx="16" cy="16" r="3" fill="#f8f7f2" />
    </svg>
  );
}
function App() {
  const [page, setPage] = useState("home");
  const [modal, setModal] = useState(null);
  const [selectedMascot, setSelectedMascot] = useState("lion");
  const [sound, setSound] = useState(
    () => readSaved("kinesa-sound", false) === true,
  );
  const [stats, setStats] = useState(loadStats);
  const [game, setGame] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef(null);
  const audio = useRef(null);
  useEffect(() => () => clearTimeout(spinTimer.current), []);
  useEffect(() => {
    saveLocal("kinesa-sound", sound);
  }, [sound]);
  const beep = (success = true) => {
    if (!sound) return;
    try {
      audio.current ||= new (
        window.AudioContext || window.webkitAudioContext
      )();
      const ctx = audio.current;
      ctx.resume();
      [0, 0.12, 0.24].forEach((delay, i) => {
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
      /* Audio is optional. */
    }
  };
  const navigate = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const start = (players) => {
    clearTimeout(spinTimer.current);
    setSpinning(false);
    setGame(createGame(players));
    setModal(null);
    setRotation(0);
    navigate("game");
  };
  const spin = () => {
    if (spinning || game.phase !== "spin") return;
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
    if (game.phase !== "question") return;
    const correct = i === game.question.correct;
    beep(correct);
    setGame((g) => answerQuestion(g, i));
    if (correct) {
      setStats((s) => {
        const n = {
          ...s,
          correct: s.correct + 1,
          badges: [...new Set([...s.badges, game.question.category])],
        };
        saveLocal("kinesa-stats", n);
        return n;
      });
    }
  };
  const advance = () => {
    const n = nextTurn(game);
    setGame(n);
    if (n.phase === "finished") {
      beep();
      setStats((s) => {
        const next = { ...s, games: s.games + 1 };
        saveLocal("kinesa-stats", next);
        return next;
      });
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Kinesa home"
        >
          <CrossMark />
          <span>
            kinesa<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="brand-caption">A LITTLE FAITH. A LOT OF FUN.</div>
        <div className="nav-label">LET’S PLAY</div>
        <nav aria-label="Main navigation">
          {[
            ["home", Home, "Play"],
            ["categories", Compass, "Explore categories"],
            ["collection", Medal, "Your collection"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              aria-label={label}
              className={`nav-item ${page === id || (id === "home" && page === "game") ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {id === "home" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <span className="note-star">✧</span>
            <p>
              Better together.
              <br />
              <strong>Just like church.</strong>
            </p>
            <div className="note-dots">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <button
            className="nav-item"
            onClick={() => setModal({ type: "help" })}
          >
            <HelpCircle size={20} />
            How to play
          </button>
          <div className="sidebar-footer">
            MADE WITH FAITH & A LITTLE FUN <Heart size={11} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-brand"
            onClick={() => navigate("home")}
            aria-label="Kinesa home"
          >
            <CrossMark />
            <span>
              kinesa<span>.</span>
            </span>
          </button>
          <div className="breadcrumb">
            <span>Kinesa club</span>
            <ChevronRight size={14} />
            <strong>
              {
                {
                  home: "Let’s play",
                  categories: "Explore",
                  collection: "Your collection",
                  game: "Game time",
                }[page]
              }
            </strong>
          </div>
          <div className="top-actions">
            <span className="local-label">
              <span /> A place for everyone
            </span>
            <button
              className="icon-button"
              onClick={() => setSound((s) => !s)}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
              aria-pressed={sound}
            >
              {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              className="profile-avatar"
              onClick={() => navigate("collection")}
              aria-label="View your collection"
            >
              <Mascot kind={selectedMascot} />
            </button>
          </div>
        </header>
        <main id="main-content">
          {page === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">COME ON IN. YOU BELONG HERE.</div>
                  <h1>
                    Good company. Great questions
                    <span className="coral">.</span>
                  </h1>
                </div>
                <span className="hand-drawn-star">✧</span>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-tag">
                    <span /> FAITH. FRIENDS. FRIENDLY RIVALRY.
                  </div>
                  <h2>
                    A little faith.
                    <br />A <span>lot of fun.</span>
                    <svg viewBox="0 0 220 14" aria-hidden="true">
                      <path d="M4 10Q110 -3 216 7" />
                    </svg>
                  </h2>
                  <p>
                    Your favorite Bible stories. Your Coptic roots.
                    <br className="desktop-break" /> A whole new way to bring
                    everyone together.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setModal({ type: "setup" })}
                  >
                    Start a game <ArrowRight size={20} />
                  </button>
                  <div className="hero-meta">
                    <Users size={16} />
                    <span>1–4 players</span>
                    <span className="tiny-dot" />
                    <span>One device. Endless good times.</span>
                  </div>
                </div>
                <div
                  className="hero-art"
                  aria-label="Four playful Gospel companions gathered around a colorful trivia wheel"
                  role="img"
                >
                  <div className="sunburst" />
                  <span className="art-spark s1">✧</span>
                  <span className="art-spark s2">✦</span>
                  <span className="art-spark s3">✧</span>
                  <span className="art-dot d1" />
                  <span className="art-dot d2" />
                  <div className="hero-wheel">
                    <Wheel decorative />
                  </div>
                  <div className="speech-bubble">
                    Oh, it’s on! <span>✦</span>
                  </div>
                  <div className="hero-mascot hm-human">
                    <Mascot kind="human" />
                  </div>
                  <div className="hero-mascot hm-ox">
                    <Mascot kind="ox" />
                  </div>
                  <div className="hero-mascot hm-eagle">
                    <Mascot kind="eagle" />
                  </div>
                  <div className="hero-mascot hm-lion">
                    <Mascot kind="lion" />
                  </div>
                  <div className="art-ground" />
                </div>
              </section>
              {game && game.phase !== "finished" && (
                <button
                  className="resume-banner"
                  onClick={() => navigate("game")}
                >
                  <Play size={18} />
                  <span>
                    Your game is waiting. <strong>Jump back in</strong>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              <section className="companions-section">
                <div className="section-heading">
                  <div>
                    <h2>Four companions. One good time.</h2>
                    <p>
                      Inspired by the four Gospels. Ready for a little friendly
                      competition.
                    </p>
                  </div>
                  <span className="section-kicker">
                    MEET YOUR TEAM <span>↴</span>
                  </span>
                </div>
                <div className="mascot-grid">
                  {MASCOTS.map((m) => (
                    <button
                      key={m.kind}
                      className={`mascot-card ${selectedMascot === m.kind ? "chosen" : ""}`}
                      style={{ "--card-bg": m.bg, "--mascot-color": m.color }}
                      onClick={() => {
                        setSelectedMascot(m.kind);
                        setModal({ type: "mascot", mascot: m });
                      }}
                    >
                      <span className="mascot-kind">
                        {m.gospel.toUpperCase()} · {m.kind.toUpperCase()}
                      </span>
                      <div className="card-mascot">
                        <Mascot kind={m.kind} />
                      </div>
                      <div className="mascot-caption">
                        <div>
                          <h3>{m.name}</h3>
                          <p>{m.personality}</p>
                        </div>
                        <span className="card-arrow">
                          <ArrowRight size={17} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              <section className="discovery-row">
                <div className="category-preview">
                  <div className="section-heading compact">
                    <h2>A whole world to discover</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("categories")}
                    >
                      Explore all <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="category-chips">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() =>
                          setModal({ type: "category", category: c })
                        }
                      >
                        <span style={{ background: c.pale, color: c.color }}>
                          <CategoryIcon category={c} size={20} />
                        </span>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="how-card"
                  onClick={() => setModal({ type: "help" })}
                >
                  <span className="how-illustration">
                    <Sparkles size={34} />
                    <span>?</span>
                  </span>
                  <div>
                    <span className="eyebrow">NEW AROUND HERE?</span>
                    <h3>Spin. Think. Celebrate.</h3>
                    <p>We’ll show you the ropes.</p>
                  </div>
                  <ArrowRight size={21} />
                </button>
              </section>
              <footer className="home-footer">
                <CrossMark />
                <span>Rooted in faith. Made for togetherness.</span>
                <span className="sample-note">
                  A little preview, with a sample question deck.
                </span>
              </footer>
            </>
          )}
          {page === "categories" && (
            <>
              <PageIntro
                eyebrow="SIX PATHS. SO MUCH TO DISCOVER."
                title="A world of wonder."
                description="From familiar stories to delightful discoveries. Where will the wheel take you?"
              />
              <div className="explore-grid">
                {categories.map((c, i) => (
                  <button
                    className="explore-card"
                    style={{
                      "--category-color": c.color,
                      "--category-pale": c.pale,
                    }}
                    key={c.id}
                    onClick={() => setModal({ type: "category", category: c })}
                  >
                    <span className="explore-number">0{i + 1}</span>
                    <div className="explore-icon">
                      <CategoryIcon category={c} size={38} />
                    </div>
                    <h2>{c.name}</h2>
                    <p>{c.description}</p>
                    <span className="text-button">
                      Take a peek <ArrowRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="info-note">
                <BookOpen size={20} />
                <p>
                  This first edition uses a small sample deck. The full question
                  library is still to come.
                </p>
              </div>
            </>
          )}
          {page === "collection" && (
            <>
              <PageIntro
                eyebrow="LITTLE DISCOVERIES. BIG HIGH-FIVES."
                title="Your little treasure trove."
                description="Every right answer is a new discovery. Collect a badge from each corner of the wheel."
              />
              <div className="stats-row">
                <div>
                  <Trophy />
                  <strong>{stats.games}</strong>
                  <span>Games completed</span>
                </div>
                <div>
                  <Check />
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
                        style={{
                          background: earned ? c.pale : undefined,
                          color: earned ? c.color : undefined,
                        }}
                      >
                        <CategoryIcon category={c} size={42} />
                        {earned && (
                          <span>
                            <Check size={13} />
                          </span>
                        )}
                      </div>
                      <h3>{c.name}</h3>
                      <p>
                        {earned
                          ? "A lovely little discovery!"
                          : "Answer correctly to collect"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="collection-cta">
                <div>
                  <h2>There’s always more to discover.</h2>
                  <p>Your collection is saved on this device.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setModal({ type: "setup" })}
                >
                  Let’s play <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
          {page === "game" && game && (
            <Game
              game={game}
              rotation={rotation}
              spinning={spinning}
              spin={spin}
              answer={answer}
              advance={advance}
              onExit={() => setModal({ type: "exit" })}
              onRematch={() => start(game.players)}
              onHome={() => navigate("home")}
            />
          )}
        </main>
      </div>
      {modal && (
        <Modal onClose={() => setModal(null)} titleId="modal-title">
          {modal.type === "setup" && (
            <Setup selectedMascot={selectedMascot} start={start} />
          )}
          {modal.type === "help" && (
            <>
              <div className="modal-symbol">
                <Sparkles size={30} />
              </div>
              <div className="eyebrow">GOOD TIMES ARE JUST A SPIN AWAY</div>
              <h2 id="modal-title">A little friendly competition.</h2>
              <p className="modal-lead">
                Gather around one device. Bring your curiosity.
              </p>
              <div className="steps">
                {[
                  [
                    "Pick your people",
                    "Play solo or gather up to four players. Everyone gets their own Gospel companion.",
                  ],
                  [
                    "Give it a spin",
                    "The wheel chooses one of six Bible and Coptic categories. Take your time with each question.",
                  ],
                  [
                    "Make a little history",
                    "Earn 100 points for each correct answer. After three rounds, the highest score wins. Ties share the celebration!",
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
                onClick={() => setModal({ type: "setup" })}
              >
                Got it. Let’s play! <ArrowRight size={18} />
              </button>
              <p className="modal-footnote">
                Pass-and-play • No timer • Sample question deck
              </p>
            </>
          )}
          {modal.type === "mascot" && (
            <>
              <div
                className="modal-mascot"
                style={{ background: modal.mascot.bg }}
              >
                <Mascot kind={modal.mascot.kind} />
              </div>
              <div className="eyebrow">YOUR NEW TRIVIA COMPANION</div>
              <h2 id="modal-title">Meet {modal.mascot.name}.</h2>
              <p className="modal-lead">
                {modal.mascot.personality} Inspired by the{" "}
                {modal.mascot.kind === "human"
                  ? "winged human"
                  : modal.mascot.kind}
                , the traditional symbol of the Gospel of {modal.mascot.gospel}.
              </p>
              <p className="companion-note">
                A playful companion for the journey — and a very enthusiastic
                teammate.
              </p>
              <button
                className="primary-button full"
                onClick={() => setModal({ type: "setup" })}
              >
                Play with {modal.mascot.name} <ArrowRight size={18} />
              </button>
            </>
          )}
          {modal.type === "category" && (
            <>
              <div
                className="modal-symbol"
                style={{
                  background: modal.category.pale,
                  color: modal.category.color,
                }}
              >
                <CategoryIcon category={modal.category} size={34} />
              </div>
              <div className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</div>
              <h2 id="modal-title">{modal.category.name}</h2>
              <p className="modal-lead">{modal.category.detail}</p>
              <div className="category-example">
                <span>SOMETHING TO WONDER ABOUT</span>
                <p>
                  {
                    {
                      bible:
                        "How well do you remember Noah’s remarkable journey?",
                      history:
                        "Where did the story of the Coptic Church begin?",
                      saints:
                        "Who found extraordinary faith in the quiet of the desert?",
                      traditions:
                        "What makes our worship so rich with meaning?",
                      feasts: "What stories does the church calendar tell?",
                      symbols:
                        "Why are four very different creatures linked to the Gospels?",
                    }[modal.category.id]
                  }
                </p>
              </div>
              <button
                className="primary-button full"
                onClick={() => setModal({ type: "setup" })}
              >
                Give the wheel a spin <ArrowRight size={18} />
              </button>
            </>
          )}
          {modal.type === "exit" && (
            <>
              <div className="modal-symbol">
                <Home size={28} />
              </div>
              <h2 id="modal-title">Take a little breather?</h2>
              <p className="modal-lead">
                Your current game will stay here while you explore. You can jump
                back in from the home screen.
              </p>
              <button
                className="primary-button full"
                onClick={() => {
                  setModal(null);
                  navigate("home");
                }}
              >
                Back to the club <ArrowRight size={18} />
              </button>
              <button
                className="text-button full"
                onClick={() => setModal(null)}
              >
                Keep playing
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
function Modal({ children, onClose, titleId }) {
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
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={21} />
        </button>
        {children}
      </section>
    </div>
  );
}
function Setup({ selectedMascot, start }) {
  const ordered = [
    selectedMascot,
    ...MASCOTS.map((m) => m.kind).filter((k) => k !== selectedMascot),
  ];
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState(
    ordered.map((kind, i) => ({ kind, name: `Player ${i + 1}` })),
  );
  const update = (i, key, value) =>
    setPlayers((ps) => {
      const copy = ps.map((p) => ({ ...p }));
      if (key === "kind") {
        const other = copy.findIndex((p) => p.kind === value);
        if (other !== -1) copy[other].kind = copy[i].kind;
      }
      copy[i][key] = value;
      return copy;
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(players.slice(0, count));
      }}
    >
      <div className="modal-symbol">
        <Users size={29} />
      </div>
      <div className="eyebrow">SAVE A SEAT FOR EVERYONE</div>
      <h2 id="modal-title">Who’s in your crew?</h2>
      <p className="modal-lead">
        One device. Up to four friends. A little friendly rivalry.
      </p>
      <fieldset className="player-count">
        <legend>Number of players</legend>
        {[1, 2, 3, 4].map((n) => (
          <button
            type="button"
            key={n}
            aria-pressed={count === n}
            className={count === n ? "selected" : ""}
            onClick={() => setCount(n)}
          >
            {n === 1 ? "Solo" : n}
          </button>
        ))}
      </fieldset>
      <div className="player-fields">
        {players.slice(0, count).map((p, i) => (
          <div className="player-field" key={i}>
            <div className="setup-avatar">
              <Mascot kind={p.kind} />
            </div>
            <label>
              <span>PLAYER {i + 1}</span>
              <input
                maxLength={20}
                value={p.name}
                onChange={(e) => update(i, "name", e.target.value)}
                aria-label={`Player ${i + 1} name`}
              />
            </label>
            <label className="companion-select">
              <span>COMPANION</span>
              <select
                value={p.kind}
                onChange={(e) => update(i, "kind", e.target.value)}
                aria-label={`Player ${i + 1} companion`}
              >
                {MASCOTS.map((m) => (
                  <option value={m.kind} key={m.kind}>
                    {m.name} · {m.kind}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>
      <div className="setup-summary">
        <span>
          <RotateCcw size={14} /> {ROUNDS} rounds
        </span>
        <span>
          <Users size={14} /> Pass & play
        </span>
        <span>
          <Heart size={14} /> No timer
        </span>
      </div>
      <button className="primary-button full" type="submit">
        Let’s do this <ArrowRight size={19} />
      </button>
      <p className="modal-footnote">
        Sample questions for now. A whole world of trivia to come.
      </p>
    </form>
  );
}
function Game({
  game,
  rotation,
  spinning,
  spin,
  answer,
  advance,
  onExit,
  onRematch,
  onHome,
}) {
  const active = game.turn % game.players.length;
  const player = game.players[active];
  const q = game.question;
  const cat = q ? categories.find((c) => c.id === q.category) : null;
  const finished = game.phase === "finished";
  const winners = finished ? getWinners(game.players) : [];
  const phaseHeading = useRef(null);
  useEffect(() => {
    phaseHeading.current?.focus();
  }, [game.phase]);
  return (
    <div className="game-page">
      <div className="game-top">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={17} /> Back to the club
        </button>
        <span className="round-tag">
          {finished
            ? "ALL ROUNDS COMPLETE"
            : `ROUND ${Math.floor(game.turn / game.players.length) + 1} OF ${ROUNDS}`}
        </span>
        <span className="sample-tag">Sample deck</span>
      </div>
      <div className="scoreboard">
        {game.players.map((p, i) => (
          <div
            className={`score-player ${active === i && !finished ? "current" : ""}`}
            key={p.kind}
          >
            <div className="score-avatar">
              <Mascot kind={p.kind} />
            </div>
            <div>
              <strong>{p.name}</strong>
              <span>
                {p.score} points{" "}
                {active === i && !finished && <b>• Your turn</b>}
              </span>
            </div>
            <div className="mini-badges">
              {p.badges.map((id) => (
                <span
                  key={id}
                  style={{
                    background: categories.find((c) => c.id === id).color,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {game.phase === "spin" && (
        <section className="spin-stage">
          <div className="eyebrow">A LITTLE CURIOSITY. A LITTLE LUCK.</div>
          <h1 ref={phaseHeading} tabIndex={-1}>
            {player.name}, you’re up!
          </h1>
          <p>Give the wheel a spin. Let’s see where we’re headed.</p>
          <div className="game-wheel-scene">
            <div className="game-companion">
              <Mascot kind={player.kind} />
              <span>You’ve got this!</span>
            </div>
            <Wheel rotation={rotation} spinning={spinning} />
            <span className="spin-spark">✧</span>
          </div>
          <button
            className="primary-button spin-button"
            disabled={spinning}
            onClick={spin}
          >
            <RotateCcw size={20} />
            {spinning ? "Finding your adventure…" : "Spin the wheel"}
          </button>
          <div className="wheel-legend">
            {categories.map((c) => (
              <span key={c.id}>
                <i style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </section>
      )}
      {(game.phase === "question" || game.phase === "reveal") && (
        <section
          className="question-stage"
          style={{ "--question-color": cat.color, "--question-pale": cat.pale }}
        >
          <div className="question-category">
            <CategoryIcon category={cat} size={20} />
            {cat.name}
          </div>
          <div className="question-header">
            <span>{player.name}’s question</span>
            <span>100 POINTS</span>
          </div>
          <h1 ref={phaseHeading} tabIndex={-1}>
            {q.text}
          </h1>
          <div className="answer-grid">
            {q.answers.map((text, i) => {
              const revealed = game.phase === "reveal";
              return (
                <button
                  key={text}
                  className={`answer-option ${revealed && i === q.correct ? "correct" : ""} ${revealed && i === game.selected && i !== q.correct ? "incorrect" : ""}`}
                  disabled={revealed}
                  onClick={() => answer(i)}
                >
                  <span className="answer-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{text}</span>
                  {revealed && i === q.correct ? (
                    <Check size={22} />
                  ) : revealed && i === game.selected ? (
                    <X size={22} />
                  ) : null}
                </button>
              );
            })}
          </div>
          {game.phase === "question" ? (
            <p className="take-time">
              <Heart size={15} /> Take your time. Good things are worth thinking
              about.
            </p>
          ) : (
            <div
              className={`answer-reveal ${game.selected === q.correct ? "is-correct" : ""}`}
              role="status"
            >
              <div className="reveal-mascot">
                <Mascot
                  kind={player.kind}
                  mood={game.selected === q.correct ? "celebrate" : "happy"}
                />
              </div>
              <div>
                <h2>
                  {game.selected === q.correct
                    ? "Look at you go! +100"
                    : "A little wiser already."}
                </h2>
                <p>{q.explanation}</p>
                <span className="source">{q.source}</span>
              </div>
              <button className="primary-button" onClick={advance}>
                {game.turn + 1 >= game.players.length * ROUNDS
                  ? "See the results"
                  : "Next turn"}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </section>
      )}
      {finished && (
        <section className="results-stage">
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  "--i": i,
                  background: categories[i % 6].color,
                  left: `${(i * 19) % 100}%`,
                  animationDelay: `${i * 0.11}s`,
                }}
              />
            ))}
          </div>
          <div className="eyebrow">FAITH. FRIENDS. A FEW BRAGGING RIGHTS.</div>
          <Trophy className="winner-trophy" size={38} />
          <h1 ref={phaseHeading} tabIndex={-1}>
            {winners.length > 1
              ? "A shared celebration!"
              : `${winners[0].name} takes the crown!`}
          </h1>
          <p>
            {winners.length > 1
              ? "Great minds, equal points. There’s room for everyone on this podium."
              : "A lovely little victory. An even better time together."}
          </p>
          <div className="winner-mascots">
            {winners.map((p) => (
              <div key={p.kind}>
                <Mascot kind={p.kind} mood="celebrate" />
                <strong>{p.name}</strong>
              </div>
            ))}
          </div>
          <div className="final-scores">
            {[...game.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <div key={p.kind}>
                  <span>
                    {winners.some((w) => w.kind === p.kind) ? "✦" : "✧"}
                  </span>
                  <strong>{p.name}</strong>
                  <b>
                    {p.score} <small>points</small>
                  </b>
                </div>
              ))}
          </div>
          <div className="results-actions">
            <button className="primary-button" onClick={onRematch}>
              <RotateCcw size={18} /> One more round?
            </button>
            <button className="secondary-button" onClick={onHome}>
              Back to the club
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
export default App;
