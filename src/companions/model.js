// The four Gospel companions as flat 2D cartoon characters. Shared by the
// app (src/companions/canvas.js draws them with Canvas2D) and the film in
// video/. A character is a list of primitives built from a pose; nothing
// here touches the DOM.
//
// Primitive types: 0 ellipse, 1 tapered capsule, 2 round box, 3 arc stroke,
// 4 scallop, 5 trapezoid, 6 ellipse ring, 7 rounded triangle, 8 soft blob,
// 9 path (a smooth or rounded closed outline through control points).
//
// Primitives drawn inside one `g.merge(...)` share a merge group: they read
// as one silhouette with a single outline, so a character is a few clean
// shapes (head, body, wing) rather than a pile of outlined parts.

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
    let crease = o.crease ?? null;
    if (Array.isArray(crease)) {
      const a = this.world(crease[0], crease[1]);
      const b = this.world(crease[2], crease[3]);
      crease = [a[0], a[1], b[0], b[1]];
    }
    const line = o.line ?? this.line;
    this.prims.push({
      type,
      x,
      y,
      ang,
      p,
      col: typeof col === "string" ? hex(col) : col,
      shade: o.shade ?? 1,
      ol: o.ol ?? 2.6,
      clip: o.clip ?? -1,
      clipMode: o.clipMode ?? 1,
      alpha: o.alpha ?? 1,
      br,
      grp: o.grp ?? this.grp,
      line: line ? hex(line) : null,
      rim: o.rim ?? 0,
      crease,
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
    // crease: true on a capsule fades its edge in from the root end
    const crease =
      o.crease === "root"
        ? [ax, ay, ax + (bx - ax) * 0.5, ay + (by - ay) * 0.5]
        : o.crease;
    return this.push(
      1,
      A[0],
      A[1],
      ang,
      [r1 * k, r2 * k, len, 0],
      col,
      len + Math.max(r1, r2) * k,
      { ...o, crease },
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
// The companions: chibi proportions (big head, small soft body, stubby
// limbs), modelled ~200 units tall with feet at y = 0. Screen x is to the
// right, y is down; side -1 is screen left.
// =====================================================================
export const WING = "#fff6e6";
const WING_LINE = "#8f6c58";
const EYE = "#2b1813";
const EYE_GLOW = "#7c4529";
const MOUTH = "#7d2433";
const TONGUE = "#f37f8e";
const BLUSH = "#ff8b8b";

export const SPEC = {
  leo: {
    line: "#7c3a15",
    body: "#f6b63e",
    belly: "#fff0cd",
    arm: "#f6b63e",
    hand: "#ffe4ab",
    foot: "#ffe4ab",
    mane: "#e3792a",
    tuft: "#d0661f",
    ear: "#f59a62",
    nose: "#6b2d1d",
    brow: "#c4621c",
    freckle: "#e6a463",
    bodyC: [0, -50],
    bodyR: [36, 42],
    shoulder: [
      [-25, -78],
      [25, -78],
    ],
    reach: 40,
    armR: [11.5, 10.5],
    handR: 12,
    footR: [15, 10],
    footX: 16,
    neck: [0, -94],
    headC: [0, -136],
    headR: 48,
    sitDrop: 9,
    wings: true,
    wingRoot: [18, -84],
  },
  lou: {
    line: "#4f2413",
    body: "#c97a45",
    belly: "#f8e4c6",
    arm: "#c97a45",
    hand: "#6a4030",
    foot: "#5a3424",
    muzzle: "#f7cdb6",
    horn: "#f6ead2",
    ear: "#f2a2a0",
    tuft: "#7a3e1f",
    patch: "#a65a2e",
    nostril: "#9a4c45",
    brow: "#6e3a1d",
    bodyC: [0, -60],
    bodyR: [38, 42],
    shoulder: [
      [-27, -86],
      [27, -86],
    ],
    reach: 40,
    armR: [12, 11],
    handR: 11,
    footR: [13, 9],
    footX: 17,
    neck: [0, -100],
    headC: [0, -140],
    headR: 50,
    sitDrop: 11,
    wings: true,
    wingRoot: [20, -90],
    legs: true,
  },
  juno: {
    line: "#3f2414",
    body: "#8a5532",
    belly: "#b47e4f",
    arm: "#7d4a2a",
    hand: "#5e341c",
    foot: "#f4b534",
    head: "#fbf7ef",
    beak: "#ffbd2e",
    brow: "#6b4426",
    bodyC: [0, -54],
    bodyR: [34, 44],
    shoulder: [
      [-24, -84],
      [24, -84],
    ],
    reach: 38,
    armR: [9, 13.5],
    handR: 12,
    footR: [14, 7],
    footX: 14,
    neck: [0, -98],
    headC: [0, -134],
    headR: 46,
    sitDrop: 11,
    wings: false,
    wingRoot: [0, 0],
  },
  mattie: {
    line: "#4a2a20",
    body: "#b9a0ea",
    belly: null,
    arm: "#b9a0ea",
    hand: "#f7c6a0",
    foot: "#8a5232",
    robeLine: "#4b3677",
    robeDark: "#9d84d8",
    skin: "#f7c6a0",
    skinLine: "#8f4f33",
    hair: "#5b321f",
    hairHi: "#87532f",
    sash: "#f0c95c",
    halo: "#f3cf5e",
    brow: "#4a2614",
    bodyC: [0, -54],
    bodyR: [34, 42],
    shoulder: [
      [-19, -88],
      [19, -88],
    ],
    reach: 38,
    armR: [8.5, 11.5],
    handR: 8.5,
    footR: [12, 7],
    footX: 13,
    neck: [0, -100],
    headC: [0, -142],
    headR: 47,
    sitDrop: 10,
    wings: true,
    wingRoot: [16, -88],
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
    b[0] + T * (near ? 6 : 46),
    b[1] + P.sit * S.sitDrop + P.bob - (near ? 0 : 4 * Math.abs(T)),
  ];
}
export function bodyLocal(S, P) {
  return {
    c: [S.bodyC[0] + P.turn * 4, S.bodyC[1] + P.sit * S.sitDrop + P.bob],
    r: [S.bodyR[0] * (1 - 0.08 * Math.abs(P.turn)), S.bodyR[1]],
  };
}

// ---------- wings ----------
// One angel wing in its own frame: root at the origin, reaching out (+x)
// and up (-y). A soft covert shape over a scalloped row of feathers; the
// covert's lower edge shows inside the wing as the one feather line.
const COVERT = [
  [-6, 10],
  [-7, -12],
  [6, -34],
  [28, -50],
  [52, -57],
  [68, -52],
  [68, -38],
  [52, -24],
  [32, -10],
  [14, 4],
];
const SCALLOPS = [
  [64, -32, 9.5],
  [55, -18, 10.5],
  [42, -6, 11],
  [27, 4, 10.5],
  [12, 10, 9],
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
    g.apply(M.sc(side * sc * 1.2, 1.2));
    g.apply(M.rot(-0.18 - flap * 0.75));
    g.merge(() => {
      for (const [x, y, r] of SCALLOPS)
        g.circle(x, y, r, WING, { line: WING_LINE });
      g.path(COVERT, WING, {
        line: WING_LINE,
        crease: [8, -20, 40, -14],
        rim: 0.6,
      });
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
    const y0 = -26 + sit;
    const bx = -sg * 10;
    g.merge(() => {
      for (const k of [1, -1, 0]) {
        const a = Math.PI / 2 + sg * (0.85 + k * 0.34) + sw * 0.2;
        g.capsule(
          bx,
          y0,
          bx + Math.cos(a) * 34,
          y0 + Math.sin(a) * 30,
          9,
          8.5,
          S.head,
        );
      }
    });
    return;
  }
  const bx = -sg * (S.bodyR[0] - 10);
  const y0 = -24 + sit;
  const p1 = [bx - sg * 20, y0 - 2 + sw * 6];
  const p2 = [bx - sg * 34, y0 - 18 + sw * 8];
  const p3 = [bx - sg * (37 + sw * 6), y0 - 38];
  g.merge(() => {
    g.capsule(bx, y0, p1[0], p1[1], 5, 4.6, S.body);
    g.capsule(p1[0], p1[1], p2[0], p2[1], 4.6, 4.2, S.body);
    g.capsule(p2[0], p2[1], p3[0], p3[1], 4.2, 3.8, S.body);
    for (const [dx, dy, r] of [
      [0, -6, 8.5],
      [-6, -1, 6.5],
      [6, -1, 6.5],
      [0, -13, 6],
    ])
      g.circle(p3[0] + dx, p3[1] + dy, r, S.tuft);
  });
}

// ---------- arms ----------
// Short tapered arms with a mitten, paw, hoof or feathered tip. A world
// target makes the hand land exactly there (contacts); otherwise an angle.
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
  const a0 = [s[0] - dir[0] * 8, s[1] - dir[1] * 8];
  const w = [s[0] + dir[0] * len, s[1] + dir[1] * len];
  const fade = [
    a0[0],
    a0[1],
    s[0] + dir[0] * len * 0.7,
    s[1] + dir[1] * len * 0.7,
  ];
  const ang = Math.atan2(dir[1], dir[0]);
  const at = (d, u = 0) => [
    w[0] + dir[0] * d - dir[1] * u,
    w[1] + dir[1] * d + dir[0] * u,
  ];
  if (kind === "juno") {
    // a feathered wing: the arm ends in a scalloped row of flight feathers
    const L = len + 8;
    const flip = side * (P.turn >= 0 ? 1 : -1) < 0 ? -1 : 1;
    const pt = (d, u, sharp) => {
      const q = [
        s[0] + dir[0] * d - dir[1] * u * flip,
        s[1] + dir[1] * d + dir[0] * u * flip,
      ];
      return sharp ? [...q, 1] : q;
    };
    g.path(
      [
        pt(-8, -6),
        pt(4, -11),
        pt(L * 0.55, -14),
        pt(L - 2, -12),
        pt(L + 8, -9, true),
        pt(L + 2, -4),
        pt(L + 13, 0, true),
        pt(L + 2, 4),
        pt(L + 8, 9, true),
        pt(L - 2, 12),
        pt(L * 0.55, 13),
        pt(4, 10),
        pt(-8, 6),
      ],
      S.arm,
      { crease: [...pt(-8, 0), ...pt(L * 0.6, 0)] },
    );
    for (const u of [-4, 4]) {
      const c0 = pt(L - 6, u * 1.2),
        c1 = pt(L + 2, u);
      g.capsule(c0[0], c0[1], c1[0], c1[1], 0.9, 0.9, S.line, {
        ol: 0,
        shade: 0,
      });
    }
    return;
  }
  if (kind === "mattie") {
    const flip = side * (P.turn >= 0 ? 1 : -1) < 0 ? -1 : 1;
    g.capsule(a0[0], a0[1], w[0], w[1], S.armR[0], S.armR[1], S.body, {
      crease: fade,
      line: S.robeLine,
    });
    const c0 = at(-1, -S.armR[1] * 0.85),
      c1 = at(-1, S.armR[1] * 0.85);
    g.capsule(c0[0], c0[1], c1[0], c1[1], 1.2, 1.2, S.robeDark, {
      ol: 0,
      shade: 0,
    });
    const h = at(9);
    const th = at(7, -flip * 7);
    g.circle(th[0], th[1], 3.8, S.skin, { line: S.skinLine, crease: true });
    g.circle(h[0], h[1], S.handR, S.skin, { line: S.skinLine, crease: true });
    return;
  }
  g.capsule(a0[0], a0[1], w[0], w[1], S.armR[0], S.armR[1], S.arm, {
    crease: fade,
  });
  const hc = at(S.handR * 0.4);
  if (kind === "lou") {
    g.ellipse(hc[0], hc[1], S.handR, S.handR * 0.92, S.hand, { ang });
    const c0 = at(S.handR * 0.6),
      c1 = at(S.handR * 1.3);
    g.capsule(c0[0], c0[1], c1[0], c1[1], 1, 1, "#3a2016", { ol: 0, shade: 0 });
    return;
  }
  // a soft paw with two toe creases
  g.ellipse(hc[0], hc[1], S.handR, S.handR * 0.9, S.hand, { ang });
  for (const u of [-0.32, 0.32]) {
    const t0 = at(S.handR * 0.75, u * S.handR),
      t1 = at(S.handR * 1.3, u * S.handR);
    g.capsule(t0[0], t0[1], t1[0], t1[1], 1, 1, S.line, { ol: 0, shade: 0 });
  }
}

// ---------- feet ----------
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
function drawFeet(g, P, S, kind) {
  for (const side of [-1, 1]) {
    const f = footSpot(P, S, side);
    if (kind === "lou") {
      const top = bodyLocal(S, P).c[1] + S.bodyR[1] * 0.4;
      g.merge(() => {
        g.capsule(f.x * 0.9, top, f.x, f.y - 4, 10.5, 9.5, S.body);
        g.box(f.x, f.y + 1, S.footR[0], S.footR[1], 6, S.foot, { ang: f.ang });
        g.capsule(f.x, f.y + 4, f.x, f.y + 9, 0.9, 0.9, "#8a5a46", {
          ol: 0,
          shade: 0,
        });
      });
    } else if (kind === "juno") {
      g.merge(() => {
        g.capsule(f.x * 0.8, f.y - 16, f.x, f.y - 2, 5, 4.5, S.foot);
        for (const k of [-1, 0, 1])
          g.capsule(
            f.x,
            f.y,
            f.x + f.sg * 4 + k * 8,
            f.y + 4 - Math.abs(k) * 1.5,
            4.6,
            3.8,
            S.foot,
          );
      });
    } else if (kind === "mattie") {
      g.merge(() => {
        g.ellipse(f.x + f.sg * 2, f.y + 1, f.rx, f.ry, S.foot, { ang: f.ang });
        g.ellipse(f.x + f.sg * 2, f.y - 1.5, f.rx * 0.78, f.ry * 0.62, S.skin, {
          ang: f.ang,
        });
        g.capsule(
          f.x - 7 + f.sg * 2,
          f.y - 2,
          f.x + 9 + f.sg * 2,
          f.y - 2,
          2,
          2,
          S.foot,
          {
            ol: 0,
          },
        );
      });
    } else {
      g.merge(() => {
        g.ellipse(f.x, f.y, f.rx, f.ry, S.foot, { ang: f.ang, rim: 0.5 });
        for (const u of [-0.3, 0.3])
          g.capsule(
            f.x + u * f.rx,
            f.y + f.ry * 0.25,
            f.x + u * f.rx,
            f.y + f.ry * 0.85,
            1,
            1,
            S.line,
            { ol: 0, shade: 0 },
          );
      });
    }
  }
}

// ---------- body ----------
function drawBody(g, P, S, kind) {
  const B = bodyLocal(S, P);
  const T = P.turn,
    aT = Math.abs(T);
  const [cx, cy] = B.c;
  const [rx, ry] = B.r;
  if (kind === "mattie") {
    const robe = g.path(
      [
        [cx - 17 + T * 3, cy - 46],
        [cx + 17 + T * 3, cy - 46],
        [cx + 40, cy + 42],
        [cx + T * 6, cy + 47],
        [cx - 40, cy + 42],
      ],
      S.body,
      { round: 9, line: S.robeLine, rim: 0.5 },
    );
    const o = { clip: robe, clipMode: 2, ol: 0, shade: 0 };
    // folds
    for (const u of [-0.45, 0.4])
      g.capsule(
        cx + u * 22 + T * 4,
        cy - 6,
        cx + u * 34 + T * 4,
        cy + 40,
        1.4,
        2.2,
        S.robeDark,
        o,
      );
    // V neck
    g.path(
      [
        [cx - 10 + T * 5, cy - 47, 1],
        [cx + 10 + T * 5, cy - 47, 1],
        [cx + T * 6, cy - 33, 1],
      ],
      S.skin,
      { ...o, round: 3 },
    );
    // sash with a knot
    g.box(cx + T * 4, cy - 12, 44, 4.5, 3, S.sash, {
      clip: robe,
      clipMode: 2,
      ol: 1.8,
      shade: 0.6,
      line: "#9a6a1a",
    });
    const kx = cx + 12 + T * 10;
    g.capsule(kx, cy - 10, kx - 3, cy + 8, 3, 2.2, S.sash, {
      line: "#9a6a1a",
      ol: 1.8,
    });
    g.capsule(kx, cy - 10, kx + 5, cy + 6, 3, 2.2, S.sash, {
      line: "#9a6a1a",
      ol: 1.8,
    });
    g.circle(kx, cy - 12, 4.5, S.sash, { line: "#9a6a1a", ol: 1.8 });
    return robe;
  }
  const torso = g.ellipse(cx, cy - ry * 0.1, rx * 0.9, ry * 0.92, S.body, {
    rim: 0.8,
  });
  const hips = g.ellipse(cx, cy + ry * 0.3, rx, ry * 0.68, S.body);
  g.ellipse(
    cx + T * rx * 0.32,
    cy + ry * 0.22,
    rx * 0.6 * (1 - 0.2 * aT),
    ry * 0.62,
    S.belly,
    { ol: 0, clip: hips, clipMode: 2 },
  );
  if (kind === "juno") {
    // feather marks on the chest
    for (const [u, v] of [
      [-0.28, -0.05],
      [0.02, -0.12],
      [0.3, -0.05],
      [-0.14, 0.18],
      [0.16, 0.18],
      [0.02, 0.4],
    ])
      g.arc(
        cx + T * rx * 0.32 + u * rx,
        cy + ry * v + ry * 0.22,
        5.5,
        0.35,
        Math.PI - 0.35,
        1.3,
        "#8f5a34",
        {
          clip: hips,
          clipMode: 2,
        },
      );
  }
  return torso;
}

// ---------- faces ----------
// Glossy dark eyes with two catch-lights, small soft brows, simple mouths.
export const FACES = {
  happy: { eyes: "open", brow: 0.1, mouth: "smile" },
  det: { eyes: "open", brow: 1, mouth: "flat" },
  strain: { eyes: "squeeze", brow: 1.2, mouth: "grit" },
  sad: { eyes: "open", brow: -1, mouth: "frown", lookDown: true },
  pant: { eyes: "half", brow: -0.4, mouth: "o" },
  wow: { eyes: "wide", brow: -0.8, mouth: "o" },
  joy: { eyes: "happy", brow: 0.1, mouth: "beam" },
  grin: { eyes: "open", brow: 0.1, mouth: "beam" },
  idea: { eyes: "wide", brow: -0.5, mouth: "open" },
};
const isOpenMouth = (face) =>
  ["beam", "o", "open"].includes((FACES[face] || FACES.happy).mouth);

function drawEyes(g, P, hc, R, o) {
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  const F = FACES[P.face] || FACES.happy;
  const fx = T * 0.42 * R;
  const look = F.lookDown ? [P.look[0] * 0.5, 0.8] : P.look;
  const lx = clamp(look[0], -1, 1) * 0.05 * R,
    ly = clamp(look[1], -1, 1) * 0.045 * R;
  const eyeY = hc[1] + (o.eyeY ?? 0) * R;
  const th = 0.032 * R;
  const size = o.eyeR ?? 0.165;
  for (const side of [-1, 1]) {
    const near = side === sg || aT < 0.05;
    const squash = near ? 1 - 0.08 * aT : 1 - 0.42 * aT;
    const ex =
      hc[0] +
      fx +
      side * (o.eyeX ?? 0.36) * R * (near ? 1 - 0.12 * aT : 1 - 0.55 * aT) +
      lx;
    const ey = eyeY + ly;
    const big = F.eyes === "wide" ? 1.14 : 1;
    const rx = size * R * squash * big,
      ry = size * 1.3 * R * big;
    let blink = P.blink;
    if (F.eyes === "half") blink = Math.max(blink, 0.42);
    if (F.eyes === "happy") {
      g.arc(
        ex,
        ey + ry * 0.45,
        rx * 1.05,
        Math.PI + 0.4,
        TAU - 0.4,
        th,
        o.line,
      );
    } else if (F.eyes === "squeeze") {
      const d = side * 0.16 * R;
      g.capsule(ex - d, ey - 5, ex + d * 0.4, ey, th, th, o.line, {
        shade: 0,
        ol: 0,
      });
      g.capsule(ex + d * 0.4, ey, ex - d, ey + 5, th, th, o.line, {
        shade: 0,
        ol: 0,
      });
    } else if (blink > 0.82) {
      g.arc(ex, ey - ry * 0.25, rx * 1.0, 0.35, Math.PI - 0.35, th, o.line);
    } else {
      const eye = g.ellipse(ex, ey, rx, ry, EYE, { ol: 0, shade: 0 });
      const inEye = { ol: 0, shade: 0, clip: eye, clipMode: 2 };
      g.ellipse(ex, ey + ry * 0.55, rx * 0.8, ry * 0.5, EYE_GLOW, inEye);
      g.circle(ex - rx * 0.3, ey - ry * 0.36, rx * 0.44, "#ffffff", inEye);
      g.circle(ex + rx * 0.36, ey + ry * 0.36, rx * 0.17, "#ffffff", {
        ...inEye,
        alpha: 0.9,
      });
      if (blink > 0.02) {
        const edge = ey - ry + 2 * ry * blink;
        const top = ey - ry * 1.3;
        g.box(
          ex,
          (top + edge) / 2,
          rx * 1.4,
          (edge - top) / 2,
          0,
          o.skin,
          inEye,
        );
        g.capsule(
          ex - rx * 1.2,
          edge,
          ex + rx * 1.2,
          edge,
          th * 0.8,
          th * 0.8,
          o.line,
          inEye,
        );
      }
    }
    // brow: inner end lower when determined, higher when sad
    const by = eyeY - ry - 0.13 * R;
    g.arc(
      ex,
      by + 0.16 * R,
      0.16 * R * squash,
      Math.PI + 1.0,
      TAU - 1.0,
      th * 0.9,
      o.brow,
      {
        ang: -side * F.brow * 0.3,
      },
    );
  }
  if (o.blush !== false)
    for (const side of [-1, 1]) {
      const near = side === sg || aT < 0.05;
      if (!near && aT > 0.6) continue;
      g.soft(
        hc[0] + fx + side * (o.blushX ?? 0.58) * R * (near ? 1 : 0.55),
        eyeY + (o.blushY ?? 0.3) * R,
        0.15 * R,
        0.09 * R,
        BLUSH,
        { alpha: 0.5, core: 0.35 },
      );
    }
}

// mouth at (mx, my) with half-width mw
function drawMouth(g, face, mx, my, mw, line, R) {
  const F = FACES[face] || FACES.happy;
  const th = 0.03 * R;
  if (F.mouth === "smile")
    g.arc(mx, my - mw * 0.6, mw, 0.5, Math.PI - 0.5, th, line);
  else if (F.mouth === "flat")
    g.capsule(mx - mw * 0.55, my, mx + mw * 0.55, my, th, th, line, {
      shade: 0,
      ol: 0,
    });
  else if (F.mouth === "frown")
    g.arc(mx, my + mw * 0.7, mw * 0.8, Math.PI + 0.6, TAU - 0.6, th, line);
  else if (F.mouth === "beam" || F.mouth === "open") {
    const h = F.mouth === "open" ? 1.05 : 0.85;
    const m = g.path(
      [
        [mx - mw, my - mw * 0.25, 1],
        [mx + mw, my - mw * 0.25, 1],
        [mx + mw * 0.85, my + mw * h * 0.7],
        [mx, my + mw * h * 1.05],
        [mx - mw * 0.85, my + mw * h * 0.7],
      ],
      MOUTH,
      { ol: 2, shade: 0, line },
    );
    g.ellipse(mx, my + mw * h * 0.85, mw * 0.55, mw * 0.36, TONGUE, {
      ol: 0,
      shade: 0,
      clip: m,
      clipMode: 2,
    });
  } else if (F.mouth === "o") {
    const m = g.ellipse(mx, my + mw * 0.2, mw * 0.4, mw * 0.5, MOUTH, {
      ol: 2,
      shade: 0,
      line,
    });
    g.ellipse(mx, my + mw * 0.55, mw * 0.28, mw * 0.2, TONGUE, {
      ol: 0,
      shade: 0,
      clip: m,
      clipMode: 2,
    });
  } else if (F.mouth === "grit") {
    g.box(mx, my, mw * 0.9, mw * 0.34, 3, "#ffffff", { ol: 2, shade: 0, line });
    g.capsule(mx - mw * 0.85, my, mx + mw * 0.85, my, 0.7, 0.7, line, {
      ol: 0,
      shade: 0,
    });
  }
}

// ---------- heads ----------
const HEADS = {
  leo(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    // mane: a ring of soft lobes, one silhouette
    g.merge(() => {
      const n = 15;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.21;
        const wob = 0.94 + 0.12 * hash(i, 7) + 0.03 * Math.sin(P.t * 1.6 + i);
        g.circle(
          hc[0] - T * 8 + Math.cos(a) * R * 0.98 * (1 - 0.06 * aT),
          hc[1] + 3 + Math.sin(a) * R * 0.94,
          R * 0.34 * wob,
          S.mane,
        );
      }
    });
    for (const side of [-1, 1]) {
      const ex = hc[0] + side * 0.64 * R * (1 - 0.25 * aT) - T * 8;
      g.merge(() => {
        const ear = g.circle(ex, hc[1] - 0.68 * R, 0.25 * R, S.body);
        g.circle(ex, hc[1] - 0.66 * R, 0.13 * R, S.ear, {
          clip: ear,
          clipMode: 2,
          ol: 0,
          shade: 0,
        });
      });
    }
    g.merge(() => {
      g.ellipse(hc[0], hc[1], R * (1 - 0.04 * aT), R * 0.9, S.body, { rim: 1 });
      // fluffy cheeks
      for (const side of [-1, 1])
        g.circle(
          hc[0] + side * 0.78 * R * (1 - 0.2 * aT) + fx * 0.3,
          hc[1] + 0.32 * R,
          0.24 * R,
          S.body,
        );
    });
    const mz = [hc[0] + fx * 1.12, hc[1] + 0.36 * R];
    g.merge(() => {
      for (const side of [-1, 1])
        g.ellipse(
          mz[0] + side * 0.15 * R * (1 - 0.25 * aT),
          mz[1],
          0.21 * R,
          0.16 * R,
          S.belly,
          { ol: 2 },
        );
      g.ellipse(mz[0], mz[1] + 0.13 * R, 0.13 * R, 0.1 * R, S.belly, { ol: 2 });
    });
    for (const side of [-1, 1])
      for (const [u, v] of [
        [0.18, -0.02],
        [0.26, 0.04],
        [0.17, 0.08],
      ])
        g.circle(mz[0] + side * u * R, mz[1] + v * R, 0.022 * R, S.freckle, {
          ol: 0,
          shade: 0,
        });
    drawEyes(g, P, hc, R, {
      eyeY: -0.06,
      skin: S.body,
      brow: S.brow,
      line: S.line,
      blushY: 0.26,
    });
    if (isOpenMouth(P.face))
      drawMouth(g, P.face, mz[0], mz[1] + 0.13 * R, 0.13 * R, S.line, R);
    else if ((FACES[P.face] || {}).mouth === "frown")
      g.arc(
        mz[0],
        mz[1] + 0.22 * R,
        0.09 * R,
        Math.PI + 0.5,
        TAU - 0.5,
        0.03 * R,
        S.line,
      );
    else
      for (const side of [-1, 1])
        g.arc(
          mz[0] + side * 0.075 * R,
          mz[1] + 0.02 * R,
          0.075 * R,
          0.25,
          Math.PI - 0.25,
          0.028 * R,
          S.line,
        );
    // nose
    g.path(
      [
        [mz[0] - 0.12 * R, mz[1] - 0.13 * R],
        [mz[0] + 0.12 * R, mz[1] - 0.13 * R],
        [mz[0] + 0.02 * R, mz[1] + 0.02 * R],
        [mz[0] - 0.02 * R, mz[1] + 0.02 * R],
      ],
      S.nose,
      { ol: 1.6, shade: 0.4 },
    );
    g.ellipse(
      mz[0] - 0.035 * R,
      mz[1] - 0.1 * R,
      0.035 * R,
      0.018 * R,
      "#ffffff",
      {
        ol: 0,
        shade: 0,
        alpha: 0.65,
      },
    );
  },
  lou(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    // short curved horns
    for (const side of [-1, 1]) {
      const bx = hc[0] + side * 0.42 * R * (1 - 0.3 * aT) - T * 8;
      const m1 = [bx + side * 0.2 * R, hc[1] - 0.92 * R];
      g.merge(() => {
        g.capsule(bx, hc[1] - 0.6 * R, m1[0], m1[1], 0.13 * R, 0.1 * R, S.horn);
        g.capsule(
          m1[0],
          m1[1],
          m1[0] - side * 0.02 * R,
          hc[1] - 1.08 * R,
          0.1 * R,
          0.05 * R,
          S.horn,
        );
      });
    }
    // floppy ears
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      const ex =
        hc[0] +
        side * 0.94 * R * (near ? 1 - 0.15 * aT : 1 - 0.45 * aT) -
        T * 6;
      g.merge(() => {
        const ear = g.ellipse(
          ex,
          hc[1] - 0.16 * R,
          0.32 * R,
          0.15 * R,
          S.body,
          { ang: side * 0.38 },
        );
        g.ellipse(
          ex + side * 0.03 * R,
          hc[1] - 0.15 * R,
          0.2 * R,
          0.07 * R,
          S.ear,
          {
            ang: side * 0.38,
            clip: ear,
            clipMode: 2,
            ol: 0,
            shade: 0,
          },
        );
      });
    }
    let head;
    g.merge(() => {
      head = g.ellipse(hc[0], hc[1], R * (1 - 0.04 * aT), R * 0.88, S.body, {
        rim: 1,
      });
    });
    const inHead = { clip: head, clipMode: 2, ol: 0, shade: 0 };
    // a pale blaze down the forehead
    g.path(
      [
        [hc[0] + fx * 0.6 - 0.17 * R, hc[1] - 0.95 * R],
        [hc[0] + fx * 0.6 + 0.17 * R, hc[1] - 0.95 * R],
        [hc[0] + fx * 0.8 + 0.12 * R, hc[1] - 0.42 * R],
        [hc[0] + fx * 0.85, hc[1] - 0.18 * R],
        [hc[0] + fx * 0.8 - 0.12 * R, hc[1] - 0.42 * R],
      ],
      S.belly,
      inHead,
    );
    // tuft of hair
    g.merge(() => {
      for (const [dx, dy, r] of [
        [-0.14, -0.86, 0.15],
        [0.04, -0.94, 0.17],
        [0.2, -0.84, 0.13],
      ])
        g.circle(
          hc[0] + fx * 0.5 + dx * R - T * 4,
          hc[1] + dy * R,
          r * R,
          S.tuft,
        );
    });
    drawEyes(g, P, hc, R, {
      eyeY: -0.12,
      eyeX: 0.37,
      skin: S.body,
      brow: S.brow,
      line: S.line,
      blushX: 0.62,
      blushY: 0.28,
    });
    // big soft muzzle
    const mz = [hc[0] + fx * 1.15, hc[1] + 0.44 * R];
    g.merge(() => {
      g.ellipse(mz[0], mz[1], 0.6 * R * (1 - 0.18 * aT), 0.36 * R, S.muzzle, {
        ol: 2.4,
        rim: 0.6,
      });
    });
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      g.ellipse(
        mz[0] + side * 0.24 * R * (near ? 1 : 0.6),
        mz[1] - 0.08 * R,
        0.06 * R,
        0.085 * R,
        S.nostril,
        {
          ol: 0,
          shade: 0,
          ang: side * 0.35,
        },
      );
    }
    drawMouth(g, P.face, mz[0], mz[1] + 0.16 * R, 0.17 * R, S.line, R);
  },
  juno(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    // white feathered head: crest, round head and a ruff, one silhouette
    g.merge(() => {
      for (const [dx, a, l] of [
        [-0.24, -2.1, 0.5],
        [-0.02, -1.72, 0.62],
        [0.2, -1.36, 0.46],
      ])
        g.tri(
          hc[0] - T * 0.24 * R + dx * R,
          hc[1] - 0.68 * R,
          l * R,
          0.15 * R,
          0.05 * R,
          S.head,
          {
            ang: a - T * 0.5,
          },
        );
      g.circle(hc[0], hc[1], R, S.head, { rim: 0.5 });
      for (let i = 0; i < 7; i++) {
        const a = 0.35 + (i / 6) * (Math.PI - 0.7);
        g.circle(
          hc[0] + Math.cos(a) * 0.86 * R,
          hc[1] + Math.sin(a) * 0.86 * R,
          0.24 * R,
          S.head,
        );
      }
    });
    drawEyes(g, P, hc, R, {
      eyeY: -0.12,
      eyeX: 0.37,
      skin: S.head,
      brow: S.brow,
      line: S.line,
      blushY: 0.24,
      blushX: 0.62,
    });
    // hooked beak, morphing from front view to profile with the turn
    const open = isOpenMouth(P.face);
    const bx = hc[0] + fx * 1.25,
      by = hc[1] + 0.12 * R;
    const sg = T >= 0 ? 1 : -1;
    const u = clamp(aT * 1.4);
    const front = [
      [-0.3, -0.08],
      [-0.14, -0.17],
      [0.14, -0.17],
      [0.3, -0.08],
      [0.22, 0.12],
      [0.06, 0.3],
      [0, 0.37, 1],
      [-0.06, 0.3],
      [-0.22, 0.12],
    ];
    const side = [
      [-0.14, -0.06],
      [-0.02, -0.18],
      [0.26, -0.17],
      [0.48, -0.04],
      [0.53, 0.16],
      [0.47, 0.3],
      [0.41, 0.34, 1],
      [0.37, 0.18],
      [-0.08, 0.14],
    ];
    const jx = bx + sg * u * 0.2 * R;
    if (open) {
      const m = g.ellipse(jx, by + 0.2 * R, 0.2 * R, 0.2 * R, MOUTH, {
        ol: 2,
        shade: 0,
      });
      g.ellipse(jx, by + 0.32 * R, 0.12 * R, 0.08 * R, TONGUE, {
        ol: 0,
        shade: 0,
        clip: m,
        clipMode: 2,
      });
      g.ellipse(jx, by + 0.38 * R, 0.17 * R, 0.07 * R, "#eaa21e", { ol: 2 });
    } else
      g.ellipse(jx, by + 0.24 * R, 0.17 * R, 0.08 * R, "#eaa21e", { ol: 2 });
    g.path(
      front.map((f, i) => [
        bx + lerp(f[0] * sg, side[i][0] * sg, u) * R * 1.12,
        by + lerp(f[1], side[i][1], u) * R * 1.12,
        f[2],
      ]),
      S.beak,
      { ol: 2.4, rim: 0.8 },
    );
    g.ellipse(
      bx + sg * u * 0.1 * R - 0.06 * R * (1 - u),
      by - 0.04 * R,
      0.025 * R,
      0.035 * R,
      "#b8741a",
      { ol: 0, shade: 0 },
    );
    if (!open && (FACES[P.face] || {}).mouth === "frown")
      g.arc(
        bx,
        by + 0.44 * R,
        0.08 * R,
        Math.PI + 0.5,
        TAU - 0.5,
        0.03 * R,
        S.line,
      );
  },
  mattie(g, P, S, hc) {
    const T = P.turn,
      R = S.headR,
      aT = Math.abs(T),
      fx = T * 0.42 * R;
    // curly hair behind the face, one silhouette
    g.merge(() => {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.82 + (i / (n - 1)) * Math.PI * 1.36;
        const wob = 0.92 + 0.14 * hash(i, 3);
        g.circle(
          hc[0] - T * 6 + Math.cos(a) * R * 0.92,
          hc[1] - 0.06 * R + Math.sin(a) * R * 0.9,
          R * 0.3 * wob,
          S.hair,
          { line: S.line },
        );
      }
    });
    for (const side of [-1, 1]) {
      const near = side === (T >= 0 ? 1 : -1) || aT < 0.05;
      if (!near && aT > 0.5) continue;
      g.circle(
        hc[0] + side * 0.9 * R * (near ? 1 - 0.1 * aT : 0.7) - T * 4,
        hc[1] + 0.12 * R,
        0.15 * R,
        S.skin,
        {
          line: S.skinLine,
        },
      );
    }
    g.merge(() => {
      g.ellipse(hc[0], hc[1], R * 0.9 * (1 - 0.03 * aT), R * 0.92, S.skin, {
        line: S.skinLine,
        rim: 0.8,
      });
    });
    // curls over the forehead
    g.merge(() => {
      for (const [dx, dy, r] of [
        [-0.62, -0.42, 0.2],
        [-0.42, -0.66, 0.25],
        [-0.12, -0.8, 0.27],
        [0.2, -0.78, 0.26],
        [0.48, -0.62, 0.24],
        [0.68, -0.38, 0.18],
      ])
        g.circle(
          hc[0] + fx * 0.4 + dx * R * (1 - 0.1 * aT),
          hc[1] + dy * R,
          r * R,
          S.hair,
          { line: S.line },
        );
    });
    for (const [dx, dy] of [
      [-0.42, -0.68],
      [-0.12, -0.84],
      [0.22, -0.8],
      [0.5, -0.64],
    ])
      g.arc(
        hc[0] + fx * 0.4 + dx * R,
        hc[1] + dy * R,
        0.11 * R,
        Math.PI * 0.9,
        Math.PI * 1.7,
        0.025 * R,
        S.hairHi,
      );
    drawEyes(g, P, hc, R, {
      eyeY: 0.04,
      eyeX: 0.34,
      skin: S.skin,
      brow: S.brow,
      line: S.line,
      blushY: 0.3,
      blushX: 0.55,
    });
    g.ellipse(
      hc[0] + fx * 1.2,
      hc[1] + 0.24 * R,
      0.06 * R,
      0.045 * R,
      "#e9a07a",
      { ol: 0, shade: 0 },
    );
    drawMouth(
      g,
      P.face,
      hc[0] + fx * 1.15,
      hc[1] + 0.48 * R,
      0.15 * R,
      S.line,
      R,
    );
    const hb = Math.sin(P.t * 2.2) * 2;
    g.ring(hc[0] + fx * 0.15, hc[1] - R - 18 + hb, 30, 8, 3.8, S.halo, {
      ol: 2,
      shade: 0.5,
      line: "#9a6a1a",
    });
  },
};

