# RadPrompt

RadPrompt ist ein kompaktes, hoch responsives Aero-Glass-Schnellzugriffsboard für radiologische KI-Prompt-Templates. Die Anwendung ist für Windows 11 und produktives Arbeiten neben Browser, RIS, PACS oder Befundungssoftware ausgelegt. Ziel ist ein sehr schneller Zugriff auf häufig genutzte Prompt-Vorlagen per Button-Klick, mit automatischer Platzhaltererfassung, Favoritenleiste, Ordnerstruktur, Drag-and-Drop-Sortierung und Cloudflare-KV-Synchronisation.

Die Anwendung läuft als Cloudflare Pages Projekt unter `radprompt.pages.dev`, benötigt keinen Build-Schritt und speichert den bearbeiteten App-State über Cloudflare Pages Functions im Workers-KV-Namespace-Binding `RADPROMPT_KV`.

## Projektstatus

| Bereich | Status |
|---|---:|
| No-Build Cloudflare Pages App | Fertig |
| Aero-Glass-Dashboard-Design | Fertig |
| Responsive Layout für Desktop, Tablet, Smartphone und Kompaktfenster | Fertig |
| Button-Board mit 4er-Grid und responsivem Auto-Fallback | Fertig |
| Favoritenleiste für Schnellzugriff | Fertig |
| Prompt-Ordner | Fertig |
| Prompt-Editor | Fertig |
| Drag-and-Drop für Ordner, Promptkarten und Favoriten | Fertig |
| Automatische Platzhalterfelder | Fertig |
| `***Modalität***` als Dropdown | Fertig |
| `***THEMA***` als Freitextfeld | Fertig |
| Prof.-Schäfer-CT-/MRT-Zusatzkorpus | Fertig |
| Cloudflare-KV-State-API | Fertig |
| Cloudflare-KV-Health-API | Fertig |
| LocalStorage-Fallback | Fertig |
| Import/Export | Fertig |
| PWA-/Installationsmanifest | Fertig |
| Sicherheitsheader | Fertig |
| Bughunt UI/UX, Rendering, Sync, Clipboard, Header | Fertig |

## Funktionsumfang

### Schnellzugriff

- Große, klickbare Prompt-Karten.
- Ganze Karte als Kopierfläche nutzbar.
- Separate Aktionen für Kopieren, Favorisieren und Bearbeiten.
- Favoritenleiste für häufig genutzte Prompts.
- Command Center über `Ctrl+K`.
- Suche über Suchfeld oder `/`.
- Kompaktmodus für ein kleines Desktop-Widget neben dem Arbeitsfenster.
- Dense-View für maximale Button-Dichte.
- Board-View für komfortables Arbeiten mit sichtbaren Platzhalterfeldern.

### Dashboard-Layout

- Aero-Glass-/Milchglas-Optik.
- Dunkles Windows-11-artiges Design.
- Sehr starke visuelle Hierarchie zwischen Titelbar, Ordnern, Favoriten und Promptkarten.
- Responsive Kartenlogik:
  - sehr breite Screens: bis zu 5 Karten pro Zeile,
  - Standarddesktop: 4 Karten pro Zeile,
  - mittlere Container: 3 oder 2 Karten pro Zeile,
  - kleine Viewports: 1 Karte pro Zeile.
- Mobile Drawer-Logik:
  - auf großen Screens seitlicher Editor,
  - auf kleinen Screens Bottom-Sheet-Editor.
- Touch-optimierte Flächen und Drag-Konfiguration.
- Unterstützung für reduzierte Bewegung über Systempräferenz.

### Prompt-Management

- Prompt erstellen.
- Prompt bearbeiten.
- Prompt löschen.
- Prompt favorisieren.
- Prompt in Ordner verschieben.
- Prompt-Farbton setzen:
  - `graphite`,
  - `steel`,
  - `violet`,
  - `cyan`,
  - `emerald`,
  - `amber`.
- Prof.-Schäfer-Zusatz aktivieren.
- Import/Export des kompletten State als JSON.
- Startset erneut laden.

### Ordner

Standardordner:

| Ordner | Zweck |
|---|---|
| `Bildinterpretation` | Bildanalyse- und Befundprompts |
| `Prof. Schäfer Stil` | Prompts mit CT-/MRT-Beispielkorpus |
| `Befundung` | RIS-nahe Befundkorrektur und Befundoptimierung |
| `Protokoll & Wissen` | Protokollhilfen, Übersichten, Staging, Leitlinien, DD |
| `Organisation` | SOPs, Planung, Checklisten, organisatorische Texte |
| `Allgemein` | Sonstige Templates |

Virtuelle Ordner:

| Ordner | Zweck |
|---|---|
| `Alle Prompts` | Gesamtes Board |
| `Favoriten` | Nur favorisierte Prompts |

### Platzhalter

RadPrompt erkennt Platzhalter im Format:

    ***Platzhaltername***

Beispiele:

    ***Klinische Angaben***
    ***Fragestellung***
    ***Modalität***
    ***THEMA***
    ***Ausgangsbefund***

Jeder Platzhalter wird auf der Promptkarte automatisch als Eingabefeld dargestellt.

### Modalitätsdropdown

