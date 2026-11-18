import { forwardRef } from "react";
import { Check } from "lucide-react";
import { categories } from "../../data.js";
import { CategoryIcon } from "../Wheel.jsx";
import { CopticCross } from "../Ornaments.jsx";
import { PlayTop } from "./Parts.jsx";

// Earned a pick: choose a category, then answer one harder question to win it.
const Pick = forwardRef(function Pick({ game, onPick, onExit, onRules }, ref) {
  const player = game.players[game.turn];
  return (
    <section className="pick" aria-labelledby="pick-title">
      <PlayTop onExit={onExit} onRules={onRules} />
      <div className="pick-hero">
        <span className="pick-emblem" aria-hidden="true">
          <CopticCross size={44} />
        </span>
        <h1 id="pick-title" ref={ref} tabIndex={-1}>
          Pick a category
        </h1>
        <p>Get it right to win it.</p>
      </div>
      <div className="pick-grid">
        {categories.map((c) => {
          const has = player.won.includes(c.id);
          return (
            <button
              key={c.id}
              className={`pick-tile ${has ? "is-won" : ""}`}
              style={{ "--cat": c.color, "--cat-ink": c.ink }}
              disabled={has}
              onClick={() => onPick(c.id)}
              aria-label={has ? `${c.name}, already won` : c.name}
            >
              <span className="pick-icon" aria-hidden="true">
                <CategoryIcon category={c} size={30} />
              </span>
              <span className="pick-name">{c.name}</span>
              {has && (
                <span className="pick-check" aria-hidden="true">
                  <Check size={18} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});
export default Pick;
