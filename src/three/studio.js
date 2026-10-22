import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createLion } from "./lion.js";
import { createOx } from "./ox.js";
import { createEagle } from "./eagle.js";
import { createHuman } from "./human.js";
import { captureRestPose } from "./model-kit.js";
import {
  createMotion,
  setMotionIntent,
  advanceMotion,
  motionPose,
  staticMotionPose,
} from "./motion.js";

export const STUDIO_SIZE = 512;
const SIZE = STUDIO_SIZE;
const builders = {
  lion: createLion,
  ox: createOx,
  eagle: createEagle,
  human: createHuman,
};
const clampSize = (size) =>
  Math.max(48, Math.min(SIZE, Math.round(Number(size) || 200)));
function makeCanvas(width, height) {
  if (typeof document === "undefined")
    return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function optimizeModel(root) {
  root.updateMatrixWorld(true);
  const sourceGeometries = new Set();
  function optimize(container) {
    const groups = new Map();
    const removable = [];
    const inverse = container.matrixWorld.clone().invert();
    function collect(object) {
      if (object !== container && object.userData.dynamic) {
        if (object.isGroup) optimize(object);
        return;
      }
      if (object.isMesh && !Array.isArray(object.material)) {
        sourceGeometries.add(object.geometry);
        let geometry = object.geometry.clone();
        if (geometry.index) {
          const unindexed = geometry.toNonIndexed();
          geometry.dispose();
          geometry = unindexed;
        }
        const matrix = inverse.clone().multiply(object.matrixWorld);
        geometry.applyMatrix4(matrix);
        if (!geometry.attributes.normal) geometry.computeVertexNormals();
        const allowed = [
          "position",
          "normal",
          "uv",
          ...(object.material.vertexColors ? ["color"] : []),
        ];
        for (const attribute of Object.keys(geometry.attributes))
          if (!allowed.includes(attribute)) geometry.deleteAttribute(attribute);
        if (object.material.vertexColors && !geometry.attributes.color)
          geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(
              new Float32Array(geometry.attributes.position.count * 3).fill(1),
              3,
            ),
          );
        if (matrix.determinant() < 0) {
          for (const attribute of Object.values(geometry.attributes)) {
            for (let i = 0; i < attribute.count; i += 3)
              for (let axis = 0; axis < attribute.itemSize; axis++) {
                const a = (i + 1) * attribute.itemSize + axis,
                  b = (i + 2) * attribute.itemSize + axis;
                const value = attribute.array[a];
                attribute.array[a] = attribute.array[b];
                attribute.array[b] = value;
              }
          }
        }
        // The sculpting helpers do not all need UVs; untextured clay can share
        // a single indexed geometry regardless of their source primitives.
        if (!geometry.attributes.uv)
          geometry.setAttribute(
            "uv",
            new THREE.BufferAttribute(
              new Float32Array(geometry.attributes.position.count * 2),
              2,
            ),
          );
        const key = object.material.uuid;
        if (!groups.has(key))
          groups.set(key, { material: object.material, geometries: [] });
        groups.get(key).geometries.push(geometry);
        removable.push(object);
      } else for (const child of [...object.children]) collect(child);
    }
    for (const child of [...container.children]) collect(child);
    for (const object of removable) object.removeFromParent();
    for (const { material, geometries } of groups.values()) {
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      container.add(mesh);
    }
  }
  optimize(root);
  const retained = new Set();
  root.traverse((object) => {
    if (object.geometry) retained.add(object.geometry);
  });
  sourceGeometries.forEach((geometry) => {
    if (!retained.has(geometry)) geometry.dispose();
  });
}

/** The same small studio runs in an OffscreenCanvas worker or a main-thread
 * compatibility renderer. It never reads layout or controls the page clock. */