Der Platzhalter `***Modalität***` wird immer als Dropdown gerendert.

Optionen:

    CT
    MRT
    Röntgen
    CT&MRT

### Thema-Feld

Der Platzhalter `***THEMA***` wird als Freitextfeld gerendert und ist für Wissens-, Protokoll-, Übersichts- und Staging-Prompts optimiert.

### Prof.-Schäfer-Zusatz

Prompts mit aktivem Prof.-Schäfer-Zusatz kopieren beim Klick zusätzlich diese beiden Dateien in den Clipboard-Payload:

    assets/data/befundbeispiele-prof-schaefer-ct.txt
    assets/data/befundbeispiele-prof-schaefer-mrt.txt

Der Clipboard-Aufbau ist:

    [ausgefüllter Prompt]


    ---

    # Befundbeispiele Prof. Schäfer CT

    [CT-Beispielkorpus]


    ---

    # Befundbeispiele Prof. Schäfer MRT

    [MRT-Beispielkorpus]

Die Dokumente werden nur bei Bedarf geladen, also erst dann, wenn ein Prof.-Schäfer-Prompt kopiert wird oder die Dokumente noch nicht im lokalen Cache liegen.

## Enthaltene Prompttemplates

### Radiologische Bildinterpretation I

Primärer Prompt für detaillierte radiologische Bildanalyse mit Frame-by-Frame-Analyse, anatomischer Zuordnung, Normabweichung, Signal-/Dichtecharakteristika, Literaturabgleich und finalem RIS-Befundbericht.

### Radiologische Bildinterpretation II

Strukturierter Systemprompt für radiologische Befundung aus CT/MRT/Röntgen-Serien oder Videos mit Phasenmodell, Sicherheitsgraden, Selbst-Audit und finalem RIS-Befundbericht.

### Protokoll- und Befundungshilfe

Prompt für eine radiologische Protokoll- und Befundungshilfe zu einem Thema in einer Modalität.

Platzhalter:

    ***Modalität***
    ***THEMA***

### Befundbericht Korrektur und Beurteilungsvorschlag

Prompt zur Korrektur radiologischer Befundberichte in Stil, Wortwahl, Grammatik und Struktur, mit drei Varianten und kurzer Beurteilung.

Platzhalter:

    ***Modalität***
    ***THEMA***

### Radiologische Übersicht Plus

Prompt für umfassende radiologische Übersichten zu Definition, Klassifikation, Zeichen, Differenzialdiagnosen, Expertentipps und Befundcheckliste.

Platzhalter:

    ***THEMA***
    ***Modalität***

### Radiologische Staging Hilfe

Prompt für radiologisches und onkologisches Staging mit TNM-Kriterien, Metastasierungswegen, Expertentipps und Befundcheckliste.

Platzhalter:

    ***THEMA***
    ***Modalität***

### Interpretation Revision

Prompt zur erneuten vollständigen Prüfung einer vorherigen radiologischen Bildinterpretation.

### Prof. Schäfer Befundstil

Prompt zur stilistischen Optimierung eines radiologischen Befunds im kompakten Prof.-Schäfer-Stil.

### Prof. Schäfer Befundstil Revision

Prompt zur erneuten präzisen Anpassung an den Prof.-Schäfer-Befundstil anhand der CT-/MRT-Beispielkorpora.

## Projektstruktur

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

## Dateiübersicht

| Datei | Aufgabe |
|---|---|
| `index.html` | Statisches App-Grundgerüst, Templates, Dialoge, Ziel-IDs, CDN-Einbindungen |
| `assets/css/radprompt.css` | Vollständiges Aero-Glass-Design, responsive Layouts, Karten, Drawer, Dialoge, Animationen |
| `assets/js/defaults.js` | Defaults, State-Schema, Parser, Platzhalterlogik, Fallback-Prompts, Utilities |
| `assets/js/radprompt.js` | UI-Orchestrierung, Rendering, Clipboard, Editor, Sync, Import/Export, Drag-and-Drop |
| `assets/data/prompts.txt` | Startset aller Prompttemplates |
| `assets/data/befundbeispiele-prof-schaefer-ct.txt` | CT-Beispielkorpus für Prof.-Schäfer-Prompts |
| `assets/data/befundbeispiele-prof-schaefer-mrt.txt` | MRT-Beispielkorpus für Prof.-Schäfer-Prompts |
| `functions/api/state.js` | Pages Function für State-GET/PUT/POST in Cloudflare KV |
| `functions/api/health.js` | Pages Function für KV-Diagnostik |
| `app.webmanifest` | App-/Installationsmetadaten |
| `assets/icons/favicon.svg` | SVG-App-Icon |
| `_headers` | Headerregeln für statische Cloudflare-Pages-Antworten |
| `README.md` | Dokumentation, Deployment, Bughunt, Betrieb |

## Architektur

RadPrompt ist eine No-Build-Anwendung.

Es gibt:

- kein `package.json`,
- keine Node-Abhängigkeiten,
- keinen Bundler,
- kein Framework,
- keine lokale Build-Pipeline,
- keine Datenbank außer Cloudflare Workers KV.

Die App besteht aus:

- statischem HTML,
- statischem CSS,
- statischem JavaScript,
- statischen Seed-Textdateien,
- zwei Cloudflare Pages Functions.

