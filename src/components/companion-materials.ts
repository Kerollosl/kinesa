import type { CompanionKind } from "../types.ts";
import {
  COMPANION_RIGS,
  LID_COVER,
  LID_SOLID,
  RIG_ARTWORK,
  jointFeather,
  rigPlacement,
} from "./companion-rig.ts";

// The source paintings are decoded once. Cropped, masked materials are shared
// across rigs; a blink only recomposes the small head texture that needs it.
type Rig = (typeof COMPANION_RIGS)[CompanionKind] & {
  collar?: number[];
};
interface RigPart {
  art?: string;
  source: number[];
  box: number[];
  trimCorners?: boolean;
  outline?: string;
}
type ArtName = keyof typeof RIG_ARTWORK;
type Images = Record<ArtName, HTMLImageElement>;
type PartName =
  | "body"
  | "head"
  | "wingLeft"
  | "wingRight"
  | "armLeft"
  | "armRight"
  | "collar"
  | "halo";

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Material {
  image: HTMLCanvasElement;
  placement: Placement;
  version: number;
}
export interface LidMaterial {
  image: HTMLCanvasElement;
  box: Placement;
  pivot: number;
}
export interface CompanionMaterials {
  parts: Partial<Record<PartName, Material>>;
  lids: LidMaterial[];
}
export interface BlinkPose {
  blink?: number;
  blinkLeft?: number;
  blinkRight?: number;
}
interface Feather {
  x: number;
  y: number;
  radius: number;
  clear: number;
}

let artworkPromise: Promise<Images> | null = null;
const materialCache = new Map<CompanionKind, Promise<CompanionMaterials>>();

function surface(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Painted materials need a 2D canvas");
  return { canvas, context };
}

async function artwork(): Promise<Images> {
  if (!artworkPromise) {
    artworkPromise = Promise.all(
      Object.entries(RIG_ARTWORK).map(async ([name, art]) => {
        const image = new Image();
        image.src = art.href;
        await image.decode();
        return [name, image] as const;
      }),
    )
      .then((entries) => Object.fromEntries(entries) as Images)
      .catch((error) => {
        artworkPromise = null;
        throw error;
      });
  }
  return artworkPromise;
}

function worldCoordinates(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  placement: Placement,
): void {
  const sx = canvas.width / placement.width;
  const sy = canvas.height / placement.height;
  context.setTransform(sx, 0, 0, sy, -placement.x * sx, -placement.y * sy);
}

