# ADR-003: Agenten-Ausgaben als Astro-Endpoints statt `scripts/`-Generatoren

Status: akzeptiert · Datum: 2026-09-13 · Phase: P1

## Kontext

SPEC §11 (Repo-Struktur, v0.1) verortet die Generatoren der Agenten-Ausgaben
(`llms.txt`, `index.md`, `profile.json`, `build.json`) in `scripts/`. SPEC §4 und
§13.2 (P1) fordern zusätzlich `robots.txt`, `sitemap.xml` und JSON-LD `Person`.

Ein `scripts/`-Ansatz würde nach `astro build` in einem zweiten Schritt nach
`dist/` schreiben. Dabei müsste jeder Generator den Deploy-Kontext (Origin `site`
und `base: '/portfolio/'`, ADR-002) selbst rekonstruieren, um korrekte absolute
URLs zu erzeugen (kanonische Links, `Sitemap:`, `<loc>`). Die Single Source und
i18n liegen bereits als TypeScript-Module (`src/lib/content.ts`, `src/lib/i18n.ts`)
vor und werden vom Astro-Build ausgewertet.

## Entscheidung

1. **Agenten-Ausgaben als Astro-Endpoints in `src/pages/`.** Je Ausgabe ein
   `GET`-Endpoint: `llms.txt.ts`, `index.md.ts`, `profile.json.ts`, `robots.txt.ts`,
   `sitemap.xml.ts`, `build.json.ts`. JSON-LD, `rel="alternate"` (Markdown),
   `canonical` und `hreflang` liefert die Komponente `src/components/AgentHead.astro`
   im `<head>` (via `Base.astro`).

2. **Reine Serialisierung in `src/lib/outputs.ts`.** Die Funktionen
   `toJsonLd`/`toLlmsTxt`/`toIndexMd`/`toProfileJson`/`toRobotsTxt`/`toSitemapXml`
   sind frei von `import.meta.env`; die Endpoints reichen die absoluten URLs herein
   (`context.site` + `import.meta.env.BASE_URL`). Das macht die Ausgaben testbar.

3. **`scripts/` bleibt für Nicht-Astro-Tooling** (`validate-content.mjs`).

4. **SPEC §11 im selben Commit angepasst** (§13.3).

## Konsequenzen

- Ein einziger Build-Schritt (`astro build`) erzeugt HTML und alle Agenten-Ausgaben;
  kein Post-Build-Skript, keine URL-Rekonstruktion außerhalb von Astro.
- Base-/Site-Pfade lösen sich automatisch auf. **P4 (Custom Domain):** Entfällt der
  `base`-Pfad (`site` → `knut-ludtmann.de`, `base: '/'`, ADR-002), erzeugen die
  Endpoints die URLs ohne Codeänderung neu.
- **Projekt-Site-Einschränkung (ADR-002):** In P0–P3 liegen `robots.txt` und
  `sitemap.xml` unter `/portfolio/`, nicht am Origin-Root. Crawler, die
  `<origin>/robots.txt` erwarten, sehen sie erst ab P4 (Custom Domain auf Root).
  Sie werden in P1 dennoch erzeugt (SPEC §4); `Sitemap:`/`<loc>` sind absolut.
- **JSON-LD ohne E-Mail:** Die Adresse bleibt im HTML obfuskiert (SPEC §3); Klartext
  nur in `llms.txt`/`index.md`/`profile.json`.
- Validierung der Ausgaben über Playwright-Requests (`tests/agents.spec.ts`) im CI
  (SPEC §10), ohne zusätzliche Laufzeit-Abhängigkeit.
