// The four Gospel companions as flat 2D, one-piece cartoon characters.
// Shared by the app (src/companions/canvas.js draws them with Canvas2D) and
// the film (video/, drawn with WebGL signed-distance shaders). A character is
// a list of primitives built from a pose; nothing here touches the DOM.
//
// Primitive types: 0 ellipse, 1 tapered capsule, 2 round box, 3 arc stroke,
// 4 scallop, 5 trapezoid, 6 ellipse ring, 7 rounded triangle, 8 soft blob.
// ---------- small math ----------
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const fract = (x) => x - Math.floor(x);
export const ease = {
  lin: (u) => u,
  in: (u) => u * u * u,
  out: (u) => 1 - (1 - u) ** 3,
  out2: (u) => 1 - (1 - u) ** 2,
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  sine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  back: (u) => {
    const c = 1.7;
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
  },
  hold: (u) => (u < 1 ? 0 : 1),
};
// Seeded randomness: a pure hash, never Math.random.
export function hash(i, s = 0) {
  let n = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export const hex = (c) => [
  parseInt(c.slice(1, 3), 16) / 255,
  parseInt(c.slice(3, 5), 16) / 255,
  parseInt(c.slice(5, 7), 16) / 255,
];
export const INK = "#2a2230";

// ---------- 2D affine matrices ----------
export const M = {
  id: () => [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ],
  tr: (x, y) => [1, 0, 0, 1, x, y],
  rot: (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0],
  sc: (x, y) => [x, 0, 0, y, 0, 0],
  ap: (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]],
  inv: (m) => {
    const det = m[0] * m[3] - m[1] * m[2];
    const a = m[3] / det,
      b = -m[1] / det,
      c = -m[2] / det,
      d = m[0] / det;
    return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
  },
};

