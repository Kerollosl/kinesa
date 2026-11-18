import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPANION_RIGS,
  rigPlacement,
} from "../src/components/companion-rig.js";
import {
  anchorToGround,
  createPartMesh,
  deformPart,
  jointMatrix,
  multiplyMatrices,
  transformPoint,
} from "../src/components/companion-deformation.js";

const names = ["body", "head", "wingLeft", "wingRight", "armLeft", "armRight"];
const channels = [
  "turn",
  "headTurn",
  "headPitch",
  "spine",
  "squash",
  "smile",
  "brow",
  "mane",
  "wingFoldLeft",
  "wingFoldRight",
  "wingCurlLeft",
  "wingCurlRight",
  "armBendLeft",
  "armBendRight",
];
const area = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

test("neutral meshes preserve painted part placement, UVs and complete coverage", () => {
  for (const [kind, rig] of Object.entries(COMPANION_RIGS)) {
    for (const name of names) {
      const mesh = createPartMesh(rig[name]);
      const placement = rigPlacement(rig[name]);
      assert.equal(mesh.vertices.length, 81);
      assert.equal(mesh.triangles.length, 128);
      assert.deepEqual(
        deformPart(mesh, {
          kind,
          name,
          rig,
          pose: { deform: { ground: 1, plantLeft: 1, plantRight: 1 } },
        }),
        mesh.vertices,
      );
      assert.equal(mesh.vertices[0].x, placement.x);
      assert.equal(mesh.vertices[0].y, placement.y);
      assert.equal(mesh.vertices.at(-1).u, 1);
      assert.equal(mesh.vertices.at(-1).v, 1);
      let coverage = 0;
      for (const triangle of mesh.triangles) {
        const size = area(...triangle.map((index) => mesh.vertices[index]));
        assert.ok(size > 0);
        coverage += size / 2;
      }
      assert.ok(Math.abs(coverage - placement.width * placement.height) < 1e-8);
    }
  }
});

test("head turns curve the painted surface rather than translating a flat card", () => {
  const rig = COMPANION_RIGS.lion;
  const mesh = createPartMesh(rig.head);
  const result = deformPart(mesh, {
    kind: "lion",
    name: "head",
    rig,
    pose: { deform: { headTurn: 0.75 } },
  });
  const center = 4 * 9 + 4;
  const middleLeft = 4 * 9;
  const middleRight = middleLeft + 8;
  const centerTravel = result[center].x - mesh.vertices[center].x;
  const outlineAverage =
    (result[middleLeft].x -
      mesh.vertices[middleLeft].x +
      (result[middleRight].x - mesh.vertices[middleRight].x)) /
    2;
  assert.ok(centerTravel > outlineAverage + 2.5);
  assert.equal(result[center].u, mesh.vertices[center].u);
  assert.equal(result[center].v, mesh.vertices[center].v);
  assert.deepEqual(mesh.vertices[center], {
    x: mesh.placement.x + mesh.placement.width / 2,
    y: mesh.placement.y + mesh.placement.height / 2,
    u: 0.5,
    v: 0.5,
  });
});

test("spine movement travels through shoulders while the torso's foot baseline stays planted", () => {
  const rig = COMPANION_RIGS.ox;
  const mesh = createPartMesh(rig.body);
  const result = deformPart(mesh, {
    kind: "ox",
    name: "body",
    rig,
    pose: { deform: { spine: 1 } },
  });
  assert.ok(result[4].x > mesh.vertices[4].x + 3);
  for (let index = 72; index < 81; index++) {
    assert.ok(Math.abs(result[index].x - mesh.vertices[index].x) < 0.03);
    assert.equal(result[index].y, mesh.vertices[index].y);
  }
});

test("all full-range deformation combinations remain finite, preserve UVs and avoid inverted triangles", () => {
  // Deterministic mixed extremes exercise simultaneous turning, curling and
  // breathing, rather than testing one isolated channel at a time.
  for (const [kind, rig] of Object.entries(COMPANION_RIGS)) {
    for (const name of names) {
      const mesh = createPartMesh(rig[name]);
      for (let sample = 0; sample < 36; sample++) {
        const deform = Object.fromEntries(
          channels.map((key, index) => [
            key,
            Math.sin(sample * 1.7 + index * 2.3),
          ]),
        );
        const result = deformPart(mesh, { kind, name, rig, pose: { deform } });
        for (let index = 0; index < result.length; index++) {
          const original = mesh.vertices[index];
          const vertex = result[index];
          assert.ok(Number.isFinite(vertex.x) && Number.isFinite(vertex.y));
          assert.ok(
            Math.hypot(vertex.x - original.x, vertex.y - original.y) < 16,
          );
          assert.equal(vertex.u, original.u);
          assert.equal(vertex.v, original.v);
        }
        for (const triangle of mesh.triangles) {
          const before = area(...triangle.map((index) => mesh.vertices[index]));
          const after = area(...triangle.map((index) => result[index]));
          assert.ok(
            after > before * 0.45,
            `${kind}/${name} keeps triangles open`,
          );
        }
      }
    }
  }
});

