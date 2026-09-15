import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// SPEC §10: axe-core keine Verstöße (WCAG 2 A/AA) auf allen Sichten, Dark + Light.
// SPEC §7/§10: Kontrast der Overlay-Fläche gegen die Tokens, nicht nur behauptet.

const ROUTES = [
  './?pose=1',
  './hire/?pose=1',
  './collab/?pose=1',
  './curious/?pose=1',
  './learn/?pose=1',
  './impressum/',
  './datenschutz/',
];
const SCHEMES = ['light', 'dark'] as const;

for (const scheme of SCHEMES) {
  for (const route of ROUTES) {
    test(`axe: ${route} (${scheme}) keine Verstöße`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(route, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts?.ready);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const ids = results.violations.map((v) => `${v.id} (${v.nodes.length})`);
      expect(results.violations, ids.join(', ')).toEqual([]);
    });
  }
}

// --- Kontrast der Overlay-Fläche gegen Tokens (SPEC §7): Text ≥ 4.5:1, UI ≥ 3:1. ---
// Worst case: Overlay über der Figur-Linie (mittelgrau zieht die Fläche zur Mitte).

type RGBA = [number, number, number, number];

function parseRGBA(s: string): RGBA {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error('Farbe nicht parsebar: ' + s);
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}

function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
}

function luminance([r, g, b]: RGBA): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: RGBA, b: RGBA): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const scheme of SCHEMES) {
  test(`Overlay-Kontrast gegen Tokens (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('./?pose=1', { waitUntil: 'load' });

    const raw = await page.evaluate(() => {
      const resolve = (name: string) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${name})`;
        document.body.appendChild(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      };
      return {
        text: resolve('--text'),
        accent: resolve('--accent'),
        overlay: resolve('--surface-overlay'),
        figureLine: resolve('--figure-line'),
      };
    });

    const surface = over(parseRGBA(raw.overlay), parseRGBA(raw.figureLine));
    const cText = contrast(parseRGBA(raw.text), surface);
    const cUI = contrast(parseRGBA(raw.accent), surface);

    expect(cText, `Text/Overlay ${scheme}: ${cText.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    expect(cUI, `Akzent/Overlay ${scheme}: ${cUI.toFixed(2)}:1`).toBeGreaterThanOrEqual(3.0);
  });
}
