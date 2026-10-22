import * as THREE from "three";

// A small sculpting vocabulary shared by the entire cast. All forms are true
// meshes: eyes, feathers, muzzles and horns retain depth when the character turns.
export function createModelKit() {
  const joints = {};
  const eyeRigs = [];
  const materials = new Map();
  const geometries = new Map();
  function mat(color, options = {}) {
    const key = JSON.stringify([color, options]);
    if (!materials.has(key)) {
      materials.set(
        key,
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.58,
          metalness: 0,
          clearcoat: 0.12,
          clearcoatRoughness: 0.5,
          ...options,
        }),
      );
    }
    return materials.get(key);
  }
  function mesh(
    parent,
    geometry,
    material,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.fromArray(position);
    object.scale.fromArray(scale);
    object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function ellipsoid(parent, material, position, scale, rotation) {
    if (!geometries.has("sphere"))
      geometries.set("sphere", new THREE.SphereGeometry(1, 20, 14));
    return mesh(
      parent,
      geometries.get("sphere"),
      material,
      position,
      scale,
      rotation,
    );
  }
  function pear(parent, material, position, scale, fullness = 0.2) {
    const key = `pear-${fullness}`;
    if (!geometries.has(key)) {
      const shape = new THREE.SphereGeometry(1, 24, 18);
      const positions = shape.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        const width = 1 - fullness * y;
        positions.setX(i, positions.getX(i) * width);
        positions.setZ(i, positions.getZ(i) * width);
      }
      shape.computeVertexNormals();
      geometries.set(key, shape);
    }
    return mesh(parent, geometries.get(key), material, position, scale);
  }
  function tube(parent, material, points, radius = 0.04, segments = 28) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return mesh(
      parent,
      new THREE.TubeGeometry(curve, segments, radius, 10, false),
      material,
    );
  }
  function taperedTube(parent, material, points, radii, segments = 32) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const frames = curve.computeFrenetFrames(segments, false);
    const vertices = [],
      normals = [],
      indices = [];
    const radial = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPointAt(t);
      const scaled = t * (radii.length - 1);
      const low = Math.min(radii.length - 2, Math.floor(scaled));
      const r = THREE.MathUtils.lerp(radii[low], radii[low + 1], scaled - low);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const n = frames.normals[i]
          .clone()
          .multiplyScalar(Math.cos(a))
          .addScaledVector(frames.binormals[i], Math.sin(a));
        vertices.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
        normals.push(n.x, n.y, n.z);
        if (i < segments && j < radial) {
          const current = i * (radial + 1) + j;
          const next = current + radial + 1;
          indices.push(current, current + 1, next, current + 1, next + 1, next);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(parent, geometry, material);
  }
  function feather(
    parent,
    material,
    position,
    length,
    width,
    thickness = 0.08,
    rotation,
  ) {
    // A tapered sculpted leaf with a round root and a gently swept tip.
    const key = "feather";
    if (!geometries.has(key)) {
      const g = new THREE.SphereGeometry(1, 16, 12);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const taper = 0.65 - y * 0.3;
        p.setXYZ(
          i,
          p.getX(i) * taper,
          (y + 1) * 0.5,
          p.getZ(i) * (0.8 - y * 0.25) + y * y * 0.1,
        );
      }
      g.computeVertexNormals();
      geometries.set(key, g);
    }
    return mesh(
      parent,
      geometries.get(key),
      material,
      position,
      [width, length, thickness],
      rotation,
    );
  }
  function joint(parent, name, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const group = new THREE.Group();
    group.name = `joint:${name}`;
    group.userData.dynamic = true;
    group.position.fromArray(position);
    group.rotation.set(...rotation);
    parent.add(group);
    joints[name] = group;
    return group;
  }
  function eyes(
    parent,
    {
      positions,
      radius = 0.15,
      scale = [1, 1.2, 0.65],
      skin,
      iris = "#5B3424",
    },
  ) {
    const white = mat("#FFF4DF", { roughness: 0.34, clearcoat: 0.2 });
    const socket = mat("#79482F", { roughness: 0.62 });
    const irisMat = mat("#FFFFFF", {
      vertexColors: true,
      roughness: 0.4,
      clearcoat: 0.1,
    });
    const pupilMat = mat("#201611", { roughness: 0.44, clearcoat: 0.08 });
    const shineMat = mat("#FFF9EB", {
      roughness: 0.3,
      emissive: "#FFF9EB",
      emissiveIntensity: 0.08,
    });
    // Curved iris and pupil caps follow the actual eyeball surface. Their
    // generous dark area leaves a soft cream rim rather than a staring white.
    function cap(r, angle, colorGradient = false) {
      const geometry = new THREE.SphereGeometry(
        r,
        28,
        18,
        0,
        Math.PI * 2,
        0,
        angle,
      );
      geometry.rotateX(Math.PI / 2);
      if (colorGradient) {
        const top = new THREE.Color(iris).multiplyScalar(0.58);
        const bottom = new THREE.Color("#A96C38");
        const colors = [],
          color = new THREE.Color();
        const points = geometry.attributes.position;
        for (let index = 0; index < points.count; index++) {
          const warmth = Math.pow(
            THREE.MathUtils.clamp((1 - points.getY(index) / r) * 0.5, 0, 1),
            1.8,
          );
          color.copy(top).lerp(bottom, warmth);
          colors.push(color.r, color.g, color.b);
        }
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3),
        );
      }
      return geometry;
    }
    const irisGeometry = cap(radius * 1.025, 0.94, true);
    const pupilGeometry = cap(radius * 1.05, 0.62);
    for (const position of positions) {
      const eye = new THREE.Group();
      eye.position.fromArray(position);
      eye.scale.fromArray(scale);
      eye.name = "eye";
      eye.userData.dynamic = true;
      parent.add(eye);
      ellipsoid(
        eye,
        socket,
        [0, 0, -radius * 0.12],
        [radius * 1.035, radius * 1.035, radius * 0.98],
      );
      ellipsoid(eye, white, [0, 0, 0], [radius, radius, radius]);
      const pupil = new THREE.Group();
      pupil.name = "gaze";
      pupil.userData.dynamic = true;
      eye.add(pupil);
      mesh(pupil, irisGeometry, irisMat);
      mesh(pupil, pupilGeometry, pupilMat);
      for (const [x, y, size] of [
        [-0.25, 0.3, 0.155],
        [0.24, -0.2, 0.065],
      ]) {
        const z = Math.sqrt(1.05 * 1.05 - x * x - y * y) + 0.008;
        ellipsoid(
          pupil,
          shineMat,
          [x * radius, y * radius, z * radius],
          [radius * size, radius * size, radius * 0.012],
        );
      }
      const lidGeometry = new THREE.SphereGeometry(
        radius * 1.08,
        20,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      const upperLid = mesh(eye, lidGeometry, skin);
      const lowerLid = mesh(eye, lidGeometry, skin, [0, 0, 0], [1, -1, 1]);
      upperLid.userData.dynamic = lowerLid.userData.dynamic = true;
      upperLid.rotation.x = -Math.PI / 2;
      lowerLid.rotation.x = Math.PI / 2;
      eyeRigs.push({ group: eye, pupil, upperLid, lowerLid, radius });
    }
    return eyeRigs;
  }
  function smile(parent, material, points, radius = 0.017) {
    return tube(parent, material, points, radius, 24);
  }
  function wing(
    parent,
    name,
    position,
    { color = "#FFF0D3", side = -1, size = 1 } = {},
  ) {
    const shoulder = joint(parent, name, position);
    const featherMat = typeof color === "string" ? mat(color) : color;
    const softMat = mat(
      typeof color === "string" && color.startsWith("#FFF")
        ? "#F4DFC0"
        : "#875131",
    );
    ellipsoid(
      shoulder,
      softMat,
      [side * 0.16 * size, 0.02, -0.02],
      [0.27 * size, 0.25 * size, 0.13 * size],
    );
    const elbow = joint(shoulder, side < 0 ? "elbowLeft" : "elbowRight", [
      side * 0.28 * size,
      0.06,
      0,
    ]);
    for (let i = 0; i < 6; i++) {
      feather(
        elbow,
        featherMat,
        [side * 0.07 * i * size, -0.13 + i * 0.035, 0.01 + i * 0.012],
        (0.55 - i * 0.038) * size,
        0.19 * size,
        0.105 * size,
        [0, side * 0.08, -side * (0.8 + i * 0.14)],
      );
    }
    for (let i = 0; i < 3; i++)
      feather(
        shoulder,
        featherMat,
        [side * 0.05 * i * size, -0.02 + i * 0.06, 0.1],
        0.34 * size,
        0.18 * size,
        0.1 * size,
        [0, 0, -side * (0.85 + i * 0.2)],
      );
    return shoulder;
  }
  return {
    mat,
    mesh,
    ellipsoid,
    pear,
    tube,
    taperedTube,
    feather,
    joint,
    eyes,
    smile,
    wing,
    joints,
    eyeRigs,
  };
}

export function captureRestPose(rig) {
  rig.rest = new Map();
  for (const group of [rig.root, ...Object.values(rig.joints)]) {
    rig.rest.set(group, {
      position: group.position.clone(),
      quaternion: group.quaternion.clone(),
      scale: group.scale.clone(),
    });
  }
  return rig;
}
