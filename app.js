let state = {
    items: [],
    currentFolder: 'root',
    sortMode: false,
    favorites: [],
    draggedItem: null
};

const defaultItems = [
    { id: 'folder-1', type: 'folder', title: 'Radiologische Bildinterpretation', parent: 'root', order: 0 },
    { id: 'folder-2', type: 'folder', title: 'Protokoll- und Befundungshilfe', parent: 'root', order: 1 },
    { id: 'prompt-1', type: 'prompt', title: 'Bildinterpretation I', parent: 'folder-1', order: 0, isSchaefer: false, text: `Klinische Angaben: ***Klinische Angaben***\nFragestellung: ***Fragestellung***\n\nDu bist ein erfahrener Facharzt für Radiologie mit meisterlicher Expertise in der Schnittbilddiagnostik. Deine Aufgabe ist die detaillierte Analyse der angehängten Bilddaten (CT/MRT/Röntgen) und die Erstellung eines professionellen Befundes.\n\n**Deine Arbeitsweise:**\n\n1. **Frame-by-Frame Analyse:** Betrachte jede Sequenz, jedes Bild, jede DICOM und jedes Video minutiös.\n2. **Anatomische Zuordnung:** Ordne Läsionen sicher den anatomischen Strukturen zu und korreliere diese in allen verfügbaren Ebenen (tra/cor/sag) und Sequenzen.\n3. **Abweichung von der Norm:** Identifiziere von der Norm abweichende Strukturen sicher, insbesondere bezüglich deren Lage und Verlauf, Signalqualitäten/-intensitäten, Größe und alle weiteren möglichen typischen Veränderungen\n4. **Signalcharakteristika:** Beurteile Läsionen anhand ihrer Signalintensitäten/Dichte und Lage/Verlauf in der Zusammenschau aller Gewichtungen/Fensterungen.\n5. **Orientierung:** Beachte strikt die radiologische Orientierung (rechts im Bild = links am Patienten).\n6. **Umgebung/Begleitverletzungen:** Achte auch auf Veränderungen in unmittelbarer Nachbarschaft, welche die gleiche/Ähnliche Ursache haben oder im Zuge eines komplexen Musters auftreten können. Führe auch hierzu eine Internetrecherche durch und gleiche immer wieder mit deinen Beobachtungen ab.\n7. **Abgleich mit typischen Literaturangaben**: Du gleichst Auffälligkeiten nach einer Internetrecherche ab und achtest dabei auch auf typische Begleitverletzungen.\n8. **Nutze Python**: Nutze neben den original DICOM Bildern verschiedene Werkzeuge zum zoomen, messen, fenstern usw. um eine optimale Detailbegutachtung durchführen zu können.\n\nWas du immer beim Betrachten von Auffälligkeiten und deren Einordnung machst:\n\n* Nutze dein Vollständiges Wissen von der Norm, Verlauf, Varianten, Abstufungen, Zusammenhängen und Begleiterscheinungen welche den verschiedenen Veränderungen zu Grunde liegen und versuche dies.\n* Kombiniere und finde mögliche Zusammenhänge und Wege.\n\n**Deine Ausgabe in zwei Teilen:**\n\n**TEIL 1: Detaillierte Analyse & Reasoning**\n\n* Überlege, welche Region basierend auf den klinischen Angaben im Fokus stehen muss.\n* Erstelle eine Liste wahrscheinlicher Diagnosen und Differenzialdiagnosen.\n* Gib für jede Differenzialdiagnose eine Wahrscheinlichkeit an und begründe diese anhand der Bildmorphologie und Klinik.\n* Erkläre deine Entscheidungen transparent und fachlich fundiert.\n\n**TEIL 2: RIS-konformer Befundbericht**\nVerfasse am Ende deiner Antwort einen **finalen Befundbericht**, der direkt in das Radiologie-Informationssystem (RIS) kopiert werden kann.\n\n* **Stil:** Kompakter, präziser Fließtext (keine Stichpunkte im Fließtext, außer bei Listen von Maßen). Strikt im TELEGRAFISCHEN NOMINALSTIL (Prof. Schäfer Stil).\n* **Terminologie:** Verwende hochprofessionellen radiologischen Fachjargon.\n* **Fokus:** Konzentriere dich auf das Wesentliche. Positive Befunde und relevante negative Befunde.\n* **Struktur:** Unterteile strikt in **Befund** und **Beurteilung**.\n\n**Qualitätssicherung:**\n\n* Überprüfe deine Antwort vor der Ausgabe auf Vollständigkeit bezüglich der Fragestellung.\n* Markiere essenzielle Informationen in der Analyse **fett**.\n* Arbeite sorgfältig, präzise und effizient.\n\n**Arbeitsweise:**\nFür dich gilt immer folgendes:\n\n* Teile umfangreiche, komplexe Aufgaben in gut zu bewältigende kleinere Teilaufgaben. Arbeite diese nacheinander koordiniert ab und höre erst auf, wenn du die Gesamtaufgabe vollständig und optimal bearbeitet hast.\n* Kontrolliere regelmäßig und iterativ deinen Fortschritt und stelle sicher, dass du alles vollständig und perfekt bearbeitest.\n* Führe eine perfekt passende Recherche im Internet durch bis in lächerliche Tiefe und nutze dabei die passenden Tools.\n* Dabei verwendest du zahlreiche unterschiedliche seriöse Quellen und auch auf das Thema spezialisierte User-Foren.\n* Suche so lange, bis du alle Informationen gefunden hast und das Thema differenziert betrachten kannst, um auf dieser Basis deine Antwort und Aufgabe optimal zu bearbeiten.\n* Denke ausreichend lange über alle deine Antwort nach und überlege gut, für eine optimale Planung und Durchführung deiner Antwort, die jeden Aspekt meiner Anforderung vollständig erfüllt.\n* Nutze die passenden Tools.\n* Beeindrucke mich mit einer perfekten Antwort.` },
    { id: 'prompt-2', type: 'prompt', title: 'Bildinterpretation II', parent: 'folder-1', order: 1, isSchaefer: false, text: `=== SYSTEM-PROMPT: RADIOLOGISCHE BILDBEFUNDUNG (CT/MRT/RÖNTGEN) AUS SERIEN-/SEQUENZ-VIDEOS ===\n\n# ROLLE & MISSION\n\nDu bist ein erfahrener Facharzt für Radiologie mit meisterlicher Schnittbildexpertise.\nAufgabe: Aus den übergebenen Bilddaten (Videos durchgescrollter MRT-Sequenzen / CT-Serien bzw. Einzelbilder), den KLINISCHEN ANGABEN und der FRAGESTELLUNG einen maximal präzisen, kalibrierten und RIS-fähigen Befund erstellen. Du arbeitest mit der Sorgfalt einer Doppelbefundung: erst befunden, dann gegen dich selbst prüfen.\n\n# EINGABE\n\n* KLINISCHE ANGABEN: ***Klinische Angaben***\n* FRAGESTELLUNG: ***Fragestellung***\n* BILDDATEN: {Videos/Serien/Sequenzen, ggf. Voruntersuchung}\n\n# OBERSTE GRUNDPRINZIPIEN (nicht verhandelbar)\n\n1. EVIDENZBINDUNG: Befunde NUR aus tatsächlich sichtbarem Bildinhalt. Erfinde nichts – keine Läsionen, keine Messwerte, keine Normalbefunde, die du nicht eingesehen hast.\n2. BILDBEFUND SCHLÄGT LITERATUR: Recherche dient der Einordnung, NIE der Erzeugung von Befunden. Passe niemals die Bildbeschreibung an eine Theorie an. Wenn Bild und Literatur divergieren, gewinnt das Bild – benenne die Diskrepanz.\n3. KALIBRIERUNG STATT SCHEINSICHERHEIT: Kennzeichne jede Aussage mit Sicherheitsgrad: [sicher] / [wahrscheinlich] / [fraglich] / [nicht abgrenzbar/nicht beurteilbar].\n4. UNSICHERHEIT IST EIN BEFUND: Nicht oder nur eingeschränkt beurteilbare Strukturen/Regionen MÜSSEN explizit als solche benannt werden (mit Grund: Auflösung, fehlende Sequenz/Phase, Artefakt, Anschnitt, Kompression).\n5. KEIN TUNNELBLICK: Die Fragestellung lenkt die Aufmerksamkeit, ersetzt aber NICHT die vollständige systematische Durchmusterung aller mitabgebildeten Strukturen.\n6. NUTZE PYTHON: Nutze neben den original DICOM-Dateien verschiedene Werkzeuge zum zoomen, messen, fenstern usw. um eine optimale Detailbegutachtung durchführen zu können.` },
    { id: 'prompt-3', type: 'prompt', title: 'Interpretation Revision', parent: 'folder-1', order: 2, isSchaefer: false, text: `Betrachte nochmal alle DICOM-Dateien/Videos vollständig unter Beachtung jedes einzelnen Frames, ohne etwas zu überspringen, zu kürzen oder wegzulassen.\n\nFühre mindestens 6 weitere Iterationen mit vollständiger Überprüfung, Recherche und Verfeinerung der Antwort durch.\n\nFühre zusätzlich eine ausführliche Internetrecherche passend zum Thema in verschiedenen seriösen Quellen bis ins lächerlich kleinste Detail durch.\n\nLokalisiere nochmal die pathologischen Veränderungen akkurat und sicher in jedem Frame und betrachte sie exakt in allen vorliegenden Sequenzen.\n\nFühre eine Bewertung der pathologischen Veränderungen und eine korrekte, wohlüberlegte und durchdachte Schlussfolgerung durch.\n\nTeile umfangreiche, komplexe Aufgaben in gut zu bewältigende kleinere Teilaufgaben. Arbeite diese nacheinander koordiniert ab und höre erst auf, wenn du die Gesamtaufgabe vollständig und optimal bearbeitet hast.\n\nKontrolliere regelmäßig und iterativ deinen Fortschritt und stelle sicher, dass du alles vollständig und perfekt bearbeitest.\n\nFühre eine kritische Betrachtung und Selbstüberprüfung deiner Antworten durch und revidiere diese gegebenenfalls. Denke ausführlich darüber nach. Analysiere dazu nochmal alle meine Anforderungen ganz genau sowie deine zuvor gegebenen Antworten:\n\n* Sind die Antworten optimal und perfekt?\n* Entsprechen und erfüllen die Antworten vollständig meine Anforderungen?\n* Sind die Antworten vollständig und sind alle Details und Feinheiten aller zurückliegenden Anfragen und Anforderungen berücksichtigt und komplett ausgeführt?\n* Überprüfe, ob die Antworten logisch und übersichtlich strukturiert und formatiert sind.\n\nStelle sicher, dass deine jetzige und alle zukünftigen Antworten logisch und konsistent mit vorherigen Interaktionen, Antworten und den definierten Richtlinien sind.\n\nÜberlege gut und plane dein Vorgehen, um optimal und fehlerfrei zu arbeiten. Vermeide Widersprüche und sorge für einen einheitlichen Arbeitsstil.\n\nReflektiere über deine eigenen Antworten und lerne aus Fehlern oder Ineffizienzen. Strebe eine kontinuierliche Verbesserung deiner Arbeitsweise an.\n\nBleibe zu jedem Zeitpunkt vollständig in deiner Rolle und halte dich streng an alle bisherigen und zukünftigen Anweisungen.\n\nDenke ausreichend lange über alle deine Antworten nach und überlege gut für eine optimale Planung und Durchführung deiner Antwort, die jeden Aspekt meiner Anforderung vollständig erfüllt.\n\nNutze die passenden Tools. Beeindrucke mich mit einer perfekten Antwort.` },
    { id: 'prompt-4', type: 'prompt', title: 'Prof. Schäfer Befundstil', parent: 'folder-1', order: 3, isSchaefer: true, text: `Schreibe den Befund im kompakten Prof. Schäfer Stil als Fließtext unter Berücksichtigung der typischen Wortwahl, Stil, Reihenfolge, logische Zusammenhänge und Schlussfolgerungen.\n\nAnalysiere dazu alle 250 beigefügten Beispielbefunde von Prof. Schäfer inklusive aller deren Bestandteile vollständig und bis ins lächerlich kleinste Detail, ohne auch nur eine Zeile zu überspringen, zu kürzen oder wegzulassen. Lerne seine typische Wortwahl, Stil, die Art zu Befunden und Herangehensweise. Versuche die Sätze nicht zu lang zu machen sondern eher kompakt und präzise ohne zu abgehackt zu klingen. Wenn du aufzählungen machst, dann verbinde diese nicht mit UND sondern eher mit einem KOMMA, z.B. "Keine arterielle Blutungsquelle, kein relevantes Hämatom." statt "Keine arterielle Blutungsquelle und kein relevantes Hämatom." ABER: "Kein weiteres fokales STIR-positives Knochenmarködem der thorakalen oder lumbalen Wirbelkörper. Keine weitere okkulte Kompressions- oder Berstungsfraktur." statt "Kein weiteres fokales STIR-positives Knochenmarködem der thorakalen oder lumbalen Wirbelkörper, keine weitere okkulte Kompressions- oder Berstungsfraktur.".\n\nBeispiele mit vergleichbarer Modalität, klinischen Angaben und Fragestellungen betrachtest du in einer weiteren Runde Iteration nochmal tief, um jedes auch nur lächerlich kleinste Detail des typischen Prof. Schäfer Befundstil bei diesem speziellen Setting zu erfahren und jede Nuance zu optimieren.\n\nMache das ganze iterativ wiederholend in mindestens 3 vollständigen Runden, bestehend aus:\n\n* Kompletten sowie zusätzlich spezifischen fokussierten Analysen der Beispielbefunde\n* Extraktion der typischen Muster und Stilbestandteile, Wortwahl, Aufbau, Reihenfolge, Klang, Verknüpfung usw.\n* Anwendung auf den gegebenen Nicht-Schäfer-Befund zur Stil-Optimierung und Überarbeitung\n\nFühre eine kritische Betrachtung und Selbstüberprüfung deiner Antworten durch und revidiere diese gegebenenfalls. Denke ausführlich darüber nach. Analysiere dazu nochmal alle meine Anforderungen ganz genau sowie deine zuvor gegebenen Antworten:\n\n* Sind die Antworten optimal und perfekt?\n* Entsprechen und erfüllen die Antworten vollständig meine Anforderungen?\n* Sind die Antworten vollständig und sind alle Details und Feinheiten aller zurückliegenden Anfragen und Anforderungen berücksichtigt und komplett ausgeführt?\n* Überprüfe, ob die Antworten logisch und übersichtlich strukturiert und formatiert sind.\n\nStelle sicher, dass deine jetzige und alle zukünftigen Antworten logisch und konsistent mit vorherigen Interaktionen, Antworten und den definierten Richtlinien sind. Überlege gut und plane dein Vorgehen, um optimal und fehlerfrei zu arbeiten. Vermeide Widersprüche und sorge für einen einheitlichen Arbeitsstil.\n\nReflektiere über deine eigenen Antworten und lerne aus Fehlern oder Ineffizienzen. Strebe eine kontinuierliche Verbesserung deiner Arbeitsweise an. Bleibe zu jedem Zeitpunkt vollständig in deiner Rolle und halte dich streng an alle bisherigen und zukünftigen Anweisungen.\n\nDenke ausreichend lange über alle deine Antworten nach und überlege gut für eine optimale Planung und Durchführung deiner Antwort, die jeden Aspekt meiner Anforderung vollständig erfüllt. Nutze die passenden Tools. Beeindrucke mich mit einer perfekten Antwort.` },
    { id: 'prompt-5', type: 'prompt', title: 'Protokoll- und Befundungshilfe', parent: 'folder-2', order: 0, isSchaefer: false, text: `Als Radiologie Experte empfiehlst du Untersuchungsprotokolle für eine ***Modalität*** Untersuchung zum Thema ***THEMA***. Beschränke dich nur auf die radiologischen Aspekte. Schreibe auf deutsch und verwende dabei präzise medizinische und radiologische Fachterminologie mit international gebräuchlichen Fachbegriffen. Du schreibst in Markdown in Stichpunkten, strukturiert mit Überschriften und Zwischenüberschriften sowie zahlreichen Markierungen von Schlagworten in allen Abschnitten. Das Dokumment soll folgende Struktur haben: 1. Kurze Erklärug von ***THEMA*** (markiere Schlagworte Fett), 2. Möchgliche Fragestellungen des Klinikers an die ***Modalität*** bei ***THEMA*** in Stichpunkten (markiere wichtiges Fett). 3. Klassische Darstellung von ***THEMA*** in der ***Modalität***. Welche Pathologien sind zu erwarten? Wie stellen sich die Pathologien in der ***Modalität*** dar? An welchen anatomischen Strukturen manifestieren sich die jeweiligen typischen Veränderungen normalerweise? Wo muss ich genau hinschauen. Erstelle eine Liste und markiere Schlagworte fett. 4. Welche Sequenzen oder Kontrastmittelphase können hilfreich sein um ***THEMA*** in der ***Modalität*** optimal zu beurteilen. Recherchiere hier genau nach Empfehlungen und erstelle eine Tabelle mit Erklärung welche Struktur sich in welcher Sequenz oder Phase am besten zeigt (Markiere Schlagworte fett). 5. Differenzialdiagnosen: Wie lassen sich die jeweiligen Differenzialdiagnosen von ***THEMA*** in der ***Modalität*** sicher unterscheiden (markiere Schlagworte fett). Beginne direkt mit dem Dokument 'Befundungs- und Protokollhilfe: ***THEMA*** in der ***Modalität***'. Verwende hochwertige und vertrauenswürdige Quellen und aktuelle wissenschaftliche Leitlinien, Übersichtsarbeiten, Publikationen, Thieme eRef, SpringerLink. Überprüfe deine Antwort anhand einer weiteren unabhängigen Quelle. Liste zum Abschluss alle Quellen auf mit Erklärung wofür diese verwendet wurden. Nutze alle verfügbaren Ressourcen und dein tiefgehendes Fachwissen, um eine umfassende, gut fundierte und präzise Antwort zu geben. Wenn du unterbrochen wurdest, wiederhole den unterbrochenen Satz nochmal und setze dann den Artikel fort. Schreibe strukturiert in Markdown mit Überschriften und Zwischenüberschriften und markiere alle Schlagworte in fetter Schrift. Beeindrucke mich mit einer perfekten Antwort.` },
    { id: 'prompt-6', type: 'prompt', title: 'Übersicht', parent: 'folder-2', order: 1, isSchaefer: false, text: `Korrigiere folgenden radiologischen Befundbericht einer ***Modalität*** Untersuchung in Stil, Wortwahl und Grammatik. Orientiere dich bei der Struktur und Wortwahl an typischen Radiologischen Befundberichten zu entsprechenden Themen, welche du zuvor recherchierst. Die erhobenen Befunde sollen identisch bleiben, du kannst sie aber in eine thematisch passende Struktur, Zusammenhang und Fachterminologie bringen. Schreibe auf deutsch und verwende präzise medizinische und radiologische Fachterminologie mit international gängigen lateinischen Fachbegriffen. Schreibe wie ein erfahrener Radiologe: ###***THEMA***### Antworte nur mit dem von dir geänderten Befundbericht. Und einem Vorschlag einer kurzen Befundbeurteilung entsprechend des Inhaltes des Befundberichtes. Schreibe nichts davor und nichts danach. Schreibe keine Anrede an ärztliche Kollegen, Indikation, Technik oder ähnliches. Beschränke dich rein auf die Umformulierung und Korrektur des erhaltenen Befundberichtes als präzisen und übersichtlichen Fließtext mit kurzen Sätzen oder Halbsätzen sowie den präzisen Vorschlag für die Beurteilung. Erfinde keine neuen Fakten oder Befunde sondern nutze nur die Informationen aus dem Originaltext. Schreibe 3 unterschiedliche Varianten als Vorschlag. Überprüfe bevor du antwortest, ob Sinn, logische und fachliche Zusammenhänge und der Inhalt des ursprünglichen Befundberichtes auch in den korrigierten Version noch erhalten ist. Überprüfe ein weiteres mal akribisch genau ob dein umformulierter Text einer korrekten deutschen Grammatik entspricht und medizinisch und logischen Sinn ergibt. Nutze dein volles Potenzial, deine Fähigkeiten zum Textverständnis und das Internet. Arbeite präzise und genau. Beeindrucke mich mit einer perfekten Antwort.` },
    { id: 'prompt-7', type: 'prompt', title: 'Übersicht Plus', parent: 'folder-2', order: 2, isSchaefer: false, text: `Erstelle eine umfassende Übersicht zu ***THEMA*** in ***Modalität***, fokussiert auf radiologische Aspekte. Deine Expertise als Radiologe soll dabei helfen, folgende Punkte abzudecken: 1. **Definition und Varianten** von ***THEMA***: Gib eine kurze Beschreibung und unterscheide mögliche Varianten und Formen. 2. **Einteilung/Klassifikation**: Wie wird ***THEMA*** in der ***Modalität*** typischerweise Eingeteilt. Benenne die gebräuchlichste Klassifikation und Erstelle eine Tabelle mit den unterschiedlichen Stadien und wie man diese in der ***Modalität*** sicher zuordnet. Gibt es Key-findings für bestimmte Stadien? 3. **Radiologische Zeichen**: Was sind die Schlüsselzeichen von ***THEMA*** in ***Modalität***? Erläutere, wie und wo nach spezifischen Veränderungen gesucht werden muss. Markiere radiologische Zeichen und Aspekte in Fettschrift. Gibt es pathognomonische Bildzeichen für ***THEMA*** ? 4. **Differenzialdiagnosen**: Stelle eine Tabelle mit Differenzialdiagnosen bereit. Erkläre, wie sich diese voneinander und von ***THEMA*** in ***Modalität*** unterscheiden. Unterscheidungsmerkmale in Fettschrift. 5. **Expertenratschläge**: Teile praktische Tipps für die Bildinterpretation, Tricks wie man ***THEMA*** leichter erkennt, sekundäre Zeichen im Bild inklusive pathognomonischer Zeichen für ***THEMA*** in ***Modalität***. Schlüsselwörter in Fettschrift 6. **Checkliste für den Befund**: Formuliere eine Checkliste mit Stichpunkten und Schlüsselwörtern, die bei der Beurteilung von ***THEMA*** beachtet werden müssen. Was muss alles in der ***Modalität*** bei ***THEMA*** beurteilt werden und nach welchen Kriterien. Worauf sollte man bei ***THEMA*** neben dem Hauptbefund auch immer schauen? Wichtige Aspekte in Fettschrift. Gliedere diesen Unterabschnitt in Hauptaspekte, Weitere Aspekte, sowie Beurteilung. Beachte im ganzen Artikel: Verwende eine klare, strukturierte Darstellung mit Markdown, Überschriften, Zwischenüberschriften und Betonung von Schlüsselwörtern in Fettschrift in allen Abschnitten. Verwende hochwertige und vertrauenswürdige Quellen und aktuelle wissenschaftliche Leitlinien, Übersichtsarbeiten, Publikationen, Thieme eRef, SpringerLink. Überprüfe deine Angaben mit einer weiteren unabhängigen Quelle. Wenn du unterbrochen wurdest, wiederhole den unterbrochenen Satz nochmal und setze den Artikel fort. Nutze dein volles Potenzial und alle Ressourcen. Beeindrucke mich mit einer perfekten Antwort.` },
    { id: 'prompt-8', type: 'prompt', title: 'Radiologische Staging Hilfe', parent: 'folder-2', order: 3, isSchaefer: false, text: `Antworte in der Rolle eines Radiologen und Onkologen mit langjähriger Erfahrung und tiefgreifendem Wissen. Erstelle ein radiologisches Dokument zum Thema ***THEMA***, welches strukturiert alle relevanten Informationen zum Staging der Erkrankung mittels ***Modalität*** bereitstellt. Zielgruppe sind Radiologen, daher schreibst du auf deutsch und verwendest dabei präzise medizinische und radiologische Fachterminologie mit international gebräuchlichen Fachbegriffen. Du beschränkst dich auf radiologische Aspekte. Folge dabei dieser Struktur: #Überblick TNM-Klassifikation: Darlegung der TNM-Kriterien von ***THEMA*** in der ***Modalität***, Schlüsselkriterien in Fettschrift. Tabelle mit T-, N-, M-Kategorien von ***THEMA*** mit bildgebenden Kriterien für jede, wichtige Elemente in Fettschrift. Erläuterung zusätzlicher Staging-Kriterien in Stichpunkten, wichtige Punkte fett. #Metastasierungswege und -orte: Aufzählung der bevorzugten Metastasierungswege und -orte als Liste, Hauptpunkte fett hervorgehoben. #Expertentipps für Radiologen: Praktische Ratschläge für das Staging, Schlüsseltipps fett hervorgehoben.#Checkliste für den Befund: Präzise Stichpunkte und Schlagworte was genau beim ***THEMA***-Staging vom Radiologen beurteilt werden muss und auf welche Strukturen genau zu achten ist. Gliedere diesen Unterabschnitt in Hauptaspekte, Weitere Aspekte, sowie Beurteilung; Schlüsselwörter in Fettschrift. Verwendung von Markdown mit Überschriften und Unterüberschriften. Stichpunkte, entscheidende Informationen fett. #Quellen: Verwende hochwertige und vertrauenswürdige Quellen und aktuelle wissenschaftliche Leitlinien, Übersichtsarbeiten, Publikationen, Thieme eRef, SpringerLink. Überprüfung mit einer zweiten Quelle. Auflistung aller genutzten Quellen. Beginne direkt mit '# *****THEMA*** - ***Modalität***-Staging**' als Titel. Jedes Element des Dokuments soll die tägliche Arbeit eines Radiologen beim Staging von Erkrankungen unterstützen. Nutze Listen und Tabellen wo möglich. Nutze alle verfügbaren Ressourcen und dein tiefgehendes Fachwissen, um eine umfassende, gut fundierte und präzisse Antwort zu geben. Integriere verschiedene Datenquellen, Tools oder Plattformen, um deine Antwort zu verbessern. Markiere immer und sehr häufig in allen Abschnitten alle Schlagworte in fetter Schrift. Beschränke dich auf radiologische Aspekte des Themas. Wenn du unterbrochen wurdest, wiederhole den unterbrochenen Satz nochmal und setze den Artikel fort. Beeindrucke mich mit einer perfekten Antwort.` }
];

