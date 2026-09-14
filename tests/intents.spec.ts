import { test, expect } from '@playwright/test';

// SPEC §10, P2 (ADR-004): Intent-Routen × Gerätematrix — kein Overflow, richtiger Archetyp/Tier.
// Freitext-Mapping, Tab-Reihenfolge, ?lang-Kombinierbarkeit.

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

const INTENTS = ['hire', 'collab', 'curious', 'learn'] as const;

// ── Matrix × Intent: kein Overflow, Archetyp/Tier korrekt ───────────────────
for (const cell of MATRIX) {
  for (const intent of INTENTS) {
    test(
      `${cell.name} ${cell.w}x${cell.h} / ${intent}: ${cell.archetype}/T${cell.tier}, kein Overflow`,
      async ({ page }) => {
        await page.setViewportSize({ width: cell.w, height: cell.h });
        await page.goto(`./${intent}/?pose=1`);
        await page.waitForSelector('html[data-settled="true"]');

        const state = await page.evaluate(() => {
          const el = document.documentElement;
          return {
            archetype: el.dataset.archetype,
            tier: el.dataset.tier,
            intent: el.dataset.intent,
            scrollH: el.scrollHeight,
            clientH: el.clientHeight,
            scrollW: el.scrollWidth,
            clientW: el.clientWidth,
          };
        });

        expect(state.archetype, 'Archetyp').toBe(cell.archetype);
        expect(state.tier, 'Tier').toBe(cell.tier);
        expect(state.intent, 'data-intent').toBe(intent);
        expect(state.scrollH, 'kein vertikaler Overflow').toBeLessThanOrEqual(state.clientH);
        expect(state.scrollW, 'kein horizontaler Overflow').toBeLessThanOrEqual(state.clientW);
      },
    );
  }
}

// ── Startsicht: Intent-Auswahl-Links vorhanden ───────────────────────────────
test('Startsicht hat Links zu allen klickbaren Intents', async ({ page }) => {
  await page.goto('./?pose=1');
  for (const intent of INTENTS) {
    const link = page.locator(`.intent-nav a[href*="${intent}"]`);
    await expect(link, `Link zu ${intent}`).toHaveCount(1);
  }
});

// ── Tab-Reihenfolge (SPEC §10): Intent-Auswahl → Links → Freitext ─────────
test('Tab-Reihenfolge: intent-nav vor links vor freitext', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-settled="true"]');

  // Erstes fokussierbares Element nach Body soll im intent-nav liegen.
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.closest('.intent-nav') !== null);
  expect(first, 'Erstes Tab-Ziel im intent-nav').toBe(true);
});

// ── Freitext-Mapping: bekanntes Stichwort navigiert zur richtigen Route ──────
test('Freitext "suche" navigiert zu /hire/', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-settled="true"]');

  const input = page.locator('#intent-freetext');
  await input.fill('Ich suche einen Entwickler');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/hire\//);
});

test('Freitext "zusammen bauen" navigiert zu /collab/', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./?pose=1');
  await page.waitForSelector('html[data-settled="true"]');

  const input = page.locator('#intent-freetext');
  await input.fill('Ich will etwas zusammen bauen');
  await input.press('Enter');

  await expect(page).toHaveURL(/\/collab\//);
});

// ── ?lang kombinierbar mit Intent-Routen ─────────────────────────────────────
test('hire?lang=en rendert ohne Overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./hire/?pose=1&lang=en');
  await page.waitForSelector('html[data-settled="true"]');

  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  });
  expect(overflow, 'kein Overflow auf hire?lang=en').toBe(false);
});
