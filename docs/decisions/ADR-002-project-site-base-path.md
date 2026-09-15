# ADR-002: Projekt-Site `portfolio` — base-Pfad bis P4

Status: implementiert · Datum: 2026-09-13; P4-Update 2026-09-15 · Phase: P0–P4

## Kontext

SPEC §14 (v0.1) legte als Hosting-Ziel eine **User-Site** fest: Repo
`kludtmann-source.github.io`, Deploy im Root (`kludtmann-source.github.io/`),
kein `base`-Pfad. Der Autor hat sich nach P0 stattdessen für ein **Projekt-Repo**
`portfolio` entschieden (Account `github.com/kludtmann-source` bleibt unverändert).

GitHub Pages unterscheidet:

- **User-Site:** Repo heißt exakt `<user>.github.io` → Deploy nach `/` (Root).
- **Projekt-Site:** Repo mit beliebigem Namen → Deploy nach `/<repo>/` (Unterpfad).

Ein Projekt-Repo `portfolio` deployt also nach
`https://kludtmann-source.github.io/portfolio/`. Ohne passenden `base`-Pfad
brechen die absoluten Asset-Pfade (gebündeltes CSS/JS), die Astro erzeugt.

## Entscheidung

1. **Projekt-Site statt User-Site.** Das Repo heißt `portfolio`. SPEC §14 wurde
   entsprechend geändert (gleicher Commit).

2. **`base: '/portfolio/'` in `astro.config.mjs`.** Astro versieht damit alle
   gebündelten Assets automatisch mit dem Unterpfad. `site` bleibt
   `https://kludtmann-source.github.io` (Origin für kanonische URLs, Sitemap in P1).
   Es gibt in P0 keine hartcodierten absoluten internen Pfade in `src/`; interne
   Links ab P1 nutzen `import.meta.env.BASE_URL`.

## Konsequenzen

- **P0–P3:** Lokale Vorschau und CI-Deploy liefen unter dem Unterpfad `/portfolio/`.
- **P4 (2026-09-15) — Custom Domain live:** `knut-ludtmann.de` zeigt jetzt auf das Repo-Root.
  - `base` entfernt (wird `'/'`, default).
  - `site` → `https://knut-ludtmann.de` in astro.config.mjs.
  - `public/CNAME` hinzugefügt mit `knut-ludtmann.de` (GitHub Pages auto-sync).
  - DNS-Doku in `docs/DNS-IONOS.md` für Autor (A-Records + CNAME-Records bei IONOS).
  - Alle Test- und CI-Konfigurationen aktualisiert: playwright.config.ts, lighthouserc.json, tests/agents.spec.ts.
  - Interne Links nutzen `import.meta.env.BASE_URL` → funktionieren automatisch bei base-Wechsel.
  - Lokaler Preview startet jetzt unter `http://localhost:4321/` (nicht `/portfolio/`).
