import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  KeyRound,
  Plus,
  Shuffle,
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
const nickname = () => {
  const saved = readSaved("kinesa-nickname", "");
  return typeof saved === "string" ? saved.slice(0, 20) : "";
};
// Pass-and-play setup: the roster is the first screen. A saved or sample
// room code stays available under "Join a room" for the local preview.
export default function Lobby({ onBack, onBegin, initialPlayers }) {
  const [recentRoom] = useState(savedRoom);
  const [stage, setStage] = useState("room");
  const [joining, setJoining] = useState(false);
  const [names, setNames] = useState(
    initialPlayers?.map((p) => p.name) || [nickname() || "You", "Friend 1"],
  );
  const [code, setCode] = useState("");
  const [roomCode, setRoomCode] = useState(newCode);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [prepared, setPrepared] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dealDone, setDealDone] = useState(false);
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
  const remember = (next, codeValue = roomCode) =>
    saveLocal("kinesa-room-preview", { code: codeValue, names: next });
  const prepare = () => {
    const roster = names.map(
      (n, i) => n.trim() || (i === 0 ? "You" : `Friend ${i}`),
    );
    saveLocal("kinesa-nickname", roster[0]);
    remember(roster);
    setPrepared(
      createGame(
        roster.map((name) => ({ name })),
        Math.random,
        { structure: "turns" },
      ),
    );
    setRevealed(false);
    setDealDone(false);
    setStage("reveal");
  };
  const joinRoom = () => {
    const saved = savedRoom();
    const host = names[0]?.trim() || "You";
    if (saved?.code === code) {
      if (saved.names.length === 4) {
        setError(
          "This room already has four players. Start your own group, or try AMEN24.",
        );
        return;
      }
      const joined = [...saved.names, host];
      setNames(joined);
      setRoomCode(saved.code);
      remember(joined, saved.code);
    } else if (code === "AMEN24") {
      setNames([host, "Mina", "Mariam"]);
      setRoomCode("AMEN24");
    } else {
      setError("Try AMEN24, or a room code created in this browser.");
      return;
    }
    setError("");
    setJoining(false);
    setAnnouncement("Room joined. Check the players, then deal.");
  };
  const updateName = (i, value) => {
    setNames((previous) => {
      const next = previous.map((n, j) => (i === j ? value : n));
      remember(next);
      return next;
    });
  };
  const addFriend = () => {
    if (names.length >= 4) return;
    pendingFocus.current = names.length;
    setNames((previous) => {
      const next = [...previous, `Friend ${previous.length}`];
      remember(next);
      return next;
    });
    setAnnouncement(`Player ${names.length + 1} added. Enter their name.`);
  };
  const removeFriend = (index) => {
    pendingFocus.current = Math.max(0, index - 1);
    setNames((previous) => {
      const next = previous.filter((_, i) => i !== index);
      remember(next);
      return next;
    });
    setAnnouncement(
      `Player ${index + 1} removed. ${names.length - 1} players in your group.`,
    );
  };
  const editSetup = () => {
    setPrepared(null);
    setRevealed(false);
    setDealDone(false);
    setStage("room");
  };
  const setupStep = stage === "reveal" ? 1 : 0;
  return (
    <div className={`lobby-page lobby-friends lobby-stage-${stage}`}>
      <span className="lobby-sr-status" role="status">
        {announcement}
      </span>
      <div className="lobby-toolbar">
        <button className="text-button" onClick={onBack}>
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
              {stage === "reveal" ? "Meet your match." : "Who’s playing?"}
            </h1>
            <p>
              {stage === "reveal"
                ? "Randomly dealt. One per player."
                : "Two to four players take turns on this phone, three rounds each."}
            </p>
          </div>
          {stage === "room" && (
            <section className="room-panel">
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
                  <div className="friend-seat" key={i}>
                    <span className="mystery-avatar" aria-hidden="true">
                      {initials(n)}
                    </span>
                    <label>
                      <span>{i === 0 ? "YOU" : `PLAYER ${i + 1}`}</span>
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
                    <Plus size={22} /> Add a friend
                  </button>
                )}
              </div>
              <button className="primary-button full" onClick={prepare}>
                Deal our companions <Shuffle size={20} />
              </button>
              <div className="room-extras">
                {recentRoom && !initialPlayers && (
                  <button
                    className="resume-room"
                    onClick={() => {
                      setNames(recentRoom.names);
                      setRoomCode(recentRoom.code);
                      setError("");
                      setAnnouncement("Your saved group is back.");
                    }}
                  >
                    <span>
                      <strong>Continue your room</strong>
                      <small>
                        {recentRoom.names.length} players · saved on this device
                      </small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                )}
                <button
                  className="text-button join-toggle"
                  aria-expanded={joining}
                  aria-controls="join-room"
                  onClick={() => {
                    setJoining((v) => !v);
                    setError("");
                  }}
                >
                  <KeyRound size={16} /> Join a room
                </button>
                {joining && (
                  <form
                    id="join-room"
                    className="join-fields"
                    onSubmit={(e) => {
                      e.preventDefault();
                      joinRoom();
                    }}
                  >
                    <label className="field-label" htmlFor="room-code">
                      Room code
                    </label>
                    <div className="join-row">
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
                      <button className="secondary-button" type="submit">
                        Join room
                      </button>
                    </div>
                    <p id="room-code-hint">
                      Room codes are a local preview. Try the sample room{" "}
                      <button type="button" onClick={() => setCode("AMEN24")}>
                        AMEN24
                      </button>
                      .
                    </p>
                  </form>
                )}
                {error && (
                  <p className="form-error" id="room-code-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
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
                  Edit players
                </button>
                <button
                  className="primary-button"
                  disabled={!dealDone}
                  onClick={() => onBegin(prepared, "friends")}
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
