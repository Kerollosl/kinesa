import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Plus, X } from "lucide-react";
import { TIERS, readSaved } from "../engine.ts";
import { createClassic } from "../classic.ts";
import { loadPrefs, savePrefs } from "../prefs.ts";
import type { ClassicGame, MatchMode, Settings, Tier } from "../types.ts";

const LEGACY_ROOM_KEY = "kinesa-room-preview";

export type SegmentedOption<T extends string> = [
  id: T,
  text: string,
  sub?: string,
];

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (id: T) => void;
}) {
  return (
    <fieldset className="segmented">
      <legend>{label}</legend>
      <div className="segmented-row">
        {options.map(([id, text, sub]) => (
          <label key={id} className={value === id ? "is-on" : ""}>
            <input
              type="radio"
              name={label}
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <strong>{text}</strong>
            {sub && <small>{sub}</small>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export const LENGTH_OPTIONS: SegmentedOption<Settings["length"]>[] = [
  ["quick", "Quick", "Win 3"],
  ["full", "Full", "Win all 6"],
];
// Object.entries loses the key type; TIERS is keyed by Tier.
export const TIER_OPTIONS = (
  Object.entries(TIERS) as [Tier, (typeof TIERS)[Tier]][]
).map(([id, t]): SegmentedOption<Tier> => [
  id,
  t.label,
  t.seconds ? `${t.seconds}s` : "No clock",
]);

// Pass-and-play setup: names, length, level. Companions are dealt at random.
export default function Lobby({
  onBack,
  onBegin,
  initialPlayers,
}: {
  onBack: () => void;
  onBegin: (game: ClassicGame, mode: MatchMode) => void;
  initialPlayers?: { name: string }[] | null;
}) {
  const prefs = loadPrefs();
  const [names, setNames] = useState(() => {
    const first = readSaved("kinesa-nickname", "") || "";
    return initialPlayers && initialPlayers.length >= 2
      ? initialPlayers.map((p) => p.name)
      : [typeof first === "string" && first ? first.slice(0, 20) : "", ""];
  });
  const [length, setLength] = useState(prefs.settings.length);
  const [tier, setTier] = useState(prefs.settings.tier);
  const [status, setStatus] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const focusNext = useRef<number | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
    try {
      localStorage.removeItem(LEGACY_ROOM_KEY);
    } catch {
      /* Storage may be blocked; nothing to clean. */
    }
  }, []);
  useEffect(() => {
    if (focusNext.current === null) return;
    inputs.current[focusNext.current]?.focus();
    focusNext.current = null;
  }, [names.length]);
  const add = () => {
    if (names.length >= 4) return;
    focusNext.current = names.length;
    setNames((n) => [...n, ""]);
    setStatus(`Player ${names.length + 1} added.`);
  };
  const remove = (i: number) => {
    setNames((n) => n.filter((_, j) => j !== i));
    setStatus(`Player ${i + 1} removed.`);
  };
  const start = () => {
    const roster = names.map((n, i) => n.trim() || `Player ${i + 1}`);
    const settings = { ...prefs.settings, length, tier, timed: true };
    savePrefs({ name: names[0].trim() || prefs.name, settings });
    onBegin(
      createClassic(
        roster.map((name) => ({ name })),
        Math.random,
        { settings },
      ),
      "friends",
    );
  };
  return (
    <section className="lobby" aria-labelledby="lobby-title">
      <span className="sr-only" role="status">
        {status}
      </span>
      <header className="play-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <div className="play-top-main" />
        <span className="icon-btn-space" aria-hidden="true" />
      </header>
      <h1 id="lobby-title" ref={title} tabIndex={-1}>
        Who’s playing?
      </h1>
      <ol className="lobby-list">
        {names.map((n, i) => (
          <li key={i} className="lobby-row">
            <span className="lobby-num" aria-hidden="true">
              {i + 1}
            </span>
            <input
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={n}
              placeholder={`Player ${i + 1}`}
              maxLength={20}
              aria-label={`Player ${i + 1} name`}
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={i === names.length - 1 ? "done" : "next"}
              onChange={(e) =>
                setNames((all) =>
                  all.map((v, j) => (j === i ? e.target.value : v)),
                )
              }
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const next = inputs.current[i + 1];
                if (next) next.focus();
                else e.currentTarget.blur();
              }}
            />
            {i > 1 && (
              <button
                className="icon-btn is-small"
                onClick={() => remove(i)}
                aria-label={`Remove player ${i + 1}`}
              >
                <X size={20} />
              </button>
            )}
          </li>
        ))}
        {names.length < 4 && (
          <li>
            <button className="lobby-add" onClick={add}>
              <Plus size={22} aria-hidden="true" /> Add player
            </button>
          </li>
        )}
      </ol>
      <div className="lobby-options">
        <Segmented
          label="Game"
          value={length}
          options={LENGTH_OPTIONS}
          onChange={setLength}
        />
        <Segmented
          label="Level"
          value={tier}
          options={TIER_OPTIONS}
          onChange={setTier}
        />
      </div>
      <div className="play-actions">
        <button className="btn btn-go btn-xl btn-block" onClick={start}>
          <Play size={22} fill="currentColor" aria-hidden="true" /> Start
        </button>
      </div>
    </section>
  );
}
