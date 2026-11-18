import { COMPANION_RIGS } from "./companion-rig.js";
import {
  createHeadComposer,
  loadCompanionMaterials,
} from "./companion-materials.js";
import {
  createPartMesh,
  deformPart,
  jointMatrix,
  multiplyMatrices,
  transformPoint,
  anchorToGround,
} from "./companion-deformation.js";

const CAMERA = { x: -24, y: -22, width: 248, height: 244 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function gpuPainter(canvas) {
  let gl;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const shaders = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      for (const compiled of shaders) gl.deleteShader(compiled);
      gl.deleteProgram(program);
      throw new Error("Painted surface shader unavailable");
    }
    shaders.push(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(
    program,
    compile(
      gl.VERTEX_SHADER,
      `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      vec2 screen = (a_position - vec2(-24.0, -22.0)) / vec2(248.0, 244.0);
      gl_Position = vec4(screen.x * 2.0 - 1.0, 1.0 - screen.y * 2.0, 0.0, 1.0);
      v_uv = a_uv;
    }
  `,
    ),
  );
  gl.attachShader(
    program,
    compile(
      gl.FRAGMENT_SHADER,
      `
    precision mediump float;
    uniform sampler2D u_paint;
    varying vec2 v_uv;
    void main() { gl_FragColor = texture2D(u_paint, v_uv); }
  `,
    ),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
    throw new Error("Painted surface program unavailable");
  }
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, "a_position");
  const uv = gl.getAttribLocation(program, "a_uv");
  const vertexBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const textures = new Map();
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.clearColor(0, 0, 0, 0);
  return {
    mode: "mesh-webgl",
    begin() {
      if (gl.isContextLost()) return false;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      return true;
    },
    draw(material, vertices, mesh) {
      let texture = textures.get(material.image);
      if (!texture) {
        texture = { handle: gl.createTexture(), version: -1 };
        textures.set(material.image, texture);
        gl.bindTexture(gl.TEXTURE_2D, texture.handle);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else gl.bindTexture(gl.TEXTURE_2D, texture.handle);
      if (texture.version !== material.version) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          material.image,
        );
        texture.version = material.version;
      }
      const data = mesh.vertexData;
      for (let i = 0; i < vertices.length; i++) {
        data[i * 4] = vertices[i].x;
        data[i * 4 + 1] = vertices[i].y;
        data[i * 4 + 2] = vertices[i].u;
        data[i * 4 + 3] = vertices[i].v;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indexData, gl.STATIC_DRAW);
      gl.drawElements(
        gl.TRIANGLES,
        mesh.indexData.length,
        gl.UNSIGNED_SHORT,
        0,
      );
    },
    dispose() {
      for (const { handle } of textures.values()) gl.deleteTexture(handle);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
      for (const shader of shaders) gl.deleteShader(shader);
    },
  };
}