## Externe Ressourcen

Die Anwendung lädt folgende externe Ressourcen:

| Ressource | Zweck |
|---|---|
| `https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js` | Drag-and-Drop-Sortierung |
| `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css` | Icons |
| `https://fonts.googleapis.com` | Google-Fonts-CSS |
| `https://fonts.gstatic.com` | Google-Fonts-Dateien |

Alle übrigen Zugriffe laufen über `self`.

## Cloudflare Pages

### No-Build-Prinzip

Für Cloudflare Pages wird kein Build-Schritt benötigt.

Empfohlene Build-Konfiguration:

| Feld | Wert |
|---|---|
| Framework preset | `None` |
| Build command | leer lassen |
| Build output directory | `/` oder `.` |
| Root directory | leer lassen oder `/` |
| Production branch | `main` |

Wenn Cloudflare Pages `/` als Build output directory nicht akzeptiert, `.` verwenden.

### Repository-Root

Diese Dateien müssen im Repository-Root liegen:

    index.html
    app.webmanifest
    _headers
    README.md
    assets/
    functions/

Das Verzeichnis `functions/` muss direkt im Root liegen, damit Cloudflare Pages Functions automatisch erkennt.

## Cloudflare Workers KV

### KV-Key

RadPrompt speichert den gesamten App-State unter:

    radprompt:state:v1

### KV-Binding

Das Binding muss exakt heißen:

    RADPROMPT_KV

### KV-Namespace erstellen

Vorgehen im Cloudflare Dashboard:

1. `Workers & Pages` öffnen.
2. `KV` öffnen.
3. `Create namespace` wählen.
4. Namespace-Name setzen:

       RADPROMPT_KV

5. Namespace speichern.

### KV-Binding im Pages-Projekt setzen

1. Cloudflare Dashboard öffnen.
2. `Workers & Pages` öffnen.
3. Pages-Projekt `radprompt` auswählen.
4. `Settings` öffnen.
5. `Bindings` öffnen.
6. `Add` wählen.
7. `KV namespace` wählen.
8. Variable name exakt setzen:

       RADPROMPT_KV

9. KV namespace `RADPROMPT_KV` auswählen.
10. Speichern.
11. Production Deployment neu ausführen.

Nach Binding-Änderungen ist ein neues Deployment erforderlich.

## State-Schema

Der KV-State ist ein JSON-Dokument.

Grundstruktur:

    {
      "version": 1,
      "schema": "radprompt-state-v1",
      "app": {
        "name": "RadPrompt",
        "description": "Radiologisches Prompt-Board für Cloudflare Pages und Workers KV",
        "createdAt": "2026-07-09T00:00:00.000Z",
        "updatedAt": "2026-07-09T00:00:00.000Z",
        "seededAt": "2026-07-09T00:00:00.000Z"
      },
      "ui": {
        "activeFolderId": "all",
        "activeFilter": "all",
        "query": "",
        "view": "board",
        "compact": false,
        "drawerOpen": false,
        "selectedPromptId": ""
      },
      "folders": [],
      "prompts": [],
      "favoriteOrder": [],
      "documents": {
        "profCtLabel": "# Befundbeispiele Prof. Schäfer CT",
        "profMrtLabel": "# Befundbeispiele Prof. Schäfer MRT",
        "profCtUpdatedAt": "",
        "profMrtUpdatedAt": ""
      }
    }

## LocalStorage-Fallback

Wenn Cloudflare KV noch nicht gebunden ist oder temporär nicht erreichbar ist, arbeitet RadPrompt lokal weiter.

Lokale Keys:

    radprompt.state.v1
    radprompt.local-backup.v1
    radprompt.ui.v1
    radprompt.documents.v1

Startlogik:

1. App ruft `/api/state` auf.
2. Wenn KV-State vorhanden ist, wird dieser geladen.
3. Wenn KV leer oder nicht erreichbar ist, wird lokaler State geladen.
4. Wenn kein lokaler State vorhanden ist, wird `assets/data/prompts.txt` geladen.
5. Prof.-Schäfer-Textdateien werden geladen oder aus lokalem Dokumentcache verwendet.
6. Bei verfügbarer KV-Verbindung wird der State synchronisiert.

## API

### `GET /api/health`

Prüft:

- KV-Binding vorhanden,
- KV-Schreibprobe,
- KV-Leseprobe,
- KV-Löschprobe,
- vorhandener State lesbar,
- vorhandener State JSON-valide,
- vorhandenes State-Schema kompatibel.

Beispielantwort bei korrektem KV-Binding und leerem State:

    {
      "ok": true,
      "kv": true,
      "message": "RADPROMPT_KV aktiv. Noch kein gespeicherter RadPrompt-State vorhanden."
    }

Beispielantwort bei korrektem KV-Binding und vorhandenem State:

    {
      "ok": true,
      "kv": true,
      "message": "RADPROMPT_KV aktiv. State vorhanden: 9 Prompts, 6 Ordner, 8 Favoriten."
    }

