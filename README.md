# RadPrompt

RadPrompt ist ein kompaktes, hochpoliertes Schnellzugriffsboard für radiologische KI-Prompts. Die Anwendung bündelt Prompt-Templates, Ordner, Platzhalter, Favoriten, Kontextaktionen, einen optionalen Immer-im-Vordergrund-Modus und persistente Speicherung in einer fokussierten Oberfläche, die sich wie ein großes Desktop-Widget neben einem Befundungs- oder Browserfenster nutzen lässt.

## Kernidee

RadPrompt reduziert wiederkehrende Prompt-Arbeit auf wenige sichere Interaktionen: Prompt auswählen, optionale Platzhalter ausfüllen, kopieren und in das gewünschte KI-System einfügen. Die Oberfläche ist bewusst dunkel, ruhig und visuell zurückhaltend gestaltet, damit sie im radiologischen Arbeitskontext nicht stört, aber trotzdem schnell erfassbar bleibt.

## UI- und UX-Prinzipien

- **Immer quadratische Karten:** Jede Prompt- und Ordnerkarte verwendet ein festes 1:1-Seitenverhältnis. Dadurch entsteht ein ruhiges Raster ohne springende Höhen.
- **Immer drei Karten nebeneinander:** Das Board zeigt konsequent drei Spalten. Auch auf kleinen Viewports bleiben drei Spalten erhalten; Inhalte werden stattdessen intelligent verkleinert und abgeschnitten, damit das Layout stabil bleibt.
- **Keine Überlagerungen:** Titel, Eingabefelder und Aktionsbuttons besitzen klare Reserven, reduzierte Zeilenanzahl, skalierende Schriftgrößen und scrollbare Detailflächen.
- **Frustfreie Bedienung:** Kopieren, Favorisieren, Navigieren, Bearbeiten, Löschen und der optionale Vordergrundmodus sind direkt erreichbar. Escape schließt Modale, Kontextmenüs und aufgeklappte Karten.
- **Sanfte Interaktion:** Karten erscheinen gestaffelt, Hover-Zustände sind weich, das Kontextmenü öffnet mit kurzer Skalierungsanimation und der 3D-Flip zeigt Details ohne harten Kontextwechsel.
- **Aero-Glass-Optik:** Hintergrund-Orbs, Noise-Overlay, Blur-Flächen, feine Rahmen, Glow-Akzente und dezente Schatten erzeugen ein modernes Windows-11-inspiriertes Erscheinungsbild.

## Funktionsumfang

### Prompt-Karten

Prompt-Karten enthalten einen Titel, optionale Platzhalterfelder und eine Kopieraktion. Der sichtbare Kartenbereich bleibt kompakt und quadratisch. Lange Prompttexte werden nicht auf der Vorderseite erzwungen, sondern über die Detailansicht lesbar gemacht.

### Ordner-Karten

Ordner gruppieren Prompts oder weitere Ordner. Ein Klick auf eine Ordnerkarte öffnet die jeweilige Ebene, solange der Sortiermodus nicht aktiv ist. Die Breadcrumb-Navigation zeigt den aktuellen Pfad und erlaubt den direkten Sprung auf frühere Ebenen.

### Platzhalter-System

Platzhalter werden im Prompttext mit drei Sternchen markiert, zum Beispiel `***Patientenname***`. RadPrompt erkennt diese Platzhalter automatisch und erzeugt passende Eingabefelder auf der Karte. Beim Kopieren ersetzt die Anwendung alle Vorkommen des Platzhalters durch den eingegebenen Wert.

Der Spezialplatzhalter `***Modalität***` wird als Dropdown dargestellt und bietet die Optionen:

- CT
- MRT
- Röntgen
- CT&MRT

Wenn ein Eingabefeld leer bleibt, verwendet RadPrompt den Platzhalternamen als lesbaren Fallback. Dadurch wird der Kopiervorgang nicht blockiert.

### Prof.-Schäfer-Prompts

Prompts können als Prof.-Schäfer-Prompts markiert werden. In diesem Fall kopiert RadPrompt zusätzlich zum eigentlichen Prompt die hinterlegten CT- und MRT-Befundbeispiele aus `data.js`. Dies eignet sich für Promptvorlagen, die Beispiele oder Stilreferenzen benötigen.

### Favoriten

Jede Karte kann über den Sternbutton oder das Kontextmenü als Favorit markiert werden. Die Favoritenleiste liegt am unteren Rand, bleibt dezent eingefahren und klappt bei Hover aus. Favorisierte Prompts können direkt kopiert werden; favorisierte Ordner öffnen ihren Zielordner.

