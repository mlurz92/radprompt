# RadPrompt

Build-freie Cloudflare-Pages-Anwendung für ein synchronisiertes radiologisches Prompt-Schnellzugriffsboard.

## Funktionsumfang

- **9 vollständig importierte Starttemplates** aus der beigefügten Promptdatei
- **verschachtelte Ordner**, Breadcrumbs, Ordnerkacheln und dezente Ordnernavigation
- **vier quadratische Karten pro Reihe** auf großen Viewports; adaptive 3-/2-/1-Spalten-Layouts
- zusätzlicher **Widget-Modus** für ein schmales Fenster neben dem Browser
- automatische Platzhaltererkennung für `***PLATZHALTER***`
- festes Dropdown für `***Modalität***`: CT, MRT, Röntgen, CT&MRT
- Favoritenleiste, globale Suche und Befehlsmenü
- vollständige Promptvorschau, Bearbeitung, Duplikation und Löschung
- Maus-Drag-and-drop sowie Touch-/Stift-Sortierung über Drag-Handles
- vollständige CT- und MRT-Befundbeispiele bei Prof.-Schäfer-Prompts
- lokaler Offline-Fallback und installierbare PWA
- Mehrtab-Abgleich über `BroadcastChannel`
- Cloud-Synchronisierung mit zusammenführbarer Revisionslogik und Löschmarken
- JSON-Import/-Export und Startset-Wiederherstellung
- keine npm-Pakete, kein Framework, kein Build, kein Wrangler

## Projektstruktur

```text
RadPrompt/
├── index.html
├── _headers
├── manifest.webmanifest
├── sw.js
├── README.md
├── assets/
│   ├── app.js
│   ├── styles.css
│   ├── seed.js
│   └── icon.svg
├── functions/
│   └── api/
│       ├── state.js
│       └── health.js
├── QUALITY_REPORT.md
└── tests/
    ├── smoke.mjs
    └── api.mjs
```

## Deployment über GitHub und Cloudflare Dashboard

1. Den **Inhalt** dieses Ordners in die Wurzel eines GitHub-Repositorys hochladen.
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → GitHub-Repository verbinden.
3. Framework preset: **None**.
4. **Build command leer lassen.**
5. Build output directory: `/` beziehungsweise die Repository-Wurzel.
6. Deployment ausführen.
7. Projekt → **Settings** → **Bindings** → **Add binding** → **KV namespace**.
8. Variable name exakt: `RADPROMPT_KV`.
9. Namespace auswählen: `9e6bc961684e4b928ef276bd2ff1adb2`.
10. Binding für **Production** und optional separat für **Preview** setzen.
11. Neues Deployment anstoßen.
12. `https://radprompt.pages.dev/api/health` aufrufen. Erwartet wird `"ok": true`.

## Persistenzmodell

Gemeinsamer KV-Schlüssel: `radprompt:state:v2`.

Die Anwendung schreibt maximal etwa alle 1,35 Sekunden und berücksichtigt damit das Workers-KV-Limit von einem Schreibzugriff pro Sekunde auf denselben Schlüssel. Der Server führt konkurrierende Stände elementweise anhand von `updatedAt` zusammen. Löschungen werden über Tombstones synchronisiert, damit entfernte Prompts oder Ordner nicht durch einen älteren Client erneut erscheinen.

Beim ersten Aufruf wird das lokale Startset sofort angezeigt. Ist KV leer, wird es automatisch initialisiert. Bei fehlender Verbindung arbeitet die Anwendung vollständig lokal weiter.

## Prof.-Schäfer-Prompts

Beim Kopieren eines entsprechend markierten Templates entsteht ein einzelner Klartextinhalt aus:

1. ausgefülltem Prompt,
2. Abschnitt `# Befundbeispiele Prof. Schäfer CT.txt`,
3. Abschnitt `# Befundbeispiele Prof. Schäfer MRT.txt`.

Die drei Teile sind durch eindeutig beschriftete Trenner getrennt.

## Tastatur

- `Strg/Cmd + K`: Befehlsmenü
- `Strg/Cmd + N`: neuer Prompt
- `/`: Suche fokussieren
- `Esc`: Dialog oder Menü schließen
- Pfeiltasten + Enter im Befehlsmenü

## Lokaler Test

Ein einfacher statischer Server genügt:

```bash
python -m http.server 8000 --directory .
```

Die Pages Functions laufen dabei nicht; die Anwendung zeigt kontrolliert den lokalen Offline-Modus. Für die statische Prüfung:

```bash
node tests/smoke.mjs
```