// ---------- shape groups (signed-distance primitives) ----------
// type: 0 ellipse, 1 tapered capsule, 2 round box, 3 arc stroke,
// 4 scallop, 5 trapezoid, 6 ellipse ring, 7 rounded triangle, 8 soft blob
export class Group {
  constructor() {
    this.prims = [];
    this.m = M.id();
    this.stack = [];
  }
  save() {
    this.stack.push(this.m);
  }
  restore() {
    this.m = this.stack.pop();
  }
  apply(n) {
    this.m = M.mul(this.m, n);
  }
  get k() {
    return Math.sqrt(Math.abs(this.m[0] * this.m[3] - this.m[1] * this.m[2]));
  }
  get ang() {
    return Math.atan2(this.m[1], this.m[0]);
  }
  add(type, x, y, ang, p, col, br, o = {}) {
    const [wx, wy] = M.ap(this.m, x, y);
    this.prims.push({
      type,
      x: wx,
      y: wy,
      ang: ang + this.ang,
      p,
      col: typeof col === "string" ? hex(col) : col,
      shade: o.shade ?? 1,
      ol: o.ol ?? 2.6,
      clip: o.clip ?? -1,
      clipMode: o.clipMode ?? 1,
      alpha: o.alpha ?? 1,
      br,
    });
    return this.prims.length - 1;
  }
  ellipse(x, y, rx, ry, col, o = {}) {
    const sx = Math.hypot(this.m[0], this.m[1]);
    const sy = Math.hypot(this.m[2], this.m[3]);
    const a = o.ang || 0;
    const swap = Math.abs(Math.sin(a)) > 0.7071;
    const ex = rx * (swap ? sy : sx),
      ey = ry * (swap ? sx : sy);
    return this.add(0, x, y, a, [ex, ey, 0, 0], col, Math.max(ex, ey), o);
  }
  circle(x, y, r, col, o) {
    return this.ellipse(x, y, r, r, col, o);
  }
  soft(x, y, rx, ry, col, o = {}) {
    const k = this.k;
    return this.add(
      8,
      x,
      y,
      o.ang || 0,
      [rx * k, ry * k, o.core ?? 0.2, 0],
      col,
      Math.max(rx, ry) * k,
      { shade: 0, ol: 0, ...o },
    );
  }
  capsule(ax, ay, bx, by, r1, r2, col, o = {}) {
    const A = M.ap(this.m, ax, ay),
      B = M.ap(this.m, bx, by);
    const k = this.k;
    const len = Math.max(0.01, Math.hypot(B[0] - A[0], B[1] - A[1]));
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    this.prims.push({
      type: 1,
      x: A[0],
      y: A[1],
      ang,
      p: [r1 * k, r2 * k, len, 0],
      col: hex(col),
      shade: o.shade ?? 1,
      ol: o.ol ?? 2.6,
      clip: o.clip ?? -1,
      clipMode: o.clipMode ?? 1,
      alpha: o.alpha ?? 1,
      br: len + Math.max(r1, r2) * k,
    });
    return this.prims.length - 1;
  }
  box(x, y, hx, hy, r, col, o = {}) {
    const sx = Math.hypot(this.m[0], this.m[1]);
    const sy = Math.hypot(this.m[2], this.m[3]);
    return this.add(
      2,
      x,
      y,
      o.ang || 0,
      [hx * sx, hy * sy, r * Math.min(sx, sy), 0],
      col,
      Math.hypot(hx * sx, hy * sy),
      o,
    );
  }
  arc(x, y, ra, a0, a1, th, col, o = {}) {
    const k = this.k;
    return this.add(
      3,
      x,
      y,
      o.ang || 0,
      [ra * k, a0, a1, th * k],
      col,
      (ra + th) * k,
      { shade: 0, ol: 0, ...o },
    );
  }
  scallop(x, y, R, A, N, ph, col, o = {}) {
    const k = this.k;
    return this.add(
      4,
      x,
      y,
      o.ang || 0,
      [R * k, A * k, N, ph],
      col,
      (R + A) * k + 2,
      o,
    );
  }
  trap(x, y, r1, r2, he, round, col, o = {}) {
    const sx = Math.hypot(this.m[0], this.m[1]);
    const sy = Math.hypot(this.m[2], this.m[3]);
    return this.add(
      5,
      x,
      y,
      o.ang || 0,
      [r1 * sx, r2 * sx, he * sy, round * Math.min(sx, sy)],
      col,
      Math.hypot(Math.max(r1, r2) * sx, he * sy) + round,
      o,
    );
  }
  ring(x, y, rx, ry, th, col, o = {}) {
    const k = this.k;
    return this.add(
      6,
      x,
      y,
      o.ang || 0,
      [rx * k, ry * k, th * k, 0],
      col,
      (Math.max(rx, ry) + th) * k,
      o,
    );
  }
  tri(x, y, size, half, round, col, o = {}) {
    const k = this.k;
    return this.add(
      7,
      x,
      y,
      o.ang || 0,
      [size * k, half * k, round * k, 0],
      col,
      (size + half + round) * k,
      o,
    );
  }
}

// =====================================================================
// Characters: one-piece flat 2D toys. Limbs start inside the body and
// fade into it, so nothing ever shows a joint.
// =====================================================================
export const WING = "#fbf3e4";
export const SPEC = {
  leo: {
    body: "#f2b13a",
    belly: "#fde0a6",
    hand: "#f7c766",
    arm: "#f2b13a",
    foot: "#f7c766",
    bodyC: [0, -52],
    bodyR: [40, 44],
    shoulder: [
      [-27, -72],
      [27, -72],
    ],
    reach: 50,
    armR: [12, 9],
    handR: 13,
    footR: [17, 10],
    footX: 17,
    neck: [0, -96],
    headC: [0, -134],
    headR: 50,
    sitDrop: 9,
    wings: true,
    wingRoot: [24, -84],
    mouthY: 0.5,
  },
  lou: {
    body: "#c8743e",
    belly: "#f8e6c6",
    hand: "#4e2c20",
    arm: "#c8743e",
    foot: "#4e2c20",
    bodyC: [0, -56],
    bodyR: [44, 46],
    shoulder: [
      [-29, -76],
      [29, -76],
    ],
    reach: 50,
    armR: [13, 10],
    handR: 12.5,
    footR: [15, 9],
    footX: 18,
    neck: [0, -100],
    headC: [0, -136],
    headR: 49,
    sitDrop: 11,
    wings: true,
    wingRoot: [26, -88],
    mouthY: 0.58,
    legs: true,
  },
  juno: {
    body: "#7d4f2e",
    belly: "#a8754a",
    hand: "#6a3f22",
    arm: "#8a5532",
    foot: "#f2b632",
    bodyC: [0, -56],
    bodyR: [38, 46],
    shoulder: [
      [-25, -80],
      [25, -80],
    ],
    reach: 44,
    armR: [17, 13],
    handR: 12,
    footR: [15, 8],
    footX: 16,
    neck: [0, -98],
    headC: [0, -132],
    headR: 45,
    sitDrop: 11,
    wings: false,
    wingRoot: [0, 0],
    mouthY: 0.45,
  },
  mattie: {
    body: "#b49ae6",
    belly: null,
    hand: "#f5c09a",
    arm: "#b49ae6",
    foot: "#8a5232",
    bodyC: [0, -52],
    bodyR: [34, 40],
    shoulder: [
      [-22, -84],
      [22, -84],
    ],
    reach: 46,
    armR: [11.5, 9.5],
    handR: 11,
    footR: [15, 8],
    footX: 14,
    neck: [0, -98],
    headC: [0, -136],
    headR: 47,
    sitDrop: 10,
    wings: true,
    wingRoot: [20, -86],
    mouthY: 0.42,
  },
};

