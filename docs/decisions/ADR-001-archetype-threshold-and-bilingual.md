# ADR-001: Archetyp-+T2-Schwelle `w ≥ 1400` und bilinguales Content-Modell

Status: akzeptiert · Datum: 2026-09-12 · Phase: P0

## Kontext

Zwei Punkte weichen vom ursprünglichen Wortlaut der Spec (v0.1) ab bzw. erweitern
ihn. Beide sind mit dem Autor im Vor-P0-Interview entschieden worden.

### 1. `split`-Archetyp: +T2-Schwelle

SPEC §5 (Entwurf) vergab die Zusatzstufe T2 im `split`-Archetyp bei
`h ≥ 700 && w ≥ 1100`. Damit hätte **tablet-landscape (1180×820)** die Bedingung
erfüllt und wäre „split (+T2)" gewesen — die Gerätematrix in §10 listet dort aber
nur „split", während `laptop` (1440×900) und `desktop` (1920×1080) „split (+T2)"
tragen. Regel und Matrix widersprachen sich.

### 2. Sprache der Site

§14 ließ die Sprache offen. Der Autor hat **bilingual DE + EN** gewählt (Default DE).
Das Content-Modell in §3 kannte nur einfache Strings.

## Entscheidung

1. **Schwelle auf `w ≥ 1400` angehoben.** Damit bleibt tablet-landscape (1180)
   bei T1, laptop (1440) und desktop (1920) erhalten T2 — konsistent mit der
   Matrix in §10. SPEC §5 wurde entsprechend geändert (gleicher Commit).

2. **Lokalisierte Felder im Content-Modell.** Textfelder in `content/profile.yaml`
   dürfen entweder ein String (sprachneutral) oder `{ de, en }` sein
   (`$defs/localizedText` im Schema). Der Resolver `t()` fällt auf DE zurück und
   erfindet keine Übersetzungen (SPEC §3). Die sichtbare Sprachumschaltung ist in
   P0 minimal (`?lang=`); der finale Mechanismus folgt in P2.

## Konsequenzen

- Die Archetyp-Logik in `src/client/viewport.js` nutzt `w ≥ 1400`.
- Die Playwright-Matrix (`tests/matrix.spec.ts`) prüft tablet-landscape=T1,
  laptop/desktop=T2.
- `schema/profile.schema.json` erlaubt `localizedText`; fehlende EN-Werte fallen
  auf DE zurück und bleiben als Übersetzungs-TODO offen.
