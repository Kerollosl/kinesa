import { Check } from "lucide-react";
import { categories } from "../../data.ts";
import { CategoryIcon } from "../Wheel.tsx";
import { METER_MAX } from "../../classic.ts";

// Six category medallions: dyed when won, an empty ring when not.
export function CategoryPips({
  won,
  size = "md",
  label = true,
}: {
  won: string[];
  size?: "xs" | "sm" | "md";
  label?: boolean;
}) {
  return (
    <ul
      className={`pips is-${size}`}
      aria-label={label ? `${won.length} of 6 categories won` : undefined}
      aria-hidden={label ? undefined : "true"}
    >
      {categories.map((c) => {
        const has = won.includes(c.id);
        return (
          <li
            key={c.id}
            className={has ? "is-won" : ""}
            style={{ "--pip": c.color, "--pip-ink": c.ink }}
            title={c.name}
          >
            <CategoryIcon category={c} size="1em" aria-hidden="true" />
          </li>
        );
      })}
    </ul>
  );
}

// The pick meter: three right answers earn a pick.
export function Meter({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`meter is-${size} ${value >= METER_MAX ? "is-full" : ""}`}
      role="img"
      aria-label={`${value} of ${METER_MAX} toward a pick`}
    >
      {Array.from({ length: METER_MAX }, (_, i) => (
        <i key={i} className={i < value ? "is-on" : ""}>
          {i < value && <Check size="1em" strokeWidth={3.5} />}
        </i>
      ))}
    </span>
  );
}
