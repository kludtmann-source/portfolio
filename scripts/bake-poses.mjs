// Bäckt Wireframe-Standbilder pro Archetyp-Crop (SPEC §6.4, ADR-005): 30 SVGs je
// Crop, verteilt über die erlaubten Clips/Zeitfenster der Hülle. Prebuild nach
// public/figure/poses/<crop>/NN.svg + manifest.json. Ersetzt Blenders Freestyle-
// Bake durch deterministische Projektion (kein Blender in CI). Der echte Scan
// kann weiterhin Blender-Bakes einspielen (nur Dateien tauschen).
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';
import { projectPose } from './figure-geometry.mjs';

const PER_CROP = 30; // SPEC §6.4: 30–40 pro Crop
const SCALE = 100; // viewBox-Einheiten pro Meter
const CROPS = ['tall', 'portrait', 'split', 'wide']; // micro-Figur ist CSS-versteckt (§5)

const root = process.cwd();
const env = yaml.load(fs.readFileSync(path.join(root, 'content/pose-envelopes.yaml'), 'utf8'));

function round(n) {
  return Math.round(n * 10) / 10;
}

function toSvg(clip, t01) {
  const { lines, bbox } = projectPose(clip, t01);
  const w = bbox.maxX - bbox.minX;
  const h = bbox.maxY - bbox.minY;
  const m = 0.06 * Math.max(w, h);
  const x0 = bbox.minX - m;
  const yTop = bbox.maxY + m;
  const vbW = round((w + 2 * m) * SCALE);
  const vbH = round((h + 2 * m) * SCALE);
  const d = lines
    .map(([x1, y1, x2, y2]) => {
      const sx1 = round((x1 - x0) * SCALE);
      const sy1 = round((yTop - y1) * SCALE);
      const sx2 = round((x2 - x0) * SCALE);
      const sy2 = round((yTop - y2) * SCALE);
      // Tiefenkanten fallen in der Frontansicht auf einen Punkt — überspringen.
      if (sx1 === sx2 && sy1 === sy2) return '';
      return `M${sx1} ${sy1}L${sx2} ${sy2}`;
    })
    .join('');
  return (
    `<svg class="figure-shape" viewBox="0 0 ${vbW} ${vbH}" role="presentation" ` +
    `focusable="false" data-placeholder="true" data-clip="${clip}" ` +
    `data-pose-time="${round(t01 * 1000) / 1000}" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" ` +
    `stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}

const posesDir = path.join(root, 'public/figure/poses');
fs.rmSync(posesDir, { recursive: true, force: true });

const manifest = {};
let maxBytes = 0;
for (const crop of CROPS) {
  const e = env.envelopes[crop];
  const clips = e.clips;
  const [t0, t1] = e.timeWindow;
  const perClip = Math.ceil(PER_CROP / clips.length);
  const dir = path.join(posesDir, crop);
  fs.mkdirSync(dir, { recursive: true });

  let n = 0;
  for (let ci = 0; ci < clips.length && n < PER_CROP; ci++) {
    for (let j = 0; j < perClip && n < PER_CROP; j++) {
      const frac = perClip > 1 ? j / (perClip - 1) : 0.5;
      const t01 = t0 + (t1 - t0) * frac;
      const svg = toSvg(clips[ci], t01);
      maxBytes = Math.max(maxBytes, Buffer.byteLength(svg, 'utf8'));
      fs.writeFileSync(path.join(dir, `${String(n).padStart(2, '0')}.svg`), svg);
      n++;
    }
  }
  manifest[crop] = n;
}

fs.writeFileSync(path.join(posesDir, 'manifest.json'), JSON.stringify(manifest));
console.log(
  `✔ public/figure/poses — ${Object.entries(manifest).map(([k, v]) => `${k}:${v}`).join(' ')}` +
    ` (größtes SVG ${maxBytes} B ≤ 30720)`,
);
if (maxBytes > 30720) {
  console.error('✖ Fallback-SVG überschreitet das Budget (SPEC §6.4: ≤ 30 KB).');
  process.exit(1);
}