test("arm and feather motion bends through the texture instead of rotating a rigid part", () => {
  const rig = COMPANION_RIGS.human;
  const arm = createPartMesh(rig.armRight);
  const bent = deformPart(arm, {
    kind: "human",
    name: "armRight",
    rig,
    pose: { deform: { armBendRight: 1 } },
  });
  assert.ok(bent[4 * 9 + 4].x > arm.vertices[4 * 9 + 4].x + 3);
  assert.equal(bent[8 * 9 + 4].x, arm.vertices[8 * 9 + 4].x);
  const wing = createPartMesh(rig.wingRight);
  const curled = deformPart(wing, {
    kind: "human",
    name: "wingRight",
    rig,
    pose: { deform: { wingCurlRight: 1 } },
  });
  const root = 4 * 9;
  const tip = root + 8;
  assert.ok(
    curled[tip].y - wing.vertices[tip].y >
      curled[root].y - wing.vertices[root].y + 6,
  );
});

test("joint matrices match SVG transform order and compose through parent bones", () => {
  const joint = { x: 3, y: -5, r: 31, sx: 1.04, sy: 0.96 };
  const pivot = { x: 78, y: 118 };
  const point = { x: 23, y: 42, u: 0.3, v: 0.4 };
  const angle = (joint.r * Math.PI) / 180;
  const x = (point.x - pivot.x) * joint.sx;
  const y = (point.y - pivot.y) * joint.sy;
  const expected = {
    x: x * Math.cos(angle) - y * Math.sin(angle) + pivot.x + joint.x,
    y: x * Math.sin(angle) + y * Math.cos(angle) + pivot.y + joint.y,
  };
  const transformed = transformPoint(jointMatrix(joint, pivot), point);
  assert.ok(Math.abs(transformed.x - expected.x) < 1e-10);
  assert.ok(Math.abs(transformed.y - expected.y) < 1e-10);
  assert.equal(transformed.u, point.u);
  assert.equal(transformed.v, point.v);
  const parent = jointMatrix({ r: -8, x: 2, y: 1 }, [100, 181]);
  const child = jointMatrix(joint, pivot);
  const sequential = transformPoint(parent, transformPoint(child, point));
  const composed = transformPoint(multiplyMatrices(parent, child), point);
  assert.ok(Math.abs(sequential.x - composed.x) < 1e-10);
  assert.ok(Math.abs(sequential.y - composed.y) < 1e-10);
});

test("the collar and torso evaluate the same skin field through a bend", () => {
  const rig = COMPANION_RIGS.ox;
  const [x, y, width, height] = rig.collar;
  const collar = createPartMesh({
    source: [0, 0, width, height],
    box: [x, y, width, height],
  });
  const body = createPartMesh(rig.body);
  const sample = collar.vertices[4 * 9 + 4];
  const torsoPoint = {
    ...sample,
    u: (sample.x - body.bounds.x) / body.bounds.width,
    v: (sample.y - body.bounds.y) / body.bounds.height,
  };
  const pose = { deform: { spine: 0.8, turn: -0.7, squash: 0.6 } };
  const patchResult = deformPart(collar, {
    kind: "ox",
    name: "collar",
    rig,
    pose,
  })[4 * 9 + 4];
  const torsoResult = deformPart(
    { ...body, vertices: [torsoPoint] },
    { kind: "ox", name: "body", rig, pose },
  )[0];
  assert.equal(patchResult.x, torsoResult.x);
  assert.equal(patchResult.y, torsoResult.y);
});

test("ground contact blends only the transformed position and invalid channels stay harmless", () => {
  const airborne = { x: 25, y: 14, u: 0.3, v: 0.8 };
  const rest = { x: 20, y: 30 };
  assert.deepEqual(anchorToGround(airborne, rest, 0), airborne);
  assert.deepEqual(anchorToGround(airborne, rest, 1), {
    x: 20,
    y: 30,
    u: 0.3,
    v: 0.8,
  });
  assert.deepEqual(anchorToGround(airborne, rest, 0.5), {
    x: 22.5,
    y: 22,
    u: 0.3,
    v: 0.8,
  });
  const rig = COMPANION_RIGS.eagle;
  const mesh = createPartMesh(rig.head);
  const deform = Object.fromEntries(
    channels.map((key, index) => [key, index % 2 ? NaN : Infinity]),
  );
  assert.deepEqual(
    deformPart(mesh, { kind: "eagle", name: "head", rig, pose: { deform } }),
    mesh.vertices,
  );
  assert.throws(
    () => createPartMesh({ source: [0, 0, 0, 1], box: [0, 0, 1, 1] }),
    TypeError,
  );
});
