# RadPrompt

RadPrompt ist ein installierbares, dunkles Schnellzugriffsboard für radiologische KI-Prompts. Die Anwendung ist darauf ausgelegt, wiederkehrende Prompt-Bausteine im Befundalltag extrem schnell zu finden, optional mit Fallangaben zu füllen, in die Zwischenablage zu kopieren und anschließend in ein KI-System oder ein anderes Zielsystem einzufügen. Im Mittelpunkt steht nicht ein allgemeines Notizbuch, sondern ein fokussiertes Prompt-Cockpit für radiologische Arbeitsplätze mit wenig Platz, häufig parallelen Fenstern und hohem Bedarf an schneller, verlässlicher Interaktion.

Die Oberfläche kombiniert ein kompaktes Kartenraster, eine flache Ordnernavigation, Favoriten, Bearbeitungsdialoge, lokale und optionale KV-basierte Datenhaltung, PWA-Fähigkeit, Offline-Shell-Caching und eine echte Fenster-Fixieren-Option über Document Picture-in-Picture, sofern der Browser diese API unterstützt.

---

## 1. Kernidee

RadPrompt beantwortet eine sehr konkrete Frage: Wie kommt ein Radiologe oder eine radiologisch arbeitende Person in wenigen Sekunden vom aktuellen Fallkontext zu einem passenden, hochwertigen KI-Prompt?

Dazu organisiert die App Prompts als visuelle Karten. Jede Karte ist entweder:

- ein **Prompt**, der direkt kopiert werden kann, oder
- ein **Ordner**, der eine weitere Ebene mit Prompts oder Unterordnern öffnet.

Alle Inhalte liegen in einer Baumstruktur. Die App startet im Wurzelordner, zeigt dort die vorhandenen Karten und lässt den Nutzer durch Ordner navigieren. Häufig benötigte Einträge können als Favoriten markiert werden und bleiben über eine überlagernde Favoritenleiste jederzeit erreichbar.

Die Anwendung ist bewusst dunkel, ruhig und kompakt gestaltet. Sie soll neben PACS, RIS, Browser, Chatfenster oder Befundsoftware laufen können, ohne visuell zu stören oder unnötig Platz zu verbrauchen.

---

## 2. Zielgruppe und Nutzungssituation

RadPrompt richtet sich an radiologische Workflows, in denen dieselben oder ähnliche KI-Aufgaben regelmäßig vorkommen:

- strukturierte Bildinterpretation,
- Befundformulierungsunterstützung,
- Modalitäts-spezifische Analyseaufträge,
- onkologische Verlaufskontrollen,
- muskuloskelettale Spezialfragen,
- Vorlagen mit klinischen Angaben und Fragestellungen,
- Prompts im Stil bestimmter Befundschulen,
- Prompts mit ergänzenden Beispielkontexten.

Typischer Ablauf:

1. RadPrompt läuft als Browserseite, PWA, schmales Zusatzfenster oder angepinntes Picture-in-Picture-Fenster.
2. Der Nutzer öffnet den passenden Ordner oder greift über Favoriten auf einen Prompt zu.
3. Platzhalter wie klinische Angaben, Fragestellung oder Modalität werden auf der Karte ausgefüllt.
4. Der Prompt wird per Kopierbutton in die Zwischenablage gelegt.
5. Der Text wird in ein KI-System oder Zielsystem eingefügt.

---

## 3. UI-Aufbau

Die Anwendung besteht aus mehreren klar getrennten Bereichen.

### 3.1 Hintergrund

Der Hintergrund verwendet eine sehr dunkle Basisfarbe, weiche farbige Orbs und eine dezente Noise-Struktur. Dadurch bleibt die Fläche zurückhaltend, wirkt aber nicht flach. Der Hintergrund ist rein dekorativ und nimmt keine Interaktion entgegen.

### 3.2 Glascontainer

Der eigentliche Arbeitsbereich sitzt in einem Glascontainer mit Blur, Transparenz, feiner Border und Schatten. Auf großen Viewports ist er zentriert und begrenzt. Auf kleinen Viewports, in der PWA oder im Fokusmodus füllt er den verfügbaren Raum randlos aus.

### 3.3 Header

Der Header enthält links:

- Zurückbutton,
- aktuellen Titel,
- Breadcrumb-Navigation.