export function createStudio({ onContextLost, onContextRestored } = {}) {
  let world = null;
  let failed = false;
  const rotation = new THREE.Euler(0, 0, 0, "YXZ");
  const deltaQuaternion = new THREE.Quaternion();
  function setupWorld() {
    if (failed) throw new Error("The 3D graphics context is unavailable.");
    if (world) return world;
    try {
      const renderCanvas = makeCanvas(SIZE, SIZE);
      const renderer = new THREE.WebGLRenderer({
        canvas: renderCanvas,
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(1);
      renderer.setSize(SIZE, SIZE, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff4e7, 0xbbb8d5, 1.2));
      const key = new THREE.DirectionalLight(0xfff0dc, 3.1);
      key.position.set(-3.5, 6, 6);
      key.castShadow = false;
      key.shadow.mapSize.set(512, 512);
      key.shadow.camera.left = -3;
      key.shadow.camera.right = 3;
      key.shadow.camera.top = 5;
      key.shadow.camera.bottom = -1;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 18;
      key.shadow.bias = -0.0006;
      key.shadow.normalBias = 0.025;
      key.shadow.radius = 3;
      key.target.position.set(0, 1.4, 0);
      scene.add(key, key.target);
      const fill = new THREE.DirectionalLight(0xd4e4ff, 0.7);
      fill.position.set(4, 3, 4);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffe4c4, 1.2);
      rim.position.set(1, 5, -4);
      scene.add(rim);
      // A soft contact pool grounds the cast without drawing a long hard shadow
      // across a compact portrait. It needs no extra shadow render pass.
      const shadowCanvas = makeCanvas(64, 64);
      const shadowContext = shadowCanvas.getContext("2d");
      const gradient = shadowContext.createRadialGradient(
        32,
        32,
        3,
        32,
        32,
        31,
      );
      gradient.addColorStop(0, "rgba(69,52,89,.26)");
      gradient.addColorStop(0.45, "rgba(69,52,89,.13)");
      gradient.addColorStop(1, "rgba(69,52,89,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 64, 64);
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1.45),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(shadowCanvas),
          transparent: true,
          depthWrite: false,
        }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.002;
      scene.add(floor);
      const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 30);
      const empty = new THREE.Group();
      scene.add(empty);
      const canvas = renderer.domElement;
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        failed = true;
        onContextLost?.();
      });
      canvas.addEventListener("webglcontextrestored", () => {
        failed = false;
        onContextRestored?.();
      });
      world = {
        renderer,
        scene,
        camera,
        floor,
        empty,
        renderCount: 0,
      };
      return world;
    } catch (error) {
      failed = true;
      throw error;
    }
  }

  function disposeRig(rig) {
    const geometries = new Set(),
      materials = new Set();
    rig.root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material)
        for (const m of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(m);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }

  function applyPose(entry, pose) {
    const rig = entry.rig;
    const rootRest = rig.rest.get(rig.root);
    rig.root.position.copy(rootRest.position);
    rig.root.position.y += pose.root.y || 0;
    rotation.set(
      pose.root.rx || 0,
      pose.root.ry || 0,
      pose.root.rz || 0,
      "YXZ",
    );
    rig.root.quaternion
      .copy(rootRest.quaternion)
      .multiply(deltaQuaternion.setFromEuler(rotation));
    for (const [name, group] of Object.entries(rig.joints)) {
      const rest = rig.rest.get(group),
        value = pose.joints[name] || {};
      group.position.set(
        rest.position.x + (value.x || 0),
        rest.position.y + (value.y || 0),
        rest.position.z + (value.z || 0),
      );
      rotation.set(value.rx || 0, value.ry || 0, value.rz || 0, "YXZ");
      group.quaternion
        .copy(rest.quaternion)
        .multiply(deltaQuaternion.setFromEuler(rotation));
      group.scale.set(
        rest.scale.x * (value.sx ?? 1),
        rest.scale.y * (value.sy ?? 1),
        rest.scale.z * (value.sz ?? 1),
      );
    }
    for (const eye of rig.eyes || []) {
      eye.pupil.rotation.set(-pose.gaze.y * 0.12, pose.gaze.x * 0.18, 0);
      eye.upperLid.visible = eye.lowerLid.visible = pose.blink > 0.001;
      eye.upperLid.rotation.x = (-Math.PI / 2) * (1 - pose.blink);
      eye.lowerLid.rotation.x = (Math.PI / 2) * (1 - pose.blink);
    }
    entry.pose = pose;
  }

  function draw(entry) {
    const current = setupWorld();
    if (!current) throw new Error("The 3D studio could not start.");
    const { renderer, scene, camera, floor } = current;
    if (!entry.context) throw new Error("The companion canvas is unavailable.");
    const size = entry.size;
    if (entry.canvas.width !== size) {
      entry.canvas.width = size;
      entry.canvas.height = size;
    }
    const portrait = entry.options.portrait;
    const span = portrait
      ? Math.max(1.6, entry.rig.height * 0.54)
      : Math.max(entry.rig.height * 1.22, (entry.rig.radius || 1.65) * 2.05);
    const center = portrait
      ? new THREE.Vector3(...entry.rig.headCenter)
      : new THREE.Vector3(0, entry.rig.height * 0.49, 0);
    camera.left = camera.bottom = -span / 2;
    camera.right = camera.top = span / 2;
    camera.updateProjectionMatrix();
    camera.position.set(center.x + 0.22, center.y + 0.8, center.z + 8);
    camera.lookAt(center);
    floor.visible = !portrait;
    renderer.shadowMap.enabled = false;
    scene.add(entry.rig.root);
    try {
      renderer.setViewport(0, SIZE - size, size, size);
      renderer.setScissor(0, SIZE - size, size, size);
      renderer.setScissorTest(true);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      entry.context.clearRect(0, 0, size, size);
      entry.context.drawImage(
        renderer.domElement,
        0,
        0,
        size,
        size,
        0,
        0,
        size,
        size,
      );
    } finally {
      scene.remove(entry.rig.root);
    }
    current.renderCount++;
    entry.drawn = true;
    entry.dirty = false;
    entry.ready = true;
    entry.drawCount++;
    entry.pixelSize = size;
    entry.camera = camera.position.toArray();
    return true;
  }

  function createEntry({
    id,
    kind = "lion",
    canvas,
    size = 200,
    options = {},
    reduced = false,
    active = true,
    seed = Math.random(),
  }) {
    setupWorld();
    const build = builders[kind] || builders.lion;
    const rig = captureRestPose(build());
    optimizeModel(rig.root);
    const geometryBounds = new THREE.Box3()
      .setFromObject(rig.root)
      .getSize(new THREE.Vector3())
      .toArray();
    let meshes = 0,
      vertices = 0;
    rig.root.traverse((object) => {
      if (object.isMesh) {
        meshes++;
        vertices += object.geometry.attributes.position?.count || 0;
      }
    });
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      disposeRig(rig);
      throw new Error("The companion canvas could not start.");
    }
    const entry = {
      id,
      kind,
      canvas,
      context,
      rig,
      geometryBounds,
      meshes,
      vertices,
      size: clampSize(size),
      options: { ...options },
      reduced: Boolean(reduced),
      active: Boolean(active),
      state: setMotionIntent(createMotion(kind, seed), options),
      last: null,
      lastPaint: null,
      dirty: true,
      ready: false,
      drawn: false,
      drawCount: 0,
      revision: 0,
    };
    applyPose(
      entry,
      reduced
        ? staticMotionPose({ kind, mood: options.mood })
        : motionPose(entry.state),
    );
    return entry;
  }
  function updateEntry(entry, next = {}) {
    const wasPaused = Boolean(entry.options.paused);
    const wasActive = entry.active;
    const wasReduced = entry.reduced;
    if (next.options !== undefined) {
      entry.options = { ...next.options };
      entry.state = setMotionIntent(entry.state, entry.options);
    }
    if (next.active !== undefined) {
      entry.active = Boolean(next.active);
      // Coalesced hide/show messages can finish at the original boolean.
      // Forget that wall-clock interval even when the final value is equal.
      entry.last = null;
    }
    if (next.reduced !== undefined) entry.reduced = Boolean(next.reduced);
    if (next.size !== undefined) entry.size = clampSize(next.size);
    if (
      wasPaused !== Boolean(entry.options.paused) ||
      wasActive !== entry.active ||
      wasReduced !== entry.reduced
    )
      entry.last = null;
    if (entry.reduced)
      applyPose(
        entry,
        staticMotionPose({ kind: entry.kind, mood: entry.options.mood }),
      );
    else if (wasReduced) applyPose(entry, motionPose(entry.state));
    entry.dirty = true;
  }
  function advanceEntry(entry, seconds) {
    if (entry.options.paused || entry.reduced || !entry.active) return;
    entry.state = advanceMotion(entry.state, seconds);
    applyPose(entry, motionPose(entry.state));
  }
  function diagnostics(entry) {
    return {
      kind: entry.kind,
      renderer: failed ? "poster" : "webgl",
      worker: typeof document === "undefined",
      contextCount: world ? 1 : 0,
      paused: Boolean(entry.options.paused),
      reduced: entry.reduced,
      active: entry.active,
      drawn: entry.drawn && !failed,
      pixelSize: entry.pixelSize || 0,
      drawCount: entry.drawCount,
      revision: entry.revision,
      meshes: entry.meshes,
      vertices: entry.vertices,
      geometryBounds: entry.geometryBounds,
      pose: entry.pose,
      joints: Object.fromEntries(
        Object.entries(entry.rig.joints).map(([name, group]) => [
          name,
          {
            position: group.position.toArray(),
            quaternion: group.quaternion.toArray(),
            scale: group.scale.toArray(),
          },
        ]),
      ),
      camera: entry.camera,
    };
  }
  return {
    createEntry,
    updateEntry,
    advanceEntry,
    drawEntry: draw,
    diagnostics,
    disposeEntry(entry) {
      disposeRig(entry.rig);
    },
    dispose() {
      if (!world) return;
      world.floor.geometry.dispose();
      world.floor.material.map?.dispose();
      world.floor.material.dispose();
      world.renderer.dispose();
      world = null;
    },
  };
}
