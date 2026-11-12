import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Shuffle, X } from "lucide-react";
import Mascot, { MASCOTS } from "./Mascot.jsx";
import { createGame, readSaved, saveLocal } from "../engine.js";

const initials = (value) =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("") || "?";
const nickname = () => {
  const saved = readSaved("kinesa-nickname", "");
  return typeof saved === "string" ? saved.slice(0, 20) : "";
};
// Pass-and-play setup: two to four players share this phone. Names are the
// only setup; there are no rooms or codes because play is local to the device.
const LEGACY_ROOM_KEY = "kinesa-room-preview";
export default function Lobby({ onBack, onBegin, initialPlayers }) {
  const [stage, setStage] = useState("room");
  const [names, setNames] = useState(
    initialPlayers?.map((p) => p.name) || [nickname() || "You", "Friend 1"],
  );
  const [announcement, setAnnouncement] = useState("");
  const [prepared, setPrepared] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [dealDone, setDealDone] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const titleRef = useRef(null);
  const playerInputs = useRef([]);
  const pendingFocus = useRef(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    // The old local "room preview" is gone; drop what it saved.
    try {
      localStorage.removeItem(LEGACY_ROOM_KEY);
    } catch {
      /* Storage may be blocked; nothing to clean. */
    }
  }, []);
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
  const prepare = () => {
    const roster = names.map(
      (n, i) => n.trim() || (i === 0 ? "You" : `Friend ${i}`),
    );
    saveLocal("kinesa-nickname", roster[0]);
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
  const updateName = (i, value) => {
    setNames((previous) => previous.map((n, j) => (i === j ? value : n)));
  };
  const addFriend = () => {
    if (names.length >= 4) return;
    pendingFocus.current = names.length;
    setJustAdded(names.length);
    setNames((previous) => [...previous, `Friend ${previous.length}`]);
    setAnnouncement(`Player ${names.length + 1} added. Enter their name.`);
  };
  const removeFriend = (index) => {
    pendingFocus.current = Math.max(0, index - 1);
    setJustAdded(null);
    setNames((previous) => previous.filter((_, i) => i !== index));
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
      <div className="lobby-top">
        <button
          className="lobby-back"
          onClick={onBack}
          aria-label="Back to play"
          title="Back to play"
        >
          <ArrowLeft size={22} />
        </button>
        <nav className="setup-dots" aria-label="Game setup progress">
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
                <span className="sr-only">{label}</span>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="lobby-workspace">
        <div className="lobby-main">
          <div className="lobby-heading">
            <h1 ref={titleRef} tabIndex={-1}>
              {stage === "reveal" ? "Meet your match." : "Who’s playing?"}
            </h1>
          </div>
          {stage === "room" && (
            <section className="seat-stage" aria-label="Players">
              <ul
                className="seat-list"
                aria-label={`${names.length} of 4 players`}
              >
                {names.map((n, i) => (
                  <li
                    className={`seat ${justAdded === i ? "is-new" : ""}`}
                    key={i}
                  >
                    <span className="seat-initial" aria-hidden="true">
                      {initials(n)}
                    </span>
                    <input
                      value={n}
                      ref={(element) => {
                        playerInputs.current[i] = element;
                      }}
                      maxLength={20}
                      enterKeyHint={i === names.length - 1 ? "done" : "next"}
                      autoComplete="off"
                      autoCapitalize="words"
                      autoCorrect="off"
                      spellCheck={false}
                      onFocus={(e) => {
                        const input = e.currentTarget;
                        // Wait for the keyboard, then keep the row in view.
                        setTimeout(
                          () => input.scrollIntoView({ block: "center" }),
                          320,
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const next = playerInputs.current[i + 1];
                        if (next) {
                          next.focus();
                          next.select();
                        } else e.currentTarget.blur();
                      }}
                      aria-label={`Player ${i + 1} name`}
                      onChange={(e) => updateName(i, e.target.value)}
                      onBlur={(e) => {
                        if (!e.target.value.trim())
                          updateName(i, i === 0 ? "You" : `Friend ${i}`);
                      }}
                    />
                    {i > 1 ? (
                      <button
                        className="seat-trailing"
                        aria-label={`Remove player ${i + 1}`}
                        onClick={() => removeFriend(i)}
                      >
                        <X size={18} />
                      </button>
                    ) : (
                      <span
                        className="seat-trailing is-ready"
                        role="img"
                        aria-label="Ready"
                      >
                        <Check size={17} />
                      </span>
                    )}
                  </li>
                ))}
                {names.length < 4 && (
                  <li>
                    <button className="seat-add" onClick={addFriend}>
                      <Plus size={22} /> Add a friend
                    </button>
                  </li>
                )}
              </ul>
              <div className="action-bar">
                <div className="action-bar-row">
                  <button className="primary-button" onClick={prepare}>
                    Deal our companions <Shuffle size={20} />
                  </button>
                </div>
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
              <div className="action-bar">
                <div className="action-bar-row assignment-actions">
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
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