Beispielantwort bei fehlendem KV-Binding:

    {
      "ok": false,
      "kv": false,
      "message": "RADPROMPT_KV ist nicht gebunden. Im Cloudflare Pages Dashboard muss ein KV namespace binding mit dem Namen RADPROMPT_KV gesetzt werden."
    }

### `GET /api/state`

Lädt den gespeicherten KV-State.

Mögliche Antwort bei leerem KV:

    {
      "ok": false,
      "error": "State not found"
    }

Mögliche Antwort bei vorhandenem KV-State:

    {
      "ok": true,
      "key": "radprompt:state:v1",
      "state": {
        "version": 1,
        "schema": "radprompt-state-v1",
        "folders": [],
        "prompts": []
      }
    }

### `PUT /api/state`

Speichert den vollständigen State in Cloudflare KV.

Header:

    Content-Type: application/json
    Accept: application/json

Antwort:

    {
      "ok": true,
      "key": "radprompt:state:v1",
      "metrics": {
        "folders": 6,
        "prompts": 9,
        "favorites": 8,
        "bytes": 10000
      }
    }

### `POST /api/state`

Alias für `PUT /api/state`.

## Header-Strategie

### `_headers`

Die Datei `_headers` setzt Header für statische Cloudflare-Pages-Responses.

Sie regelt:

- Content-Security-Policy,
- Referrer-Policy,
- X-Content-Type-Options,
- Permissions-Policy,
- Cross-Origin-Opener-Policy,
- Cache-Control,
- API-CORS-Header für passende Pfade.

### Pages Functions

Cloudflare Pages wendet `_headers` nicht auf Responses aus Pages Functions an. Deshalb enthalten `functions/api/state.js` und `functions/api/health.js` eigene Headerdefinitionen für:

- CORS,
- Cache-Control,
- Content-Type,
- X-Content-Type-Options,
- Referrer-Policy.

## Content Security Policy

Die CSP erlaubt gezielt:

| Direktive | Zweck |
|---|---|
| `default-src 'self'` | Standardmäßig nur eigene Origin |
| `script-src 'self' https://cdn.jsdelivr.net` | Lokale JS-Dateien und SortableJS |
| `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com` | Lokales CSS, Google Fonts CSS, Font Awesome |
| `font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:` | Google Fonts und Font Awesome Fonts |
| `img-src 'self' data: blob:` | SVG/Icon/Data/Blob |
| `connect-src 'self'` | API und lokale Seed-Dateien |
| `manifest-src 'self'` | Webmanifest |
| `frame-ancestors 'none'` | Kein Einbetten in Frames |
| `object-src 'none'` | Keine Plugins/Object-Embeds |
| `navigate-to 'self' blob:` | App-interne Navigation und Export-Blob-Download |

## Cache-Strategie

| Pfad | Cache |
|---|---|
| `/` | `no-store` |
| `/index.html` | `no-store` |
| `/api/*` | `no-store` |
| `/assets/data/*` | kurz, revalidierend |
| `/assets/js/*` | moderat, revalidierend |
| `/assets/css/*` | moderat, revalidierend |
| `/assets/icons/*` | länger, revalidierend |
| `/app.webmanifest` | kurz, revalidierend |

Grund:

- App-Shell und API sollen immer aktuell sein.
- Prompt-Seeddateien sollen nach Änderungen schnell aktualisiert werden.
- CSS/JS können moderat gecacht werden, werden aber revalidiert.
- Icon kann länger gecacht werden.

## Installation als App

RadPrompt kann im Browser als App installiert werden, sofern der Browser dies unterstützt.

Typischer Weg in Microsoft Edge oder Chrome:

1. `https://radprompt.pages.dev` öffnen.
2. Browser-Menü öffnen.
3. `Apps` oder `Diese Website als App installieren` wählen.
4. App installieren.
5. Fenster neben Browser, RIS oder PACS positionieren.
6. Optional Kompaktmodus in RadPrompt aktivieren.

## Bedienung

### Hauptbedienung

| Aktion | Bedienung |
|---|---|
| Prompt kopieren | Karte klicken |
| Prompt mit Button kopieren | `Kopieren` auf Karte klicken |
| Prompt bearbeiten | Stift-/Erweitern-Button auf Karte |
| Prompt favorisieren | Stern-Button auf Karte |
| Favorit kopieren | Favoritenbutton klicken |
| Favorit bearbeiten | Favoritenbutton mit `Alt`, `Ctrl` oder `Cmd` klicken |
| Suche fokussieren | `/` |
| Command Center öffnen | `Ctrl+K` |
| Neuen Prompt anlegen | `Ctrl+N` |
| Speichern/Synchronisieren | `Ctrl+S` |
| Dialog/Drawer schließen | `Escape` |
| Kompaktmodus | Fenster-Button in der Titelleiste |
| Dense-/Board-Ansicht | Umschalter neben Suche |

### Tastatur im Promptfeld

| Taste | Funktion |
|---|---|
| `Enter` | Prompt mit aktuellem Feldinhalt kopieren |
| `Escape` | Feld verlassen |
| `Tab` | nächstes Feld |

### Command Center

Das Command Center enthält:

- App-Aktionen,
- alle Prompts als kopierbare Einträge,
- Suche über Titel, Beschreibung und Tags,
- Enter-Ausführung,
- Pfeiltasten-Navigation.

