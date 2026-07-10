# RadPrompt – Quality & Bug-Hunt Report

## Prüfstand

Finale statische Anwendung ohne Build-Schritt, getestet mit Chromium und Node.js.

## Behobene Fehler und strukturelle Verbesserungen

### UI / Responsive Design

- exakt vier Promptkarten pro Reihe auf ausreichend breiten Desktop-Viewports
- adaptive 3-/2-/1-Spalten-Layouts ohne horizontales Scrollen
- eigenständiger Widget-Modus für schmale Arbeitsfenster
- vollständige, umbrechende Prompt- und Ordnerbeschriftungen
- responsive Unterordnerkacheln, Favoritenleiste, Toolbar und Bottom Navigation
- mobile Dialoge mit gestapelten Eingabebereichen und fixierten Aktionen
- Korrektur eines CSS-Fehlers, bei dem `[hidden]` durch eine Autorregel überschrieben wurde
- Korrektur einer mobilen Grid-Verschiebung durch zu breit angewendete `.drag-handle`-Regel
- keine `immutable`-Asset-Caches bei unveränderten Dateinamen
- Service Worker auf Network-first umgestellt, um HTML-/JavaScript-Versionskonflikte zu vermeiden

### Bedienung / UX

- verschachtelte Ordner mit Breadcrumb-Navigation
- globale Suche über Titel, Inhalt und Ordnerpfade
- Befehlsmenü mit Tastatursteuerung
- native modale `<dialog>`-Elemente mit Fokuswiederherstellung
- Maus-Drag-and-drop sowie Touch-/Stift-Drag über dedizierte Handles
- alternative, barrierefreie Verschiebung über Bearbeitungsdialoge
- erhaltene Platzhalterentwürfe innerhalb der Sitzung
- unmittelbare Feldvalidierung und fokussierte Fehlerführung
- dynamische Promptvorschau inklusive Zeichenzahl
- Kontextmenüs für Prompts und Ordner
- JSON-Import/-Export, Startset-Wiederherstellung und PWA-Installation

### Daten / Synchronisierung

- Schema v2 mit Element-Zeitstempeln
- elementweise Zusammenführung konkurrierender Stände
- Tombstones für synchronisierte Löschungen
- Mehrtab-Synchronisierung über `BroadcastChannel` und Storage-Fallback
- KV-Schreibintervall von mindestens 1,35 Sekunden
- automatischer Retry bei Rate-Limit, Offlinezustand oder temporärem Fehler
- Migration aus lokalem Schlüssel `radprompt.local.v1`
- Migration/Fallback aus KV-Schlüssel `radprompt:state:v1`
- serverseitige Größen-, Struktur- und Typvalidierung
- API- und statisches Caching getrennt behandelt

### Barrierefreiheit

- semantische Navigation und Bedienelemente
- benannte Dialoge und Buttons
- Ordnerbaum mit Pfeil-, Home-, End-, Enter- und Leertastensteuerung
- sichtbare Fokusindikatoren
- Live-Regionen für Kopier-, Fehler- und Sortiermeldungen
- Unterstützung von `prefers-reduced-motion`, `prefers-contrast` und Forced Colors
- keine doppelten IDs und keine unbenannten statischen Buttons

## Automatisierte Resultate

### Viewportmatrix

Geprüft: 280, 320, 360, 390, 460, 560, 760, 844×390, 980, 1024, 1250, 1440 und 1920 px.

- horizontaler Overflow: **0 px in allen Viewports**
- abgeschnittene Promptüberschriften: **0**
- zu schmale Ordnerbeschriftungen: **0**
- Desktop ab 1250 px: **4 Karten pro Reihe**
- Browser-/JavaScript-Fehler: **0**

### Interaktionstest

- 9 Startprompts und 5 Wurzelordner korrekt gerendert
- verschachtelte Navigation: korrekt
- globale Suche: korrekt
- Promptanlage: korrekt
- Modalitätsoptionen: CT, MRT, Röntgen, CT&MRT
- Pflichtfeldvalidierung: korrekt
- Clipboard-Ausgabe nach Feldersetzung: korrekt
- Befehlsmenü und Einstellungen: korrekt
- horizontaler Overflow: 0 px

### API-Test

- Legacy-KV-Lesen: korrekt
- Migration auf Schema v2: korrekt
- serverseitige Merge-Logik: korrekt
- Revisionserhöhung: korrekt
- Tombstone-Löschung: korrekt
- leerer Namespace mit HTTP 204: korrekt

## Enthaltene Tests

```bash
node tests/smoke.mjs
node tests/api.mjs
```
