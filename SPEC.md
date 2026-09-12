# knut-ludtmann.de — Konzept & Übergabe an Claude Code

Version 0.1 · Stand 12.09.2026 · Autor: Knut Ludtmann (Konzeptgespräch mit Claude)

Diese Datei ist die **Spec**. Sie ist die einzige Quelle für Entscheidungen. Sie liegt im Repo, wird zur Build-Zeit von der Site selbst gerendert („Wie ist das gebaut?") und wird nie kopiert. Änderungen an der Spec sind Commits mit Begründung; Code folgt der Spec, nicht umgekehrt.

---

## 0. Leitgedanke

Die Site ist gleichzeitig **Steckbrief** und **Beweisstück**: Sie wird nach derselben Methode gebaut, für die ihr Autor steht — eine maschinenlesbare Quelle, daraus deterministisch alle Ausgaben (HTML für Menschen, Markdown/JSON-LD für Agenten, Testmatrix für die QS). Alles Stochastische (Figur-Pose, Freitext-Intent) ist bewusst eingehegt: Zufall wählt nur innerhalb deklarierter Grenzen, und jede Wahl ist per Seed reproduzierbar.

Muster, das überall gilt: **Archetyp → Layout, Content-Stufe, Figur-Hülle.** Eine Zuordnung, drei Ausgaben.

---

## 1. Ziele und Nicht-Ziele

**Ziele**

1. Kein Scrollen in keinem Viewport: Der Inhalt passt immer in die verfügbare Fläche. Mehr Inhalt nur über explizite Navigation (Intent-Sichten), nie über Scroll.
2. Jede Gerätegröße wird sinnvoll bedient — Smartwatch bis Ultrawide bis extremes Hochkant (z. B. 800 × 4000 px Auto-Display).
3. Für KI-Agenten erstklassig lesbar: strukturierte Daten, Markdown-Äquivalent, erlaubte Crawler.
4. Besucher-Intent wird **explizit** abgefragt und bestimmt die Sicht.
5. Eine Low-Poly-/Mesh-Figur steht für den Autor; Pose pro Ladung einzigartig, per Seed reproduzierbar.
6. Die Spec und die Build-Kette sind auf der Site sichtbar.
7. WCAG 2.2 AA.

**Nicht-Ziele**

- Kein Blog, kein CMS, kein Backend, keine Datenbank.
- Kein implizites Tracking (Analytics, Fingerprinting, Referrer-Auswertung). Kein Cookie-Banner nötig, weil nichts gespeichert wird.
- Kein serverseitiges Rendering, kein Server überhaupt (statisch auf GitHub Pages).
- Keine Mimik, keine Gesichtsanimation.
- Kein Inhalt, der aus dem beruflichen Umfeld des Autors stammt (Clean Room, siehe 12).

---

## 2. Zielgruppen und Intents

Intent ist die Navigation. Die Startsicht zeigt T0 (siehe 3) und eine Intent-Auswahl; jede Wahl ist eine deterministische Sicht auf dieselbe Quelle.

| Intent-ID | Label (Entwurf)                            | Sicht zeigt                                                |
| --------- | ------------------------------------------ | ---------------------------------------------------------- |
| `hire`    | „Ich suche jemanden“                       | Rolle, Kernkompetenzen, CV-Kurzform, Kontakt, Repos        |
| `collab`  | „Ich will etwas zusammen bauen“            | Aktuelle Projekte, Arbeitsweise, Kontakt                   |
| `learn`   | „Ich will wissen, wie das hier gebaut ist“ | Transparenz-Sicht (siehe 8)                                |
| `curious` | „Nur gucken“                               | Steckbrief, Persönliches (soweit in `profile` freigegeben) |
| `agent`   | (nicht klickbar; für Maschinen)            | `/llms.txt`, `/index.md`, JSON-LD                          |

- Die Liste ist Daten (`content/intents.yaml`), nicht Code. Labels und Reihenfolge werden vom Autor gepflegt.
- Freitext-Feld optional: Eingabe wird **clientseitig und deterministisch** (Stichwort-Regeln in `content/intents.yaml`) auf eine Intent-ID gemappt. Kein LLM-Aufruf in V1 (kein Backend, keine Keys).
- Intent ist Teil der URL (`/?i=hire`), damit teilbar und testbar.

---

## 3. Content-Modell (Single Source)

`content/profile.yaml` ist die einzige Quelle für Inhalte. Jeder Eintrag trägt eine **Stufe**:

- **T0 — Essenz:** Name, Rollenbezeichnung, Einzeiler, Ort, zwei Primär-Links. Muss in jeden Viewport passen, auch Micro.
- **T1 — Kern:** Kompetenzfelder, drei bis fünf Projekte/Repos mit Einzeiler, Kontaktwege.
- **T2 — Vertiefung:** Projektbeschreibungen, Werdegang-Kurzform, Talks, Prinzipien.

Schema (Entwurf, Claude Code legt das JSON-Schema an und validiert im Build):

```yaml
person:
  name: "Knut Ludtmann"
  role: "Experience Architect · UI Design Engineer"
  tagline: "" # TODO Autor, max. 90 Zeichen
  location: "Nordkirchen, NRW"
  links:
    primary: [github, linkedin] # genau zwei, T0
    all:
      github: "https://github.com/kludtmann-source"
      linkedin: "https://www.linkedin.com/in/knut-ludtmann-7689331a5/"
  sameAs: [] # wird aus links.all generiert
skills: # T1
  - { id: design-systems, label: "Design Systems & Token-Architektur" }
  - { id: a11y, label: "Accessibility-first Engineering" }
  - { id: ai-ui, label: "Intent-basierte UI / KI-Integration" }
projects: # T1 (Einzeiler) + T2 (Beschreibung)
  - id: axds
    title: "AXDS"
    oneliner: "" # TODO
    repo: "" # TODO
    description: "" # TODO, T2
    tier: 1
  - id: this-site
    title: "knut-ludtmann.de"
    oneliner: "Diese Site — spec-getrieben, viewport-genau, agentenlesbar"
    repo: "" # TODO
    tier: 1
timeline: [] # T2, optional
talks: [] # T2, optional
contact:
  email: "mail@knut-ludtmann.de" # obfuskiert im HTML, Klartext in llms.txt
```

Regeln:

- Kein Inhalt außerhalb von `profile.yaml`. Auch Labels der Intents, Meta-Beschreibungen und der Alt-Text der Figur kommen aus `content/`.
- Claude Code **erfindet keine Inhalte**. Leere Felder bleiben leer und werden im Build als TODO-Liste ausgegeben (`dist/TODO-content.md`).

---

## 4. Ausgaben (aus einer Quelle generiert)

| Ausgabe              | Pfad            | Zweck                                                                                                                      |
| -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| HTML-Site            | `/`             | Menschen                                                                                                                   |
| JSON-LD `Person`     | im `<head>`     | Suchmaschinen, Entitäts-Konsistenz (`sameAs` auf alle Profile)                                                             |
| `llms.txt`           | `/llms.txt`     | Kurzfassung für Agenten (T0+T1, Links auf `index.md`)                                                                      |
| Markdown-Vollfassung | `/index.md`     | Agenten, `<link rel="alternate" type="text/markdown">` im HTML                                                             |
| Profil-JSON          | `/profile.json` | Maschinen; identisch mit der Quelle nach Validierung                                                                       |
| `robots.txt`         | `/robots.txt`   | KI-Crawler ausdrücklich erlauben (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot); `Sitemap:` |
| `sitemap.xml`        | `/sitemap.xml`  | Standard                                                                                                                   |
| Build-Info           | `/build.json`   | Commit-SHA, Zeitstempel, Spec-Version, Asset-Provenienz (für 8)                                                            |

Hinweis für den Build: GitHub Pages kann keine Content Negotiation (kein `Accept`-Header-Routing). Deshalb feste Pfade plus `rel="alternate"`. Eine CDN-Schicht mit Header-Routing ist V2, nicht V1.

---

## 5. Viewport-Archetypen

Kein Breakpoint-Denken. Der Archetyp wird aus **Aspect Ratio** `r = w/h` und **kurzer Seite** `s = min(w,h)` in CSS-Pixeln bestimmt. Schwellen sind Entwurf und werden mit der Gerätematrix (10) kalibriert.

| Archetyp   | Bedingung (Entwurf)       | Layout                                                                      | Stufen                                 | Figur                                           | Typo                    |
| ---------- | ------------------------- | --------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- | ----------------------- |
| `micro`    | `s < 260`                 | Ein Feld, Text als Overlay                                                  | T0 (Name, Rolle, 1 Link)               | Kopf-/Schulter-Crop, statisch                   | Name füllt Breite       |
| `tall`     | `r < 0.5` und nicht micro | Eine Spalte, gestapelt: Figur oben oder ganzhoch links, Typo, Links, Intent | T0+T1                                  | Stehende Pose, ganze Höhe                       | groß, Zeilen kurz       |
| `portrait` | `0.5 ≤ r < 1.2`           | Figur als gedämpfter Hintergrund, Typo darüber                              | T0+T1                                  | Pose frei, Opazität ≤ 0.35                      | stark, Overlay          |
| `split`    | `1.2 ≤ r < 2.2`           | Drei Spalten: Figur \| Link-Leiste \| Typo                                  | T0+T1 (+T2 wenn `h ≥ 700 && w ≥ 1400`) | Stehende Pose in Spalte 1, Hülle = Spalte       | Headline füllt Spalte 3 |
| `wide`     | `r ≥ 2.2`                 | Wie split, Spalten breiter                                                  | T0+T1+T2                               | Ausgebreitete Pose (Arme/Beine), Hülle = Spalte | wie split               |

Regeln:

- **Nie-Scroll-Garantie:** CSS-Layout mit `100dvh`/`100dvw`, Container Queries, `clamp()` über `cqi`/`cqb` (nicht `vw`/`vh` für Typo). Zusätzlich ein Messlauf nach Layout (`ResizeObserver`): Wenn ein Container überläuft, wird die Stufe reduziert (T2 → T1 → T0), dann die Typo-Skala um eine Stufe gesenkt, dann die Figur auf Crop reduziert. Reihenfolge deterministisch, nachvollziehbar in `data-*`-Attributen am `<html>`.
- **Zoom/Reflow (WCAG 1.4.10, 1.4.4):** Bei 200 % Zoom oder 320 px Breite gilt dieselbe Regel: Stufe degradiert, statt zu überlaufen. Inhalte der höheren Stufen bleiben über die Intent-Navigation erreichbar. Damit ist „kein Scrollen“ keine Barriere.
- **Orientierungswechsel** wird als neuer Archetyp behandelt; Seed bleibt, Pose wird in die neue Hülle übersetzt (siehe 6).
- `<html data-archetype data-tier data-seed data-webgl>` sind Pflicht — sie sind die Testschnittstelle.

---

## 6. Die Figur

### 6.1 Quelle und Provenienz

- Basis ist ein **Ganzkörperscan des Autors** (Handy-App, z. B. Polycam/Luma/Kiri), bereinigt und in Blender auf ca. 1.000–2.000 Dreiecke dezimiert. Kein Gesicht, keine Textur — nur Mesh.
- Rig: Auto-Rig Pro (Blender). Posen/Clips: Quaternius Universal Animation Library (CC0) oder Mixamo-Clips retargetet.
- **Ins Repo gehört:** das dezimierte, geriggte Modell (glTF/GLB, eigenes Werk), die gebackenen Standbilder (SVG/PNG), die Pose-Hüllen-Definitionen. **Nicht ins Repo:** Roh-Scan, Mixamo-Rohdateien (FBX), Blender-Arbeitsdateien mit Fremdassets.
- `assets/PROVENANCE.md` dokumentiert jede Quelle mit Lizenz; `/build.json` referenziert sie.
- Bis der Scan existiert: Platzhalter ist ein Mixamo-Y-Bot (dezimiert), klar als `placeholder` markiert; Rohdatei nicht committen.

### 6.2 Rendering

- WebGL (three.js): `LineSegments` über `EdgesGeometry` oder `MeshBasicMaterial({ wireframe: true })`; Farbe aus dem Token-Set; keine Beleuchtung nötig.
- Kein WebGL / `prefers-reduced-motion` / Micro-Archetyp: **statischer Fallback** aus dem gebackenen Set (siehe 6.4).
- Die Figur ist dekorativ: `aria-hidden="true"`, ein einziges, aus `content/` gepflegtes Alt-/Beschreibungs-Element für die Transparenz-Sicht.

### 6.3 Pose: Zufall in Hüllen, Seed statt Zufall

- Pro Ladung wird ein Seed erzeugt (32-bit), in der URL sichtbar (`?pose=4711`); ist `?pose` gesetzt, wird er verwendet.
- Pro Archetyp definiert `content/pose-envelopes.yaml`: Bounding Box (in Spalten-/Containeranteilen), Ankerpunkt (Füße unten / zentriert), erlaubte Clips, erlaubte Zeitfenster im Clip, Tabuzonen (z. B. „Arm darf Spalte 3 nicht überlappen“).
- Der Seed wählt: Clip → Zeitpunkt im Clip → optional zweiter Clip und Mischverhältnis → Rauschen auf Sekundärgelenke (Kopfneigung ≤ 8°, Handdrehung, Gewichtsverlagerung).
- Ergebnis wird gegen die Hülle geprüft; verletzt es die Hülle, wird deterministisch der nächste Zeitpunkt gewählt (kein Neuwürfeln).
- Bei Archetypwechsel wird derselbe Seed in die neue Hülle übersetzt (gleicher Clip, ggf. anderer Zeitpunkt).

### 6.4 Fallback und Ladeverhalten

- Build backt aus den erlaubten Clips 30–40 Standbilder pro Archetyp-Crop als SVG (Blender Freestyle/Wireframe → SVG) plus PNG-Fallback.
- Fallback wählt per Seed aus dem Set — Uniqueness degradiert von „stufenlos“ auf „viele“, nicht auf „eins“.
- **LCP:** Das Fallback-Bild wird sofort gerendert (inline SVG oder `<img fetchpriority="high">`). WebGL lädt nach und tauscht hart; ein Übergang nur ohne `prefers-reduced-motion`.
- Budget: three.js-Bundle + Modell ≤ 250 KB gzip; Fallback-SVG ≤ 30 KB.

---

## 7. Typografie und Farbe

- Ein Display-Schnitt für Namen/Headlines, ein Text-Schnitt; beide als lokale Webfonts (kein Google-Fonts-Request). Fallback-Stack definiert.
- Headline-Größe: `clamp(min, X cqi, max)` pro Archetyp; Namen dürfen nie in Wortteile brechen (`text-wrap: balance`, ggf. manuelle Umbruchstellen im Namen via `<wbr>`).
- Farben als Tokens (`tokens.css`): Hintergrund, Text, Akzent, Figur-Linie. Dark/Light per `prefers-color-scheme`.
- **Overlay-Regel (portrait, micro):** Text liegt immer auf einer Fläche mit garantiertem Kontrast (Token `--surface-overlay`), Figur unter der Fläche mit gedeckelter Opazität. Kontrast ≥ 4.5:1 Text, ≥ 3:1 UI (WCAG 1.4.3, 1.4.11) wird im Test geprüft, nicht nur behauptet.

---

## 8. Transparenz-Sicht „Wie ist das gebaut?“ (`?i=learn`)

Zeigt, aus dem Repo gerendert, nie kopiert:

1. Diese Spec (Markdown, aktueller Stand des Builds), mit Link auf die Datei im Repo.
2. Build-Info: Commit-SHA (verlinkt), Zeitstempel, Spec-Version.
3. Aktueller Zustand: Archetyp, Stufe, Seed, Clip/Zeitpunkt der Figur, WebGL ja/nein — live aus `data-*`.
4. Asset-Provenienz aus `assets/PROVENANCE.md`.
5. Link auf die Commit-Historie. **Keine** Session-Logs.

---

## 9. Tech-Stack und Hosting

- **Astro** (statisch, TypeScript), Inseln nur für Figur und Intent-Freitext. Kein UI-Framework-Runtime sonst.
- CSS: Vanilla, Container Queries, `dvh`, Cascade Layers. Kein Tailwind.
- three.js für WebGL; Modell als GLB.
- Build: GitHub Actions → GitHub Pages. Schritte: Schema-Validierung von `content/` → Generierung aller Ausgaben (4) → Tests (10) → Deploy.
- **Domain:** liegt bei IONOS (dort auch E-Mail). Nur DNS anpassen, kein Hosting-Paket: A-Records für den Apex auf die GitHub-Pages-IPs laut aktueller GitHub-Doku, `CNAME www → <user>.github.io`, `CNAME`-Datei im Repo, HTTPS „Enforce“ in den Pages-Settings. **MX-/TXT-Records für Mail unangetastet lassen.** Claude Code erzeugt eine Schritt-für-Schritt-Anleitung `docs/DNS-IONOS.md`; die DNS-Änderung macht der Autor selbst.

---

## 10. Qualitätssicherung

**Gerätematrix** (CSS-px; Werte sind Kalibrierziele, Watch-Viewport ist zu verifizieren):

| Name             | w × h       | erwarteter Archetyp |
| ---------------- | ----------- | ------------------- |
| watch            | 184 × 224   | micro               |
| phone-portrait   | 390 × 844   | tall                |
| phone-landscape  | 844 × 390   | split               |
| tablet-portrait  | 820 × 1180  | portrait            |
| tablet-landscape | 1180 × 820  | split               |
| laptop           | 1440 × 900  | split (+T2)         |
| desktop          | 1920 × 1080 | split (+T2)         |
| ultrawide        | 3440 × 1440 | wide                |
| car-tall         | 800 × 4000  | tall                |
| square           | 1000 × 1000 | portrait            |

**Tests (Playwright, im CI):**

- Für jede Matrixzeile und jeden Intent: kein Overflow (`scrollHeight ≤ clientHeight`, `scrollWidth ≤ clientWidth` auf `<html>`), erwarteter Archetyp, erwartete Stufe.
- Visual Regression mit festem Seed (`?pose=1`) pro Matrixzeile.
- Zoom 200 % auf phone-portrait und laptop: kein Overflow, Stufe degradiert.
- axe-core: keine Verstöße. Tab-Reihenfolge: Intent-Auswahl → Links → Freitext.
- Kontrastprüfung der Overlay-Fläche gegen Tokens.
- Lighthouse: Performance ≥ 90 mobil, LCP ≤ 2.5 s (Fallback-Bild ist LCP-Element).
- Validierung: JSON-LD (Schema-Validator), `llms.txt` vorhanden und ≤ 4 KB, `index.md` enthält alle T0/T1-Felder.

---

## 11. Repo-Struktur

```
/
├─ SPEC.md                    ← diese Datei
├─ content/
│  ├─ profile.yaml
│  ├─ intents.yaml
│  └─ pose-envelopes.yaml
├─ schema/                    ← JSON-Schemas für content/
├─ assets/
│  ├─ figure/figure.glb       ← eigenes Werk (dezimierter Scan)
│  ├─ figure/poses/*.svg|png  ← gebacken
│  └─ PROVENANCE.md
├─ src/                       ← Astro
├─ scripts/                   ← Generatoren (llms.txt, index.md, profile.json, build.json)
├─ tests/                     ← Playwright, axe, Validierung
├─ docs/
│  ├─ DNS-IONOS.md
│  └─ decisions/ADR-*.md      ← Abweichungen von der Spec, begründet
├─ CNAME
└─ .github/workflows/
```

---

## 12. Clean-Room-Regel

Das Repo ist öffentlich. Es enthält nichts aus dem Arbeitgeberkontext des Autors — keine Namen, keine Screenshots, keine Beispiele, auch nicht anonymisiert. Wer den Arbeitgeber nennen will, tut das in `profile.yaml` als Fakt („bei X als Y“), nicht als Inhalt. Im Zweifel weglassen.

---

## 13. Arbeitsanweisung für Claude Code

1. **Spec zuerst lesen, dann fragen.** Unklarheiten werden als nummerierte Fragen gesammelt und vor dem Bauen gestellt, nicht mit Annahmen überbrückt. Inhalte werden nie erfunden (3).
2. **Phasen, jede mit lauffähigem Ergebnis:**
   - **P0 Walking Skeleton:** Repo, Astro, `profile.yaml` mit Schema, T0-Rendering, Archetyp-Erkennung mit `data-*`, Nie-Scroll-Messlauf, Playwright-Matrix ohne Overflow. Figur = einfarbige Platzhalterform. Deploy auf `<user>.github.io`.
   - **P1 Agenten-Ausgaben:** JSON-LD, `llms.txt`, `index.md`, `profile.json`, `robots.txt`, `sitemap.xml`, `build.json`, Validierung im CI.
   - **P2 Intent-Sichten:** `intents.yaml`, URL-Parameter, Sichten für T1/T2, Freitext-Mapping, Transparenz-Sicht (8).
   - **P3 Figur:** Fallback-Pipeline mit gebackenem Set und Seed, dann WebGL-Insel, Hüllen, Übersetzung bei Archetypwechsel. Zuerst mit Y-Bot-Platzhalter, Austausch gegen Scan ohne Codeänderung.
   - **P4 Feinschliff:** Typo-Kalibrierung, Tokens, Dark/Light, Lighthouse, DNS-Doku.
3. **Commits referenzieren Spec-Abschnitte** (`feat(figure): seed-based pose selection — SPEC §6.3`). Abweichungen von der Spec sind ein ADR in `docs/decisions/` plus Spec-Änderung im selben Commit.
4. **Keine Abhängigkeiten ohne Grund.** Jede neue Dependency wird im Commit begründet. Budget in 6.4 und 10 ist bindend.
5. **Tests vor Features.** Ein Archetyp gilt als fertig, wenn seine Matrixzeilen im CI grün sind.
6. **Nichts, was 12 verletzt.**

---

## 14. Offene Entscheidungen des Autors (vor P0)

- [x] GitHub-User: `kludtmann-source`; Repo: User-Site `kludtmann-source.github.io`; öffentlich ab P0.
- [x] Rolle: „Experience Architect · UI Design Engineer"; Tagline: offen (TODO ≤ 90 Z.).
- [x] Primär-Links: `github.com/kludtmann-source` + LinkedIn (siehe §3).
- [x] E-Mail: `mail@knut-ludtmann.de`; obfuskiert im HTML, Klartext in `llms.txt`.
- [ ] Intent-Labels und ob `curious` persönliche Projekte zeigt (Skate-Themen etc.) — welche? → P2
- [x] Sprache: bilingual DE + EN; `index.md`/`llms.txt` Englisch; Default DE. Sprachumschalt-Mechanismus → P2.
- [ ] Scan: wann, mit welcher App; bis dahin Y-Bot-Platzhalter. → P3
- [ ] Watch-Viewport real vermessen (Apple Watch Safari), Schwelle `micro` danach setzen. → P4
- [x] split→+T2-Schwelle: `w ≥ 1400` statt `w ≥ 1100` (Abweichung, siehe ADR-001).
- [x] Lizenz: All rights reserved (proprietär).
- [x] Recht: eigene Routen `/impressum` + `/datenschutz` → P2.
- [x] Domain `knut-ludtmann.de` aktiv erst P4; bis dahin `kludtmann-source.github.io`.
