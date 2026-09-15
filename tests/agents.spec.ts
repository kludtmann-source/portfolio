import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// SPEC §4/§10: Agenten-Ausgaben vorhanden, valide und vollständig.
// Request-basiert gegen die gebaute Site (preview), analog matrix.spec.ts.

// Lädt content/profile.yaml und normalisiert wie src/lib/content.ts (sameAs generiert).
function profileSource(): any {
  const file = path.resolve(process.cwd(), 'content/profile.yaml');
  const data = yaml.load(fs.readFileSync(file, 'utf8')) as any;
  data.person.sameAs = Object.values(data.person.links.all);
  return data;
}

test('profile.json ist identisch mit der Quelle (SPEC §4)', async ({ request }) => {
  const res = await request.get('./profile.json');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  expect(await res.json()).toEqual(profileSource());
});

test('llms.txt vorhanden, ≤ 4 KB, mit index.md-Link (SPEC §4, §10)', async ({ request }) => {
  const res = await request.get('./llms.txt');
  expect(res.status()).toBe(200);
  const body = await res.body();
  expect(body.byteLength, '≤ 4 KB').toBeLessThanOrEqual(4096);
  const text = body.toString('utf8');
  expect(text).toContain('Knut Ludtmann');
  expect(text).toContain('index.md');
});

test('index.md enthält alle T0/T1-Felder (SPEC §4, §10)', async ({ request }) => {
  const p = profileSource();
  const res = await request.get('./index.md');
  expect(res.status()).toBe(200);
  const text = await res.text();
  const needles = [
    p.person.name,
    p.person.role,
    p.person.location,
    p.person.links.all.github,
    p.person.links.all.linkedin,
    ...p.skills.map((s: any) => s.label),
    ...p.projects.map((pr: any) => pr.title),
    ...p.projects.map((pr: any) => pr.oneliner).filter(Boolean),
    p.contact.email,
  ];
  for (const needle of needles) expect(text, `enthält "${needle}"`).toContain(needle);
});

test('robots.txt erlaubt KI-Crawler + Sitemap (SPEC §4)', async ({ request }) => {
  const res = await request.get('./robots.txt');
  expect(res.status()).toBe(200);
  const text = await res.text();
  for (const bot of [
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
  ]) {
    expect(text, bot).toContain(bot);
  }
  expect(text).toContain('Sitemap:');
});

test('sitemap.xml ist XML mit canonical loc (SPEC §4)', async ({ request }) => {
  const res = await request.get('./sitemap.xml');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  const text = await res.text();
  expect(text).toContain('<urlset');
  expect(text).toContain('<loc>');
  // Kanonische URL aus astro.config (site-root, kein /portfolio-Subpfad mehr).
  expect(text).toContain('https://knut-ludtmann.de/');
});

test('build.json hat commit, builtAt, specVersion, provenance (SPEC §4)', async ({ request }) => {
  const res = await request.get('./build.json');
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.commit, 'commit').toBeTruthy();
  expect(json.builtAt, 'builtAt').toBeTruthy();
  expect(json.specVersion, 'specVersion').toBe('0.1');
  expect(json.provenance).toBe('assets/PROVENANCE.md');
});

test('JSON-LD Person im HTML + Markdown-Alternate (SPEC §4, §10)', async ({ page }) => {
  const p = profileSource();
  await page.goto('./');
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  expect(raw, 'JSON-LD vorhanden').toBeTruthy();
  const ld = JSON.parse(raw!);
  expect(ld['@type']).toBe('Person');
  expect(ld.name).toBe(p.person.name);
  for (const url of Object.values(p.person.links.all)) {
    expect(ld.sameAs, `sameAs enthält ${url}`).toContain(url);
  }
  await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveCount(1);
});
