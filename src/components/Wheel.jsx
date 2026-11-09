import { categories } from "../data.js";
import { BookOpen, Church, Sparkles, Cross, Sun, Leaf } from "lucide-react";
import { CopticCross, InterlaceRing } from "./Ornaments.jsx";
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
  return <Icon size={size} strokeWidth={1.8} {...props} />;
}
const point = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [160 + r * Math.cos(a), 160 + r * Math.sin(a)];
};

// The wheel is a woven roundel: six dyed panels inside an interlace border,
// with the Coptic cross at its center.
export default function Wheel({
  rotation = 0,
  spinning = false,
  decorative = false,
}) {
  return (
    <div
      className={`wheel-wrap roundel-wheel ${decorative ? "decorative" : ""}`}
      aria-label="Six-category trivia wheel"
      role="img"
    >
      <div className="wheel-pointer" />
      <div
        className={`wheel ${spinning ? "spinning" : ""}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 320 320" aria-hidden="true">
          <circle cx="160" cy="160" r="158" className="roundel-ground" />
          {categories.map((c, i) => {
            const [ax, ay] = point(i * 60, 128);
            const [bx, by] = point((i + 1) * 60, 128);
            return (
              <path
                key={c.id}
                d={`M160 160 L${ax} ${ay} A128 128 0 0 1 ${bx} ${by} Z`}
                fill={c.color}
                className="roundel-panel"
              />
            );
          })}
          {categories.map((c, i) => {
            const [x, y] = point(i * 60, 128);
            return (
              <line
                key={c.id}
                x1="160"
                y1="160"
                x2={x}
                y2={y}
                className="roundel-seam"
              />
            );
          })}
          <circle
            cx="160"
            cy="160"
            r="128"
            className="roundel-seam"
            fill="none"
          />
          <InterlaceRing radius={143} width={13} crossings={30} />
          <circle cx="160" cy="160" r="40" className="roundel-hub" />
        </svg>
        {categories.map((c, i) => {
          const a = ((i * 60 - 60) * Math.PI) / 180;
          return (
            <span
              className="wheel-icon"
              key={c.id}
              style={{
                left: `${50 + 26 * Math.cos(a)}%`,
                top: `${50 + 26 * Math.sin(a)}%`,
                color: c.ink,
                transform: `translate(-50%,-50%) rotate(${-rotation}deg)`,
              }}
            >
              <CategoryIcon category={c} size={28} />
            </span>
          );
        })}
        <div className="wheel-center">
          <CopticCross size={44} />
        </div>
      </div>
    </div>
  );
}
