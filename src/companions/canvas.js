// Draws companion primitives (src/companions/model.js) with Canvas2D in a
// soft, dimensional style: no cartoon outlines. Each merge group (a run of
// primitives with the same `grp`) shares one gradient lit from the upper
// left; every shaded shape then gets a soft core shadow, a thin bounce of
// reflected light on its shadow side and a crisp rim of light on its lit
// side. Shapes marked `ao` cast a soft contact shadow onto whatever is
// already drawn beneath them, and the finished character gets a fine grain.
import { Group, TAU, drawCharacter, hash, hex } from "./model.js";

const LIGHT = [-0.6, -0.8]; // toward the light (up and left, y down)
const DEG = 180 / Math.PI;
const TINT = hex("#2a1450"); // shadows lean toward the app's purple
const BOUNCE = hex("#dcc2ff"); // light bounced back from the purple stage
const WARM = hex("#fff3da");
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const tone = {
  light: (c) => mix(c, WARM, 0.34),
  shade: (c) =>
    mix(
      c.map((v) => v * 0.7),
      TINT,
      0.14,
    ),
  core: (c) =>
    mix(
      c.map((v) => v * 0.45),
      TINT,
      0.3,
    ),
  bounce: (c) => mix(c, BOUNCE, 0.3),
  rim: (c) => mix(c, [1, 1, 0.97], 0.6),
  edge: (c) =>
    mix(
      c.map((v) => v * 0.42),
      TINT,
      0.35,
    ),
};
const css = ([r, g, b], a = 1) =>
  `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
const solid = (type) => type !== 3 && type !== 6 && type !== 8;

function roundedPolygon(path, pts, r) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  path.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    if (r > 0) path.arcTo(p[0], p[1], q[0], q[1], r);
    else path.lineTo(p[0], p[1]);
  }
  path.closePath();
}
// A smooth closed curve through the midpoints of a control polygon; a
// control point flagged sharp becomes a corner.
function smoothPolygon(path, pts) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  path.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    if (p[2]) {
      path.lineTo(p[0], p[1]);
      path.lineTo(m[0], m[1]);
    } else path.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  path.closePath();
}

// A Path2D for one primitive in its own frame (origin at the primitive),
// its half-thickness, and its centre in that frame.
function shapeOf(p) {
  const [a, b, c, d] = p.p;
  const path = new Path2D();
  switch (p.type) {
    case 0:
    case 6:
    case 8:
      path.ellipse(0, 0, Math.max(a, 0.01), Math.max(b, 0.01), 0, 0, TAU);
      return { path, size: Math.min(a, b), center: [0, 0] };
    case 1: {
      const r1 = a,
        r2 = b,
        len = c;
      if (Math.abs(r1 - r2) >= len) {
        path.arc(0, 0, Math.max(r1, r2), 0, TAU);
        return { path, size: Math.max(r1, r2), center: [0, 0] };
      }
      const phi = Math.acos((r1 - r2) / len);
      path.moveTo(r1 * Math.cos(phi), r1 * Math.sin(phi));
      path.arc(len, 0, r2, phi, -phi, true);
      path.arc(0, 0, r1, -phi, phi - TAU, true);
      path.closePath();
      return { path, size: (r1 + r2) / 2, center: [len / 2, 0] };
    }
    case 2: {
      const r = Math.min(c, a, b);
      roundedPolygon(
        path,
        [
          [-a, -b],
          [a, -b],
          [a, b],
          [-a, b],
        ],
        r,
      );
      return { path, size: Math.min(a, b), center: [0, 0] };
    }
    case 4: {
      const n = Math.max(48, Math.round(c * 14));
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * TAU;
        const w = Math.abs(Math.cos(0.5 * c * t + d)) ** 0.75;
        const r = a + b * w;
        i ? path.lineTo(r * Math.cos(t), r * Math.sin(t)) : path.moveTo(r, 0);
      }
      path.closePath();
      return { path, size: a, center: [0, 0] };
    }
    case 5: {
      const k = d;
      roundedPolygon(
        path,
        [
          [-b - k, -c - k],
          [b + k, -c - k],
          [a + k, c + k],
          [-a - k, c + k],
        ],
        k * 1.4,
      );
      return { path, size: c, center: [0, 0] };
    }
    case 7: {
      const k = c;
      roundedPolygon(
        path,
        [
          [a + k, 0],
          [-k, b + k],
          [-k, -b - k],
        ],
        k * 1.6,
      );
      return { path, size: b, center: [a / 3, 0] };
    }
    case 9: {
      const pts = [];
      let x0 = Infinity,
        x1 = -Infinity,
        y0 = Infinity,
        y1 = -Infinity;
      for (let i = 0; i < p.pts.length; i += 3) {
        const q = [p.pts[i], p.pts[i + 1], p.pts[i + 2]];
        pts.push(q);
        x0 = Math.min(x0, q[0]);
        x1 = Math.max(x1, q[0]);
        y0 = Math.min(y0, q[1]);
        y1 = Math.max(y1, q[1]);
      }
      if (b === 1) roundedPolygon(path, pts, a);
      else smoothPolygon(path, pts);
      return {
        path,
        size: Math.min(x1 - x0, y1 - y0) / 2,
        center: [(x0 + x1) / 2, (y0 + y1) / 2],
      };
    }
    default:
      return { path, size: 1, center: [0, 0] };
  }
}

// Draws a primitive list. `unit` is how many device pixels one model unit
// covers, so blurs keep their size at every scale.
export function drawPrims(ctx, prims, unit = 1) {
  const base = ctx.getTransform();
  const FAR = 32768;
  const shapes = prims.map(shapeOf);
  const local = (p) => new DOMMatrix().translate(p.x, p.y).rotate(p.ang * DEG);
  const wp = prims.map((p, k) => {
    const w = new Path2D();
    w.addPath(shapes[k].path, local(p));
    return w;
  });
  const centre = prims.map((p, k) => {
    const c = local(p).transformPoint(new DOMPoint(...shapes[k].center));
    return [c.x, c.y];
  });
  const moved = (k, d) => {
    const w = new Path2D();
    w.addPath(wp[k], new DOMMatrix().translate(LIGHT[0] * d, LIGHT[1] * d));
    return w;
  };
  const area = (k, hole, pad) => {
    const p = prims[k];
    const r = p.br + pad;
    const a = new Path2D();
    a.rect(p.x - r, p.y - r, r * 2, r * 2);
    a.addPath(hole);
    return a;
  };
  const clipParent = (p) => {
    if (p.clip >= 0 && p.clipMode === 2) ctx.clip(wp[p.clip]);
  };
  // Paint only the blurred shadow of a path: the path itself lands far
  // off the canvas and the shadow is offset back into place.
  const shadowOf = (path, rule, col, alpha, blur, dx = 0, dy = 0) => {
    ctx.save();
    ctx.setTransform(new DOMMatrix().translate(FAR, 0).multiply(base));
    ctx.shadowOffsetX = -FAR + dx * unit;
    ctx.shadowOffsetY = dy * unit;
    ctx.shadowBlur = blur * unit;
    ctx.shadowColor = css(col, alpha);
    ctx.fillStyle = "#000";
    ctx.fill(path, rule);
    ctx.restore();
  };

  const special = (p, k) => {
    const [a, b, c, d] = p.p;
    ctx.setTransform(base.multiply(local(p)));
    if (p.type === 3) {
      ctx.beginPath();
      ctx.arc(0, 0, a, b, c);
      ctx.strokeStyle = css(p.col);
      ctx.lineWidth = d * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    } else if (p.type === 6) {
      // a glowing ring: soft glow, a body and a bright upper edge
      const { path } = shapes[k];
      ctx.save();
      ctx.shadowBlur = c * 3 * unit;
      ctx.shadowColor = css(p.col, 0.75);
      ctx.lineWidth = c * 2;
      ctx.strokeStyle = css(tone.shade(p.col));
      ctx.stroke(path);
      ctx.restore();
      ctx.lineWidth = c * 1.4;
      ctx.strokeStyle = css(p.col);
      ctx.save();
      ctx.translate(0, -c * 0.25);
      ctx.stroke(path);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(-a - c * 2, -b - c * 2, (a + c * 2) * 2, b + c * 2);
      ctx.clip();
      ctx.lineWidth = c * 0.5;
      ctx.strokeStyle = css(tone.rim(p.col), 0.9);
      ctx.translate(0, -c * 0.45);
      ctx.stroke(path);
      ctx.restore();
    } else if (p.type === 8) {
      ctx.scale(Math.max(a, 0.01), Math.max(b, 0.01));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, css(p.col, 1));
      g.addColorStop(c, css(p.col, 1));
      g.addColorStop(1, css(p.col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
    }
  };

  const run = (from, to) => {
    const all = [];
    for (let k = from; k < to; k++) all.push(k);
    const body = all.filter((k) => solid(prims[k].type));
    // one light for the whole run, so a merged group reads as one form
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const k of body) {
      const [cx, cy] = centre[k];
      const r = Math.max(shapes[k].size, prims[k].br * 0.7);
      x0 = Math.min(x0, cx - r);
      x1 = Math.max(x1, cx + r);
      y0 = Math.min(y0, cy - r);
      y1 = Math.max(y1, cy + r);
    }
    const gradient = (col) => {
      const w = x1 - x0,
        h = y1 - y0;
      const cx = x0 + w * 0.3,
        cy = y0 + h * 0.2;
      const g = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        Math.max(w, h) * 1.05,
      );
      g.addColorStop(0, css(tone.light(col)));
      g.addColorStop(0.45, css(col));
      g.addColorStop(1, css(tone.shade(col)));
      return g;
    };
    // 1. contact shadows onto what is already drawn
    for (const k of body) {
      const p = prims[k];
      if (!(p.ao > 0) || p.alpha <= 0) continue;
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.setTransform(base);
      clipParent(p);
      shadowOf(wp[k], "nonzero", TINT, 0.42 * p.ao * p.alpha, 4.5, 1, 3);
      ctx.restore();
    }
    // 2. a thin edge, for shapes that ask for one
    for (const k of body) {
      const p = prims[k];
      if (!(p.ol > 0) || p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.setTransform(base);
      clipParent(p);
      ctx.lineWidth = p.ol;
      ctx.lineJoin = "round";
      ctx.strokeStyle = css(p.line || tone.edge(p.col));
      ctx.stroke(wp[k]);
      ctx.restore();
    }
    // 3. fills
    for (const k of all) {
      const p = prims[k];
      if (p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.setTransform(base);
      clipParent(p);
      if (!solid(p.type)) {
        special(p, k);
        ctx.restore();
        continue;
      }
      ctx.clip(wp[k]);
      const size = shapes[k].size;
      ctx.fillStyle = p.shade > 0 ? gradient(p.col) : css(p.col);
      ctx.fill(wp[k]);
      if (p.shade > 0 && p.fx > 0 && size > 1.2) {
        const s = p.fx;
        const dc = Math.min(9, Math.max(1.2, size * 0.5));
        shadowOf(
          area(k, moved(k, dc), dc * 2 + 6),
          "evenodd",
          tone.core(p.col),
          0.5 * s,
          dc * 0.9,
        );
        const db = Math.min(2.2, Math.max(0.5, size * 0.09));
        ctx.fillStyle = css(tone.bounce(p.col), 0.55 * s);
        ctx.fill(area(k, moved(k, db), 4), "evenodd");
        const dr = Math.min(1.8, Math.max(0.4, size * 0.07));
        ctx.fillStyle = css(tone.rim(p.col), 0.7 * s);
        ctx.fill(area(k, moved(k, -dr), 4), "evenodd");
      }
      if (p.gloss > 0) {
        const [cx, cy] = centre[k];
        const gx = cx + LIGHT[0] * size * 0.45,
          gy = cy + LIGHT[1] * size * 0.45;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * 0.6);
        g.addColorStop(0, `rgba(255,255,255,${0.75 * p.gloss})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fill(wp[k]);
      }
      ctx.restore();
    }
  };

  for (let i = 0; i < prims.length;) {
    let j = i + 1;
    if (prims[i].grp >= 0)
      while (j < prims.length && prims[j].grp === prims[i].grp) j++;
    run(i, j);
    i = j;
  }
  ctx.setTransform(base);
}

