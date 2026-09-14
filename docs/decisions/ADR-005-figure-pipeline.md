# ADR-005: Figur-Pipeline — three.js-Insel, prozeduraler Platzhalter, Node-Bake

Status: akzeptiert · Datum: 2026-09-14 · Phase: P3

## Kontext

SPEC §6 beschreibt die Figur: ein dezimierter Ganzkörperscan als GLB, geriggt
(Auto-Rig Pro), Clips aus Quaternius/Mixamo, WebGL-Wireframe (three.js), pro
Archetyp definierte Pose-Hüllen, ein gebackenes Standbild-Set (Blender Freestyle →
SVG) als LCP-Fallback und „Austausch gegen Scan ohne Codeänderung" (§13.2 P3).

Zum Zeitpunkt von P3 existiert **kein Scan** (§14 offen). Der in §6.1 genannte
Mixamo-Y-Bot-Platzhalter erfordert einen manuellen Mixamo-Download plus
Blender-Dezimierung; die Spec verbietet zugleich das Committen der Rohdateien.
Blender-Freestyle-Bakes und der Y-Bot sind in der automatisierten Build-Kette
(GitHub Actions, §9) nicht reproduzierbar erzeugbar.

P3 baut daher — wie P0–P2 — die **Mechanik** vollständig und deterministisch, mit
einem Platzhalter, der ohne Codeänderung gegen den echten Scan tauschbar ist.

## Entscheidung

1. **Rendering als Astro-Insel mit three.js.** `src/components/Figure.astro`
   rendert sofort einen Platzhalter/Fallback (LCP) und bettet die Hüllen-Daten als
   `<script type="application/json">` ein. `src/client/figure.ts` (Insel) wählt per
   Seed das Standbild, lädt three.js **dynamisch** nach (`src/client/figure-webgl.ts`)
   und rendert das GLB als Wireframe (`MeshBasicMaterial({ wireframe: true })`,
   Farbe aus `--figure-line`). Kein WebGL / `prefers-reduced-motion` / `micro` ⇒
   statischer Fallback (SPEC §6.2).

2. **Reine Pose-Mechanik in `src/lib/pose.ts`.** `mulberry32`, `selectPose`
   (Clip → Zeitpunkt → Hüllenprüfung → deterministisch nächster Zeitpunkt statt
   Neuwürfeln → Sekundär-Rauschen), `translatePose` (Archetypwechsel), `fallbackIndex`.
   Frei von Browser-/Node-APIs, node-testbar (`tests/pose.spec.ts`). Die Hüllen sind
   Daten: `content/pose-envelopes.yaml` + `schema/pose-envelopes.schema.json`,
   im Build validiert (§9).

3. **Prozeduraler Platzhalter statt Mixamo-Y-Bot.** `scripts/make-placeholder-figure.mjs`
   erzeugt ein GLB (Low-Poly-Humanoid aus Boxen, **node-basierte** TRS-Rotations-Clips
   `idle/stand/spread`, kein Skin-Rig) — eigenes Werk, `extras.placeholder = true`.
   Abweichung von §6.1 (Mixamo-Y-Bot, Skin-Rig): Der echte Scan bringt Skinning; der
   Loader lädt weiterhin ein GLB, der Tausch bleibt code-frei.

4. **Bake in Node statt Blender.** `scripts/bake-poses.mjs` projiziert dieselbe
   Geometrie (`scripts/figure-geometry.mjs`) deterministisch zu 30 Wireframe-SVGs je
   Crop. Abweichung von §6.4 (Blender Freestyle): reproduzierbar in CI, ohne Blender.
   Finale Bakes des echten Scans können weiterhin aus Blender kommen (Dateitausch).

5. **Assets in `public/figure/`, prebuild generiert.** Die Platzhalter-Assets werden
   im `prebuild`-Schritt erzeugt und von Astro ausgeliefert (`public/`), nicht nach
   `assets/figure/` committet. Abweichung von §11/§6.1: für einen deterministisch
   reproduzierbaren Platzhalter ist die Generierung sauberer als Commit-Rauschen;
   `public/figure/` ist `.gitignore`d. Der echte Scan wird committet (§6.1 gilt dann).

6. **Testschnittstelle erweitert.** `<html data-webgl data-clip data-pose-time>`
   (§5, §8.3); `/learn` zeigt Clip/Zeitpunkt live. `data-webgl` verwaltet die Insel
   (nicht mehr `viewport.js`).

7. **SPEC §6, §11, §13.2 im selben Commit angepasst** (§13.3).

## Konsequenzen

- Die Pipeline läuft End-to-End: `npm run build` erzeugt Figur-Assets, three.js
  lädt das GLB, die Insel rendert die per Seed reproduzierbare Pose; Übersetzung bei
  Archetypwechsel (`MutationObserver` auf `data-archetype`).
- **Budget (§6.4):** three.js lädt als separater Chunk nur bei Bedarf (~149 KB gzip);
  three + Modell ≤ 250 KB gzip, jedes Fallback-SVG ≤ 30 KB — im CI getestet
  (`tests/figure.spec.ts`).
- **Austausch gegen den Scan:** GLB unter `public/figure/figure.glb` ersetzen und die
  Clip-Namen in `pose-envelopes.yaml` anpassen (Daten) — keine Codeänderung.
- Die analytische Hüllenprüfung (`projectedExtent`) ist eine Platzhalter-Näherung;
  der echte Scan bringt in `bake-poses` gemessene BBoxen ein.
- **Dev ohne `prebuild`:** Fehlen die Assets, bleibt die Platzhalterform; die Site
  funktioniert. `predev`/`prebuild` erzeugen sie automatisch.
- Neue Laufzeit-Abhängigkeit `three` (§13.4, in `package.json` begründet); Bake/GLB
  ohne three (reine Node-Mathe), damit deterministisch und dep-arm.
