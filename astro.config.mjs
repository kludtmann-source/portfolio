// @ts-check
import { defineConfig } from 'astro/config';

// SPEC §9: statischer Build für GitHub Pages, kein Server, kein UI-Framework-Runtime.
// SPEC §14: User-Site → Root-Pfade, deshalb kein `base`.
// Domain knut-ludtmann.de wird erst in P4 aktiv; bis dahin kludtmann-source.github.io.
export default defineConfig({
  site: 'https://kludtmann-source.github.io',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
