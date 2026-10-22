import test from "node:test";
import assert from "node:assert/strict";
import { advanceSpring } from "../src/three/spring.js";

test("damped springs preserve their trajectory across frame rates", () => {
  for (const damping of [0.65, 1, 1.4]) {
    const simulate = (fps) => {
      let state = { value: -8, velocity: 12 };
      for (let i = 0; i < fps; i++) {
        state = advanceSpring(state, 6, 1 / fps, { damping, frequency: 1.4 });
      }
      return state;
    };
    const slow = simulate(30);
    const fast = simulate(120);
    assert.ok(Math.abs(slow.value - fast.value) < 1e-8);
    assert.ok(Math.abs(slow.velocity - fast.velocity) < 1e-8);
  }
});
