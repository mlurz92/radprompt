# RadPrompt – State of the Art Prompt Management für die Radiologie

## 1. Einleitung & Vision

**RadPrompt** ist eine hochperformante, browserbasierte Hilfsanwendung, die speziell für den radiologischen Alltag konzipiert wurde. Sie fungiert als kompaktes, schnell zugängliches Widget, um komplexe KI-Prompt-Templates per Mausklick in die Zwischenablage zu kopieren. Die Anwendung wird als Cloudflare Page gehostet und benötigt keine speziellen Build-Schritte. Sie ist aufgebaut als leichtgewichtiges, sofort einsatzbereites Tool, das perfekt neben PACS- oder Befundungssoftware positioniert werden kann.

Die Vision von RadPrompt ist es, den Workflow bei der Nutzung von KI-Modellen (z.B. für Bildinterpretation, Befundstilisierung oder Staging-Hilfen) durch eine intuitive, visuell ansprechende und fehlerresistente Oberfläche zu optimieren.

## 2. Kernfunktionen & Features

RadPrompt bietet eine Vielzahl an sorgfältig implementierten Funktionen, die auf maximale Effizienz und Benutzerfreundlichkeit abzielen:

### 2.1. Template-Verwaltung & Hierarchie
*   **Ordnerstruktur:** Prompts können in Ordner sortiert werden, um eine saubere Trennung (z.B. "Radiologische Bildinterpretation" vs. "Protokoll- und Befundungshilfe") zu gewährleisten.
*   **Kompakte Widget-Ansicht:** In der Grundansicht werden alle Karten als durchgehender Widget-Streifen in 4er-Reihen (responsive) dargestellt.
*   **Dezenter Ordner-Selektor:** Am oberen Rand ermöglicht eine schlanke Chip-Leiste den schnellen Wechsel zwischen den Hauptordnern, ohne Platz zu verschwenden.

### 2.2. Intelligente Platzhalter-Logik
*   **Dynamische Eingabefelder:** Prompts können Platzhalter im Format `***PLATZHALTER***` enthalten. Die Anwendung parst diese beim Laden und generiert automatisch die entsprechenden Eingabefelder direkt auf der Vorderseite der Prompt-Karte.
*   **Deduplizierung:** Jeder Platzhalter wird pro Prompt nur einmal als Eingabefeld angezeigt, auch wenn er im Text mehrfach vorkommt. Beim Kopieren werden alle Vorkommen durch denselben Wert ersetzt.
*   **Spezielle Dropdowns:** Für den Platzhalter `***Modalität***` wird automatisch ein Dropdown-Menü mit den Optionen `CT`, `MRT`, `Röntgen` und `CT&MRT` generiert.

### 2.3. Prof. Schäfer Context-Integration
*   Spezielle Prompts, die den "Prof. Schäfer Befundstil" adressieren, erkennen ihren Kontext automatisch (anhand des Titels oder Textes).
*   Beim Klick auf den Kopieren-Button lädt die Anwendung asynchron die Context-Dateien (`Befundbeispiele Prof. Schäfer CT.txt` und `Befundbeispiele Prof. Schäfer MRT.txt`) aus dem `/assets`-Verzeichnis und hängt sie an den zu kopierenden Prompt an.

### 2.4. Interaktion & Navigation
*   **Button-Only Interactions:** Um ein versehentliches Wegklappen von Karten zu verhindern, reagieren Prompts ausschließlich auf dedizierte Buttons (Kopieren, Erweitern, Editieren, Favorit, Löschen). Ein Klick auf die Karten-Vorderseite löst bei Prompts keine Aktion aus. Bei Ordnern öffnet ein Klick den Ordner.
*   **Flip-Animation & Overlay:** Klickt man auf "Erweitern", flippt die Karte in einer sanften 3D-Animation, vergrößert sich und zentriert sich auf dem Bildschirm. Der Hintergrund wird abgedunkelt (Overlay), um den Fokus auf den Langtext zu legen. Ein Klick auf das Overlay oder den Schließen-Button bringt den Nutzer zurück.
*   **Breadcrumb-Navigation:** Eine Breadcrumb-Leiste im Header zeigt den aktuellen Pfad an und erlaubt das direkte Zurücknavigieren.
*   **Klick auf freien Bereich:** Ein Klick auf den freien Bereich des Rasters (außerhalb von Karten) führt eine Ebene zurück.

