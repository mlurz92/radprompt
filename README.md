# RadPrompt Deck

RadPrompt Deck ist eine neu aufgebaute, sidebar-freie Cloudflare-Pages-Anwendung für radiologische KI-Prompt-Templates.

Die Anwendung ersetzt die alte Seitenleisten-Architektur durch ein fokussiertes Deck-Konzept:

- keine linke Sidebar
- horizontale Filterleiste
- kompakte Prompt-Kacheln
- Kacheln zeigen nur Überschrift, Favoritenstatus und Zusatz-Badges
- Prompt-Volltext erscheint erst nach Auswahl
- Auswahl öffnet ein animiertes Detailpanel
- auch bei schmaler Viewportbreite bleiben mindestens drei Kacheln nebeneinander sichtbar
- Cloudflare Workers KV bleibt der zentrale Sync-Speicher
- Seed-Import, Export, Healthcheck und PWA-Funktionen bleiben enthalten

## Zielhost

```text
https://radprompt.pages.dev
```

## Projektstruktur

```text
radprompt/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── _headers
├── _redirects
├── wrangler.toml
├── README.md
├── icons/
│   ├── radprompt-icon.svg
│   └── radprompt-maskable.svg
├── data/
│   ├── Beispielprompts.txt
│   ├── Befundbeispiele Prof. Schäfer CT.txt
│   └── Befundbeispiele Prof. Schäfer MRT.txt
└── functions/
    ├── _middleware.js
    └── api/
        ├── health.js
        ├── state.js
        ├── seed.js
        └── export.js
```

## Designsystem

### Layout

- Topbar mit Marke, Suche, Status und Aktionen
- Hero-Bereich mit kurzer Erklärung und Metriken
- horizontale Filter-Chips für alle Ordner
- Prompt-Deck als Grid
- Detailpanel rechts auf breiten Viewports
- Detailpanel als animierter Bottom-Sheet auf schmaleren Viewports

### Kachelprinzip

Eine Kachel zeigt nur:

- Prompt-Titel
- Favoritenstatus
- Prompt-Typ
- Platzhalteranzahl
- CT-/MRT-Anhangsindikatoren
- Ordnername
- Aktualisierungsdatum

Der Prompttext wird nicht in den Kacheln angezeigt.

### Detailprinzip

Nach Auswahl einer Kachel zeigt das Detailpanel:

- Ordner
- Titel
- Platzhalterfelder
- vollständigen Prompttext
- Kopieren
- Bearbeiten
- Duplizieren
- Löschen
- Favorit-Umschaltung

### Responsivität

Das Deck ist so gestaltet, dass auch bei schmaler Viewportbreite mindestens drei Kacheln nebeneinander sichtbar bleiben. Die Kacheln reduzieren dafür Abstände, Badge-Größen, Typografie und Höhe.

## Cloudflare Pages

Empfohlene Einstellungen:

| Einstellung | Wert |
|---|---|
| Framework preset | `None` |
| Build command | leer |
| Build output directory | `.` |
| Functions directory | `functions/` |
| KV Binding | `RADPROMPT_KV` |
| KV Namespace ID | `9e6bc961684e4b928ef276bd2ff1adb2` |

## KV Binding

RadPrompt erwartet exakt:

```text
RADPROMPT_KV
```

Namespace-ID:

```text
9e6bc961684e4b928ef276bd2ff1adb2
```

State-Key:

```text
radprompt:state:v1
```

## Lokaler Test

```bash
npx wrangler pages dev .
```

Mit Datum:

```bash
npx wrangler pages dev . --compatibility-date=2026-07-09
```

## Deployment

```bash
npx wrangler pages deploy . --project-name=radprompt
```

Oder per GitHub-Integration in Cloudflare Pages.

## API