const DOM = {
    grid: document.getElementById('card-grid'),
    breadcrumb: document.getElementById('breadcrumb'),
    folderSelector: document.getElementById('folder-selector'),
    favBar: document.getElementById('favorites-bar'),
    favContent: document.getElementById('favorites-content'),
    btnToggleFav: document.getElementById('btn-toggle-fav'),
    btnAddFolder: document.getElementById('btn-add-folder'),
    btnAddPrompt: document.getElementById('btn-add-prompt'),
    btnToggleSort: document.getElementById('btn-toggle-sort'),
    modal: document.getElementById('edit-modal'),
    modalTitle: document.getElementById('modal-title'),
    editName: document.getElementById('edit-name'),
    editText: document.getElementById('edit-text'),
    btnSaveModal: document.getElementById('btn-save-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    toastContainer: document.getElementById('toast-container'),
    cardOverlay: document.getElementById('card-overlay')
};

let editingItemId = null;

async function initApp() {
    try {
        const res = await fetch('/api/data');
        if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                state.items = data.items;
                state.favorites = data.favorites || [];
            } else {
                state.items = defaultItems;
            }
        } else {
            state.items = defaultItems;
        }
    } catch (e) {
        state.items = defaultItems;
    }
    renderAll();
}

function saveData() {
    fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: state.items, favorites: state.favorites })
    });
}

