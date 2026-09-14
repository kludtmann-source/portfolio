// Reine, deterministische Pose-Mechanik (SPEC §6.3). Keine Browser-/Node-APIs —
// testbar in Node, bündelbar für die Figur-Insel im Client.
//
// Zufall wählt nur innerhalb deklarierter Hüllen; jede Wahl ist per Seed
// reproduzierbar (SPEC §0, §6.3). Verletzt eine Wahl die Hülle, wird
// deterministisch der nächste Zeitpunkt geprüft — kein Neuwürfeln.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Anchor = 'feet-center' | 'center' | 'head';

export interface Envelope {
  box: Box;
  anchor: Anchor;
  clips: string[];
  timeWindow: [number, number];
  taboos: Box[];
}

export interface NoiseLimits {
  headTiltDeg: number;
  handTwistDeg: number;
  weightShift: number;
}

export interface Pose {
  clip: string;
  time: number; // 0..1, Anteil der Clip-Dauer
  headTilt: number; // Grad
  handTwist: number; // Grad
  weightShift: number; // Anteil
}

/** mulberry32 — kleiner, schneller 32-bit-PRNG. Gleicher Seed ⇒ gleiche Folge. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Analytische Platzhalter-Hülle der projizierten Figur (Container-Anteile).
 * Für den Platzhalter approximiert: die horizontale Ausdehnung hängt vom Clip ab
 * (spread breit, sonst schmal) und öffnet sich über die Clip-Zeit. Der echte Scan
 * ersetzt dies durch in `bake-poses` gemessene BBoxen (SPEC §6.3, ADR-005).
 */
export function projectedExtent(clip: string, time: number, anchor: Anchor): Box {
  const t = Math.min(1, Math.max(0, time));
  const spread = clip === 'spread' ? 0.35 + 0.55 * t : 0.34;
  const w = Math.min(1, spread);
  // head-Anker = Kopf-/Schulter-Crop (SPEC §5, micro), sonst volle Figurhöhe.
  const h = anchor === 'head' ? 0.55 : 1;
  const x = 0.5 - w / 2;
  const y = anchor === 'head' ? 0 : anchor === 'center' ? (1 - h) / 2 : 1 - h;
  return { x, y, w, h };
}

function contains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x - 1e-6 &&
    inner.y >= outer.y - 1e-6 &&
    inner.x + inner.w <= outer.x + outer.w + 1e-6 &&
    inner.y + inner.h <= outer.y + outer.h + 1e-6
  );
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w - 1e-6 &&
    a.x + a.w > b.x + 1e-6 &&
    a.y < b.y + b.h - 1e-6 &&
    a.y + a.h > b.y + 1e-6
  );
}

/** Pose ist gültig, wenn ihre projizierte Hülle in der Box liegt und keine Tabuzone berührt. */
export function withinEnvelope(clip: string, time: number, env: Envelope): boolean {
  const ext = projectedExtent(clip, time, env.anchor);
  if (!contains(env.box, ext)) return false;
  return !env.taboos.some((t) => overlaps(ext, t));
}

/**
 * Wählt aus einem Seed eine Pose innerhalb der Hülle (SPEC §6.3):
 * Clip → Zeitpunkt → Hüllenprüfung (bei Verletzung deterministisch nächster
 * Zeitpunkt, kein Neuwürfeln) → Rauschen auf Sekundärgelenke.
 */
export function selectPose(
  seed: number,
  env: Envelope,
  noise: NoiseLimits,
  steps = 8,
): Pose {
  const rng = mulberry32(seed);
  const clip = env.clips.length ? env.clips[Math.floor(rng() * env.clips.length)] : 'idle';
  const [t0, t1] = env.timeWindow;
  const span = t1 - t0;
  let time = t0 + rng() * span;
  const stepSize = steps > 0 ? span / steps : 0;
  for (let i = 0; i < steps; i++) {
    if (withinEnvelope(clip, time, env)) break;
    time = span > 0 ? t0 + (((time - t0 + stepSize) % span) + span) % span : t0;
  }
  return {
    clip,
    time,
    headTilt: (rng() * 2 - 1) * noise.headTiltDeg,
    handTwist: (rng() * 2 - 1) * noise.handTwistDeg,
    weightShift: (rng() * 2 - 1) * noise.weightShift,
  };
}

/**
 * Übersetzt eine Pose bei Archetypwechsel in die neue Hülle (SPEC §6.3):
 * gleicher Clip, sofern in der neuen Hülle erlaubt, sonst der erste erlaubte;
 * Zeitpunkt neu gegen die neue Hülle geprüft. Seed und damit das Rauschen bleiben.
 */
export function translatePose(
  seed: number,
  from: Envelope,
  to: Envelope,
  noise: NoiseLimits,
  steps = 8,
): Pose {
  const base = selectPose(seed, from, noise, steps);
  const clip = to.clips.includes(base.clip) ? base.clip : (to.clips[0] ?? base.clip);
  const [t0, t1] = to.timeWindow;
  const span = t1 - t0;
  let time = Math.min(t1, Math.max(t0, base.time));
  const stepSize = steps > 0 ? span / steps : 0;
  for (let i = 0; i < steps; i++) {
    if (withinEnvelope(clip, time, to)) break;
    time = span > 0 ? t0 + (((time - t0 + stepSize) % span) + span) % span : t0;
  }
  return { ...base, clip, time };
}

/** Deterministische Auswahl eines gebackenen Standbilds aus dem Set (SPEC §6.4). */
export function fallbackIndex(seed: number, setSize: number): number {
  if (setSize <= 0) return 0;
  return Math.floor(mulberry32(seed)() * setSize) % setSize;
}