// A texture triangle maps the same painted pixels onto the soft geometry when
// WebGL isn't available. No graphics worker or alternate character is needed.
function softwarePainter(canvas) {
  let context;
  try {
    context = canvas.getContext("2d", { alpha: true });
  } catch {
    return null;
  }
  if (!context) return null;
  return {
    mode: "mesh-2d",
    begin() {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(canvas.width / CAMERA.width, canvas.height / CAMERA.height);
      context.translate(-CAMERA.x, -CAMERA.y);
      return true;
    },
    draw(material, vertices, mesh) {
      const width = material.image.width;
      const height = material.image.height;
      for (const triangle of mesh.triangles) {
        const points = triangle.map((index) => vertices[index]);
        const source = points.map((point) => ({
          x: point.u * width,
          y: point.v * height,
        }));
        const [p0, p1, p2] = points;
        const [s0, s1, s2] = source;
        const det =
          (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
        if (Math.abs(det) < 0.00001) continue;
        const a =
          ((p1.x - p0.x) * (s2.y - s0.y) - (p2.x - p0.x) * (s1.y - s0.y)) / det;
        const b =
          ((p1.y - p0.y) * (s2.y - s0.y) - (p2.y - p0.y) * (s1.y - s0.y)) / det;
        const c =
          ((p2.x - p0.x) * (s1.x - s0.x) - (p1.x - p0.x) * (s2.x - s0.x)) / det;
        const d =
          ((p2.y - p0.y) * (s1.x - s0.x) - (p1.y - p0.y) * (s2.x - s0.x)) / det;
        context.save();
        // Subpixel overlap avoids hairline cracks between adjacent triangles.
        const cx = (p0.x + p1.x + p2.x) / 3;
        const cy = (p0.y + p1.y + p2.y) / 3;
        const overlap = (0.22 * CAMERA.width) / canvas.width;
        context.beginPath();
        points.forEach((point, index) => {
          const length = Math.hypot(point.x - cx, point.y - cy) || 1;
          const x = point.x + ((point.x - cx) / length) * overlap;
          const y = point.y + ((point.y - cy) / length) * overlap;
          if (index) context.lineTo(x, y);
          else context.moveTo(x, y);
        });
        context.closePath();
        context.clip();
        context.transform(
          a,
          b,
          c,
          d,
          p0.x - a * s0.x - c * s0.y,
          p0.y - b * s0.x - d * s0.y,
        );
        context.drawImage(material.image, 0, 0);
        context.restore();
      }
    },
    dispose() {},
  };
}

function bufferMesh(mesh) {
  return {
    ...mesh,
    vertexData: new Float32Array(mesh.vertices.length * 4),
    indexData: new Uint16Array(mesh.triangles.flat()),
  };
}

export function createCompanionSurface(root, kind) {
  const canvas = root.querySelector("[data-companion-surface]");
  if (!canvas) return null;
  let painter;
  try {
    painter = gpuPainter(canvas) || softwarePainter(canvas);
  } catch (error) {
    canvas.__kinesaSurfaceError = error.message;
    return null;
  }
  if (!painter) return null;
  const rig = COMPANION_RIGS[kind];
  let disposed = false;
  let enabled = true;
  let materials;
  let composeHead;
  let meshes;
  let lastPose;
  let lost = false;

  function resize() {
    const bounds = root.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const density = Math.max(0.5, bounds.width / 200) * ratio;
    const width = Math.round(CAMERA.width * density);
    const height = Math.round(CAMERA.height * density);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      if (lastPose) draw(lastPose);
    }
  }

  function draw(pose) {
    lastPose = pose;
    if (disposed || !enabled || lost || !materials) return;
    try {
      if (!painter.begin()) {
        root.removeAttribute("data-skinning");
        return;
      }
      const bodyMatrix = jointMatrix(pose.joints.body, { x: 100, y: 181 });
      const order = [
        "wingLeft",
        "wingRight",
        "body",
        "armLeft",
        "armRight",
        "collar",
        "head",
        "halo",
      ];
      const samples = {};
      let drawCalls = 0;
      for (const name of order) {
        if (!materials.parts[name]) continue;
        const mesh = meshes[name];
        const partName =
          name === "collar" ? "body" : name === "halo" ? "head" : name;
        const deformed =
          name === "halo"
            ? mesh.vertices.map((point) => ({
                ...point,
                x: point.x + (pose.deform?.spine || 0) * 3.2,
              }))
            : deformPart(mesh, { kind, name: partName, rig, pose });
        let matrix = bodyMatrix;
        if (name !== "body" && name !== "collar") {
          const pivot = rig.pivots[partName];
          matrix = multiplyMatrices(
            bodyMatrix,
            jointMatrix(pose.joints[partName], { x: pivot[0], y: pivot[1] }),
          );
          if (name === "halo")
            matrix = multiplyMatrices(
              matrix,
              jointMatrix(pose.joints.halo, { x: 100, y: 18 }),
            );
        }
        const vertices = deformed.map((point, index) => {
          let world = transformPoint(matrix, point);
          const neutral = mesh.vertices[index];
          const ground = pose.deform?.ground ?? 1;
          if (name === "body" || name === "collar") {
            world = anchorToGround(
              world,
              neutral,
              smooth((neutral.v - 0.69) / 0.31) * ground,
            );
          } else if (
            (name === "armLeft" || name === "armRight") &&
            kind !== "human"
          ) {
            const planted =
              pose.deform?.[name === "armLeft" ? "plantLeft" : "plantRight"] ??
              1;
            world = anchorToGround(
              world,
              neutral,
              smooth((neutral.v - 0.6) / 0.4) * planted * ground,
            );
          }
          return { ...world, u: point.u, v: point.v };
        });
        painter.draw(
          name === "head" ? composeHead(pose) : materials.parts[name],
          vertices,
          mesh,
        );
        drawCalls++;
        if (name === "head" || name === "body" || name === "wingLeft") {
          samples[name] = [
            vertices[0],
            vertices[Math.floor(vertices.length / 2)],
            vertices.at(-1),
          ].map((point) => [point.x, point.y]);
        }
      }
      canvas.__kinesaMeshFrame = {
        mode: painter.mode,
        samples,
        drawCalls,
        performance: pose.performance,
        deform: { ...pose.deform },
      };
      if (root.getAttribute("data-skinning") !== painter.mode)
        root.setAttribute("data-skinning", painter.mode);
    } catch (error) {
      // Keep the original SVG active if a browser loses graphics capabilities.
      root.removeAttribute("data-skinning");
      canvas.__kinesaSurfaceError = error.message;
      enabled = false;
    }
  }

  function onLost(event) {
    event.preventDefault();
    lost = true;
    root.removeAttribute("data-skinning");
  }
  function onRestored() {
    if (disposed) return;
    try {
      const restoredPainter = gpuPainter(canvas);
      if (!restoredPainter) return;
      painter = restoredPainter;
      lost = false;
      if (lastPose) draw(lastPose);
    } catch {
      root.removeAttribute("data-skinning");
    }
  }
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(root);
  resize();
  loadCompanionMaterials(kind)
    .then((loaded) => {
      if (disposed) return;
      materials = loaded;
      composeHead = createHeadComposer(materials, rig);
      const count = painter.mode === "mesh-webgl" ? 8 : 4;
      meshes = Object.fromEntries(
        Object.keys(materials.parts).map((name) => {
          const part =
            name === "collar"
              ? rig.body
              : name === "halo"
                ? { source: [0, 0, 68, 24], box: [66, 6, 68, 24] }
                : rig[name];
          const mesh = bufferMesh(createPartMesh(part, count, count));
          if (name === "halo") mesh.placement = materials.parts.head.placement;
          return [name, mesh];
        }),
      );
      if (lastPose) draw(lastPose);
    })
    .catch(() => {
      root.removeAttribute("data-skinning");
    });

  return {
    draw,
    setEnabled(value) {
      enabled = value;
      if (!value) root.removeAttribute("data-skinning");
      else if (lastPose) draw(lastPose);
    },
    dispose() {
      disposed = true;
      resizeObserver?.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      painter.dispose();
      canvas.width = 0;
      canvas.height = 0;
      root.removeAttribute("data-skinning");
      delete canvas.__kinesaMeshFrame;
    },
  };
}