## Drag-and-Drop

RadPrompt verwendet Drag-and-Drop für:

- Ordnerliste,
- Promptkarten,
- Favoritenleiste.

Auf Touch-Geräten werden SortableJS-Fallback-Optionen aktiviert.

Wenn SortableJS durch Netzwerk- oder CSP-Regeln blockiert wird:

- App bleibt benutzbar,
- Prompts können weiterhin kopiert und bearbeitet werden,
- nur Drag-and-Drop fällt aus.

## Import und Export

### Export

Der Export erzeugt eine JSON-Datei und versucht zusätzlich, den JSON-State in die Zwischenablage zu kopieren.

Export enthält:

- Ordner,
- Prompts,
- Favoriten,
- Favoritenreihenfolge,
- UI-Basiszustand,
- Prompt-Metadaten,
- Placeholder-Defaults.

Export enthält nicht:

- temporäre nicht gespeicherte Feldinhalte,
- Cloudflare-KV-Metadaten,
- Browserinterne Cache-Flags.

### Import

Der Import akzeptiert kompatibles JSON.

Import-Normalisierung:

- fehlende Standardordner werden ergänzt,
- ungültige Ordnerreferenzen werden korrigiert,
- fehlende Order-Werte werden gesetzt,
- doppelte Prompt-IDs werden bereinigt,
- Tags werden ergänzt,
- Prof.-Schäfer-Erkennung wird erneut angewandt,
- Favoritenreihenfolge wird auf gültige Prompt-IDs begrenzt.

## Startset aktualisieren

Datei:

    assets/data/prompts.txt

Format:

    # Promptname:

    Prompttext

Wichtig:

- Jede Prompt-Überschrift beginnt exakt mit `# `.
- Jede Prompt-Überschrift endet mit `:`.
- Der Text bis zur nächsten solchen Überschrift gehört zum Prompt.
- Markdown-Überschriften innerhalb eines Prompts ohne abschließenden Doppelpunkt bleiben Bestandteil des Prompttexts.
- Platzhalter werden mit `***Name***` geschrieben.

## Neue Prompts ergänzen

Beispiel:

    # Neuer radiologischer Prompt:

    Modalität: ***Modalität***
    Thema: ***THEMA***

    Erstelle eine strukturierte radiologische Übersicht zu ***THEMA*** in der ***Modalität***.

Nach Ergänzung:

1. Datei speichern.
2. Git committen.
3. Zu GitHub pushen.
4. Cloudflare Pages Deployment abwarten.
5. In RadPrompt App-Menü `Startset laden` ausführen.

Achtung: `Startset laden` ersetzt den aktuellen State durch das Startset. Vorher bei Bedarf Export ausführen.

## Deployment über GitHub und Cloudflare Pages

### 1. GitHub Repository erstellen

1. GitHub öffnen.
2. Neues Repository erstellen, zum Beispiel `radprompt`.
3. Repository leer oder mit README anlegen.
4. Projektdateien in exakt dieser Struktur hochladen.
5. Commit auf `main`.

### 2. Cloudflare Pages Projekt erstellen

1. Cloudflare Dashboard öffnen.
2. `Workers & Pages` öffnen.
3. `Create application` wählen.
4. `Pages` wählen.
5. `Import an existing Git repository` wählen.
6. GitHub verbinden.
7. Repository `radprompt` auswählen.
8. Setup beginnen.

### 3. Build-Konfiguration

| Feld | Wert |
|---|---|
| Project name | `radprompt` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | leer |
| Build output directory | `/` oder `.` |
| Root directory | leer oder `/` |

### 4. Erstes Deployment

1. `Save and Deploy` klicken.
2. Deployment abwarten.
3. `https://radprompt.pages.dev` öffnen.
4. App sollte bereits lokal starten.
5. KV-Sync wird nach Binding-Konfiguration vollständig aktiv.

### 5. KV-Binding setzen

1. KV namespace `RADPROMPT_KV` erstellen.
2. Im Pages-Projekt unter `Settings > Bindings` hinzufügen.
3. Binding-Name exakt `RADPROMPT_KV`.
4. Namespace auswählen.
5. Speichern.
6. Production Deployment neu ausführen.

### 6. Health prüfen

Aufrufen:

    https://radprompt.pages.dev/api/health

Erwartung:

    {
      "ok": true,
      "kv": true
    }

### 7. App prüfen

Aufrufen:

    https://radprompt.pages.dev

Prüfen:

- Oberfläche sichtbar,
- Promptkarten sichtbar,
- Favoriten sichtbar,
- Kopieren funktioniert,
- KV-Sync zeigt `KV aktuell`.

## Produktiv-Testplan

### 1. Sichtprüfung Desktop

- App auf 1920×1080 öffnen.
- Board-View prüfen.
- 4er-Kartenraster prüfen.
- Favoritenleiste prüfen.
- Aero-Glass-Flächen prüfen.
- Hover-Zustände prüfen.
- Drawer rechts prüfen.

### 2. Sichtprüfung Kompaktfenster

- Browserfenster auf circa 420–520 px Breite setzen.
- Kompaktmodus aktivieren.
- Prüfen:
  - Prompts bleiben klickbar,
  - Karten sind nicht abgeschnitten,
  - Suche bleibt erreichbar,
  - Favoritenleiste bleibt horizontal nutzbar.