Rechts enthält er:

- Prompt hinzufügen,
- Ordner hinzufügen,
- Sortiermodus,
- Fenster fixieren.

Der Header wurde für kurze horizontale Viewports verdichtet. Abstände, Schriftgrößen und Button-Paddings sind so reduziert, dass die Kartenfläche möglichst viel vertikalen Raum erhält.

### 3.4 Kartenraster

Das Kartenraster ist die Hauptfläche. Es skaliert dynamisch anhand der verfügbaren Breite und Höhe. Drei Spalten sind die Mindeststruktur. Wenn die Viewportbreite mehr Platz bietet, darf die Anwendung automatisch mehr Spalten verwenden. Die Kartengröße wird per JavaScript berechnet und als CSS-Variable gesetzt, sodass Breite, Höhe, Spaltenzahl und Zeilenbedarf gemeinsam berücksichtigt werden.

### 3.5 Favoritenleiste

Die Favoritenleiste liegt unten als Overlay über dem Inhalt. Im eingeklappten Zustand bleibt nur ein schmaler Griff sichtbar. Dadurch können Karten nahezu bis zum unteren Rand wachsen. Wenn die Leiste eingeblendet wird, verändert sie die Kartengröße nicht, sondern überlagert die Kartenfläche. Nach Interaktion blendet sie sich automatisch wieder aus.

### 3.6 Modal-System

Prompts und Ordner werden über modale Dialoge hinzugefügt und bearbeitet. Das Modal enthält klare Formularbereiche, eigene Scrollflächen und getrennte Aktionen für Speichern und Abbrechen.

### 3.7 Kontextmenü

Per Rechtsklick öffnet sich ein Kontextmenü mit Aktionen passend zur Karte: kopieren, Ordner öffnen, Favorit umschalten, Details anzeigen, bearbeiten und löschen. Das Menü positioniert sich innerhalb des aktiven Fensters, auch wenn RadPrompt in einem Picture-in-Picture-Dokument läuft.

### 3.8 Toasts

Statusmeldungen erscheinen als Toasts. Sie bestätigen beispielsweise Kopieren, Löschen, Sortiermodus, Fokusmodus und Fehler. Toasts verschwinden automatisch.

---

## 4. Kartenmodell

Eine Karte besitzt eine Vorderseite und eine Rückseite.

### 4.1 Prompt-Karte

Die Vorderseite zeigt:

- Titel,
- automatisch erkannte Eingabefelder für Platzhalter,
- Kopierbutton,
- Favoritenstern,
- Detailbutton.

Ein Klick auf die freie Fläche einer Promptkarte kopiert den Prompt ebenfalls direkt. Eingabefelder, Selects und Buttons bleiben davon ausgenommen, damit Platzhalter gefahrlos bearbeitet werden können. Erfolgreiches Kopieren wird zusätzlich durch eine Glow-Animation bestätigt, die die Kartenkontur kurz nachzeichnet.

Die Rückseite zeigt:

- Titel,
- vollständigen Prompttext in monospace-artiger Darstellung,
- Bearbeiten,
- Löschen,
- Zurückdrehen.

### 4.2 Ordner-Karte

Ordnerkarten zeigen:

- Titel,
- ein großes Ordnersymbol,
- Anzahl enthaltener Elemente,
- Favoritenstern,
- Detailbutton.

Ein Klick auf eine Ordnerkarte öffnet die nächste Ebene, solange der Sortiermodus nicht aktiv ist.

### 4.3 Kartenrückseite

Die Rückseite dient als Detail- und Verwaltungsfläche. Promptkarten zeigen dort den kompletten Text. Ordnerkarten zeigen eine Zusammenfassung der enthaltenen Elemente. Die Karten drehen sich visuell, behalten aber dieselbe Rasterposition.

---

## 5. Platzhalterlogik

Platzhalter werden im Prompttext über die Syntax `***Name***` definiert. Beim Rendern einer Promptkarte sucht RadPrompt alle eindeutigen Platzhalter und erzeugt passende Eingaben.

- Normale Platzhalter werden als Textfelder gerendert.
- Der Platzhalter `***Modalität***` wird als Auswahlfeld mit CT, MRT, Röntgen und CT&MRT dargestellt.
- Beim Kopieren werden alle Vorkommen eines Platzhalters ersetzt.
- Bleibt ein Feld leer, verwendet die App den Platzhalternamen als lesbaren Fallback.

