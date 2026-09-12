import { test, expect } from '@playwright/test';

// SPEC §10: Gerätematrix. Erwarteter Archetyp + Stufe, kein Overflow an <html>.
// Stufe = nominale Stufe (Inhalt muss bei nominaler Stufe passen, kein Degrade nötig).
type Cell = { name: string; w: number; h: number; archetype: string; tier: string };

const MATRIX: Cell[] = [
  { name: 'watch', w: 184, h: 224, archetype: 'micro', tier: '0' },
  { name: 'phone-portrait', w: 390, h: 844, archetype: 'tall', tier: '1' },
  { name: 'phone-landscape', w: 844, h: 390, archetype: 'split', tier: '1' },
  { name: 'tablet-portrait', w: 820, h: 1180, archetype: 'portrait', tier: '1' },
  { name: 'tablet-landscape', w: 1180, h: 820, archetype: 'split', tier: '1' },
  { name: 'laptop', w: 1440, h: 900, archetype: 'split', tier: '2' },
  { name: 'desktop', w: 1920, h: 1080, archetype: 'split', tier: '2' },
  { name: 'ultrawide', w: 3440, h: 1440, archetype: 'wide', tier: '2' },
  { name: 'car-tall', w: 800, h: 4000, archetype: 'tall', tier: '1' },
  { name: 'square', w: 1000, h: 1000, archetype: 'portrait', tier: '1' },
];

for (const cell of MATRIX) {
  test(`${cell.name} ${cell.w}x${cell.h}: ${cell.archetype}/T${cell.tier}, kein Overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: cell.w, height: cell.h });
    // Fester Seed für Reproduzierbarkeit (SPEC §10).
    await page.goto('/?pose=1');
    await page.waitForSelector('html[data-settled="true"]');

    const state = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        archetype: el.dataset.archetype,
        tier: el.dataset.tier,
        seed: el.dataset.seed,
        webgl: el.dataset.webgl,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });

    expect(state.archetype, 'Archetyp').toBe(cell.archetype);
    expect(state.tier, 'Stufe').toBe(cell.tier);
    // SPEC §5: data-* sind Pflicht-Testschnittstelle.
    expect(state.seed, 'Seed aus ?pose=1').toBe('1');
    expect(state.webgl, 'WebGL in P0 aus').toBe('false');
    // SPEC §10: kein Overflow an <html>.
    expect(state.scrollHeight, 'kein vertikaler Overflow').toBeLessThanOrEqual(state.clientHeight);
    expect(state.scrollWidth, 'kein horizontaler Overflow').toBeLessThanOrEqual(state.clientWidth);
  });
}
