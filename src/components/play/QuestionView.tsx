import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Check, Coffee, X } from "lucide-react";
import Mascot from "../Mascot.tsx";
import Companion from "../Companion.tsx";
import { CategoryIcon } from "../Wheel.tsx";
import { burst } from "../game/burst.ts";
import type {
  Category,
  ClassicPhase,
  CompanionKind,
  Phase,
  Player,
  Question,
  QuestionClock,
  Settings,
} from "../../types.ts";

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Countdown: a draining bar plus the seconds. The bar is a CSS animation that
// pauses with the match clock; the number reads the clock four times a second.
export function Timer({
  settings,
  clock,
  locked,
}: {
  settings: Settings;
  clock: QuestionClock;
  locked: boolean;
}) {
  const total = settings.seconds * 1000;
  const [left, setLeft] = useState(() => clock.msLeft());
  useEffect(() => {
    setLeft(clock.msLeft());
    if (!clock.running || locked) return;
    const t = setInterval(() => setLeft(clock.msLeft()), 250);
    return () => clearInterval(t);
  }, [clock.key, clock.running, locked]);
  if (!settings.timed)
    return (
      <span className="timer is-relaxed" title="No clock">
        <Coffee size={18} aria-hidden="true" />
        <span className="sr-only">No clock</span>
      </span>
    );
  const seconds = Math.ceil(left / 1000);
  return (
    <span
      className={`timer ${seconds <= 5 && !locked ? "is-urgent" : ""}`}
      role="timer"
      aria-label={locked ? "Answer locked in" : `${seconds} seconds left`}
    >
      <span className="timer-number" aria-hidden="true">
        {seconds}
      </span>
      <span className="timer-bar" aria-hidden="true">
        <i
          key={clock.key}
          style={{
            animationDuration: `${total}ms`,
            animationDelay: `${-(total - clock.msLeft())}ms`,
            animationPlayState: clock.running && !locked ? "running" : "paused",
          }}
        />
      </span>
    </span>
  );
}

const LETTERS = "ABCD";