### 3. Sichtprüfung Tablet

- Viewport circa 768–1024 px.
- Ordnerleiste muss horizontal nutzbar sein.
- Kartenraster muss 2–3 Spalten nutzen.
- Drawer darf Bedienung nicht blockieren.

### 4. Sichtprüfung Smartphone

- Viewport circa 360–430 px.
- Einspaltiges Kartenlayout.
- Titelbar darf nicht überlaufen.
- Editor als Bottom-Sheet.
- Kopierbuttons volle Breite.
- Platzhalterfelder bedienbar.

### 5. Platzhalter-Test

Für Prompt `Protokoll- und Befundungshilfe`:

1. `Modalität` auswählen.
2. `THEMA` eingeben.
3. Karte klicken.
4. Text einfügen.
5. Prüfen:
   - `***Modalität***` ersetzt,
   - `***THEMA***` ersetzt,
   - keine leeren Pflichtfelder.

### 6. Modalitätsvalidierung

1. Prompt mit `***Modalität***` öffnen.
2. Keine Modalität auswählen.
3. Kopieren klicken.
4. Erwartung:
   - Warnung,
   - Fokus auf Modalitätsfeld.
5. Modalität auswählen.
6. Erneut kopieren.
7. Erwartung:
   - Prompt wird kopiert.

### 7. Prof.-Schäfer-Test

1. Prof.-Schäfer-Prompt öffnen.
2. Pflichtfelder ausfüllen.
3. Kopieren.
4. In Texteditor einfügen.
5. Prüfen:
   - Prompttext vorhanden,
   - CT-Beispielkorpus vorhanden,
   - MRT-Beispielkorpus vorhanden,
   - Trennlinien vorhanden.

### 8. Favoriten-Test

1. Prompt favorisieren.
2. Favorit erscheint in Favoritenleiste.
3. Favorit klicken.
4. Prompt wird kopiert.
5. Favorit per Drag-and-Drop verschieben.
6. Seite neu laden.
7. Reihenfolge bleibt erhalten.

### 9. Ordner-Test

1. Ordner anlegen.
2. Prompt in Ordner verschieben.
3. Ordner auswählen.
4. Prompt erscheint.
5. Ordner sortieren.
6. Seite neu laden.
7. Reihenfolge bleibt erhalten.

### 10. Import/Export-Test

1. Export ausführen.
2. JSON-Datei sichern.
3. Lokalen Cache löschen.
4. Import ausführen.
5. Prüfen:
   - Ordner vorhanden,
   - Prompts vorhanden,
   - Favoriten vorhanden,
   - Sortierung erhalten.

### 11. KV-Test

1. Prompt ändern.
2. Speichern.
3. Synchronisieren.
4. Neues privates Browserfenster öffnen.
5. App laden.
6. Änderung muss aus KV vorhanden sein.

## Bughunt-Ergebnisse

### Layout und Responsivität

| Befund | Maßnahme |
|---|---|
| Klassische Admin-Oberfläche zu dominant | Board- und Kartencharakter verstärkt |
| Kartenraster musste containerabhängig reagieren | Container-Queries und responsive Grid-Logik ergänzt |
| Mobile Drawer seitlich unpraktisch | Bottom-Sheet-Verhalten für kleine Screens ergänzt |
| Kompaktfenster brauchte höhere Button-Dichte | Kompaktmodus und Dense-View geschärft |
| Favoritenleiste musste schneller erreichbar sein | horizontale Favoritenrail prominent platziert |
| Touch-Flächen teils zu klein | größere Button- und Kartenflächen gesetzt |

### JavaScript Rendering

| Befund | Maßnahme |
|---|---|
| Dynamische IDs können CSS-Selektoren beschädigen | `CSS.escape` mit Fallback ergänzt |
| Ganze Karte sollte kopierbar sein | Kartenklick kopiert, interaktive Elemente bleiben getrennt |
| Renderkey konnte neue Placeholder-/Tone-Zustände übersehen | Renderkey erweitert |
| Sortable-Instanzen konnten mehrfach erzeugt werden | zerstörbare Map-basierte Sortable-Verwaltung |
| Touch-Drag konnte zu empfindlich sein | `fallbackTolerance` und `touchStartThreshold` gesetzt |
| Editor-Textarea konnte unhandlich sein | Auto-Grow ergänzt |
| Suchzugriff sollte schneller sein | `/` fokussiert Suche |
| Screenreader-Feedback fehlte | Live-Region ergänzt |

### Placeholder und Clipboard

| Befund | Maßnahme |
|---|---|
| `***Modalität***` braucht feste Werte | Dropdown und Validierung |
| `***THEMA***` braucht Freitextoptimierung | Topic-Erkennung ergänzt |
| Leere Pflichtfelder konnten unbemerkt bleiben | Validierung vor Kopie |
| Prof.-Schäfer-Dokumente sollten nicht unnötig geladen werden | Lazy Loading bei Prof.-Schäfer-Kopie |
| Clipboard API kann eingeschränkt sein | `execCommand`-Fallback bleibt aktiv |

### Datenmodell

