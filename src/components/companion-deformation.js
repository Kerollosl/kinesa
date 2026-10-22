import { rigPlacement } from "./companion-rig.js";

const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const signed = (value) => clamp(finite(value), -1, 1);
const unit = (value) => clamp(finite(value), 0, 1);
const bell = (value) => Math.exp(-value * value * 2);

/** The UVs refer to an isolated part texture, never the complete source atlas.
 * Coordinates retain the rig's 200 × 200 space until the renderer applies the
 * hierarchy. A mesh at rest is therefore identical to its painted SVG part. */
export function createPartMesh(part, columns = 8, rows = 8) {
  if (
    !Array.isArray(part?.source) ||
    !Array.isArray(part?.box) ||
    part.source.length !== 4 ||
    part.box.length !== 4 ||
    ![...part.source, ...part.box].every(Number.isFinite) ||
    part.source[2] <= 0 ||
    part.source[3] <= 0 ||
    part.box[2] <= 0 ||
    part.box[3] <= 0
  ) {
    throw new TypeError(
      "A painted part needs finite source and destination boxes.",
    );
  }
  const columnCount = clamp(Math.round(finite(columns, 8)), 1, 32);
  const rowCount = clamp(Math.round(finite(rows, 8)), 1, 32);
  const placement = rigPlacement(part);
  const { x, y, width, height } = placement;
  const vertices = [];
  const triangles = [];
  for (let row = 0; row <= rowCount; row++) {
    for (let column = 0; column <= columnCount; column++) {
      const u = column / columnCount;
      const v = row / rowCount;
      vertices.push({ x: x + u * width, y: y + v * height, u, v });
    }
  }
  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const a = row * (columnCount + 1) + column;
      const b = a + 1;
      const d = a + columnCount + 1;
      const c = d + 1;
      // Alternating diagonals avoid a single visible crease through a bend.
      if ((row + column) % 2) triangles.push([a, b, c], [a, c, d]);
      else triangles.push([a, b, d], [b, c, d]);
    }
  }
  return {
    vertices,
    triangles,
    columns: columnCount,
    rows: rowCount,
    placement,
    bounds: { x, y, width, height },
  };
}

function faceLandmarks(rig, kind, bounds) {
  const eyes = rig?.eyes || [];
  const eyeX = eyes.length
    ? eyes.reduce((sum, eye) => sum + eye.x, 0) / eyes.length
    : bounds.x + bounds.width / 2;
  const mouths = {
    lion: { x: 106, y: 111, width: 19, height: 10 },
    ox: { x: 102, y: 112, width: 22, height: 10 },
    eagle: { x: 119, y: 99, width: 17, height: 14 },
    human: { x: 101, y: 104, width: 14, height: 9 },
  };
  return {
    eyes,
    eyeX,
    mouth: mouths[kind] || {
      x: eyeX,
      y: bounds.y + bounds.height * 0.78,
      width: bounds.width * 0.15,
      height: bounds.height * 0.1,
    },
  };
}

/** Skin the original painted texture with smooth spatial fields. Face turns
 * move the central surface more than the outline, wings bend across their
 * span, and the torso transfers shoulder movement into a planted lower body.
 * All offsets are small in rig units and vanish exactly in the neutral pose. */
