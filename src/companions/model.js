// The four Gospel companions, drawn in code. Shared by the app
// (src/companions/canvas.js draws them with Canvas2D in a soft, dimensional
// style) and the film in video/. A character is a list of primitives built
// from a pose; nothing here touches the DOM.
//
// Primitive types: 0 ellipse, 1 tapered capsule, 2 round box, 3 arc stroke,
// 4 scallop, 5 trapezoid, 6 ellipse ring, 7 rounded triangle, 8 soft blob,
// 9 path (a smooth or rounded closed outline through control points).
//
// Primitives drawn inside one `g.merge(...)` share a merge group, lit as one
// form. Per primitive: `shade` (0 is a flat fill), `fx` (core shadow, bounce
// and rim light), `gloss` (a soft highlight), `ao` (a contact shadow cast
// on what is beneath) and `ol` (an optional thin edge).

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

// ---------- shape groups ----------
export class Group {
  constructor() {
    this.prims = [];
    this.m = M.id();
    this.stack = [];
    this.grp = -1;
    this.nextGrp = 0;
    this.line = null;
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
  // Everything drawn inside fn becomes one silhouette.
  merge(fn) {
    const prev = this.grp;
    this.grp = this.nextGrp++;
    const out = fn();
    this.grp = prev;
    return out;
  }
  world(x, y) {
    return M.ap(this.m, x, y);
  }
  push(type, x, y, ang, p, col, br, o = {}) {
    const line = o.line ?? this.line;
    this.prims.push({
      type,
      x,
      y,
      ang,
      p,
      col: typeof col === "string" ? hex(col) : col,
      shade: o.shade ?? 1,
      ol: o.ol ?? 0,
      clip: o.clip ?? -1,
      clipMode: o.clipMode ?? 1,
      alpha: o.alpha ?? 1,
      br,
      grp: o.grp ?? this.grp,
      line: line ? hex(line) : null,
      fx: o.fx ?? 1,
      gloss: o.gloss ?? 0,
      ao: o.ao ?? 0,
      pts: o.pts ?? null,
    });
    return this.prims.length - 1;
  }
  add(type, x, y, ang, p, col, br, o = {}) {
    const [wx, wy] = this.world(x, y);
    return this.push(type, wx, wy, ang + this.ang, p, col, br, o);
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
    const A = this.world(ax, ay),
      B = this.world(bx, by);
    const k = this.k;
    const len = Math.max(0.01, Math.hypot(B[0] - A[0], B[1] - A[1]));
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    return this.push(
      1,
      A[0],
      A[1],
      ang,
      [r1 * k, r2 * k, len, 0],
      col,
      len + Math.max(r1, r2) * k,
      o,
    );
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
  // A closed outline through control points [x, y, sharp?]: smooth by
  // default, or a polygon with rounded corners when o.round is given.
  path(points, col, o = {}) {
    const W = points.map(([x, y, s]) => [...this.world(x, y), s ? 1 : 0]);
    const cx = W.reduce((a, q) => a + q[0], 0) / W.length;
    const cy = W.reduce((a, q) => a + q[1], 0) / W.length;
    const pts = W.flatMap(([x, y, s]) => [x - cx, y - cy, s]);
    const br = Math.max(...W.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const rounded = o.round !== undefined;
    return this.push(
      9,
      cx,
      cy,
      0,
      [rounded ? o.round * this.k : 0, rounded ? 1 : 0, 0, 0],
      col,
      br,
      { ...o, pts },
    );
  }
}

// =====================================================================
// The companions: stylised, slightly grown-up proportions (about three
// heads tall), almond eyes with irises and lids, and soft dimensional
// forms. Modelled ~200 units tall with feet at y = 0. Screen x is to the
// right, y is down; side -1 is screen left.
// =====================================================================
export const WING = "#f3ece0";
const COVERT = "#fbf8f2";
const SCLERA = "#fbf8f4";
const PUPIL = "#170e0c";
const MOUTH = "#5a1a26";
const TONGUE = "#e46f7e";
const TEETH = "#fffaf2";
const GOLD = "#f2c14e";

export const SPEC = {
  leo: {
    body: "#eba23a",
    belly: "#ffe0a6",
    arm: "#eba23a",
    hand: "#ffd896",
    foot: "#ffd896",
    mane: "#bf511c",
    maneIn: "#df7a2c",
    ear: "#cf6a43",
    muzzle: "#ffe9c6",
    nose: "#3b1f18",
    iris: "#d48c18",
    line: "#3a1c15",
    brow: "#b8601f",
    tuft: "#bf511c",
    legR: [9, 8],
    bodyC: [0, -60],
    bodyR: [29, 40],
    shoulder: [
      [-20, -90],
      [20, -90],
    ],
    reach: 42,
    armR: [9, 8],
    handR: 9.5,
    footR: [12.5, 7.5],
    footX: 12,
    neck: [0, -102],
    headC: [0, -140],
    headR: 40,
    sitDrop: 9,
    wings: true,
    wingRoot: [12, -92],
  },
  lou: {
    body: "#b5683a",
    belly: "#f0d9bd",
    arm: "#b5683a",
    hand: "#3b2a24",
    foot: "#3b2a24",
    muzzle: "#e9b9a2",
    horn: "#f1e4c8",
    ear: "#e39b94",
    tuft: "#62301a",
    nostril: "#7c3d36",
    iris: "#6b3a1e",
    line: "#2e1610",
    brow: "#7a3e1e",
    legR: [10, 9],
    bodyC: [0, -62],
    bodyR: [33, 40],
    shoulder: [
      [-23, -92],
      [23, -92],
    ],
    reach: 42,
    armR: [10, 9],
    handR: 9,
    footR: [11, 7.5],
    footX: 14,
    neck: [0, -104],
    headC: [0, -142],
    headR: 42,
    sitDrop: 11,
    wings: true,
    wingRoot: [14, -94],
  },
  juno: {
    body: "#6d4126",
    belly: "#a5754a",
    arm: "#6d4126",
    hand: "#4f2c18",
    foot: "#f0b232",
    head: "#f6f3ee",
    beak: "#f7b52c",
    iris: "#e3a21a",
    line: "#2a1810",
    brow: "#f6f3ee",
    legR: [4.5, 4],
    bodyC: [0, -60],
    bodyR: [30, 42],
    shoulder: [
      [-21, -92],
      [21, -92],
    ],
    reach: 40,
    armR: [8, 11],
    handR: 10,
    footR: [12, 6],
    footX: 12,
    neck: [0, -102],
    headC: [0, -138],
    headR: 38,
    sitDrop: 11,
    wings: false,
    wingRoot: [0, 0],
  },
  mattie: {
    body: "#9d86dc",
    belly: null,
    arm: "#9d86dc",
    hand: "#d99a6c",
    foot: "#7a4a2c",
    mantle: "#6f58b8",
    skin: "#d99a6c",
    hair: "#2b1810",
    iris: "#5a3420",
    line: "#2a1612",
    brow: "#2b1810",
    legR: [5, 4.5],
    bodyC: [0, -56],
    bodyR: [27, 46],
    shoulder: [
      [-19, -96],
      [19, -96],
    ],
    reach: 44,
    armR: [5.5, 7.5],
    handR: 6.5,
    footR: [10.5, 5.5],
    footX: 10,
    neck: [0, -106],
    headC: [0, -144],
    headR: 36,
    sitDrop: 10,
    wings: true,
    wingRoot: [12, -96],
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
    b[0] + T * (near ? 6 : 40),
    b[1] + P.sit * S.sitDrop + P.bob - (near ? 0 : 4 * Math.abs(T)),
  ];
}
export function bodyLocal(S, P) {
  return {
    c: [S.bodyC[0] + P.turn * 4, S.bodyC[1] + P.sit * S.sitDrop + P.bob],
    r: [S.bodyR[0] * (1 - 0.08 * Math.abs(P.turn)), S.bodyR[1]],
  };
}

// A feather or lock: narrow root, full belly, pointed tip.
function feather(g, x, y, ang, len, wid, col, o = {}, sharp = true) {
  const c = Math.cos(ang),
    s = Math.sin(ang);
  const P = (u, v, sharp) => [x + c * u - s * v, y + s * u + c * v, sharp];
  return g.path(
    [
      P(-wid * 0.2, 0),
      P(len * 0.12, -wid * 0.5),
      P(len * 0.45, -wid),
      P(len * 0.82, -wid * 0.55),
      P(len, 0, sharp),
      P(len * 0.82, wid * 0.55),
      P(len * 0.45, wid),
      P(len * 0.12, wid * 0.5),
    ],
    col,
    o,
  );
}
// A closed outline from points relative to a centre and a size.
const shape = (g, cx, cy, R, pts, col, o, sx = 1) =>
  g.path(
    pts.map(([x, y, s]) => [cx + x * R * sx, cy + y * R, s]),
    col,
    o,
  );

// ---------- wings ----------
// One angel wing in its own frame: root at the origin, reaching out (+x)
// and up (-y). Long primaries fan from the wrist; coverts sit over them.
const PRIMARIES = [
  [50, -42, -0.62, 46, 7],
  [46, -35, -0.32, 48, 7.5],
  [40, -27, -0.02, 46, 7.5],
  [33, -19, 0.3, 41, 7.5],
  [25, -12, 0.62, 35, 7],
  [16, -5, 0.95, 28, 6.5],
];
const COVERTS = [
  [12, -2, 0.85, 22, 6],
  [22, -10, 0.55, 24, 6.5],
  [32, -19, 0.3, 24, 6.5],
  [42, -29, 0.05, 22, 6],
];
function drawWings(g, P, S) {
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  const root = [S.wingRoot[0], S.wingRoot[1] + P.sit * S.sitDrop + P.bob];
  const flap = P.flap + 0.04 * Math.sin(P.t * 2.3);
  for (const side of [-1, 1]) {
    const back = side === -sg;
    const sc = back ? 1 + 0.08 * aT : 1 - 0.5 * aT;
    g.save();
    g.apply(M.tr(side * root[0] - T * 14 * (back ? 1.2 : 0.6), root[1]));
    g.apply(M.sc(side * sc, 1));
    g.apply(M.rot(-0.22 - flap * 0.75));
    g.merge(() => {
      for (const [x, y, a, l, w] of PRIMARIES)
        feather(g, x, y, a, l, w * 1.4, WING);
    });
    g.merge(() => {
      g.path(
        [
          [-6, 8],
          [-6, -14],
          [12, -36],
          [38, -50],
          [56, -50],
          [56, -38],
          [40, -24],
          [22, -8],
          [6, 6],
        ],
        COVERT,
        { ao: 0.7 },
      );
      for (const [x, y, a, l, w] of COVERTS)
        feather(g, x, y, a, l, w * 1.3, COVERT, { ao: 0.5 });
    });
    g.restore();
  }
}

// ---------- tails ----------
function drawTail(g, P, S, kind) {
  if (kind === "mattie") return;
  const sg = P.turn >= 0 ? 1 : -1;
  const sw = Math.sin(P.t * 3.1 + P.tail) * 0.25;
  const sit = P.sit * S.sitDrop;
  if (kind === "juno") {
    const y0 = -40 + sit;
    g.merge(() => {
      for (const k of [1, -1, 0])
        feather(
          g,
          -sg * 6,
          y0,
          Math.PI / 2 + sg * (0.75 + k * 0.28) + sw * 0.2,
          40,
          8,
          S.head,
        );
    });
    return;
  }
  const bx = -sg * (S.bodyR[0] - 8);
  const y0 = -32 + sit;
  const p1 = [bx - sg * 18, y0 + 2 + sw * 6];
  const p2 = [bx - sg * 32, y0 - 12 + sw * 8];
  const p3 = [bx - sg * (36 + sw * 6), y0 - 32];
  g.merge(() => {
    g.capsule(bx, y0, p1[0], p1[1], 4, 3.6, S.body);
    g.capsule(p1[0], p1[1], p2[0], p2[1], 3.6, 3.3, S.body);
    g.capsule(p2[0], p2[1], p3[0], p3[1], 3.3, 3, S.body);
  });
  g.merge(() => {
    for (const a of [-2.3, -1.6, -0.9, -1.95, -1.25])
      feather(g, p3[0], p3[1] + 3, a - sg * 0.2, 15, 5, S.tuft, { ao: 0.5 });
  });
}

// ---------- arms ----------
// Arms with a paw, hoof, hand or feathered tip. A world target makes the
// hand land exactly there (contacts); otherwise an angle.
function drawArm(g, P, S, kind, side, spec, report) {
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
  const a0 = [s[0] - dir[0] * 6, s[1] - dir[1] * 6];
  const w = [s[0] + dir[0] * len, s[1] + dir[1] * len];
  const ang = Math.atan2(dir[1], dir[0]);
  const flip = side * (P.turn >= 0 ? 1 : -1) < 0 ? -1 : 1;
  const at = (d, u = 0) => [
    w[0] + dir[0] * d - dir[1] * u * flip,
    w[1] + dir[1] * d + dir[0] * u * flip,
  ];
  if (kind === "juno") {
    // a folded wing: flight feathers from the wrist, coverts over the arm
    g.merge(() => {
      for (const [u, da, l] of [
        [-5, -0.3, 22],
        [0, -0.08, 26],
        [5, 0.16, 22],
      ]) {
        const r = at(-12, u);
        feather(g, r[0], r[1], ang + da * flip, l, 5.5, S.hand);
      }
    });
    g.merge(() => {
      g.capsule(a0[0], a0[1], w[0], w[1], S.armR[0], S.armR[1], S.arm, {
        ao: 1,
      });
    });
    return;
  }
  if (kind === "mattie") {
    g.merge(() => {
      g.capsule(a0[0], a0[1], w[0], w[1], S.armR[0], S.armR[1], S.body, {
        ao: 1,
      });
      const c0 = at(-1, -S.armR[1]),
        c1 = at(-1, S.armR[1]);
      g.capsule(c0[0], c0[1], c1[0], c1[1], 1.3, 1.3, GOLD, { fx: 0 });
    });
    g.merge(() => {
      const h = at(6);
      const th = at(4, -5);
      g.circle(th[0], th[1], 2.6, S.skin);
      g.ellipse(h[0], h[1], S.handR, S.handR * 0.85, S.skin, { ang, ao: 0.6 });
    });
    return;
  }
  g.merge(() => {
    g.capsule(a0[0], a0[1], w[0], w[1], S.armR[0], S.armR[1], S.arm, {
      ao: 1,
    });
    const hc = at(S.handR * 0.35);
    g.ellipse(hc[0], hc[1], S.handR, S.handR * 0.88, S.hand, {
      ang,
      gloss: kind === "lou" ? 0.5 : 0,
    });
    if (kind === "lou") {
      const c0 = at(S.handR * 0.7),
        c1 = at(S.handR * 1.3);
      g.capsule(c0[0], c0[1], c1[0], c1[1], 0.8, 0.8, "#1c120e", {
        shade: 0,
      });
    }
  });
}

// ---------- legs and feet ----------
function footSpot(P, S, side) {
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  let fx = side * S.footX * (1 - 0.45 * aT) + T * 6;
  let fy = -S.footR[1] * 0.9;
  let lift = 0,
    ang = 0,
    rx = S.footR[0];
  const ry = S.footR[1];
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
  return { x: fx, y: fy - lift, ang, rx, ry, sg };
}
function drawLegs(g, P, S, kind) {
  const hipY = bodyLocal(S, P).c[1] + S.bodyR[1] * 0.55;
  for (const side of [-1, 1]) {
    const f = footSpot(P, S, side);
    const legCol =
      kind === "mattie" ? S.skin : kind === "juno" ? S.foot : S.body;
    g.merge(() => {
      g.capsule(f.x * 0.8, hipY, f.x, f.y - 3, S.legR[0], S.legR[1], legCol);
      if (kind === "lou") {
        g.box(f.x, f.y + 0.5, S.footR[0], S.footR[1], 5, S.foot, {
          ang: f.ang,
          gloss: 0.5,
        });
      } else if (kind === "juno") {
        for (const k of [-1, 0, 1])
          g.capsule(
            f.x,
            f.y,
            f.x + f.sg * 3 + k * 8,
            f.y + 3.5 - Math.abs(k) * 1.5,
            3.6,
            2.6,
            S.foot,
          );
      } else if (kind === "mattie") {
        g.ellipse(f.x + f.sg * 2, f.y + 1, f.rx, f.ry, S.skin, { ang: f.ang });
      } else {
        g.ellipse(f.x + f.sg, f.y, f.rx, f.ry, S.foot, { ang: f.ang });
      }
    });
    if (kind === "mattie")
      g.merge(() => {
        g.capsule(
          f.x - 9 + f.sg * 2,
          f.y + 5,
          f.x + 12 + f.sg * 2,
          f.y + 5,
          1.6,
          1.6,
          S.foot,
          {
            fx: 0,
          },
        );
        g.capsule(
          f.x - 4 + f.sg * 2,
          f.y - 4,
          f.x + 6 + f.sg * 2,
          f.y - 1,
          1.8,
          1.8,
          S.foot,
          {
            fx: 0,
          },
        );
      });
    if (kind === "juno")
      for (const k of [-1, 0, 1]) {
        const tx = f.x + f.sg * 3 + k * 8 + (k || f.sg) * 2.5;
        g.tri(tx, f.y + 3.5 - Math.abs(k) * 1.5, 3, 1.4, 0.4, "#2a1a12", {
          ang: Math.PI / 2 - (k || f.sg) * 0.6,
          shade: 0,
        });
      }
  }
}

// ---------- bodies ----------
const TORSO = [
  [-0.56, -1],
  [0.56, -1],
  [0.98, -0.32],
  [1.05, 0.5],
  [0.62, 1.08],
  [-0.62, 1.08],
  [-1.05, 0.5],
  [-0.98, -0.32],
];
function drawBody(g, P, S, kind) {
  const B = bodyLocal(S, P);
  const T = P.turn,
    aT = Math.abs(T);
  const [cx, cy] = B.c;
  const [rx, ry] = B.r;
  if (kind === "mattie") {
    let tunic;
    g.merge(() => {
      tunic = g.path(
        [
          [cx - 15 + T * 3, cy - 50],
          [cx + 15 + T * 3, cy - 50],
          [cx + 27, cy - 26],
          [cx + 36, cy + 44],
          [cx + T * 6, cy + 49],
          [cx - 36, cy + 44],
          [cx - 27, cy - 26],
        ],
        S.body,
        { ao: 0.6 },
      );
      const inT = { clip: tunic, clipMode: 2, fx: 0 };
      // folds
      for (const u of [-0.5, 0.05, 0.5])
        g.capsule(
          cx + u * 18 + T * 4,
          cy + 2,
          cx + u * 32 + T * 4,
          cy + 46,
          1.2,
          2.4,
          "#8670c8",
          {
            ...inT,
            shade: 0,
            alpha: 0.6,
          },
        );
      // V neck
      g.path(
        [
          [cx - 8 + T * 5, cy - 51, 1],
          [cx + 8 + T * 5, cy - 51, 1],
          [cx + T * 6, cy - 38, 1],
        ],
        S.skin,
        { ...inT, round: 3 },
      );
      // belt
      g.box(cx + T * 4, cy - 8, 40, 2.6, 2, GOLD, { ...inT, gloss: 0.6 });
      // a mantle over one shoulder, edged in gold
      g.path(
        [
          [cx - 28, cy - 30],
          [cx - 14, cy - 52],
          [cx + 2, cy - 48],
          [cx + 40, cy + 8],
          [cx + 36, cy + 30],
          [cx + 18, cy + 18],
        ],
        S.mantle,
        { clip: tunic, clipMode: 2, ao: 0.8 },
      );
      g.path(
        [
          [cx + 2, cy - 49],
          [cx + 5, cy - 49],
          [cx + 42, cy + 8],
          [cx + 39, cy + 10],
        ],
        GOLD,
        { clip: tunic, clipMode: 2, fx: 0, gloss: 0.5 },
      );
    });
    return tunic;
  }
  let torso;
  g.merge(() => {
    torso = shape(
      g,
      cx,
      cy,
      1,
      TORSO.map(([x, y]) => [x * rx, y * ry]),
      S.body,
      {
        gloss: 0.15,
      },
    );
    const inT = { clip: torso, clipMode: 2, fx: 0 };
    g.path(
      [
        [cx + T * rx * 0.3 - rx * 0.42, cy - ry * 0.55],
        [cx + T * rx * 0.3 + rx * 0.42, cy - ry * 0.55],
        [cx + T * rx * 0.3 + rx * 0.62, cy + ry * 0.45],
        [cx + T * rx * 0.3 + rx * 0.3, cy + ry * 1.0],
        [cx + T * rx * 0.3 - rx * 0.3, cy + ry * 1.0],
        [cx + T * rx * 0.3 - rx * 0.62, cy + ry * 0.45],
      ],
      S.belly,
      inT,
    );
    if (kind === "juno")
      for (const [u, v] of [
        [-0.3, -0.25],
        [0.05, -0.32],
        [0.38, -0.25],
        [-0.15, 0.05],
        [0.22, 0.05],
        [-0.3, 0.35],
        [0.05, 0.32],
        [0.38, 0.35],
      ])
        g.arc(
          cx + T * rx * 0.3 + u * rx,
          cy + v * ry,
          4.5,
          0.4,
          Math.PI - 0.4,
          0.9,
          "#7e5232",
          {
            clip: torso,
            clipMode: 2,
            alpha: 0.7,
          },
        );
  });
  return torso;
}

// ---------- faces ----------
// Almond eyes: a white, a coloured iris with a pupil and catch-light, an
// upper lid that settles a little over the eye, and a lash line. Brows,
// lids and mouth carry the expression.
export const FACES = {
  happy: { eyes: "open", brow: 0, lid: 0.07, mouth: "smile" },
  det: { eyes: "open", brow: 1, lid: 0.28, mouth: "flat" },
  strain: { eyes: "squeeze", brow: 1.2, lid: 0.3, mouth: "grit" },
  sad: { eyes: "open", brow: -1, lid: 0.22, mouth: "frown", lookDown: true },
  pant: { eyes: "open", brow: -0.4, lid: 0.45, mouth: "o" },
  wow: { eyes: "open", brow: -0.9, lid: 0, mouth: "o", wide: true },
  joy: { eyes: "happy", brow: -0.2, lid: 0, mouth: "beam" },
  grin: { eyes: "open", brow: -0.1, lid: 0.05, mouth: "beam" },
  idea: { eyes: "open", brow: -0.6, lid: 0.02, mouth: "open", wide: true },
};
const faceOf = (face) => FACES[face] || FACES.happy;
const isOpenMouth = (face) =>
  ["beam", "o", "open"].includes(faceOf(face).mouth);

function drawEyes(g, P, hc, R, o) {
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  const F = faceOf(P.face);
  const fx = T * 0.42 * R;
  const look = F.lookDown ? [P.look[0] * 0.5, 0.8] : P.look;
  const eyeY = hc[1] + (o.eyeY ?? 0) * R;
  const th = 0.03 * R;
  for (const side of [-1, 1]) {
    const near = side === sg || aT < 0.05;
    const squash = near ? 1 - 0.08 * aT : 1 - 0.45 * aT;
    const ex =
      hc[0] +
      fx +
      side * (o.eyeX ?? 0.37) * R * (near ? 1 - 0.12 * aT : 1 - 0.55 * aT);
    const big = F.wide ? 1.12 : 1;
    const w = (o.w ?? 0.155) * R * squash * big,
      h = (o.h ?? 0.14) * R * big;
    const s = side;
    // brow first, so the eye sits cleanly under it
    const by = eyeY - h - (o.browGap ?? 0.13) * R;
    const bIn = [ex - s * w * 0.8, by + F.brow * 0.05 * R];
    const bMid = [ex + s * w * 0.1, by - 0.035 * R - F.brow * 0.012 * R];
    const bOut = [ex + s * w * 1.0, by + 0.01 * R - F.brow * 0.02 * R];
    if (o.ridge) {
      g.merge(() =>
        g.path(
          [
            [bIn[0], bIn[1] + 0.04 * R],
            [bMid[0], bMid[1] - 0.05 * R],
            [bOut[0] + s * 0.06 * R, bOut[1] - 0.02 * R],
            [bOut[0], bOut[1] + 0.07 * R],
            [bMid[0], bMid[1] + 0.06 * R],
          ],
          o.brow,
          { ao: 0.8 },
        ),
      );
    } else {
      g.capsule(
        bIn[0],
        bIn[1],
        bMid[0],
        bMid[1],
        th * 1.05,
        th * 0.95,
        o.brow,
        { shade: 0 },
      );
      g.capsule(
        bMid[0],
        bMid[1],
        bOut[0],
        bOut[1],
        th * 0.95,
        th * 0.55,
        o.brow,
        { shade: 0 },
      );
    }
    let blink = P.blink;
    if (F.eyes === "happy") {
      g.arc(
        ex,
        eyeY + h * 0.9,
        w * 1.05,
        Math.PI + 0.55,
        TAU - 0.55,
        th * 1.1,
        o.line,
      );
      continue;
    }
    if (F.eyes === "squeeze") {
      const d = s * w;
      g.capsule(ex - d, eyeY - h * 0.7, ex + d * 0.5, eyeY, th, th, o.line, {
        shade: 0,
      });
      g.capsule(ex + d * 0.5, eyeY, ex - d, eyeY + h * 0.7, th, th, o.line, {
        shade: 0,
      });
      continue;
    }
    if (blink > 0.85) {
      g.arc(ex, eyeY - h * 0.6, w * 1.0, 0.45, Math.PI - 0.45, th, o.line);
      continue;
    }
    const eye = g.path(
      [
        [ex - s * w, eyeY + 0.15 * h, 1],
        [ex - s * 0.45 * w, eyeY - 1.15 * h],
        [ex + s * 0.5 * w, eyeY - 1.2 * h],
        [ex + s * w, eyeY - 0.15 * h, 1],
        [ex + s * 0.5 * w, eyeY + 1.05 * h],
        [ex - s * 0.4 * w, eyeY + 1.05 * h],
      ],
      SCLERA,
      { fx: 0, shade: 0 },
    );
    const inEye = { clip: eye, clipMode: 2 };
    const ix = ex + clamp(look[0], -1, 1) * w * 0.32,
      iy = eyeY + 0.05 * h + clamp(look[1], -1, 1) * h * 0.25;
    g.circle(ix, iy, h * 0.98, o.iris, { ...inEye, fx: 0 });
    g.circle(ix, iy, h * 0.52, PUPIL, { ...inEye, shade: 0 });
    g.circle(ix - h * 0.32, iy - h * 0.36, h * 0.26, "#ffffff", {
      ...inEye,
      shade: 0,
    });
    g.circle(ix + h * 0.38, iy + h * 0.3, h * 0.1, "#ffffff", {
      ...inEye,
      shade: 0,
      alpha: 0.8,
    });
    // the lid's shadow on the eye, then the lid itself
    const lid = clamp(Math.max(F.lid, blink));
    const edge = eyeY - h * 0.95 + h * 2.0 * lid;
    g.soft(ex, edge + h * 0.15, w * 1.2, h * 0.5, "#4a2a3a", {
      ...inEye,
      alpha: 0.35,
      core: 0.1,
    });
    const top = eyeY - h * 1.5;
    g.box(
      ex,
      (top + edge) / 2,
      w * 1.3,
      Math.max(0.01, (edge - top) / 2),
      0,
      o.skin,
      {
        ...inEye,
        shade: 0,
      },
    );
    // lash line along the lid, with a small flick at the outer corner
    const A = [ex - s * w * 1.02, eyeY + 0.12 * h];
    const B = [ex - s * w * 0.35, Math.min(edge, eyeY - 0.1 * h) - h * 0.05];
    const C = [ex + s * w * 0.45, Math.min(edge, eyeY - 0.15 * h) - h * 0.05];
    const D = [ex + s * w * 1.12, eyeY - 0.3 * h];
    g.capsule(A[0], A[1], B[0], B[1], th * 0.55, th * 0.9, o.line, {
      shade: 0,
    });
    g.capsule(B[0], B[1], C[0], C[1], th * 0.9, th * 1.0, o.line, { shade: 0 });
    g.capsule(C[0], C[1], D[0], D[1], th * 1.0, th * 0.45, o.line, {
      shade: 0,
    });
  }
}

// mouth at (mx, my) with half-width mw
function drawMouth(g, face, mx, my, mw, line, R, smirk = 0.15) {
  const F = faceOf(face);
  const th = 0.026 * R;
  if (F.mouth === "smile") {
    g.arc(mx + mw * smirk, my - mw * 0.75, mw, 0.6, Math.PI - 0.45, th, line);
  } else if (F.mouth === "flat")
    g.capsule(mx - mw * 0.5, my, mx + mw * 0.5, my - mw * 0.05, th, th, line, {
      shade: 0,
    });
  else if (F.mouth === "frown")
    g.arc(mx, my + mw * 0.75, mw * 0.75, Math.PI + 0.6, TAU - 0.6, th, line);
  else if (F.mouth === "beam" || F.mouth === "open") {
    const h = F.mouth === "open" ? 1.0 : 0.8;
    const m = g.path(
      [
        [mx - mw, my - mw * 0.2, 1],
        [mx + mw * 1.05, my - mw * 0.28, 1],
        [mx + mw * 0.8, my + mw * h * 0.65],
        [mx, my + mw * h],
        [mx - mw * 0.75, my + mw * h * 0.6],
      ],
      MOUTH,
      { shade: 0, ao: 0.4 },
    );
    g.box(mx, my - mw * 0.1, mw * 1.2, mw * 0.18, 1, TEETH, {
      clip: m,
      clipMode: 2,
      shade: 0,
    });
    g.ellipse(mx + mw * 0.1, my + mw * h * 0.85, mw * 0.55, mw * 0.32, TONGUE, {
      clip: m,
      clipMode: 2,
      fx: 0,
    });
  } else if (F.mouth === "o") {
    const m = g.ellipse(mx, my + mw * 0.2, mw * 0.36, mw * 0.46, MOUTH, {
      shade: 0,
    });
    g.ellipse(mx, my + mw * 0.55, mw * 0.26, mw * 0.18, TONGUE, {
      clip: m,
      clipMode: 2,
      shade: 0,
    });
  } else if (F.mouth === "grit") {
    g.box(mx, my, mw * 0.85, mw * 0.3, 3, TEETH, { shade: 0, ol: 0.8, line });
  }
}

// ---------- heads ----------
const LION_FACE = [
  [0, -0.94],
  [0.62, -0.84],
  [0.96, -0.24],
  [0.92, 0.36],
  [0.6, 0.84],
  [0, 0.96],
  [-0.6, 0.84],
  [-0.92, 0.36],
  [-0.96, -0.24],
  [-0.62, -0.84],
];
const OX_FACE = [
  [0, -0.9],
  [0.72, -0.84],
  [1.0, -0.34],
  [0.94, 0.26],
  [0.7, 0.78],
  [0, 0.92],
  [-0.7, 0.78],
  [-0.94, 0.26],
  [-1.0, -0.34],
  [-0.72, -0.84],
];
const ROUND_FACE = [
  [0, -1],
  [0.72, -0.8],
  [1, -0.12],
  [0.86, 0.48],
  [0.5, 0.86],
  [0, 0.96],
  [-0.5, 0.86],
  [-0.86, 0.48],
  [-1, -0.12],
  [-0.72, -0.8],
];
const HUMAN_FACE = [
  [0, -0.96],
  [0.7, -0.82],
  [0.92, -0.2],
  [0.86, 0.36],
  [0.56, 0.82],
  [0, 1.0],
  [-0.56, 0.82],
  [-0.86, 0.36],
  [-0.92, -0.2],
  [-0.7, -0.82],
];
const HEADS = {
  leo(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    const mc = [hc[0] - T * 0.16 * R, hc[1] + 0.04 * R];
    // a mane of swept locks: an outer ring, then a lighter inner ring
    g.merge(() => {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - Math.PI / 2 + 0.1;
        const len = R * (0.82 + 0.1 * hash(i, 5));
        feather(
          g,
          mc[0] + Math.cos(a) * R * 0.6,
          mc[1] + Math.sin(a) * R * 0.62,
          a + 0.62,
          len,
          R * 0.42,
          S.mane,
          {},
          false,
        );
      }
    });
    g.merge(() => {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - Math.PI / 2 + 0.4;
        feather(
          g,
          mc[0] + Math.cos(a) * R * 0.58,
          mc[1] + Math.sin(a) * R * 0.6,
          a + 0.7,
          R * (0.48 + 0.08 * hash(i, 9)),
          R * 0.34,
          S.maneIn,
          { ao: 0.5 },
          false,
        );
      }
    });
    for (const side of [-1, 1]) {
      const e = [
        hc[0] + side * 0.66 * R * (1 - 0.25 * aT) - T * 0.1 * R,
        hc[1] - 0.68 * R,
      ];
      g.merge(() => {
        const ear = g.circle(e[0], e[1], 0.21 * R, S.body, { ao: 0.6 });
        g.ellipse(
          e[0] + side * 0.02 * R,
          e[1] + 0.02 * R,
          0.11 * R,
          0.1 * R,
          S.ear,
          {
            clip: ear,
            clipMode: 2,
            fx: 0,
          },
        );
      });
    }
    g.merge(() =>
      shape(
        g,
        hc[0],
        hc[1],
        R,
        LION_FACE,
        S.body,
        { ao: 1, gloss: 0.18 },
        1 - 0.05 * aT,
      ),
    );
    const mz = [hc[0] + fx * 1.15, hc[1] + 0.4 * R];
    g.merge(() => {
      for (const side of [-1, 1])
        g.ellipse(
          mz[0] + side * 0.15 * R * (1 - 0.25 * aT),
          mz[1],
          0.2 * R,
          0.15 * R,
          S.muzzle,
          {
            ao: 0.5,
          },
        );
      g.ellipse(mz[0], mz[1] + 0.16 * R, 0.12 * R, 0.08 * R, S.muzzle);
    });
    drawEyes(g, P, hc, R, {
      eyeY: -0.08,
      skin: S.body,
      iris: S.iris,
      brow: S.brow,
      line: S.line,
    });
    const F = faceOf(P.face);
    if (isOpenMouth(P.face))
      drawMouth(g, P.face, mz[0], mz[1] + 0.14 * R, 0.13 * R, S.line, R, 0);
    else if (F.mouth === "frown")
      g.arc(
        mz[0],
        mz[1] + 0.25 * R,
        0.09 * R,
        Math.PI + 0.5,
        TAU - 0.5,
        0.026 * R,
        S.line,
      );
    else {
      g.capsule(
        mz[0],
        mz[1] - 0.02 * R,
        mz[0],
        mz[1] + 0.06 * R,
        0.022 * R,
        0.022 * R,
        S.line,
        {
          shade: 0,
        },
      );
      for (const side of [-1, 1])
        g.arc(
          mz[0] + side * 0.075 * R,
          mz[1] + 0.02 * R,
          0.075 * R,
          side < 0 ? 0.35 : 0.2,
          Math.PI - (side < 0 ? 0.2 : 0.35),
          0.024 * R,
          S.line,
        );
    }
    g.merge(() =>
      g.path(
        [
          [mz[0] - 0.13 * R, mz[1] - 0.15 * R],
          [mz[0] + 0.13 * R, mz[1] - 0.15 * R],
          [mz[0] + 0.03 * R, mz[1] + 0.01 * R],
          [mz[0] - 0.03 * R, mz[1] + 0.01 * R],
        ],
        S.nose,
        { gloss: 0.7, ao: 0.6 },
      ),
    );
  },
  lou(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    // crescent horns
    for (const side of [-1, 1]) {
      const bx = hc[0] - T * 0.2 * R;
      const sx = side * (1 - 0.25 * aT);
      g.merge(() =>
        g.path(
          [
            [bx + sx * 0.36 * R, hc[1] - 0.6 * R],
            [bx + sx * 0.62 * R, hc[1] - 0.74 * R],
            [bx + sx * 0.84 * R, hc[1] - 0.84 * R],
            [bx + sx * 0.96 * R, hc[1] - 1.12 * R, 1],
            [bx + sx * 0.78 * R, hc[1] - 0.98 * R],
            [bx + sx * 0.58 * R, hc[1] - 0.92 * R],
            [bx + sx * 0.4 * R, hc[1] - 0.86 * R],
          ],
          S.horn,
          { gloss: 0.4 },
        ),
      );
    }
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      const ex = hc[0] - T * 0.12 * R;
      const k = near ? 1 - 0.15 * aT : 1 - 0.45 * aT;
      g.merge(() => {
        const ear = g.path(
          [
            [ex + side * 0.8 * R * k, hc[1] - 0.36 * R],
            [ex + side * 1.18 * R * k, hc[1] - 0.4 * R],
            [ex + side * 1.42 * R * k, hc[1] - 0.24 * R, 1],
            [ex + side * 1.16 * R * k, hc[1] - 0.06 * R],
            [ex + side * 0.8 * R * k, hc[1] - 0.1 * R],
          ],
          S.body,
          { ao: 0.6 },
        );
        g.ellipse(
          ex + side * 1.1 * R * k,
          hc[1] - 0.22 * R,
          0.2 * R * k,
          0.07 * R,
          S.ear,
          {
            clip: ear,
            clipMode: 2,
            fx: 0,
            ang: side * 0.15,
          },
        );
      });
    }
    let head;
    g.merge(() => {
      head = shape(
        g,
        hc[0],
        hc[1],
        R,
        OX_FACE,
        S.body,
        { ao: 1, gloss: 0.15 },
        1 - 0.05 * aT,
      );
      g.path(
        [
          [hc[0] + fx * 0.6, hc[1] - 0.92 * R],
          [hc[0] + fx * 0.6 + 0.16 * R, hc[1] - 0.62 * R],
          [hc[0] + fx * 0.8 + 0.07 * R, hc[1] - 0.28 * R],
          [hc[0] + fx * 0.85, hc[1] - 0.16 * R, 1],
          [hc[0] + fx * 0.8 - 0.07 * R, hc[1] - 0.28 * R],
          [hc[0] + fx * 0.6 - 0.16 * R, hc[1] - 0.62 * R],
        ],
        S.belly,
        { clip: head, clipMode: 2, fx: 0 },
      );
    });
    g.merge(() => {
      for (const [da, l] of [
        [-0.55, 0.32],
        [-0.2, 0.38],
        [0.15, 0.36],
        [0.5, 0.3],
      ])
        feather(
          g,
          hc[0] + fx * 0.5 - T * 0.05 * R + da * 0.12 * R,
          hc[1] - 0.8 * R,
          -Math.PI / 2 + da + 0.25,
          l * R,
          0.12 * R,
          S.tuft,
          { ao: 0.5 },
        );
    });
    drawEyes(g, P, hc, R, {
      eyeY: -0.16,
      eyeX: 0.39,
      skin: S.body,
      iris: S.iris,
      brow: S.brow,
      line: S.line,
    });
    const mz = [hc[0] + fx * 1.15, hc[1] + 0.48 * R];
    g.merge(() =>
      g.ellipse(mz[0], mz[1], 0.62 * R * (1 - 0.18 * aT), 0.38 * R, S.muzzle, {
        ao: 0.8,
        gloss: 0.2,
      }),
    );
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      g.ellipse(
        mz[0] + side * 0.25 * R * (near ? 1 : 0.6),
        mz[1] - 0.1 * R,
        0.055 * R,
        0.085 * R,
        S.nostril,
        {
          fx: 0,
          ang: side * 0.4,
        },
      );
    }
    drawMouth(g, P.face, mz[0], mz[1] + 0.18 * R, 0.17 * R, S.line, R);
  },
  juno(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    const sg = T >= 0 ? 1 : -1;
    // swept-back crest
    g.merge(() => {
      for (const [dx, a, l] of [
        [-0.2, -2.15, 0.62],
        [0.0, -1.85, 0.7],
        [0.18, -1.55, 0.6],
      ])
        feather(
          g,
          hc[0] - T * 0.3 * R + dx * R,
          hc[1] - 0.55 * R,
          a - T * 0.5,
          l * R,
          0.16 * R,
          S.head,
        );
    });
    // neck feathers over the body
    g.merge(() => {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.22 + (i / 6) * 0.56);
        feather(
          g,
          hc[0] + Math.cos(a) * 0.5 * R,
          hc[1] + Math.sin(a) * 0.5 * R,
          a,
          0.62 * R,
          0.2 * R,
          S.head,
          { ao: 0.8 },
        );
      }
    });
    g.merge(() =>
      shape(
        g,
        hc[0],
        hc[1],
        R,
        ROUND_FACE,
        S.head,
        { ao: 0.6, gloss: 0.15 },
        1 - 0.04 * aT,
      ),
    );
    drawEyes(g, P, hc, R, {
      eyeY: -0.12,
      eyeX: 0.39,
      skin: S.head,
      iris: S.iris,
      brow: S.brow,
      line: S.line,
      ridge: true,
      browGap: 0.1,
    });
    // hooked beak, morphing from front view to profile with the turn
    const open = isOpenMouth(P.face);
    const bx = hc[0] + fx * 1.25,
      by = hc[1] + 0.1 * R;
    const u = clamp(aT * 1.4);
    const front = [
      [-0.3, -0.08],
      [-0.14, -0.18],
      [0.14, -0.18],
      [0.3, -0.08],
      [0.22, 0.14],
      [0.07, 0.34],
      [0, 0.44, 1],
      [-0.07, 0.34],
      [-0.22, 0.14],
    ];
    const side = [
      [-0.14, -0.06],
      [-0.02, -0.19],
      [0.28, -0.18],
      [0.52, -0.04],
      [0.56, 0.18],
      [0.48, 0.34],
      [0.42, 0.38, 1],
      [0.38, 0.2],
      [-0.08, 0.15],
    ];
    const jx = bx + sg * u * 0.2 * R;
    g.merge(() => {
      if (open) {
        const m = g.ellipse(jx, by + 0.22 * R, 0.19 * R, 0.19 * R, MOUTH, {
          shade: 0,
        });
        g.ellipse(jx, by + 0.34 * R, 0.11 * R, 0.07 * R, TONGUE, {
          shade: 0,
          clip: m,
          clipMode: 2,
        });
        g.ellipse(jx, by + 0.4 * R, 0.16 * R, 0.07 * R, "#e09a1e", {});
      } else g.ellipse(jx, by + 0.25 * R, 0.16 * R, 0.07 * R, "#e09a1e", {});
    });
    g.merge(() =>
      g.path(
        front.map((f, i) => [
          bx + lerp(f[0] * sg, side[i][0] * sg, u) * R * 1.12,
          by + lerp(f[1], side[i][1], u) * R * 1.12,
          f[2],
        ]),
        S.beak,
        { gloss: 0.6, ao: 0.8 },
      ),
    );
    g.ellipse(
      bx + sg * u * 0.12 * R - 0.06 * R * (1 - u),
      by - 0.04 * R,
      0.022 * R,
      0.032 * R,
      "#9a5f12",
      {
        shade: 0,
      },
    );
    if (!open && faceOf(P.face).mouth === "frown")
      g.arc(
        bx,
        by + 0.48 * R,
        0.08 * R,
        Math.PI + 0.5,
        TAU - 0.5,
        0.026 * R,
        S.line,
      );
  },
  mattie(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    // curls behind the face
    g.merge(() => {
      const n = 15;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.78 + (i / (n - 1)) * Math.PI * 1.44;
        const wob = 0.9 + 0.2 * hash(i, 3);
        g.circle(
          hc[0] - T * 0.15 * R + Math.cos(a) * R * 0.86,
          hc[1] - 0.1 * R + Math.sin(a) * R * 0.84,
          R * 0.27 * wob,
          S.hair,
        );
      }
    });
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      if (!near && aT > 0.5) continue;
      g.merge(() =>
        g.ellipse(
          hc[0] + side * 0.88 * R * (near ? 1 - 0.1 * aT : 0.7) - T * 0.1 * R,
          hc[1] + 0.12 * R,
          0.12 * R,
          0.16 * R,
          S.skin,
          {
            ao: 0.5,
          },
        ),
      );
    }
    g.merge(() =>
      shape(
        g,
        hc[0],
        hc[1],
        R,
        HUMAN_FACE,
        S.skin,
        { ao: 1, gloss: 0.12 },
        1 - 0.04 * aT,
      ),
    );
    // curls along the hairline
    g.merge(() => {
      for (const [dx, dy, r] of [
        [-0.7, -0.5, 0.2],
        [-0.48, -0.72, 0.24],
        [-0.18, -0.86, 0.26],
        [0.14, -0.86, 0.25],
        [0.44, -0.74, 0.24],
        [0.68, -0.52, 0.2],
      ])
        g.circle(
          hc[0] + fx * 0.4 + dx * R * (1 - 0.1 * aT),
          hc[1] + dy * R,
          r * R,
          S.hair,
          { ao: 0.7 },
        );
    });
    drawEyes(g, P, hc, R, {
      eyeY: 0.04,
      eyeX: 0.37,
      w: 0.19,
      h: 0.13,
      skin: S.skin,
      iris: S.iris,
      brow: S.brow,
      line: S.line,
      browGap: 0.11,
    });
    g.merge(() =>
      g.ellipse(
        hc[0] + fx * 1.25,
        hc[1] + 0.3 * R,
        0.07 * R,
        0.06 * R,
        S.skin,
        { ao: 0.6 },
      ),
    );
    drawMouth(
      g,
      P.face,
      hc[0] + fx * 1.15,
      hc[1] + 0.56 * R,
      0.17 * R,
      S.line,
      R,
    );
    const hb = Math.sin(P.t * 2.2) * 2;
    g.ring(hc[0] + fx * 0.15, hc[1] - R - 20 + hb, 28, 7, 2.8, GOLD, {});
  },
};

