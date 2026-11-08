import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { CategoryIcon } from "./Wheel.jsx";
import { categories } from "../data.js";
import { QUESTION_COUNTS, TIERS, normalizeSettings } from "../engine.js";
import { loadPrefs } from "../prefs.js";

const TIER_NOTES = {
  easy: "Gentler questions, no clock",
  medium: "20 seconds a question",
  hard: "15 seconds, sharper rivals",
};

function Choice({ name, value, checked, onChange, children, style }) {
  return (
    <label
      className={`sheet-choice ${checked ? "is-checked" : ""}`}
      style={style}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}

// Optional setup for practice play. "Play now" never requires it.
export default function PlaySheet({ onPlay }) {
  const prefs = loadPrefs();
  const [name, setName] = useState(prefs.name);
  const [settings, setSettings] = useState(prefs.settings);
  const update = (patch) =>
    setSettings((s) =>
      normalizeSettings({
        ...s,
        // Leaving Easy brings the clock back.
        ...(patch.tier && patch.tier !== "easy" && s.tier === "easy"
          ? { timed: true }
          : {}),
        ...patch,
      }),
    );
  return (
    <form
      className="play-sheet"
      onSubmit={(e) => {
        e.preventDefault();
        onPlay({ name, settings });
      }}
    >
      <h2 id="modal-title">Set up your round</h2>
      <label className="field-label" htmlFor="sheet-name">
        Your name
      </label>
      <input
        id="sheet-name"
        className="nickname-input"
        value={name}
        maxLength={20}
        placeholder="You"
        autoComplete="nickname"
        onChange={(e) => setName(e.target.value)}
      />
      <fieldset>
        <legend>Category</legend>
        <div className="sheet-chips">
          <Choice
            name="category"
            value="mix"
            checked={!settings.category}
            onChange={() => update({ category: null })}
            style={{ "--chip-color": "#4a2759" }}
          >
            <Sparkles size={16} aria-hidden="true" /> Mix
          </Choice>
          {categories.map((c) => (
            <Choice
              key={c.id}
              name="category"
              value={c.id}
              checked={settings.category === c.id}
              onChange={() => update({ category: c.id })}
              style={{ "--chip-color": c.color }}
            >
              <CategoryIcon category={c} size={16} aria-hidden="true" />{" "}
              {c.short}
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Difficulty</legend>
        <div className="sheet-segments">
          {Object.entries(TIERS).map(([id, tier]) => (
            <Choice
              key={id}
              name="tier"
              value={id}
              checked={settings.tier === id}
              onChange={() => update({ tier: id })}
            >
              <strong>{tier.label}</strong>
              <small>{TIER_NOTES[id]}</small>
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Questions</legend>
        <div className="sheet-segments is-compact">
          {QUESTION_COUNTS.map((n) => (
            <Choice
              key={n}
              name="questions"
              value={n}
              checked={settings.questions === n}
              onChange={() => update({ questions: n })}
            >
              <strong>{n}</strong>
            </Choice>
          ))}
        </div>
      </fieldset>
      <label
        className={`sheet-switch ${settings.tier === "easy" ? "is-disabled" : ""}`}
      >
        <input
          type="checkbox"
          role="switch"
          checked={settings.timed}
          disabled={settings.tier === "easy"}
          onChange={(e) => update({ timed: e.target.checked })}
        />
        <span>
          <strong>Countdown clock</strong>
          <small>
            {settings.tier === "easy"
              ? "Easy play is always untimed"
              : "Faster answers earn up to 50 bonus points"}
          </small>
        </span>
      </label>
      <button className="primary-button full" type="submit">
        <Play size={18} fill="currentColor" /> Play
      </button>
    </form>
  );
}