### 2.5. Favoriten-Bar
*   Häufig genutzte Prompts oder Ordner können als Favorit markiert werden.
*   Am unteren Bildschirmrand klappt eine schlanke Favoriten-Leiste auf, die einen sofortigen Zugriff auf diese Elemente bietet, unabhängig vom aktuell geöffneten Ordner.

### 2.6. Drag & Drop Sortierung
*   Über den "Sortieren"-Button im Header kann der Drag&Drop-Modus aktiviert werden.
*   Karten lassen sich per Drag&Drop neu anordnen. Die neue Reihenfolge wird sofort in das Backend synchronisiert.
*   Visuelles Feedback: Beim Ziehen wird die Karte halbtransparent, das Ziel-Element erhält einen gestrichelten Akzent-Rahmen.

### 2.7. Empty State & User Guidance
*   Wenn ein Ordner keine Elemente enthält, erscheint ein zentriertes, dezent gestaltetes "Empty State" Icon mit Hinweistext. Dies verhindert Orientierungslosigkeit und macht sofort klar, dass der Ordner leer ist und wie neue Elemente hinzugefügt werden können.

## 3. UI/UX & Design-Philosophie

Das Design von RadPrompt orientiert sich an modernen "Fluent Design"-Prinzipien (Windows 11 Ästhetik) und kombiniert diese mit hochwertigen Glas-Effekten.

### 3.1. Aero-Glass & Milchglasoptik
*   Der Hauptcontainer und die Karten nutzen `backdrop-filter: blur()` und `saturate()`, um einen echten Milchglaseffekt über dem Hintergrund zu erzeugen.
*   Feine, halbtransparente Ränder (`rgba(255,255,255,0.08)`) fangen das Licht ein und sorgen für Tiefe.
*   Im Hintergrund schweben weiche, animierte Farb-Orbs (Blau und Violett), die durch das Glas hindurchschimmern und die Anwendung lebendig wirken lassen.

### 3.2. Perfekte Responsivität
*   Das Raster passt sich fließend an (`grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`). Auf Desktops werden 4er-Reihen oder mehr angezeigt, auf Tablets 2er- bis 3er-Reihen, auf Smartphones 1er- bis 2er-Reihen.
*   Die erweiterte (geflippte) Karte skaliert auf `min(90vw, 400px)`, um auch auf kleinen Bildschirmen optimal lesbar zu bleiben.

### 3.3. Mikro-Interaktionen & Bug-Free UX
*   **Kein Layout-Jumping:** Hover-Effekte auf den Karten verschieben das Layout nicht (kein `translateY`), sondern nutzen subtile Glow-Effekte (`box-shadow` und Border-Color-Änderung), um Hover-Zustände zu signalisieren.
*   **Unsichtbare Scrollbalken:** Innerhalb der Karten (für Input-Listen oder Langtexte) existieren Scrollbalken, diese sind jedoch per CSS (`scrollbar-width: none` und `::-webkit-scrollbar { display: none; }`) komplett ausgeblendet. Das UI bleibt clean, das Scrolling funktioniert aber tadellos.
*   **Toast-Benachrichtigungen:** Erfolgsaktionen (z.B. "In Zwischenablage kopiert") werden durch dezente, von unten einfliegende Toasts bestätigt, die nach 2,5 Sekunden automatisch verblassen.

### 3.4. Accessibility (a11y) & Touch-Devices
*   Alle interaktiven Elemente verfügen über `aria-labels` zur Nutzung mit Screenreadern.
*   Tastatur-Fokus wird durch klare `:focus-visible` Outlines sichtbar gemacht.
*   Auf Touch-Geräten (Tablets) wird im Drag&Drop-Modus `touch-action: none` aktiviert, um das versehentliche Scrollen der Seite beim Ziehen einer Karte zu verhindern.

## 4. Architektur & Technologie-Stack

RadPrompt ist bewusst schlank gehalten und verzichtet auf schwere Frameworks, um Ladezeiten zu minimieren und die Bereitstellung zu vereinfachen.

*   **Frontend (Vanilla Stack):**
    *   `index.html`: Semantisches Grundgerüst mit integriertem Empty-State Container.
    *   `style.css`: Komplette State-of-the-Art Gestaltung mittels CSS-Variablen, Flexbox und Grid. Keine externen UI-Bibliotheken.
    *   `app.js`: Reines Vanilla JavaScript. Übernimmt State-Management, DOM-Manipulation, Event-Handling, intelligente Platzhalter-Deduplizierung und Fetch-API-Aufrufe.
