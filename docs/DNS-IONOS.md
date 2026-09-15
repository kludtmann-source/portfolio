# Custom Domain `knut-ludtmann.de` bei IONOS einrichten (SPEC §9)

Schritt-für-Schritt-Anleitung für die Umstellung von
`kludtmann-source.github.io/portfolio/` auf die Apex-Domain `knut-ludtmann.de`.

> Die DNS-Änderung macht der Autor selbst bei IONOS. Diese Datei ist die Vorlage;
> sie ändert **nichts** automatisch. IP-Werte verifiziert gegen die GitHub-Doku
> (Stand 2026-09-14).

## Randbedingungen

- **Nur DNS anpassen, kein Hosting-Paket buchen.** Die Domain liegt bei IONOS,
  dort auch die E-Mail.
- **MX- und TXT-Records für Mail bleiben unangetastet.** Nur A-/AAAA-/CNAME-Records
  für die Website anfassen. Wer versehentlich MX löscht, verliert den Mailempfang.
- **Deploy läuft über GitHub Actions** (`.github/workflows/deploy.yml`). Deshalb ist
  laut GitHub-Doku eine `CNAME`-Datei im Repo **nicht erforderlich** und wird
  ignoriert — maßgeblich ist das Feld _Custom domain_ in den Repo-Settings. Eine
  optionale `public/CNAME` schadet nicht (SPEC §9 nennt sie), bleibt aber wirkungslos.

## Reihenfolge (wichtig gegen Domain-Takeover)

1. Custom Domain **zuerst in GitHub** eintragen, **dann** bei IONOS die DNS-Records.
2. DNS-Propagation abwarten (bis 24 h).
3. In GitHub **Enforce HTTPS** aktivieren (erst verfügbar, wenn das Zertifikat steht).
4. Erst danach den Code-Umschalt-Commit pushen (`base`/`site`, siehe unten).

## 1. Domain in GitHub eintragen

1. Repo `kludtmann-source/portfolio` → **Settings** → **Pages**.
2. Unter **Custom domain** `knut-ludtmann.de` eintragen → **Save**.
3. Empfohlen: Domain vorab unter **Settings → Pages → Verify domains** verifizieren
   (schützt vor fremder Übernahme der Subdomains).

## 2. DNS-Records bei IONOS setzen

IONOS: **Domains & SSL** → `knut-ludtmann.de` → **DNS**.

### Apex `@` (knut-ludtmann.de) — vier A-Records

| Typ | Name | Wert              |
| --- | ---- | ----------------- |
| A   | `@`  | `185.199.108.153` |
| A   | `@`  | `185.199.109.153` |
| A   | `@`  | `185.199.110.153` |
| A   | `@`  | `185.199.111.153` |

### Apex `@` — vier AAAA-Records (IPv6, empfohlen zusätzlich zu A)

| Typ  | Name | Wert                  |
| ---- | ---- | --------------------- |
| AAAA | `@`  | `2606:50c0:8000::153` |
| AAAA | `@`  | `2606:50c0:8001::153` |
| AAAA | `@`  | `2606:50c0:8002::153` |
| AAAA | `@`  | `2606:50c0:8003::153` |

### `www`-Subdomain — CNAME

| Typ   | Name  | Wert                         |
| ----- | ----- | ---------------------------- |
| CNAME | `www` | `kludtmann-source.github.io` |

> Der CNAME zeigt auf `kludtmann-source.github.io` **ohne** Repo-Namen. GitHub
> richtet die Weiterleitung zwischen `www` und Apex automatisch ein.

### Aufräumen

- Einen von IONOS automatisch gesetzten **A-Default-/Parking-Record** für `@`
  (z. B. IONOS-Weiterleitungs-IP) **entfernen**, sonst konkurriert er mit den
  GitHub-IPs.
- **Keine** Wildcard-Records (`*.knut-ludtmann.de`) — Takeover-Risiko.
- **MX/TXT (Mail, SPF, DKIM, DMARC) unverändert lassen.**

## 3. Konfiguration prüfen (nach Propagation)

```shell
dig knut-ludtmann.de +noall +answer -t A
# erwartet: 185.199.108.153 / .109 / .110 / .111

dig www.knut-ludtmann.de +nostats +nocomments +nocmd
# erwartet: CNAME → kludtmann-source.github.io

dig knut-ludtmann.de +noall +answer -t MX
# Mail-Records müssen unverändert sein
```

## 4. HTTPS erzwingen

GitHub → **Settings → Pages → Enforce HTTPS** aktivieren. Die Option erscheint
erst, wenn das Let’s-Encrypt-Zertifikat ausgestellt ist (bis zu 24 h nach DNS).

## 5. Code-Umschaltung (separater Commit, erst wenn DNS live ist)

Siehe `docs/decisions/ADR-002-project-site-base-path.md`. Der Wechsel entfernt den
`base`-Pfad, weil die Domain auf den Root zeigt:

- `astro.config.mjs`: `base: '/portfolio/'` → `base: '/'` (oder entfernen);
  `site: 'https://kludtmann-source.github.io'` → `site: 'https://knut-ludtmann.de'`.
- `playwright.config.ts`: `baseURL` + `webServer.url` `…/portfolio/` → `…/` (Tests
  laufen weiter lokal gegen `astro preview`).
- Optional `public/CNAME` mit Inhalt `knut-ludtmann.de` (bei Actions-Deploy ignoriert).
- Die Figur-URL (`figure.glb`) nutzt `import.meta.env.BASE_URL` und zieht automatisch
  nach — keine weitere Codeänderung nötig.

Nach dem Push: Deploy läuft, Site unter `https://knut-ludtmann.de` prüfen
(HTTPS grün, Figur lädt, Intent-Routen erreichbar).
