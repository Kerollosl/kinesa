import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The ring drains with a CSS animation (compositor-friendly, pauses with the
// match clock); the number reads the clock four times a second.
export default function QuestionTimer({ settings, clock, locked }) {
  const total = settings.seconds * 1000;
  const [left, setLeft] = useState(() => clock.msLeft());
  useEffect(() => {
    setLeft(clock.msLeft());
    if (!clock.running || locked) return;
    const timer = setInterval(() => setLeft(clock.msLeft()), 250);
    return () => clearInterval(timer);
  }, [clock.key, clock.running, locked]);
  if (!settings.timed)
    return (
      <span className="question-timer is-relaxed">
        <Coffee size={15} aria-hidden="true" /> No clock
      </span>
    );
  const seconds = Math.ceil(left / 1000);
  const urgent = seconds <= 5 && !locked;
  return (
    <span
      className={`question-timer ${urgent ? "is-urgent" : ""} ${locked ? "is-locked" : ""}`}
      role="timer"
      aria-label={locked ? "Answer locked in" : `${seconds} seconds left`}
    >
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle className="timer-track" cx="26" cy="26" r={RADIUS} />
        <circle
          key={clock.key}
          className="timer-fill"
          cx="26"
          cy="26"
          r={RADIUS}
          style={{
            strokeDasharray: CIRCUMFERENCE,
            "--circumference": CIRCUMFERENCE,
            animationDuration: `${total}ms`,
            animationDelay: `${-(total - clock.msLeft())}ms`,
            animationPlayState: clock.running && !locked ? "running" : "paused",
          }}
        />
      </svg>
      <span className="timer-number" aria-hidden="true">
        {seconds}
      </span>
    </span>
  );
}
