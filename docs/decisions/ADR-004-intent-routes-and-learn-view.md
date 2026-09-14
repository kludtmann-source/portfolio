# ADR-004: Intent-Routen als separate Pfade + Spec nur verlinken

Status: akzeptiert · Datum: 2026-09-14 · Phase: P2

## Kontext

SPEC §2 (v0.1) beschreibt Intent-Navigation über einen einzigen URL-Parameter
(`/?i=hire`, `/?i=collab` usw.) auf der Startseite. SPEC §0 und §8 legen fest,
dass die Spec zur Build-Zeit von der Site selbst gerendert und in der
Transparenz-Sicht angezeigt wird.

### 1. Intent-URL-Struktur

GitHub Pages liefert statische Dateien; Query-Parameter (`?i=`) lassen sich
nicht in getStaticPaths abbilden. Eine rein clientseitige Umschaltung hätte
bedeutet, alle Intent-Sichten in einer einzigen HTML-Datei zu bündeln — verborgene
Inhalte, keine linkbaren URLs, kein deterministisches Testen per URL.

### 2. Spec in der Transparenz-Sicht

SPEC §8 verlangt die vollständige Spec inline gerendert. Markdown-Rendering in
Astro (remark/mdast) ist möglich, erzeugt aber eine inhärent lange, scrollende
Ansicht. Das widerspricht dem „Kein Scrollen"-Prinzip (SPEC §1). Die Spec gehört
in das Repo und ist über GitHub einsehbar; ein direkter Link erfüllt den
Transparenz-Anspruch ohne Layout-Konflikt.

## Entscheidung

### 1. Separate statische Routen je Intent

Jeder klickbare Intent erhält eine eigene Route:

| Intent  | Pfad        | Datei                      |
| ------- | ----------- | -------------------------- |
| hire    | `/hire/`    | `src/pages/hire.astro`¹    |
| collab  | `/collab/`  | `src/pages/collab.astro`¹  |
| curious | `/curious/` | `src/pages/curious.astro`¹ |
| learn   | `/learn/`   | `src/pages/learn.astro`    |

¹ Erzeugt durch `src/pages/[intent].astro` mit `getStaticPaths`.

Die Startseite (`/`) zeigt T0 + Intent-Auswahl als echte `<a>`-Links — teilbar,
bookmarkbar, No-JS-fähig. `?lang=` bleibt kombinierbar (`/hire?lang=en`).
SPEC §2 wird entsprechend geändert.

### 2. Spec nur verlinken

Die Transparenz-Sicht `/learn` zeigt:

- Link auf SPEC.md im GitHub-Repo (nicht inline gerendert)
- Build-Info, Live-Status aus `data-*`, Provenienz-Tabelle, Link auf Commit-Historie

SPEC §0 und §8 werden entsprechend angepasst.

## Konsequenzen

- Intent-URLs sind statisch, testbar per Playwright-Navigate (`/portfolio/hire/`).
- `data-intent` am `<html>`-Element erlaubt Test-Selektion (§10).
- Die Spec-Datei bleibt ausschließlich im Repo (keine Kopie im `dist/`).
- Freitext-Mapping (clientseitig, kein LLM) navigiert deterministisch auf die
  passende Route statt `?i=` zu setzen.
- Kein zusätzlicher JS-Runtime-Overhead für das Intent-Umschalten.
- `getStaticPaths` gibt nur `['hire', 'collab', 'curious']` zurück; `learn` hat
  eine eigene Datei.