function croppedPart(part: RigPart, images: Images): Material {
  const [x, y, width, height] = part.source;
  const scale = Math.min(1, 512 / Math.max(width, height));
  const { canvas, context } = surface(width * scale, height * scale);
  // Source windows are authored in the atlas's logical size (RIG_ARTWORK); the
  // shipped bitmaps may be smaller, so map windows to the decoded pixels.
  const name = (part.art || "parts") as ArtName;
  const image = images[name];
  const kx = image.naturalWidth / RIG_ARTWORK[name].width;
  const ky = image.naturalHeight / RIG_ARTWORK[name].height;
  context.drawImage(
    image,
    x * kx,
    y * ky,
    width * kx,
    height * ky,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const placement = rigPlacement(part);
  if (part.outline || part.trimCorners) {
    context.save();
    context.globalCompositeOperation = "destination-in";
    worldCoordinates(context, canvas, placement);
    const { x: px, y: py, width: w, height: h } = placement;
    const path =
      part.outline === "ox-head"
        ? `M${px} ${py}h${w * 0.35}v9h${w * 0.35}v-9H${px + w}v${h}H${px + 4}v${-h * 0.51}H${px}Z`
        : `M${px + 1.8} ${py}H${px + w}v${h - 7}h${-w * 0.25}v7h${-w * 0.5}v-7H${px + 1.8}Z`;
    context.fill(new Path2D(path));
    context.restore();
  }
  return { image: canvas, placement, version: 0 };
}

// Fades a part out around its joint so the painted peg melts into the body.
function featherJoint(
  material: Material,
  feather: Feather | null | undefined,
): Material {
  if (!feather) return material;
  const { canvas, context } = surface(
    material.image.width,
    material.image.height,
  );
  context.drawImage(material.image, 0, 0);
  context.globalCompositeOperation = "destination-out";
  worldCoordinates(context, canvas, material.placement);
  const fade = context.createRadialGradient(
    feather.x,
    feather.y,
    0,
    feather.x,
    feather.y,
    feather.radius,
  );
  fade.addColorStop(0, "black");
  fade.addColorStop(feather.clear, "black");
  fade.addColorStop(1, "transparent");
  context.fillStyle = fade;
  context.fillRect(
    feather.x - feather.radius,
    feather.y - feather.radius,
    feather.radius * 2,
    feather.radius * 2,
  );
  return { ...material, image: canvas };
}

function collarMaterial(body: Material, collar: number[]): Material {
  const { canvas, context } = surface(body.image.width, body.image.height);
  context.drawImage(body.image, 0, 0);
  context.save();
  context.globalCompositeOperation = "destination-in";
  worldCoordinates(context, canvas, body.placement);
  const [x, y, width, height] = collar;
  const fade = context.createLinearGradient(0, y, 0, y + height);
  fade.addColorStop(0, "white");
  fade.addColorStop(0.75, "white");
  fade.addColorStop(1, "transparent");
  context.fillStyle = fade;
  context.fillRect(x, y, width, height);
  context.restore();
  return { image: canvas, placement: body.placement, version: 0 };
}

function lidMaterial(rig: Rig, index: number, images: Images): LidMaterial {
  const eye = rig.eyes[index];
  const rx = eye.rx * LID_COVER;
  const ry = eye.ry * LID_COVER;
  const box = { x: eye.x - rx, y: eye.y - ry, width: rx * 2, height: ry * 2 };
  const { canvas, context } = surface(box.width * 3, box.height * 3);
  worldCoordinates(context, canvas, box);
  const [sourceX, sourceY] = rig.blink.centers[index];
  context.drawImage(
    images.eyelids,
    eye.x - sourceX * rig.blink.scale,
    eye.y + 3 - sourceY * rig.blink.scale,
    RIG_ARTWORK.eyelids.width * rig.blink.scale,
    RIG_ARTWORK.eyelids.height * rig.blink.scale,
  );
  context.globalCompositeOperation = "destination-in";
  context.translate(eye.x, eye.y);
  context.scale(rx, ry);
  const feather = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  feather.addColorStop(0, "white");
  feather.addColorStop(LID_SOLID, "white");
  feather.addColorStop(1, "transparent");
  context.fillStyle = feather;
  context.fillRect(-1, -1, 2, 2);
  return { image: canvas, box, pivot: eye.y - eye.ry };
}

function haloMaterial() {
  const box = { x: 66, y: 6, width: 68, height: 24 };
  const { canvas, context } = surface(box.width * 3, box.height * 3);
  worldCoordinates(context, canvas, box);
  context.translate(100, 18);
  context.rotate((-8 * Math.PI) / 180);
  const gold = context.createLinearGradient(-30, -5, 30, 5);
  gold.addColorStop(0, "#FFF1B0");
  gold.addColorStop(0.4, "#E5AE37");
  gold.addColorStop(1, "#BA7820");
  context.strokeStyle = gold;
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(0, 0, 27, 7, 0, 0, Math.PI * 2);
  context.stroke();
  return { image: canvas, placement: box, version: 0 };
}

export function loadCompanionMaterials(
  kind: CompanionKind,
): Promise<CompanionMaterials> {
  if (!materialCache.has(kind)) {
    materialCache.set(
      kind,
      artwork()
        .then((images) => {
          const rig: Rig = COMPANION_RIGS[kind];
          const names = [
            "body",
            "head",
            "wingLeft",
            "wingRight",
            "armLeft",
            "armRight",
          ] as const;
          const parts: CompanionMaterials["parts"] = Object.fromEntries(
            names.map((name) => [
              name,
              featherJoint(
                croppedPart(rig[name], images),
                jointFeather(kind, name),
              ),
            ]),
          );
          if (rig.collar)
            parts.collar = collarMaterial(parts.body as Material, rig.collar);
          if (kind === "human") parts.halo = haloMaterial();
          return {
            parts,
            lids: rig.eyes.map((_, index) => lidMaterial(rig, index, images)),
          };
        })
        .catch((error) => {
          materialCache.delete(kind);
          throw error;
        }),
    );
  }
  return materialCache.get(kind) as Promise<CompanionMaterials>;
}

export function createHeadComposer(materials: CompanionMaterials) {
  const base = materials.parts.head as Material;
  const { canvas, context } = surface(base.image.width, base.image.height);
  const composed = { image: canvas, placement: base.placement, version: 0 };
  let lastKey = "";
  return (pose: BlinkPose): Material => {
    const blinks = [
      pose.blinkLeft ?? pose.blink,
      pose.blinkRight ?? pose.blink,
    ].map((value) => Math.round((value || 0) * 100) / 100);
    if (blinks.every((value) => value < 0.001)) return base;
    const key = blinks.join(":");
    if (key === lastKey) return composed;
    lastKey = key;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(base.image, 0, 0);
    for (const [index, amount] of blinks.entries()) {
      if (!amount) continue;
      const lid = materials.lids[index];
      context.save();
      worldCoordinates(context, canvas, base.placement);
      context.translate(0, lid.pivot);
      context.scale(1, amount);
      context.translate(0, -lid.pivot);
      context.drawImage(
        lid.image,
        lid.box.x,
        lid.box.y,
        lid.box.width,
        lid.box.height,
      );
      context.restore();
    }
    composed.version++;
    return composed;
  };
}
