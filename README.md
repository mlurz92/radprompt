# RadPrompt

RadPrompt ist ein kompaktes, hoch responsives Prompt-Button-Dashboard für radiologische KI-Workflows. Die Anwendung ist für Windows 11 und produktives Arbeiten neben Browser, RIS, PACS oder Befundungssoftware ausgelegt.

## Ziel

Die App dient als schnell platzierbare Widget-/Buttonleiste mit den am häufigsten genutzten Prompt-Templates. Ein Klick auf eine Promptkarte kopiert den vollständig ausgefüllten Prompt in die Zwischenablage.

## Finaler Fix dieses Pakets

Diese Version ersetzt das vorher zu große und teilweise unbedienbare Layout durch eine stabilere Oberfläche:

- normales Dokument-Scrolling statt blockierendem Vollbildlayout,
- kompakte Sticky-Titelleiste,
- echte horizontale Favoritenleiste,
- kleinere und klickbare Promptkarten,
- mobile Einspalten-/Zweispaltenlayouts,
- Widgetmodus mit schmalem Dashboard,
- kein automatisch geöffnetes Systemmenü,
- Dropdownmenü statt großem blockierendem Modalmenü,
- kurze Cache-Header für alle Assets,
- Versionierungsquerys für CSS/JS,
- automatische Ergänzung fehlender Seed-Prompts auch bei vorhandenem KV-State.

## Struktur

    index.html
    app.webmanifest
    _headers
    README.md
    assets/css/radprompt.css
    assets/js/defaults.js
    assets/js/radprompt.js
    assets/data/prompts.txt
    assets/data/befundbeispiele-prof-schaefer-ct.txt
    assets/data/befundbeispiele-prof-schaefer-mrt.txt
    assets/icons/favicon.svg
    functions/api/state.js
    functions/api/health.js

## Funktionen

- Promptkarten als Button-Dashboard.
- Ganze Karte klickbar.
- Favoritenleiste für Schnellzugriff.
- Ordner und Filter.
- Suche mit `/`.
- Command Center mit `Ctrl+K`.
- Neuer Prompt mit `Ctrl+N`.
- Speichern/Synchronisieren mit `Ctrl+S`.
- Drag-and-Drop für Ordner, Karten und Favoriten über SortableJS.
- Automatische Felder für `***Platzhalter***`.
- `***Modalität***` immer als Dropdown mit `CT`, `MRT`, `Röntgen`, `CT&MRT`.
- `***THEMA***` als Texteingabe.
- Prof.-Schäfer-Prompts kopieren zusätzlich CT- und MRT-Beispielkorpus.
- Import/Export des JSON-State.
- Cloudflare Workers KV über Pages Functions.
- LocalStorage-Fallback.

## Cloudflare Pages Deployment

1. Repository mit den Dateien im Root erstellen.
2. Cloudflare Pages öffnen.
3. GitHub-Repository verbinden.
4. Framework preset: `None`.
5. Build command: leer.
6. Build output directory: `/` oder `.`.
7. Deploy ausführen.

## KV Binding

Der Variable name für das Pages-Function-Binding muss exakt sein:

    RADPROMPT_KV

Der KV-Key für den App-State lautet:

    radprompt:state:v1

Nach dem Setzen oder Ändern des Bindings muss neu deployed werden.

## API

### Health

    GET /api/health

Prüft KV-Binding, KV-Schreibprobe, KV-Leseprobe, KV-Löschprobe und vorhandenen State.

### State laden

    GET /api/state

### State speichern

    PUT /api/state
    POST /api/state

## Promptstartset

Die Datei `assets/data/prompts.txt` nutzt dieses Format:

    # Promptname:

    Prompttext mit ***Platzhaltern***

Nur Zeilen mit `# Name:` starten einen neuen Prompt. Markdown-Überschriften ohne diesen Abschluss bleiben Bestandteil des aktuellen Prompts.

## Testplan

- App öffnen.
- Prüfen, dass kein Menü automatisch geöffnet ist.
- Scrollen im Browser prüfen.
- Favoritenleiste horizontal scrollen.
- Prompt mit `***Modalität***` kopieren.
- Prompt mit `***THEMA***` kopieren.
- Dense-View aktivieren.
- Widgetmodus aktivieren.
- Prompt bearbeiten und speichern.
- Favorit setzen und per Leiste kopieren.
- `/api/health` prüfen.
- KV-Sync testen.

## Datenschutz

RadPrompt ist für Prompt-Templates vorgesehen. Keine Patientennamen, Geburtsdaten, Fallnummern, Patienten-IDs, personenbezogene klinische Angaben oder DICOM-Daten dauerhaft speichern.
