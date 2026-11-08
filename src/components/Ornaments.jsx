// Coptic forms drawn from exact geometry, never clip-art.

// One arm of the cross on a 48-unit grid, pointing up from the center (24, 24):
// a straight shaft that ends in three points (3 points × 4 arms = 12 points).
const ARM =
  "M21 21V12.5H16.5L15 5.5L19.5 8.5L24 1L28.5 8.5L33 5.5L31.5 12.5H27V21Z";

export function CopticCross({ size = 24, className = "", title, ...props }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`coptic-cross ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      {...props}
    >
      {[0, 90, 180, 270].map((angle) => (
        <path
          key={angle}
          d={ARM}
          transform={`rotate(${angle} 24 24)`}
          fill="currentColor"
        />
      ))}
      <rect x="20.5" y="20.5" width="7" height="7" fill="currentColor" />
      <rect
        x="22.5"
        y="22.5"
        width="3"
        height="3"
        className="coptic-cross-eye"
      />
    </svg>
  );
}

// A woven interlace band around a circle: two threads that cross at every step,
// as on the border of a tapestry roundel (orbiculus).
export function InterlaceRing({
  radius = 150,
  width = 12,
  crossings = 36,
  className = "",
}) {
  const steps = crossings * 12;
  const thread = (phase) => {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = radius + (width / 2) * Math.sin(t * crossings + phase);
      points.push(
        `${(160 + r * Math.cos(t)).toFixed(2)},${(160 + r * Math.sin(t)).toFixed(2)}`,
      );
    }
    return `M${points.join("L")}Z`;
  };
  return (
    <g
      className={`interlace-ring ${className}`}
      fill="none"
      strokeLinecap="round"
    >
      <circle
        cx="160"
        cy="160"
        r={radius + width / 2 + 3}
        className="interlace-edge"
      />
      <circle
        cx="160"
        cy="160"
        r={radius - width / 2 - 3}
        className="interlace-edge"
      />
      <path d={thread(0)} className="interlace-thread" />
      <path d={thread(Math.PI)} className="interlace-thread" />
    </g>
  );
}

// A small woven lozenge used as a band motif and a progress cell.
export function Lozenge({ size = 12, className = "" }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M6 0.5L11.5 6L6 11.5L0.5 6Z" fill="currentColor" />
    </svg>
  );
}