| Endpoint | Methode | Zweck |
|---|---:|---|
| `/api/health` | `GET`, `HEAD` | Runtime- und KV-Diagnostik |
| `/api/state` | `GET`, `HEAD` | State laden |
| `/api/state` | `PUT`, `POST` | State speichern |
| `/api/state` | `PATCH` | State mergen |
| `/api/state?confirm=delete` | `DELETE` | State löschen |
| `/api/seed` | `GET`, `HEAD` | Seed-Vorschau |
| `/api/seed` | `POST` | Seed importieren |
| `/api/export?format=json` | `GET`, `HEAD` | JSON-Export |
| `/api/export?format=prompts` | `GET`, `HEAD` | Prompt-TXT |
| `/api/export?format=fulltxt` | `GET`, `HEAD` | Volltext-TXT |
| `/api/export?format=schaefer-ct` | `GET`, `HEAD` | CT-Beispiele |
| `/api/export?format=schaefer-mrt` | `GET`, `HEAD` | MRT-Beispiele |

## Bedienung

### Startset laden

1. App öffnen
2. Datenbank-Icon anklicken
3. Importoptionen prüfen
4. Importieren

### Prompt kopieren

1. Kachel auswählen
2. Platzhalter im Detailpanel ausfüllen
3. Kopieren anklicken

### Prompt bearbeiten

1. Kachel auswählen
2. Bearbeiten anklicken
3. Felder anpassen
4. Speichern

### Prompt sortieren

- Sortierung auf `Manuell` stellen
- Kacheln im Grid per Drag-and-Drop bewegen

### Suchfilter

- Suche in der Topbar verwenden
- Filterchips für Ordner oder Favoriten verwenden

## Platzhalter

Platzhalterformat:

```text
***Klinische Angaben***
***Fragestellung***
***Modalität***
***THEMA***
```

Der Platzhalter `***Modalität***` wird als Dropdown dargestellt:

```text
CT
MRT
Röntgen
CT&MRT
```

## Prof.-Schäfer-Anhang

Prof.-Schäfer-Prompts hängen beim Kopieren optional an:

```text
data/Befundbeispiele Prof. Schäfer CT.txt
data/Befundbeispiele Prof. Schäfer MRT.txt
```

## Sicherheit

Enthalten:

- CSP
- HSTS
- X-Frame-Options
- frame-ancestors none
- nosniff
- Referrer-Policy
- Permissions-Policy
- Same-Origin API-CORS
- KV-Backups
- ETag-/Hash-Konfliktschutz
- kein globaler SPA-Catch-all

Nicht enthalten:

- Login
- Rollenmodell
- Ende-zu-Ende-Verschlüsselung
- Multiuser-Locking
- patientenbezogener Audit-Trail

## Datenschutz

Automatisch gespeichert werden:

- Prompttexte
- Ordner
- Favoriten
- UI-Einstellungen
- Prof.-Schäfer-Dokumenttexte
- Versionen und Hashwerte

Nicht automatisch gespeichert werden:

- Suchbegriffe
- ausgefüllte Platzhalterwerte im KV
- Clipboard-Inhalte

Platzhalterwerte werden lokal im Browser gespeichert.

## Prüfcheckliste nach Deployment

- [ ] App lädt ohne Konsolenfehler
- [ ] keine linke Sidebar sichtbar
- [ ] mindestens drei Kacheln nebeneinander bei schmalem Viewport
- [ ] Kacheln zeigen keinen Volltext
- [ ] Kachelauswahl öffnet animiertes Detailpanel
- [ ] Prompttext erscheint nur im Detailpanel
- [ ] Platzhalterfelder erscheinen im Detailpanel
- [ ] `***Modalität***` ist Dropdown
- [ ] Kopieren funktioniert
- [ ] Startset-Import funktioniert
- [ ] KV-Sync funktioniert
- [ ] Export funktioniert
- [ ] Healthcheck funktioniert
- [ ] PWA-Manifest lädt
- [ ] SVG-Icons laden
- [ ] CSP erzeugt keine Blocker