// The question screen: the category's dye fills the screen, the question sits
// on a linen card, four big answers below. After the reveal only the right
// answer (and a wrong pick) stay, and the reveal sheet rises underneath.
export default function QuestionView({
  question,
  category,
  label,
  top,
  timer,
  phase,
  choice = null,
  hidden = [],
  disabled = false,
  avatarKind = null,
  pickers = () => [],
  onAnswer,
  footer = null,
  sheet = null,
  celebrate = false,
}: {
  question: Question;
  category: Category;
  label?: string | null;
  top: ReactNode;
  timer: ReactNode;
  phase: Phase | ClassicPhase;
  choice?: number | null;
  hidden?: number[];
  disabled?: boolean;
  avatarKind?: CompanionKind | null;
  pickers?: (i: number) => Player[];
  onAnswer: (i: number) => void;
  footer?: ReactNode;
  sheet?: ReactNode;
  celebrate?: boolean;
}) {
  const revealed = phase === "reveal";
  const heading = useRef<HTMLHeadingElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!revealed) heading.current?.focus({ preventScroll: true });
  }, [question.id, revealed]);
  useEffect(() => {
    if (revealed && celebrate && !reduced())
      burst(options.current[question.correct], [
        "#ffffff",
        "#ecc965",
        category.color,
        "#2c6a4d",
      ]);
  }, [revealed]);
  // A–D or 1–4 answers from the keyboard.
  useEffect(() => {
    if (revealed || disabled) return;
    const key = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        document.querySelector('[role="dialog"]') ||
        (e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select,[contenteditable='true']"))
      )
        return;
      const k = e.key.toLowerCase();
      const i = "1234".includes(k) ? "1234".indexOf(k) : "abcd".indexOf(k);
      if (i < 0 || hidden.includes(i)) return;
      e.preventDefault();
      onAnswer(i);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [revealed, disabled, hidden.join(), onAnswer]);
  return (
    <section
      className={`qv ${revealed ? "is-revealed" : ""} ${choice !== null && !revealed ? "is-locked" : ""}`}
      style={{
        "--cat": category.color,
        "--cat-ink": category.ink,
        "--cat-pale": category.pale,
      }}
      data-phase={phase}
    >
      <header className="qv-top">
        <div className="qv-top-main">{top}</div>
        {timer}
      </header>
      <div className="qv-body">
        <p className="qv-label">
          <span className="qv-label-icon" aria-hidden="true">
            <CategoryIcon category={category} size={18} />
          </span>
          {label || category.name}
        </p>
        <div className="qv-card">
          {avatarKind && (
            <span className="qv-avatar" aria-hidden="true">
              <Mascot kind={avatarKind} portrait />
            </span>
          )}
          <h1 ref={heading} tabIndex={-1}>
            {question.text}
          </h1>
        </div>
        <div className="qv-answers">
          {question.answers.map((text, i) => {
            const mine = choice === i;
            const right = revealed && i === question.correct;
            const wrong = revealed && mine && !right;
            const gone = hidden.includes(i);
            const who = revealed ? pickers(i) : [];
            const state = right
              ? "is-correct"
              : wrong
                ? "is-wrong"
                : revealed
                  ? "is-out"
                  : gone
                    ? "is-hidden"
                    : mine
                      ? "is-picked"
                      : "";
            return (
              <button
                key={i}
                ref={(el) => {
                  options.current[i] = el;
                }}
                className={`answer ${state}`}
                style={{ "--i": i }}
                disabled={revealed || disabled || gone || choice !== null}
                aria-hidden={gone && !revealed ? "true" : undefined}
                aria-label={`${LETTERS[i]}. ${text}${right ? ". Correct answer" : wrong ? ". Your answer, wrong" : mine ? ". Locked in" : ""}`}
                onClick={() => onAnswer(i)}
              >
                <span className="answer-letter" aria-hidden="true">
                  {LETTERS[i]}
                </span>
                <span className="answer-text">{text}</span>
                {who.length > 0 && (
                  <span className="answer-pickers" aria-hidden="true">
                    {who.map((p) => (
                      <span key={p.kind} title={p.name}>
                        <Mascot kind={p.kind} portrait />
                      </span>
                    ))}
                  </span>
                )}
                {right && (
                  <Check
                    size={24}
                    strokeWidth={3}
                    className="answer-mark"
                    aria-hidden="true"
                  />
                )}
                {wrong && (
                  <X
                    size={24}
                    strokeWidth={3}
                    className="answer-mark"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
        {!revealed && footer}
        {revealed && sheet}
      </div>
    </section>
  );
}

// What happened, why, and the one next step.
export const RevealSheet = forwardRef<
  HTMLDivElement,
  {
    tone: "good" | "bad";
    title: string;
    note?: string | null;
    badge?: ReactNode;
    kind?: CompanionKind | null;
    question: Question;
    action: string;
    onAction: () => void;
    actionIcon?: ReactNode;
  }
>(function RevealSheet(
  {
    tone,
    title,
    note,
    badge = null,
    kind,
    question,
    action,
    onAction,
    actionIcon = <ArrowRight size={22} aria-hidden="true" />,
  },
  ref,
) {
  useEffect(() => {
    if (ref && typeof ref !== "function")
      ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className={`sheet is-${tone}`} role="status" ref={ref} tabIndex={-1}>
      <div className="sheet-head">
        {kind && (
          <span className="sheet-avatar" aria-hidden="true">
            <Companion
              kind={kind}
              act={tone === "good" ? "cheer" : "sad"}
              softSurface={false}
            />
          </span>
        )}
        <div className="sheet-title">
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {badge}
      </div>
      <div className="sheet-fact">
        <p>{question.explanation}</p>
        <p className="sheet-source">
          <BookOpen size={14} aria-hidden="true" />
          <span className="sr-only">Source: </span>
          {question.source}
        </p>
      </div>
      <button className="btn btn-go btn-block" onClick={onAction}>
        {action}
        {actionIcon}
      </button>
    </div>
  );
});
