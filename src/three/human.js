import * as THREE from "three";
import { createModelKit } from "./model-kit.js";

function faceGeometry() {
  const geometry = new THREE.SphereGeometry(1, 40, 32);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const cheek = 1 + Math.exp(-(((y + 0.2) / 0.45) ** 2)) * 0.065;
    const jaw = y < -0.5 ? 1 + (y + 0.5) * 0.1 : 1;
    positions.setX(i, positions.getX(i) * cheek * jaw);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// A continuous, fluted hair shell joins the swept curls. Its low sides and
// nape make a full silhouette around the ears even when Mattie turns around.
function hairCapGeometry() {
  const vertices = [];
  const indices = [];
  const rows = 28;
  const columns = 64;
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const phi = (column / columns) * Math.PI * 2 - Math.PI / 2;
      const frontal = THREE.MathUtils.smoothstep(Math.sin(phi), 0.08, 0.86);
      const edge = THREE.MathUtils.lerp(2.07, 1.13, frontal);
      const theta = (row / rows) * (edge + Math.sin(phi * 5 + 0.7) * 0.04);
      const flute = 1 + Math.sin(phi * 10 + theta * 3) * 0.022;
      vertices.push(
        Math.cos(phi) * Math.sin(theta) * 0.79 * flute,
        0.64 + Math.cos(theta) * 0.79,
        -0.045 + Math.sin(phi) * Math.sin(theta) * 0.64 * flute,
      );
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        const b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
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

function ribbonGeometry() {
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.25, 0.47, 0.21),
    new THREE.Vector3(-0.15, 0.35, 0.285),
    new THREE.Vector3(0.02, 0.19, 0.342),
    new THREE.Vector3(0.2, 0.04, 0.355),
    new THREE.Vector3(0.32, -0.025, 0.335),
  ]);
  const vertices = [];
  const indices = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const point = path.getPoint(i / steps);
    const tangent = path.getTangent(i / steps);
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0)
      .normalize()
      .multiplyScalar(0.081);
    for (const depth of [0.026, 0]) {
      vertices.push(point.x - normal.x, point.y - normal.y, point.z + depth);
      vertices.push(point.x + normal.x, point.y + normal.y, point.z + depth);
    }
    if (i < steps) {
      const a = i * 4;
      indices.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
      indices.push(a + 2, a + 6, a + 3, a + 3, a + 6, a + 7);
      indices.push(a, a + 4, a + 2, a + 2, a + 4, a + 6);
      indices.push(a + 1, a + 3, a + 5, a + 3, a + 7, a + 5);
    }
  }
  indices.push(0, 2, 1, 1, 2, 3);
  const last = steps * 4;
  indices.push(last, last + 1, last + 2, last + 1, last + 3, last + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createHuman() {
  const kit = createModelKit();
  const root = new THREE.Group();
  root.name = "Mattie";
  const skin = kit.mat("#DFAC7D", { roughness: 0.62 });
  const skinWarm = kit.mat("#CC906A", { roughness: 0.65 });
  const blush = kit.mat("#E3A18A", { roughness: 0.67 });
  const purple = kit.mat("#9D83CF", { roughness: 0.67 });
  const purpleLight = kit.mat("#B59BDF", { roughness: 0.68 });
  const purpleShadow = kit.mat("#8B72BE", { roughness: 0.68 });
  const cream = kit.mat("#FFF1D2", { roughness: 0.64 });
  const gold = kit.mat("#E7B84A", {
    metalness: 0.25,
    roughness: 0.38,
    clearcoat: 0.18,
  });
  const hair = kit.mat("#543322", { roughness: 0.63 });
  const curl = kit.mat("#603A28", { roughness: 0.62 });
  const curlLight = kit.mat("#6E4530", { roughness: 0.64 });
  const sandal = kit.mat("#8A5937", { roughness: 0.67 });
  const sole = kit.mat("#65432D", { roughness: 0.75 });
  const mouth = kit.mat("#713B38", { roughness: 0.72 });
  const tongue = kit.mat("#DD9292", { roughness: 0.65 });

  for (const side of [-1, 1]) {
    const name = side < 0 ? "Left" : "Right";
    const foot = kit.joint(root, `foot${name}`, [side * 0.245, 0, 0.06]);
    kit.ellipsoid(foot, skin, [0, 0.3, -0.025], [0.125, 0.19, 0.13]);
    kit.ellipsoid(foot, sole, [0, 0.06, 0.075], [0.205, 0.06, 0.265]);
    kit.ellipsoid(foot, skin, [0, 0.165, 0.085], [0.18, 0.11, 0.235]);
    kit.tube(
      foot,
      sandal,
      [
        [-0.175, 0.175, 0.095],
        [-0.12, 0.25, 0.095],
        [0, 0.275, 0.1],
        [0.12, 0.25, 0.095],
        [0.175, 0.175, 0.095],
      ],
      0.036,
      18,
    );
    for (let toe = 0; toe < 3; toe++) {
      kit.ellipsoid(
        foot,
        skin,
        [(toe - 1) * 0.075, 0.16, 0.275],
        [0.046, 0.036, 0.043],
      );
    }
  }

  const body = kit.joint(root, "body", [0, 0.68, 0]);
  const chest = kit.joint(body, "chest", [0, 0.19, 0]);
  const tunicProfile = [
    [0, -0.49],
    [0.445, -0.49],
    [0.495, -0.475],
    [0.515, -0.43],
    [0.49, -0.29],
    [0.45, -0.12],
    [0.405, 0.07],
    [0.39, 0.25],
    [0.385, 0.35],
    [0.325, 0.44],
    [0.21, 0.51],
    [0, 0.525],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  kit.mesh(
    chest,
    new THREE.LatheGeometry(tunicProfile, 48),
    purple,
    [0, 0, 0],
    [1, 1, 0.81],
  );
  kit.ellipsoid(chest, skin, [0, 0.54, 0], [0.18, 0.18, 0.17]);
  kit.mesh(
    chest,
    new THREE.TorusGeometry(0.493, 0.022, 10, 48),
    purpleLight,
    [0, -0.45, 0],
    [1, 0.81, 1],
    [Math.PI / 2, 0, 0],
  );
  kit.mesh(
    chest,
    new THREE.TorusGeometry(0.412, 0.03, 10, 48),
    gold,
    [0, 0.035, 0],
    [1, 0.81, 1],
    [Math.PI / 2, 0, 0],
  );
  kit.mesh(chest, ribbonGeometry(), cream);
  for (const x of [-0.31, -0.14, 0.15, 0.31]) {
    const z = Math.sqrt(Math.max(0.03, 0.49 ** 2 - x * x)) * 0.81;
    kit.tube(
      chest,
      Math.abs(x) < 0.2 ? purpleLight : purpleShadow,
      [
        [x * 0.78, -0.1, z - 0.06],
        [x * 0.94, -0.29, z + 0.002],
        [x, -0.43, z + 0.01],
      ],
      0.009,
      12,
    );
  }

  kit.wing(chest, "wingLeft", [-0.4, 0.28, -0.25], {
    side: -1,
    size: 0.98,
    color: "#FFF1D8",
  });
  kit.wing(chest, "wingRight", [0.4, 0.28, -0.25], {
    side: 1,
    size: 0.98,
    color: "#FFF1D8",
  });

  // The arms open out from a short, round torso. Short fingers merge into soft
  // palms, retaining an articulated hand without a spindly adult silhouette.
  for (const side of [-1, 1]) {
    const name = side < 0 ? "Left" : "Right";
    const shoulder = kit.joint(
      chest,
      `arm${name}`,
      [side * 0.38, 0.36, 0.025],
      [0, 0, side * 0.96],
    );
    const sleeveProfile = [
      [0, -0.28],
      [0.16, -0.28],
      [0.188, -0.25],
      [0.19, -0.19],
      [0.17, -0.045],
      [0.13, 0.035],
      [0, 0.07],
    ].map(([radius, y]) => new THREE.Vector2(radius, y));
    kit.mesh(
      shoulder,
      new THREE.LatheGeometry(sleeveProfile, 32),
      purple,
      [0, 0, 0],
      [1, 1, 0.95],
    );
    kit.mesh(
      shoulder,
      new THREE.TorusGeometry(0.164, 0.014, 8, 32),
      purpleLight,
      [0, -0.258, 0],
      [1, 0.95, 1],
      [Math.PI / 2, 0, 0],
    );
    const elbow = kit.joint(
      shoulder,
      `forearm${name}`,
      [0, -0.245, 0],
      [-0.24, 0, side * 0.1],
    );
    kit.ellipsoid(elbow, skin, [0, -0.095, 0.01], [0.115, 0.145, 0.11]);
    const wrist = kit.joint(
      elbow,
      `hand${name}`,
      [0, -0.225, 0.025],
      [0, 0, -side * 0.18],
    );
    kit.ellipsoid(wrist, skin, [0, -0.055, 0.015], [0.135, 0.12, 0.083]);
    kit.ellipsoid(
      wrist,
      skin,
      [-side * 0.117, -0.035, 0.065],
      [0.063, 0.075, 0.055],
      [0, 0, side * 0.5],
    );
    for (let finger = 0; finger < 4; finger++) {
      const x = (finger - 1.5) * 0.054;
      kit.ellipsoid(
        wrist,
        skin,
        [x, finger === 1 || finger === 2 ? -0.145 : -0.129, 0.025],
        [0.036, 0.058, 0.047],
      );
    }
  }

  const head = kit.joint(chest, "head", [0, 0.51, 0]);
  kit.mesh(head, faceGeometry(), skin, [0, 0.55, 0.02], [0.74, 0.71, 0.59]);
  for (const side of [-1, 1]) {
    kit.ellipsoid(
      head,
      skin,
      [side * 0.705, 0.53, 0.045],
      [0.135, 0.17, 0.105],
    );
    kit.ellipsoid(
      head,
      skinWarm,
      [side * 0.725, 0.535, 0.13],
      [0.067, 0.105, 0.024],
    );
    kit.ellipsoid(
      head,
      blush,
      [side * 0.43, 0.385, 0.515],
      [0.108, 0.055, 0.025],
    );
  }
  kit.eyes(head, {
    positions: [
      [-0.265, 0.665, 0.562],
      [0.265, 0.665, 0.562],
    ],
    radius: 0.17,
    scale: [1, 1.08, 0.65],
    skin,
    iris: "#6E442A",
  });
  const faceZ = (x, y) =>
    0.02 +
    0.59 *
      Math.sqrt(Math.max(0, 1 - (x / 0.74) ** 2 - ((y - 0.55) / 0.71) ** 2));
  for (const side of [-1, 1]) {
    const eyebrow = [
      [side * 0.39, 0.925],
      [side * 0.27, 0.96],
      [side * 0.15, 0.934],
    ].map(([x, y]) => [x, y, faceZ(x, y) + 0.019]);
    kit.tube(head, hair, eyebrow, 0.026, 18);
  }
  kit.ellipsoid(head, skin, [0, 0.455, 0.628], [0.09, 0.067, 0.072]);

  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.145, 0.018);
  mouthShape.quadraticCurveTo(0, -0.006, 0.145, 0.018);
  mouthShape.quadraticCurveTo(0.11, -0.112, 0, -0.125);
  mouthShape.quadraticCurveTo(-0.11, -0.112, -0.145, 0.018);
  kit.mesh(
    head,
    new THREE.ExtrudeGeometry(mouthShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSize: 0.009,
      bevelThickness: 0.008,
      bevelSegments: 3,
      curveSegments: 20,
    }),
    mouth,
    [0, 0.3, 0.592],
  );
  const teeth = new THREE.Shape();
  teeth.moveTo(-0.1, 0.008);
  teeth.quadraticCurveTo(0, -0.008, 0.1, 0.008);
  teeth.lineTo(0.085, -0.024);
  teeth.quadraticCurveTo(0, -0.035, -0.085, -0.024);
  teeth.closePath();
  kit.mesh(
    head,
    new THREE.ExtrudeGeometry(teeth, {
      depth: 0.005,
      bevelEnabled: true,
      bevelSize: 0.003,
      bevelThickness: 0.003,
      bevelSegments: 2,
    }),
    cream,
    [0, 0.3, 0.63],
  );
  kit.ellipsoid(head, tongue, [0, 0.205, 0.63], [0.065, 0.027, 0.012]);

  kit.mesh(head, hairCapGeometry(), hair);
  const locks = [
    [
      [-0.67, 1.0, 0.28],
      [-0.6, 1.28, 0.4],
      [-0.39, 1.38, 0.53],
      [-0.25, 1.26, 0.62],
      [-0.36, 1.14, 0.65],
    ],
    [
      [-0.34, 1.25, 0.31],
      [-0.19, 1.43, 0.43],
      [0.04, 1.36, 0.56],
      [0.09, 1.19, 0.65],
      [-0.035, 1.12, 0.66],
    ],
    [
      [0.02, 1.29, 0.3],
      [0.22, 1.42, 0.4],
      [0.4, 1.29, 0.53],
      [0.36, 1.12, 0.63],
      [0.25, 1.15, 0.65],
    ],
    [
      [0.37, 1.18, 0.24],
      [0.6, 1.28, 0.34],
      [0.7, 1.12, 0.43],
      [0.62, 0.96, 0.52],
      [0.51, 1.01, 0.57],
    ],
    [
      [-0.7, 1.0, 0.05],
      [-0.81, 0.9, 0.12],
      [-0.8, 0.69, 0.21],
      [-0.67, 0.63, 0.3],
      [-0.62, 0.74, 0.32],
    ],
    [
      [0.71, 1.0, 0.02],
      [0.81, 0.88, 0.12],
      [0.79, 0.67, 0.21],
      [0.67, 0.62, 0.3],
      [0.62, 0.73, 0.32],
    ],
    [
      [-0.68, 0.82, -0.22],
      [-0.81, 0.65, -0.17],
      [-0.79, 0.43, -0.025],
      [-0.65, 0.39, 0.08],
      [-0.61, 0.48, 0.13],
    ],
    [
      [0.68, 0.81, -0.22],
      [0.8, 0.64, -0.17],
      [0.78, 0.43, -0.025],
      [0.65, 0.39, 0.08],
      [0.61, 0.48, 0.13],
    ],
    [
      [-0.56, 1.24, -0.18],
      [-0.69, 1.06, -0.36],
      [-0.71, 0.83, -0.44],
      [-0.59, 0.69, -0.49],
      [-0.49, 0.77, -0.51],
    ],
    [
      [0.56, 1.24, -0.18],
      [0.69, 1.06, -0.36],
      [0.71, 0.83, -0.44],
      [0.59, 0.69, -0.49],
      [0.49, 0.77, -0.51],
    ],
    [
      [-0.32, 1.39, -0.13],
      [-0.41, 1.22, -0.46],
      [-0.41, 0.95, -0.61],
      [-0.28, 0.82, -0.64],
      [-0.17, 0.91, -0.64],
    ],
    [
      [0.27, 1.39, -0.13],
      [0.39, 1.2, -0.46],
      [0.4, 0.93, -0.61],
      [0.27, 0.8, -0.64],
      [0.16, 0.89, -0.64],
    ],
    [
      [-0.5, 0.72, -0.44],
      [-0.58, 0.54, -0.42],
      [-0.45, 0.34, -0.43],
      [-0.25, 0.32, -0.5],
      [-0.2, 0.44, -0.55],
    ],
    [
      [0.49, 0.72, -0.44],
      [0.57, 0.54, -0.42],
      [0.44, 0.34, -0.43],
      [0.24, 0.32, -0.5],
      [0.19, 0.44, -0.55],
    ],
    [
      [-0.1, 1.39, -0.25],
      [0.04, 1.19, -0.57],
      [0.02, 0.9, -0.69],
      [-0.09, 0.72, -0.7],
      [-0.2, 0.8, -0.68],
    ],
  ];
  locks.forEach((points, index) => {
    kit.taperedTube(
      head,
      index % 4 === 0 ? curlLight : curl,
      points,
      [0.115, 0.145, 0.14, 0.105, 0.04],
      36,
    );
  });

  const halo = kit.joint(head, "halo", [0, 1.67, -0.015], [0.05, 0, -0.12]);
  kit.mesh(
    halo,
    new THREE.TorusGeometry(0.39, 0.02, 12, 64),
    gold,
    [0, 0, 0],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  return {
    root,
    joints: kit.joints,
    eyes: kit.eyeRigs,
    height: 3.14,
    headCenter: [0, 1.93, 0.02],
    radius: Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
  };
}
