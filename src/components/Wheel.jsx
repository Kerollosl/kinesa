import { categories } from "../data.js";
import { BookOpen, Church, Sparkles, Cross, Sun, Leaf } from "lucide-react";
export const ICONS = {
  book: BookOpen,
  church: Church,
  sparkles: Sparkles,
  cross: Cross,
  sun: Sun,
  leaf: Leaf,
};
export function CategoryIcon({ category, size = 24, ...props }) {
  const Icon = ICONS[category.icon];
  return <Icon size={size} strokeWidth={1.8} {...props} />;
}
export default function Wheel({
  rotation = 0,
  spinning = false,
  decorative = false,
}) {
  return (
    <div
      className={`wheel-wrap ${decorative ? "decorative" : ""}`}
      aria-label="Six-category trivia wheel"
      role="img"
    >
      <div className="wheel-pointer" />
      <div
        className={`wheel ${spinning ? "spinning" : ""}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg viewBox="0 0 320 320" aria-hidden="true">
          {categories.map((c, i) => {
            const a = ((i * 60 - 90) * Math.PI) / 180,
              b = (((i + 1) * 60 - 90) * Math.PI) / 180;
            return (
              <path
                key={c.id}
                d={`M160 160 L${160 + 150 * Math.cos(a)} ${160 + 150 * Math.sin(a)} A150 150 0 0 1 ${160 + 150 * Math.cos(b)} ${160 + 150 * Math.sin(b)} Z`}
                fill={c.color}
                stroke="#fff9ee"
                strokeWidth="3"
              />
            );
          })}
          <circle
            cx="160"
            cy="160"
            r="150"
            fill="none"
            stroke="#fff9ee"
            strokeWidth="8"
          />
        </svg>
        {categories.map((c, i) => {
          const a = ((i * 60 - 60) * Math.PI) / 180;
          return (
            <span
              className="wheel-icon"
              key={c.id}
              style={{
                left: `${50 + 31 * Math.cos(a)}%`,
                top: `${50 + 31 * Math.sin(a)}%`,
                transform: `translate(-50%,-50%) rotate(${-rotation}deg)`,
              }}
            >
              <CategoryIcon category={c} size={30} />
            </span>
          );
        })}
        <div className="wheel-center">
          <span>✦</span>
        </div>
      </div>
    </div>
  );
}