// A fine, fixed grain laid over the character (never Math.random).
let grainTile = null;
function grain() {
  if (grainTile) return grainTile;
  const n = 96;
  grainTile = makeCanvas(n, n);
  const g = grainTile.getContext("2d");
  const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = hash(i, 11);
    const on = v > 0.5 ? 255 : 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = on;
    img.data[i * 4 + 3] = Math.abs(v - 0.5) * 2 * 15;
  }
  g.putImageData(img, 0, 0);
  return grainTile;
}
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// One companion with pose P, drawn in the context's current transform
// (model units, feet at the origin). It is composed on its own layer so
// contact shadows and grain only ever touch the character.
let layer = null;
export function drawCompanion(ctx, kind, P, unit = 1) {
  const g = new Group();
  drawCharacter(g, kind, P, null);
  const { width, height } = ctx.canvas;
  if (!layer) layer = makeCanvas(width, height);
  if (layer.width !== width || layer.height !== height) {
    layer.width = width;
    layer.height = height;
  }
  const l = layer.getContext("2d");
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = "source-over";
  l.clearRect(0, 0, width, height);
  l.setTransform(ctx.getTransform());
  drawPrims(l, g.prims, unit);
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = "source-atop";
  l.fillStyle = l.createPattern(grain(), "repeat");
  l.fillRect(0, 0, width, height);
  l.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

// Framing boxes in model units: the whole body, or head and shoulders.
export const FRAMES = {
  full: [-122, -262, 122, 14],
  portrait: [-74, -214, 74, -66],
};
