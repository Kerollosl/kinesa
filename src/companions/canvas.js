// Draws companion primitives (src/companions/model.js) with Canvas2D:
// flat fills with three cel bands (shadow, base, highlight) lit from the
// upper left, and a thin dark outline inside each shape's edge.
import { Group, INK, TAU, drawCharacter, hex } from "./model.js";

const LIGHT = [-0.63, -0.78]; // toward the light, y down
const INK_RGB = hex(INK);
const css = ([r, g, b], a = 1) =>
  `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
const shadowOf = (c, k) => c.map((v, i) => v * (1 - k * [0.2, 0.25, 0.1][i]));
const highlightOf = (c, k) =>
  c.map((v, i) => v + ([1, 0.97, 0.9][i] - v) * 0.2 * k);

function roundedPolygon(path, pts, r) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  path.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    path.arcTo(p[0], p[1], q[0], q[1], r);
  }
  path.closePath();
}

// A Path2D for one primitive in its own frame (origin at the primitive).
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
      // tapered capsule from (0,0) radius a to (c,0) radius b
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
    default:
      return { path, size: 1, center: [0, 0] };
  }
}

// Draws a primitive list. `unit` is how many canvas pixels one model unit
// covers, so outlines keep a sensible weight at every size.
export function drawPrims(ctx, prims, unit = 1) {
  const base = ctx.getTransform();
  const frames = prims.map((p) =>
    base.translate(p.x, p.y).rotate((p.ang * 180) / Math.PI),
  );
  const shapes = prims.map(shapeOf);
  const outlineW = (ol) => Math.max(ol * 0.55, 0.85 / unit);
  prims.forEach((p, i) => {
    const m = frames[i];
    const { path, size, center } = shapes[i];
    const [a, b, c, d] = p.p;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    // keep inside the parent (pupils in eyes, belly in body)
    if (p.clip >= 0 && p.clipMode === 2) {
      ctx.setTransform(frames[p.clip]);
      ctx.clip(shapes[p.clip].path);
    }
    ctx.setTransform(m);
    if (p.type === 3) {
      ctx.beginPath();
      ctx.arc(0, 0, a, b, c);
      ctx.strokeStyle = css(p.col);
      ctx.lineWidth = d * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    } else if (p.type === 6) {
      ctx.lineWidth = c * 2;
      ctx.strokeStyle = css(INK_RGB);
      ctx.stroke(path);
      ctx.lineWidth = Math.max(0.5, c * 2 - outlineW(p.ol) * 2);
      ctx.strokeStyle = css(p.col);
      ctx.stroke(path);
    } else if (p.type === 8) {
      ctx.scale(a, b);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, css(p.col, 1));
      g.addColorStop(c, css(p.col, 1));
      g.addColorStop(1, css(p.col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
    } else {
      ctx.clip(path);
      if (p.shade > 0) {
        const cs = Math.cos(-p.ang),
          sn = Math.sin(-p.ang);
        const lx = LIGHT[0] * cs - LIGHT[1] * sn,
          ly = LIGHT[0] * sn + LIGHT[1] * cs;
        ctx.fillStyle = css(shadowOf(p.col, p.shade));
        ctx.fill(path);
        ctx.save();
        ctx.translate(lx * size * 0.34, ly * size * 0.34);
        ctx.fillStyle = css(p.col);
        ctx.fill(path);
        ctx.restore();
        ctx.save();
        ctx.translate(
          center[0] + lx * size * 0.42,
          center[1] + ly * size * 0.42,
        );
        ctx.scale(0.5, 0.5);
        ctx.translate(-center[0], -center[1]);
        ctx.fillStyle = css(highlightOf(p.col, p.shade));
        ctx.fill(path);
        ctx.restore();
      } else {
        ctx.fillStyle = css(p.col);
        ctx.fill(path);
      }
      if (p.ol > 0) {
        if (p.clip >= 0 && p.clipMode < 2) {
          // a limb in front of the body: outline only where it leaves the body
          const outside = new Path2D();
          outside.rect(-1e4, -1e4, 2e4, 2e4);
          outside.addPath(
            shapes[p.clip].path,
            m.inverse().multiply(frames[p.clip]),
          );
          ctx.clip(outside, "evenodd");
        }
        ctx.lineWidth = outlineW(p.ol) * 2;
        ctx.strokeStyle = css(INK_RGB);
        ctx.lineJoin = "round";
        ctx.stroke(path);
      }
    }
    ctx.restore();
  });
}

// One companion with pose P, drawn in the context's current transform
// (model units, feet at the origin).
export function drawCompanion(ctx, kind, P, unit = 1) {
  const g = new Group();
  drawCharacter(g, kind, P, null);
  drawPrims(ctx, g.prims, unit);
}

// Framing boxes in model units: the whole body, or head and shoulders.
export const FRAMES = {
  full: [-122, -262, 122, 14],
  portrait: [-76, -212, 76, -60],
};