### Immer-im-Vordergrund-Modus

Der Pin-Button in der Kopfleiste öffnet RadPrompt in einem schwebenden Always-on-top-Fenster, sofern der Browser die Document-Picture-in-Picture-API unterstützt. Die Anwendung wird dabei mit ihrem aktuellen Zustand in das Vordergrundfenster verschoben und beim Schließen automatisch in die normale Seite zurückgeführt. Falls der Browser diese API nicht anbietet, zeigt RadPrompt eine klare Toastmeldung, statt eine nicht funktionierende Browser- oder Betriebssystemfunktion vorzutäuschen.

### Kontextmenü

Per Rechtsklick auf eine Karte öffnet sich ein eigenes Kontextmenü mit zur Kartenart passenden Aktionen:

- Prompt kopieren, wenn es sich um einen Prompt handelt
- Ordner öffnen, wenn es sich um einen Ordner handelt
- Favorit setzen oder entfernen
- Details anzeigen
- Bearbeiten
- Löschen

Das Menü bleibt innerhalb des sichtbaren Viewports, schließt bei externem Klick oder Escape und nutzt dieselbe visuelle Sprache wie die übrige Oberfläche.

### Detailansicht und Karten-Flip

Der Erweiterungsbutton dreht eine Karte per 3D-Flip auf die Rückseite. Dort werden Prompttexte, Ordnerinformationen und Verwaltungsaktionen angezeigt. Die Rückseite ist scrollbar, damit lange Inhalte lesbar bleiben, ohne andere Karten zu überdecken.

### Bearbeiten und Hinzufügen

Über die Header-Buttons lassen sich neue Prompts und Ordner erstellen. Bestehende Elemente können über die Kartenrückseite oder das Kontextmenü bearbeitet werden. Die Modalformulare enthalten Titel, Prompttext und die Option, einen Prompt als Prof.-Schäfer-Prompt zu markieren.

### Löschen

Elemente können über die Kartenrückseite oder das Kontextmenü gelöscht werden. Beim Löschen wird das Element aus der aktuellen Ebene entfernt und auch aus der Favoritenliste bereinigt.

### Sortiermodus

Der Sortierbutton aktiviert Drag & Drop. Im Sortiermodus werden Karten als ziehbar markiert, Ordner öffnen nicht versehentlich durch Klick, und SortableJS speichert die neue Reihenfolge nach Abschluss des Ziehens.

### Navigation

- Zurückbutton: geht eine Ebene nach oben.
- Breadcrumb: springt direkt zu einer übergeordneten Ebene.
- Freie Fläche in einem leeren Ordner: geht eine Ebene zurück.
- Favoritenleiste: öffnet Ordner oder kopiert Prompts.
- Pin-Button: schaltet den Immer-im-Vordergrund-Modus über Document Picture-in-Picture ein oder aus.
- Escape: schließt Kontextmenü, Modal und aufgeklappte Karten.

## Design im Detail

RadPrompt nutzt eine dunkle Oberfläche mit transparenten Glasschichten. Der Hintergrund besteht aus animierten Farb-Orbs in Indigo, Pink und Cyan, die durch starke Unschärfe weich wirken. Ein dezentes Noise-Overlay verhindert sterile Flächen. Karten, Modale, Buttons und Favoritenleiste verwenden halbtransparente Hintergründe, feine Linien und Glow-Zustände.

Die Interaktion ist bewusst federnd, aber nicht verspielt. Buttons heben sich leicht an, Hover-Zustände bleiben subtil, und Sortier- bzw. Drag-Zustände geben klare visuelle Rückmeldung. Nutzerinnen und Nutzer sollen jederzeit verstehen, was klickbar, ziehbar, aktiv oder gefährlich ist.

## Datenmodell

Die Anwendung arbeitet mit einer Baumstruktur. Der Root-Knoten enthält Kinder. Jedes Kind ist entweder ein Ordner oder ein Prompt.

Ein Prompt enthält typischerweise:

- `id`: eindeutige Kennung
- `type: "prompt"`
- `title`: sichtbarer Titel
- `text`: Prompttext mit optionalen Platzhaltern
- `isSchaefer`: optionaler Schalter für zusätzliche Befundbeispiele

Ein Ordner enthält typischerweise:

- `id`: eindeutige Kennung
- `type: "folder"`
- `title`: sichtbarer Titel
- `children`: untergeordnete Prompts und Ordner

## Speicherung und Synchronisation

