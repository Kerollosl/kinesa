import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Clock3,
  CircleCheck,
  ChevronRight,
  Globe2,
  LockKeyhole,
  Plus,
  Shuffle,
  Users,
  X,
} from "lucide-react";
import Mascot, { MASCOTS } from "./Mascot.jsx";
import { createGame, readSaved, saveLocal } from "../engine.js";
import "./lobby-experience.css";

const newCode = () =>
  Array.from(
    { length: 6 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("");
const sampleNames = ["Mina", "Mariam", "Bishoy"];
const seatColors = ["#758ee2", "#b78aca", "#6bafa7", "#c49a67"];
const initials = (value) =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("") || "?";
function savedRoom() {
  const room = readSaved("kinesa-room-preview", null);
  return room &&
    typeof room.code === "string" &&
    /^[A-Z0-9]{6}$/.test(room.code) &&
    Array.isArray(room.names) &&
    room.names.length >= 2 &&
    room.names.length <= 4 &&
    room.names.every((n) => typeof n === "string" && n.length <= 20)
    ? room
    : null;
}
export default function Lobby({ mode, onBack, onBegin, initialPlayers }) {
  const [recentRoom] = useState(savedRoom);
  const [stage, setStage] = useState("entry");
  const [tab, setTab] = useState("create");
  const [name, setName] = useState(
    initialPlayers?.[0]?.name ||
      (typeof readSaved("kinesa-nickname", "") === "string"
        ? readSaved("kinesa-nickname", "").slice(0, 20)
        : ""),
  );
  const [names, setNames] = useState(
    initialPlayers?.map((p) => p.name) || ["You", "Friend 1"],
  );
  const [code, setCode] = useState("");
  const [roomCode, setRoomCode] = useState(newCode);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [filled, setFilled] = useState(1);
  const [prepared, setPrepared] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dealDone, setDealDone] = useState(false);
  const queueTimer = useRef(null);
  const copyTimer = useRef(null);
  const titleRef = useRef(null);
  const playerInputs = useRef([]);
  const pendingFocus = useRef(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const input = playerInputs.current[pendingFocus.current];
    input?.focus();
    input?.select();
    pendingFocus.current = null;
  }, [names.length]);
  useEffect(
    () => () => {
      clearTimeout(queueTimer.current);
      clearTimeout(copyTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (stage !== "reveal") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealTimer = setTimeout(() => setRevealed(true), reduced ? 0 : 250);
    const readyTimer = setTimeout(() => setDealDone(true), reduced ? 0 : 1550);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(readyTimer);
    };
  }, [stage]);
  const prepare = (players) => {
    setPrepared(createGame(players));
    setRevealed(false);
    setDealDone(false);
    setStage("reveal");
  };
  const findMatch = () => {
    saveLocal("kinesa-nickname", name.trim());
    const players = [
      { name: name.trim() || "You" },
      ...sampleNames.map((name) => ({ name, isBot: true })),
    ];
    setStage("matching");
    setFilled(1);
    const fill = (n) => {
      setFilled(n);
      if (n < 4) queueTimer.current = setTimeout(() => fill(n + 1), 650);
      else queueTimer.current = setTimeout(() => prepare(players), 600);
    };
    queueTimer.current = setTimeout(() => fill(2), 650);
  };
  const createRoom = () => {
    saveLocal("kinesa-nickname", name.trim());
    const updated = [name.trim() || "You", ...names.slice(1)];
    setNames(updated);
    saveLocal("kinesa-room-preview", { code: roomCode, names: updated });
    setStage("room");
  };
  const joinRoom = () => {
    const saved = savedRoom();
    if (saved?.code === code.toUpperCase()) {
      if (saved.names.length === 4) {
        setError(
          "This room already has four players. Create a room for your own group, or try AMEN24.",
        );
        return;
      }
      const base = saved.names;
      const joinedPlayers = [...base, name.trim() || "You"];
      setNames(joinedPlayers);
      setRoomCode(saved.code);
      saveLocal("kinesa-room-preview", {
        code: saved.code,
        names: joinedPlayers,
      });
      saveLocal("kinesa-nickname", name.trim());
      setError("");
      setStage("room");
    } else if (code.toUpperCase() === "AMEN24") {
      setNames([name.trim() || "You", "Mina", "Mariam"]);
      setRoomCode("AMEN24");
      saveLocal("kinesa-nickname", name.trim());
      setError("");
      setStage("room");
    } else {
      setError("Try AMEN24, or a room code created in this browser.");
    }
  };
  const updateName = (i, value) => {
    setNames((previous) => {
      const next = previous.map((n, j) => (i === j ? value : n));
      saveLocal("kinesa-room-preview", { code: roomCode, names: next });
      return next;
    });
  };
  const addFriend = () => {
    if (names.length >= 4) return;
    pendingFocus.current = names.length;
    setNames((previous) => {
      const next = [...previous, `Friend ${previous.length}`];
      saveLocal("kinesa-room-preview", { code: roomCode, names: next });
      return next;
    });
    setAnnouncement(`Player ${names.length + 1} added. Enter their name.`);
  };
  const removeFriend = (index) => {
    pendingFocus.current = Math.max(0, index - 1);
    setNames((previous) => {
      const next = previous.filter((_, i) => i !== index);
      saveLocal("kinesa-room-preview", { code: roomCode, names: next });
      return next;
    });
    setAnnouncement(
      `Player ${index + 1} removed. ${names.length - 1} players in your room.`,
    );
  };
  const copy = async () => {
    clearTimeout(copyTimer.current);
    setError("");
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setAnnouncement(`Room code ${roomCode} copied.`);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setAnnouncement(
        `Your room code is ${roomCode}. Select the code above to copy it.`,
      );
      setError(
        `Your room code is ${roomCode}. Select the code above to copy it.`,
      );
    }
  };
  const editSetup = () => {
    setPrepared(null);
    setRevealed(false);
    setDealDone(false);
    setStage(mode === "friends" ? "room" : "entry");
  };
  const setupStep = stage === "reveal" ? 1 : 0;
  const cancel = () => {
    clearTimeout(queueTimer.current);
    onBack();
  };
  return (
    <div className={`lobby-page lobby-${mode} lobby-stage-${stage}`}>
      <span className="lobby-sr-status" role="status">
        {announcement}
      </span>
      <div className="lobby-toolbar">
        <button className="text-button" onClick={cancel}>
          <ArrowLeft size={18} /> Back to play
        </button>
      </div>
      <nav className="setup-progress" aria-label="Game setup progress">
        <ol>
          {["Set up", "Meet your companions", "Play"].map((label, i) => (
            <li
              key={label}
              className={
                i === setupStep
                  ? "is-current"
                  : i < setupStep
                    ? "is-complete"
                    : ""
              }
              aria-current={i === setupStep ? "step" : undefined}
            >
              <span className="setup-step-number">
                {i < setupStep ? <Check size={13} /> : i + 1}
              </span>
              <span>{label}</span>
              {i < 2 && <ChevronRight size={14} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>
      <div className="lobby-workspace">
        <div className="lobby-main">
          <div className="lobby-heading">
            <h1 ref={titleRef} tabIndex={-1}>
              {stage === "matching"
                ? "Getting the gang together…"
                : stage === "reveal"
                  ? "Meet your match."
                  : stage === "room"
                    ? "The room is yours."
                    : mode === "random"
                      ? "One spin. New rivals."
                      : "Bring the whole crew."}
            </h1>
            <p>
              {stage === "reveal"
                ? "Randomly dealt. One per player."
                : stage === "matching"
                  ? "Finding your practice bots…"
                  : stage === "room"
                    ? "Add your players, then deal."
                    : mode === "random"
                      ? "Practice with three bots."
                      : "Play together on this device."}
            </p>
            {stage === "entry" && (
              <div className="lobby-format-summary">
                <span>
                  <Users size={13} />
                  {mode === "friends" ? "2–4 players" : "You + 3 bots"}
                </span>
                <span>
                  <Clock3 size={13} />3 rounds each
                </span>
                {mode === "friends" && <span>One device</span>}
              </div>
            )}
          </div>
          {stage === "entry" && (
            <section className="lobby-entry-panel">
              <div className="lobby-mode-emblem">
                {mode === "random" ? <Globe2 size={44} /> : <Users size={44} />}
                <span>✦</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mode === "random") findMatch();
                  else if (tab === "create") createRoom();
                  else joinRoom();
                }}
              >
                <label className="field-label" htmlFor="nickname">
                  What should we call you?
                </label>
                <input
                  id="nickname"
                  className="nickname-input"
                  placeholder="Your name"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                />

                {mode === "friends" && (
                  <>
                    <div
                      className="room-tabs"
                      role="group"
                      aria-label="Room action"
                    >
                      <button
                        type="button"
                        className={tab === "create" ? "selected" : ""}
                        aria-pressed={tab === "create"}
                        onClick={() => {
                          setTab("create");
                          setError("");
                        }}
                      >
                        Create a room
                      </button>
                      <button
                        type="button"
                        className={tab === "join" ? "selected" : ""}
                        aria-pressed={tab === "join"}
                        onClick={() => {
                          setTab("join");
                          setError("");
                        }}
                      >
                        Join a room
                      </button>
                    </div>
                    {tab === "join" && (
                      <div className="join-fields">
                        <label className="field-label" htmlFor="room-code">
                          Room code
                        </label>
                        <input
                          id="room-code"
                          className="nickname-input code-input"
                          value={code}
                          onChange={(e) => {
                            setError("");
                            setCode(
                              e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, ""),
                            );
                          }}
                          maxLength={6}
                          placeholder="AMEN24"
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          aria-invalid={Boolean(error)}
                          aria-describedby={
                            error
                              ? "room-code-error room-code-hint"
                              : "room-code-hint"
                          }
                          required
                        />
                        <p id="room-code-hint">
                          Try the sample room{" "}
                          <button
                            type="button"
                            onClick={() => setCode("AMEN24")}
                          >
                            AMEN24
                          </button>
                          .
                        </p>
                      </div>
                    )}
                  </>
                )}
                {error && (
                  <p className="form-error" id="room-code-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary-button full" type="submit">
                  {mode === "random"
                    ? "Find a game"
                    : tab === "create"
                      ? "Create room"
                      : "Join room"}
                  <ArrowRight size={20} />
                </button>
              </form>
              {mode === "friends" && recentRoom && !initialPlayers && (
                <button
                  className="resume-room"
                  onClick={() => {
                    setNames(recentRoom.names);
                    setRoomCode(recentRoom.code);
                    setName(recentRoom.names[0]);
                    setError("");
                    setStage("room");
                  }}
                >
                  <span>
                    <strong>Continue your room</strong>
                    <small>
                      {recentRoom.code} · {recentRoom.names.length} players ·
                      saved on this device
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
            </section>
          )}
          {stage === "matching" && (
            <section className="matching-panel">
              <div className="match-deck-art" aria-hidden="true">
                <i />
                <i />
                <span>
                  <Shuffle size={35} />
                </span>
              </div>
              <div
                className="match-readiness"
                role="progressbar"
                aria-label="Practice match seats filled"
                aria-valuenow={filled}
                aria-valuemin={0}
                aria-valuemax={4}
              >
                {[0, 1, 2, 3].map((i) => (
                  <i key={i} className={i < filled ? "is-filled" : ""} />
                ))}
              </div>
              <p className="match-count" role="status">
                {filled} / 4 seats filled
              </p>
              <div className="matching-seats">
                {[name || "You", ...sampleNames].map((n, i) => (
                  <div
                    className={i < filled ? "filled" : ""}
                    key={i}
                    style={{ "--seat-color": seatColors[i] }}
                  >
                    <span className="matching-seat-avatar" aria-hidden="true">
                      {i < filled ? (
                        initials(n)
                      ) : (
                        <span className="seat-loading">
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                      {i < filled && <CircleCheck size={20} />}
                    </span>
                    <strong>{i < filled ? n : "Getting ready"}</strong>
                    <small>
                      {i === 0 ? "YOU" : i < filled ? "PRACTICE BOT" : "•••"}
                    </small>
                  </div>
                ))}
              </div>
              <p className="matching-promise">
                <LockKeyhole size={14} /> Practice match · No online players
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  clearTimeout(queueTimer.current);
                  setStage("entry");
                }}
              >
                Cancel matchmaking
              </button>
            </section>
          )}
          {stage === "room" && (
            <section className="room-panel">
              <div className="room-code-strip">
                <div>
                  <span>ROOM CODE</span>
                  <strong>{roomCode}</strong>
                </div>
                <button className="secondary-button" onClick={copy}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}{" "}
                  {copied ? "Copied!" : "Copy code"}
                </button>
              </div>
              <p className="room-preview-note">
                Codes work in this browser only.
              </p>
              <div className="room-players-heading">
                <h2>Your players</h2>
                <span className="room-occupancy">
                  <span aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <i
                        key={i}
                        className={i < names.length ? "occupied" : ""}
                      />
                    ))}
                  </span>
                  {names.length} of 4 seats
                </span>
              </div>

              <div className="friend-seats">
                {names.map((n, i) => (
                  <div
                    className="friend-seat"
                    key={i}
                    style={{ "--seat-color": seatColors[i] }}
                  >
                    <span className="mystery-avatar" aria-hidden="true">
                      {initials(n)}
                    </span>
                    <label>
                      <span>{i === 0 ? "HOST" : `PLAYER ${i + 1}`}</span>
                      <input
                        value={n}
                        ref={(element) => {
                          playerInputs.current[i] = element;
                        }}
                        maxLength={20}
                        aria-label={`Player ${i + 1} name`}
                        onChange={(e) => updateName(i, e.target.value)}
                        onBlur={(e) => {
                          if (!e.target.value.trim())
                            updateName(i, i === 0 ? "You" : `Friend ${i}`);
                        }}
                      />
                    </label>
                    {i > 1 ? (
                      <button
                        className="icon-button"
                        aria-label={`Remove player ${i + 1}`}
                        onClick={() => removeFriend(i)}
                      >
                        <X size={18} />
                      </button>
                    ) : (
                      <span
                        className="seat-ready"
                        role="img"
                        aria-label="Ready"
                      >
                        <Check size={17} />
                      </span>
                    )}
                  </div>
                ))}
                {names.length < 4 && (
                  <button className="add-friend" onClick={addFriend}>
                    <Plus size={22} /> Add a friend{" "}
                  </button>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary-button full"
                onClick={() => prepare(names.map((name) => ({ name })))}
              >
                Deal our companions <Shuffle size={20} />
              </button>
            </section>
          )}
          {stage === "reveal" && prepared && (
            <section className="assignment-stage">
              <div
                className="assignment-grid"
                data-player-count={prepared.players.length}
                style={{ "--player-count": prepared.players.length }}
              >
                {prepared.players.map((p, i) => {
                  const m = MASCOTS.find((m) => m.kind === p.kind);
                  return (
                    <div
                      className={`assignment-slot ${revealed ? "is-revealed" : ""}`}
                      key={i}
                      style={{
                        "--slot-color": m.bg,
                        "--delay": `${i * 150}ms`,
                      }}
                      data-companion={p.kind}
                    >
                      <div className="assignment-card">
                        <div className="assignment-back" aria-hidden="true">
                          <Shuffle size={40} />
                          <span>WHO WILL IT BE?</span>
                          <strong>?</strong>
                        </div>
                        <div
                          className="assignment-front"
                          aria-hidden={!revealed}
                        >
                          <span className="assigned-player" title={p.name}>
                            <span className="assigned-player-name">
                              {p.name}
                            </span>
                            {p.isBot && <small>BOT</small>}
                          </span>
                          <div className="assignment-art" aria-hidden="true">
                            <Mascot
                              kind={p.kind}
                              mood="celebrate"
                              softSurface={false}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="assignment-identity">
                            <h2>{m.name}</h2>
                            <span className="gospel-label">{m.gospel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="assignment-ready-message" role="status">
                {dealDone ? "Ready to play" : "Dealing your companions…"}
              </p>
              <div className="assignment-actions">
                <button className="secondary-button" onClick={editSetup}>
                  {mode === "friends" ? "Edit players" : "Back to setup"}
                </button>
                <button
                  className="primary-button"
                  disabled={!dealDone}
                  onClick={() => onBegin(prepared, mode)}
                >
                  Game on <ArrowRight size={22} />
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
