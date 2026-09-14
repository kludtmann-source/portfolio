import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import yaml from 'js-yaml';

// SPEC §6: die Figur. Fallback (LCP), Seed-Pose, WebGL-Insel, Budget, data-*.

const envelopes = (() => {
  const raw = fs.readFileSync(path.resolve(process.cwd(), 'content/pose-envelopes.yaml'), 'utf8');
  return (yaml.load(raw) as { envelopes: Record<string, { clips: string[] }> }).envelopes;
})();

test('Fallback ist sofort da: die Figur rendert ein Bild (SPEC §6.4)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-clip]');
  // Nach dem Insel-Lauf zeigt der Host ein SVG (Fallback) oder ein Canvas (WebGL).
  const count = await page.locator('[data-figure-host] svg, [data-figure-host] canvas').count();
  expect(count, 'SVG- oder Canvas-Figur vorhanden').toBeGreaterThan(0);
});

test('Seed bestimmt Clip/Zeitpunkt deterministisch, Clip ist erlaubt (SPEC §6.3, §8.3)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 }); // split
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-clip]');
  const state = await page.evaluate(() => ({
    clip: document.documentElement.dataset.clip,
    poseTime: document.documentElement.dataset.poseTime,
    webgl: document.documentElement.dataset.webgl,
  }));
  expect(envelopes.split.clips, 'Clip aus der split-Hülle').toContain(state.clip);
  expect(Number(state.poseTime), 'pose-time ist eine Zahl').not.toBeNaN();
  expect(['true', 'false'], 'data-webgl gesetzt').toContain(state.webgl);
});

test('prefers-reduced-motion: kein WebGL, statischer Fallback (SPEC §6.2, §6.4)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-clip]');
  await page.waitForFunction(() => document.documentElement.dataset.webgl === 'false');
  const canvas = await page.locator('[data-figure-host] canvas').count();
  const svg = await page.locator('[data-figure-host] svg').count();
  expect(canvas, 'kein WebGL-Canvas').toBe(0);
  expect(svg, 'statischer SVG-Fallback').toBeGreaterThan(0);
});

test('micro (watch): kein WebGL (SPEC §6.2)', async ({ page }) => {
  await page.setViewportSize({ width: 184, height: 224 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-clip]');
  await page.waitForFunction(() => document.documentElement.dataset.webgl === 'false');
  expect(await page.evaluate(() => document.documentElement.dataset.webgl)).toBe('false');
});

test('WebGL-Insel lädt das GLB und rendert ein Canvas, wenn WebGL verfügbar ist (SPEC §6.2)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-clip]');
  const supported = await page.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  });
  test.skip(!supported, 'Umgebung ohne WebGL');
  await page.waitForSelector('[data-figure-host] canvas.figure-canvas', { timeout: 8000 });
  expect(await page.evaluate(() => document.documentElement.dataset.webgl)).toBe('true');
});

test('kein Overflow nach dem Insel-Lauf (split + tall) (SPEC §5, §10)', async ({ page }) => {
  for (const vp of [
    { w: 1440, h: 900 },
    { w: 390, h: 844 },
  ]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto('./?pose=1');
    await page.waitForSelector('html[data-clip]');
    // Insel-Lauf abwarten (Canvas oder finaler Fallback), dann Overflow prüfen.
    await page.waitForTimeout(300);
    const of = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        v: el.scrollHeight > el.clientHeight + 1,
        h: el.scrollWidth > el.clientWidth + 1,
      };
    });
    expect(of.v, `kein vertikaler Overflow ${vp.w}x${vp.h}`).toBe(false);
    expect(of.h, `kein horizontaler Overflow ${vp.w}x${vp.h}`).toBe(false);
  }
});

test('Budget: three.js-Chunk + Modell ≤ 250 KB gzip (SPEC §6.4)', async () => {
  const dir = path.resolve(process.cwd(), 'dist/_astro');
  const chunk = fs.readdirSync(dir).find((f) => /figure-webgl.*\.js$/.test(f));
  expect(chunk, 'figure-webgl-Chunk gebaut').toBeTruthy();
  const jsGz = zlib.gzipSync(fs.readFileSync(path.join(dir, chunk!))).length;
  const glb = fs.statSync(path.resolve(process.cwd(), 'public/figure/figure.glb')).size;
  const totalKB = (jsGz + glb) / 1024;
  expect(totalKB, `three+Modell ${totalKB.toFixed(1)} KB ≤ 250`).toBeLessThanOrEqual(250);
});

test('Budget: jedes gebackene Fallback-SVG ≤ 30 KB (SPEC §6.4)', async () => {
  const root = path.resolve(process.cwd(), 'public/figure/poses');
  let max = 0;
  for (const crop of fs.readdirSync(root)) {
    const cropDir = path.join(root, crop);
    if (!fs.statSync(cropDir).isDirectory()) continue;
    for (const f of fs.readdirSync(cropDir)) {
      max = Math.max(max, fs.statSync(path.join(cropDir, f)).size);
    }
  }
  expect(max, `größtes SVG ${max} B ≤ 30720`).toBeLessThanOrEqual(30720);
});

test('figure.glb wird ausgeliefert und hat den glTF-Header (SPEC §6.1)', async ({ request }) => {
  const res = await request.get('./figure/figure.glb');
  expect(res.status()).toBe(200);
  const body = await res.body();
  expect(body.byteLength).toBeGreaterThan(0);
  expect(body.toString('ascii', 0, 4), 'glTF-Magic').toBe('glTF');
});
