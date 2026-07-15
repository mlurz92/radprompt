# RadPrompt

RadPrompt ist ein fokussiertes, dunkles Schnellzugriffsboard für radiologische KI-Prompts mit dynamischer Ordnerkopfzeile und eigenem SVG-App-Icon. Die Anwendung organisiert Promptvorlagen, Ordner, Favoriten, Platzhalter und Verwaltungsaktionen in einem kompakten Desktop-Widget, das im Befundungsalltag neben RIS, PACS, Browser oder KI-Chat offen bleiben kann.

Die App ist bewusst nicht als allgemeine Notizsammlung gestaltet, sondern als präzises Arbeitsinstrument: wenige Klicks, klare Zustände, robuste Kopierlogik, stabile Kartengeometrie und ein ruhiges Milchglas-Interface für lange radiologische Arbeitssitzungen.

---

## Inhaltsverzeichnis

1. [Ziel und Grundidee](#ziel-und-grundidee)
2. [Typischer Arbeitsablauf](#typischer-arbeitsablauf)
3. [Oberfläche im Überblick](#oberfläche-im-überblick)
4. [Kartenkonzept](#kartenkonzept)
5. [Prompts](#prompts)
6. [Ordner und Navigation](#ordner-und-navigation)
7. [Platzhalter-System](#platzhalter-system)
8. [Favoritenleiste](#favoritenleiste)
9. [Kopieren und Clipboard-Verhalten](#kopieren-und-clipboard-verhalten)
10. [Detailansicht, Flip und Kartenrückseite](#detailansicht-flip-und-kartenrückseite)
11. [Kontextmenü](#kontextmenü)
12. [Bearbeiten, Hinzufügen und Löschen](#bearbeiten-hinzufügen-und-löschen)
13. [Sortiermodus](#sortiermodus)
14. [Immer-im-Vordergrund-Modus](#immer-im-vordergrund-modus)
15. [Persistenz und Synchronisation](#persistenz-und-synchronisation)
16. [Designsystem und UX-Philosophie](#designsystem-und-ux-philosophie)
17. [Responsives Verhalten](#responsives-verhalten)
18. [Tastatur, Fokus und barrierearme Details](#tastatur-fokus-und-barrierearme-details)
19. [Datenmodell](#datenmodell)
20. [Projektstruktur](#projektstruktur)
21. [Technologien](#technologien)
22. [Lokale Nutzung](#lokale-nutzung)
23. [Cloudflare-Pages-Deployment](#cloudflare-pages-deployment)
24. [Pflege, Erweiterung und Qualitätsregeln](#pflege-erweiterung-und-qualitätsregeln)

---

## Ziel und Grundidee

RadPrompt löst ein sehr konkretes Problem: Radiologische Promptvorlagen sollen schnell verfügbar sein, ohne dass sie in Textdateien, Chatverläufen, Tabellen oder unsortierten Lesezeichen gesucht werden müssen.

Die Kernidee besteht aus vier Schritten:

1. **Prompt oder Ordner finden.** Die Startansicht zeigt ein dreispaltiges Kartenraster mit Ordnern und Prompts.
2. **Optionale Angaben ergänzen.** Platzhalter im Prompt werden automatisch als Eingabefelder auf der Karte angezeigt.
3. **Prompt kopieren.** Ein Klick auf den Kopierbutton schreibt den fertigen Prompt in die Zwischenablage.
4. **In das Zielsystem einfügen.** Der kopierte Text kann in ChatGPT, ein anderes KI-Werkzeug oder eine interne Arbeitsumgebung eingefügt werden.

Das Ziel ist maximale Geschwindigkeit bei minimaler kognitiver Last. Die Anwendung hält die Bedienoberfläche klein, visuell konstant und jederzeit verständlich.

---

## Typischer Arbeitsablauf

Ein typischer Ablauf sieht so aus:

1. RadPrompt wird im Browser oder im schwebenden Vordergrundfenster geöffnet.
2. Auf der obersten Ebene erscheinen Ordner wie radiologische Bildinterpretation, Stilvorlagen oder Protokollbereiche.
3. Ein Ordner wird geöffnet.
4. Eine Promptkarte zeigt Titel und eventuell Eingabefelder wie klinische Angaben oder Fragestellung.
5. Die Felder werden ausgefüllt.
6. Der Kopierbutton auf der Karte wird gedrückt.
7. RadPrompt ersetzt alle passenden Platzhalter im Prompttext.
8. Der fertige Prompt landet in der Zwischenablage.
9. Eine Toastmeldung bestätigt den Erfolg.
10. Der Prompt kann unmittelbar in das Zielsystem eingefügt werden.

Für häufig genutzte Prompts kann der Stern aktiviert werden. Danach steht der Prompt in der Favoritenleiste am unteren Rand bereit und muss nicht erneut gesucht werden.

---

## Oberfläche im Überblick

Die Anwendung besteht aus folgenden Hauptbereichen:

### Hintergrund

Der Hintergrund verwendet animierte, weichgezeichnete Farborbs in Indigo, Pink und Cyan. Ein kaum sichtbares Noise-Overlay verhindert flache, sterile Flächen. Dadurch entsteht eine moderne, dunkle Arbeitsatmosphäre mit Tiefe, ohne den Inhalt zu überstrahlen.

### App-Icon

Das Projekt enthält ein eigenes SVG-App-Icon unter `assets/app-icon.svg`. Es kombiniert eine dunkle Glas-Kachel, radiologische Scanbögen, einen diagonalen Prompt-/Expand-Hinweis und das Monogramm **RP**. Das Icon ist im HTML als SVG-Favicon und Apple-Touch-Icon eingebunden und ersetzt damit generische Browser- oder Default-Darstellungen.

### Widget-Container

Das zentrale Widget ist eine große Glasfläche mit abgerundeten Ecken, halbtransparenter dunkler Füllung, Blur, Sättigung, feinem Rahmen und Schatten. Auf Desktopgrößen bleibt es als Fenster im Viewport zentriert. Auf kleinen Viewports nimmt es die gesamte Fläche ein.

### Kopfzeile

Die Kopfzeile enthält:

- den Zurückbutton, sobald man sich in einem Unterordner befindet,
- eine dynamische Titelzeile, die nicht statisch den Appnamen zeigt, sondern immer den aktuell geöffneten Ordner nennt,
- eine Breadcrumb-Navigation auf größeren Ansichten,
- eine kompakte, zusammengefasste Buttonleiste für neue Prompts, neue Ordner, Sortiermodus und Pin-Modus,
- schmalere Aktionsbuttons mit reduzierter Polsterung, damit die Werkzeugleiste weniger Höhe und Breite beansprucht,
- den Pin-Button für den Immer-im-Vordergrund-Modus.

### Kartenraster

Das Kartenraster ist der Hauptarbeitsbereich. Es zeigt konstant drei Spalten und nutzt quadratische Karten. Das Raster ist vertikal scrollbar, bleibt aber in der Appfläche eingebettet.

### Favoritenleiste

Die Favoritenleiste sitzt am unteren Rand als semitransparente Milchglasleiste. Sie ist dezent eingefahren und fährt bei Hover aus. Sie überlagert nur mit ihrer eigenen sichtbaren Fläche die Karten; das Kartenraster wird nicht künstlich abgeschnitten, nur weil die Viewporthöhe klein ist.

### Overlays

Zusätzlich gibt es ein Modaloverlay für Formulare, ein eigenes Kontextmenü für Rechtsklickaktionen und Toastmeldungen für Rückmeldungen.

---

## Kartenkonzept

Karten sind die zentrale visuelle Einheit der App. Jede Karte steht entweder für einen Prompt oder einen Ordner.

Wichtige Eigenschaften:

- **Quadratisches Format:** Jede Karte nutzt ein 1:1-Seitenverhältnis.
- **Drei-Spalten-Raster:** Die App hält auf Desktop und kompakten Ansichten ein stabiles Dreispaltenlayout.
- **Glasoptik:** Karten besitzen transparente dunkle Hintergründe, Blur, feine Rahmen und dezente Schatten.
- **Klare Aktionszonen:** Titel, Eingabefelder, Kopierbutton, Favoritenstern und Erweiterungsbutton haben getrennte Bereiche.
- **Keine Button-Überlagerung:** Die Vorderseite reserviert am unteren Rand Platz für Kopier- und Erweiterungsaktionen. Eingabefelder und Inhalt laufen nicht unter die Buttons.
- **Hover-Feedback:** Kartenrahmen und Schatten reagieren subtil auf den Mauszeiger.
- **Flip-Fähigkeit:** Jede Karte kann auf eine Rückseite mit Details und Verwaltungsaktionen gedreht werden.

Die Karten sind bewusst kompakt. Lange Prompttexte gehören nicht auf die Vorderseite, sondern in die Rückseite oder in das Bearbeitungsmodal.

---

## Prompts

Eine Promptkarte zeigt mindestens einen Titel. Wenn der Prompttext Platzhalter enthält, erzeugt RadPrompt automatisch Eingabefelder auf der Vorderseite.

Promptkarten bieten:

- Titelanzeige,
- automatische Platzhalterfelder,
- Kopierbutton,
- Favoritenstern,
- Erweiterungsbutton,
- Detailrückseite mit vollständigem Prompttext,
- Bearbeiten- und Löschen-Aktionen auf der Rückseite,
- Rechtsklick-Kontextmenü.

Prompts können zusätzlich als **Prof.-Schäfer-Prompt** markiert werden. Dann werden beim Kopieren automatisch hinterlegte CT- und MRT-Befundbeispiele an den Prompt angehängt.

---

## Ordner und Navigation

Ordner strukturieren die Prompts hierarchisch. Ein Ordner kann weitere Ordner oder Prompts enthalten.

Navigationsmöglichkeiten:

- **Linksklick auf Ordnerkarte:** öffnet den Ordner.
- **Zurückbutton:** wechselt eine Ebene nach oben.
- **Breadcrumb:** erlaubt den direkten Sprung zu einer höheren Ebene.
- **Favoriten-Ordner:** öffnet den gespeicherten Zielordner aus der Favoritenleiste.
- **Leerer Ordner:** zeigt einen Empty State; ein Klick auf die freie Fläche geht zurück.

Während der Sortiermodus aktiv ist, wird das versehentliche Öffnen von Ordnern verhindert, damit Drag & Drop zuverlässig bleibt.

---

## Platzhalter-System

RadPrompt erkennt Platzhalter im Prompttext anhand des Musters:

```text
***Name des Platzhalters***
```

Beispiele:

```text
Klinische Angaben: ***Klinische Angaben***
Fragestellung: ***Fragestellung***
Modalität: ***Modalität***
```

Beim Rendern einer Promptkarte passiert Folgendes:

1. Der Prompttext wird nach Platzhaltern durchsucht.
2. Doppelte Platzhalter werden zusammengeführt.
3. Für jeden eindeutigen Platzhalter wird ein Eingabeelement erzeugt.
4. Beim Kopieren werden alle Vorkommen dieses Platzhalters ersetzt.

### Spezialplatzhalter `Modalität`

Der Platzhalter `***Modalität***` wird nicht als Texteingabe, sondern als Auswahlfeld dargestellt.

Verfügbare Optionen:

- CT
- MRT
- Röntgen
- CT&MRT

### Leere Eingaben

Wenn ein Eingabefeld leer bleibt, verwendet RadPrompt den Namen des Platzhalters als Fallback. Dadurch wird der Kopiervorgang nicht blockiert und der Prompt bleibt lesbar.

---

## Favoritenleiste

Die Favoritenleiste ist ein bewusst zurückhaltender Schnellzugriff am unteren Rand.

Eigenschaften:

- semitransparente Milchglasoptik,
- Blur und Saturation für echte Glasschichtwirkung,
- eingefahrener Ruhezustand,
- ausfahrender Hover-Zustand,
- Griffmarkierung in der Mitte,
- Favoritenlabel mit Sternsymbol,
- horizontale Liste favorisierten Inhalte,
- horizontales Scrollen bei vielen Einträgen.

Wichtiges Layoutverhalten: Die Leiste nimmt dem Kartenraster keinen festen vertikalen Arbeitsraum mehr weg. Bei geringer Viewporthöhe darf ausschließlich die Favoritenleiste selbst Inhalte überlagern. Karten werden also nicht vorzeitig abgeschnitten, nur weil unterhalb noch ein Footer-Container reserviert wäre.

Favoritenverhalten:

- Ein Prompt-Favorit kopiert den Prompt direkt.
- Ein Ordner-Favorit navigiert in den Ordner.
- Ein leerer Favoritenzustand zeigt den Hinweis **Keine Favoriten markiert**.
- Gelöschte Elemente werden aus den Favoriten entfernt.

---

## Kopieren und Clipboard-Verhalten

Der Kopierbutton sitzt links unten auf Promptkarten. Er verwendet eine eigene reservierte Aktionszone, damit er keine Texte, Eingabefelder oder sonstigen Kartenelemente überdeckt.

Beim Kopieren:

1. Der Originalprompt wird geladen.
2. Alle sichtbaren Platzhalterfelder der Karte werden ausgelesen.
3. Die Platzhaltermuster werden im gesamten Prompt ersetzt.
4. Bei Prof.-Schäfer-Prompts werden CT- und MRT-Beispiele ergänzt.
5. Die App versucht, den Text über `navigator.clipboard.writeText` zu kopieren.
6. Falls die moderne Clipboard-API nicht verfügbar ist, nutzt RadPrompt einen Textarea-Fallback mit `document.execCommand('copy')`.
7. Eine Toastmeldung meldet Erfolg oder Fehler.

Diese zweistufige Strategie sorgt dafür, dass die Kopierfunktion auch in restriktiveren Browserumgebungen möglichst robust bleibt.

---

## Detailansicht, Flip und Kartenrückseite

Der Erweiterungsbutton sitzt rechts unten. Auch er hat eine eigene reservierte Fläche und überlappt die Eingabefelder nicht.

Beim Klick dreht sich die Karte per 3D-Flip auf die Rückseite.

Die Rückseite enthält:

- den Kartentitel,
- bei Prompts den vollständigen Prompttext,
- bei Ordnern eine kurze Information zur Anzahl der enthaltenen Elemente,
- Aktionsbuttons zum Bearbeiten, Löschen und Zurückdrehen.

Lange Prompttexte sind auf der Rückseite scrollbar. Dadurch bleibt die Karte geometrisch stabil, ohne lange Inhalte in andere Bereiche laufen zu lassen.

---

## Kontextmenü

Per Rechtsklick auf eine Karte öffnet RadPrompt ein eigenes Kontextmenü. Es erscheint an der Klickposition, wird aber so positioniert, dass es innerhalb des sichtbaren Viewports bleibt.

Mögliche Aktionen:

- Prompt kopieren,
- Ordner öffnen,
- als Favorit markieren oder Favorit entfernen,
- Details anzeigen,
- bearbeiten,
- löschen.

Das Menü schließt bei Klick außerhalb, nach Ausführen einer Aktion oder mit Escape. Es nutzt dieselbe dunkle Glasoptik wie die übrige App.

---

## Bearbeiten, Hinzufügen und Löschen

### Prompt hinzufügen

Der Button **+ Prompt** öffnet ein Modal mit:

- Titel,
- Prompttext,
- Auswahl, ob der Prompt ein Prof.-Schäfer-Prompt ist.

### Ordner hinzufügen

Der Button **+ Ordner** öffnet ein Modal mit Titelangabe. Neue Ordner werden in der aktuellen Ebene erstellt.

### Bearbeiten

Bestehende Prompts und Ordner können über die Kartenrückseite oder das Kontextmenü bearbeitet werden. Beim Bearbeiten wird dasselbe Modal mit den vorhandenen Werten geöffnet.

### Löschen

Löschen entfernt das Element aus der aktuellen Ebene. Zusätzlich wird die Favoritenliste bereinigt, damit keine toten Favoriteneinträge übrig bleiben.

---

## Sortiermodus

Der Sortierbutton schaltet Drag & Drop ein oder aus.

Im aktiven Sortiermodus:

- Karten erhalten einen Sortierzustand,
- der Cursor signalisiert Greifen,
- Ordner werden nicht durch einfachen Klick geöffnet,
- SortableJS übernimmt das Ziehen,
- Ghost- und Drag-Zustände geben visuelles Feedback,
- die neue Reihenfolge wird nach dem Loslassen gespeichert.

Der Sortiermodus ist bewusst explizit. Dadurch werden Navigation und Umordnung nicht verwechselt.

---

## Immer-im-Vordergrund-Modus

Der Pin-Button aktiviert den Vordergrundmodus über die Document-Picture-in-Picture-API, sofern der Browser sie unterstützt. Beim Entpinnen wird die Anwendung zuerst zuverlässig in das Hauptdokument zurückverschoben und erst danach das schwebende Fenster geschlossen. Dadurch verschwindet sie nicht komplett, sondern liegt wieder normal im Hauptfenster und darf dort wie zuvor durch andere Oberflächenbereiche überlagert werden.

Verhalten:

- RadPrompt fordert ein schwebendes Fenster an.
- Die Anwendung wird mit ihrem aktuellen DOM-Zustand in dieses Fenster verschoben.
- Stylesheets werden in das neue Fenster kopiert.
- Der Zustand bleibt erhalten.
- Escape funktioniert auch im Vordergrundfenster.
- Beim Schließen oder Entpinnen wird die Anwendung automatisch in die normale Seite zurückgeführt.
- Falls der Browser die API nicht unterstützt, erscheint eine verständliche Fehlermeldung.

Dieser Modus ist besonders nützlich, wenn RadPrompt dauerhaft neben anderen Arbeitsfenstern sichtbar bleiben soll.

---

## Persistenz und Synchronisation

RadPrompt speichert zwei Dinge:

- die Baumstruktur aus Ordnern und Prompts,
- die Liste der Favoriten.

Beim Start versucht die App zuerst, Daten über `/api/kv` zu laden. Wenn dort ein gültiger Zustand vorhanden ist, wird dieser verwendet.

Wenn der Abruf fehlschlägt oder kein nutzbarer KV-Zustand existiert, nutzt RadPrompt `localStorage`. Änderungen werden immer lokal gespeichert und zusätzlich per POST an `/api/kv` gesendet.

Dadurch entsteht ein robuster Fallback:

- Mit Cloudflare KV ist Synchronisation möglich.
- Ohne KV bleibt die Anwendung lokal nutzbar.
- Bei temporären KV-Problemen gehen lokale Änderungen nicht sofort verloren.

---

## Designsystem und UX-Philosophie

RadPrompt folgt einer dunklen, ruhigen, stark fokussierten Designphilosophie.

### Farbwelt

- fast schwarzer Basisgrund,
- helle Primärschrift,
- gedämpfte Sekundär- und Muted-Töne,
- Indigo als Akzentfarbe,
- Rot für gefährliche Aktionen,
- Cyan/Pink/Indigo-Orbs im Hintergrund.

### Glasflächen

Karten, Widget, Favoritenleiste, Modal und Kontextmenü verwenden halbtransparente Hintergründe, Blur, Sättigung und feine Rahmen. Die Favoritenleiste ist explizit als semitransparente Milchglasfläche gestaltet.

### Mikrointeraktionen

- Buttons heben sich beim Hover leicht an.
- Karten erhalten stärkere Rahmen und Schatten.
- Favoriten leuchten mit Akzentfarbe.
- Toasts erscheinen mit weicher Bewegung.
- Karten werden beim Rendern gestaffelt eingeblendet.
- Kontextmenüs skalieren kurz ein.
- Sortierzustände nutzen Ghost- und Drag-Feedback.

### Spezieller Nutzwert für Radiologie-Prompts

Radiologische Promptarbeit braucht Geschwindigkeit, Wiederholbarkeit und klare Struktur. RadPrompt unterstützt das durch:

- direkt sichtbare klinische Eingabefelder,
- reproduzierbare Prompttexte,
- schnelle Favoriten,
- Vorlagen mit Stilbeispielen,
- stabile Karten statt langer Listen,
- dunkle Oberfläche für bilddiagnostische Arbeitsplätze,
- kompakte Darstellung, die neben PACS/RIS nicht dominiert.

---

## Responsives Verhalten

RadPrompt ist auf kompakte Fenster ausgelegt.

Wichtige Regeln:

- Das Widget füllt auf kleinen Viewports die gesamte Fläche.
- Die Kopfzeile ist bewusst schmal gehalten.
- Die Werkzeugbuttons sind in einer gemeinsamen kompakten Glasleiste gruppiert.
- Auf sehr schmalen Viewports werden Buttontexte ausgeblendet und nur die Icons behalten.
- Karten bleiben quadratisch.
- Das Raster bleibt stabil.
- Das Kartenraster scrollt vertikal.
- Der sichtbare Header zeigt den aktuellen Ordner statt eines statischen Appnamens.
- Die Favoritenleiste liegt absolut am unteren Rand und reduziert nicht vorzeitig die verfügbare Rasterhöhe.
- Die untere Kartenpolsterung verhindert, dass die letzte Reihe vollständig hinter der Favoritenleiste verschwindet.
- Die Kartenaktionen besitzen reservierte Bereiche, damit Eingaben und Buttons nicht kollidieren.

---

## Tastatur, Fokus und barrierearme Details

RadPrompt enthält mehrere barrierearme und robuste Bedienaspekte:

- Headerbuttons besitzen `aria-label`-Texte.
- Toastmeldungen werden in einer `aria-live`-Region ausgegeben.
- Escape schließt Kontextmenü, Modal und aufgeklappte Karten.
- Fokus- und Hoverzustände sind visuell erkennbar.
- Gefährliche Aktionen verwenden Rot.
- Bewegungen werden bei `prefers-reduced-motion: reduce` praktisch deaktiviert.
- Interaktive Flächen sind großzügig dimensioniert.
- Modale können durch Klick auf den Hintergrund geschlossen werden.

---

## Datenmodell

Die Anwendung arbeitet mit einer Baumstruktur.

### Root-Knoten

```js
{
  id: 'root',
  type: 'folder',
  title: 'Root',
  children: []
}
```

### Prompt

```js
{
  id: 'prompt-...',
  type: 'prompt',
  title: 'Radiologische Bildinterpretation I',
  text: 'Prompttext mit ***Platzhalter***',
  isSchaefer: false
}
```

Felder:

- `id`: eindeutige Kennung,
- `type`: immer `prompt`,
- `title`: sichtbarer Kartentitel,
- `text`: vollständiger Prompttext,
- `isSchaefer`: aktiviert zusätzliche CT/MRT-Beispiele beim Kopieren.

### Ordner

```js
{
  id: 'folder-...',
  type: 'folder',
  title: 'Ordnername',
  children: []
}
```

Felder:

- `id`: eindeutige Kennung,
- `type`: immer `folder`,
- `title`: sichtbarer Kartentitel,
- `children`: enthaltene Prompts und Ordner.

### Favoriten

Favoriten werden als Array von IDs gespeichert:

```js
['prompt-1', 'folder-radiologie']
```

Beim Rendern werden diese IDs wieder auf Knoten im Datenbaum aufgelöst.

---

## Projektstruktur

```text
/
├── index.html
├── style.css
├── app.js
├── data.js
├── README.md
├── assets/
│   ├── app-icon.svg
│   ├── Befundbeispiele Prof. Schäfer CT.txt
│   └── Befundbeispiele Prof. Schäfer MRT.txt
└── functions/
    └── api/
        └── kv.js
```

### `index.html`

Enthält die statische App-Hülle: Hintergrund, Widget, Header, Kartencontainer, Footer mit Favoritenleiste, Modaloverlay, Kontextmenü, Toastcontainer und Script-/Stylesheet-Einbindungen.

### `assets/app-icon.svg`

Enthält das eigens gestaltete App-Icon als skalierbare SVG-Grafik. Es wird direkt aus `index.html` als Favicon und Touch-Icon referenziert.

### `style.css`

Definiert Designsystem, Layout, kompakten Header, Karten, Favoritenleiste, Modale, Kontextmenü, Toasts, Scrollbars, Responsive-Regeln, Picture-in-Picture-Anpassungen und reduzierte Bewegungen.

### `app.js`

Enthält die komplette Clientlogik: Zustand, Datenladen, Speichern, Rendering, Kartenbau, Platzhaltererkennung, Kopieren, Favoriten, Navigation, Sortierung, Kontextmenü, Modale, Löschen, Toasts und Vordergrundmodus.

### `data.js`

Enthält Initialdaten und die Prof.-Schäfer-Beispieltexte für CT und MRT.

### `functions/api/kv.js`

Stellt die Cloudflare-Pages-Function für `GET` und `POST` auf `/api/kv` bereit.

---

## Technologien

RadPrompt nutzt bewusst einen schlanken Stack:

- **HTML5** für die Dokumentstruktur,
- **CSS3** für Designsystem, Layout, Glasoptik, Animationen und Responsivität,
- **Vanilla JavaScript** für Appzustand und Interaktion,
- **Tailwind CSS via CDN** für einzelne Utility-Klassen im Markup,
- **Google Fonts** für Inter und JetBrains Mono,
- **GSAP** für weiche Render- und Menüanimationen,
- **SortableJS** für Drag & Drop,
- **Cloudflare Pages Functions** für optionale KV-Persistenz,
- **Cloudflare KV** als optionaler serverseitiger Speicher.

Es gibt keinen Buildprozess und keine lokale Paketabhängigkeit.

---

## Lokale Nutzung

Ein statischer Server reicht aus.

```bash
python3 -m http.server 8000
```

Danach öffnen:

```text
http://localhost:8000
```

Lokal wird `/api/kv` ohne Cloudflare-Umgebung normalerweise nicht verfügbar sein. Das ist erwartet. Die App fällt dann automatisch auf `localStorage` zurück.

---

## Cloudflare-Pages-Deployment

RadPrompt kann direkt auf Cloudflare Pages bereitgestellt werden.

1. Repository zu GitHub oder GitLab hochladen.
2. In Cloudflare **Workers & Pages** öffnen.
3. **Create application** wählen.
4. **Pages** auswählen.
5. Repository verbinden.
6. Framework Preset auf **None** setzen.
7. Build Command leer lassen.
8. Build Output Directory auf `/` beziehungsweise den Projektroot setzen.
9. Deployment starten.

### KV-Binding

Für Synchronisation muss ein KV-Namespace als `RADPROMPT_KV` gebunden sein.

1. Cloudflare-Pages-Projekt öffnen.
2. **Settings** öffnen.
3. **Functions** wählen.
4. **KV namespace bindings** öffnen.
5. Binding hinzufügen:
   - Variable name: `RADPROMPT_KV`
   - KV namespace: gewünschter Namespace
6. Speichern.
7. Neu deployen.

Ohne Binding funktioniert die App weiterhin lokal im Browser, aber ohne serverseitige Synchronisation.

---

## Pflege, Erweiterung und Qualitätsregeln

Beim Erweitern der App sollten diese Regeln eingehalten werden:

- Kartenaktionen dürfen Inhalte nicht überlagern.
- Die Kopfzeile soll den aktuellen Ordner zeigen und nicht zu einer statischen Brandingzeile zurückfallen.
- Buttonleisten sollen kompakt bleiben und die Arbeitsfläche nicht unnötig verkleinern.
- Die Favoritenleiste darf Karten nur mit ihrer sichtbaren Glasfläche überdecken.
- Neue Promptfelder sollten aus Platzhaltern abgeleitet werden, statt hart verdrahtet zu sein.
- Der Sortiermodus muss explizit bleiben.
- Cloudspeicherung darf den lokalen Fallback nicht ersetzen.
- Lange Texte gehören in scrollbare Bereiche.
- Kritische Aktionen brauchen klare visuelle Warnung.
- Neue UI-Elemente sollen die bestehende Glasoptik, Akzentfarbe, Icon-Sprache und Bewegungslogik übernehmen.
- Keine Änderung sollte die schnelle Kopierstrecke verlangsamen: finden, ausfüllen, kopieren, einfügen.

RadPrompt ist dann optimal, wenn es im Alltag kaum Aufmerksamkeit fordert und trotzdem genau im richtigen Moment den passenden Prompt bereitstellt.
