# RadPrompt

RadPrompt ist ein dunkles, kompaktes und installierbares Prompt-Board für radiologische Arbeitsabläufe. Die Anwendung bündelt wiederverwendbare KI-Prompts, ordnet sie in verschachtelten Ordnern, ersetzt direkt vor dem Kopieren variable Platzhalter und hält wichtige Prompts als Favoriten immer griffbereit.

## Kernidee

RadPrompt ist nicht als allgemeiner Notizspeicher gedacht, sondern als schnelle Zwischenstation zwischen radiologischem Befundarbeitsplatz und KI-System. Der Fokus liegt auf wenigen Sekunden Interaktion: passenden Prompt finden, optionale Parameter ausfüllen, kopieren, einfügen. Deshalb ist die Oberfläche kachelbasiert, visuell stark reduziert und auf dunkle, rahmenlose Webapp-Nutzung optimiert.

## Aktueller Funktionsumfang

### Prompt-Karten

- Jede Prompt-Karte zeigt einen Titel, optional automatisch erkannte Eingabefelder und direkte Aktionsflächen.
- Platzhalter im Format `***Name***` werden beim Kopieren automatisch erkannt und durch Eingaben aus der Karte ersetzt.
- Der spezielle Platzhalter `***Modalität***` wird als Auswahlfeld mit `CT`, `MRT`, `Röntgen` und `CT&MRT` dargestellt.
- Prompts können per Kopierbutton direkt in die Zwischenablage übernommen werden.
- Eine Detailansicht auf der Kartenrückseite zeigt den vollständigen Prompt-Text in monospace-artiger Darstellung.
- Karten lassen sich bearbeiten, löschen, favorisieren und per Kontextmenü bedienen.

### Ordner-Karten

- Ordner strukturieren Prompts hierarchisch und können beliebig verschachtelt werden.
- Ein Klick auf eine Ordnerkarte öffnet die nächste Ebene.
- Die Ordnerkarten besitzen eine eigenständige visuelle Sprache: schimmernde Glasflächen, dezente Farbverläufe, leuchtendes Ordnersymbol und eine Pillenanzeige für die enthaltene Elementanzahl.
- Die Karten wirken bewusst hochwertiger als reine Navigationslisten, damit häufig genutzte Kategorien schnell räumlich wiedererkannt werden.

### Navigation

- Die aktuelle Ebene wird als Titel angezeigt.
- Der Zurück-Button erscheint nur innerhalb eines Ordners.
- Die Breadcrumb-Leiste erlaubt das direkte Springen zu jeder übergeordneten Ebene.
- Ein leerer Ordner zeigt einen Empty State mit Hinweis, dass ein Klick auf freie Fläche zurücknavigiert.

### Favoriten

- Prompts und Ordner können mit dem Sternsymbol favorisiert werden.
- Die Favoritenleiste sitzt am unteren Rand und blendet sich im Alltag kompakt aus.
- Beim Hover fährt die Leiste aus und zeigt die Favoriten horizontal an.
- Ein Favoriten-Prompt wird direkt kopiert; ein Favoriten-Ordner navigiert zur gespeicherten Kategorie.

### Sortiermodus

- Der Sortierbutton aktiviert Drag-and-drop.
- Während des Sortierens erhalten Karten einen Greif-Cursor.
- Die Reihenfolge wird im aktuellen Ordner gespeichert.
- SortableJS sorgt für Ghost- und Drag-Zustände mit Animation.

### Bearbeitung und Verwaltung

- Über `Prompt hinzufügen` werden neue Prompt-Karten in der aktuellen Ebene angelegt.
- Über `Ordner hinzufügen` werden neue Ordner in der aktuellen Ebene angelegt.
- Bestehende Einträge können über die Kartenrückseite oder das Kontextmenü bearbeitet werden.
- Beim Löschen wird der Eintrag entfernt und gleichzeitig aus den Favoriten bereinigt.
- Prompt-Dialoge bieten Titel, Prompt-Text und den Schalter für Prof.-Schäfer-Beispiele.

### Prof.-Schäfer-Modus

