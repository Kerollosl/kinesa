import { categories } from "../../data.js";

const dataUrls = new Map();
async function inline(href) {
  if (!dataUrls.has(href))
    dataUrls.set(
      href,
      fetch(href)
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            }),
        ),
    );
  return dataUrls.get(href);
}

// Serializes a rendered companion SVG with its painted atlases inlined, so it can be drawn to canvas.
async function companionImage(svg) {
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "600");
  clone.setAttribute("height", "600");
  await Promise.all(
    [...clone.querySelectorAll("image")].map(async (node) => {
      const href = node.getAttribute("href");
      if (href && !href.startsWith("data:"))
        node.setAttribute("href", await inline(href));
    }),
  );
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Palette and cross geometry match the app (DESIGN.md: Akhmim tapestry).
const INK = {
  purple700: "#3d1f4a",
  purple800: "#2f1939",
  weld300: "#ecc965",
  linen50: "#fbf9f4",
  linen100: "#e4ddcf",
  linen200: "#d3c8b4",
  thread: "#ece2cc",
  ink900: "#22162a",
  ink700: "#4b3e52",
};
const FONT = "Alexandria, system-ui, sans-serif";
// Same twelve-point cross as Ornaments.jsx, on its 48-unit grid.
const CROSS_ARM = new Path2D(
  "M21 21V12.5H16.5L15 5.5L19.5 8.5L24 1L28.5 8.5L33 5.5L31.5 12.5H27V21Z",
);
function drawCross(ctx, x, y, size, color, eye) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 48, size / 48);
  ctx.fillStyle = color;
  for (const angle of [0, 90, 180, 270]) {
    ctx.save();
    ctx.translate(24, 24);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-24, -24);
    ctx.fill(CROSS_ARM);
    ctx.restore();
  }
  ctx.fillRect(20.5, 20.5, 7, 7);
  ctx.fillStyle = eye;
  ctx.fillRect(22.5, 22.5, 3, 3);
  ctx.restore();
}
// Shrinks a line of text until it fits the pane.
function fitText(ctx, text, weight, startSize, maxWidth) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${FONT}`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 28);
}

export async function renderShareCard({
  headline,
  detail,
  companionSvg,
  companionBg,
}) {
  await document.fonts?.ready;
  // Canvas only uses a webfont that is already loaded; ask for the weights we draw.
  await Promise.all(
    ["700 64px Alexandria", "800 96px Alexandria", "500 40px Alexandria"].map(
      (font) => document.fonts?.load(font).catch(() => []),
    ),
  );
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Undyed linen ground; a purple woven field carries the top of the card.
  ctx.fillStyle = INK.linen100;
  ctx.fillRect(0, 0, W, H);
  const FIELD = 700;
  ctx.fillStyle = INK.purple700;
  ctx.fillRect(0, 0, W, FIELD);
  // Clavus: a deeper band with linen lozenges along the field's lower edge.
  ctx.fillStyle = INK.purple800;
  ctx.fillRect(0, FIELD - 44, W, 44);
  ctx.fillStyle = INK.thread;
  for (let x = 30; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, FIELD - 22 - 12);
    ctx.lineTo(x + 12, FIELD - 22);
    ctx.lineTo(x, FIELD - 22 + 12);
    ctx.lineTo(x - 12, FIELD - 22);
    ctx.closePath();
    ctx.fill();
  }

  // Wordmark: the cross emblem and "kinesa".
  drawCross(ctx, 96, 92, 84, INK.weld300, INK.purple700);
  ctx.fillStyle = INK.linen50;
  ctx.font = `700 64px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("kinesa", 200, 134);

  // Companion on a pale disc ringed in linen thread.
  ctx.fillStyle = INK.thread;
  ctx.beginPath();
  ctx.arc(W / 2, 430, 262, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = companionBg || "#ffe1a3";
  ctx.beginPath();
  ctx.arc(W / 2, 430, 248, 0, Math.PI * 2);
  ctx.fill();
  const art = await companionImage(companionSvg).catch(() => null);
  if (art) ctx.drawImage(art, W / 2 - 250, 180, 500, 500);

  // Reading pane.
  roundRect(ctx, 96, 760, W - 192, 300, 36);
  ctx.fillStyle = INK.linen50;
  ctx.fill();
  ctx.strokeStyle = INK.linen200;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK.ink900;
  fitText(ctx, headline, 800, 92, W - 192 - 80);
  ctx.fillText(headline, W / 2, 900);
  ctx.fillStyle = INK.ink700;
  fitText(ctx, detail, 500, 40, W - 192 - 80);
  ctx.fillText(detail, W / 2, 984);

  // The six category dyes as a closing band.
  const band = (W - 192) / categories.length;
  categories.forEach((c, i) => {
    ctx.fillStyle = c.color;
    roundRect(ctx, 96 + i * band + 5, 1120, band - 10, 26, 6);
    ctx.fill();
  });
  ctx.fillStyle = INK.ink900;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("Coptic Trivia", W / 2, 1220);
  ctx.fillStyle = INK.ink700;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText("Bible · Coptic history · Saints · Feasts", W / 2, 1274);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function shareResult({ blob, text }) {
  const file = new File([blob], "kinesa-result.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kinesa-result.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
