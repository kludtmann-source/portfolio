// Erzeugt das Platzhalter-Figur-GLB (SPEC §6.1, ADR-005): geriggter Low-Poly-
// Humanoid, node-basiert animiert, klar als Platzhalter (eigenes Werk). Wird
// prebuild nach public/figure/figure.glb geschrieben. Austausch gegen den echten
// Scan ohne Codeänderung: nur die GLB-Datei + Clip-Namen in pose-envelopes.yaml.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  NODES,
  MESHES,
  CLIPS,
  CLIP_NAMES,
  eulerToQuat,
  boxCorners,
} from './figure-geometry.mjs';

const FLOAT = 5126;
const USHORT = 5123;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

const bufferViews = [];
const accessors = [];
const parts = [];
let offset = 0;

function pad4() {
  const p = (4 - (offset % 4)) % 4;
  if (p) {
    parts.push(Buffer.alloc(p));
    offset += p;
  }
}
function pushView(buf, target) {
  pad4();
  const view = { buffer: 0, byteOffset: offset, byteLength: buf.length };
  if (target) view.target = target;
  bufferViews.push(view);
  parts.push(buf);
  offset += buf.length;
  return bufferViews.length - 1;
}
function bytesOf(typed) {
  return Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
}
function addAccessor(typed, { componentType, type, count, min, max, target }) {
  const bv = pushView(bytesOf(typed), target);
  const acc = { bufferView: bv, byteOffset: 0, componentType, count, type };
  if (min) acc.min = min;
  if (max) acc.max = max;
  accessors.push(acc);
  return accessors.length - 1;
}

// Box-Triangulierung (2 Dreiecke/Fläche). EdgesGeometry filtert die Diagonalen,
// sodass im Client ein sauberes 12-Kanten-Wireframe entsteht (SPEC §6.2).
function quad(a, b, c, d) {
  return [a, b, c, a, c, d];
}
const BOX_INDICES = new Uint16Array([
  ...quad(0, 1, 3, 2),
  ...quad(4, 6, 7, 5),
  ...quad(0, 4, 5, 1),
  ...quad(2, 3, 7, 6),
  ...quad(0, 2, 6, 4),
  ...quad(1, 5, 7, 3),
]);

// Meshes (unique) → glTF-Mesh-Index.
const meshNames = ['torso', 'head', 'arm', 'leg'];
const meshIndex = {};
const gltfMeshes = meshNames.map((name, i) => {
  const corners = boxCorners(MESHES[name]);
  const pos = new Float32Array(corners.flat());
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const [x, y, z] of corners) {
    min[0] = Math.min(min[0], x); max[0] = Math.max(max[0], x);
    min[1] = Math.min(min[1], y); max[1] = Math.max(max[1], y);
    min[2] = Math.min(min[2], z); max[2] = Math.max(max[2], z);
  }
  const posAcc = addAccessor(pos, {
    componentType: FLOAT, type: 'VEC3', count: 8, min, max, target: ARRAY_BUFFER,
  });
  const idxAcc = addAccessor(BOX_INDICES.slice(), {
    componentType: USHORT, type: 'SCALAR', count: BOX_INDICES.length, target: ELEMENT_ARRAY_BUFFER,
  });
  meshIndex[name] = i;
  return { name, primitives: [{ attributes: { POSITION: posAcc }, indices: idxAcc }] };
});

// Nodes (Reihenfolge = NODES) + children aus parent-Beziehung.
const nodeIndex = Object.fromEntries(NODES.map((n, i) => [n.name, i]));
const gltfNodes = NODES.map((n) => {
  const node = { name: n.name, translation: n.t };
  if (n.mesh) node.mesh = meshIndex[n.mesh];
  const children = NODES.filter((c) => c.parent === n.name).map((c) => nodeIndex[c.name]);
  if (children.length) node.children = children;
  return node;
});

// Animationen: ein Clip = eine Animation, ein Kanal je animiertem Node.
const animations = CLIP_NAMES.map((clipName) => {
  const clip = CLIPS[clipName];
  const samplers = [];
  const channels = [];
  for (const [nodeName, keys] of Object.entries(clip.channels)) {
    const times = new Float32Array(keys.map((k) => k[0]));
    const quats = new Float32Array(keys.flatMap((k) => eulerToQuat(k[1])));
    const input = addAccessor(times, {
      componentType: FLOAT, type: 'SCALAR', count: keys.length,
      min: [times[0]], max: [times[times.length - 1]],
    });
    const output = addAccessor(quats, {
      componentType: FLOAT, type: 'VEC4', count: keys.length,
    });
    const s = samplers.length;
    samplers.push({ input, output, interpolation: 'LINEAR' });
    channels.push({ sampler: s, target: { node: nodeIndex[nodeName], path: 'rotation' } });
  }
  return { name: clipName, samplers, channels };
});

const bin = Buffer.concat(parts);
const gltf = {
  asset: { version: '2.0', generator: 'make-placeholder-figure (SPEC §6.1, placeholder)' },
  scene: 0,
  scenes: [{ nodes: [nodeIndex.root] }],
  nodes: gltfNodes,
  meshes: gltfMeshes,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
  animations,
  extras: { placeholder: true },
};

// GLB-Container: Header + JSON-Chunk + BIN-Chunk (je 4-Byte-aligned).
function chunk(type, data) {
  const padLen = (4 - (data.length % 4)) % 4;
  const padded = Buffer.concat([data, Buffer.alloc(padLen, type === 0x4e4f534a ? 0x20 : 0x00)]);
  const header = Buffer.alloc(8);
  header.writeUInt32LE(padded.length, 0);
  header.writeUInt32LE(type, 4);
  return Buffer.concat([header, padded]);
}
const jsonChunk = chunk(0x4e4f534a, Buffer.from(JSON.stringify(gltf), 'utf8'));
const binChunk = chunk(0x004e4942, bin);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + jsonChunk.length + binChunk.length, 8);
const glb = Buffer.concat([header, jsonChunk, binChunk]);

const outDir = path.resolve(process.cwd(), 'public/figure');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'figure.glb');
fs.writeFileSync(outFile, glb);
console.log(
  `✔ ${path.relative(process.cwd(), outFile)} — ${glb.length} B, ` +
    `${gltfMeshes.length} Meshes, ${animations.length} Clips (${CLIP_NAMES.join(', ')})`,
);
