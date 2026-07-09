(() => {
  "use strict";

  const VERSION = 1;
  const SCHEMA = "radprompt-state-v1";
  const STATE_KEY = "radprompt.state.v1";
  const LOCAL_BACKUP_KEY = "radprompt.local-backup.v1";
  const UI_KEY = "radprompt.ui.v1";
  const DOCUMENT_CACHE_KEY = "radprompt.documents.v1";
  const KV_STATE_ENDPOINT = "/api/state";
  const KV_HEALTH_ENDPOINT = "/api/health";
  const VIRTUAL_FOLDER_ALL = "all";
  const VIRTUAL_FOLDER_FAVORITES = "favorites";
  const PLACEHOLDER_RE = /\*\*\*([\s\S]*?)\*\*\*/g;
  const MODALITY_PLACEHOLDER = "Modalität";
  const TOPIC_PLACEHOLDER = "THEMA";
  const MODALITY_OPTIONS = Object.freeze(["CT", "MRT", "Röntgen", "CT&MRT"]);
  const TONE_SEQUENCE = Object.freeze(["steel", "violet", "cyan", "emerald", "amber", "graphite"]);
  const VALID_TONES = new Set(TONE_SEQUENCE);
  const VALID_FILTERS = new Set(["all", "favorites", "special", "prof"]);
  const VALID_VIEWS = new Set(["board", "dense"]);
  const PROF_CT_LABEL = "# Befundbeispiele Prof. Schäfer CT";
  const PROF_MRT_LABEL = "# Befundbeispiele Prof. Schäfer MRT";
  const DEFAULT_SOURCE_PATHS = Object.freeze({
    prompts: "/assets/data/prompts.txt",
    profCt: "/assets/data/befundbeispiele-prof-schaefer-ct.txt",
    profMrt: "/assets/data/befundbeispiele-prof-schaefer-mrt.txt"
  });

  const DEFAULT_FOLDERS = Object.freeze([
    {
      id: "folder-bildinterpretation",
      title: "Bildinterpretation",
      description: "Primäre Analyse- und Befundprompts für CT, MRT und Röntgen",
      order: 0,
      tone: "steel",
      locked: false
    },
    {
      id: "folder-prof-schaefer",
      title: "Prof. Schäfer Stil",
      description: "Prompts mit zusätzlichem CT-/MRT-Beispielkorpus für kompakten Befundstil",
      order: 1,
      tone: "amber",
      locked: false
    },
    {
      id: "folder-befundung",
      title: "Befundung",
      description: "RIS-nahe Befund-, Beurteilungs- und Optimierungsprompts",
      order: 2,
      tone: "cyan",
      locked: false
    },
    {
      id: "folder-recherche",
      title: "Protokoll & Wissen",
      description: "Protokolle, Übersichten, Staging, Leitlinien, Klassifikationen und DD-Hilfen",
      order: 3,
      tone: "violet",
      locked: false
    },
    {
      id: "folder-organisation",
      title: "Organisation",
      description: "Klinikinterne Arbeitsorganisation, Listen, SOPs und strukturierte Texte",
      order: 4,
      tone: "emerald",
      locked: false
    },
    {
      id: "folder-allgemein",
      title: "Allgemein",
      description: "Sonstige universelle Prompt-Templates",
      order: 5,
      tone: "graphite",
      locked: false
    }
  ]);

  const FALLBACK_PROMPTS = Object.freeze([
    {
      title: "Radiologische Bildinterpretation I",
      body: [
        "Klinische Angaben: ***Klinische Angaben***",
        "Fragestellung: ***Fragestellung***",
        "",
        "Du bist ein erfahrener Facharzt für Radiologie mit meisterlicher Expertise in der Schnittbilddiagnostik. Deine Aufgabe ist die detaillierte Analyse der angehängten Bilddaten (CT/MRT/Röntgen) und die Erstellung eines professionellen Befundes.",
        "",
        "**Deine Arbeitsweise:**",
        "1. **Frame-by-Frame Analyse:** Betrachte jede Sequenz, jedes Bild, jede DICOM und jedes Video minutiös.",
        "2. **Anatomische Zuordnung:** Ordne Läsionen sicher den anatomischen Strukturen zu und korreliere diese in allen verfügbaren Ebenen (tra/cor/sag) und Sequenzen.",
        "3. **Abweichung von der Norm:** Identifiziere von der Norm abweichende Strukturen sicher, insbesondere bezüglich deren Lage und Verlauf, Signalqualitäten/-intensitäten, Größe und alle weiteren möglichen typischen Veränderungen",
        "4. **Signalcharakteristika:** Beurteile Läsionen anhand ihrer Signalintensitäten/Dichte und Lage/Verlauf in der Zusammenschau aller Gewichtungen/Fensterungen.",
        "5. **Orientierung:** Beachte strikt die radiologische Orientierung (rechts im Bild = links am Patienten).",
        "6. **Umgebung/Begleitverletzungen:** Achte auch auf Veränderungen in unmittelbarer Nachbarschaft, welche die gleiche/Ähnliche Ursache haben oder im Zuge eines komplexen Musters auftreten können. Führe auch hierzu eine Internetrecherche durch und gleiche immer wieder mit deinen Beobachtungen ab.",
        "7. **Abgleich mit typischen Literaturangaben**: Du gleichst Auffälligkeiten nach einer Internetrecherche ab und achtest dabei auch auf typische Begleitverletzungen.",
        "8. **Nutze Python**: Nutze neben den original DICOM Bildern verschiedene Werkzeuge zum zoomen, messen, fenstern usw. um eine optimale Detailbegutachtung durchführen zu können.",
        "",
        "Verfasse am Ende einen finalen RIS-konformen Befundbericht im kompakten, präzisen telegrafischen Nominalstil mit den Abschnitten Befund und Beurteilung."
      ].join("\n"),
      folderId: "folder-bildinterpretation",
      favorite: true,
      profSchaefer: false,
      tone: "steel"
    },
    {
      title: "Radiologische Bildinterpretation II",
      body: [
        "=== SYSTEM-PROMPT: RADIOLOGISCHE BILDBEFUNDUNG (CT/MRT/RÖNTGEN) AUS SERIEN-/SEQUENZ-VIDEOS ===",
        "",
        "# ROLLE & MISSION",
        "Du bist ein erfahrener Facharzt für Radiologie mit meisterlicher Schnittbildexpertise.",
        "Aufgabe: Aus den übergebenen Bilddaten (Videos durchgescrollter MRT-Sequenzen / CT-Serien bzw. Einzelbilder), den KLINISCHEN ANGABEN und der FRAGESTELLUNG einen maximal präzisen, kalibrierten und RIS-fähigen Befund erstellen.",
        "",
        "# EINGABE",
        "- KLINISCHE ANGABEN: ***Klinische Angaben***",
        "- FRAGESTELLUNG: ***Fragestellung***",
        "- BILDDATEN: {Videos/Serien/Sequenzen, ggf. Voruntersuchung}",
        "",
        "# OBERSTE GRUNDPRINZIPIEN",
        "1. EVIDENZBINDUNG: Befunde NUR aus tatsächlich sichtbarem Bildinhalt.",
        "2. BILDBEFUND SCHLÄGT LITERATUR: Recherche dient der Einordnung, NIE der Erzeugung von Befunden.",
        "3. KALIBRIERUNG STATT SCHEINSICHERHEIT: Kennzeichne Aussagen mit Sicherheitsgrad.",
        "4. UNSICHERHEIT IST EIN BEFUND: Nicht beurteilbare Strukturen explizit benennen.",
        "5. KEIN TUNNELBLICK: Fragestellung lenkt, ersetzt aber nicht die vollständige Durchmusterung.",
        "",
        "Erstelle eine vollständige Analyse und abschließend einen RIS-Befundbericht mit Befund und Beurteilung."
      ].join("\n"),
      folderId: "folder-bildinterpretation",
      favorite: true,
      profSchaefer: false,
      tone: "violet"
    },
    {
      title: "Protokoll- und Befundungshilfe",
      body: "Als Radiologie Experte empfiehlst du Untersuchungsprotokolle für eine ***Modalität*** Untersuchung zum Thema ***THEMA***. Beschränke dich nur auf die radiologischen Aspekte. Schreibe auf deutsch und verwende dabei präzise medizinische und radiologische Fachterminologie mit international gebräuchlichen Fachbegriffen. Du schreibst in Markdown in Stichpunkten, strukturiert mit Überschriften und Zwischenüberschriften sowie zahlreichen Markierungen von Schlagworten in allen Abschnitten. Das Dokumment soll folgende Struktur haben: 1. Kurze Erklärug von ***THEMA*** (markiere Schlagworte Fett), 2. Möchgliche Fragestellungen des Klinikers an die ***Modalität*** bei ***THEMA*** in Stichpunkten (markiere wichtiges Fett). 3. Klassische Darstellung von ***THEMA*** in der ***Modalität***. Welche Pathologien sind zu erwarten? Wie stellen sich die Pathologien in der ***Modalität*** dar? An welchen anatomischen Strukturen manifestieren sich die jeweiligen typischen Veränderungen normalerweise? Wo muss ich genau hinschauen. Erstelle eine Liste und markiere Schlagworte fett. 4. Welche Sequenzen oder Kontrastmittelphase können hilfreich sein um ***THEMA*** in der ***Modalität*** optimal zu beurteilen. Recherchiere hier genau nach Empfehlungen und erstelle eine Tabelle mit Erklärung welche Struktur sich in welcher Sequenz oder Phase am besten zeigt (Markiere Schlagworte fett). 5. Differenzialdiagnosen: Wie lassen sich die jeweiligen Differenzialdiagnosen von ***THEMA*** in der ***Modalität*** sicher unterscheiden (markiere Schlagworte fett). Beginne direkt mit dem Dokument 'Befundungs- und Protokollhilfe: ***THEMA*** in der ***Modalität***'. Verwende hochwertige und vertrauenswürdige Quellen und aktuelle wissenschaftliche Leitlinien, Übersichtsarbeiten, Publikationen, Thieme eRef, SpringerLink. Überprüfe deine Antwort anhand einer weiteren unabhängigen Quelle. Liste zum Abschluss alle Quellen auf mit Erklärung wofür diese verwendet wurden. Nutze alle verfügbaren Ressourcen und dein tiefgehendes Fachwissen, um eine umfassende, gut fundierte und präzise Antwort zu geben. Wenn du unterbrochen wurdest, wiederhole den unterbrochenen Satz nochmal und setze dann den Artikel fort. Schreibe strukturiert in Markdown mit Überschriften und Zwischenüberschriften und markiere alle Schlagworte in fetter Schrift. Beeindrucke mich mit einer perfekten Antwort.",
      folderId: "folder-recherche",
      favorite: true,
      profSchaefer: false,
      tone: "cyan"
    },
    {
      title: "Befundbericht Korrektur und Beurteilungsvorschlag",
      body: "Korrigiere folgenden radiologischen Befundbericht einer ***Modalität*** Untersuchung in Stil, Wortwahl und Grammatik. Orientiere dich bei der Struktur und Wortwahl an typischen Radiologischen Befundberichten zu entsprechenden Themen, welche du zuvor recherchierst. Die erhobenen Befunde sollen identisch bleiben, du kannst sie aber in eine thematisch passende Struktur, Zusammenhang und Fachterminologie bringen. Schreibe auf deutsch und verwende präzise medizinische und radiologische Fachterminologie mit international gängigen lateinischen Fachbegriffen. Schreibe wie ein erfahrener Radiologe: ###***THEMA***### Antworte nur mit dem von dir geänderten Befundbericht. Und einem Vorschlag einer kurzen Befundbeurteilung entsprechend des Inhaltes des Befundberichtes. Schreibe nichts davor und nichts danach. Schreibe keine Anrede an ärztliche Kollegen, Indikation, Technik oder ähnliches. Beschränke dich rein auf die Umformulierung und Korrektur des erhaltenen Befundberichtes als präzisen und übersichtlichen Fließtext mit kurzen Sätzen oder Halbsätzen sowie den präzisen Vorschlag für die Beurteilung. Erfinde keine neuen Fakten oder Befunde sondern nutze nur die Informationen aus dem Originaltext. Schreibe 3 unterschiedliche Varianten als Vorschlag. Überprüfe bevor du antwortest, ob Sinn, logische und fachliche Zusammenhänge und der Inhalt des ursprünglichen Befundberichtes auch in den korrigierten Version noch erhalten ist. Überprüfe ein weiteres mal akkribisch genau ob dein umformulierter Text einer korrekten deutschen Grammatik entspricht und medizinisch und logischen Sinn ergibt. Nutze dein volles Potenzial, deine Fähigkeiten zum Textverständnis und das Internet. Arbeite präzise und genau. Beeindrucke mich mit einer perfekten Antwort.",
      folderId: "folder-befundung",
      favorite: true,
      profSchaefer: false,
      tone: "emerald"
    },
    {
      title: "Radiologische Übersicht Plus",
      body: "Erstelle eine umfassende Übersicht zu ***THEMA*** in ***Modalität***, fokussiert auf radiologische Aspekte. Deine Expertise als Radiologe soll dabei helfen, folgende Punkte abzudecken: 1. **Definition und Varianten** von ***THEMA***: Gib eine kurze Beschreibung und unterscheide mögliche Varianten und Formen. 2. **Einteilung/Klassifikation**: Wie wird ***THEMA*** in der ***Modalität*** typischerweise Eingeteilt. Benenne die gebräuchlichste Klassifikation und Erstelle eine Tabelle mit den unterschiedlichen Stadien und wie man diese in der ***Modalität*** sicher zuordnet. Gibt es Key-findings für bestimmte Stadien? 3. **Radiologische Zeichen**: Was sind die Schlüsselzeichen von ***THEMA*** in ***Modalität***? Erläutere, wie und wo nach spezifischen Veränderungen gesucht werden muss. Markiere radiologische Zeichen und Aspekte in Fettschrift. Gibt es pathognomonische Bildzeichen für ***THEMA*** ? 4. **Differenzialdiagnosen**: Stelle eine Tabelle mit Differenzialdiagnosen bereit. Erkläre, wie sich diese voneinander und von ***THEMA*** in ***Modalität*** unterscheiden. Unterscheidungsmerkmale in Fettschrift. 5. **Expertenratschläge**: Teile praktische Tipps für die Bildinterpretation, Tricks wie man ***THEMA*** leichter erkennt, sekundäre Zeichen im Bild inklusive pathognomonischer Zeichen für ***THEMA*** in ***Modalität***. Schlüsselwörter in Fettschrift 6. **Checkliste für den Befund**: Formuliere eine Checkliste mit Stichpunkten und Schlüsselwörtern, die bei der Beurteilung von ***THEMA*** beachtet werden müssen. Was muss alles in der ***Modalität*** bei ***THEMA*** beurteilt werden und nach welchen Kriterien. Worauf sollte man bei ***THEMA*** neben dem Hauptbefund auch immer schauen? Wichtige Aspekte in Fettschrift. Gliedere diesen Unterabschnitt in Hauptaspekte, Weitere Aspekte, sowie Beurteilung. Beachte im ganzen Artikel: Verwende eine klare, strukturierte Darstellung mit Markdown, Überschriften, Zwischenüberschriften und Betonung von Schlüsselwörtern in Fettschrift in allen Abschnitten. Verwende hochwertige und vertrauenswürdige Quellen und aktuelle wissenschaftliche Leitlinien, Übersichtsarbeiten, Publikationen, Thieme eRef, SpringerLink. Überprüfe deine Angaben mit einer weiteren unabhängigen Quelle. Wenn du unterbrochen wurdest, wiederhole den unterbrochenen Satz nochmal und setze dann den Artikel fort. Nutze dein volles Potenzial und alle Ressourcen. Beeindrucke mich mit einer perfekten Antwort.",
      folderId: "folder-recherche",
      favorite: true,
      profSchaefer: false,
      tone: "violet"
    },
    {
      title: "Radiologische Staging Hilfe",
      body: "Antworte in der Rolle eines Radiologen und Onkologen mit langjähriger Erfahrung und tiefgreifendem Wissen. Erstelle ein radiologisches Dokument zum Thema ***THEMA***, welches strukturiert alle relevanten Informationen zum Staging der Erkrankung mittels ***Modalität*** bereitstellt. Zielgruppe sind Radiologen, daher schreibst du auf deutsch und verwendest dabei präzise medizinische und radiologische Fachterminologie mit international gebräuchlichen Fachbegriffen. Du beschränkst dich auf radiologische Aspekte. Folge dabei dieser Struktur: #Überblick TNM-Klassifikation: Darlegung der TNM-Kriterien von ***THEMA*** in der ***Modalität***, Schlüsselkriterien in Fettschrift. Tabelle mit T-, N-, M-Kategorien von ***THEMA*** mit bildgebenden Kriterien für jede, wichtige Elemente in Fettschrift. Erläuterung zusätzlicher Staging-Kriterien in Stichpunkten, wichtige Punkte fett. #Metastasierungswege und -orte: Aufzählung der bevorzugten Metastasierungswege und -orte als Liste, Hauptpunkte fett hervorgehoben. #Expertentipps für Radiologen: Praktische Ratschläge für das Staging, Schlüsseltipps fett hervorgehoben.#Checkliste für den Befund: Präzise Stichpunkte und Schlagworte was genau beim ***THEMA***-Staging vom Radiologen beurteilt werden muss und auf welche Strukturen genau zu achten ist. Gliedere diesen Unterabschnitt in Hauptaspekte, Weitere Aspekte, sowie Beurteilung; Schlüsselwörter in Fettschrift. Verwendung von Markdown mit Überschriften und Unterüberschriften. Stichpunkte, entscheidende Informationen fett. #Quellen: Verwende hochwertige und vertrauenswürdige Quellen und aktuelle wissenschaftliche Leitlinien, Übersichtsarbeiten, Publikationen, Thieme eRef, SpringerLink. Überprüfung mit einer zweiten Quelle. Auflistung aller genutzten Quellen. Beginne direkt mit '# *****THEMA*** - ***Modalität***-Staging**' als Titel. Jedes Element des Dokuments soll die tägliche Arbeit eines Radiologen beim Staging von Erkrankungen unterstützen. Nutze Listen und Tabellen wo möglich. Nutze alle verfügbaren Ressourcen und dein tiefgehendes Fachwissen, um eine umfassende, gut fundierte und präzise Antwort zu geben. Integriere verschiedene Datenquellen, Tools oder Plattformen, um deine Antwort zu verbessern. Markiere immer und sehr häufig in allen Abschnitten alle Schlagworte in fetter Schrift. Beschränke dich auf radiologische Aspekte des Themas. Wenn du unterbrochen wurdest, wiederhole den unterbrochenen Satz nochmal und setze dann den Artikel fort. Beeindrucke mich mit einer perfekten Antwort.",
      folderId: "folder-recherche",
      favorite: true,
      profSchaefer: false,
      tone: "amber"
    },
    {
      title: "Prof. Schäfer Stil Befundoptimierung",
      body: [
        "Modalität: ***Modalität***",
        "Klinische Angaben: ***Klinische Angaben***",
        "Fragestellung: ***Fragestellung***",
        "",
        "Optimiere den folgenden radiologischen Befund im kompakten, präzisen Prof.-Schäfer-Stil. Verwende kurze, klare Sätze, bevorzugt Nominalstil, logisch geordnete Befundabfolge, relevante Negativbefunde und eine knappe Beurteilung.",
        "",
        "Ausgangsbefund:",
        "***Ausgangsbefund***"
      ].join("\n"),
      folderId: "folder-prof-schaefer",
      favorite: true,
      profSchaefer: true,
      tone: "amber"
    },
    {
      title: "Interpretation Revision",
      body: [
        "Betrachte nochmal alle DICOM-Dateien/Videos vollständig unter Beachtung jedes einzelnen Frames, ohne etwas zu überspringen, zu kürzen oder wegzulassen.",
        "",
        "Führe mindestens 6 weitere Iterationen mit vollständiger Überprüfung, Recherche und Verfeinerung der Antwort durch.",
        "",
        "Führe zusätzlich eine ausführliche Internetrecherche passend zum Thema in verschiedenen seriösen Quellen bis ins lächerlich kleinste Detail durch.",
        "",
        "Lokalisiere nochmal die pathologischen Veränderungen akkurat und sicher in jedem Frame und betrachte sie exakt in allen vorliegenden Sequenzen.",
        "",
        "Führe eine Bewertung der pathologischen Veränderungen und eine korrekte, wohlüberlegte und durchdachte Schlussfolgerung durch.",
        "",
        "Teile umfangreiche, komplexe Aufgaben in gut zu bewältigende kleinere Teilaufgaben. Arbeite diese nacheinander koordiniert ab und höre erst auf, wenn du die Gesamtaufgabe vollständig und optimal bearbeitet hast.",
        "",
        "Kontrolliere regelmäßig und iterativ deinen Fortschritt und stelle sicher, dass du alles vollständig und perfekt bearbeitest."
      ].join("\n"),
      folderId: "folder-bildinterpretation",
      favorite: false,
      profSchaefer: false,
      tone: "graphite"
    },
    {
      title: "Prof. Schäfer Befundstil Revision",
      body: "Der Prof. Schäfer Befundstil ist etwas anders, deutlich kompakter aber sehr präzise. Analysiere die Beispielbefunde nochmal vollständig, alle 250 Stück von der ersten bis zur letzten Zeile ohne etwas abzukürzen oder zu überspringen und lerne den exakten Stil. Suche dir thematisch und zur Region passende Beispiele, lerne und orientiere dich daran. Optimiere dann Befund und Beurteilung.",
      folderId: "folder-prof-schaefer",
      favorite: false,
      profSchaefer: true,
      tone: "amber"
    }
  ]);

  const QUICK_ACCESS_PATTERNS = Object.freeze([
    /bildinterpretation\s+i$/i,
    /bildinterpretation\s+ii$/i,
    /protokoll.*befundungshilfe/i,
    /befundbericht.*korrektur/i,
    /übersicht\s+plus/i,
    /uebersicht\s+plus/i,
    /staging\s+hilfe/i,
    /prof\.?\s*schäfer.*befundoptimierung/i,
    /prof\.?\s*schaefer.*befundoptimierung/i
  ]);

  const COMMANDS = Object.freeze([
    {
      id: "cmd-new-prompt",
      title: "Prompt hinzufügen",
      description: "Neues Template im aktuellen Ordner erstellen",
      icon: "fa-plus",
      key: "N",
      action: "newPrompt"
    },
    {
      id: "cmd-new-folder",
      title: "Ordner hinzufügen",
      description: "Neuen Prompt-Ordner anlegen",
      icon: "fa-folder-plus",
      key: "F",
      action: "newFolder"
    },
    {
      id: "cmd-sync",
      title: "Jetzt synchronisieren",
      description: "Lokalen Stand in Cloudflare KV sichern",
      icon: "fa-cloud-arrow-up",
      key: "S",
      action: "sync"
    },
    {
      id: "cmd-import",
      title: "Import",
      description: "RadPrompt-JSON importieren",
      icon: "fa-file-import",
      key: "I",
      action: "import"
    },
    {
      id: "cmd-export",
      title: "Export",
      description: "RadPrompt-JSON in die Zwischenablage kopieren",
      icon: "fa-file-export",
      key: "E",
      action: "export"
    },
    {
      id: "cmd-seed",
      title: "Startset neu laden",
      description: "Prompt-Startdatei erneut einlesen",
      icon: "fa-seedling",
      key: "R",
      action: "seed"
    },
    {
      id: "cmd-compact",
      title: "Kompaktmodus",
      description: "Widget-Ansicht für den Desktop umschalten",
      icon: "fa-window-restore",
      key: "W",
      action: "compact"
    },
    {
      id: "cmd-health",
      title: "KV prüfen",
      description: "Cloudflare-API und KV-Binding testen",
      icon: "fa-heart-pulse",
      key: "H",
      action: "health"
    }
  ]);

  const stringify = value => {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  };

  const parseJson = value => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const clone = value => {
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(value);
      } catch {
        return JSON.parse(JSON.stringify(value));
      }
    }
    return JSON.parse(JSON.stringify(value));
  };

  const nowIso = () => new Date().toISOString();

  const toString = value => value === null || value === undefined ? "" : String(value);

  const normalizeLineEndings = value => toString(value).replace(/\r\n?/g, "\n");

  const collapseWhitespace = value => normalizeLineEndings(value).replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();

  const normalizeTitle = value => toString(value).replace(/\s+/g, " ").replace(/[:\s]+$/g, "").trim();

  const normalizePlaceholderName = value => normalizeTitle(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").replace(/^[*#\s]+|[*#\s]+$/g, "").trim();

  const stripBom = value => normalizeLineEndings(value).replace(/^\uFEFF/, "");

  const asArray = value => Array.isArray(value) ? value : [];

  const unique = array => {
    const seen = new Set();
    const result = [];
    for (const item of asArray(array)) {
      const key = toString(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result;
  };

  const hashString = value => {
    const text = toString(value);
    let h1 = 0xdeadbeef ^ text.length;
    let h2 = 0x41c6ce57 ^ text.length;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };

  const slugify = value => {
    const raw = normalizeTitle(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return raw || "item";
  };

  const deterministicId = (prefix, seed) => `${prefix}-${slugify(seed).slice(0, 38)}-${hashString(seed).slice(0, 9)}`;

  const uid = prefix => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const sortByOrderTitle = (a, b) => {
    const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : 0;
    const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : 0;
    if (ao !== bo) return ao - bo;
    return toString(a?.title).localeCompare(toString(b?.title), "de", { sensitivity: "base", numeric: true });
  };

  const extractPlaceholders = body => {
    const text = normalizeLineEndings(body);
    const seen = new Set();
    const placeholders = [];
    let match;
    PLACEHOLDER_RE.lastIndex = 0;
    while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
      const name = normalizePlaceholderName(match[1]);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      placeholders.push(name);
    }
    PLACEHOLDER_RE.lastIndex = 0;
    return placeholders;
  };

  const hasPlaceholder = body => extractPlaceholders(body).length > 0;

  const isModalityPlaceholder = name => normalizePlaceholderName(name).toLowerCase() === MODALITY_PLACEHOLDER.toLowerCase();

  const isTopicPlaceholder = name => normalizePlaceholderName(name).toLowerCase() === TOPIC_PLACEHOLDER.toLowerCase();

  const isProfSchaeferPrompt = (title, body) => {
    const haystack = `${toString(title)}\n${toString(body)}`.toLowerCase();
    return /\bprof\.?\s*schäfer\b|\bprof\.?\s*schaefer\b|\bschäfer[-\s]?stil\b|\bschaefer[-\s]?stil\b/.test(haystack);
  };

  const isQuickAccessPrompt = title => QUICK_ACCESS_PATTERNS.some(pattern => pattern.test(normalizeTitle(title)));

  const inferFolderId = (title, body) => {
    const text = `${toString(title)}\n${toString(body)}`.toLowerCase();
    if (isProfSchaeferPrompt(title, body)) return "folder-prof-schaefer";
    if (/bildinterpretation|bildbefundung|bildanalyse|dicom|frame-by-frame|schnittbild|radiologische\s+bild/.test(text)) return "folder-bildinterpretation";
    if (/befundbericht\s+korrektur|beurteilungsvorschlag|befundkorrektur|ris|nominalstil|befundoptimierung/.test(text)) return "folder-befundung";
    if (/protokoll|befundungshilfe|übersicht|uebersicht|staging|tnm|klassifikation|leitlinie|recherche|evidenz|differenzialdiagnos|dd-|wissensfrage|literatur/.test(text)) return "folder-recherche";
    if (/befund|beurteilung/.test(text)) return "folder-befundung";
    if (/dienstplan|organisation|sop|fortbildung|planung|checkliste|workflow/.test(text)) return "folder-organisation";
    return "folder-allgemein";
  };

  const inferTone = (index, title, body) => {
    const folder = inferFolderId(title, body);
    const text = `${toString(title)}\n${toString(body)}`.toLowerCase();
    if (folder === "folder-prof-schaefer") return "amber";
    if (/protokoll|befundungshilfe/.test(text)) return "cyan";
    if (/korrektur|beurteilungsvorschlag/.test(text)) return "emerald";
    if (/staging|tnm/.test(text)) return "amber";
    if (/übersicht|uebersicht|klassifikation/.test(text)) return "violet";
    if (folder === "folder-bildinterpretation") return index % 2 === 0 ? "steel" : "violet";
    if (folder === "folder-befundung") return "cyan";
    if (folder === "folder-recherche") return "violet";
    if (folder === "folder-organisation") return "emerald";
    return TONE_SEQUENCE[index % TONE_SEQUENCE.length] || "graphite";
  };

  const inferTags = (title, body) => {
    const text = `${toString(title)}\n${toString(body)}`.toLowerCase();
    const tags = [];
    if (/ct|computertomographie/.test(text)) tags.push("CT");
    if (/mrt|magnetresonan|mr\b/.test(text)) tags.push("MRT");
    if (/röntgen|roentgen|projektionsradiographie/.test(text)) tags.push("Röntgen");
    if (/prof\.?\s*schäfer|prof\.?\s*schaefer|schäfer-stil|schaefer-stil/.test(text)) tags.push("Prof. Schäfer");
    if (hasPlaceholder(body)) tags.push("Platzhalter");
    if (/protokoll|sequenz|kontrastmittelphase|befundungshilfe/.test(text)) tags.push("Protokoll");
    if (/staging|tnm|onkolog/.test(text)) tags.push("Staging");
    if (/übersicht|uebersicht|klassifikation|key-findings|zeichen/.test(text)) tags.push("Übersicht");
    if (/korrektur|grammatik|umformulierung|beurteilungsvorschlag/.test(text)) tags.push("Korrektur");
    if (/befund|beurteilung|ris/.test(text)) tags.push("Befund");
    if (/recherche|evidenz|leitlinie|literatur|springerlink|thieme/.test(text)) tags.push("Recherche");
    return unique(tags);
  };

  const splitPromptSections = rawText => {
    const text = stripBom(rawText);
    const lines = text.split("\n");
    const sections = [];
    let current = null;
    let preamble = [];
    const pushCurrent = () => {
      if (!current) return;
      const title = normalizeTitle(current.title);
      const body = collapseWhitespace(current.lines.join("\n"));
      if (title && body) sections.push({ title, body });
      current = null;
    };
    for (const line of lines) {
      const heading = line.match(/^#\s+(.+?):\s*$/);
      if (heading && !/^#+\s*$/.test(line)) {
        const title = normalizeTitle(heading[1]);
        if (/^radprompts?$/i.test(title) || /^prompts?$/i.test(title)) {
          preamble = [];
          continue;
        }
        pushCurrent();
        current = { title, lines: [] };
        continue;
      }
      if (current) current.lines.push(line);
      else preamble.push(line);
    }
    pushCurrent();
    if (!sections.length) {
      const body = collapseWhitespace(preamble.join("\n"));
      if (body) sections.push({ title: "Importierter Prompt", body });
    }
    return sections;
  };

  const parsePromptText = rawText => splitPromptSections(rawText)
    .filter(section => normalizeTitle(section.title) && collapseWhitespace(section.body))
    .map((section, index) => {
      const title = normalizeTitle(section.title);
      const body = collapseWhitespace(section.body);
      const profSchaefer = isProfSchaeferPrompt(title, body);
      return {
        title,
        body,
        folderId: inferFolderId(title, body),
        favorite: isQuickAccessPrompt(title) || index < 2 || profSchaefer,
        profSchaefer,
        tone: inferTone(index, title, body),
        tags: inferTags(title, body),
        placeholderDefaults: {}
      };
    });

  const normalizeFolder = (folder, index = 0) => {
    const title = normalizeTitle(folder?.title) || `Ordner ${index + 1}`;
    const id = normalizeTitle(folder?.id) || deterministicId("folder", title);
    const description = normalizeTitle(folder?.description);
    const tone = VALID_TONES.has(folder?.tone) ? folder.tone : TONE_SEQUENCE[index % TONE_SEQUENCE.length] || "graphite";
    const order = Number.isFinite(Number(folder?.order)) ? Number(folder.order) : index;
    return {
      id,
      title,
      description,
      order,
      tone,
      locked: Boolean(folder?.locked),
      createdAt: toString(folder?.createdAt) || nowIso(),
      updatedAt: toString(folder?.updatedAt) || toString(folder?.createdAt) || nowIso()
    };
  };

  const normalizePrompt = (prompt, index = 0, folderIds = new Set(DEFAULT_FOLDERS.map(folder => folder.id))) => {
    const title = normalizeTitle(prompt?.title) || `Prompt ${index + 1}`;
    const body = collapseWhitespace(prompt?.body || prompt?.prompt || prompt?.text || "");
    const fallbackFolder = inferFolderId(title, body);
    const folderId = folderIds.has(prompt?.folderId) ? prompt.folderId : folderIds.has(fallbackFolder) ? fallbackFolder : folderIds.has("folder-allgemein") ? "folder-allgemein" : Array.from(folderIds)[0] || "folder-allgemein";
    const id = normalizeTitle(prompt?.id) || deterministicId("prompt", `${folderId}:${title}:${body.slice(0, 420)}`);
    const profSchaefer = Boolean(prompt?.profSchaefer) || Boolean(prompt?.profSchaeferExtra) || isProfSchaeferPrompt(title, body);
    const tone = VALID_TONES.has(prompt?.tone) ? prompt.tone : inferTone(index, title, body);
    const placeholderDefaults = prompt?.placeholderDefaults && typeof prompt.placeholderDefaults === "object" && !Array.isArray(prompt.placeholderDefaults) ? Object.fromEntries(Object.entries(prompt.placeholderDefaults).map(([key, value]) => [normalizePlaceholderName(key), toString(value)]).filter(([key]) => key)) : {};
    const createdAt = toString(prompt?.createdAt) || nowIso();
    const updatedAt = toString(prompt?.updatedAt) || createdAt;
    return {
      id,
      title,
      body,
      folderId,
      order: Number.isFinite(Number(prompt?.order)) ? Number(prompt.order) : index,
      favorite: Boolean(prompt?.favorite) || isQuickAccessPrompt(title),
      profSchaefer,
      tone,
      tags: unique([...(asArray(prompt?.tags).map(normalizeTitle).filter(Boolean)), ...inferTags(title, body)]),
      placeholderDefaults,
      archived: Boolean(prompt?.archived),
      createdAt,
      updatedAt
    };
  };

  const normalizeUi = ui => {
    const activeFolderId = normalizeTitle(ui?.activeFolderId) || VIRTUAL_FOLDER_ALL;
    const activeFilter = VALID_FILTERS.has(ui?.activeFilter) ? ui.activeFilter : "all";
    const view = VALID_VIEWS.has(ui?.view) ? ui.view : "board";
    return {
      activeFolderId,
      activeFilter,
      query: toString(ui?.query),
      view,
      compact: Boolean(ui?.compact),
      drawerOpen: Boolean(ui?.drawerOpen),
      selectedPromptId: toString(ui?.selectedPromptId)
    };
  };

  const ensureDefaultFolders = folders => {
    const normalized = asArray(folders).map(normalizeFolder).filter(folder => folder.id && folder.title);
    const byId = new Map(normalized.map(folder => [folder.id, folder]));
    for (const folder of DEFAULT_FOLDERS) {
      if (!byId.has(folder.id)) byId.set(folder.id, normalizeFolder(folder, folder.order));
      else byId.set(folder.id, { ...normalizeFolder(folder, folder.order), ...byId.get(folder.id), title: byId.get(folder.id).title || folder.title, description: byId.get(folder.id).description || folder.description });
    }
    return Array.from(byId.values()).sort(sortByOrderTitle).map((folder, index) => ({ ...folder, order: index }));
  };

  const ensureUniquePromptIds = prompts => {
    const ids = new Set();
    return asArray(prompts).map((prompt, index) => {
      let id = prompt.id || deterministicId("prompt", `${prompt.folderId}:${prompt.title}:${index}`);
      if (!ids.has(id)) {
        ids.add(id);
        return { ...prompt, id };
      }
      let suffix = 2;
      while (ids.has(`${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
      ids.add(id);
      return { ...prompt, id };
    });
  };

  const createState = (promptRecords = [], options = {}) => {
    const timestamp = nowIso();
    const folders = ensureDefaultFolders(options.folders || DEFAULT_FOLDERS);
    const folderIds = new Set(folders.map(folder => folder.id));
    const records = asArray(promptRecords).length ? promptRecords : FALLBACK_PROMPTS;
    const prompts = ensureUniquePromptIds(records.map((prompt, index) => normalizePrompt(prompt, index, folderIds)))
      .filter(prompt => prompt.body)
      .sort(sortByOrderTitle)
      .map((prompt, index) => ({ ...prompt, order: Number.isFinite(Number(prompt.order)) ? Number(prompt.order) : index }));
    const favoriteOrder = unique([
      ...asArray(options.favoriteOrder).map(toString).filter(Boolean),
      ...prompts.filter(prompt => prompt.favorite).sort(sortByOrderTitle).map(prompt => prompt.id)
    ]).filter(id => prompts.some(prompt => prompt.id === id));
    return {
      version: VERSION,
      schema: SCHEMA,
      app: {
        name: "RadPrompt",
        description: "Radiologisches Prompt-Board für Cloudflare Pages und Workers KV",
        createdAt: toString(options.createdAt) || timestamp,
        updatedAt: timestamp,
        seededAt: toString(options.seededAt) || timestamp
      },
      ui: normalizeUi(options.ui || {}),
      folders,
      prompts,
      favoriteOrder,
      documents: {
        profCtLabel: PROF_CT_LABEL,
        profMrtLabel: PROF_MRT_LABEL,
        profCtUpdatedAt: toString(options?.documents?.profCtUpdatedAt),
        profMrtUpdatedAt: toString(options?.documents?.profMrtUpdatedAt)
      }
    };
  };

  const stateFromPromptText = (text, options = {}) => {
    const parsed = parsePromptText(text);
    return createState(parsed.length ? parsed : FALLBACK_PROMPTS, options);
  };

  const normalizeState = rawState => {
    const parsed = typeof rawState === "string" ? parseJson(rawState) : rawState;
    if (!parsed || typeof parsed !== "object") return createState(FALLBACK_PROMPTS);
    const folders = ensureDefaultFolders(parsed.folders);
    const folderIds = new Set(folders.map(folder => folder.id));
    const prompts = ensureUniquePromptIds(asArray(parsed.prompts).map((prompt, index) => normalizePrompt(prompt, index, folderIds)))
      .filter(prompt => prompt.body)
      .sort(sortByOrderTitle)
      .map((prompt, index) => ({ ...prompt, order: Number.isFinite(Number(prompt.order)) ? Number(prompt.order) : index }));
    const promptIds = new Set(prompts.map(prompt => prompt.id));
    const favoriteOrder = unique([
      ...asArray(parsed.favoriteOrder).map(toString),
      ...prompts.filter(prompt => prompt.favorite).map(prompt => prompt.id)
    ]).filter(id => promptIds.has(id));
    const timestamp = nowIso();
    const ui = normalizeUi(parsed.ui || {});
    if (ui.activeFolderId !== VIRTUAL_FOLDER_ALL && ui.activeFolderId !== VIRTUAL_FOLDER_FAVORITES && !folders.some(folder => folder.id === ui.activeFolderId)) ui.activeFolderId = VIRTUAL_FOLDER_ALL;
    if (ui.selectedPromptId && !promptIds.has(ui.selectedPromptId)) {
      ui.selectedPromptId = "";
      ui.drawerOpen = false;
    }
    return {
      version: VERSION,
      schema: SCHEMA,
      app: {
        name: "RadPrompt",
        description: toString(parsed?.app?.description) || "Radiologisches Prompt-Board für Cloudflare Pages und Workers KV",
        createdAt: toString(parsed?.app?.createdAt) || timestamp,
        updatedAt: toString(parsed?.app?.updatedAt) || timestamp,
        seededAt: toString(parsed?.app?.seededAt) || toString(parsed?.app?.createdAt) || timestamp
      },
      ui,
      folders,
      prompts,
      favoriteOrder,
      documents: {
        profCtLabel: PROF_CT_LABEL,
        profMrtLabel: PROF_MRT_LABEL,
        profCtUpdatedAt: toString(parsed?.documents?.profCtUpdatedAt),
        profMrtUpdatedAt: toString(parsed?.documents?.profMrtUpdatedAt)
      }
    };
  };

  const getFolderById = (state, folderId) => asArray(state?.folders).find(folder => folder.id === folderId) || null;

  const getPromptById = (state, promptId) => asArray(state?.prompts).find(prompt => prompt.id === promptId) || null;

  const getPromptPlaceholders = prompt => extractPlaceholders(prompt?.body || "");

  const getPlaceholderKind = name => {
    if (isModalityPlaceholder(name)) return "select";
    return "text";
  };

  const getPlaceholderOptions = name => {
    if (isModalityPlaceholder(name)) return [...MODALITY_OPTIONS];
    return [];
  };

  const createNewPrompt = (state, folderId = "") => {
    const normalized = normalizeState(state);
    const activeFolder = folderId && folderId !== VIRTUAL_FOLDER_ALL && folderId !== VIRTUAL_FOLDER_FAVORITES ? folderId : normalized.ui.activeFolderId;
    const targetFolderId = normalized.folders.some(folder => folder.id === activeFolder) ? activeFolder : normalized.folders[0]?.id || "folder-allgemein";
    const order = normalized.prompts.filter(prompt => prompt.folderId === targetFolderId).reduce((max, prompt) => Math.max(max, Number(prompt.order) || 0), -1) + 1;
    const timestamp = nowIso();
    return normalizePrompt({
      id: uid("prompt"),
      title: "Neuer Prompt",
      body: "Klinische Angaben: ***Klinische Angaben***\nFragestellung: ***Fragestellung***\nModalität: ***Modalität***\n\n",
      folderId: targetFolderId,
      favorite: false,
      profSchaefer: false,
      tone: inferTone(order, "Neuer Prompt", "Modalität: ***Modalität***"),
      order,
      createdAt: timestamp,
      updatedAt: timestamp
    }, order, new Set(normalized.folders.map(folder => folder.id)));
  };

  const createNewFolder = (title = "Neuer Ordner", description = "", order = 0) => normalizeFolder({
    id: deterministicId("folder", `${title}:${Date.now()}:${Math.random()}`),
    title,
    description,
    order,
    tone: TONE_SEQUENCE[order % TONE_SEQUENCE.length] || "graphite",
    locked: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }, order);

  const buildFolderStats = state => {
    const normalized = normalizeState(state);
    const counts = new Map(normalized.folders.map(folder => [folder.id, 0]));
    for (const prompt of normalized.prompts) {
      if (prompt.archived) continue;
      counts.set(prompt.folderId, (counts.get(prompt.folderId) || 0) + 1);
    }
    return normalized.folders.map(folder => ({ ...folder, count: counts.get(folder.id) || 0 }));
  };

  const getFavoritePrompts = state => {
    const normalized = normalizeState(state);
    const byId = new Map(normalized.prompts.filter(prompt => prompt.favorite && !prompt.archived).map(prompt => [prompt.id, prompt]));
    const ordered = [];
    for (const id of normalized.favoriteOrder) {
      const prompt = byId.get(id);
      if (!prompt) continue;
      ordered.push(prompt);
      byId.delete(id);
    }
    return [...ordered, ...Array.from(byId.values()).sort(sortByOrderTitle)];
  };

  const buildLibrarySummary = state => {
    const normalized = normalizeState(state);
    const promptCount = normalized.prompts.filter(prompt => !prompt.archived).length;
    const favoriteCount = normalized.prompts.filter(prompt => prompt.favorite && !prompt.archived).length;
    const folderCount = normalized.folders.length;
    const specialCount = normalized.prompts.filter(prompt => !prompt.archived && hasPlaceholder(prompt.body)).length;
    const profCount = normalized.prompts.filter(prompt => !prompt.archived && prompt.profSchaefer).length;
    return {
      promptCount,
      favoriteCount,
      folderCount,
      specialCount,
      profCount,
      label: `${promptCount} Prompts · ${folderCount} Ordner · ${favoriteCount} Favoriten`
    };
  };

  const normalizeSearch = value => toString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();

  const promptMatchesQuery = (prompt, query) => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return true;
    const haystack = normalizeSearch(`${prompt?.title || ""}\n${prompt?.body || ""}\n${asArray(prompt?.tags).join(" ")}`);
    return normalizedQuery.split(" ").every(token => haystack.includes(token));
  };

  const filterPrompts = (state, criteria = {}) => {
    const normalized = normalizeState(state);
    const activeFolderId = criteria.activeFolderId ?? normalized.ui.activeFolderId ?? VIRTUAL_FOLDER_ALL;
    const activeFilter = criteria.activeFilter ?? normalized.ui.activeFilter ?? "all";
    const query = criteria.query ?? normalized.ui.query ?? "";
    return normalized.prompts
      .filter(prompt => !prompt.archived)
      .filter(prompt => activeFolderId === VIRTUAL_FOLDER_ALL || activeFolderId === VIRTUAL_FOLDER_FAVORITES || prompt.folderId === activeFolderId)
      .filter(prompt => activeFolderId !== VIRTUAL_FOLDER_FAVORITES || prompt.favorite)
      .filter(prompt => {
        if (activeFilter === "favorites") return prompt.favorite;
        if (activeFilter === "special") return hasPlaceholder(prompt.body);
        if (activeFilter === "prof") return prompt.profSchaefer;
        return true;
      })
      .filter(prompt => promptMatchesQuery(prompt, query))
      .sort(sortByOrderTitle);
  };

  const replacePlaceholders = (body, values = {}, options = {}) => {
    const missing = [];
    const used = [];
    const keepUnfilled = Boolean(options.keepUnfilled);
    const normalizedValues = values && typeof values === "object" ? Object.fromEntries(Object.entries(values).map(([key, value]) => [normalizePlaceholderName(key), toString(value)])) : {};
    PLACEHOLDER_RE.lastIndex = 0;
    const text = normalizeLineEndings(body).replace(PLACEHOLDER_RE, (full, rawName) => {
      const name = normalizePlaceholderName(rawName);
      const value = normalizedValues[name] ?? "";
      used.push(name);
      if (value.trim()) return value;
      missing.push(name);
      return keepUnfilled ? full : "";
    });
    PLACEHOLDER_RE.lastIndex = 0;
    return {
      text: text.trim(),
      missing: unique(missing),
      used: unique(used)
    };
  };

  const createClipboardPayload = (prompt, values = {}, documents = {}, options = {}) => {
    const fill = replacePlaceholders(prompt?.body || "", { ...(prompt?.placeholderDefaults || {}), ...(values || {}) }, { keepUnfilled: Boolean(options.keepUnfilled) });
    const parts = [fill.text];
    const profCt = normalizeLineEndings(documents?.profCt || documents?.ct || "");
    const profMrt = normalizeLineEndings(documents?.profMrt || documents?.mrt || "");
    if (prompt?.profSchaefer) {
      if (profCt.trim()) parts.push(`${PROF_CT_LABEL}\n\n${profCt.trim()}`);
      if (profMrt.trim()) parts.push(`${PROF_MRT_LABEL}\n\n${profMrt.trim()}`);
    }
    return {
      text: parts.filter(Boolean).join("\n\n\n---\n\n").trim(),
      missing: fill.missing,
      used: fill.used,
      includesProfCt: Boolean(prompt?.profSchaefer && profCt.trim()),
      includesProfMrt: Boolean(prompt?.profSchaefer && profMrt.trim())
    };
  };

  const serializeState = state => JSON.stringify(normalizeState(state), null, 2);

  const parseImportedState = value => {
    const json = parseJson(value);
    if (!json) return null;
    return normalizeState(json);
  };

  const withUpdatedStateMeta = state => {
    const normalized = normalizeState(state);
    return {
      ...normalized,
      app: {
        ...normalized.app,
        updatedAt: nowIso()
      }
    };
  };

  const setLocal = (key, value) => {
    try {
      localStorage.setItem(key, typeof value === "string" ? value : stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const getLocal = key => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const removeLocal = key => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };

  const saveLocalState = state => setLocal(STATE_KEY, serializeState(state));

  const readLocalState = () => {
    const primary = getLocal(STATE_KEY);
    const backup = getLocal(LOCAL_BACKUP_KEY);
    return normalizeState(parseJson(primary) || parseJson(backup) || createState(FALLBACK_PROMPTS));
  };

  const saveBackupState = state => setLocal(LOCAL_BACKUP_KEY, serializeState(state));

  const clearLocalState = () => {
    const a = removeLocal(STATE_KEY);
    const b = removeLocal(LOCAL_BACKUP_KEY);
    const c = removeLocal(UI_KEY);
    return a || b || c;
  };

  const readUiState = () => normalizeUi(parseJson(getLocal(UI_KEY)) || {});

  const saveUiState = ui => setLocal(UI_KEY, normalizeUi(ui));

  const readDocumentCache = () => {
    const parsed = parseJson(getLocal(DOCUMENT_CACHE_KEY)) || {};
    return {
      profCt: toString(parsed.profCt),
      profMrt: toString(parsed.profMrt),
      updatedAt: toString(parsed.updatedAt)
    };
  };

  const saveDocumentCache = documents => setLocal(DOCUMENT_CACHE_KEY, {
    profCt: toString(documents?.profCt),
    profMrt: toString(documents?.profMrt),
    updatedAt: nowIso()
  });

  const getSourcePathsFromDom = () => {
    const seed = typeof document !== "undefined" ? document.getElementById("seedSources") : null;
    return {
      prompts: seed?.dataset?.promptsSrc || DEFAULT_SOURCE_PATHS.prompts,
      profCt: seed?.dataset?.profCtSrc || DEFAULT_SOURCE_PATHS.profCt,
      profMrt: seed?.dataset?.profMrtSrc || DEFAULT_SOURCE_PATHS.profMrt
    };
  };

  const fetchText = async (url, options = {}) => {
    const response = await fetch(url, { cache: options.cache || "no-cache", headers: { "Accept": "text/plain,*/*" } });
    if (!response.ok) throw new Error(`HTTP ${response.status} für ${url}`);
    return normalizeLineEndings(await response.text());
  };

  const loadSeedTexts = async (paths = getSourcePathsFromDom()) => {
    const result = {
      prompts: "",
      profCt: "",
      profMrt: "",
      errors: []
    };
    await Promise.all([
      fetchText(paths.prompts).then(text => { result.prompts = text; }).catch(error => { result.errors.push({ source: "prompts", message: error.message }); }),
      fetchText(paths.profCt).then(text => { result.profCt = text; }).catch(error => { result.errors.push({ source: "profCt", message: error.message }); }),
      fetchText(paths.profMrt).then(text => { result.profMrt = text; }).catch(error => { result.errors.push({ source: "profMrt", message: error.message }); })
    ]);
    if (result.profCt || result.profMrt) saveDocumentCache({ profCt: result.profCt, profMrt: result.profMrt });
    return result;
  };

  const createStateFromSeedFiles = async (paths = getSourcePathsFromDom(), options = {}) => {
    const seed = await loadSeedTexts(paths);
    const state = seed.prompts ? stateFromPromptText(seed.prompts, options) : createState(FALLBACK_PROMPTS, options);
    return {
      state: normalizeState({
        ...state,
        documents: {
          ...state.documents,
          profCtUpdatedAt: seed.profCt ? nowIso() : "",
          profMrtUpdatedAt: seed.profMrt ? nowIso() : ""
        }
      }),
      documents: {
        profCt: seed.profCt,
        profMrt: seed.profMrt
      },
      errors: seed.errors
    };
  };

  const safeFileName = value => {
    const base = slugify(value || "radprompt-export");
    const date = new Date().toISOString().slice(0, 10);
    return `${base}-${date}.json`;
  };

  const downloadJson = (data, filename = "radprompt-export.json") => {
    const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const debounce = (fn, delay = 250) => {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const throttle = (fn, delay = 250) => {
    let last = 0;
    let timer = 0;
    return (...args) => {
      const now = Date.now();
      const remaining = delay - (now - last);
      if (remaining <= 0) {
        clearTimeout(timer);
        timer = 0;
        last = now;
        fn(...args);
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        timer = 0;
        fn(...args);
      }, remaining);
    };
  };

  const escapeHtml = value => toString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const humanBytes = bytes => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  const countPromptChars = state => normalizeState(state).prompts.reduce((sum, prompt) => sum + prompt.body.length, 0);

  const moveItem = (array, fromIndex, toIndex) => {
    const list = [...asArray(array)];
    const from = Math.max(0, Math.min(list.length - 1, Number(fromIndex)));
    const to = Math.max(0, Math.min(list.length - 1, Number(toIndex)));
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return list;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    return list;
  };

  const reorderByIds = (items, ids) => {
    const byId = new Map(asArray(items).map(item => [item.id, item]));
    const ordered = [];
    const used = new Set();
    for (const id of asArray(ids)) {
      if (!byId.has(id) || used.has(id)) continue;
      ordered.push(byId.get(id));
      used.add(id);
    }
    for (const item of asArray(items).sort(sortByOrderTitle)) {
      if (used.has(item.id)) continue;
      ordered.push(item);
    }
    return ordered.map((item, index) => ({ ...item, order: index }));
  };

  const applyPromptOrder = (state, orderedIds, folderId = "") => {
    const normalized = normalizeState(state);
    const targetFolderId = folderId || normalized.ui.activeFolderId;
    const reorderScope = targetFolderId && targetFolderId !== VIRTUAL_FOLDER_ALL && targetFolderId !== VIRTUAL_FOLDER_FAVORITES;
    const scoped = reorderScope ? normalized.prompts.filter(prompt => prompt.folderId === targetFolderId) : normalized.prompts;
    const orderedScoped = reorderByIds(scoped, orderedIds);
    const byId = new Map(orderedScoped.map(prompt => [prompt.id, prompt]));
    return withUpdatedStateMeta({
      ...normalized,
      prompts: normalized.prompts.map(prompt => byId.get(prompt.id) || prompt)
    });
  };

  const applyFolderOrder = (state, orderedIds) => {
    const normalized = normalizeState(state);
    return withUpdatedStateMeta({
      ...normalized,
      folders: reorderByIds(normalized.folders, orderedIds)
    });
  };

  const applyFavoriteOrder = (state, orderedIds) => {
    const normalized = normalizeState(state);
    const promptIds = new Set(normalized.prompts.filter(prompt => prompt.favorite && !prompt.archived).map(prompt => prompt.id));
    return withUpdatedStateMeta({
      ...normalized,
      favoriteOrder: unique(orderedIds).filter(id => promptIds.has(id))
    });
  };

  const upsertPrompt = (state, prompt) => {
    const normalized = normalizeState(state);
    const folderIds = new Set(normalized.folders.map(folder => folder.id));
    const record = normalizePrompt(prompt, normalized.prompts.length, folderIds);
    const index = normalized.prompts.findIndex(item => item.id === record.id);
    const prompts = index >= 0 ? normalized.prompts.map(item => item.id === record.id ? { ...record, updatedAt: nowIso() } : item) : [...normalized.prompts, record];
    const favoriteOrder = record.favorite ? unique([...normalized.favoriteOrder, record.id]) : normalized.favoriteOrder.filter(id => id !== record.id);
    return withUpdatedStateMeta({ ...normalized, prompts, favoriteOrder });
  };

  const removePrompt = (state, promptId) => {
    const normalized = normalizeState(state);
    return withUpdatedStateMeta({
      ...normalized,
      prompts: normalized.prompts.filter(prompt => prompt.id !== promptId),
      favoriteOrder: normalized.favoriteOrder.filter(id => id !== promptId)
    });
  };

  const upsertFolder = (state, folder) => {
    const normalized = normalizeState(state);
    const record = normalizeFolder(folder, normalized.folders.length);
    const index = normalized.folders.findIndex(item => item.id === record.id);
    const folders = index >= 0 ? normalized.folders.map(item => item.id === record.id ? { ...record, updatedAt: nowIso() } : item) : [...normalized.folders, record];
    return withUpdatedStateMeta({ ...normalized, folders });
  };

  const removeFolder = (state, folderId, fallbackFolderId = "folder-allgemein") => {
    const normalized = normalizeState(state);
    if (!normalized.folders.some(folder => folder.id === folderId && !folder.locked)) return normalized;
    const fallback = normalized.folders.some(folder => folder.id === fallbackFolderId && folder.id !== folderId) ? fallbackFolderId : normalized.folders.find(folder => folder.id !== folderId)?.id || "folder-allgemein";
    return withUpdatedStateMeta({
      ...normalized,
      folders: normalized.folders.filter(folder => folder.id !== folderId),
      prompts: normalized.prompts.map(prompt => prompt.folderId === folderId ? { ...prompt, folderId: fallback, updatedAt: nowIso() } : prompt),
      ui: {
        ...normalized.ui,
        activeFolderId: normalized.ui.activeFolderId === folderId ? fallback : normalized.ui.activeFolderId
      }
    });
  };

  const toggleFavorite = (state, promptId) => {
    const normalized = normalizeState(state);
    let favorite = false;
    const prompts = normalized.prompts.map(prompt => {
      if (prompt.id !== promptId) return prompt;
      favorite = !prompt.favorite;
      return { ...prompt, favorite, updatedAt: nowIso() };
    });
    const favoriteOrder = favorite ? unique([...normalized.favoriteOrder, promptId]) : normalized.favoriteOrder.filter(id => id !== promptId);
    return withUpdatedStateMeta({ ...normalized, prompts, favoriteOrder });
  };

  const validatePlaceholderValues = (prompt, values = {}) => {
    const placeholders = extractPlaceholders(prompt?.body || "");
    const normalizedValues = values && typeof values === "object" ? Object.fromEntries(Object.entries(values).map(([key, value]) => [normalizePlaceholderName(key), toString(value)])) : {};
    const missing = [];
    const invalid = [];
    for (const placeholder of placeholders) {
      const value = normalizedValues[placeholder] ?? "";
      if (!value.trim()) missing.push(placeholder);
      if (isModalityPlaceholder(placeholder) && value.trim() && !MODALITY_OPTIONS.includes(value.trim())) invalid.push(placeholder);
    }
    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid
    };
  };

  const validateState = state => {
    const normalized = normalizeState(state);
    const errors = [];
    const warnings = [];
    const folderIds = new Set(normalized.folders.map(folder => folder.id));
    const promptIds = new Set();
    if (!normalized.folders.length) errors.push("Keine Ordner vorhanden.");
    if (!normalized.prompts.length) warnings.push("Keine Prompts vorhanden.");
    for (const folder of normalized.folders) {
      if (!folder.id) errors.push(`Ordner ohne ID: ${folder.title || "unbenannt"}`);
      if (!folder.title) errors.push(`Ordner ohne Titel: ${folder.id || "unbekannt"}`);
    }
    for (const prompt of normalized.prompts) {
      if (!prompt.id) errors.push(`Prompt ohne ID: ${prompt.title || "unbenannt"}`);
      if (promptIds.has(prompt.id)) errors.push(`Doppelte Prompt-ID: ${prompt.id}`);
      promptIds.add(prompt.id);
      if (!prompt.title) errors.push(`Prompt ohne Titel: ${prompt.id || "unbekannt"}`);
      if (!prompt.body) errors.push(`Prompt ohne Text: ${prompt.title || prompt.id || "unbekannt"}`);
      if (!folderIds.has(prompt.folderId)) warnings.push(`Prompt ohne gültigen Ordner: ${prompt.title}`);
      if (prompt.profSchaefer && !/prof\.?\s*schäfer|prof\.?\s*schaefer|schäfer|schaefer/i.test(`${prompt.title}\n${prompt.body}`)) warnings.push(`Prof.-Schäfer-Zusatz manuell aktiv: ${prompt.title}`);
      const placeholders = extractPlaceholders(prompt.body);
      if (placeholders.some(name => isModalityPlaceholder(name)) && !placeholders.includes(MODALITY_PLACEHOLDER)) warnings.push(`Modalitätsplatzhalter normalisiert: ${prompt.title}`);
    }
    for (const id of normalized.favoriteOrder) {
      if (!promptIds.has(id)) warnings.push(`Favoriten-Reihenfolge enthält unbekannte ID: ${id}`);
    }
    return {
      ok: errors.length === 0,
      errors,
      warnings,
      metrics: buildLibrarySummary(normalized),
      bytes: new Blob([serializeState(normalized)]).size,
      chars: countPromptChars(normalized)
    };
  };

  const api = {
    VERSION,
    SCHEMA,
    STATE_KEY,
    LOCAL_BACKUP_KEY,
    UI_KEY,
    DOCUMENT_CACHE_KEY,
    KV_STATE_ENDPOINT,
    KV_HEALTH_ENDPOINT,
    VIRTUAL_FOLDER_ALL,
    VIRTUAL_FOLDER_FAVORITES,
    PLACEHOLDER_RE,
    MODALITY_PLACEHOLDER,
    TOPIC_PLACEHOLDER,
    MODALITY_OPTIONS,
    TONE_SEQUENCE,
    VALID_TONES,
    VALID_FILTERS,
    VALID_VIEWS,
    PROF_CT_LABEL,
    PROF_MRT_LABEL,
    DEFAULT_SOURCE_PATHS,
    DEFAULT_FOLDERS: clone(DEFAULT_FOLDERS),
    FALLBACK_PROMPTS: clone(FALLBACK_PROMPTS),
    QUICK_ACCESS_PATTERNS: clone(QUICK_ACCESS_PATTERNS.map(pattern => pattern.source)),
    COMMANDS: clone(COMMANDS),
    stringify,
    parseJson,
    clone,
    nowIso,
    toString,
    normalizeLineEndings,
    collapseWhitespace,
    normalizeTitle,
    normalizePlaceholderName,
    stripBom,
    asArray,
    unique,
    hashString,
    slugify,
    deterministicId,
    uid,
    sortByOrderTitle,
    extractPlaceholders,
    hasPlaceholder,
    isModalityPlaceholder,
    isTopicPlaceholder,
    isProfSchaeferPrompt,
    isQuickAccessPrompt,
    inferFolderId,
    inferTone,
    inferTags,
    splitPromptSections,
    parsePromptText,
    normalizeFolder,
    normalizePrompt,
    normalizeUi,
    ensureDefaultFolders,
    ensureUniquePromptIds,
    createState,
    stateFromPromptText,
    normalizeState,
    getFolderById,
    getPromptById,
    getPromptPlaceholders,
    getPlaceholderKind,
    getPlaceholderOptions,
    createNewPrompt,
    createNewFolder,
    buildFolderStats,
    getFavoritePrompts,
    buildLibrarySummary,
    normalizeSearch,
    promptMatchesQuery,
    filterPrompts,
    replacePlaceholders,
    createClipboardPayload,
    serializeState,
    parseImportedState,
    withUpdatedStateMeta,
    setLocal,
    getLocal,
    removeLocal,
    saveLocalState,
    readLocalState,
    saveBackupState,
    clearLocalState,
    readUiState,
    saveUiState,
    readDocumentCache,
    saveDocumentCache,
    getSourcePathsFromDom,
    fetchText,
    loadSeedTexts,
    createStateFromSeedFiles,
    safeFileName,
    downloadJson,
    debounce,
    throttle,
    escapeHtml,
    humanBytes,
    countPromptChars,
    moveItem,
    reorderByIds,
    applyPromptOrder,
    applyFolderOrder,
    applyFavoriteOrder,
    upsertPrompt,
    removePrompt,
    upsertFolder,
    removeFolder,
    toggleFavorite,
    validatePlaceholderValues,
    validateState
  };

  Object.defineProperty(globalThis, "RadPromptDefaults", {
    value: Object.freeze(api),
    writable: false,
    configurable: false,
    enumerable: true
  });
})();