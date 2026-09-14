import { test, expect } from '@playwright/test';

// SPEC §14, P2: Recht-Routen /impressum + /datenschutz — vorhanden und strukturell korrekt.

test('/impressum gibt 200 zurück und hat h1 (SPEC §14)', async ({ request, page }) => {
  const res = await request.get('./impressum/');
  expect(res.status(), 'HTTP 200').toBe(200);

  await page.goto('./impressum/');
  await expect(page.locator('h1'), 'h1 vorhanden').toHaveCount(1);
  await expect(page.locator('a.doc-back'), 'Back-Link vorhanden').toHaveCount(1);
});

test('/datenschutz gibt 200 zurück und hat h1 (SPEC §14)', async ({ request, page }) => {
  const res = await request.get('./datenschutz/');
  expect(res.status(), 'HTTP 200').toBe(200);

  await page.goto('./datenschutz/');
  await expect(page.locator('h1'), 'h1 vorhanden').toHaveCount(1);
  await expect(page.locator('a.doc-back'), 'Back-Link vorhanden').toHaveCount(1);
});

test('/datenschutz erwähnt kein implizites Tracking (SPEC §1)', async ({ page }) => {
  await page.goto('./datenschutz/');
  const body = await page.textContent('body');
  expect(body, 'kein Tracking erwähnt').toContain('kein');
});