RadPrompt lädt beim Start bevorzugt den Zustand über `/api/kv`. Wenn Cloudflare KV erreichbar und befüllt ist, werden Daten und Favoriten aus dem KV übernommen. Wenn der Abruf fehlschlägt oder kein nutzbarer KV-Zustand existiert, fällt die Anwendung auf `localStorage` zurück. Änderungen werden immer lokal gespeichert und zusätzlich per POST an die KV-API gesendet.

## Technologie-Stack

- HTML5 als statische App-Hülle
- CSS3 für Aero-Glass-Design, quadratisches Raster, Animationen und Responsive-Skalierung
- Vanilla JavaScript für Rendering, Zustand, Navigation, Clipboard, Kontextmenü, Vordergrundmodus und Modalverwaltung
- Tailwind CSS via CDN für Utility-Klassen im Markup
- GSAP via CDN für weiche Eintritts- und Menüanimationen
- SortableJS via CDN für Drag & Drop
- Cloudflare Pages Functions für die serverlose KV-Anbindung

## Projektstruktur

```text
/
├── index.html              # Hauptdokument, App-Container, Modal, Kontextmenü, Toast-Zone
├── style.css               # Designsystem, Layout, Karten, Kontextmenü, Modale, Animationen
├── data.js                 # Initialdaten und Prof.-Schäfer-Befundbeispiele
├── app.js                  # App-Logik, Rendering, Navigation, Aktionen, Persistenz
└── functions/
    └── api/
        └── kv.js           # Cloudflare Pages Function für GET/POST des App-Zustands
```

## Deployment auf Cloudflare Pages

RadPrompt benötigt keinen Build-Schritt.

1. Repository zu GitHub hochladen.
2. In Cloudflare **Workers & Pages** öffnen.
3. **Create application** → **Pages** → **Connect to Git** wählen.
4. Repository auswählen.
5. Framework Preset auf **None** setzen.
6. Build Command leer lassen.
7. Build Output Directory leer lassen oder `/` verwenden.
8. Deployment starten.

### KV-Binding

Für Cloud-Synchronisation muss ein KV-Namespace als `RADPROMPT_KV` gebunden werden.

1. Cloudflare Pages-Projekt öffnen.
2. **Settings** → **Functions** → **KV namespace bindings** öffnen.
3. Binding hinzufügen:
   - Variable name: `RADPROMPT_KV`
   - KV namespace: gewünschter Namespace
4. Speichern.
5. Deployment neu auslösen, damit die Bindung aktiv wird.

Ohne KV-Binding bleibt RadPrompt durch den lokalen Fallback nutzbar, synchronisiert dann aber nicht geräteübergreifend.

## Bedienhinweise

- Linksklick auf Ordner: öffnen.
- Rechtsklick auf Karte: Kontextmenü.
- Stern: Favorit umschalten.
- Kopierbutton: Prompt mit ausgefüllten Platzhaltern kopieren.
- Erweiterungsbutton: Detailseite der Karte anzeigen.
- Sortierbutton: Drag-&-Drop-Modus aktivieren oder deaktivieren.
- Pin-Button: Anwendung in ein schwebendes Vordergrundfenster verschieben, sofern vom Browser unterstützt.
- Escape: Oberfläche schnell beruhigen und Overlay-Zustände schließen.

## Barrierearme Aspekte

Die Anwendung verwendet klare Fokus- und Hover-Zustände, `aria-live` für Toastmeldungen, beschriftete Headeraktionen und reduzierte Bewegungen bei aktivierter Systemeinstellung `prefers-reduced-motion`. Die Interaktionsflächen sind bewusst groß gehalten, und kritische Aktionen erhalten eine rote Gefahrenfarbe.

## Lokale Nutzung

Da die App `fetch('/api/kv')` nutzt, ist ein lokaler statischer Server sinnvoll. Ohne Cloudflare Function schlägt der KV-Abruf lokal erwartungsgemäß fehl; die Anwendung verwendet dann automatisch `localStorage`.

Beispiel:

```bash
python3 -m http.server 8000
```

Danach im Browser öffnen:

```text
http://localhost:8000
```

## Qualitätsziel

RadPrompt soll sich nicht wie eine technische Promptliste, sondern wie ein präzises Arbeitsinstrument anfühlen: stabil im Layout, klar in der Hierarchie, schnell in der Handhabung, angenehm im Blickfeld und robust gegenüber langen Titeln, vielen Platzhaltern, tiefen Ordnerstrukturen und temporär nicht erreichbarer Cloud-Synchronisation.
