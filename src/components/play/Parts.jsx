import { ArrowLeft, HelpCircle } from "lucide-react";
import Mascot from "../Mascot.jsx";

// Top row of every play screen: back, a centre slot, rules.
export function PlayTop({ onExit, onRules, children, tone = "dark" }) {
  return (
    <header className={`play-top is-${tone}`}>
      <button
        className="icon-btn"
        onClick={onExit}
        aria-label="Leave game"
        title="Leave game (it’s saved)"
      >
        <ArrowLeft size={24} />
      </button>
      <div className="play-top-main">{children}</div>
      {onRules ? (
        <button className="icon-btn" onClick={onRules} aria-label="How to play">
          <HelpCircle size={24} />
        </button>
      ) : (
        <span className="icon-btn-space" aria-hidden="true" />
      )}
    </header>
  );
}

export function Avatar({ kind, size = "md", ring = false }) {
  return (
    <span
      className={`avatar is-${size} avatar-${kind} ${ring ? "has-ring" : ""}`}
      aria-hidden="true"
    >
      <Mascot kind={kind} portrait />
    </span>
  );
}

export const BotTag = () => <small className="bot-tag">BOT</small>;