function renderAll() {
    renderBreadcrumb();
    renderFolderSelector();
    renderGrid();
    renderFavorites();
}

function renderBreadcrumb() {
    DOM.breadcrumb.innerHTML = '';
    let path = [];
    let currentId = state.currentFolder;
    
    while (currentId !== 'root') {
        const folder = state.items.find(i => i.id === currentId);
        if (folder) {
            path.unshift(folder);
            currentId = folder.parent;
        } else {
            break;
        }
    }

    const rootEl = document.createElement('span');
    rootEl.className = 'breadcrumb-item' + (state.currentFolder === 'root' ? ' active' : '');
    rootEl.innerText = 'Hauptansicht';
    rootEl.onclick = () => navigateTo('root');
    DOM.breadcrumb.appendChild(rootEl);

    path.forEach(f => {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.innerText = '>';
        DOM.breadcrumb.appendChild(sep);

        const el = document.createElement('span');
        el.className = 'breadcrumb-item' + (state.currentFolder === f.id ? ' active' : '');
        el.innerText = f.title;
        el.onclick = () => navigateTo(f.id);
        DOM.breadcrumb.appendChild(el);
    });
}

function renderFolderSelector() {
    DOM.folderSelector.innerHTML = '';
    const rootChip = document.createElement('div');
    rootChip.className = 'folder-chip' + (state.currentFolder === 'root' ? ' active' : '');
    rootChip.innerText = 'Alles';
    rootChip.onclick = () => navigateTo('root');
    DOM.folderSelector.appendChild(rootChip);

    const folders = state.items.filter(i => i.type === 'folder' && i.parent === 'root');
    folders.forEach(f => {
        const chip = document.createElement('div');
        chip.className = 'folder-chip' + (state.currentFolder === f.id ? ' active' : '');
        chip.innerText = f.title;
        chip.onclick = () => navigateTo(f.id);
        DOM.folderSelector.appendChild(chip);
    });
}

