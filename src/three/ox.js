import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createModelKit } from "./model-kit.js";

// The blaze follows the round forehead in three dimensions.
function foreheadBlaze() {
  const vertices = [],
    indices = [];
  const rows = 24,
    columns = 8;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const y = THREE.MathUtils.lerp(0.96, 0.03, t);
    const halfWidth = 0.115 + Math.sin(t * Math.PI) * 0.025 + t * t * 0.025;
    for (let column = 0; column <= columns; column++) {
      const x = ((column / columns) * 2 - 1) * halfWidth;
      const surface = Math.max(
        0.01,
        1 - (x / 0.76) ** 2 - ((y - 0.27) / 0.71) ** 2,
      );
      vertices.push(x, y, 0.58 * Math.sqrt(surface) + 0.01);
      if (row < rows && column < columns) {
        const current = row * (columns + 1) + column;
        const next = current + columns + 1;
        indices.push(current, next, current + 1, current + 1, next, next + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createOx() {
  const kit = createModelKit();
  const { mat, mesh, ellipsoid, pear, taperedTube, tube, joint } = kit;
  const root = new THREE.Group();
  root.name = "Lou — baby ox companion";
  const coat = mat("#BC865D");
  const cheek = mat("#CD976C");
  const cream = mat("#FFEBD0", { roughness: 0.66 });
  const ivory = mat("#FFF2D8", { roughness: 0.5, clearcoat: 0.12 });
  const rose = mat("#E2A18E", { roughness: 0.68 });
  const hoof = mat("#735343", { roughness: 0.6 });
  const cleft = mat("#553E33", { roughness: 0.68 });
  const hair = mat("#A56A3F", { roughness: 0.65 });
  const hairLight = mat("#B97C48", { roughness: 0.65 });
  const smileInk = mat("#825A40", { roughness: 0.7 });
  const nostril = mat("#A57556", { roughness: 0.67 });

  const body = joint(root, "body", [0, 0.78, 0]);
  pear(body, coat, [0, 0.1, -0.04], [0.69, 0.7, 0.51], 0.18);
  const chest = joint(body, "chest", [0, 0.23, 0]);
  pear(chest, cream, [0, -0.1, 0.42], [0.46, 0.53, 0.115], 0.16);
  ellipsoid(chest, coat, [0, 0.4, -0.015], [0.35, 0.34, 0.32]);

  const hoofGeometry = new RoundedBoxGeometry(0.19, 0.24, 0.35, 4, 0.065);
  function clovenHoof(parent, position, scale = 1) {
    const foot = new THREE.Group();
    foot.position.fromArray(position);
    foot.scale.setScalar(scale);
    parent.add(foot);
    for (const side of [-1, 1])
      mesh(foot, hoofGeometry, hoof, [side * 0.098, 0.12, 0.025]);
    tube(
      foot,
      cleft,
      [
        [0, 0.06, 0.201],
        [0, 0.145, 0.202],
        [0, 0.224, 0.14],
      ],
      0.008,
      12,
    );
    return foot;
  }

  for (const [side, name] of [
    [-1, "footLeft"],
    [1, "footRight"],
  ]) {
    const leg = joint(root, name, [side * 0.43, 0, -0.24]);
    ellipsoid(leg, coat, [0, 0.41, -0.005], [0.265, 0.36, 0.26]);
    clovenHoof(leg, [0, 0, 0.055]);
  }
  // Thick, underlapping volumes conceal the elbow while retaining a full rig.
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? "Left" : "Right";
    const arm = joint(body, `arm${suffix}`, [side * 0.42, 0.4, 0.3]);
    ellipsoid(arm, coat, [0, -0.17, -0.015], [0.24, 0.29, 0.23]);
    const forearm = joint(arm, `forearm${suffix}`, [0, -0.38, 0.015]);
    ellipsoid(forearm, coat, [0, -0.24, 0.02], [0.215, 0.36, 0.21]);
    const hand = joint(forearm, `hand${suffix}`, [0, -0.56, 0.04]);
    clovenHoof(hand, [0, -0.24, 0.03]);
  }

  const tail = joint(body, "tail", [0.52, -0.2, -0.28]);
  taperedTube(
    tail,
    coat,
    [
      [0, 0, 0],
      [0.28, 0.05, -0.1],
      [0.42, 0.24, -0.15],
      [0.4, 0.43, -0.07],
    ],
    [0.065, 0.057, 0.043, 0.03],
  );
  pear(tail, hair, [0.4, 0.47, -0.07], [0.13, 0.18, 0.12], -0.12);

  for (const [side, sign] of [
    ["Left", -1],
    ["Right", 1],
  ]) {
    const wing = kit.wing(chest, `wing${side}`, [sign * 0.5, 0.3, -0.34], {
      color: "#FFF1D8",
      side: sign,
      size: 1.24,
    });
    wing.scale.y = 1.28;
  }

  const head = joint(chest, "head", [0, 0.77, 0.04]);
  ellipsoid(head, coat, [0, 0.27, 0], [0.76, 0.71, 0.58]);
  ellipsoid(head, cheek, [-0.43, 0.015, 0.325], [0.29, 0.3, 0.26]);
  ellipsoid(head, cheek, [0.43, 0.015, 0.325], [0.29, 0.3, 0.26]);
  mesh(head, foreheadBlaze(), cream);
  // A broad cream muzzle and a small smile keep Lou's expression gentle.
  ellipsoid(head, cream, [0, -0.085, 0.5], [0.625, 0.33, 0.345]);
  ellipsoid(head, cream, [0, -0.27, 0.38], [0.45, 0.13, 0.26]);
  for (const side of [-1, 1]) {
    ellipsoid(
      head,
      nostril,
      [side * 0.275, -0.025, 0.809],
      [0.048, 0.029, 0.012],
      [0, side * 0.18, side * 0.15],
    );
  }
  kit.smile(
    head,
    smileInk,
    [
      [-0.28, -0.16],
      [-0.16, -0.225],
      [0, -0.247],
      [0.16, -0.225],
      [0.28, -0.16],
    ].map(([x, y]) => [
      x,
      y,
      0.51 +
        0.345 * Math.sqrt(1 - (x / 0.625) ** 2 - ((y + 0.085) / 0.33) ** 2),
    ]),
    0.013,
  );

  kit.eyes(head, {
    positions: [
      [-0.325, 0.35, 0.536],
      [0.325, 0.35, 0.536],
    ],
    radius: 0.177,
    scale: [1, 1.07, 0.65],
    skin: coat,
    iris: "#815332",
  });
  const browPoint = (x, y) => [
    x,
    y,
    0.018 + 0.58 * Math.sqrt(1 - (x / 0.76) ** 2 - ((y - 0.27) / 0.71) ** 2),
  ];
  for (const side of [-1, 1]) {
    kit.smile(
      head,
      hair,
      [
        browPoint(side * 0.2, 0.61),
        browPoint(side * 0.3, 0.65),
        browPoint(side * 0.4, 0.65),
        browPoint(side * 0.48, 0.61),
      ],
      0.022,
    );
  }

  for (const side of [-1, 1]) {
    const suffix = side < 0 ? "Left" : "Right";
    const ear = joint(
      head,
      `ear${suffix}`,
      [side * 0.65, 0.45, -0.035],
      [0, side * 0.12, side * 0.08],
    );
    ellipsoid(
      ear,
      coat,
      [side * 0.19, -0.025, 0],
      [0.35, 0.21, 0.145],
      [0, 0, side * 0.15],
    );
    ellipsoid(
      ear,
      rose,
      [side * 0.205, -0.01, 0.119],
      [0.23, 0.125, 0.04],
      [0, side * 0.04, side * 0.12],
    );
    // Short, round-based ivory horns curl softly inward at their tips.
    taperedTube(
      head,
      ivory,
      [
        [side * 0.48, 0.78, -0.09],
        [side * 0.7, 0.84, -0.11],
        [side * 0.82, 1.0, -0.08],
        [side * 0.82, 1.16, -0.015],
        [side * 0.735, 1.24, 0.03],
      ],
      [0.135, 0.13, 0.105, 0.067, 0.007],
      38,
    );
  }

  taperedTube(
    head,
    hair,
    [
      [-0.29, 0.85, 0.19],
      [-0.17, 1.025, 0.2],
      [0.015, 1.035, 0.16],
      [0.17, 0.89, 0.13],
    ],
    [0.025, 0.14, 0.135, 0.015],
    22,
  );
  taperedTube(
    head,
    hairLight,
    [
      [-0.04, 0.89, 0.23],
      [0.09, 1.045, 0.22],
      [0.25, 0.99, 0.13],
      [0.3, 0.86, 0.08],
    ],
    [0.02, 0.115, 0.105, 0.01],
    22,
  );

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  return {
    root,
    joints: kit.joints,
    eyes: kit.eyeRigs,
    height: bounds.max.y,
    headCenter: [0, 2.08, 0.24],
    radius: Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
  };
}
