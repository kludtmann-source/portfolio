import { test, expect } from '@playwright/test';

// SPEC §8, §10, P2 (ADR-004): Transparenz-Sicht /learn.

test('/learn vorhanden, kein Overflow auf laptop (SPEC §8, §10)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./learn/?pose=1');
  await page.waitForSelector('html[data-settled="true"]');

  const state = await page.evaluate(() => {
    const el = document.documentElement;
    return {
      intent: el.dataset.intent,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    };
  });

  expect(state.intent, 'data-intent=learn').toBe('learn');
  expect(state.scrollH, 'kein vertikaler Overflow').toBeLessThanOrEqual(state.clientH);
  expect(state.scrollW, 'kein horizontaler Overflow').toBeLessThanOrEqual(state.clientW);
});

test('/learn zeigt Spec-Link + Build-Info (SPEC §8)', async ({ page }) => {
  await page.goto('./learn/');

  // Spec-Link auf GitHub SPEC.md
  const specLink = page.locator('a[href*="SPEC.md"]');
  await expect(specLink, 'Spec-Link vorhanden').toHaveCount(1);

  // Commit-SHA oder "dev" vorhanden
  const body = await page.content();
  expect(body, 'builtAt vorhanden').toMatch(/\d{4}-\d{2}-\d{2}T/);
  expect(body, 'specVersion vorhanden').toContain('0.');
});

test('/learn enthält keine Session-Logs (SPEC §8)', async ({ page }) => {
  await page.goto('./learn/');
  const body = await page.content();
  expect(body, 'keine session logs').not.toContain('session');
  expect(body, 'keine debug logs').not.toContain('debug-logs');
});

test('/learn live-state wird per JS befüllt (SPEC §8.3)', async ({ page }) => {
  await page.goto('./learn/?pose=1');
  await page.waitForSelector('html[data-settled="true"]');

  const archetype = await page.locator('#ls-archetype').textContent();
  expect(archetype, 'Archetyp im live-state').not.toBe('—');
});
