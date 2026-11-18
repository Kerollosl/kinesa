import { categories } from "../data.js";
import { BookOpen, Church, Sparkles, Cross, Sun, Leaf } from "lucide-react";
import { CopticCross, InterlaceRing } from "./Ornaments.jsx";
import { PICK } from "../classic.js";

export const ICONS = {
  book: BookOpen,
  church: Church,
  sparkles: Sparkles,
  cross: Cross,
  sun: Sun,
  leaf: Leaf,
};
export function CategoryIcon({ category, size = 24, ...props }) {
  // Church Traditions uses the Coptic cross, never a generic plus.
  if (category.icon === "cross")
    return <CopticCross size={size} eye={false} {...props} />;
  const Icon = ICONS[category.icon];
  return <Icon size={size} strokeWidth={2} {...props} />;
}

// The cross panel on the classic wheel: undyed linen with a purple cross.
export const PICK_SEGMENT = {
  id: PICK,
  name: "Your pick",
  color: "#fbf9f4",
  ink: "#3d1f4a",
};
export const CLASSIC_SEGMENTS = [...categories, PICK_SEGMENT];

// Rotation that brings segment `index` of `count` under the top pointer,
// after at least `turns` full turns from `from`.
export function rotationFor(from, index, count, turns = 3) {
  const seg = 360 / count;
  const target = (360 - (index * seg + seg / 2)) % 360;
  return from + (360 - (from % 360)) + turns * 360 + target;
}

const point = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [160 + r * Math.cos(a), 160 + r * Math.sin(a)];
};

// A woven roundel: dyed panels inside an interlace border, the Coptic cross at the hub.
export default function Wheel({
  segments = categories,
  rotation = 0,
  spinning = false,
  landed = null,
  onSpin = null,
  disabled = false,
  size,
}) {
  const interactive = typeof onSpin === "function";
  const seg = 360 / segments.length;
  const press = (e) => {
    if (!interactive || disabled) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onSpin();
  };
  const control = interactive
    ? {
        role: "button",
        tabIndex: disabled ? -1 : 0,
        "aria-label": "Spin the wheel",
        "aria-disabled": disabled || undefined,
        onClick: press,
        onKeyDown: press,
      }
    : { role: "img", "aria-label": "Category wheel" };
  return (
    <div
      className={`wheel ${interactive && !disabled ? "is-tappable" : ""} ${spinning ? "is-spinning" : ""} ${landed !== null ? "has-landed" : ""}`}
      style={size ? { "--wheel-size": size } : undefined}
      {...control}
    >
      <span className="wheel-pointer" aria-hidden="true" />
      <div
        className="wheel-disc"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 320 320" aria-hidden="true">
          <circle cx="160" cy="160" r="158" className="wheel-ground" />
          {segments.map((c, i) => {
            const [ax, ay] = point(i * seg, 128);
            const [bx, by] = point((i + 1) * seg, 128);
            return (
              <path
                key={c.id}
                d={`M160 160 L${ax} ${ay} A128 128 0 0 1 ${bx} ${by} Z`}
                fill={c.color}
                className={`wheel-panel ${landed === i ? "is-landed" : ""}`}
              />
            );
          })}
          {segments.map((c, i) => {
            const [x, y] = point(i * seg, 128);
            return (
              <line
                key={c.id}
                x1="160"
                y1="160"
                x2={x}
                y2={y}
                className="wheel-seam"
              />
            );
          })}
          <circle
            cx="160"
            cy="160"
            r="128"
            className="wheel-seam"
            fill="none"
          />
          <InterlaceRing radius={143} width={13} crossings={30} />
          <circle cx="160" cy="160" r="38" className="wheel-hub" />
        </svg>
        {segments.map((c, i) => {
          const a = ((i * seg + seg / 2 - 90) * Math.PI) / 180;
          return (
            <span
              className="wheel-icon"
              key={c.id}
              style={{
                left: `${50 + 26.5 * Math.cos(a)}%`,
                top: `${50 + 26.5 * Math.sin(a)}%`,
                color: c.ink,
                transform: `translate(-50%,-50%) rotate(${-rotation}deg)`,
              }}
            >
              {c.id === PICK ? (
                <CopticCross size="1em" eye={false} />
              ) : (
                <CategoryIcon category={c} size="1em" />
              )}
            </span>
          );
        })}
        <span className="wheel-center" aria-hidden="true">
          <CopticCross size="1em" />
        </span>
      </div>
    </div>
  );
}