export function deformPart(mesh, { kind, name, rig, pose } = {}) {
  const source = mesh?.vertices || [];
  const bounds = mesh?.bounds || mesh?.placement;
  if (!bounds) return source.map((vertex) => ({ ...vertex }));
  const { x: left, y: top, width, height } = bounds;
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const channels = pose?.deform || {};
  const turn = signed(channels.turn);
  const headTurn = signed(channels.headTurn);
  const pitch = signed(channels.headPitch);
  const spine = signed(channels.spine);
  const squash = signed(channels.squash);
  const smile = unit(channels.smile);
  const brow = signed(channels.brow);
  const mane = signed(channels.mane);
  const landmarks = name === "head" ? faceLandmarks(rig, kind, bounds) : null;
  const torso =
    name === "body" || name === "collar"
      ? rig?.body
        ? rigPlacement(rig.body)
        : bounds
      : null;
  const side = name?.endsWith("Left") ? -1 : 1;
  const pivot = rig?.pivots?.[name] || [centerX, top];
  const fold = signed(channels[`wingFold${side < 0 ? "Left" : "Right"}`]);
  const curl = signed(channels[`wingCurl${side < 0 ? "Left" : "Right"}`]);
  const armBend = signed(channels[`armBend${side < 0 ? "Left" : "Right"}`]);

  return source.map((vertex) => {
    const u = finite(vertex.u);
    const v = finite(vertex.v);
    const nx = (u - 0.5) * 2;
    const ny = (v - 0.5) * 2;
    const surfaceX = Math.max(0, 1 - nx * nx);
    const surfaceY = Math.max(0, 1 - ny * ny);
    let dx = 0;
    let dy = 0;

    if (name === "head") {
      // This is surface curvature rather than a sheared rectangle: the nose
      // and cheeks travel across the face while ears and the head outline lag.
      dx += (vertex.x - centerX) * (Math.cos(headTurn * 0.28) - 1);
      dx += headTurn * 4.2 * surfaceX * (0.88 + 0.12 * surfaceY);
      dy += (vertex.y - centerY) * (Math.cos(pitch * 0.2) - 1);
      dy += pitch * 2.5 * surfaceY * (0.88 + 0.12 * surfaceX);
      dy += headTurn * nx * ny * 0.6;
      dx += spine * 3.2;

      const rim = clamp((nx * nx + ny * ny - 0.3) / 0.9, 0, 1);
      const softEdge = kind === "lion" || kind === "human" ? 1 : 0.55;
      dx += mane * rim * ny * 0.75 * softEdge;
      dy += mane * rim * nx * 0.8 * softEdge;
      // Keep squash mostly in the mane/curls, away from the painted features.
      dx += nx * squash * rim * 0.45;
      dy += ny * squash * rim * -0.45;

      for (const eye of landmarks.eyes) {
        const radiusX = Math.max(8, finite(eye.rx, 10) * 1.7);
        const radiusY = Math.max(8, finite(eye.ry, 10) * 1.5);
        const browX = (vertex.x - eye.x) / radiusX;
        const browY = (vertex.y - (eye.y - eye.ry * 1.2)) / radiusY;
        dy -= brow * 0.75 * bell(browX) * bell(browY);
      }
      const mouth = landmarks.mouth;
      const mouthY = (vertex.y - mouth.y) / mouth.height;
      const cornerLeft =
        (vertex.x - (mouth.x - mouth.width / 2)) / (mouth.width * 0.42);
      const cornerRight =
        (vertex.x - (mouth.x + mouth.width / 2)) / (mouth.width * 0.42);
      const beakRestraint = kind === "eagle" ? 0.45 : 1;
      dy -=
        smile *
        0.7 *
        (bell(cornerLeft) + bell(cornerRight)) *
        bell(mouthY) *
        beakRestraint;
    } else if (name === "body" || name === "collar") {
      // Overlapping collar paint samples the same torso field, avoiding a
      // sliding neck seam as the chest bends and breathes underneath it.
      const torsoU = clamp((vertex.x - torso.x) / torso.width, 0, 1);
      const torsoV = clamp((vertex.y - torso.y) / torso.height, 0, 1);
      const torsoNX = (torsoU - 0.5) * 2;
      const torsoSurface = Math.max(0, 1 - torsoNX * torsoNX);
      const shoulder = clamp((182 - vertex.y) / 72, 0, 1);
      dx += spine * 3.6 * shoulder * shoulder;
      dx += turn * 1.9 * torsoSurface * Math.sin(Math.PI * torsoV);
      dx +=
        (vertex.x - (torso.x + torso.width / 2)) *
        (Math.cos(turn * 0.22) - 1) *
        shoulder;
      dx += squash * torsoNX * Math.sin(Math.PI * torsoV) * 0.85;
      dy += squash * 1.8 * Math.pow(1 - torsoV, 1.5);
    } else if (name === "wingLeft" || name === "wingRight") {
      const shoulder = clamp((182 - vertex.y) / 72, 0, 1);
      dx += spine * 3.6 * shoulder * shoulder;
      const span = clamp(((vertex.x - pivot[0]) * side) / (width * 0.9), 0, 1);
      dx -= side * fold * span * span * width * 0.12;
      dx += side * curl * Math.sin(Math.PI * v) * span * span * 1.5;
      dy += curl * span * span * height * 0.15;
      dy += (v - 0.5) * fold * span * 1.5;
    } else if (name === "armLeft" || name === "armRight") {
      const shoulder = clamp((182 - vertex.y) / 72, 0, 1);
      dx += spine * 3.6 * shoulder * shoulder;
      const length = Math.max(1, top + height - pivot[1]);
      const along = clamp((vertex.y - pivot[1]) / length, 0, 1);
      const elbow = Math.sin(Math.PI * along);
      dx += side * armBend * width * 0.13 * elbow;
      dy += armBend * height * 0.018 * elbow;
    }

    return { ...vertex, x: vertex.x + dx, y: vertex.y + dy };
  });
}

/** Matches translate(x,y) translate(pivot) rotate(r) scale(sx,sy)
 * translate(-pivot), including the ordering used by the SVG fallback. */
export function jointMatrix(pose = {}, pivot = { x: 100, y: 100 }) {
  const px = finite(Array.isArray(pivot) ? pivot[0] : pivot.x, 100);
  const py = finite(Array.isArray(pivot) ? pivot[1] : pivot.y, 100);
  const radians = (finite(pose.r) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const sx = finite(pose.sx, 1);
  const sy = finite(pose.sy, 1);
  const a = cosine * sx;
  const b = sine * sx;
  const c = -sine * sy;
  const d = cosine * sy;
  return {
    a,
    b,
    c,
    d,
    e: finite(pose.x) + px - a * px - c * py,
    f: finite(pose.y) + py - b * px - d * py,
  };
}

export function transformPoint(matrix, point) {
  return {
    ...point,
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

/** Parent is applied after child, as in nested SVG groups. */
export function multiplyMatrices(parent, child) {
  return {
    a: parent.a * child.a + parent.c * child.b,
    b: parent.b * child.a + parent.d * child.b,
    c: parent.a * child.c + parent.c * child.d,
    d: parent.b * child.c + parent.d * child.d,
    e: parent.a * child.e + parent.c * child.f + parent.e,
    f: parent.b * child.e + parent.d * child.f + parent.f,
  };
}

/** Grounding happens after the hierarchy so a foot can remain planted while
 * the shoulders move. Airborne performances set the contact weight to zero. */
export function anchorToGround(point, neutral, weight = 1) {
  const contact = unit(weight);
  return {
    ...point,
    x: point.x + (neutral.x - point.x) * contact,
    y: point.y + (neutral.y - point.y) * contact,
  };
}
