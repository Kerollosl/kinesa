import * as THREE from "three";
import { createModelKit } from "./model-kit.js";

// A single deep volume keeps the fluffy mane convincing through a full turn.
function maneGeometry() {
  const geometry = new THREE.SphereGeometry(1, 48, 32);
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i),
      y = points.getY(i),
      z = points.getZ(i);
    const angle = Math.atan2(y, x);
    const edge = Math.pow(Math.min(1, Math.hypot(x, y)), 2.5);
    const fluff =
      (Math.cos(angle * 12 + 0.3) * 0.035 + Math.sin(angle * 7) * 0.014) * edge;
    points.setXYZ(i, x * 1.025 * (1 + fluff), y * 0.84 * (1 + fluff), z * 0.48);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function torsoGeometry() {
  const geometry = new THREE.SphereGeometry(1, 36, 28);
  const points = geometry.attributes.position;
  const colors = [];
  const gold = new THREE.Color("#E7A13C");
  const cream = new THREE.Color("#FFF0D1");
  const color = new THREE.Color();
  const smooth = (value) => {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i),
      y = points.getY(i),
      z = points.getZ(i);
    const fullness = 0.98 - y * 0.17;
    points.setXYZ(i, x * 0.68 * fullness, y * 0.72, z * 0.5 * fullness);
    const chest =
      smooth((z - 0.58) / 0.16) * smooth((0.8 - Math.abs(x)) / 0.16);
    color.copy(gold).lerp(cream, chest);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function noseGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.105, 0.065);
  shape.bezierCurveTo(-0.15, 0.055, -0.13, 0.005, -0.072, -0.047);
  shape.quadraticCurveTo(0, -0.12, 0.072, -0.047);
  shape.bezierCurveTo(0.13, 0.005, 0.15, 0.055, 0.105, 0.065);
  shape.quadraticCurveTo(0, 0.096, -0.105, 0.065);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.065,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.022,
    bevelThickness: 0.02,
    curveSegments: 16,
  });
}

