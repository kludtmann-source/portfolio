# Asset-Provenienz (SPEC §6.1)

Diese Datei dokumentiert Herkunft und Lizenz jedes Assets. `/build.json`
referenziert sie (ab P1).

## Stand P0

Es sind **keine** externen (Dritt-)Assets im Repo. Die Figur ist eine einfarbige
Platzhalterform (Inline-SVG, `src/components/Figure.astro`, eigenes Werk).

| Asset                   | Herkunft     | Lizenz                     | Im Repo |
| ----------------------- | ------------ | -------------------------- | ------- |
| Platzhalter-Figur (SVG) | Eigenes Werk | proprietär (siehe LICENSE) | ja      |

## Stand P3 (Figur-Pipeline, ADR-005)

Die Figur-Assets sind ein **prozeduraler Platzhalter** (eigenes Werk), erzeugt im
`prebuild` und ausgeliefert aus `public/figure/` (nicht committet, `.gitignore`d).
Weiterhin **keine** Dritt-Assets im Repo. `extras.placeholder = true` im GLB.

| Asset                               | Herkunft                                         | Lizenz                     | Im Repo         |
| ----------------------------------- | ------------------------------------------------ | -------------------------- | --------------- |
| Platzhalter-GLB `figure.glb`        | Eigenes Werk (`scripts/make-placeholder-figure`) | proprietär (siehe LICENSE) | nein (prebuild) |
| Gebackene Standbilder `poses/*.svg` | Eigenes Werk (`scripts/bake-poses`)              | proprietär (siehe LICENSE) | nein (prebuild) |
| three.js (Runtime-Rendering)        | mrdoob/three.js                                  | MIT                        | via npm         |

## Geplant (echter Scan)

- Dezimierter, geriggter Ganzkörperscan des Autors (GLB) — eigenes Werk; ersetzt
  `public/figure/figure.glb` ohne Codeänderung (ADR-005).
- Gebackene Standbilder (SVG/PNG) — eigenes Werk (Blender Freestyle möglich).
- Pose-Clips: Quaternius Universal Animation Library (CC0) oder retargetete
  Mixamo-Clips. Roh-/Fremddateien werden nicht committet (SPEC §6.1).