export function drawCharacter(g, kind, P, report) {
  if (!P.visible) return;
  const S = SPEC[kind];
  const T = P.turn,
    aT = Math.abs(T),
    sg = T >= 0 ? 1 : -1;
  const k = P.k ?? 1;
  const prevLine = g.line;
  // a soft contact shadow that stays on the ground through a hop
  g.save();
  g.apply(M.mul(M.tr(P.x, P.y), M.sc(k, k)));
  const up = clamp(P.lift / (70 * k));
  g.soft(T * 4, -1, 48 * (1 - 0.35 * up), 8 * (1 - 0.35 * up), "#140a20", {
    alpha: 0.28 * (1 - 0.6 * up),
    core: 0.4,
  });
  g.restore();
  g.save();
  g.apply(rootMatrix(P));
  g.line = S.line;
  if (S.wings) drawWings(g, P, S);
  drawTail(g, P, S, kind);
  const arm = (side) => P.arms[side < 0 ? "L" : "R"];
  const turned = aT > 0.3;
  if (turned) g.merge(() => drawArm(g, P, S, kind, -sg, arm(-sg), report));
  if (kind === "lou" || kind === "mattie") drawFeet(g, P, S, kind);
  if (kind === "mattie")
    g.capsule(
      S.neck[0] + T * 3,
      S.neck[1] + P.sit * S.sitDrop + P.bob,
      S.neck[0] + T * 3,
      S.neck[1] + 14 + P.sit * S.sitDrop + P.bob,
      7,
      7,
      S.skin,
      {
        line: S.skinLine,
      },
    );
  g.merge(() => {
    drawBody(g, P, S, kind);
    if (!turned) drawArm(g, P, S, kind, -sg, arm(-sg), report);
    drawArm(g, P, S, kind, sg, arm(sg), report);
  });
  if (kind === "leo" || kind === "juno") drawFeet(g, P, S, kind);
  const neck = [S.neck[0] + T * 3, S.neck[1] + P.sit * S.sitDrop + P.bob];
  const hc = [S.headC[0] + T * 4, S.headC[1] + P.sit * S.sitDrop + P.bob];
  g.save();
  g.apply(M.tr(neck[0] + (P.headX || 0), neck[1] + (P.headY || 0)));
  g.apply(M.rot(P.headTilt));
  g.apply(M.tr(-neck[0], -neck[1]));
  HEADS[kind](g, P, S, hc);
  g.restore();
  g.line = prevLine;
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
    g.scallop(0, 0, 2.5 * a, 9 * a, 4, 0, i % 2 ? "#b4a3e4" : "#ecc965", {
      ol: 1.6,
      shade: 0.3,
    });
    g.restore();
  }
  for (let i = 0; i < 3 && hearts > 0.02; i++) {
    const drift = (phase * 0.42 + i * 0.33) % 1;
    const a = hearts * Math.sin(drift * Math.PI);
    if (a < 0.02) continue;
    const x = Math.sin(i * 2.1 + phase * 0.6) * 60;
    const y = -120 - drift * 80;
    g.merge(() => {
      g.circle(x - 4 * a, y, 5 * a, "#ef8dab", { ol: 1.4 });
      g.circle(x + 4 * a, y, 5 * a, "#ef8dab", { ol: 1.4 });
      g.tri(x, y + 2 * a, 10 * a, 8.5 * a, 1.5 * a, "#ef8dab", {
        ol: 1.4,
        ang: Math.PI / 2,
      });
    });
  }
}