Ein Prompt kann als Prof.-Schäfer-Prompt markiert werden. Beim Kopieren hängt RadPrompt dann zusätzlich umfangreiche CT- und MRT-Befundbeispiele an. Dadurch eignet sich die Anwendung nicht nur als Textbaustein-Sammlung, sondern auch als kuratierter Kontextlieferant für KI-gestützte Befundformulierungen.

## Webapp- und PWA-Verhalten

RadPrompt ist als installierbare Webapp vorbereitet:

- `manifest.webmanifest` definiert Name, Kurzname, Start-URL, Scope, Theme-Farbe, Hintergrundfarbe, Standalone-Anzeige, Window-Controls-Overlay-Fallback und das maskierbare SVG-App-Icon.
- `sw.js` stellt einen Service Worker bereit, der die App-Shell zwischenspeichert und bei Netzwerkproblemen aus dem Cache bedient.
- `index.html` enthält die nötigen Meta-Tags für mobile Webapp-Fähigkeit, iOS Home-Screen-Titel, Statusbar-Stil, Theme-Color und Manifest-Verknüpfung.
- Das Icon ist vollständig durch das neue dunkle Orb-, Ring- und Spark-SVG ersetzt.
- Im installierten Zustand nutzt die Anwendung die volle Fensterfläche und entfernt die klassische Widget-Rahmung.

## Neue Variante statt Fenster-in-Fenster-Pinning

Die frühere Document-Picture-in-Picture-Lösung wurde entfernt, weil sie in manchen Browsern ein leeres Ursprungsfenster neben dem angepinnten Fenster zurücklassen konnte. RadPrompt verwendet jetzt einen lokalen Fokusmodus:

- Der Pin-Button öffnet kein zweites Fenster mehr.
- Stattdessen wird die bestehende App rahmenlos auf die gesamte verfügbare Fläche ausgedehnt.
- Der Zustand wird in `localStorage` gespeichert und bleibt nach einem Reload erhalten.
- Die Kopfzeile ist für Webapp-/Desktop-Wrapper-Umgebungen als Drag-Region vorbereitet.
- Interaktive Elemente bleiben explizit von der Drag-Region ausgenommen.

Dieser Ansatz ist robuster, weil keine DOM-Elemente zwischen Fenstern verschoben werden, kein zweiter Window-Kontext entsteht und keine browserabhängige Picture-in-Picture-Unterstützung benötigt wird.

## Design-System

### Farbwelt

RadPrompt verwendet eine sehr dunkle Basis (`#050507`) mit Glasflächen, Indigo-, Pink- und Cyan-Orbs. Der Look ist bewusst radiologisch inspiriert: dunkler Leseraum, minimale Ablenkung, starke Kontraste und leuchtende Akzentpunkte.

### Glas und Tiefe

- Hauptcontainer, Karten, Favoritenleiste, Kontextmenü und Modal arbeiten mit transparenten Hintergründen.
- Backdrop-Blur und Saturation erzeugen Tiefe ohne helle Flächen.
- Inset-Highlights imitieren Kantenlicht.
- Schatten trennen aktive Ebenen voneinander.

### Kartenprinzip

Die Oberfläche basiert auf quadratischen Karten. Dadurch bleibt das Raster stabil, visuell ruhig und touchfreundlich. Vorderseiten sind für schnelle Aktionen optimiert; Rückseiten dienen Details, Bearbeitung und Löschung.

### Animationen

- Karten erscheinen gestaffelt mit GSAP.
- Flip-Animationen zeigen Details räumlich.
- Kontextmenüs skalieren weich ein.
- Hover-Zustände reagieren mit kleinen Translationen, Glow und Skalierung.
- Für Nutzer mit reduzierter Bewegung werden Animationen per `prefers-reduced-motion` nahezu deaktiviert.

### Scrollbar-Philosophie

Alle Scrollbalken sind versteckt. Scrollbereiche bleiben funktional, wirken aber wie native App-Flächen ohne Browser-Chrom. Das betrifft Hauptgrid, Kartenrückseiten, Prompt-Texte, Favoritenliste, Modale und Textareas.

## Layout

### Desktop

- Zentrierter Glascontainer mit maximaler Breite und Höhe.
- Drei Spalten im Kartenraster.
- Header links mit Navigation, rechts mit Aktionsgruppe.
- Footer als schwebende Favoritenleiste.

