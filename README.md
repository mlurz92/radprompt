# RadPrompt

Buildfreie Cloudflare-Pages-Anwendung mit Pages Functions und Workers KV.

## Deployment über GitHub + Cloudflare Dashboard

1. Inhalt dieses Ordners in ein neues GitHub-Repository hochladen.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → GitHub-Repository verbinden.
3. Framework preset: **None**.
4. Build command: `exit 0` (alternativ leer, `exit 0` aktiviert Pages Functions zuverlässig).
5. Build output directory: `/` bzw. Repository-Root.
6. Nach dem ersten Deployment: Projekt → **Settings → Bindings → Add binding → KV namespace**.
7. Variable name exakt: `RADPROMPT_KV`.
8. Namespace auswählen: ID `9e6bc961684e4b928ef276bd2ff1adb2`.
9. Binding für **Production** und bei Bedarf **Preview** anlegen, anschließend erneut deployen.

Kein Wrangler, npm, Buildsystem oder Framework erforderlich. Beim ersten Aufruf übernimmt der Client `data/seed.json` in KV.

## Datenmodell

Der vollständige Zustand liegt unter dem KV-Key `radprompt:state:v3`. Prof.-Schäfer-Prompts ergänzen beim Kopieren automatisch beide Befundbeispiel-Dokumente. Platzhalter werden aus `***NAME***` dynamisch erkannt; `***Modalität***` wird als Dropdown gerendert.

## Enthalten

- 4 importierte Prompt-Templates
- 3 initiale Ordner
- Vollständige CT- und MRT-Befundbeispiele
- Drag-and-drop-Sortierung, Favoriten, Suche, CRUD, Import/Export, PWA
