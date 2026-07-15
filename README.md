# RadPrompt

RadPrompt ist ein installierbares, dunkles Schnellzugriffsboard für radiologische KI-Prompts. Die Anwendung verbindet eine bewusst reduzierte, quadratische Kartenoberfläche mit einer sehr konkreten Aufgabe: häufig benötigte radiologische Prompts, Ordnerstrukturen, Platzhalter, Prof.-Schäfer-Beispielkontexte und Favoriten so bereitzustellen, dass der Weg vom Befundarbeitsplatz zur Zwischenablage nur wenige Sekunden dauert.

Die Anwendung ist absichtlich kein allgemeines Notizprogramm, kein umfangreiches CMS und kein Chat-Frontend. RadPrompt ist ein kompaktes Prompt-Cockpit: Prompt finden, bei Bedarf Variablen eintragen, kopieren, in ein KI-System oder ein anderes Zielsystem einfügen.

## Inhaltsverzeichnis

1. [Kernidee](#kernidee)
2. [Zielgruppe und Nutzungssituation](#zielgruppe-und-nutzungssituation)
3. [Oberfläche im Überblick](#oberfläche-im-überblick)
4. [Kartenmodell](#kartenmodell)
5. [Prompt-Karten](#prompt-karten)
6. [Ordner-Karten](#ordner-karten)
7. [Navigation](#navigation)
8. [Favoriten](#favoriten)
9. [Sortiermodus](#sortiermodus)
10. [Bearbeiten, Erstellen und Löschen](#bearbeiten-erstellen-und-löschen)
11. [Platzhalter-Logik](#platzhalter-logik)
12. [Prof-Schäfer-Kontextmodus](#prof-schäfer-kontextmodus)
13. [Layout, Skalierung und Responsivität](#layout-skalierung-und-responsivität)
14. [Design-System](#design-system)
15. [Animationen und Mikrointeraktionen](#animationen-und-mikrointeraktionen)
16. [PWA- und Fokusmodus](#pwa--und-fokusmodus)
17. [Datenhaltung und Synchronisation](#datenhaltung-und-synchronisation)
18. [Offline-Verhalten](#offline-verhalten)
19. [Barrierearme Details](#barrierearme-details)
20. [Dateien und Architektur](#dateien-und-architektur)
21. [Bedienabläufe](#bedienabläufe)
22. [Entwicklung und lokaler Start](#entwicklung-und-lokaler-start)
23. [Externe Bibliotheken](#externe-bibliotheken)
24. [Fehlerrobustheit und bekannte Grenzen](#fehlerrobustheit-und-bekannte-grenzen)

## Kernidee

RadPrompt organisiert radiologische KI-Prompts als visuelle, quadratische Karten. Jede Karte ist entweder ein Prompt oder ein Ordner. Prompts können direkt kopiert werden. Ordner öffnen eine tiefere Ebene. Häufig benötigte Elemente lassen sich als Favorit markieren. Die Oberfläche bleibt dunkel, kompakt und ablenkungsarm, weil sie für Umgebungen gedacht ist, in denen große helle Flächen und unnötige UI-Komplexität stören würden.

Der zentrale Produktgedanke ist Geschwindigkeit ohne Unordnung. Die App bietet genug Verwaltungsfunktionen, um eine Prompt-Sammlung lebendig zu halten, aber die primäre Interaktion bleibt immer die gleiche: visuell erkennen, anklicken, kopieren.

## Zielgruppe und Nutzungssituation

RadPrompt richtet sich an radiologische Workflows, in denen wiederkehrende KI-Aufgaben schnell gestartet werden sollen. Dazu gehören zum Beispiel strukturierte Bildinterpretationsprompts, Befundformulierungsunterstützung, Modalitäts-spezifische Anweisungen, Vorlagen mit klinischen Angaben und spezielle Kontexte für einen bestimmten Befundstil.

Typische Nutzungssituation:

1. Die Anwendung läuft als Browserseite, installierte PWA oder rahmenloser Fokusmodus.
2. Der Nutzer befindet sich in einem radiologischen Arbeitskontext.
3. Ein KI-System oder Chatfenster wartet auf einen Prompt.
4. RadPrompt liefert den passenden Textbaustein inklusive optional ausgefüllter Platzhalter.
5. Der kopierte Text wird in das Zielsystem eingefügt.

## Oberfläche im Überblick

Die App besteht aus einer einzigen Hauptansicht mit mehreren klar getrennten Bereichen:

- **Hintergrundeffekte:** Dunkle Grundfläche mit farbigen, weich verschwommenen Orbs und dezenter Noise-Struktur.
- **Glascontainer:** Zentrierter Hauptbereich mit Blur, Glasoptik, Border und Schatten.
- **Header:** Linke Navigationszone mit Zurückbutton, Titel und Breadcrumb; rechte Aktionszone mit Hinzufügen-, Sortier- und Fokusbutton.
- **Kartenraster:** Hauptfläche für Ordner- und Prompt-Karten.
- **Footer/Favoritenleiste:** Kompakt eingeklappte Favoritenzone am unteren Rand.
- **Modal:** Dialogsystem zum Hinzufügen und Bearbeiten.
- **Kontextmenü:** Rechtsklickmenü für schnelle Kartenaktionen.
- **Toast-Container:** Kurze Statusmeldungen für Kopieren, Löschen, Sortiermodus und Fokusmodus.
- **Preloader:** Kurzer Startzustand mit Spinner, bis Initialdaten und Rendering abgeschlossen sind.

## Kartenmodell

Alle Inhalte basieren auf einem Baum aus Knoten. Jeder Knoten besitzt eine eindeutige `id`, einen `type`, einen `title` und je nach Typ weitere Felder.

- Ein **Ordner** besitzt `children` und kann weitere Ordner oder Prompts enthalten.
- Ein **Prompt** besitzt `text` und optional `isSchaefer`.
- Der Wurzelknoten ist ein Ordner mit der technischen ID `root`; in der UI erscheint er als `Home`.

Die quadratische Kartenform ist bewusst gewählt. Sie macht die Oberfläche visuell stabil, gleichmäßig und touchfreundlich. Jede Karte hat eine Vorderseite für schnelle Nutzung und eine Rückseite für Details, Bearbeitung und Löschung.

## Prompt-Karten

Prompt-Karten zeigen oben den Titel. Darunter erscheinen automatisch Eingabefelder, wenn der Prompt Platzhalter enthält. Unten links befindet sich der Kopierbutton. Unten rechts öffnet ein Detailbutton die Kartenrückseite. Oben rechts sitzt der Favoritenstern.

Die Kartenrückseite zeigt den vollständigen Prompt-Text in einer monospace-artigen Darstellung. Dadurch lassen sich lange, strukturierte Prompts vor dem Bearbeiten oder Verwenden prüfen. Auf der Rückseite befinden sich außerdem Aktionen zum Bearbeiten, Löschen und Zurückdrehen.

Beim Kopieren wird der Prompt-Text vorbereitet, indem alle bekannten Platzhalter durch die Werte der jeweiligen Eingabefelder ersetzt werden. Falls ein Feld leer bleibt, wird der Platzhaltername als lesbarer Fallback eingesetzt. Dadurch entstehen keine leeren Lücken im kopierten Prompt.

## Ordner-Karten

Ordner-Karten öffnen per Klick eine tiefere Ebene. Sie besitzen eine stärkere visuelle Identität als einfache Prompt-Karten: eine glasige, farbige Vorderseite, ein leuchtendes Ordnerpiktogramm, dezente Lichtlinien und eine Elementanzahl. Das Ordnerpiktogramm ist etwas größer gestaltet, damit Ordner auch in verkleinerten Layoutsituationen sofort als Navigationselement erkennbar bleiben.

Die Ordnerkarte zeigt:

- den Ordnertitel,
- ein zentrales Ordnersymbol,
- eine Angabe der enthaltenen Elemente,
- den Favoritenstern,
- den Detailbutton.

Auf der Rückseite steht eine kurze Zusammenfassung der enthaltenen Elementanzahl sowie die gleichen Verwaltungsaktionen wie bei Prompt-Karten.

## Navigation

Navigation findet auf drei Ebenen statt:

1. **Ordnerklick:** Öffnet einen Ordner.
2. **Zurückbutton:** Führt eine Ebene nach oben und erscheint nur außerhalb von `Home`.
3. **Breadcrumb:** Zeigt die aktuelle Pfadstruktur und erlaubt den direkten Sprung zu jeder übergeordneten Ebene.

Leere Ordner erhalten einen Empty State. Dieser erklärt, dass der Ordner leer ist und ein Klick auf freie Fläche zurückführt. Auch in leeren Ordnern bleibt die Favoritenleiste korrekt aktualisiert.

## Favoriten

Jede Karte kann als Favorit markiert werden. Favoriten werden als IDs gespeichert und unten in einer horizontalen Leiste angezeigt.

Die Favoritenleiste ist im Alltag absichtlich kompakt. Sie sitzt am unteren Rand, zeigt zunächst nur eine kleine Griff-/Leistenwirkung und fährt beim Hover aus. So bleibt die Hauptfläche frei, ohne dass Schnellzugriffe verschwinden.

Favoritenverhalten:

- Prompt-Favorit: Ein Klick kopiert den Prompt direkt.
- Ordner-Favorit: Ein Klick navigiert direkt zum gespeicherten Ordner.
- Entfernte Karten werden aus der Favoritenliste bereinigt.
- Beim Löschen eines Ordners werden auch Favoriten innerhalb seiner Unterstruktur entfernt.

## Sortiermodus

Der Sortierbutton schaltet den Drag-and-drop-Modus um. Nur im Sortiermodus sind Karten aktiv ziehbar. Dadurch werden versehentliche Drag-Interaktionen im normalen Arbeitsfluss vermieden.

Im Sortiermodus:

- Karten erhalten einen Greifcursor.
- SortableJS verwaltet Drag, Ghost und Drop.
- Die Reihenfolge wird nur im aktuell geöffneten Ordner geändert.
- Nach dem Loslassen wird die neue Reihenfolge gespeichert.

## Bearbeiten, Erstellen und Löschen

Über die Header-Buttons können neue Prompts und Ordner in der aktuellen Ebene angelegt werden.

### Prompt hinzufügen

Der Prompt-Dialog enthält:

- Titel,
- Prompt-Text,
- Auswahl, ob der Prof.-Schäfer-Kontext beim Kopieren angehängt werden soll.

### Ordner hinzufügen

Der Ordnerdialog enthält:

- Titel.

Ein neuer Ordner startet mit leerem `children`-Array und kann anschließend weitere Prompts oder Ordner aufnehmen.

### Bearbeiten

Bestehende Karten können über die Kartenrückseite oder das Kontextmenü bearbeitet werden. Bei Prompts lassen sich Titel, Text und Schäfer-Markierung ändern. Bei Ordnern wird der Titel geändert.

### Löschen

Löschen entfernt den Eintrag aus dem aktuellen Ordner. Bei Ordnern wird die gesamte Unterstruktur entfernt. RadPrompt bereinigt dabei auch Favoriten, die auf gelöschte Elemente verweisen.

## Platzhalter-Logik

RadPrompt erkennt Platzhalter im Format:

```text
***Name***
```

Jeder eindeutige Platzhalter erzeugt ein Eingabeelement auf der Prompt-Karte. Mehrfach vorkommende Platzhalter werden nur einmal als Feld angezeigt, beim Kopieren aber überall ersetzt.

Sonderfall:

```text
***Modalität***
```

Dieser Platzhalter wird nicht als freies Textfeld, sondern als Auswahlfeld dargestellt. Verfügbare Optionen sind:

- CT,
- MRT,
- Röntgen,
- CT&MRT.

Diese Logik reduziert Tippaufwand und verhindert uneinheitliche Schreibweisen bei häufig verwendeten Modalitätsangaben.

## Prof-Schäfer-Kontextmodus

Ein Prompt kann als Prof.-Schäfer-Prompt markiert werden. Beim Kopieren hängt RadPrompt dann zusätzlich umfangreiche CT- und MRT-Befundbeispiele an den Prompt an.

Dieser Modus macht aus einer normalen Prompt-Karte einen Kontextlieferanten. Die Anwendung liefert nicht nur eine Anweisung, sondern auch Stil- und Strukturbeispiele. Das ist besonders nützlich, wenn ein bestimmter kompakter, radiologischer Befundstil erzeugt werden soll.

Die Beispieltexte liegen direkt in `data.js` und sind in CT- und MRT-Blöcke getrennt. Beim Kopieren entsteht ein kombinierter Text aus ausgefülltem Prompt, CT-Beispielen und MRT-Beispielen.

## Layout, Skalierung und Responsivität

RadPrompt nutzt ein quadratisches Kartenraster. Auf normalen Breiten werden drei Spalten verwendet. Auf sehr schmalen Breiten wird auf zwei Spalten reduziert.

Eine wichtige Layoutregel ist: Karten bleiben immer quadratisch. Wenn die Viewporthöhe niedrig ist, berechnet die App dynamisch eine passende Kartengröße anhand der verfügbaren Rasterhöhe, der Anzahl der Karten, der Spaltenzahl und des aktuellen Grid-Gaps. Die Karten werden dann verkleinert, statt nach unten unkontrolliert abgeschnitten zu werden. Der Abstand zwischen den Karten bleibt dabei über die bestehende Gap-Variable kontrolliert und wird nicht künstlich vergrößert.

Das Raster berücksichtigt:

- verfügbare Containerbreite,
- verfügbare Containerhöhe,
- Anzahl der Karten,
- Spaltenzahl,
- Zeilenzahl,
- aktuelles CSS-Gap,
- Favoritenbereich am unteren Rand.

Die Skalierung wird beim Rendern und bei Fenstergrößenänderungen aktualisiert. Dadurch passt sich die Oberfläche auch an kleine Desktopfenster, geteilte Bildschirmbereiche und PWA-Fenster an.

## Design-System

### Farben

Die Basisfarbe ist ein nahezu schwarzes `#050507`. Darauf liegen halbtransparente Glasflächen, helle Textfarben und Indigo-/Cyan-/Pink-Akzente. Die Farbwelt ist auf radiologische Lesesituationen abgestimmt: dunkel, ruhig, kontrastreich und ohne grelle Flächen.

### Glasflächen

Container, Karten, Header-Aktionsgruppe, Favoritenleiste, Kontextmenü und Modale verwenden transparente Hintergründe, Backdrop-Blur, Border und Schatten. Dadurch entsteht Tiefe, ohne dass die App schwer oder bunt wirkt.

### Typografie

Die UI nutzt Inter für Bedienoberfläche und Lesbarkeit. Prompt-Texte und Textareas nutzen JetBrains Mono, damit strukturierte Anweisungen, Absätze und Platzhalter klarer erfassbar sind.

### Radien und Schatten

Das Design verwendet kleine, mittlere und große Radien. Karten sind weich, aber nicht verspielt. Schatten trennen Ebenen voneinander und unterstützen das Gefühl eines schwebenden, kompakten Boards.

## Animationen und Mikrointeraktionen

RadPrompt nutzt Animationen gezielt, aber nicht überladen:

- Karten erscheinen gestaffelt mit leichter Bewegung.
- Karten können räumlich auf ihre Rückseite flippen.
- Der Favoritenbereich fährt weich aus.
- Kontextmenüs skalieren dezent ein.
- Hover-Zustände verändern Border, Glow, Translation und Farbe.
- Der Ordner-Hover hebt das Ordnersymbol an und verstärkt den Glow.
- Toasts erscheinen mit kurzer, federnder Bewegung.

Bei `prefers-reduced-motion: reduce` werden Animationen nahezu vollständig reduziert. Damit respektiert die App Systemeinstellungen für bewegungsarme Darstellung.

## PWA- und Fokusmodus

RadPrompt ist als installierbare Webapp vorbereitet. Das Manifest definiert Name, Kurzname, Beschreibung, Start-URL, Scope, Standalone-Anzeige, Theme-Farbe, Hintergrundfarbe, Icon und Shortcut.

Der Fokusmodus wird über den Pin-Button aktiviert. Er öffnet kein zweites Fenster, sondern erweitert die bestehende App rahmenlos auf die verfügbare Fläche. Dieser Zustand wird in `localStorage` gespeichert und übersteht Reloads.

Im Fokusmodus:

- füllt der Hauptcontainer die komplette Fläche,
- verschwinden Rahmen und zusätzlicher Schatten,
- bleibt die UI dunkel und ablenkungsarm,
- ist die Headerzone für Desktop-/Webapp-Wrapper als Drag-Region vorbereitet,
- bleiben Buttons, Eingaben, Karten, Breadcrumbs und Favoriten explizit interaktiv.

## Datenhaltung und Synchronisation

RadPrompt verwendet eine zweistufige Datenstrategie:

1. Zuerst versucht die App, Daten und Favoriten über `/api/kv` zu laden.
2. Wenn der Endpunkt nicht verfügbar ist, nutzt sie `localStorage`.

Beim Speichern werden Daten ebenfalls lokal abgelegt und zusätzlich an `/api/kv` gesendet. Scheitert die Serversynchronisation, bleibt die lokale Speicherung erhalten.

Der optionale KV-Endpunkt liegt unter `functions/api/kv.js` und erwartet eine Umgebung mit `RADPROMPT_KV`. Er speichert den kompletten App-Zustand unter dem Schlüssel `radprompt_state`.

## Offline-Verhalten

Der Service Worker cached die App-Shell:

- `/`,
- `index.html`,
- `style.css`,
- `app.js`,
- `data.js`,
- `manifest.webmanifest`,
- `assets/app-icon.svg`.

GET-Anfragen werden netzwerkzuerst behandelt und bei Fehlern aus dem Cache beantwortet. Wenn keine spezifische Cache-Antwort existiert, fällt der Service Worker auf `index.html` zurück.

## Barrierearme Details

RadPrompt ist keine vollständig auditierte Accessibility-Suite, enthält aber mehrere bewusst gesetzte Details:

- wichtige Header-Buttons besitzen `aria-label`,
- Toasts verwenden `aria-live` und `aria-atomic`,
- Formularfelder besitzen sichtbare Fokuszustände,
- reduzierte Bewegung wird respektiert,
- Kontraste sind für eine dunkle Arbeitsumgebung hoch,
- große quadratische Karten erleichtern Touch- und Pointer-Nutzung,
- Kontextmenüaktionen sind als Buttons umgesetzt.

## Dateien und Architektur

### `index.html`

Enthält die App-Shell: Meta-Tags, Manifest-Verknüpfung, externe Bibliotheken, Preloader, Hintergrundeffekte, Hauptcontainer, Header, Kartencontainer, Favoritenfooter, Modal, Kontextmenü, Toastcontainer sowie Script-Einbindungen.

### `style.css`

Definiert das komplette visuelle System: Variablen, Reset, Hintergrund, Glascontainer, Header, Buttons, Raster, Karten, Kartenrückseiten, Eingaben, Favoriten, Modale, Toasts, Kontextmenü, responsive Regeln, Fokusmodus, PWA-Darstellung, versteckte Scrollbars und veredelte Ordnerkarten.

### `app.js`

Enthält Zustand, Initialisierung, Event-Binding, Laden und Speichern, Rendering, dynamische Kartenskalierung, Kartenbau, Promptkopie, Favoritenlogik, Navigation, Sortiermodus, Kontextmenü, Modalverwaltung, Löschlogik, Toasts, Fokusmodus und Service-Worker-Registrierung.

### `data.js`

Enthält Initialdaten und die Prof.-Schäfer-Beispieltexte. Die Initialdaten bilden die erste Ordner- und Promptstruktur der Anwendung.

### `manifest.webmanifest`

Beschreibt RadPrompt als installierbare Webapp mit Name, Anzeigeverhalten, Theme-Farbe, Hintergrundfarbe, Kategorien, Icon und Shortcut.

### `sw.js`

Implementiert den Service Worker für App-Shell-Caching, Aktivierung, Cache-Bereinigung und Fetch-Fallbacks.

### `assets/app-icon.svg`

Stellt das maskierbare SVG-App-Icon bereit.

### `functions/api/kv.js`

Stellt den optionalen API-Endpunkt für Laden und Speichern des App-Zustands in einem KV-Speicher bereit.

## Bedienabläufe

### Prompt kopieren

1. Ordner öffnen oder Prompt auf der aktuellen Ebene finden.
2. Falls Felder vorhanden sind, Platzhalterwerte eintragen.
3. Kopierbutton klicken.
4. Toast bestätigt das Kopieren.
5. Text im Zielsystem einfügen.

### Prompt prüfen

1. Detailbutton einer Prompt-Karte klicken.
2. Rückseite lesen.
3. Bei Bedarf bearbeiten oder Karte zurückdrehen.

### Ordner öffnen

1. Ordnerkarte anklicken.
2. App aktualisiert Titel, Breadcrumb und Kartenraster.
3. Zurückbutton oder Breadcrumb nutzen, um wieder nach oben zu gelangen.

### Favorit setzen

1. Stern auf einer Karte klicken.
2. Element erscheint in der Favoritenleiste.
3. Favoritenleiste am unteren Rand hovern.
4. Favorit direkt nutzen.

### Reihenfolge ändern

1. Sortierbutton aktivieren.
2. Karte ziehen.
3. Karte an neuer Position ablegen.
4. Sortierbutton optional deaktivieren.

## Entwicklung und lokaler Start

RadPrompt benötigt keinen Build-Schritt. Ein statischer Server reicht aus.

```bash
python3 -m http.server 8000
```

Danach ist die App unter folgender Adresse erreichbar:

```text
http://localhost:8000
```

Für sinnvolle Browserprüfungen sollte die App über HTTP statt direkt über `file://` geöffnet werden, weil Service Worker, Fetch-Verhalten und Clipboard-Funktionen sonst je nach Browser eingeschränkt sein können.

## Externe Bibliotheken

RadPrompt lädt externe Bibliotheken direkt über CDN:

- Tailwind CDN für Utility-Klassen im HTML,
- Google Fonts für Inter und JetBrains Mono,
- GSAP für Animationen,
- GSAP Flip als vorbereitete Animationsbibliothek,
- SortableJS für Drag-and-drop-Sortierung.

## Fehlerrobustheit und bekannte Grenzen

RadPrompt ist bewusst einfach gehalten und robust gegenüber fehlendem Backend. Wenn `/api/kv` nicht erreichbar ist, arbeitet die App lokal weiter. Wenn die moderne Clipboard-API fehlschlägt, versucht die App einen klassischen Textarea-Fallback.

Bekannte Grenzen:

- Ohne passenden KV-Speicher ist Synchronisation geräteübergreifend nicht verfügbar.
- Externe CDN-Ressourcen müssen erreichbar sein, wenn sie nicht bereits vom Browser gecacht sind.
- Die medizinische Qualität der Prompts hängt vom gepflegten Inhalt ab; RadPrompt validiert keine medizinischen Aussagen.
- Sehr große Kartenzahlen können trotz dynamischer Skalierung Scrollen erforderlich machen, weil eine sinnvolle Mindestbedienbarkeit erhalten bleiben muss.

## Kurzfazit

RadPrompt ist ein spezialisiertes, dunkles, installierbares Prompt-Board für radiologische KI-Arbeit. Es kombiniert hierarchische Ordner, quadratische Karten, automatische Platzhalterfelder, Favoriten, Drag-and-drop-Sortierung, Kontextmenüs, Prof.-Schäfer-Kontextkopie, lokale und optionale serverseitige Speicherung, Offline-App-Shell und eine dynamisch skalierende Oberfläche zu einem schnellen Werkzeug für den täglichen Prompt-Zugriff.
