// Gemeinsame Definition der Platzhalter-Figur (SPEC §6.1, ADR-005): Low-Poly-
// Humanoid aus Boxen, node-basiert animiert (kein Skin-Rig). Einzige Quelle für
// beide Ausgaben — das GLB (make-placeholder-figure) und die gebackenen
// Wireframe-Standbilder (bake-poses). Deterministisch, ohne three.js in Node.
//
// Achsen: Y oben, Figur steht mit den Füßen auf y=0. Blick auf −Z (Frontansicht).

// Maße (grob metrisch, Figur ~1.8 hoch).
const LEG = 0.9;
const LEG_W = 0.15;
const LEG_D = 0.15;
const TORSO_H = 0.62;
const TORSO_W = 0.44;
const TORSO_D = 0.22;
const HEAD_H = 0.26;
const HEAD_W = 0.22;
const ARM_L = 0.62;
const ARM_W = 0.12;
const SHY = TORSO_H - 0.06;
const SHX = TORSO_W / 2 + ARM_W / 2;
const HIPX = 0.12;

// Skelett: Node-Hierarchie mit Ruhe-Translation (relativ zum Parent) und
// optionalem Box-Mesh (Dimension + Offset relativ zum Rotations-Pivot am Node).
export const NODES = [
  { name: 'root', parent: null, t: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', t: [0, LEG, 0] },
  { name: 'torso', parent: 'pelvis', t: [0, 0, 0], mesh: 'torso' },
  { name: 'head', parent: 'torso', t: [0, TORSO_H + 0.03, 0], mesh: 'head' },
  { name: 'shoulderL', parent: 'torso', t: [SHX, SHY, 0], mesh: 'arm' },
  { name: 'shoulderR', parent: 'torso', t: [-SHX, SHY, 0], mesh: 'arm' },
  { name: 'hipL', parent: 'pelvis', t: [HIPX, 0, 0], mesh: 'leg' },
  { name: 'hipR', parent: 'pelvis', t: [-HIPX, 0, 0], mesh: 'leg' },
];

// Box-Geometrien (Dimension + Offset vom Node-Pivot). Gliedmaßen hängen nach unten.
export const MESHES = {
  torso: { dim: [TORSO_W, TORSO_H, TORSO_D], off: [0, TORSO_H / 2, 0] },
  head: { dim: [HEAD_W, HEAD_H, HEAD_W], off: [0, HEAD_H / 2, 0] },
  arm: { dim: [ARM_W, ARM_L, ARM_W], off: [0, -ARM_L / 2, 0] },
  leg: { dim: [LEG_W, LEG, LEG_D], off: [0, -LEG / 2, 0] },
};

// Clips: node-basierte Rotations-Keyframes (Euler XYZ, Radiant). Zeit in Sekunden.
// Zeitlich variierende Posen ⇒ das gebackene Set deckt „viele" Posen ab (SPEC §6.4).
export const CLIPS = {
  idle: {
    duration: 2,
    channels: {
      shoulderL: [[0, [0.1, 0, 0.12]], [1, [-0.1, 0, 0.12]], [2, [0.1, 0, 0.12]]],
      shoulderR: [[0, [-0.1, 0, -0.12]], [1, [0.1, 0, -0.12]], [2, [-0.1, 0, -0.12]]],
      head: [[0, [0, 0, 0.05]], [1, [0, 0, -0.05]], [2, [0, 0, 0.05]]],
    },
  },
  stand: {
    duration: 1,
    channels: {
      shoulderL: [[0, [0, 0, 0.14]], [1, [0, 0, 0.14]]],
      shoulderR: [[0, [0, 0, -0.14]], [1, [0, 0, -0.14]]],
    },
  },
  spread: {
    duration: 2,
    channels: {
      shoulderL: [[0, [0, 0, 0.3]], [1, [0, 0, 1.2]], [2, [0, 0, 0.3]]],
      shoulderR: [[0, [0, 0, -0.3]], [1, [0, 0, -1.2]], [2, [0, 0, -0.3]]],
      hipL: [[0, [0, 0, 0.05]], [1, [0, 0, 0.22]], [2, [0, 0, 0.05]]],
      hipR: [[0, [0, 0, -0.05]], [1, [0, 0, -0.22]], [2, [0, 0, -0.05]]],
    },
  },
};

export const CLIP_NAMES = Object.keys(CLIPS);

// --- Kleine Mathe (Spalten-Major wie glTF/three) -------------------------------

export function eulerToQuat([x, y, z]) {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

function mIdentity() {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}
function mMul(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}
function mTranslate([x, y, z]) {
  const m = mIdentity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}
function mFromQuat([x, y, z, w]) {
  const m = mIdentity();
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  m[0] = 1 - (yy + zz); m[1] = xy + wz; m[2] = xz - wy;
  m[4] = xy - wz; m[5] = 1 - (xx + zz); m[6] = yz + wx;
  m[8] = xz + wy; m[9] = yz - wx; m[10] = 1 - (xx + yy);
  return m;
}
function mTransform(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/** Interpoliert die Euler-Rotationen eines Clips bei Zeitanteil t01 (0..1). */
export function sampleClipEuler(clipName, t01) {
  const clip = CLIPS[clipName] ?? CLIPS[CLIP_NAMES[0]];
  const time = Math.min(1, Math.max(0, t01)) * clip.duration;
  const out = {};
  for (const [node, keys] of Object.entries(clip.channels)) {
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (time >= keys[i][0] && time <= keys[i + 1][0]) {
        a = keys[i];
        b = keys[i + 1];
        break;
      }
    }
    const span = b[0] - a[0];
    const f = span > 0 ? (time - a[0]) / span : 0;
    out[node] = a[1].map((v, k) => v + (b[1][k] - v) * f);
  }
  return out;
}

/** Weltmatrizen aller Nodes für eine Pose (Map node→euler; fehlende = Ruhe). */
export function computeWorld(poseEuler) {
  const byName = Object.fromEntries(NODES.map((n) => [n.name, n]));
  const world = {};
  function resolve(name) {
    if (world[name]) return world[name];
    const node = byName[name];
    const euler = poseEuler[name] ?? [0, 0, 0];
    const local = mMul(mTranslate(node.t), mFromQuat(eulerToQuat(euler)));
    world[name] = node.parent ? mMul(resolve(node.parent), local) : local;
    return world[name];
  }
  for (const n of NODES) resolve(n.name);
  return world;
}

/** 8 Eckpunkte einer Box (Dimension + Offset). */
export function boxCorners({ dim: [w, h, d], off: [ox, oy, oz] }) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const c = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        c.push([ox + sx * hx, oy + sy * hy, oz + sz * hz]);
      }
    }
  }
  return c;
}

// 12 Box-Kanten als Indexpaare der 8 Ecken (Reihenfolge wie boxCorners).
export const BOX_EDGES = [
  [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
  [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
];

/**
 * Projiziert die Figur einer Pose in 2D-Wireframe-Linien (Frontansicht, −Z).
 * Rückgabe: Linien in Weltkoordinaten (x rechts, y oben) — Aufrufer skaliert.
 */
export function projectPose(clipName, t01) {
  const world = computeWorld(sampleClipEuler(clipName, t01));
  const lines = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of NODES) {
    if (!node.mesh) continue;
    const corners = boxCorners(MESHES[node.mesh]).map((p) => mTransform(world[node.name], p));
    for (const [i, j] of BOX_EDGES) {
      const a = corners[i], b = corners[j];
      lines.push([a[0], a[1], b[0], b[1]]);
    }
    for (const p of corners) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
  }
  return { lines, bbox: { minX, maxX, minY, maxY } };
}