// Rest pose; every character pose starts from this. `k` scales the model.
export const basePose = (o = {}) => ({
  k: 1,
  x: 0,
  y: 0,
  lift: 0,
  lean: 0,
  sx: 1,
  sy: 1,
  turn: 0.75,
  sit: 0,
  bob: 0,
  headTilt: 0,
  look: [0.4, 0],
  face: "happy",
  blink: 0,
  flap: 0,
  walk: null,
  arms: { L: { ang: 1.75 }, R: { ang: 1.3 } },
  tail: 0,
  t: 0,
  visible: true,
  ...o,
});

// Characters are modelled ~200 units tall with feet at y = 0; P.k scales them.
export function rootMatrix(P) {
  const k = P.k ?? 1;
  return M.mul(
    M.tr(P.x, P.y - P.lift),
    M.mul(M.rot(P.lean), M.sc(P.sx * k, P.sy * k)),
  );
}
// Shoulder in body space (screen side -1 left, +1 right).
export function shoulderLocal(S, P, side) {
  const T = P.turn,
    sg = T >= 0 ? 1 : -1;
  const near = side === sg;
  const b = S.shoulder[side < 0 ? 0 : 1];
  return [
    b[0] + T * (near ? 6 : 50),
    b[1] + P.sit * S.sitDrop + P.bob - (near ? 0 : 4 * Math.abs(T)),
  ];
}
export function bodyLocal(S, P) {
  return {
    c: [S.bodyC[0] + P.turn * 4, S.bodyC[1] + P.sit * S.sitDrop + P.bob],
    r: [S.bodyR[0] * (1 - 0.08 * Math.abs(P.turn)), S.bodyR[1]],
  };
}

function drawWings(g, P, S) {
  const T = P.turn;
  const root = [S.wingRoot[0], S.wingRoot[1] + P.sit * S.sitDrop + P.bob];
  const lobes = [
    [-12, 46, 12, 9],
    [-38, 42, 12, 9],
    [-62, 33, 11, 8],
  ];
  for (const side of [-1, 1]) {
    const back = side === (T >= 0 ? -1 : 1);
    const scale = back ? 1 + 0.08 * Math.abs(T) : 1 - 0.3 * Math.abs(T);
    const rx = side * root[0] - T * 16;
    const flap = (P.flap + 0.05 * Math.sin(P.t * 2.3 + side)) * side;
    for (const [deg, len, r1, r2] of lobes) {
      const a = (deg * Math.PI) / 180 - flap * 0.6;
      const dir =
        side > 0 ? [Math.cos(a), Math.sin(a)] : [-Math.cos(a), Math.sin(a)];
      g.capsule(
        rx,
        root[1],
        rx + dir[0] * len * scale,
        root[1] + dir[1] * len * scale,
        r1,
        r2,
        WING,
      );
    }
  }
}