Dadurch können Prompts flexibel bleiben, ohne dass vor jedem Kopieren ein separater Editor geöffnet werden muss.

---

## 6. Prof.-Schäfer-Kontextmodus

Prompt-Einträge können als Prof.-Schäfer-Prompt markiert werden. Beim Kopieren wird dann nicht nur der Prompttext kopiert, sondern zusätzlich ein CT- und MRT-Beispielkontext angehängt. Diese Beispieltexte liegen in `data.js` als `schaeferCTText` und `schaeferMRTText` vor.

Der Nutzwert besteht darin, einem KI-System neben der konkreten Aufgabe auch stilistische und strukturelle Beispiele mitzugeben. Das unterstützt einen kompakten, radiologisch geprägten Befundstil.

---

## 7. Navigation

Die Navigation basiert auf einem Pfad durch den Datenbaum.

- Der Wurzelknoten erscheint als Home.
- Ordnerklicks erweitern den Pfad.
- Der Zurückbutton entfernt die letzte Pfadstufe.
- Breadcrumb-Elemente erlauben den direkten Sprung auf frühere Ebenen.
- Klicks auf freie Flächen in leeren Ordnern führen zurück.

Die Navigation ist bewusst flach und schnell gehalten. Es gibt keine separate Seitenstruktur, keine Routen und keinen Reload beim Wechseln zwischen Ordnern.

---

## 8. Favoriten

Jede Karte kann über den Stern als Favorit markiert werden. Favoriten werden in `radprompt_favorites` lokal gespeichert und optional über den KV-Endpunkt synchronisiert.

Die Favoritenleiste ist als Overlay umgesetzt:

- eingeklappt: nur ein schmaler Griff bleibt sichtbar,
- geöffnet: Favoritenelemente sind horizontal scroll-/wischbar,
- nach Interaktion: zeitgesteuertes Ausblenden,
- Kartengröße: bleibt unverändert, weil die Leiste nicht am Layoutfluss teilnimmt.

Prompt-Favoriten kopieren direkt. Ordner-Favoriten navigieren zum entsprechenden Ordner.

---

## 9. Sortiermodus

Der Sortierbutton aktiviert Drag-and-Drop über SortableJS. Im Sortiermodus:

- Karten erhalten einen Sortiercursor,
- Ordner öffnen nicht versehentlich beim Ziehen,
- die Reihenfolge wird nach dem Drop im aktuellen Ordner gespeichert,
- Drag- und Ghost-Zustände werden visuell hervorgehoben.

Der Sortiermodus ist absichtlich manuell aktivierbar, damit normale Klicknavigation nicht mit Drag-Gesten kollidiert.

---

## 10. Bearbeiten, Erstellen und Löschen

### 10.1 Prompt hinzufügen

Ein neuer Prompt benötigt mindestens einen Titel. Optional können Prompttext und Prof.-Schäfer-Modus gesetzt werden. Neue Prompts werden im aktuellen Ordner eingefügt.

### 10.2 Ordner hinzufügen

Ein neuer Ordner benötigt einen Titel und startet mit leerer `children`-Liste.

### 10.3 Bearbeiten

Bestehende Einträge können über Kartenrückseite oder Kontextmenü bearbeitet werden. Titel, Prompttext und Schäfer-Status werden aktualisiert.

### 10.4 Löschen

Beim Löschen wird der Eintrag aus dem aktuellen Ordner entfernt. Bei Ordnern werden die IDs des gesamten Teilbaums gesammelt, damit Favoriten auf gelöschte Unterelemente ebenfalls bereinigt werden.

### 10.5 Eingabesicherheit im Modal

Beim Bearbeiten werden Titel und Prompttext HTML-escaped in das Modal geschrieben. Dadurch können Sonderzeichen, spitze Klammern und Anführungszeichen nicht versehentlich die Formularstruktur brechen.

---

## 11. Fenster fixieren

Der Pin-Button versucht zuerst, RadPrompt über die **Document Picture-in-Picture API** in ein echtes Vordergrundfenster zu verschieben. Das ist der zuverlässigste browserseitige Weg für ein kleines, stets sichtbares HTML-Fenster, sofern der Browser die API unterstützt.

Ablauf:

