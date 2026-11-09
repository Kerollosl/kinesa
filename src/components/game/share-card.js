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

export async function renderShareCard({
  headline,
  detail,
  companionSvg,
  companionBg,
}) {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, W, H);
  sky.addColorStop(0, "#e9efff");
  sky.addColorStop(0.55, "#f3ecff");
  sky.addColorStop(1, "#fff1ea");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Wordmark: the cross emblem and "kinesa".
  const emblem = ctx.createLinearGradient(96, 96, 176, 176);
  emblem.addColorStop(0, "#5b8cff");
  emblem.addColorStop(1, "#6955d9");
  ctx.fillStyle = emblem;
  roundRect(ctx, 96, 96, 80, 80, 22);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.save();
  ctx.translate(96 + 10, 96 + 10);
  ctx.scale(60 / 32, 60 / 32);
  ctx.fill(new Path2D("M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z"));
  ctx.restore();
  ctx.fillStyle = "#242631";
  ctx.font = "700 64px 'DM Sans', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("kinesa", 200, 138);

  // Companion on a soft disc.
  ctx.fillStyle = companionBg || "#fff0cf";
  ctx.beginPath();
  ctx.arc(W / 2, 560, 270, 0, Math.PI * 2);
  ctx.fill();
  const art = await companionImage(companionSvg).catch(() => null);
  if (art) ctx.drawImage(art, W / 2 - 260, 300, 520, 520);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#242631";
  ctx.font = "800 104px 'DM Sans', sans-serif";
  ctx.fillText(headline, W / 2, 1000);
  ctx.fillStyle = "#4b4d5c";
  ctx.font = "500 42px 'DM Sans', sans-serif";
  ctx.fillText(detail, W / 2, 1072);

  // The six wheel colors as a closing band.
  const band = (W - 192) / categories.length;
  categories.forEach((c, i) => {
    ctx.fillStyle = c.color;
    roundRect(ctx, 96 + i * band + 6, 1170, band - 12, 22, 11);
    ctx.fill();
  });
  ctx.fillStyle = "#4b4d5c";
  ctx.font = "500 34px 'DM Sans', sans-serif";
  ctx.fillText("Bible · Coptic history · Saints · Feasts", W / 2, 1260);
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
