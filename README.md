# RadPrompt

Eine zeitgemäße, modern gestaltete Hilfsanwendung zur Verwendung unter Windows 11 (und allen anderen Betriebssystemen). Die Anwendung wird als Cloudflare Page gehostet und benötigt keine speziellen Build-Schritte beim Deployen. Wrangler wird nicht benötigt.

## Zweck

Zweck der Anwendung ist es, per Mausklick auf Buttons vollständige Prompt-Templates für eine KI in die Zwischenablage zu kopieren. Zudem gibt es die Möglichkeit, die Templates in verschiedene Ordner zu sortieren. Die Anwendung ist als kompaktes Schnellzugriffsboard mit Buttons (ähnlich einem großen Widget) konzipiert, welches man praktisch neben dem Browserfenster positionieren kann und zum Arbeiten schnell erreicht.

## Features

- **Aero-Glass & Milchglasoptik**: Minimalistisches, zurückhaltendes, hochwertiges Design in dunklen Grau- und Schwarztönen mit sanften Animationen und Effekten.
- **Widget-Streifen**: Die Anwendung wird als länglicher Widget-Streifen dargestellt, welcher alle Promptkarten anzeigt.
- **4er-Reihen-Layout**: Die einzelnen Karten sind im Grundzustand quadratisch und werden in 4er-Reihen auf der Hauptansicht angezeigt (skalieren responsiv auf kleineren Geräten).
- **3D-Karten-Flip**: Mit einem Erweitern-Knopf kann man die Karte in einer Animation flippen und vergrößern, um den gesamten Prompttext zu lesen, zu editieren oder zu verschieben.
- **Drag & Drop**: Ordner und Prompts können per Drag & Drop sortiert werden.
- **Platzhalter-System**: Sonderprompts enthalten Platzhalter (markiert mit `***PLATZHALTER***`). Bei den zugehörigen Knöpfen existieren Eingabe- oder Dropdown-Felder, um die Platzhalter auszufüllen. Beim Klick auf den Knopf wird der fertig ausgefüllte Prompt kopiert.
  - Der Platzhalter `***Modalität***` bietet immer ein Dropdown mit: CT, MRT, Röntgen, CT&MRT.
- **Prof. Schäfer Prompts**: Bei als "Schäfer-Prompt" markierten Templates wird neben dem Prompttext zusätzlich noch der Inhalt der CT- und MRT-Befundbeispiele in die Zwischenablage kopiert.
- **Favoriten-Bar**: Eine dezent am unteren Viewportrand ausklappbare Bar mit Schnellzugriff auf zuvor markierte Buttons.
- **Einfache Navigation**: Ein Klick auf einen freien Bereich der Anwendung führt eine Ebene zurück.
- **Cloudflare KV Synchronisation**: Prompts und Ordner werden in einem Cloudflare Workers KV gespeichert, sodass der Stand egal wo man die Anwendung öffnet immer der gleiche ist. Falls der KV nicht erreichbar ist, wird automatisch ein lokaler Fallback (`localStorage`) verwendet.

## Technologie-Stack

- HTML5, CSS3, Vanilla JavaScript (ES6+)
- Tailwind CSS (via CDN)
- GSAP (via CDN) für flüssige Animationen
- SortableJS (via CDN) für Drag & Drop
- Cloudflare Pages Functions (für die serverlose KV-Anbindung)

## Projektstruktur

```text
/
├── index.html              # Haupt-HTML-Dokument
├── style.css               # State-of-the-Art Aero-Glass & UI/UX Styles
├── data.js                 # Initiale Datenstruktur & Start-Prompts
├── app.js                  # Core-Logik (Rendering, Navigation, KV-Sync, Clipboard)
└── functions/
    └── api/
        └── kv.js           # Cloudflare Pages Function (API-Brücke zum KV)
```

## Deployment auf Cloudflare Pages

Diese Anwendung erfordert keine Build-Schritte. Gehe wie folgt vor, um sie direkt aus einem GitHub-Repository auf Cloudflare Pages zu deployen:

### 1. Code in GitHub hochladen
Lade alle Dateien in der exakten Projektstruktur in ein neues GitHub-Repository hoch.

### 2. Cloudflare Pages einrichten
1. Melde dich im [Cloudflare Dashboard](https://dash.cloudflare.com/) an.
2. Navigiere zu **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Wähle dein GitHub-Repository aus und autorisiere Cloudflare.
4. Konfiguriere das Deployment:
   - **Framework preset**: Keines (None)
   - **Build command**: *(leer lassen)*
   - **Build output directory**: `/` (oder leer lassen, da die Dateien im Root liegen)
5. Klicke auf **Save and Deploy**. Die erste Version ist nun online, aber die Synchronisation funktioniert noch nicht, da der KV fehlt.

### 3. KV-Namespace anbinden
Damit die Anwendung Daten global speichern kann, musst du den Cloudflare Workers KV anbinden.

1. Gehe im Cloudflare Dashboard auf **Workers & Pages** und wähle deine neu erstellte **RadPrompt** Page aus.
2. Klicke auf den Reiter **Settings**.
3. Scrolle nach unten zu **Functions** und klicke auf **KV namespace bindings**.
4. Klicke auf **Add binding**:
   - **Variable name**: `RADPROMPT_KV` *(muss exakt so geschrieben werden)*
   - **KV namespace**: Wähle den Namespace mit der ID `9e6bc961684e4b928ef276bd2ff1adb2` aus dem Dropdown-Menü aus. (Falls er nicht existiert, erstelle ihn unter Workers & Pages -> KV).
5. Klicke auf **Save**.
6. **Wichtig:** Gehe auf den Reiter **Deployments**, klicke auf dein aktuelles Deployment und wähle **Retry deployment** (oder mache einen neuen Commit, um ein neues Deployment auszulösen). Die Bindung wird erst bei einem neuen Deployment aktiv!
