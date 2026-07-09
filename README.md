# RadPrompt Minimal Deck

RadPrompt Minimal Deck ist eine vollständig statische Cloudflare-Pages-Anwendung mit Pages Functions, Cloudflare Workers KV und einem bewusst reduzierten Prompt-Deck-Interface.

## Ziel

Die Oberfläche ist vollständig neu aufgebaut:

- keine permanente linke Ordnerleiste
- keine vertikale Ordnernavigation
- Ordner nur als horizontale Filterchips
- Prompt-Kacheln zeigen nur Titel und kleine Zusatzindikatoren
- Prompt-Volltext erscheint erst nach Auswahl in einem animierten Detailpanel
- bei schmaler Viewportbreite bleiben mindestens drei Kacheln nebeneinander sichtbar
- keine Überlagerungen langer Prompttexte in Kacheln
- minimalistische Topbar mit Suche und wenigen Aktionen

## Struktur

```text
index.html
styles.css
app.js
manifest.webmanifest
_headers
_redirects
wrangler.toml
README.md
icons/radprompt-icon.svg
icons/radprompt-maskable.svg
data/Beispielprompts.txt
data/Befundbeispiele Prof. Schäfer CT.txt
data/Befundbeispiele Prof. Schäfer MRT.txt
functions/_middleware.js
functions/api/health.js
functions/api/state.js
functions/api/seed.js
functions/api/export.js
```

## Cloudflare Pages

Build-Konfiguration:

```text
Framework preset: None
Build command: leer
Build output directory: .
Functions directory: functions/
```

KV-Binding:

```text
RADPROMPT_KV
```

KV-Namespace-ID:

```text
9e6bc961684e4b928ef276bd2ff1adb2
```

## Lokaler Test

```bash
npx wrangler pages dev . --compatibility-date=2026-07-09
```

## Deployment

```bash
npx wrangler pages deploy . --project-name=radprompt
```

## Wichtige Endpunkte

```text
/api/health
/api/state
/api/seed
/api/export
```

## UI-Prüfpunkte

- `index.html` enthält keine linke Leistenstruktur.
- `styles.css` enthält keine Klassen für eine linke Leistenstruktur.
- `app.js` rendert keine linke Ordnernavigation.
- Filter werden ausschließlich über horizontale Chips gerendert.
- Das Grid erzwingt bei kleinen Viewports drei Spalten.
- Kacheln enthalten keinen Prompt-Volltext.
- Der Volltext erscheint nur im Detailpanel.
- Das Detailpanel animiert von rechts beziehungsweise als Bottom Sheet.
- `prefers-reduced-motion` reduziert Animationen.

## Nach Deployment testen

```bash
curl -I https://radprompt.pages.dev
curl -I https://radprompt.pages.dev/app.js
curl -I https://radprompt.pages.dev/styles.css
curl -I https://radprompt.pages.dev/manifest.webmanifest
curl https://radprompt.pages.dev/api/health
curl https://radprompt.pages.dev/api/seed?text=0
curl https://radprompt.pages.dev/api/state?text=0
curl https://radprompt.pages.dev/api/export?format=manifest
```

## Import

```bash
curl -X POST "https://radprompt.pages.dev/api/seed" \
  -H "Content-Type: application/json" \
  --data '{"prompts":true,"schaeferCt":true,"schaeferMrt":true,"replace":true,"favoriteFirst":true}'
```

## Funktion

Prompt-Auswahl:

1. Kachel anklicken.
2. Detailpanel öffnet animiert.
3. Platzhalterfelder ausfüllen.
4. Prompttext prüfen.
5. Kopieren.

Prof.-Schäfer-Anhang:

- `appendSchaeferCt` hängt CT-Beispiele an.
- `appendSchaeferMrt` hängt MRT-Beispiele an.
- `kind = schaefer` aktiviert beide Anhänge.

## Datenschutz

RadPrompt speichert Prompt-Templates, Ordner, Favoriten, Dokumenttexte und Einstellungen im KV-State. Platzhalterwerte werden lokal im Browser gespeichert und nicht automatisch in KV geschrieben. Patientendaten gehören nicht dauerhaft in Prompt-Templates.