function drawTail(g, P, S, kind) {
  if (kind === "mattie") return;
  const sg = P.turn >= 0 ? 1 : -1;
  const sw = Math.sin(P.t * 3.1 + P.tail) * 0.25;
  const y0 = (kind === "juno" ? -22 : -34) + P.sit * S.sitDrop;
  const bx = -sg * (S.bodyR[0] - 6);
  if (kind === "juno") {
    for (const k of [-1, 0, 1]) {
      const a = Math.PI / 2 + sg * (0.55 + k * 0.28) + sw * 0.3;
      g.capsule(
        bx * 0.6,
        y0,
        bx * 0.6 + Math.cos(a) * 30,
        y0 + Math.sin(a) * 30,
        8,
        6,
        "#fbf7ef",
      );
    }
    return;
  }
  const mid = [bx - sg * 22, y0 - 14 + sw * 10];
  const tip = [bx - sg * (30 + sw * 8), y0 - 38];
  const col = kind === "leo" ? S.body : S.body;
  g.capsule(bx, y0, mid[0], mid[1], 5, 4.2, col);
  g.capsule(mid[0], mid[1], tip[0], tip[1], 4.2, 3.6, col);
  g.scallop(
    tip[0],
    tip[1] - 4,
    8,
    3.5,
    7,
    P.t * 2,
    kind === "leo" ? "#c85d17" : "#6e3a1d",
  );
}

function drawFeet(g, P, S, kind) {
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  for (const side of [-1, 1]) {
    let fx = side * S.footX * (1 - 0.45 * aT) + T * 6;
    let fy = -S.footR[1] * 0.85;
    let lift = 0,
      ang = 0,
      rx = S.footR[0],
      ry = S.footR[1];
    if (P.walk) {
      const u = fract(P.walk.phase + (side > 0 ? 0.5 : 0));
      const st = P.walk.stride / (P.k ?? 1);
      let off;
      if (u < 0.5) off = st * (0.25 - u);
      else {
        const v = (u - 0.5) / 0.5;
        off = st * (-0.25 + 0.5 * ease.sine(v));
        lift = Math.sin(Math.PI * v) * P.walk.lift;
      }
      fx += off * sg;
      ang = -sg * lift * 0.012;
    }
    if (P.sit > 0) {
      fx = lerp(
        fx,
        side * S.footX * 0.9 + sg * 30 * aT + (aT < 0.3 ? 0 : 6),
        P.sit,
      );
      fy = lerp(fy, -ry * 0.75, P.sit);
      ang = lerp(ang, -sg * 0.5 * aT - side * 0.25 * (1 - aT), P.sit);
      rx *= 1 + 0.12 * P.sit;
    }
    const y = fy - lift;
    if (S.legs) {
      const top = bodyLocal(S, P).c[1] + S.bodyR[1] * 0.55;
      g.capsule(fx * 0.85, top, fx, y - 2, 10, 9, S.body);
    }
    if (kind === "mattie") {
      const top = -22 + P.sit * S.sitDrop;
      g.capsule(fx * 0.8, top, fx, y - 3, 7.5, 7, "#f5c09a");
    }
    if (kind === "lou")
      g.box(fx, y, S.footR[0] - 2, S.footR[1], 6, S.foot, { ang });
    else g.ellipse(fx, y, rx, ry, S.foot, { ang });
    if (kind === "juno") {
      for (const k of [-1, 0, 1])
        g.circle(fx + sg * 9 + k * 6, y + 4 - Math.abs(k) * 1.5, 4.2, S.foot, {
          ol: 2,
        });
    }
  }
}

