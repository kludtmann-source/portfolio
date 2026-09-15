// @ts-check
import { defineConfig } from 'astro/config';

// SPEC §9: statischer Build für GitHub Pages, kein Server, kein UI-Framework-Runtime.
// P4: Custom Domain knut-ludtmann.de zeigt auf den Root der Domain. Deshalb
// entfällt der Repo-Unterpfad (`base`) und das Site-URL-Root ist die Domain.
export default defineConfig({
  site: 'https://knut-ludtmann.de',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