export function drawCharacter(g, kind, P, report) {
  if (!P.visible) return;
  const S = SPEC[kind];
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  const k = P.k ?? 1;
  // a soft contact shadow that stays on the ground through a hop
  g.save();
  g.apply(M.mul(M.tr(P.x, P.y), M.sc(k, k)));
  const up = clamp(P.lift / (70 * k));
  g.soft(T * 4, -1, 42 * (1 - 0.35 * up), 7 * (1 - 0.35 * up), "#120822", {
    alpha: 0.32 * (1 - 0.6 * up),
    core: 0.35,
  });
  g.restore();
  g.save();
  g.apply(rootMatrix(P));
  if (S.wings) drawWings(g, P, S);
  drawTail(g, P, S, kind);
  const arm = (side) => P.arms[side < 0 ? "L" : "R"];
  const turned = aT > 0.3;
  if (turned) drawArm(g, P, S, kind, -sg, arm(-sg), report);
  drawLegs(g, P, S, kind);
  drawBody(g, P, S, kind);
  if (kind === "mattie")
    g.merge(() =>
      g.capsule(
        S.neck[0] + T * 3,
        S.neck[1] + P.sit * S.sitDrop + P.bob,
        S.neck[0] + T * 3,
        S.neck[1] + 10 + P.sit * S.sitDrop + P.bob,
        6,
        6.5,
        S.skin,
        {
          fx: 0,
        },
      ),
    );
  if (!turned) drawArm(g, P, S, kind, -sg, arm(-sg), report);
  drawArm(g, P, S, kind, sg, arm(sg), report);
  const neck = [S.neck[0] + T * 3, S.neck[1] + P.sit * S.sitDrop + P.bob];
  const hc = [S.headC[0] + T * 4, S.headC[1] + P.sit * S.sitDrop + P.bob];
  g.save();
  g.apply(M.tr(neck[0] + (P.headX || 0), neck[1] + (P.headY || 0)));
  g.apply(M.rot(P.headTilt));
  g.apply(M.tr(-neck[0], -neck[1]));
  HEADS[kind](g, P, S, hc);
  g.restore();
  if (P.effects) drawEmotes(g, P);
  g.restore();
}

