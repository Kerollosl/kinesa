// A small celebratory burst from an element, drawn with the Web Animations API.
// Transform and opacity only; skipped entirely under reduced motion.
export function burst(origin, colors, count = 14) {
  if (!origin || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const box = origin.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "burst-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.left = `${box.left + box.width * 0.82}px`;
  layer.style.top = `${box.top + box.height / 2}px`;
  document.body.append(layer);
  const animations = [];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("i");
    piece.style.background = colors[i % colors.length];
    if (i % 3 === 0) piece.style.borderRadius = "50%";
    layer.append(piece);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 46 + Math.random() * 54;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 18;
    const spin = (Math.random() - 0.5) * 540;
    animations.push(
      piece.animate(
        [
          {
            transform: "translate(-50%, -50%) scale(0.6) rotate(0deg)",
            opacity: 1,
          },
          {
            transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%)) scale(1) rotate(${spin / 2}deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(calc(${x * 1.15}px - 50%), calc(${y + 34}px - 50%)) scale(0.85) rotate(${spin}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 760 + Math.random() * 240,
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
          fill: "forwards",
        },
      ),
    );
  }
  Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() =>
    layer.remove(),
  );
}
