# RadPrompt

Prompt-Board für radiologische KI-Workflows. Statische Cloudflare Page ohne Build-Schritt, Persistenz via Workers KV (`RADPROMPT_KV`) mit automatischem localStorage-Fallback.

## Deployment (GitHub → Cloudflare Pages)

1. **Repo:** Dieses Verzeichnis unverändert als GitHub-Repository pushen (`index.html`, `functions/`, `assets/` im Root).
2. **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git** → Repo wählen.
   - Framework preset: **None**
   - Build command: *(leer lassen)*
   - Build output directory: `/`
3. **KV anlegen:** Dashboard → **Storage & Databases → KV → Create Namespace** → Name z. B. `radprompt-data`.
4. **Binding setzen:** Pages-Projekt → **Settings → Bindings → Add → KV Namespace**
   - Variable name: `RADPROMPT_KV` (exakt so)
   - Namespace: der eben angelegte
   - Für **Production** (und optional Preview) setzen.
5. **Redeploy** auslösen (Deployments → Retry/neuer Commit). Danach zeigt das Badge oben rechts **„Cloud KV"**.

Ohne KV-Binding läuft die App vollständig im **lokalen Modus** (Badge „lokal", Speicherung im Browser).

## Funktionsübersicht

- **Klick auf Karte** → Prompt in Zwischenablage. Karten mit Platzhaltern (`***NAME***`) zeigen Eingabefelder direkt auf der Karte; `***Modalität***` erzeugt ein Dropdown (CT/MRT/Röntgen/CT&MRT).
- **Schäfer-Prompts** (Toggle „Schäfer-Dokumente anhängen") kopieren zusätzlich beide Beispielbefund-Dokumente (`assets/schaefer_ct.txt` + `schaefer_mrt.txt`) mit.
- **Erweitern-Icon** (↗) → Editor: Text lesen/bearbeiten, Ordner wechseln, Favorit (★), löschen.
- **Drag & Drop:** Karten innerhalb des Ordners sortieren, auf Ordner-Tabs ziehen zum Verschieben; Tabs selbst sind ebenfalls per Drag sortierbar.
- **Rechtsklick auf Ordner-Tab** → Umbenennen/Löschen.
- **Favoriten-Bar:** Klick kopiert direkt (bzw. springt zu den Platzhalterfeldern), Rechtsklick öffnet den Editor.
- **Export/Import** (Header-Icons): JSON-Backup des gesamten Boards.

## Struktur

```
index.html              Single-File-App (kein Build)
functions/api/data.js   Pages Function: GET/PUT → KV "data"
assets/schaefer_ct.txt  Befundbeispiele Prof. Schäfer CT
assets/schaefer_mrt.txt Befundbeispiele Prof. Schäfer MRT
```
