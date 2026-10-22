import * as THREE from "three";
import { createModelKit } from "./model-kit.js";

const UP = new THREE.Vector3(0, 1, 0);

// Juno's bill is a solid swept hook: the round baby face still reads as an
// eagle from the side, with a distinct upper culmen and a separate lower bill.
function hookedBeakGeometry() {
  const points = [
    [0, 0.31, 0.5],
    [0, 0.32, 0.72],
    [0, 0.27, 0.94],
    [0, 0.19, 1.05],
    [0, 0.08, 1.04],
    [0, 0.025, 0.985],
  ];
  const widths = [0.17, 0.255, 0.23, 0.14, 0.06, 0.004];
  const depths = [0.11, 0.14, 0.125, 0.09, 0.05, 0.004];
  const path = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
    false,
    "catmullrom",
    0.3,
  );
  const positions = [];
  const indices = [];
  const sections = 36;
  const sides = 24;
  for (let i = 0; i <= sections; i++) {
    const t = i / sections;
    const center = path.getPoint(t);
    const tangent = path.getTangent(t).normalize();
    const across = new THREE.Vector3(1, 0, 0);
    const normal = new THREE.Vector3()
      .crossVectors(tangent, across)
      .normalize();
    const f = t * (widths.length - 1);
    const low = Math.min(widths.length - 2, Math.floor(f));
    const blend = f - low;
    const width = THREE.MathUtils.lerp(widths[low], widths[low + 1], blend);
    const depth = THREE.MathUtils.lerp(depths[low], depths[low + 1], blend);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const p = center
        .clone()
        .addScaledVector(across, Math.cos(angle) * width)
        .addScaledVector(normal, Math.sin(angle) * depth);
      positions.push(p.x, p.y, p.z);
      if (i < sections && j < sides) {
        const a = i * (sides + 1) + j;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// The open lower mandible is a shallow solid cup. Its rim rises at the
// corners, giving the mouth a smile rather than a horizontal tooth-like bar.
function lowerBillGeometry() {
  const vertices = [];
  const indices = [];
  const rows = 14;
  const sides = 40;
  for (let layer = 0; layer < 2; layer++) {
    const width = layer ? 0.195 : 0.215;
    const depth = layer ? 0.183 : 0.2;
    for (let row = 0; row <= rows; row++) {
      const theta = ((row / rows) * Math.PI) / 2;
      for (let side = 0; side <= sides; side++) {
        const phi = (side / sides) * Math.PI * 2;
        const x = Math.sin(theta) * Math.cos(phi) * width;
        const z = 0.8 + Math.sin(theta) * Math.sin(phi) * depth;
        const y =
          (layer ? -0.1 : -0.125) +
          (1 - Math.cos(theta)) * 0.065 +
          0.17 * (x / width) ** 2;
        vertices.push(x, y, z);
        if (row < rows && side < sides) {
          const a = layer * (rows + 1) * (sides + 1) + row * (sides + 1) + side;
          const b = a + sides + 1;
          if (layer) indices.push(a, a + 1, b, a + 1, b + 1, b);
          else indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
  }
  const outer = rows * (sides + 1);
  const inner = (rows + 1) * (sides + 1) + outer;
  for (let side = 0; side < sides; side++) {
    const a = outer + side;
    const b = inner + side;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
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

function softFeatherGeometry() {
  const geometry = new THREE.SphereGeometry(1, 24, 18);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    positions.setXYZ(
      i,
      positions.getX(i) * (0.8 - y * 0.09),
      (y + 1) * 0.5,
      positions.getZ(i) * 0.8 + y * y * 0.065,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createEagle() {
  const kit = createModelKit();
  const root = new THREE.Group();
  root.name = "Juno";
  const white = kit.mat("#FFF8EB");
  const pearl = kit.mat("#F1E6D4");
  const brown = kit.mat("#855033");
  const warmBrown = kit.mat("#965D3B");
  const featherBrown = kit.mat("#A66D47");
  const gold = kit.mat("#EEB23F", { roughness: 0.48, clearcoat: 0.12 });
  const sunlitGold = kit.mat("#F5C354", { roughness: 0.48 });
  const dark = kit.mat("#67452D", { roughness: 0.56 });
  const mouth = kit.mat("#783D33", { roughness: 0.65 });
  const pink = kit.mat("#E99694", { roughness: 0.62 });
  const featherGeometry = softFeatherGeometry();

  function feather(
    parent,
    material,
    position,
    length,
    width,
    thickness,
    direction,
  ) {
    const part = kit.mesh(parent, featherGeometry, material, position, [
      width,
      length,
      thickness,
    ]);
    part.quaternion.setFromUnitVectors(
      UP,
      new THREE.Vector3(...direction).normalize(),
    );
    return part;
  }

  const body = kit.joint(root, "body", [0, 0.88, 0]);
  const chest = kit.joint(body, "chest", [0, 0.06, 0]);
  kit.pear(chest, brown, [0, 0, -0.015], [0.55, 0.61, 0.43], 0.15);
  kit.ellipsoid(chest, warmBrown, [0, 0.06, 0.18], [0.46, 0.49, 0.3]);

  // Broad, overlapping ovals make a soft feathered belly, with no sharp tips.
  for (let row = 0; row < 3; row++) {
    const count = row === 2 ? 4 : 5;
    for (let index = 0; index < count; index++) {
      const x = (index - (count - 1) / 2) * 0.19;
      const curve = Math.sqrt(Math.max(0.1, 1 - (x / 0.56) ** 2));
      feather(
        chest,
        (index + row) % 4 === 0 ? featherBrown : warmBrown,
        [x, 0.34 - row * 0.225, 0.32 * curve + 0.09],
        0.31,
        0.205,
        0.065,
        [x * 0.15, -1, 0.08],
      );
    }
  }

  const tail = kit.joint(chest, "tail", [0, -0.24, -0.3]);
  for (let index = 0; index < 5; index++) {
    feather(
      tail,
      index % 2 ? pearl : white,
      [(index - 2) * 0.085, 0.04, 0],
      0.46 - Math.abs(index - 2) * 0.025,
      0.19,
      0.08,
      [(index - 2) * 0.18, -1, -0.34],
    );
  }

  function wing(side) {
    const label = side < 0 ? "Left" : "Right";
    const shoulder = kit.joint(
      chest,
      `wing${label}`,
      [side * 0.44, 0.22, -0.07],
      [0, side * 0.12, side * 0.025],
    );
    kit.ellipsoid(
      shoulder,
      brown,
      [side * 0.14, 0.025, 0],
      [0.28, 0.205, 0.14],
      [0, 0, side * 0.12],
    );
    const elbow = kit.joint(shoulder, `elbow${label}`, [
      side * 0.3,
      0.035,
      -0.015,
    ]);
    kit.ellipsoid(
      elbow,
      warmBrown,
      [side * 0.085, 0.01, 0],
      [0.21, 0.16, 0.105],
    );
    // Slender, overlapping primaries make an arched fan: the middle tips reach
    // furthest outward, while the top and lower edge sweep back to the body.
    const lengths = [0.85, 0.91, 0.91, 0.86, 0.77, 0.65];
    for (let index = 0; index < 6; index++) {
      feather(
        elbow,
        index % 2 ? warmBrown : brown,
        [
          side * (0.035 + index * 0.021),
          0.135 - index * 0.043,
          -0.035 - index * 0.008,
        ],
        lengths[index],
        0.145,
        0.065,
        [side, 0.52 - index * 0.185, -0.04],
      );
    }
    for (let index = 0; index < 5; index++) {
      feather(
        shoulder,
        index % 2 ? featherBrown : warmBrown,
        [side * (0.035 + index * 0.06), 0.12 - index * 0.044, 0.105],
        0.34 - index * 0.014,
        0.145,
        0.055,
        [side, 0.25 - index * 0.19, 0.015],
      );
    }
    for (let index = 0; index < 4; index++) {
      feather(
        elbow,
        index % 2 ? warmBrown : featherBrown,
        [side * (0.025 + index * 0.043), 0.1 - index * 0.061, 0.1],
        0.34 - index * 0.015,
        0.135,
        0.055,
        [side, 0.2 - index * 0.19, 0.02],
      );
    }
  }
  wing(-1);
  wing(1);

  // The head occupies over half the silhouette: broad cheeks and an extremely
  // short neck give Juno the proportions of a baby collectible companion.
  const head = kit.joint(chest, "head", [0, 0.64, 0.045]);
  kit.ellipsoid(head, white, [0, 0.43, -0.025], [0.8, 0.76, 0.635]);
  kit.ellipsoid(head, white, [0, 0.22, 0.18], [0.67, 0.48, 0.46]);
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2;
    const front = Math.cos(angle);
    feather(
      head,
      index % 4 ? white : pearl,
      [Math.sin(angle) * 0.56, 0.08, front * 0.435 - 0.025],
      0.31 + (front > 0 ? 0.025 : 0),
      0.265,
      0.11,
      [Math.sin(angle) * 0.18, -1, front * 0.12],
    );
  }
  // Low, swept crown locks overlap the skull instead of making a spiky crest.
  for (let index = 0; index < 4; index++) {
    feather(
      head,
      white,
      [-0.34 + index * 0.21, 1.025 + (index % 2) * 0.025, -0.16],
      0.28,
      0.21,
      0.1,
      [-0.3 + index * 0.17, 0.2, -1],
    );
  }

  kit.eyes(head, {
    positions: [
      [-0.295, 0.55, 0.575],
      [0.295, 0.55, 0.575],
    ],
    radius: 0.186,
    scale: [1, 1.08, 0.65],
    skin: white,
    iris: "#83502D",
  });
  for (const side of [-1, 1]) {
    kit.tube(
      head,
      white,
      [
        [side * 0.13, 0.79, 0.55],
        [side * 0.28, 0.825, 0.54],
        [side * 0.43, 0.79, 0.5],
      ],
      0.045,
      18,
    );
    kit.ellipsoid(head, white, [side * 0.53, 0.255, 0.43], [0.18, 0.19, 0.095]);
  }

  kit.ellipsoid(head, mouth, [0, 0.08, 0.8], [0.188, 0.12, 0.18]);
  kit.mesh(head, lowerBillGeometry(), gold);
  kit.tube(
    head,
    gold,
    [
      [-0.195, 0.105, 0.79],
      [-0.17, 0.025, 0.92],
      [0, -0.057, 1.0],
      [0.17, 0.025, 0.92],
      [0.195, 0.105, 0.79],
    ],
    0.022,
    32,
  );
  kit.ellipsoid(head, pink, [0, -0.009, 0.95], [0.085, 0.028, 0.04]);
  kit.mesh(head, hookedBeakGeometry(), gold);
  for (const side of [-1, 1]) {
    kit.ellipsoid(
      head,
      dark,
      [side * 0.176, 0.345, 0.735],
      [0.022, 0.014, 0.011],
      [0, side * 0.5, 0],
    );
    kit.smile(
      head,
      mouth,
      [
        [side * 0.155, 0.12, 0.64],
        [side * 0.21, 0.115, 0.7],
        [side * 0.215, 0.145, 0.75],
      ],
      0.012,
    );
  }

  for (const side of [-1, 1]) {
    const foot = kit.joint(root, side < 0 ? "footLeft" : "footRight", [
      side * 0.255,
      0.075,
      0.055,
    ]);
    kit.taperedTube(
      foot,
      gold,
      [
        [0, 0.285, -0.02],
        [0, 0.17, -0.015],
        [0, 0.045, 0.065],
      ],
      [0.09, 0.095, 0.105],
      18,
    );
    kit.ellipsoid(foot, sunlitGold, [0, 0.01, 0.11], [0.195, 0.085, 0.17]);
    for (let toe = 0; toe < 3; toe++) {
      const spread = (toe - 1) * 0.135;
      const end = 0.31 - Math.abs(toe - 1) * 0.035;
      kit.taperedTube(
        foot,
        gold,
        [
          [spread * 0.4, 0.045, 0.12],
          [spread * 0.9, 0.005, 0.225],
          [spread, -0.025, end],
        ],
        [0.065, 0.058, 0.042],
        18,
      );
      kit.ellipsoid(
        foot,
        dark,
        [spread, -0.024, end + 0.017],
        [0.036, 0.026, 0.055],
        [-0.2, 0, 0],
      );
    }
    kit.taperedTube(
      foot,
      gold,
      [
        [0.04 * side, 0.035, 0.03],
        [0.08 * side, 0.0, -0.085],
        [0.08 * side, -0.018, -0.12],
      ],
      [0.06, 0.045, 0.015],
      16,
    );
  }

  return {
    root,
    joints: kit.joints,
    eyes: kit.eyeRigs,
    height: 2.8,
    headCenter: [0, 2.01, 0.02],
    radius: 1.74,
  };
}