1. Der Nutzer klickt den Pin-Button.
2. Die App ruft `documentPictureInPicture.requestWindow` auf.
3. Das bestehende `app-host`-Element wird in das neue PiP-Dokument verschoben.
4. Styles werden in das PiP-Dokument kopiert.
5. Karten werden nach Größenänderungen im PiP-Fenster neu skaliert.
6. Im Ursprungsfenster erscheint ein ruhiger Platzhalter statt einer leeren schwarzen Fläche.
7. Beim Schließen des PiP-Fensters wird die App zurück in das Ursprungsfenster verschoben.

Wichtig: Nach aktuellem Web-Plattform-Modell kann ein Document-Picture-in-Picture-Fenster nicht ohne sein öffnendes Fenster weiterleben. RadPrompt kann dieses Ursprungsfenster daher nicht sicher entfernen, ohne das angepinnte Fenster ebenfalls zu verlieren. Die App reduziert den Störeffekt deshalb auf einen ruhigen Haltebereich und erklärt dort den Zustand. Wenn die API nicht verfügbar ist, aktiviert RadPrompt einen Fallback-Fokusmodus. Dieser kann das Browserfenster nicht betriebssystemweit im Vordergrund halten; die App kommuniziert das bewusst im Toast, statt eine falsche Zusage zu machen.

---

## 12. Layout und Responsivität

RadPrompt ist besonders auf schmale horizontale Viewports optimiert. Das betrifft Situationen wie:

- kleines Zusatzfenster neben PACS/RIS,
- PWA-Fenster mit geringer Höhe,
- Picture-in-Picture-Fenster,
- Landscape-Modus auf kleinen Displays.

Wichtige Mechanismen:

- kompakte globale CSS-Variablen für Gap, Kartenpadding und Widgetpadding,
- adaptive Headerabstände,
- kleine Buttonflächen in niedrigen Viewports,
- Favoritenleiste als Overlay,
- dynamische Spaltenzahl mit mindestens drei und höchstens sieben Spalten,
- so viele Spalten wie die Breite sinnvoll zulässt, begrenzt auf sieben,
- dynamische quadratische Kartengröße über `--dynamic-card-size`,
- dynamische Spaltenzahl über `--dynamic-card-columns`.

---

## 13. Designsystem

Das Designsystem basiert auf CSS-Variablen:

- dunkle Hintergrundfarben,
- Glasflächen,
- Hover-Glasflächen,
- Borderfarben,
- Textfarben,
- Akzentfarbe Indigo,
- Danger-Farbe Rot,
- Schatten,
- Radien,
- Transition-Kurven,
- Grid- und Kartenabstände,
- Favoritenhöhe und Favoriten-Peek.

Die UI nutzt weiche Transitions, dezente Schatten, klare Hoverzustände und runde, touchfreundliche Ziele. Der Stil ist modern, aber bewusst nicht verspielt: im radiologischen Kontext soll die Oberfläche Orientierung geben und nicht ablenken.

---

## 14. Animationen und Mikrointeraktionen

RadPrompt verwendet GSAP, wenn verfügbar:

- Karten animieren beim Rendern sanft ein.
- Das Kontextmenü bekommt eine kurze Skalierungs-/Fade-Animation.

Auch ohne GSAP bleibt die App funktionsfähig. CSS-Transitions übernehmen Hover-, Fokus-, Flip- und Favoritenleistenbewegungen. Bei `prefers-reduced-motion` werden Animationen stark reduziert.

---

## 15. Datenhaltung

RadPrompt nutzt zwei Ebenen der Datenhaltung.

### 15.1 Lokale Daten

Im Browser werden gespeichert:

- `radprompt_data` für die Baumstruktur,
- `radprompt_favorites` für Favoriten,
- `radprompt_focus_mode` für den Fokusmodus-Fallback.

Wenn lokale Daten beschädigt sind, setzt die App auf die initialen Standarddaten zurück und speichert diese erneut.

### 15.2 KV-Synchronisation

Unter `functions/api/kv.js` liegt ein Cloudflare-Pages-kompatibler Endpunkt:

- `GET /api/kv` lädt den gespeicherten Zustand,
- `POST /api/kv` speichert Daten und Favoriten.

Wenn der Endpunkt nicht verfügbar ist, arbeitet RadPrompt lokal weiter.