*   **Backend (Cloudflare Pages Functions):**
    *   `functions/api/data.js`: Eine serverlose Funktion, die als Schnittstelle zum Cloudflare Workers KV (Key-Value Store) agiert. Sie verarbeitet `GET` (Laden des States), `POST` (Speichern des States) und `OPTIONS` (CORS Preflight). Sie fängt fehlerhafte JSON-Payloads sauber ab (400 Bad Request) und ist vollständig produktionsreif.
*   **Datenspeicher (Cloudflare Workers KV):**
    *   Namespace: `RADPROMPT_KV`
    *   Speichert den gesamten Anwendungsstate (Ordner, Prompts, Favoriten, Sortierreihenfolge) als JSON-String unter dem Key `radprompt_state_v1`. Dies stellt sicher, dass der Stand auf jedem Gerät, auf dem die App geöffnet wird, identisch ist.

## 5. Deployment-Guide (Cloudflare Pages)

Die Anwendung ist zu 100% für ein direktes Deployment auf Cloudflare Pages vorbereitet. Es sind keine Build-Schritte (Webpack, npm, etc.) erforderlich.

### Schritt 1: GitHub Repository
Lade die Dateien in folgender Struktur in ein GitHub-Repository hoch:
```text
radprompt-repo/
├── index.html
├── style.css
├── app.js
├── assets/
│   ├── Befundbeispiele Prof. Schäfer CT.txt
│   └── Befundbeispiele Prof. Schäfer MRT.txt
└── functions/
    └── api/
        └── data.js
```

### Schritt 2: Cloudflare Pages Projekt erstellen
1.  Gehe ins Cloudflare Dashboard -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2.  Wähle das erstellte GitHub-Repository aus.
3.  **Build settings:**
    *   Framework preset: `None`
    *   Build command: *(leer lassen)*
    *   Build output directory: `/` (oder leer lassen)
4.  Klicke auf **Save and Deploy**. Cloudflare lädt die statischen Dateien und deployt die Funktion automatisch.

### Schritt 3: KV Namespace anbinden (Entscheidend!)
Damit die Synchronisierung funktioniert, muss der KV-Store angebunden werden.
1.  Gehe im Cloudflare Dashboard zu **Workers & Pages** -> **KV** und erstelle einen Namespace mit dem Namen `RADPROMPT_KV` (Namespace ID: `9e6bc961684e4b928ef276bd2ff1adb2`).
2.  Gehe zurück zu deinem neu erstellten **Pages Projekt** -> **Settings** -> **Functions**.
3.  Scrolle zu **KV namespace bindings** und klicke auf **Add binding**:
    *   Variable name: `RADPROMPT_KV` (muss exakt so heißen, wie in `data.js` referenziert).
    *   KV namespace: Wähle den eben erstellten `RADPROMPT_KV` Namespace aus.
4.  Speichern und ein neues Deployment auslösen (z.B. durch einen leeren Commit in GitHub oder "Retry deployment" im Dashboard).

Die Anwendung ist nun unter deiner `radprompt.pages.dev` Domain voll funktionsfähig.

## 6. Verwendung & Workflow im Alltag

1.  **App öffnen:** Beim Start lädt die App den letzten globalen State aus dem KV-Store.
2.  **Navigation:** Nutze die Ordner-Chips oben oder klicke auf Ordner-Karten, um in Unterordner zu wechseln. Klicke auf den freien Bereich, um eine Ebene zurückzugehen.
3.  **Prompt ausfüllen:** Klicke auf eine Prompt-Karte. Wenn sie Platzhalter enthält, fülle die Felder auf der Vorderseite aus.
4.  **Kopieren:** Klicke auf das Kopier-Icon. Der Prompt wird mit deinen Werten in die Zwischenablage kopiert. Bei Schäfer-Prompts werden die Beispieldateien automatisch angehängt.
5.  **Erweitern:** Klicke auf das Erweitern-Icon, um den vollen Text zu lesen, ohne etwas zu kopieren.
6.  **Favoriten:** Markiere wichtige Karten mit dem Stern. Greife über die Leiste unten jederzeit schnell auf sie zu.
7.  **Verwaltung:** Nutze die Header-Buttons, um neue Ordner/Prompts zu erstellen, diese zu editieren (Stift-Icon) oder per Drag&Drop umzusortieren.
```