import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  mulberry32,
  selectPose,
  translatePose,
  withinEnvelope,
  fallbackIndex,
  type Envelope,
  type NoiseLimits,
} from '../src/lib/pose';

// SPEC §6.3/§0: Zufall nur in Hüllen, per Seed reproduzierbar. Reine Lib, Node-testbar.

const NOISE: NoiseLimits = { headTiltDeg: 8, handTwistDeg: 20, weightShift: 0.15 };

// Test-Hülle mit Tabuzone rechts: ~obere Zeithälfte von `spread` verletzt sie.
const SPREAD_ENV: Envelope = {
  box: { x: 0, y: 0, w: 1, h: 1 },
  anchor: 'feet-center',
  clips: ['spread'],
  timeWindow: [0, 1],
  taboos: [{ x: 0.82, y: 0, w: 0.18, h: 1 }],
};

test('mulberry32 ist deterministisch und seed-abhängig (SPEC §6.3)', () => {
  const a = mulberry32(1);
  const b = mulberry32(1);
  const c = mulberry32(2);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
  expect(seqA[0]).not.toBe(c());
  for (const v of seqA) {
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test('selectPose ist reproduzierbar (gleicher Seed ⇒ gleiche Pose)', () => {
  const p1 = selectPose(4711, SPREAD_ENV, NOISE);
  const p2 = selectPose(4711, SPREAD_ENV, NOISE);
  expect(p1).toEqual(p2);
});

test('selectPose hält die Hülle ein (nächster Zeitpunkt statt Neuwürfeln, §6.3)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = selectPose(seed, SPREAD_ENV, NOISE);
    expect(withinEnvelope(p.clip, p.time, SPREAD_ENV), `Seed ${seed} gültig`).toBe(true);
    expect(SPREAD_ENV.clips).toContain(p.clip);
    expect(p.time).toBeGreaterThanOrEqual(0);
    expect(p.time).toBeLessThanOrEqual(1);
  }
});

test('selectPose hält die Rausch-Grenzen ein (§6.3)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const p = selectPose(seed, SPREAD_ENV, NOISE);
    expect(Math.abs(p.headTilt)).toBeLessThanOrEqual(NOISE.headTiltDeg + 1e-9);
    expect(Math.abs(p.handTwist)).toBeLessThanOrEqual(NOISE.handTwistDeg + 1e-9);
    expect(Math.abs(p.weightShift)).toBeLessThanOrEqual(NOISE.weightShift + 1e-9);
  }
});

test('translatePose behält den Clip, wenn die Zielhülle ihn erlaubt (§6.3)', () => {
  const from: Envelope = { ...SPREAD_ENV, clips: ['stand'] };
  const toKeep: Envelope = { ...SPREAD_ENV, clips: ['stand', 'idle'] };
  const toSwap: Envelope = { ...SPREAD_ENV, clips: ['idle'] };

  const base = selectPose(99, from, NOISE);
  const kept = translatePose(99, from, toKeep, NOISE);
  const swapped = translatePose(99, from, toSwap, NOISE);

  expect(kept.clip).toBe(base.clip); // stand bleibt
  expect(swapped.clip).toBe('idle'); // stand nicht erlaubt ⇒ erster erlaubter
  expect(withinEnvelope(swapped.clip, swapped.time, toSwap)).toBe(true);
  // Seed bleibt ⇒ Rauschen identisch (SPEC §6.3).
  expect(kept.headTilt).toBe(base.headTilt);
});

test('fallbackIndex ist deterministisch und im Set-Bereich (§6.4)', () => {
  expect(fallbackIndex(1, 30)).toBe(fallbackIndex(1, 30));
  for (let seed = 0; seed < 100; seed++) {
    const i = fallbackIndex(seed, 30);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(30);
  }
  expect(fallbackIndex(5, 0)).toBe(0); // leeres Set ⇒ 0
});

test('content/pose-envelopes.yaml: jede Hülle liefert für viele Seeds gültige Posen', () => {
  const raw = fs.readFileSync(
    path.resolve(process.cwd(), 'content/pose-envelopes.yaml'),
    'utf8',
  );
  const data = yaml.load(raw) as {
    clips: string[];
    noise: NoiseLimits;
    envelopes: Record<string, Envelope>;
  };

  for (const [name, env] of Object.entries(data.envelopes)) {
    // Jeder erlaubte Clip existiert global (SPEC §6.3).
    for (const clip of env.clips) {
      expect(data.clips, `${name}.clips ⊆ clips`).toContain(clip);
    }
    for (let seed = 1; seed <= 50; seed++) {
      const p = selectPose(seed, env, data.noise);
      expect(withinEnvelope(p.clip, p.time, env), `${name} Seed ${seed}`).toBe(true);
    }
  }
});
