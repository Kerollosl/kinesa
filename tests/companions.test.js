import test from "node:test";
import assert from "node:assert/strict";
import { Group, basePose, drawCharacter } from "../src/companions/model.js";
import { ACTS, KINDS, poseFor } from "../src/companions/motion.js";

const build = (kind, P) => {
  const g = new Group();
  const report = [];
  drawCharacter(g, kind, P, report);
  return { prims: g.prims, report };
};
const finite = (p) =>
  [p.x, p.y, p.ang, p.br, ...p.p, ...p.col].every(Number.isFinite);

test("every companion builds clean shapes in every act and view", () => {
  for (const kind of Object.values(KINDS))
    for (const act of ACTS)
      for (const time of [0, 0.4, 1.3, 2.9, 7.1]) {
        const P = poseFor(kind, act, time, time);
        const { prims } = build(kind, P);
        assert.ok(prims.length > 25, `${kind} ${act} has a body`);
        assert.ok(prims.every(finite), `${kind} ${act} at ${time}s is finite`);
        for (const p of prims) {
          assert.ok(p.clip < prims.length, "clip parents exist");
          assert.ok(p.br > 0, "every shape has a size");
        }
      }
});

test("poses are a pure function of time", () => {
  for (const kind of Object.values(KINDS)) {
    const a = build(kind, poseFor(kind, "cheer", 3.21, 1.05)).prims;
    const b = build(kind, poseFor(kind, "cheer", 3.21, 1.05)).prims;
    assert.deepEqual(a, b);
  }
});

test("feet stay on the ground unless a hop lifts them", () => {
  for (const kind of Object.values(KINDS)) {
    const { prims } = build(kind, basePose({ turn: 0 }));
    const lowest = Math.max(...prims.map((p) => p.y));
    assert.ok(lowest > -12 && lowest <= 2, `${kind} stands on y = 0`);
    const cheer = poseFor(kind, "cheer", 0.33, 0.33);
    assert.ok(cheer.lift > 0, "a cheer hops");
  }
});

test("arms stay short: a hand never reaches past its arm", () => {
  for (const kind of Object.values(KINDS)) {
    const P = basePose({ turn: 0.75 });
    P.arms = { L: { target: [400, -80] }, R: { target: [400, -80] } };
    const { report } = build(kind, P);
    assert.equal(report.length, 2);
    assert.ok(
      report.every((r) => r.gap > 0),
      "far targets are reported, not stretched to",
    );
  }
});