| Befund | Maßnahme |
|---|---|
| Neue Prompts müssen auch ohne Seeddatei vorhanden sein | Fallback-Prompts erweitert |
| Neue Promptkategorien brauchen bessere Ordnerlogik | Folder-Inferenz erweitert |
| Häufige Prompts sollen initial Favoriten sein | Quick-Access-Muster ergänzt |
| Tags sollten neue Kategorien abbilden | Protokoll, Staging, Übersicht, Korrektur ergänzt |
| Gelöschte Prompts/Ordner können UI-State beschädigen | UI-State-Bereinigung ergänzt |

### Header und CSP

| Befund | Maßnahme |
|---|---|
| `_headers` gilt nicht für Pages Functions | API-Header bleiben direkt in Functions |
| Blob-Export kann durch CSP blockiert werden | `navigate-to 'self' blob:` ergänzt |
| Dynamische Inline-Styles der App brauchen CSP-Erlaubnis | `style-src-attr 'unsafe-inline'` ergänzt |
| Seed-Dateien sollten schnell aktualisieren | `assets/data` kurz gecacht |
| API-State darf nicht gecacht werden | `/api/*` no-store |
| Externe Ressourcen müssen exakt erlaubt sein | CSP auf konkrete CDN-Domains begrenzt |

## Fehlerbehebung

### App startet nicht

Prüfen:

    /assets/js/defaults.js
    /assets/js/radprompt.js
    /assets/css/radprompt.css

Browser-Konsole öffnen und 404-Fehler prüfen.

### Styling fehlt

Prüfen:

    https://radprompt.pages.dev/assets/css/radprompt.css

Wenn 404:

- Pfad im Repository prüfen.
- Deployment prüfen.
- Datei muss unter `assets/css/radprompt.css` liegen.

### Icons fehlen

Prüfen:

    https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css

Wenn Kliniknetz CDN blockiert:

- App bleibt funktional.
- Icons fehlen.
- Optional Font Awesome lokal einbinden und CSP anpassen.

### Drag-and-Drop fehlt

Prüfen:

    https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js

Wenn CDN blockiert:

- App bleibt funktional.
- Drag-and-Drop fällt aus.
- Optional SortableJS lokal speichern und `index.html` sowie CSP anpassen.

### KV-Sync bleibt lokal

Prüfen:

    https://radprompt.pages.dev/api/health

Wenn `kv: false`:

- Binding fehlt.
- Binding heißt nicht exakt `RADPROMPT_KV`.
- Pages-Projekt wurde nach Binding-Änderung nicht neu deployed.

### `/api/state` zeigt 404

Das ist vor dem ersten Speichern normal.

Lösung:

1. App öffnen.
2. Startset laden lassen.
3. `Jetzt synchronisieren` klicken.
4. `/api/state` erneut prüfen.

### Prompt-Seed wird nicht geladen

Prüfen:

    https://radprompt.pages.dev/assets/data/prompts.txt

Wenn 404:

- Datei fehlt.
- Pfad stimmt nicht.
- Deployment ist veraltet.

### Prof.-Schäfer-Korpus fehlt

Prüfen:

    https://radprompt.pages.dev/assets/data/befundbeispiele-prof-schaefer-ct.txt
    https://radprompt.pages.dev/assets/data/befundbeispiele-prof-schaefer-mrt.txt

Wenn eine Datei nicht erreichbar ist:

- Pfad prüfen.
- Dateiname exakt prüfen.
- Deployment neu ausführen.

### Clipboard funktioniert nicht

Prüfen:

- App läuft über HTTPS.
- Browser erlaubt Clipboard-Zugriff.
- Pflichtfelder sind ausgefüllt.
- Keine CSP-Fehler in der Konsole.
- Kein Klinikbrowser blockiert Clipboard.

## Datenschutz und Sicherheit

RadPrompt ist für Prompt-Templates gedacht, nicht für dauerhafte Patientendatenspeicherung.

Nicht dauerhaft speichern:

- Patientennamen,
- Geburtsdaten,
- Fallnummern,
- Patienten-IDs,
- konkrete personenbezogene Befunde,
- personenbezogene klinische Angaben,
- DICOM-Daten,
- Bilddaten.

Temporär eingegebene Platzhalterwerte werden beim Kopieren verwendet. Sie werden nicht automatisch in KV gespeichert, solange sie nicht als Prompttext oder Placeholder-Default im Editor gespeichert werden.

## Sicherheitsmodell

RadPrompt ist bewusst einfach gehalten:

- keine Benutzerverwaltung,
- keine Login-Funktion,
- keine Rollen,
- kein Mandantensystem,
- keine Ende-zu-Ende-Verschlüsselung im App-Code,
- ein KV-State pro Pages-Projekt.

Wer die Pages-Domain öffnen kann, kann die App bedienen.

Für persönliche oder kleine interne Nutzung ist das angemessen, wenn keine sensiblen Daten dauerhaft gespeichert werden.

Für breiteren Klinikbetrieb wären zusätzliche Maßnahmen sinnvoll:

- Cloudflare Access,
- Nutzergruppen,
- Authentifizierung,
- getrennte KV-Namespaces,
- Audit-Logging,
- Backup-Strategie,
- Datenschutzfreigabe.

