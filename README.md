# RadPrompt

Kompaktes Prompt-Board für radiologische KI-Workflows – als Widget neben dem Arbeitsfenster nutzbar. Statische Cloudflare Page **ohne Build-Schritt**, Persistenz via Workers KV (`RADPROMPT_KV`) mit automatischem localStorage-Fallback.

## Deployment (GitHub → Cloudflare Pages)

1. **Repo:** Dieses Verzeichnis unverändert als GitHub-Repository pushen (`index.html`, `functions/`, `assets/` im Root).
2. **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git** → Repo wählen.
   - Framework preset: **None** · Build command: *(leer)* · Output directory: `/`
3. **KV anlegen:** Dashboard → **Storage & Databases → KV → Create Namespace** (z. B. `radprompt-data`).
4. **Binding:** Pages-Projekt → **Settings → Bindings → Add → KV Namespace**
   - Variable name: `RADPROMPT_KV` (exakt) · Namespace: der eben angelegte · für **Production** setzen.
5. **Redeploy.** Badge oben rechts zeigt danach **„Cloud KV"**. Ohne Binding läuft alles im **lokalen Modus** (Badge „lokal").

## Widget-Bedienung

- **Klick auf Karte** → Prompt in Zwischenablage (Ripple + Toast). Karten mit `***NAME***` zeigen Felder direkt auf der Karte; `***Modalität***` → Dropdown CT/MRT/Röntgen/CT&MRT; `***THEMA***` etc. → Textfeld. „Ausfüllen & Kopieren" liefert den fertigen Prompt.
- **Schäfer-Prompts** (Toggle „Schäfer-Dokumente anhängen") kopieren zusätzlich beide Beispielbefund-Dokumente mit.
- **Suche** in der Topbar filtert das Board live. **Strg K / ⌘K** öffnet die **Schnellsuche** (Command-Palette): tippen → ↑↓ → ↵ kopiert (bzw. springt zu den Platzhalterfeldern).
- **Favoriten** über die goldene ★-Pille als eigene Ansicht; Markierung per ★ im Editor.
- **Kompaktmodus** (☰-Icon) verkleinert die Buttons für maximale Dichte im schmalen Sidepanel.
- **Ordner:** Pillen oben, per Drag sortierbar, Rechtsklick = Umbenennen/Löschen, `+`-Pille legt neue an.
- **Drag & Drop:** Karten innerhalb des Ordners sortieren, auf eine Ordner-Pille ziehen zum Verschieben.
- **⋯-Menü:** Neues Template/Ordner, Backup **Export/Import** (JSON).

## Responsivität

Das Grid ist fluid (`auto-fill / minmax`) und passt die Spaltenzahl automatisch an jede Breite an – von ~280 px (schmales Desktop-Sidepanel, 2 Spalten) über Tablet bis Desktop. Sticky Topbar, horizontal scrollbare Ordner-Pillen, `100dvh`-Layout und `safe-area`-Insets machen es auch als installierte PWA / auf Mobile sauber bedienbar.

## Struktur

```
index.html              Single-File-App (kein Build)
functions/api/data.js   Pages Function: GET/PUT → KV "data"
assets/schaefer_ct.txt  Befundbeispiele Prof. Schäfer CT
assets/schaefer_mrt.txt Befundbeispiele Prof. Schäfer MRT
```

## Startset

9 Prompts in 2 Ordnern: **Befundung** (Bildinterpretation I/II, Interpretation Revision, Schäfer Befundstil + Revision) · **Wissen & Protokoll** (Protokoll- & Befundungshilfe, Befund-Korrektur, Übersicht Plus, Staging-Hilfe).