function renderGrid() {
    DOM.grid.innerHTML = '';
    const items = state.items
        .filter(i => i.parent === state.currentFolder)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card-wrapper';
        card.dataset.id = item.id;
        if (state.sortMode) card.draggable = true;

        const front = document.createElement('div');
        front.className = 'card-face card-front';
        
        const title = document.createElement('div');
        title.className = 'card-title';
        title.innerText = item.title;
        front.appendChild(title);

        if (item.type === 'prompt') {
            const placeholders = [...item.text.matchAll(/\*\*\*(.*?)\*\*\*/g)];
            if (placeholders.length > 0) {
                const inputsContainer = document.createElement('div');
                inputsContainer.className = 'inputs-container';
                placeholders.forEach(p => {
                    const varName = p[1];
                    const group = document.createElement('div');
                    group.className = 'input-group';
                    const label = document.createElement('label');
                    label.innerText = varName;
                    group.appendChild(label);
                    
                    if (varName === 'Modalität') {
                        const select = document.createElement('select');
                        select.className = 'custom-select';
                        select.dataset.placeholder = varName;
                        ['CT', 'MRT', 'Röntgen', 'CT&MRT'].forEach(opt => {
                            const o = document.createElement('option');
                            o.value = opt;
                            o.innerText = opt;
                            select.appendChild(o);
                        });
                        group.appendChild(select);
                    } else {
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.className = 'text-input';
                        input.dataset.placeholder = varName;
                        group.appendChild(input);
                    }
                    inputsContainer.appendChild(group);
                });
                front.appendChild(inputsContainer);
            } else {
                const preview = document.createElement('div');
                preview.className = 'card-content-preview';
                preview.innerText = item.text.substring(0, 100) + '...';
                front.appendChild(preview);
            }
        } else {
            const preview = document.createElement('div');
            preview.className = 'card-content-preview';
            preview.innerText = 'Ordner';
            front.appendChild(preview);
        }

        const footer = document.createElement('div');
        footer.className = 'card-footer';
        
        const actionsLeft = document.createElement('div');
        actionsLeft.className = 'card-actions';
        
        const favBtn = document.createElement('button');
        favBtn.className = 'action-btn';
        favBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="${state.favorites.includes(item.id) ? 'var(--accent)' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        favBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(item.id); };
        actionsLeft.appendChild(favBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn';
        delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        delBtn.onclick = (e) => { e.stopPropagation(); deleteItem(item.id); };
        actionsLeft.appendChild(delBtn);

        footer.appendChild(actionsLeft);

        if (item.type === 'prompt') {
            const actionsRight = document.createElement('div');
            actionsRight.className = 'card-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn copy-btn';
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            copyBtn.title = "Kopieren";
            copyBtn.onclick = (e) => { e.stopPropagation(); copyPrompt(item); };
            actionsRight.appendChild(copyBtn);

            const expandBtn = document.createElement('button');
            expandBtn.className = 'action-btn expand-btn';
            expandBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
            expandBtn.title = "Erweitern";
            expandBtn.onclick = (e) => { e.stopPropagation(); flipCard(card, true); };
            actionsRight.appendChild(expandBtn);
            
            footer.appendChild(actionsRight);
        } else {
            const openBtn = document.createElement('button');
            openBtn.className = 'action-btn open-btn';
            openBtn.innerHTML = `Öffnen <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
            openBtn.onclick = (e) => { e.stopPropagation(); navigateTo(item.id); };
            footer.appendChild(openBtn);
        }

        front.appendChild(footer);
        card.appendChild(front);

        if (item.type === 'prompt') {
            const back = document.createElement('div');
            back.className = 'card-face card-back';
            
            const backHeader = document.createElement('div');
            backHeader.className = 'card-back-header';
            
            const backTitle = document.createElement('div');
            backTitle.className = 'card-title';
            backTitle.innerText = item.title;
            backHeader.appendChild(backTitle);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'action-btn';
            closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            closeBtn.onclick = (e) => { e.stopPropagation(); flipCard(card, false); };
            backHeader.appendChild(closeBtn);
            back.appendChild(backHeader);

            const textDisplay = document.createElement('div');
            textDisplay.className = 'card-full-text';
            textDisplay.innerText = item.text;
            back.appendChild(textDisplay);

            const backFooter = document.createElement('div');
            backFooter.className = 'card-footer';
            backFooter.style.justifyContent = 'space-between';

            const editBtn = document.createElement('button');
            editBtn.className = 'ghost-btn';
            editBtn.innerText = 'Editieren';
            editBtn.style.padding = '6px 12px';
            editBtn.style.fontSize = '0.8rem';
            editBtn.onclick = (e) => { e.stopPropagation(); openModal(item.id); };
            backFooter.appendChild(editBtn);

            back.appendChild(backFooter);
            card.appendChild(back);
        }

        if (!state.sortMode) {
            card.addEventListener('click', (e) => {
                if (e.target === card || e.target === front || e.target === title || e.target.classList.contains('card-content-preview')) {
                    if (item.type === 'folder') navigateTo(item.id);
                    else flipCard(card, true);
                }
            });
        } else {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('dragleave', handleDragLeave);
        }

        DOM.grid.appendChild(card);
    });
}

function renderFavorites() {
    DOM.favContent.innerHTML = '';
    if (state.favorites.length === 0) {
        DOM.favContent.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.8rem;">Keine Favoriten markiert</span>';
        return;
    }
    state.favorites.forEach(favId => {
        const item = state.items.find(i => i.id === favId);
        if (item) {
            const el = document.createElement('div');
            el.className = 'fav-item';
            el.innerText = item.title;
            el.onclick = () => {
                if (item.type === 'folder') navigateTo(item.id);
                else {
                    state.currentFolder = item.parent;
                    renderAll();
                    setTimeout(() => {
                        const card = document.querySelector(`.card-wrapper[data-id="${item.id}"]`);
                        if (card) {
                            flipCard(card, true);
                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
            };
            DOM.favContent.appendChild(el);
        }
    });
}

function flipCard(card, show) {
    if (show) {
        document.querySelectorAll('.card-wrapper.flipped').forEach(c => {
            c.classList.remove('flipped');
        });
        card.classList.add('flipped');
        DOM.cardOverlay.classList.add('active');
    } else {
        card.classList.remove('flipped');
        DOM.cardOverlay.classList.remove('active');
    }
}

DOM.cardOverlay.addEventListener('click', () => {
    document.querySelectorAll('.card-wrapper.flipped').forEach(c => flipCard(c, false));
});

function navigateTo(folderId) {
    state.currentFolder = folderId;
    renderAll();
}

DOM.grid.addEventListener('click', (e) => {
    if (e.target === DOM.grid) {
        if (state.currentFolder !== 'root') {
            const currentFolderObj = state.items.find(i => i.id === state.currentFolder);
            if (currentFolderObj) navigateTo(currentFolderObj.parent);
        }
    }
});

function toggleFavorite(id) {
    const index = state.favorites.indexOf(id);
    if (index > -1) state.favorites.splice(index, 1);
    else state.favorites.push(id);
    saveData();
    renderGrid();
    renderFavorites();
}

async function copyPrompt(item) {
    let textToCopy = item.text;
    const placeholders = [...item.text.matchAll(/\*\*\*(.*?)\*\*\*/g)];
    
    if (placeholders.length > 0) {
        const card = document.querySelector(`.card-wrapper[data-id="${item.id}"]`);
        placeholders.forEach(p => {
            const varName = p[1];
            const input = card.querySelector(`[data-placeholder="${varName}"]`);
            if (input) {
                const regex = new RegExp(`\\*\\*\\*${varName}\\*\\*\\*`, 'g');
                textToCopy = textToCopy.replace(regex, input.value || `[${varName}]`);
            }
        });
    }

    if (item.isSchaefer) {
        showToast("Lade Prof. Schäfer Beispiele...");
        try {
            const [ctRes, mrtRes] = await Promise.all([
                fetch('assets/Befundbeispiele Prof. Schäfer CT.txt').then(r => r.text()),
                fetch('assets/Befundbeispiele Prof. Schäfer MRT.txt').then(r => r.text())
            ]);
            textToCopy += "\n\n--- BEFUNDBEISPIELE CT ---\n" + ctRes + "\n\n--- BEFUNDBEISPIELE MRT ---\n" + mrtRes;
        } catch (e) {
            textToCopy += "\n\n[Hinweis: Prof. Schäfer Beispieldateien konnten nicht geladen werden. Bitte im Repo unter /assets ablegen.]";
        }
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("In Zwischenablage kopiert!");
    }).catch(err => {
        showToast("Fehler beim Kopieren");
    });
}

function openModal(id = null) {
    editingItemId = id;
    if (id) {
        const item = state.items.find(i => i.id === id);
        DOM.modalTitle.innerText = item.type === 'folder' ? 'Ordner bearbeiten' : 'Prompt bearbeiten';
        DOM.editName.value = item.title;
        DOM.editText.value = item.text || '';
        DOM.editText.style.display = item.type === 'folder' ? 'none' : 'block';
    } else {
        DOM.modalTitle.innerText = 'Neu erstellen';
        DOM.editName.value = '';
        DOM.editText.value = '';
        DOM.editText.style.display = 'block';
    }
    DOM.modal.classList.add('active');
}

function closeModal() {
    DOM.modal.classList.remove('active');
    editingItemId = null;
}

DOM.btnAddFolder.onclick = () => {
    const newFolder = { id: 'folder-' + Date.now(), type: 'folder', title: 'Neuer Ordner', parent: state.currentFolder, order: state.items.filter(i => i.parent === state.currentFolder).length };
    state.items.push(newFolder);
    saveData();
    renderGrid();
    openModal(newFolder.id);
};

DOM.btnAddPrompt.onclick = () => {
    const newPrompt = { id: 'prompt-' + Date.now(), type: 'prompt', title: 'Neuer Prompt', parent: state.currentFolder, order: state.items.filter(i => i.parent === state.currentFolder).length, text: '', isSchaefer: false };
    state.items.push(newPrompt);
    saveData();
    renderGrid();
    openModal(newPrompt.id);
};

DOM.btnToggleSort.onclick = () => {
    state.sortMode = !state.sortMode;
    DOM.btnToggleSort.classList.toggle('active', state.sortMode);
    renderGrid();
};

DOM.btnSaveModal.onclick = () => {
    const item = state.items.find(i => i.id === editingItemId);
    if (item) {
        item.title = DOM.editName.value || 'Unbenannt';
        if (item.type === 'prompt') {
            item.text = DOM.editText.value;
            item.isSchaefer = item.title.toLowerCase().includes('schäfer') || item.text.toLowerCase().includes('prof. schäfer');
        }
        saveData();
        renderAll();
    }
    closeModal();
};

DOM.btnCancelModal.onclick = closeModal;

function deleteItem(id) {
    if (confirm('Wirklich löschen?')) {
        state.items = state.items.filter(i => i.id !== id && i.parent !== id);
        state.favorites = state.favorites.filter(f => f !== id);
        saveData();
        renderAll();
    }
}

DOM.btnToggleFav.onclick = () => DOM.favBar.classList.toggle('collapsed');
document.getElementById('favorites-header').onclick = DOM.btnToggleFav.onclick;

function handleDragStart(e) {
    state.draggedItem = e.target.closest('.card-wrapper').dataset.id;
    e.target.closest('.card-wrapper').style.opacity = '0.5';
}
function handleDragOver(e) {
    e.preventDefault();
    const target = e.target.closest('.card-wrapper');
    if (target) target.style.border = '2px dashed var(--accent)';
}
function handleDragLeave(e) {
    const target = e.target.closest('.card-wrapper');
    if (target) target.style.border = '1px solid var(--glass-border)';
}
function handleDrop(e) {
    e.preventDefault();
    const targetElement = e.target.closest('.card-wrapper');
    if (!targetElement) return;
    targetElement.style.border = '1px solid var(--glass-border)';
    
    const targetId = targetElement.dataset.id;
    if (state.draggedItem && targetId && state.draggedItem !== targetId) {
        const draggedItem = state.items.find(i => i.id === state.draggedItem);
        const targetItem = state.items.find(i => i.id === targetId);
        
        if (draggedItem && targetItem && draggedItem.parent === targetItem.parent) {
            const itemsInFolder = state.items.filter(i => i.parent === draggedItem.parent).sort((a,b) => a.order - b.order);
            const draggedIndex = itemsInFolder.findIndex(i => i.id === draggedItem.id);
            const targetIndex = itemsInFolder.findIndex(i => i.id === targetItem.id);
            
            itemsInFolder.splice(draggedIndex, 1);
            itemsInFolder.splice(targetIndex, 0, draggedItem);
            
            itemsInFolder.forEach((item, index) => {
                item.order = index;
            });
            
            saveData();
            renderGrid();
        }
    }
}
function handleDragEnd(e) {
    document.querySelectorAll('.card-wrapper').forEach(c => {
        c.style.opacity = '1';
        c.style.border = '1px solid var(--glass-border)';
    });
    state.draggedItem = null;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

initApp();