// Little sparkles (celebrating) and hearts (affection) drifting up.
function drawEmotes(g, P) {
  const { sparkles = 0, hearts = 0, phase = 0 } = P.effects;
  for (let i = 0; i < 4 && sparkles > 0.02; i++) {
    const drift = (phase * 0.34 + i * 0.27) % 1;
    const a = sparkles * Math.sin(drift * Math.PI);
    if (a < 0.02) continue;
    g.save();
    g.apply(M.tr(Math.sin(i * 2.7 + phase * 0.5) * 78, -96 - drift * 110));
    g.apply(M.rot(phase * 2 + i));
    g.merge(() =>
      g.scallop(0, 0, 2.5 * a, 9 * a, 4, 0, i % 2 ? "#c9b8ff" : GOLD, {
        gloss: 0.5,
      }),
    );
    g.restore();
  }
  for (let i = 0; i < 3 && hearts > 0.02; i++) {
    const drift = (phase * 0.42 + i * 0.33) % 1;
    const a = hearts * Math.sin(drift * Math.PI);
    if (a < 0.02) continue;
    const x = Math.sin(i * 2.1 + phase * 0.6) * 60;
    const y = -120 - drift * 80;
    g.merge(() => {
      g.circle(x - 4 * a, y, 5 * a, "#ef7f9f");
      g.circle(x + 4 * a, y, 5 * a, "#ef7f9f");
      g.tri(x, y + 2 * a, 10 * a, 8.5 * a, 1.5 * a, "#ef7f9f", {
        ang: Math.PI / 2,
      });
    });
  }
}