---

## 16. Offline- und PWA-Verhalten

Die App besitzt:

- `manifest.webmanifest` für Installierbarkeit,
- `sw.js` für App-Shell-Caching,
- App-Icon als SVG,
- Standalone-/Window-Controls-Overlay-Optimierungen,
- Theme- und Hintergrundfarben passend zum dunklen Design.

Der Service Worker cached die zentrale App-Shell und versucht bei GET-Anfragen zuerst das Netzwerk. Bei Netzwerkfehlern fällt er auf Cacheinhalte oder `index.html` zurück.

---

## 17. Barrierearme und robuste Details

Die Anwendung enthält mehrere robuste Details:

- Buttons besitzen `aria-label` oder klare Titel.
- Der Pin-Button setzt `aria-pressed`.
- Toasts werden in einem `aria-live`-Container angezeigt.
- Eingabefelder und Selects haben klare visuelle Fokuszustände.
- Scrollbars werden visuell reduziert, aber interne Scrollflächen bleiben nutzbar.
- Leere Ordner zeigen einen verständlichen Empty State.
- Esc schließt Kontextmenü, Modal und aufgeklappte Karten.
- Kontextmenüpositionen werden am Fensterrand begrenzt.
- Copy-Fallback nutzt ein temporäres Textarea-Element, wenn die Clipboard API fehlschlägt.

---

## 18. Externe Bibliotheken

Die App lädt folgende externe Bausteine über CDN:

- Tailwind CDN für Utility-Klassen in Markup und Modal-Struktur,
- Google Fonts: Inter und JetBrains Mono,
- GSAP und Flip für Animationen,
- SortableJS für Drag-and-Drop-Sortierung.

Die Kernlogik der Anwendung liegt ohne Framework in `app.js`.

---

## 19. Dateien und Architektur

| Datei | Zweck |
| --- | --- |
| `index.html` | HTML-Grundstruktur, Header, Kartencontainer, Favoritenleiste, Modal, Kontextmenü, Toastcontainer, Script-/Style-Einbindung |
| `style.css` | Vollständiges Designsystem, Layout, Responsivität, Karten, Modals, Favoriten, PiP-/Fokusdarstellung |
| `app.js` | App-Zustand, Rendering, Navigation, Kartenlogik, Favoriten, Sortierung, Modal, Kopieren, PiP-Pinning |
| `data.js` | Initialdaten, Promptbaum, Prof.-Schäfer-Beispieltexte |
| `sw.js` | Service Worker für App-Shell-Caching |
| `manifest.webmanifest` | PWA-Metadaten, Icons, Display-Modi, Shortcuts |
| `functions/api/kv.js` | Optionaler Cloudflare-KV-Endpunkt für Synchronisation |
| `assets/app-icon.svg` | Installations- und App-Icon |

---

## 20. Lokale Entwicklung

Da RadPrompt eine statische App ist, reicht ein einfacher HTTP-Server:

```bash
python3 -m http.server 4173
```

Danach ist die App lokal unter `http://127.0.0.1:4173/` erreichbar.

Sinnvolle Checks:

```bash
node --check app.js
```

```bash
git diff --check
```

---

## 21. Bekannte technische Grenzen

- Echtes Anpinnen im Vordergrund hängt von der Browserunterstützung für Document Picture-in-Picture ab. Das PiP-Fenster kann nach Web-Plattform-Vorgaben nicht unabhängig vom öffnenden Fenster existieren.
- Ohne KV-Binding bleibt die Synchronisation lokal.
- CDN-Bibliotheken benötigen beim ersten Laden Netzwerkzugriff.
- Clipboard-Zugriffe können je nach Browser, Kontext und Berechtigung eingeschränkt sein; dafür existiert ein Fallback.
- Medizinische Inhalte und Prompts ersetzen keine fachärztliche Verantwortung. RadPrompt organisiert und kopiert Arbeitsanweisungen, trifft aber keine medizinischen Entscheidungen.

---

## 22. Designphilosophie in einem Satz

RadPrompt soll sich anfühlen wie ein präzises, dunkles, immer griffbereites Instrument: wenig Reibung, klare Struktur, schnelle Kopierwege, hohe Informationsdichte und genau genug visuelle Veredelung, um im radiologischen Alltag angenehm und verlässlich zu bleiben.
