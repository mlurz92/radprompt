# RadPrompt

RadPrompt ist ein kompaktes Aero-Glass-Schnellzugriffsboard für radiologische KI-Prompt-Templates. Die Anwendung ist als produktives Button-Dashboard konzipiert, das neben Browser, RIS, PACS oder Befundungssoftware platziert werden kann. Ziel ist: Promptkarte anklicken, Platzhalter ausfüllen, fertiges Prompt-Template direkt in die Zwischenablage kopieren.

## Finaler Status

| Bereich | Status |
|---|---:|
| No-Build Cloudflare Pages App | Fertig |
| Kompakte Widget-/Buttonleisten-Bedienung | Fertig |
| Responsive Desktop-/Tablet-/Mobile-Layouts | Fertig |
| Scrollbare und klickbare Hauptansicht | Fertig |
| Aero-Glass-Optik mit robustem Fallback | Fertig |
| Favoritenleiste | Fertig |
| Ordner und Filter | Fertig |
| Prompt-Editor | Fertig |
| `***Modalität***` als Dropdown | Fertig |
| `***THEMA***` als Freitextfeld | Fertig |
| Prof.-Schäfer-CT-/MRT-Zusatzkorpus | Fertig |
| Cloudflare-KV-API | Fertig |
| LocalStorage-Fallback | Fertig |
| Import/Export | Fertig |
| Vollständiges Zip-Paket | Fertig |

## Projektstruktur

```text
radprompt/
├── index.html
├── app.webmanifest
├── _headers
├── README.md
├── assets/
│   ├── css/
│   │   └── radprompt.css
│   ├── js/
│   │   ├── defaults.js
│   │   └── radprompt.js
│   ├── data/
│   │   ├── prompts.txt
│   │   ├── befundbeispiele-prof-schaefer-ct.txt
│   │   └── befundbeispiele-prof-schaefer-mrt.txt
│   └── icons/
│       └── favicon.svg
└── functions/
    └── api/
        ├── state.js
        └── health.js
```

## Deployment Cloudflare Pages

1. GitHub-Repository anlegen.
2. Alle Dateien exakt in der Projektstruktur hochladen.
3. Cloudflare Dashboard öffnen.
4. `Workers & Pages` öffnen.
5. `Create application` wählen.
6. `Pages` wählen.
7. Repository verbinden.
8. Build-Konfiguration setzen:

| Feld | Wert |
|---|---|
| Framework preset | `None` |
| Build command | leer lassen |
| Build output directory | `/` oder `.` |
| Root directory | leer lassen oder `/` |
| Production branch | `main` |

## KV Namespace Binding

Der Code erwartet exakt dieses Pages-Functions-Binding:

```text
RADPROMPT_KV
```

Im Function-Code wird das Binding so verwendet:

```js
context.env.RADPROMPT_KV
```

Vorgehen:

1. Cloudflare Dashboard öffnen.
2. `Workers & Pages` öffnen.
3. KV Namespace erstellen, zum Beispiel `RADPROMPT_KV`.
4. Pages-Projekt öffnen.
5. `Settings > Bindings > Add > KV namespace`.
6. Variable name exakt setzen: `RADPROMPT_KV`.
7. Namespace auswählen.
8. Speichern.
9. Pages-Projekt neu deployen.

## Funktionstest

### App

```text
https://radprompt.pages.dev
```

Erwartung:

- Oberfläche sichtbar.
- Promptkarten sichtbar.
- Favoritenleiste sichtbar.
- Ordnerleiste sichtbar.
- Scrollen möglich.
- Karten klickbar.
- Platzhalterfelder bedienbar.
- Kompaktmodus nutzbar.

### Health API

```text
https://radprompt.pages.dev/api/health
```

Erwartung bei korrekt gebundenem KV:

```json
{
  "ok": true,
  "kv": true
}
```

### State API

```text
https://radprompt.pages.dev/api/state
```

Bei leerem KV ist eine `404`-Antwort für den State normal. Nach dem ersten Speichern muss ein JSON-State erscheinen.

## Enthaltene Prompttemplates

- Radiologische Bildinterpretation I
- Radiologische Bildinterpretation II
- Protokoll- und Befundungshilfe
- Befundbericht Korrektur und Beurteilungsvorschlag
- Radiologische Übersicht Plus
- Radiologische Staging Hilfe
- Interpretation Revision
- Prof. Schäfer Befundstil
- Prof. Schäfer Befundstil Revision

## Bedienung

| Aktion | Bedienung |
|---|---|
| Prompt kopieren | Karte klicken oder Kopieren-Button klicken |
| Platzhalter ausfüllen | Direkt auf der Karte |
| Prompt bearbeiten | Stift-Button auf der Karte |
| Prompt favorisieren | Stern-Button auf der Karte |
| Favorit kopieren | Favoritenbutton klicken |
| Suche fokussieren | `/` |
| Command Center | `Ctrl+K` |
| Neuer Prompt | `Ctrl+N` |
| Speichern/Synchronisieren | `Ctrl+S` |
| Dialog schließen | `Escape` |
| Kompaktmodus | Fenster-Button in der Titelleiste |
| Dense-View | Grid-Umschalter neben Suche |

## Bughunt-Korrekturen in dieser Finalversion

| Problem | Korrektur |
|---|---|
| Layout zu groß | Karten, Titelbar, Ordner, Hero und Buttons deutlich kompakter skaliert |
| Scrollen blockiert | Body bleibt scrollbar, Desktop-Board hat eigene Scrollfläche, mobile Ansicht nutzt Dokumentfluss |
| Kleine Viewports problematisch | Breakpoints für 1080 px, 760 px, 480 px und Container-Queries |
| Widgetleiste fehlte | Kompaktmodus, Dense-View, Favoritenleiste und kleine Karten wurden geschärft |
| Klickflächen unsicher | Ganze Karte kopierbar, Buttons getrennt bedienbar |
| Touch-Bedienung | kleinere, stabile Drag-Schwellen und große Touchziele |
| Seeddateien fehlten im Paket | `assets/data` vollständig integriert |
| KV-Header unklar | API-Header direkt in Functions gesetzt, da `_headers` nicht für Pages Functions gilt |
| Prof.-Schäfer-Korpus | CT- und MRT-Korpus im Paket enthalten |

## Datenschutz

RadPrompt speichert Prompt-Templates, Ordner und Favoriten. Patientendaten sollen nicht dauerhaft gespeichert werden.

Nicht dauerhaft speichern:

- Patientennamen
- Geburtsdaten
- Fallnummern
- Patienten-IDs
- konkrete personenbezogene Befundtexte
- DICOM- oder Bilddaten

## Referenzquellen

- Cloudflare Pages: `https://developers.cloudflare.com/pages/`
- Cloudflare Pages Functions: `https://developers.cloudflare.com/pages/functions/`
- Cloudflare Pages Functions Bindings: `https://developers.cloudflare.com/pages/functions/bindings/`
- Cloudflare Pages Headers: `https://developers.cloudflare.com/pages/configuration/headers/`
- Cloudflare Workers KV: `https://developers.cloudflare.com/kv/`
- MDN Clipboard API: `https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API`
- MDN Viewport concepts: `https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts`
- SortableJS: `https://sortablejs.github.io/Sortable/`