// Arms: short tapered tubes ending in a mitten. A world target makes
// the hand land exactly there (contacts); otherwise an angle.
function drawArm(g, P, S, kind, side, spec, front, bodyIdx, report) {
  const s = shoulderLocal(S, P, side);
  const far = side !== (P.turn >= 0 ? 1 : -1) && Math.abs(P.turn) > 0.3;
  const reach = S.reach * (far ? 1.6 : 1);
  let dir, len;
  if (spec.target) {
    const tl = M.ap(M.inv(g.m), spec.target[0], spec.target[1]);
    const dx = tl[0] - s[0],
      dy = tl[1] - s[1];
    const dist = Math.hypot(dx, dy) || 1;
    dir = [dx / dist, dy / dist];
    const want = dist - S.handR * 0.45;
    len = clamp(want, S.reach * 0.5, reach);
    if (report)
      report.push({
        who: kind,
        side,
        gap: Math.max(0, want - reach),
        short: Math.max(0, S.reach * 0.5 - want),
      });
  } else {
    const a = spec.ang;
    dir = [Math.cos(a), Math.sin(a)];
    len = S.reach * (spec.len ?? 0.82);
  }
  const w = [s[0] + dir[0] * len, s[1] + dir[1] * len];
  const clip = front ? { clip: bodyIdx, clipMode: 1 } : {};
  g.capsule(
    s[0] - dir[0] * 8,
    s[1] - dir[1] * 8,
    w[0],
    w[1],
    S.armR[0],
    S.armR[1],
    S.arm,
    clip,
  );
  const ang = Math.atan2(dir[1], dir[0]);
  const hc = [w[0] + dir[0] * S.handR * 0.45, w[1] + dir[1] * S.handR * 0.45];
  if (kind === "juno") {
    for (const k of [-1, 0, 1]) {
      const a = ang + k * 0.5;
      g.capsule(
        hc[0] - dir[0] * 8,
        hc[1] - dir[1] * 8,
        hc[0] + Math.cos(a) * 17,
        hc[1] + Math.sin(a) * 17,
        9,
        6,
        S.hand,
      );
    }
    return;
  }
  const up = [dir[1], -dir[0]];
  const flip = side * (P.turn >= 0 ? 1 : -1) < 0 ? -1 : 1;
  g.ellipse(
    hc[0] + up[0] * S.handR * 0.7 * flip + dir[0] * 2,
    hc[1] + up[1] * S.handR * 0.7 * flip + dir[1] * 2,
    S.handR * 0.45,
    S.handR * 0.36,
    S.hand,
    { ang },
  );
  g.ellipse(hc[0], hc[1], S.handR, S.handR * 0.86, S.hand, { ang });
}