## Wartung

### Code aktualisieren

1. Datei ändern.
2. Commit auf `main`.
3. Push zu GitHub.
4. Cloudflare Pages Deployment abwarten.
5. `/api/health` prüfen.
6. App hart neu laden.

### Prompts in der App ändern

1. Prompt öffnen.
2. Bearbeiten.
3. Speichern.
4. Synchronisieren.
5. Änderung liegt in KV.

### Startset ändern

1. `assets/data/prompts.txt` ändern.
2. Commit und Push.
3. Cloudflare Deployment abwarten.
4. In App `Startset laden` ausführen.

### Prof.-Schäfer-Dateien ändern

1. CT-/MRT-Textdatei ersetzen.
2. Dateinamen unverändert lassen.
3. Commit und Push.
4. Cloudflare Deployment abwarten.
5. Browser neu laden.
6. Prof.-Schäfer-Prompt testen.

## Qualitätskontrolle vor produktiver Nutzung

- [ ] Repository-Struktur korrekt.
- [ ] `index.html` im Root.
- [ ] `_headers` im Root.
- [ ] `app.webmanifest` im Root.
- [ ] `assets/css/radprompt.css` erreichbar.
- [ ] `assets/js/defaults.js` erreichbar.
- [ ] `assets/js/radprompt.js` erreichbar.
- [ ] `assets/data/prompts.txt` erreichbar.
- [ ] CT-Schäfer-Datei erreichbar.
- [ ] MRT-Schäfer-Datei erreichbar.
- [ ] `assets/icons/favicon.svg` erreichbar.
- [ ] `/api/health` erreichbar.
- [ ] `/api/state` erreichbar.
- [ ] KV-Binding exakt `RADPROMPT_KV`.
- [ ] Nach Binding-Konfiguration neu deployed.
- [ ] App lädt ohne Konsolenfehler.
- [ ] Promptkarten sichtbar.
- [ ] Favoriten sichtbar.
- [ ] Suche funktioniert.
- [ ] Kompaktmodus funktioniert.
- [ ] Dense-View funktioniert.
- [ ] Promptkopie funktioniert.
- [ ] `***Modalität***` rendert als Dropdown.
- [ ] `***THEMA***` rendert als Eingabefeld.
- [ ] Leere Pflichtfelder werden erkannt.
- [ ] Prof.-Schäfer-Prompt kopiert Zusatzkorpus.
- [ ] Drag-and-Drop funktioniert.
- [ ] Sortierung bleibt nach Reload erhalten.
- [ ] Import funktioniert.
- [ ] Export funktioniert.
- [ ] KV-Sync funktioniert.
- [ ] LocalStorage-Fallback funktioniert.
- [ ] Mobile Layouts geprüft.
- [ ] Kompaktfenster geprüft.
- [ ] Keine Patientendaten dauerhaft gespeichert.

## Exakte Minimal-Deployment-Anleitung

1. GitHub Repository `radprompt` erstellen.
2. Dateien in dieser Struktur hochladen:

       index.html
       app.webmanifest
       _headers
       README.md
       assets/
       functions/

3. Cloudflare Dashboard öffnen.
4. `Workers & Pages` öffnen.
5. `Create application` wählen.
6. `Pages` wählen.
7. GitHub Repository verbinden.
8. Project name:

       radprompt

9. Framework preset:

       None

10. Build command leer lassen.
11. Build output directory:

       /

    oder:

       .

12. Deployment ausführen.
13. KV namespace erstellen:

       RADPROMPT_KV

14. Im Pages-Projekt Binding hinzufügen:

       RADPROMPT_KV

15. Neu deployen.
16. Health prüfen:

       https://radprompt.pages.dev/api/health

17. App öffnen:

       https://radprompt.pages.dev

18. Prompt kopieren.
19. Synchronisation prüfen.
20. Fertig.

## Referenzquellen

Offizielle Dokumentation:

- Cloudflare Pages Static HTML:
  `https://developers.cloudflare.com/pages/framework-guides/deploy-anything/`

- Cloudflare Pages Functions Bindings:
  `https://developers.cloudflare.com/pages/functions/bindings/`

- Cloudflare Pages Headers:
  `https://developers.cloudflare.com/pages/configuration/headers/`

- Cloudflare Workers KV:
  `https://developers.cloudflare.com/kv/`

- Cloudflare KV namespaces:
  `https://developers.cloudflare.com/kv/concepts/kv-namespaces/`

- MDN Clipboard API:
  `https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API`

- MDN CSS.escape:
  `https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape_static`

- MDN localStorage:
  `https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage`

- SortableJS:
  `https://sortablejs.github.io/Sortable/`

## Ergebnis

RadPrompt ist eine vollständig statische, moderne und hoch responsive Cloudflare-Pages-App mit Pages-Functions-KV-Sync. Die Anwendung ist auf schnellen produktiven Zugriff optimiert: öffnen, Thema und Modalität eintragen, Promptkarte klicken, fertigen Prompt einfügen. Durch Favoriten, Ordner, Dense-View, Kompaktmodus und Command Center eignet sie sich als dauerhaft neben dem Arbeitsfenster positioniertes Prompt-Dashboard.