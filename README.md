# RadPrompt

Kompakte, moderne Prompt-Board-Anwendung für Cloudflare Pages unter `radprompt.pages.dev`.

## Enthalten

- Reine No-Build-Webanwendung: `index.html`, `styles.css`, `app.js`
- Cloudflare Pages Functions:
  - `GET /api/state`
  - `PUT /api/state`
  - `GET /api/health`
- Persistenz über Workers KV Binding `RADPROMPT_KV`
- Seed-Daten aus `Beispielprompts.txt`
- Prof.-Schäfer-Textdokumente als statische Assets unter `/data/`
- Favoriten-Bar, Ordner, Drag&Drop-Sortierung, Platzhalterfelder, Modalitäts-Dropdown, Import/Export, Health-Panel
- Fallback auf `localStorage`, falls KV noch nicht gebunden ist

## Repository-Struktur

```text
radprompt-app/
├─ index.html
├─ styles.css
├─ app.js
├─ manifest.webmanifest
├─ service-worker.js
├─ _headers
├─ _redirects
├─ wrangler.toml
├─ assets/
│  └─ favicon.svg
├─ data/
│  ├─ seed.json
│  ├─ prof-schaefer-ct.txt
│  └─ prof-schaefer-mrt.txt
└─ functions/
   └─ api/
      ├─ state.js
      └─ health.js
```

## Deployment über GitHub + Cloudflare Dashboard

1. GitHub-Repository anlegen, z. B. `radprompt`.
2. Den kompletten Inhalt dieses Ordners in das Repository hochladen.
3. Cloudflare Dashboard öffnen → **Workers & Pages** → **Create application** → **Pages** → GitHub verbinden.
4. Repository auswählen.
5. Build-Konfiguration:
   - Framework preset: **None**
   - Build command: leer lassen
   - Build output directory: `/` oder leer/root, je nach Cloudflare-Maske
6. Deploy ausführen.
7. KV Namespace anlegen:
   - **Workers & Pages** → **KV** → Namespace erstellen: `RADPROMPT_KV`
8. KV Binding am Pages-Projekt setzen:
   - Pages-Projekt → **Settings** → **Bindings** → **Add** → **KV namespace**
   - Variable name: `RADPROMPT_KV`
   - Namespace: `RADPROMPT_KV`
9. Projekt erneut deployen, damit das Binding aktiv wird.
10. `https://radprompt.pages.dev/api/health` öffnen.
    - Erwartet: `ok: true`, `kv: true`, `probes.binding/read/write: true`.
11. App öffnen, auf **Seed neu laden** oder **Speichern** klicken, damit der initiale State in KV geschrieben wird.

## Lokale Prüfung optional

```bash
npx wrangler pages dev . --kv=RADPROMPT_KV
```

Dann öffnen:

```text
http://127.0.0.1:8788
http://127.0.0.1:8788/api/health
```

## Bedienung

- Prompt kopieren: Platzhalter ausfüllen → **Kopieren**.
- `***Modalität***` wird automatisch als Dropdown mit `CT`, `MRT`, `Röntgen`, `CT&MRT` gerendert.
- Prof.-Schäfer-Prompts kopieren zusätzlich `prof-schaefer-ct.txt` und `prof-schaefer-mrt.txt` in die Zwischenablage.
- Prompt bearbeiten/verschieben: **Erweitern** → Ordner ändern → **Übernehmen**.
- Drag&Drop: Promptkarten im aktiven Ordner oder Ordner links ziehen.
- Favorit: Stern auf der Karte aktivieren; erscheint in der Favoriten-Bar.
- Backup: **Export** erzeugt JSON; **Import** spielt JSON zurück.

## Hinweis

Die Anwendung enthält bewusst keine Authentifizierung. Bei öffentlicher Domain kann jeder Besucher mit Browserzugriff den KV-State ändern. Das entspricht dem geforderten einfachen Setup ohne zusätzliche Sicherungsmaßnahmen.
