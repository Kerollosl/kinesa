import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  LockKeyhole,
  Medal,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { categories } from "../data.js";
import { CategoryIcon } from "./Wheel.jsx";
import Mascot from "./Mascot.jsx";
import "./learning-experience.css";

export default function Collection({ stats, setModal, openLobby }) {
  const badges = categories.filter((c) => stats.badges.includes(c.id));
  const [selectedId, setSelectedId] = useState(null);
  const selected = categories.find((c) => c.id === selectedId);
  const detailRef = useRef(null);
  useEffect(() => {
    if (!selectedId) return;
    detailRef.current?.focus({ preventScroll: true });
    detailRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [selectedId]);
  const completed = badges.length === categories.length;
  const remaining = categories.length - badges.length;
  const next = categories.find((c) => !stats.badges.includes(c.id));

  return (
    <div className="le-page le-collection">
      <header className="le-intro">
        <div>
          <span className="le-kicker">YOUR COLLECTION</span>
          <h1>The trophy shelf.</h1>
          <p>
            Little discoveries, well earned. This is your progress on this
            device.
          </p>
        </div>
        <span className="le-intro-tag">
          <Medal size={15} /> {badges.length} of 6 badges earned
        </span>
      </header>

      <section
        className="le-collection-overview"
        aria-labelledby="collection-progress-heading"
      >
        <div className="le-collection-copy">
          <span className="le-kicker">THE SIX-CATEGORY COLLECTION</span>
          <h2 id="collection-progress-heading">
            {completed
              ? "You’ve explored every side."
              : badges.length
                ? `${remaining} more ${remaining === 1 ? "discovery" : "discoveries"} to go.`
                : "Your first badge starts with a little curiosity."}
          </h2>
          <p>
            {completed
              ? "All six categories, all yours. There’s always another question to get right."
              : "Answer a question correctly in a game to earn its category badge. Every new category adds to your shelf."}
          </p>
          <button
            className="le-solid-action"
            onClick={() => openLobby("random")}
          >
            {badges.length ? "Keep collecting" : "Play your first game"}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="le-collection-orbit">
          <svg
            className="le-progress-ring"
            viewBox="0 0 200 200"
            role="img"
            aria-label={`${badges.length} of 6 category badges earned`}
          >
            <circle className="le-ring-track" cx="100" cy="100" r="83" />
            <circle
              className="le-ring-fill"
              cx="100"
              cy="100"
              r="83"
              pathLength="100"
              strokeDasharray={`${(badges.length / 6) * 100} 100`}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <span className="le-ring-character" aria-hidden="true">
            <Mascot kind="lion" />
          </span>
          <span className="le-ring-count">
            <Medal size={14} /> {badges.length} / 6
          </span>
        </div>
      </section>

      <div className="le-stats-grid" aria-label="Your game statistics">
        {[
          [Trophy, stats.games, "Games completed"],
          [Zap, stats.correct, "Correct answers"],
          [Medal, `${badges.length} / 6`, "Category badges"],
        ].map(([Icon, value, label]) => (
          <div className="le-stat" key={label}>
            <span className="le-stat-icon">
              <Icon size={19} />
            </span>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <section
        className="le-shelf-section"
        aria-labelledby="badge-shelf-heading"
      >
        <div className="le-section-heading">
          <div>
            <h2 id="badge-shelf-heading">Your category badges</h2>
            <p>Tap a badge to take a closer look.</p>
          </div>
          <span>{badges.length} EARNED</span>
        </div>
        <div className="le-badge-grid">
          {categories.map((c) => {
            const earned = stats.badges.includes(c.id);
            return (
              <button
                data-glass
                className={`le-badge-card ${earned ? "le-badge-earned" : ""} ${selectedId === c.id ? "le-badge-selected" : ""}`}
                style={{ "--le-accent": c.color, "--le-pale": c.pale }}
                key={c.id}
                aria-pressed={selectedId === c.id}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="le-badge-medallion">
                  <CategoryIcon category={c} size={37} />
                  <span className="le-badge-status">
                    {earned ? <Check size={12} /> : <LockKeyhole size={11} />}
                  </span>
                </span>
                <h3>{c.name}</h3>
                <span className="le-badge-label">
                  {earned ? "In your collection" : "Ready to discover"}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="le-badge-detail"
          aria-live="polite"
          ref={detailRef}
          tabIndex={-1}
        >
          {selected ? (
            <>
              <span
                className="le-detail-icon"
                style={{
                  "--le-pale": selected.pale,
                  "--le-accent": selected.color,
                }}
              >
                <CategoryIcon category={selected} size={25} />
              </span>
              <div>
                <strong>
                  {selected.name}
                  {stats.badges.includes(selected.id) && (
                    <span className="le-earned-label">
                      <Check size={12} /> Earned
                    </span>
                  )}
                </strong>
                <p>
                  {stats.badges.includes(selected.id)
                    ? "A correct answer earned this badge. It stays in your collection as you keep playing."
                    : `Answer a question in ${selected.name} correctly during a game to add this badge to your collection.`}
                </p>
              </div>
              <button
                className="le-text-action"
                onClick={() =>
                  setModal({ type: "category", category: selected })
                }
              >
                Explore the category
                <ArrowUpRight size={16} />
              </button>
            </>
          ) : (
            <>
              <span className="le-detail-icon">
                <Sparkles size={24} />
              </span>
              <div>
                <strong>
                  {completed
                    ? "A full set. A lovely sight."
                    : badges.length
                      ? `Next up? ${next.name}.`
                      : "Make room for your first badge."}
                </strong>
                <p>
                  {completed
                    ? "Select any badge to revisit the category behind it."
                    : "Every correct answer counts. The wheel decides which category comes next."}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="le-local-note">
        <BookOpen size={15} />
        <p>
          Game results are saved in this browser. Discover’s practice questions
          are unscored and don’t add badges.
        </p>
      </div>
    </div>
  );
}
