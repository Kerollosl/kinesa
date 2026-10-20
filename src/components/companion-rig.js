export const RIG_ARTWORK = {
  parts: {
    href: "/characters/kinesa-companion-rig.webp",
    width: 1536,
    height: 1024,
  },
  torsos: {
    href: "/characters/kinesa-companion-torsos.webp",
    width: 1983,
    height: 793,
  },
  eyelids: {
    href: "/characters/kinesa-companion-eyelids.webp",
    width: 2172,
    height: 724,
  },
};

// Source windows isolate painted parts, including their hidden joint overlap.
// Destination boxes share the same camera and planted foot baseline.
export const COMPANION_RIGS = {
  lion: {
    blink: {
      scale: 40 / 173,
      centers: [
        [226, 388.5],
        [399, 381],
      ],
    },
    body: {
      art: "torsos",
      source: [152, 107, 798, 572],
      box: [54, 102, 112, 80],
    },
    head: {
      source: [304, 12, 275, 251],
      box: [35, 20, 130, 120],
      trimCorners: true,
    },
    wingLeft: { source: [587, 44, 225, 189], box: [9, 86, 74, 67] },
    wingRight: { source: [850, 44, 222, 188], box: [117, 86, 74, 67] },
    armLeft: { source: [1148, 46, 108, 185], box: [63, 121, 34, 62] },
    armRight: { source: [1376, 47, 108, 185], box: [105, 121, 34, 62] },
    pivots: {
      head: [100, 112],
      wingLeft: [78, 118],
      wingRight: [122, 118],
      armLeft: [79, 126],
      armRight: [121, 126],
    },
    eyes: [
      { x: 86, y: 85, rx: 10.8, ry: 11.5, skin: "#F4C865" },
      { x: 126, y: 83, rx: 10.2, ry: 11.5, skin: "#F4C865" },
    ],
  },
  ox: {
    blink: {
      scale: 44 / 199,
      centers: [
        [769, 393.5],
        [968, 396.5],
      ],
    },
    body: {
      art: "torsos",
      source: [1100, 119, 759, 556],
      box: [57, 98, 108, 79],
    },
    head: {
      source: [284, 252, 314, 251],
      box: [28, 14, 144, 117],
      outline: "ox-head",
    },
    collar: [61, 110, 81, 28],
    wingLeft: { source: [602, 276, 217, 192], box: [10, 89, 72, 65] },
    wingRight: { source: [865, 276, 221, 192], box: [118, 89, 72, 65] },
    armLeft: { source: [1162, 286, 102, 196], box: [65, 119, 31, 64] },
    armRight: { source: [1362, 286, 99, 198], box: [105, 119, 31, 64] },
    pivots: {
      head: [100, 110],
      wingLeft: [77, 120],
      wingRight: [123, 120],
      armLeft: [81, 125],
      armRight: [120, 125],
    },
    eyes: [
      { x: 81, y: 81, rx: 10.4, ry: 12.6, skin: "#BD8158" },
      { x: 125, y: 82, rx: 10, ry: 12, skin: "#D59864" },
    ],
  },
  eagle: {
    blink: {
      scale: 38.5 / 172.5,
      centers: [
        [1341, 330.5],
        [1513.5, 290],
      ],
    },
    body: { source: [33, 499, 249, 240], box: [53, 104, 96, 72] },
    head: { source: [322, 512, 226, 225], box: [53, 24, 106, 106] },
    wingLeft: { source: [556, 510, 259, 217], box: [3, 82, 83, 79] },
    wingRight: { source: [861, 507, 257, 220], box: [114, 82, 83, 79] },
    armLeft: { source: [1126, 533, 175, 189], box: [64, 151, 37, 33] },
    armRight: { source: [1349, 537, 162, 198], box: [105, 151, 37, 33] },
    pivots: {
      head: [104, 113],
      wingLeft: [77, 121],
      wingRight: [123, 121],
      armLeft: [81, 154],
      armRight: [120, 154],
    },
    eyes: [
      { x: 98.5, y: 64, rx: 12.3, ry: 13.5, skin: "#F6EAD4" },
      { x: 137, y: 55.5, rx: 6.7, ry: 9.2, skin: "#F6EAD4" },
    ],
  },
  human: {
    blink: {
      scale: 33 / 174,
      centers: [
        [1811, 422.5],
        [1985, 409],
      ],
    },
    body: { source: [35, 754, 221, 237], box: [64, 102, 76, 81] },
    head: { source: [293, 742, 264, 241], box: [46, 22, 108, 100] },
    wingLeft: { source: [594, 760, 217, 196], box: [12, 87, 68, 65] },
    wingRight: { source: [857, 761, 220, 195], box: [120, 87, 68, 65] },
    armLeft: { source: [1098, 773, 174, 180], box: [38, 102, 44, 60] },
    armRight: { source: [1348, 774, 169, 178], box: [122, 102, 44, 60] },
    pivots: {
      head: [100, 108],
      wingLeft: [76, 119],
      wingRight: [124, 119],
      armLeft: [73, 113],
      armRight: [130, 113],
    },
    eyes: [
      { x: 86, y: 83.5, rx: 8.9, ry: 10.1, skin: "#F2B68D" },
      { x: 119, y: 79.8, rx: 8.9, ry: 10.1, skin: "#F2B68D" },
    ],
  },
};

export function rigPlacement(part) {
  const [sourceX, sourceY, sourceWidth, sourceHeight] = part.source;
  const [boxX, boxY, boxWidth, boxHeight] = part.box;
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const x = boxX + (boxWidth - width) / 2;
  const y = boxY + (boxHeight - height) / 2;
  return {
    x,
    y,
    width,
    height,
    imageX: x - sourceX * scale,
    imageY: y - sourceY * scale,
    scale,
  };
}