// Faces: dot eyes with white surrounds, simple brows and mouths.
export const FACES = {
  happy: { eyes: "open", brow: 0, mouth: "smile" },
  det: { eyes: "open", brow: 1, mouth: "flat" },
  strain: { eyes: "squeeze", brow: 1.2, mouth: "grit" },
  sad: { eyes: "open", brow: -1, mouth: "frown", lookDown: true },
  pant: { eyes: "half", brow: -0.4, mouth: "o" },
  wow: { eyes: "wide", brow: -0.8, mouth: "o" },
  joy: { eyes: "happy", brow: -0.4, mouth: "open" },
  grin: { eyes: "open", brow: -0.3, mouth: "open" },
  idea: { eyes: "wide", brow: -0.7, mouth: "open" },
};
function drawFace(g, P, S, hc, R, opts = {}) {
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  const F = FACES[P.face] || FACES.happy;
  const fx = T * 0.4 * R;
  const browCol = opts.brow || INK;
  const eyeY = hc[1] - 0.1 * R + (opts.eyeY || 0);
  const look = F.lookDown ? [P.look[0] * 0.5, 0.6] : P.look;
  for (const side of [-1, 1]) {
    const near = side === sg || aT < 0.05;
    const k = near ? 1 - 0.08 * aT : 1 - 0.36 * aT;
    const ex =
      hc[0] + fx + side * 0.36 * R * (near ? 1 - 0.12 * aT : 1 - 0.5 * aT);
    const erx = 0.24 * R * k,
      ery = 0.29 * R;
    let eyes = F.eyes;
    let blink = P.blink;
    if (eyes === "half") blink = Math.max(blink, 0.45);
    if (eyes === "open" || eyes === "half" || eyes === "wide") {
      if (blink > 0.7) {
        g.arc(ex, eyeY + 2, erx * 0.9, 0.35, Math.PI - 0.35, 1.8, INK);
      } else {
        const big = eyes === "wide" ? 1.14 : 1;
        const wy = ery * big * (1 - blink * 0.9);
        const white = g.ellipse(ex, eyeY, erx * big, wy, "#ffffff", {
          ol: 2.2,
          shade: 0.4,
        });
        const pr = 0.135 * R * (eyes === "wide" ? 0.8 : 1);
        const px = ex + look[0] * erx * 0.42,
          py = eyeY + look[1] * wy * 0.4;
        g.circle(px, py, pr, INK, {
          ol: 0,
          shade: 0,
          clip: white,
          clipMode: 2,
        });
        g.circle(px - pr * 0.35, py - pr * 0.4, pr * 0.34, "#ffffff", {
          ol: 0,
          shade: 0,
          clip: white,
          clipMode: 2,
        });
      }
    } else if (eyes === "happy") {
      g.arc(ex, eyeY + 4, erx * 0.95, -Math.PI + 0.45, -0.45, 2, INK);
    } else if (eyes === "squeeze") {
      const d = side * 0.18 * R;
      g.capsule(ex - d * 0.9, eyeY - 6, ex + d * 0.4, eyeY, 2, 2, INK, {
        shade: 0,
        ol: 0,
      });
      g.capsule(ex + d * 0.4, eyeY, ex - d * 0.9, eyeY + 6, 2, 2, INK, {
        shade: 0,
        ol: 0,
      });
    }
    // brow: inner end lower when determined, higher when sad
    const by = eyeY - 0.43 * R;
    const inner = ex - side * 0.15 * R * k,
      outer = ex + side * 0.15 * R * k;
    g.capsule(
      outer,
      by - 3 * F.brow,
      inner,
      by + 4 * F.brow,
      2.4,
      2.6,
      browCol,
      { shade: 0, ol: 0 },
    );
  }
  if (opts.mouth === false) return;
  // mouth
  const mx = hc[0] + fx * 1.08,
    my = hc[1] + S.mouthY * R + (opts.mouthDY || 0);
  const mw = 0.22 * R * (1 - 0.25 * aT);
  if (F.mouth === "smile")
    g.arc(mx, my - mw * 0.55, mw, 0.5, Math.PI - 0.5, 1.7, INK);
  else if (F.mouth === "flat")
    g.capsule(mx - mw * 0.6, my, mx + mw * 0.6, my, 1.8, 1.8, INK, {
      shade: 0,
      ol: 0,
    });
  else if (F.mouth === "frown")
    g.arc(mx, my + mw * 0.75, mw * 0.85, -Math.PI + 0.55, -0.55, 1.7, INK);
  else if (F.mouth === "o") {
    const m = g.ellipse(mx, my, mw * 0.42, mw * 0.55, "#6e1f2b", {
      ol: 2,
      shade: 0,
    });
    g.ellipse(mx, my + mw * 0.35, mw * 0.3, mw * 0.22, "#f07b8a", {
      ol: 0,
      shade: 0,
      clip: m,
      clipMode: 2,
    });
  } else if (F.mouth === "open") {
    const m = g.ellipse(mx, my + mw * 0.15, mw * 0.9, mw * 0.62, "#6e1f2b", {
      ol: 2.2,
      shade: 0,
    });
    g.box(mx, my - mw * 0.75, mw, mw * 0.4, 2, "#ffffff", {
      ol: 0,
      shade: 0,
      clip: m,
      clipMode: 2,
    });
    g.ellipse(mx, my + mw * 0.6, mw * 0.55, mw * 0.32, "#f07b8a", {
      ol: 0,
      shade: 0,
      clip: m,
      clipMode: 2,
    });
  } else if (F.mouth === "grit") {
    g.box(mx, my, mw * 0.95, mw * 0.36, 3, "#ffffff", { ol: 2, shade: 0 });
    g.capsule(mx - mw * 0.9, my, mx + mw * 0.9, my, 0.7, 0.7, INK, {
      ol: 0,
      shade: 0,
    });
  }
  if (opts.blush !== false) {
    for (const side of [-1, 1]) {
      const near = side === sg || aT < 0.05;
      if (!near && aT > 0.6) continue;
      g.soft(
        hc[0] + fx + side * 0.52 * R * (near ? 1 : 0.6),
        eyeY + 0.36 * R,
        0.16 * R,
        0.1 * R,
        "#ff8f9c",
        { alpha: 0.5 },
      );
    }
  }
}

