// @ts-check
import { defineConfig } from 'astro/config';

// SPEC §9: statischer Build für GitHub Pages, kein Server, kein UI-Framework-Runtime.
// SPEC §14 / ADR-002: Projekt-Site im Repo `portfolio` → Deploy unter
// kludtmann-source.github.io/portfolio/, deshalb `base: '/portfolio/'`.
// P4: Bei Custom Domain knut-ludtmann.de zeigt die Domain auf Root, dann entfällt `base`.
export default defineConfig({
  site: 'https://kludtmann-source.github.io',
  base: '/portfolio/',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