### Mobile und kleine Fenster

- Der Container nutzt die volle Fläche.
- Ränder werden entfernt.
- Button-Texte werden reduziert, damit die Aktionsleiste kompakt bleibt.
- Icons und Radien werden kleiner.

### Installierte Webapp

- Im Standalone- oder Window-Controls-Overlay-Modus füllt RadPrompt das ganze Fenster.
- Die App ist auf eine rahmenlose Darstellung ausgelegt.
- Die dunkle Theme-Farbe verhindert helle Browserleisten beim Start.

## Datenhaltung und Synchronisation

RadPrompt nutzt eine zweistufige Datenstrategie:

1. Primär versucht die App, Daten und Favoriten über `/api/kv` zu laden und zu speichern.
2. Wenn der KV-Endpunkt nicht verfügbar ist, nutzt sie `localStorage` als lokalen Fallback.

Dadurch funktioniert die App auch in einfachen statischen Umgebungen, bleibt aber mit einem passenden Backend synchronisierbar.

## Dateien und Architektur

- `index.html` enthält die App-Shell, Meta-Tags, externe Bibliotheken, Hauptcontainer, Modale, Kontextmenü und Toast-Container.
- `style.css` definiert das komplette Design-System, Layout, Animationen, Karten, Favoriten, Modal, Kontextmenü, Fokusmodus, PWA-Standalone-Optimierung und versteckte Scrollbars.
- `app.js` enthält Zustand, Rendering, Navigation, Drag-and-drop, Favoritenlogik, Kopierlogik, CRUD-Dialoge, Toasts, Fokusmodus und Service-Worker-Registrierung.
- `data.js` enthält initiale Daten sowie CT- und MRT-Befundbeispiele.
- `manifest.webmanifest` beschreibt RadPrompt als installierbare App.
- `sw.js` cached die App-Shell.
- `assets/app-icon.svg` ist das vollständige App-Icon.
- `functions/api/kv.js` stellt den optionalen KV-Endpunkt bereit.

## Bedienung im Alltag

1. App öffnen oder installierte Webapp starten.
2. Ordner auswählen oder über Breadcrumbs navigieren.
3. Bei Prompt-Karten optionale Platzhalter ausfüllen.
4. Prompt kopieren.
5. In Zielsystem oder KI-Chat einfügen.
6. Häufige Prompts favorisieren.
7. Bei Bedarf Sortiermodus aktivieren und Karten neu anordnen.
8. Für eine rahmenlose, ablenkungsarme Ansicht den Pin-/Fokusbutton aktivieren.

## Externe Bibliotheken

- Tailwind CDN stellt Utility-Klassen bereit.
- Google Fonts lädt Inter und JetBrains Mono.
- GSAP animiert Karten und Menüs.
- SortableJS ermöglicht Drag-and-drop-Sortierung.

## Barrierearme Details

- Wichtige Buttons besitzen `aria-label`s.
- Toasts nutzen `aria-live`, damit Statusmeldungen assistiv ausgegeben werden können.
- Fokuszustände sind für Formularfelder deutlich sichtbar.
- Reduzierte Bewegungen werden systemseitig respektiert.
- Die dunkle Oberfläche vermeidet grelle Flächen in radiologischen Umgebungen.

## Entwicklungsnotizen

Die Anwendung ist bewusst ohne Build-Schritt aufgebaut. Änderungen an HTML, CSS und JavaScript sind direkt nachvollziehbar. Für lokale Tests genügt ein statischer Server, z. B.:

```bash
python3 -m http.server 8000
```

Danach ist RadPrompt unter `http://localhost:8000` erreichbar.

## Zusammenfassung

RadPrompt ist ein spezialisiertes Prompt-Cockpit für radiologische KI-Workflows: schnell, dunkel, installierbar, rahmenlos optimiert, platzhaltersensitiv, favoritenfähig, sortierbar und durch lokale sowie optionale serverseitige Speicherung robust im Alltag. Die Anwendung verbindet eine hochwertige Kartenoberfläche mit einer sehr pragmatischen Kernfunktion: präzise Prompts in kürzester Zeit zuverlässig in die Zwischenablage bringen.