const HEADS = {
  leo(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      fx = T * 0.4 * R;
    g.scallop(
      hc[0] - T * 7,
      hc[1] + 2,
      R + 9,
      10,
      13,
      0.3 + Math.sin(P.t * 1.7) * 0.04,
      "#e2741f",
    );
    for (const side of [-1, 1]) {
      const ex = hc[0] + side * 34 * (1 - 0.3 * Math.abs(T)) - T * 10;
      g.circle(ex, hc[1] - 40, 14, S.body);
      g.circle(ex, hc[1] - 40, 7, "#e88a3d", { ol: 0, shade: 0 });
    }
    g.circle(hc[0], hc[1], R, S.body);
    g.ellipse(
      hc[0] + fx * 1.15,
      hc[1] + 0.32 * R,
      0.5 * R * (1 - 0.2 * Math.abs(T)),
      0.33 * R,
      "#fde7bd",
      { ol: 2.2 },
    );
    drawFace(g, P, S, hc, R, { brow: "#b8601f", eyeY: -8 });
    g.tri(hc[0] + fx * 1.25, hc[1] + 0.13 * R, 10, 8.5, 3, "#5a2a1c", {
      ang: Math.PI / 2,
      ol: 2,
      shade: 0.5,
    });
  },
  lou(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      fx = T * 0.4 * R,
      aT = Math.abs(T);
    for (const side of [-1, 1]) {
      const bx = hc[0] + side * 30 * (1 - 0.25 * aT) - T * 8;
      const mid = [bx + side * 18, hc[1] - 50];
      g.capsule(bx, hc[1] - 30, mid[0], mid[1], 9, 7, "#f3ead6");
      g.capsule(
        mid[0],
        mid[1],
        mid[0] + side * 4,
        hc[1] - 72,
        7,
        4.5,
        "#f3ead6",
      );
      const ex = hc[0] + side * 52 * (1 - 0.3 * aT) - T * 10;
      g.ellipse(ex, hc[1] - 8, 20, 10, S.body, { ang: side * -0.3 });
      g.ellipse(ex + side * 2, hc[1] - 8, 11, 5, "#f2a0a0", {
        ang: side * -0.3,
        ol: 0,
        shade: 0,
      });
    }
    const head = g.ellipse(hc[0], hc[1], R, R * 0.95, S.body);
    g.capsule(
      hc[0] + fx * 0.6,
      hc[1] - 44,
      hc[0] + fx * 0.95,
      hc[1] + 4,
      8,
      12,
      S.belly,
      { ol: 0, clip: head, clipMode: 2 },
    );
    g.scallop(hc[0] + fx * 0.4 - T * 4, hc[1] - 44, 12, 5, 7, 0.4, "#8d4a24");
    const mz = g.ellipse(
      hc[0] + fx * 1.15,
      hc[1] + 0.38 * R,
      0.66 * R * (1 - 0.18 * aT),
      0.4 * R,
      S.belly,
      { ol: 2.4 },
    );
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      g.ellipse(
        hc[0] + fx * 1.2 + side * 0.2 * R * (near ? 1 : 0.6),
        hc[1] + 0.3 * R,
        near ? 4 : 3,
        5.5,
        "#8a4b35",
        { ol: 0, shade: 0, clip: mz, clipMode: 2 },
      );
    }
    drawFace(g, P, S, hc, R, { brow: "#6e3a1d", eyeY: -6 });
  },
  juno(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      fx = T * 0.4 * R,
      aT = Math.abs(T);
    for (const k of [-1, 0, 1]) {
      const bx = hc[0] - T * 14 + k * 9;
      g.capsule(
        bx,
        hc[1] - 30,
        bx - T * 10 + k * 5,
        hc[1] - 56 - (k === 0 ? 6 : 0),
        8,
        5,
        "#fbf7ef",
      );
    }
    g.circle(hc[0], hc[1], R, "#fbf7ef");
    drawFace(g, P, S, hc, R, {
      brow: "#5b3a22",
      blush: false,
      mouth: false,
      eyeY: -8,
    });
    const open =
      P.face === "joy" ||
      P.face === "grin" ||
      P.face === "idea" ||
      P.face === "wow" ||
      P.face === "pant";
    const beakA = Math.PI / 2 - T * 1.05;
    const bx = hc[0] + fx * 1.35,
      by = hc[1] + 0.08 * R;
    if (open)
      g.tri(bx - 2, by + 6, 0.42 * R, 0.22 * R, 3, "#e9a51f", {
        ang: beakA + 0.45,
        ol: 2.2,
        shade: 0.6,
      });
    g.tri(bx, by, 0.58 * R, 0.3 * R, 4, "#ffc23d", {
      ang: beakA,
      ol: 2.4,
      shade: 0.8,
    });
  },
  mattie(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      fx = T * 0.4 * R,
      aT = Math.abs(T);
    g.scallop(hc[0] - T * 6, hc[1] - 4, R + 7, 8, 15, 0.2, "#6a3a22");
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      if (!near && aT > 0.5) continue;
      g.circle(
        hc[0] + side * 0.95 * R * (near ? 1 - 0.1 * aT : 0.7) - T * 4,
        hc[1] + 6,
        9,
        "#f5c09a",
      );
    }
    g.circle(hc[0], hc[1], R, "#f5c09a");
    for (const [dx, dy, r] of [
      [-30, -30, 15],
      [-12, -40, 15],
      [8, -42, 15],
      [26, -34, 14],
    ]) {
      g.circle(
        hc[0] + dx * (1 - 0.15 * aT) + fx * 0.45,
        hc[1] + dy,
        r,
        "#6a3a22",
        { ol: 2.2 },
      );
    }
    g.soft(hc[0] + fx * 1.2, hc[1] + 0.12 * R, 4.5, 3.5, "#e3906c", {
      core: 0.5,
      alpha: 0.9,
    });
    drawFace(g, P, S, hc, R, { brow: "#4a2614" });
    const hb = Math.sin(P.t * 2.2) * 2;
    g.ring(hc[0] + fx * 0.15, hc[1] - R - 20 + hb, 30, 8, 3.6, "#ecc965", {
      ol: 2,
      shade: 0.4,
    });
  },
};

