// Draws companion primitives (src/companions/model.js) with Canvas2D.
//
// The look is flat 2D cartoon: every merge group (a run of primitives with
// the same `grp`) reads as one silhouette with a single warm outline around
// the outside, one shadow crescent on the side away from the light, and an
// optional rim of light. A "crease" draws a primitive's own edge inside the
// silhouette, fading in from a root point, so an arm in front of the body
// shows its edge without a seam at the shoulder.
import { Group, TAU, drawCharacter, hex } from "./model.js";

const LIGHT = [-0.6, -0.8]; // toward the light (up and left, y down)
const WARM_INK = hex("#3b2226");
const DEG = 180 / Math.PI;
const css = ([r, g, b], a = 1) =>
  `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
const lineOf = (c) => c.map((v, i) => v * 0.32 + WARM_INK[i] * 0.62);
const shadowOf = (c, k) => c.map((v, i) => v * (1 - k * [0.11, 0.2, 0.13][i]));
const rimOf = (c, k) =>
  c.map((v, i) => v + ([1, 0.98, 0.92][i] - v) * 0.42 * k);
const filled = (type) => type !== 3 && type !== 6 && type !== 8;

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

// A Path2D for one primitive in its own frame (origin at the primitive).
function shapeOf(p) {
  const [a, b, c, d] = p.p;
  const path = new Path2D();
  switch (p.type) {
    case 0:
    case 6:
    case 8:
      path.ellipse(0, 0, Math.max(a, 0.01), Math.max(b, 0.01), 0, 0, TAU);
      return { path, size: Math.min(a, b) };
    case 1: {
      // tapered capsule from (0,0) radius a to (c,0) radius b
      const r1 = a,
        r2 = b,
        len = c;
      if (Math.abs(r1 - r2) >= len) {
        path.arc(0, 0, Math.max(r1, r2), 0, TAU);
        return { path, size: Math.max(r1, r2) };
      }
      const phi = Math.acos((r1 - r2) / len);
      path.moveTo(r1 * Math.cos(phi), r1 * Math.sin(phi));
      path.arc(len, 0, r2, phi, -phi, true);
      path.arc(0, 0, r1, -phi, phi - TAU, true);
      path.closePath();
      return { path, size: (r1 + r2) / 2 };
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
      return { path, size: Math.min(a, b) };
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
      return { path, size: a };
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
      return { path, size: c };
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
      return { path, size: b };
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
      return { path, size: Math.min(x1 - x0, y1 - y0) / 2 };
    }
    default:
      return { path, size: 1 };
  }
}

// Draws a primitive list. `unit` is how many canvas pixels one model unit
// covers, so outlines keep a sensible weight at every size.
export function drawPrims(ctx, prims, unit = 1) {
  const base = ctx.getTransform();
  const frame = (p, dx = 0, dy = 0) =>
    base.translate(p.x + dx, p.y + dy).rotate(p.ang * DEG);
  const frames = prims.map((p) => frame(p));
  const shapes = prims.map(shapeOf);
  const lw = (ol) => Math.max(ol * 0.5, 0.75 / unit);
  const lineCol = (p) => p.line || lineOf(p.col);
  const clipToParent = (p) => {
    if (p.clip < 0 || p.clipMode !== 2) return;
    ctx.setTransform(frames[p.clip]);
    ctx.clip(shapes[p.clip].path);
  };
  const near = (i, j, pad) =>
    Math.hypot(prims[i].x - prims[j].x, prims[i].y - prims[j].y) <
    prims[i].br + prims[j].br + pad;

  const special = (p, k) => {
    const [a, b, c, d] = p.p;
    ctx.setTransform(frames[k]);
    if (p.type === 3) {
      ctx.beginPath();
      ctx.arc(0, 0, a, b, c);
      ctx.strokeStyle = css(p.col);
      ctx.lineWidth = d * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    } else if (p.type === 6) {
      const { path } = shapes[k];
      ctx.lineWidth = c * 2 + lw(p.ol) * 2;
      ctx.strokeStyle = css(lineCol(p));
      ctx.stroke(path);
      ctx.lineWidth = c * 2;
      ctx.strokeStyle = css(p.col);
      ctx.stroke(path);
      if (p.shade > 0) {
        // the lower half of the ring sits in shade
        ctx.save();
        ctx.beginPath();
        ctx.rect(-a - c * 2, 0, (a + c * 2) * 2, b + c * 2);
        ctx.clip();
        ctx.strokeStyle = css(shadowOf(p.col, p.shade));
        ctx.lineWidth = c;
        ctx.translate(0, c * 0.5);
        ctx.stroke(path);
        ctx.restore();
      }
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
    }
  };

  const run = (from, to) => {
    const all = [];
    for (let k = from; k < to; k++) all.push(k);
    const solid = all.filter((k) => filled(prims[k].type));
    // 1. one outline around the outside of the whole run
    for (const k of solid) {
      const p = prims[k];
      if (p.ol <= 0 || p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      clipToParent(p);
      ctx.setTransform(frames[k]);
      ctx.lineWidth = lw(p.ol) * 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = css(lineCol(p));
      ctx.stroke(shapes[k].path);
      ctx.restore();
    }
    // 2. fills: shadow everywhere, then the run shifted toward the light
    // in the base colour, which leaves one crescent of shadow
    const size = Math.max(1, ...solid.map((k) => shapes[k].size));
    const off = Math.min(6.5, size * 0.16);
    const [ox, oy] = [LIGHT[0] * off, LIGHT[1] * off];
    for (const k of all) {
      const p = prims[k];
      if (p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      clipToParent(p);
      if (!filled(p.type)) {
        special(p, k);
        ctx.restore();
        continue;
      }
      const { path } = shapes[k];
      ctx.setTransform(frames[k]);
      ctx.clip(path);
      if (p.shade > 0) {
        ctx.fillStyle = css(shadowOf(p.col, p.shade));
        ctx.fill(path);
        ctx.fillStyle = css(p.col);
        const mates =
          p.grp >= 0 ? solid.filter((m) => m === k || near(k, m, off)) : [k];
        for (const m of mates) {
          ctx.setTransform(frame(prims[m], ox, oy));
          ctx.fill(shapes[m].path);
        }
        if (p.rim > 0) {
          // a thin rim of light on the lit edge
          const away = frames[k]
            .inverse()
            .multiply(frame(p, -ox * 0.45, -oy * 0.45));
          const outside = new Path2D();
          outside.rect(-1e4, -1e4, 2e4, 2e4);
          outside.addPath(path, away);
          ctx.setTransform(frames[k]);
          ctx.clip(outside, "evenodd");
          ctx.fillStyle = css(rimOf(p.col, p.rim));
          ctx.fill(path);
        }
      } else {
        ctx.fillStyle = css(p.col);
        ctx.fill(path);
      }
      ctx.restore();
    }
    // 3. creases: a primitive's own edge inside the silhouette, fading in
    for (const k of solid) {
      const p = prims[k];
      if (!p.crease || p.ol <= 0 || p.alpha <= 0) continue;
      ctx.save();
      clipToParent(p);
      ctx.setTransform(frames[k]);
      const col = lineCol(p);
      if (p.crease === true) ctx.strokeStyle = css(col, p.alpha);
      else {
        const c = Math.cos(-p.ang),
          s = Math.sin(-p.ang);
        const loc = (x, y) => [
          (x - p.x) * c - (y - p.y) * s,
          (x - p.x) * s + (y - p.y) * c,
        ];
        const [x0, y0, x1, y1] = p.crease;
        const a = loc(x0, y0),
          b = loc(x1, y1);
        const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
        g.addColorStop(0, css(col, 0));
        g.addColorStop(1, css(col, p.alpha));
        ctx.strokeStyle = g;
      }
      ctx.lineWidth = lw(p.ol) * 1.25;
      ctx.lineJoin = "round";
      ctx.stroke(shapes[k].path);
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
  portrait: [-78, -214, 78, -58],
};
