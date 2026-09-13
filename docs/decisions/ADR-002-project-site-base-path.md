# ADR-002: Projekt-Site `portfolio` mit `base: '/portfolio/'`

Status: akzeptiert · Datum: 2026-09-13 · Phase: P0

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

- Lokale Vorschau und CI-Deploy laufen unter dem Unterpfad `/portfolio/`.
- **P4 (Custom Domain):** Sobald `knut-ludtmann.de` auf das Repo zeigt, liegt die
  Site im Root der Domain. Dann entfällt `base` (bzw. `base: '/'`) und `site`
  wird `https://knut-ludtmann.de`. Dieser Wechsel gehört in den P4-Commit inkl.
  `CNAME`-Datei (SPEC §9).
- Interne Links (llms.txt, index.md, Intent-URLs ab P1/P2) müssen den `base`-Pfad
  über `import.meta.env.BASE_URL` auflösen, nicht hartkodiert `/…` schreiben.
