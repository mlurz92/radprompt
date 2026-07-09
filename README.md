# RadPrompt

RadPrompt ist eine build-freie Cloudflare-Pages-Anwendung für Windows-11-orientiertes Arbeiten mit radiologischen KI-Prompt-Templates.

Die Anwendung stellt ein kompaktes, dunkles Schnellzugriffsboard bereit, das neben Browser, RIS, PACS oder Befundungsumgebung positioniert werden kann. Prompt-Templates werden per Klick in die Zwischenablage kopiert, in Ordner sortiert, als Favoriten markiert und über Cloudflare Workers KV synchronisiert.

## Produktivziel

```text
https://radprompt.pages.dev
```

## Kernfunktionen

- Cloudflare Pages ohne Build-Schritt
- Pages Functions unter `functions/`
- KV-Binding `RADPROMPT_KV`
- KV-Namespace-ID `9e6bc961684e4b928ef276bd2ff1adb2`
- 4-spaltiges Prompt-Grid
- Ordnerverwaltung
- Drag-and-Drop-Sortierung
- Favoriten-Bar
- Prompt-Editor
- Platzhalter im Format `***PLATZHALTER***`
- Dropdown für `***Modalität***` mit `CT`, `MRT`, `Röntgen`, `CT&MRT`
- Prof.-Schäfer-Anhangslogik für CT und MRT
- Seed-Import aus statischen TXT-Dateien
- JSON-/TXT-Export
- KV-/Runtime-Diagnostik
- lokaler `localStorage`-Fallback
- PWA-Manifest mit SVG-Icons
- CSP-kompatibler Clipboard-Fallback

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

## Cloudflare Pages Setup

| Einstellung | Wert |
|---|---|
| Framework preset | `None` |
| Build command | leer |
| Build output directory | `.` |
| Functions directory | `functions/` |
| KV binding | `RADPROMPT_KV` |

## KV-Binding

Im Cloudflare Dashboard unter `Workers & Pages` → Pages-Projekt → `Settings` → `Bindings` einen KV Namespace mit folgendem Binding-Namen setzen:

```text
RADPROMPT_KV
```

Namespace-ID:

```text
9e6bc961684e4b928ef276bd2ff1adb2
```

## Lokaler Test

```bash
npx wrangler pages dev .
```

## Deployment

```bash
npx wrangler pages deploy . --project-name=radprompt
```

## Endpunkte

| Endpoint | Methoden | Zweck |
|---|---|---|
| `/api/health` | `GET`, `HEAD` | Runtime- und KV-Diagnostik |
| `/api/state` | `GET`, `HEAD`, `PUT`, `POST`, `PATCH`, `DELETE` | synchronisierter App-State |
| `/api/seed` | `GET`, `HEAD`, `POST` | Seed-Vorschau und Import |
| `/api/export` | `GET`, `HEAD` | Export als JSON, State, Manifest oder TXT |

## Initialisierung

Nach Deployment:

1. `https://radprompt.pages.dev` öffnen
2. Diagnostik ausführen
3. Startset laden
4. Prompts prüfen
5. Favoriten anpassen
6. Speichern prüfen

Alternativ:

```bash
curl -X POST "https://radprompt.pages.dev/api/seed" \
  -H "Content-Type: application/json" \
  --data '{"prompts":true,"schaeferCt":true,"schaeferMrt":true,"replace":true,"favoriteFirst":true}'
```

## Exportbeispiele

```bash
curl "https://radprompt.pages.dev/api/export?format=json&download=1" -o radprompt-export.json
curl "https://radprompt.pages.dev/api/export?format=prompts&download=1" -o radprompt-prompts.txt
curl "https://radprompt.pages.dev/api/export?format=fulltxt&download=1" -o radprompt-volltext.txt
curl "https://radprompt.pages.dev/api/export?format=schaefer-ct" -o "Befundbeispiele Prof. Schäfer CT.txt"
```

## Security

Statische Assets erhalten Security Header aus `_headers`. Pages Functions setzen API-Header über `functions/_middleware.js`, da `_headers` nicht auf Function-Antworten angewendet wird.

Enthalten sind unter anderem CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, no-store für API/Seed-Dateien und immutable Caching für Icons.

## Datenschutz

RadPrompt speichert Prompt-Templates, Ordner, Favoriten, UI-Einstellungen und Prof.-Schäfer-Beispieltexte. Platzhalterwerte auf Karten werden lokal im Browser gespeichert. Patientendaten sollen nicht dauerhaft in Prompt-Templates eingetragen werden.

## Qualitätsprüfung

Nach Deployment prüfen:

- Seite lädt ohne Konsolenfehler
- `/api/health` meldet KV-Binding
- `/api/seed?text=0` liest Assets
- Startset-Import funktioniert
- Prompt-Kopieren funktioniert
- Prof.-Schäfer-Anhang wird angefügt
- Drag-and-Drop funktioniert im manuellen Sortiermodus
- Export funktioniert
- PWA-Manifest und Icons laden

## Betriebsgrenzen

Workers KV ist für synchronisierte Konfigurationen geeignet, nicht für transaktionale Echtzeit-Kollaboration. Preview und Production nutzen hier bewusst denselben vorgegebenen KV-Namespace.