export function createLion() {
  const kit = createModelKit();
  const root = new THREE.Group();
  root.name = "Leo — baby lion companion";
  const gold = kit.mat("#E7A13C");
  const faceGold = kit.mat("#F5B74C");
  const cream = kit.mat("#FFF0D1");
  const mane = kit.mat("#AD5524", { roughness: 0.66 });
  const maneLight = kit.mat("#C96A2C", { roughness: 0.64 });
  const maneShade = kit.mat("#94451D", { roughness: 0.66 });
  const innerEar = kit.mat("#E6A176");
  const nose = kit.mat("#6B4433", { roughness: 0.38 });
  const ink = kit.mat("#805336", { roughness: 0.65 });
  const torso = kit.mat("#FFFFFF", { vertexColors: true });

  const body = kit.joint(root, "body", [0, 0.82, -0.08]);
  const chest = kit.joint(body, "chest", [0, 0, 0]);
  kit.mesh(chest, torsoGeometry(), torso);
  // The sitting haunches and broad paws give the small body a soft, stable base.
  for (const sign of [-1, 1]) {
    kit.ellipsoid(root, gold, [sign * 0.49, 0.43, -0.12], [0.36, 0.39, 0.37]);
  }

  function paw(parent, scale = 1) {
    kit.ellipsoid(
      parent,
      faceGold,
      [0, 0, 0],
      [0.245 * scale, 0.18 * scale, 0.3 * scale],
    );
    for (const x of [-0.075, 0.075]) {
      kit.tube(
        parent,
        gold,
        [
          [x * scale, -0.01 * scale, 0.285 * scale],
          [x * scale, 0.045 * scale, 0.275 * scale],
          [x * scale, 0.09 * scale, 0.245 * scale],
        ],
        0.007 * scale,
      );
    }
  }
  for (const [side, sign] of [
    ["Left", -1],
    ["Right", 1],
  ]) {
    const foot = kit.joint(root, `foot${side}`, [sign * 0.54, 0.18, 0.1]);
    paw(foot);
    const arm = kit.joint(body, `arm${side}`, [sign * 0.39, 0.38, 0.31]);
    kit.ellipsoid(arm, gold, [0, -0.21, 0], [0.22, 0.32, 0.22]);
    const forearm = kit.joint(arm, `forearm${side}`, [0, -0.44, 0.02]);
    kit.ellipsoid(forearm, gold, [0, -0.27, 0.02], [0.205, 0.35, 0.21]);
    const hand = kit.joint(forearm, `hand${side}`, [0, -0.58, 0.13]);
    paw(hand, 0.98);
  }

  const tail = kit.joint(body, "tail", [0.51, -0.35, -0.2], [0, -0.15, 0]);
  kit.taperedTube(
    tail,
    gold,
    [
      [0, 0, 0],
      [0.31, 0.06, -0.1],
      [0.52, 0.3, -0.13],
      [0.53, 0.54, -0.07],
      [0.42, 0.66, -0.01],
    ],
    [0.1, 0.09, 0.077, 0.067, 0.04],
  );
  kit.pear(tail, maneLight, [0.42, 0.7, -0.01], [0.15, 0.22, 0.14], -0.08);

  for (const [side, sign] of [
    ["Left", -1],
    ["Right", 1],
  ]) {
    const wing = kit.wing(body, `wing${side}`, [sign * 0.46, 0.58, -0.25], {
      color: "#FFF1D9",
      side: sign,
      size: 1.22,
    });
    wing.scale.y = 1.24;
  }

  const head = kit.joint(body, "head", [0, 1.0, 0.12]);
  kit.mesh(head, maneGeometry(), mane, [0, 0.39, -0.08]);
  // Swept side locks follow the mane's continuous mass rather than a bead ring.
  for (const sign of [-1, 1]) {
    kit.taperedTube(
      head,
      maneLight,
      [
        [sign * 0.64, 0.91, 0.1],
        [sign * 0.86, 0.65, 0.16],
        [sign * 0.89, 0.32, 0.17],
        [sign * 0.73, -0.025, 0.16],
        [sign * 0.51, -0.22, 0.12],
      ],
      [0.1, 0.175, 0.18, 0.15, 0.04],
      38,
    );
  }
  // Broad overlapping sweeps break the outline into soft fur without
  // repeating separate balls around the face.
  for (const sign of [-1, 1]) {
    kit.taperedTube(
      head,
      maneLight,
      [
        [sign * 0.29, 1.11, 0.17],
        [sign * 0.61, 1.02, 0.23],
        [sign * 0.85, 0.79, 0.25],
        [sign * 0.97, 0.56, 0.19],
        [sign * 0.91, 0.43, 0.11],
      ],
      [0.055, 0.13, 0.16, 0.12, 0.002],
      30,
    );
    kit.taperedTube(
      head,
      sign < 0 ? mane : maneShade,
      [
        [sign * 0.92, 0.56, 0.18],
        [sign * 0.99, 0.33, 0.24],
        [sign * 0.87, 0.07, 0.27],
        [sign * 0.67, -0.11, 0.23],
        [sign * 0.49, -0.16, 0.15],
      ],
      [0.055, 0.145, 0.17, 0.13, 0.002],
      30,
    );
  }
  // One soft, off-center forehead quiff gives Leo a little baby-lion character.
  kit.taperedTube(
    head,
    maneLight,
    [
      [-0.43, 0.96, 0.3],
      [-0.26, 1.115, 0.36],
      [-0.015, 1.17, 0.38],
      [0.22, 1.085, 0.37],
      [0.36, 0.96, 0.3],
    ],
    [0.06, 0.135, 0.15, 0.12, 0.025],
    34,
  );
  kit.ellipsoid(head, maneShade, [0, -0.23, 0.17], [0.38, 0.2, 0.25]);
  kit.ellipsoid(head, faceGold, [0, 0.43, 0.27], [0.735, 0.67, 0.59]);

  for (const [name, sign] of [
    ["earLeft", -1],
    ["earRight", 1],
  ]) {
    const ear = kit.joint(
      head,
      name,
      [sign * 0.6, 0.88, 0.36],
      [0, sign * 0.1, sign * -0.15],
    );
    kit.ellipsoid(ear, gold, [0, 0, 0], [0.235, 0.24, 0.145]);
    kit.ellipsoid(ear, innerEar, [0, 0.01, 0.123], [0.145, 0.155, 0.04]);
  }

  kit.ellipsoid(head, cream, [-0.18, 0.11, 0.77], [0.3, 0.245, 0.245]);
  kit.ellipsoid(head, cream, [0.18, 0.11, 0.77], [0.3, 0.245, 0.245]);
  kit.ellipsoid(head, cream, [0, -0.065, 0.71], [0.3, 0.15, 0.22]);
  kit.mesh(head, noseGeometry(), nose, [0, 0.27, 0.965], [0.9, 0.9, 0.9]);
  kit.tube(
    head,
    ink,
    [
      [0, 0.21, 1.035],
      [0, 0.14, 1.04],
      [0, 0.075, 1.015],
    ],
    0.012,
  );
  for (const sign of [-1, 1]) {
    kit.smile(
      head,
      ink,
      [
        [sign * 0.32, 0.11, 0.943],
        [sign * 0.23, 0.015, 1.001],
        [sign * 0.095, 0.01, 1.035],
        [0, 0.075, 1.015],
      ],
      0.012,
    );
  }
  kit.eyes(head, {
    positions: [
      [-0.3, 0.57, 0.804],
      [0.3, 0.57, 0.804],
    ],
    radius: 0.173,
    scale: [1, 1.07, 0.65],
    skin: faceGold,
    iris: "#805232",
  });
  for (const sign of [-1, 1]) {
    kit.tube(
      head,
      maneShade,
      [
        [sign * 0.17, 0.81, 0.775],
        [sign * 0.29, 0.85, 0.748],
        [sign * 0.41, 0.81, 0.684],
      ],
      0.022,
    );
  }

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  return {
    root,
    joints: kit.joints,
    eyes: kit.eyeRigs,
    height: bounds.max.y,
    headCenter: [0, 2.25, 0.43],
    radius: Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
  };
}

export default createLion;