// Body layer for each kind, returns the body index (for limb fades).
function drawBody(g, P, S, kind) {
  const B = bodyLocal(S, P);
  const T = P.turn,
    aT = Math.abs(T);
  if (kind === "mattie") {
    const body = g.trap(B.c[0], B.c[1] + 4, 36, 21, 34, 8, S.body);
    g.box(B.c[0] + T * 3, B.c[1] - 8, 30, 5, 4, "#ecc965", {
      clip: body,
      clipMode: 2,
      ol: 2,
      shade: 0.5,
    });
    g.trap(B.c[0] + T * 8, B.c[1] - 34, 9, 5, 7, 2, "#a084d9", {
      ol: 0,
      clip: body,
      clipMode: 2,
      shade: 0,
    });
    return body;
  }
  const body = g.ellipse(B.c[0], B.c[1], B.r[0], B.r[1], S.body);
  g.ellipse(
    B.c[0] + T * B.r[0] * 0.32,
    B.c[1] + 7,
    B.r[0] * 0.58 * (1 - 0.25 * aT),
    B.r[1] * 0.68,
    S.belly,
    { ol: 0, clip: body, clipMode: 2 },
  );
  if (kind === "juno")
    g.scallop(B.c[0] - T * 4, B.c[1] - B.r[1] + 6, 30, 6, 9, 0.5, "#fbf7ef");
  return body;
}

export function drawCharacter(g, kind, P, report) {
  if (!P.visible) return;
  const S = SPEC[kind];
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  g.save();
  g.m = M.mul(g.m, rootMatrix(P));
  if (S.wings) drawWings(g, P, S);
  drawTail(g, P, S, kind);
  const nearSide = sg;
  const farSide = -sg;
  const frontNear = aT > 0.3;
  // far arm (and both arms when facing front) behind the body
  drawArm(
    g,
    P,
    S,
    kind,
    farSide,
    P.arms[farSide < 0 ? "L" : "R"],
    false,
    -1,
    report,
  );
  if (!frontNear)
    drawArm(
      g,
      P,
      S,
      kind,
      nearSide,
      P.arms[nearSide < 0 ? "L" : "R"],
      false,
      -1,
      report,
    );
  drawFeet(g, P, S, kind);
  const body = drawBody(g, P, S, kind);
  if (frontNear)
    drawArm(
      g,
      P,
      S,
      kind,
      nearSide,
      P.arms[nearSide < 0 ? "L" : "R"],
      true,
      body,
      report,
    );
  const neck = [S.neck[0] + T * 3, S.neck[1] + P.sit * S.sitDrop + P.bob];
  const hc = [S.headC[0] + T * 4, S.headC[1] + P.sit * S.sitDrop + P.bob];
  g.save();
  g.apply(M.tr(neck[0], neck[1]));
  g.apply(M.rot(P.headTilt));
  g.apply(M.tr(-neck[0], -neck[1]));
  HEADS[kind](g, P, S, hc);
  g.restore();
  g.restore();
}
