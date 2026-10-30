# Fitness-App: Spezifikation

Oct 20, 2026 · @Andreas

## Überblick

Gebaut wird eine persönliche Trainings-App als Web-App (PWA), die einen adaptiven Trainingsplan für Muskelaufbau und allgemeine Fitness erstellt und nahtlos zwischen Körpergewicht und Equipment wechselt.

**Problem heute:** Freeletics bildet den Wechsel zwischen Workouts mit und ohne Equipment nicht als durchgängige Journey ab. Übungen werden manuell getauscht, dadurch wird die Progression verfälscht.

**Kernidee:** Jede Übung gehört zu einem Bewegungsmuster. Equipment bestimmt nur, welche Variante gewählt wird. Progression und Feedback laufen pro Bewegungsmuster weiter, egal mit welcher Variante trainiert wurde.

**Scope (Version 1)**

| Thema | Entscheidung |
| --- | --- |
| Nutzer | Nur eine Person, kein Login, kein Store-Release |
| Plattform | PWA, auf dem Handy installierbar, offline nutzbar |
| Daten | Nur lokal auf dem Gerät, Backup als Export/Import-Datei; wöchentlicher Vorschlag mit Sichern in Drive per Teilen-Menü (Entscheidung 21.10.2026) |
| Übungsnamen | Englisch, wie von Freeletics gewohnt („Pushups“, „Pullups“, „Squats“); Hantelübungen mit der üblichen englischen Gym-Bezeichnung. Gilt auch für das Aufwärmen. Anleitungen, Hinweise und Bedienung bleiben deutsch. Maßgeblich ist der Name im Katalog; nennt die Spezifikation eine Übung deutsch, ist dieselbe Katalogübung gemeint (Entscheidung 29.10.2026) |
| Übungsvideos | Keine eigenen Videos, pro Übung eine Kurzanleitung und ein fest eingebettetes YouTube-Video (alle Katalogübungen, Entscheidung 21.10.2026) |
| Sprache | Deutsch |
| Einheiten | kg |

**Nicht im Scope:** Ernährung, Social Features, Wearable-Anbindung, Cloud-Sync, Bezahlfunktionen.

## So setzt du die App um (ohne Programmierkenntnisse)

Die vollständige Schritt-für-Schritt-Anleitung (Repository, Claude Code, Projektregeln in `CLAUDE.md`, Auftragstexte pro Paket, Veröffentlichen, spätere Anpassungen) steht im separaten Dokument [Umsetzungsanleitung Fitness-App](https://claude.ai/code/artifact/f2d510c7-5671-49cc-8370-490c994e6b6a). Im Repository liegen alle Unterlagen im Ordner `docs/`: diese Spezifikation als `spezifikation.md`, der Tab Übungskatalog als `uebungskatalog.md`, `katalog.json`, die beiden Python-Prototypen und die Mockups als Bilder in `docs/mockups/`.

**Rangfolge der Unterlagen:** diese Spezifikation, dann die Mockups, dann die Prototypen. Die Prototypen sind Illustrationen und Quelle für Testszenarien, nicht für Regeln; wo sie abweichen, gilt die Spezifikation. Mockups zeigen Aufbau und Stil; Texte, Zahlen und Beispielübungen darin sind Beispieldaten, maßgeblich ist der Katalog. Die Klarstellungen aus dem Probelauf (`docs/klarstellungen.md`, Stand 20.10.2026) sind in dieses Dokument eingearbeitet.

## Nutzerprofil und Onboarding

Das Onboarding erfasst Ziele, Rahmenbedingungen und Equipment und endet mit einem Testtag, der die Startstufe jedes Bewegungsmusters festlegt.

**Profilfelder (alle später in den Einstellungen änderbar)**

| Feld | Werte | Standard |
| --- | --- | --- |
| Ziele | Mehrfachauswahl: Muskelaufbau, Fettabbau/Fitness allgemein, Kraft, Ausdauer | Muskelaufbau + Fitness allgemein |
| Trainingslevel | Einsteiger, Fortgeschritten, Erfahren | Fortgeschritten |
| Übliche Einheiten pro Woche | 1 bis 6; nur Startwert für die Zahl der vorausgewählten Trainingstage, die jede Woche neu gewählt werden | 3 |
| Standard-Trainingsdauer | 20 bis 90 Min in 5-Min-Schritten | 40 Min |
| Längere Einheiten anbieten | Ja/Nein: in Wochen mit 1 bis 2 Einheiten „15 Min länger?“ vorschlagen | Ja |
| Muskelprioritäten | Pro Muskelgruppe: hoch, normal, niedrig, sehr niedrig | Alle normal (Entscheidung 29.10.2026, vorher „Oberkörper betont“; siehe Planungslogik) |
| Ziel-Reserve | 1 bis 3 Wdh. (Standard) oder 2 bis 3 Wdh. (schonender) | 1 bis 3 Wdh. |
| Anteil Zirkel-Workouts | Aus, alle 2 Wochen, 1x pro Woche, 2x pro Woche | Alle 2 Wochen |
| Platz zum Gehen | Ja/Nein: etwa 10 Schritte am Stück; ohne Platz plant die App keine Übungen ein, die Platz brauchen (Katalogfeld `brauchtPlatz`, z. B. Kurzhantel-Ausfallschritt gehend). Im Onboarding (Schritt 1) und unter Einstellungen › Profil (Entscheidung 29.10.2026) | Nein |
| Orte | Liste von Orten mit jeweils eigenem Equipment (siehe Datenmodell) | Zuhause |
| Einschränkungen | Gesperrte Körperregionen oder Bewegungsmuster, optional mit Enddatum | keine |
| Lieblingsübungen | Markierte Übungen werden bei der Auswahl bevorzugt | keine |
| Ausgeschlossene Übungen | Werden nie vorgeschlagen | keine |

**Wirkung der Profilfelder**

- **Ziele** setzen nur Startwerte: „Kraft“ ⇒ Grundübungen mit Last nutzen den Bereich 6 bis 10; „Ausdauer“ oder „Fitness allgemein“ ⇒ Vorschlag für den Zirkel-Anteil 1x pro Woche; sonst alle 2 Wochen.
- **Trainingslevel:** Musterstufe ohne Testtag bei Einsteiger 3, Fortgeschritten 5, Erfahren 6. Persönliche Volumengrenzen (Start) bei Einsteiger 2 Sätze unter, bei Erfahren 2 Sätze über der Tabelle in „Wochenziel pro Muskel“.
- **Ziel-Reserve „2 bis 3“:** Reserve für „passend“ in der Kraftschätzung 2,5 statt 2; Zielgrenze mit Reserve 2 statt 1; Hinweistext im Training „Aufhören, wenn noch 2 bis 3 gingen“.

**Ablauf Onboarding**

1. Ziele und Level wählen.
2. Übliche Einheiten pro Woche, Standarddauer und Muskelprioritäten festlegen.
3. Ersten Ort anlegen und Equipment aus dem Katalog abhaken.
4. Optional Einschränkungen setzen; Favoriten und Ausschlüsse setzt der Nutzer jederzeit im Tab Übungen (das Onboarding zeigt dazu nur einen Hinweis; Entscheidung 20.10.2026).
5. Testtag durchführen: geführtes Aufwärmen (Schritt für Schritt wie vor dem Training), danach Max-Tests der Grundmuster (siehe Abschnitt Progression) und Gewichtstests mit Kurzhanteln (Entscheidung 21.10.2026). Die Ergebnisse bestimmen die Startvariante und Startwiederholungen jedes Musters. Danach zeigt ein Ergebnisbildschirm je Test das Ergebnis, die Startübung und das Startziel, dazu „Erste Einheit ab morgen“ (Entscheidung 21.10.2026).
6. Ersten Plan generieren.

Wird der Testtag übersprungen, schätzt die App die Startstufe aus dem Level und kalibriert sich über das Feedback der ersten zwei Wochen.

**Testtag**

- Tests: Pushups (hDruck), Pullups (vZug; bei 0 Wiederholungen: Sekunden im Hängen), Squats (Knie), Plank (Rumpf, Sekunden). Der Testtag wird als Einheit mit `format: 'test'` gespeichert; jeder Test zählt als 1 Satz.
- Startvariante aus dem Ergebnis:

| Muster | Ergebnis | Startvariante |
| --- | --- | --- |
| hDruck | 0 / 1 bis 7 / 8 bis 20 / 21 bis 30 / über 30 | knieliegestuetz / liegestuetz_erhoeht_haende / liegestuetz / liegestuetz_fuesse_erhoeht / liegestuetz_band |
| vZug | 0 und unter 20 Sek. hängen / 0 und mind. 20 Sek. / 1 bis 3 / 4 bis 7 / 8 bis 14 / ab 15 | scapula_pullups / negative_klimmzuege / klimmzug_band / chinup / klimmzug / klimmzug_gewicht |
| Knie | unter 12 / 12 bis 14 / 15 bis 30 / über 30 | box_squat (Entscheidung 30.10.2026) / kniebeuge / pausen_kniebeuge / goblet_squat, falls möglich, sonst bss_kg |
| Rumpf | unter 30 / 30 bis 60 / über 60 Sek. | dead_bug / plank / hollow_hold |

- Musterstufe = Stufe der Startvariante. Startziel = 70 % des Testergebnisses, begrenzt auf den Bereich der Variante.
- Die Startvariante wird Hauptvariante A des Musters (B nach den üblichen Regeln). Ist sie am Ort nicht möglich oder gesperrt, gilt die nächstleichtere Variante aus der Tabelle, die am Ort geht; die Musterstufe bleibt die Stufe laut Tabelle (Entscheidung 20.10.2026).
- Ein Test, dessen Übung am Ort nicht möglich oder gesperrt ist (z. B. keine Klimmzugstange), entfällt; das Muster startet nach Level, der Test folgt später wie ein übersprungener Testtag. **Hinweis vor dem Start (Entscheidung 21.10.2026):** Der Testtag-Bildschirm nennt jeden entfallenden Test mit Grund („Pullups · fehlt: Klimmzugstange“ bzw. „durch eine Einschränkung gesperrt“) und bietet bei fehlender Ausstattung „Ausstattung ändern“ (zurück zu Schritt 3).
- **Gewichtstests (Entscheidung 21.10.2026):** Nach den Max-Tests folgt je Muster ein Test mit der ersten Übung, die am Ort geht: hDruck Kurzhantel-Bankdrücken, sonst Bodendrücken (die Floor Press gibt es nur an Orten ohne Bank oder Schrägbank, Entscheidung 30.10.2026); vDruck Schulterdrücken sitzend, sonst stehend; hZug Rudern einarmig, sonst vorgebeugt; Knie Goblet Squat, sonst Kurzhantel-Kniebeuge; Huefte Rumänisches Kreuzheben. Der Nutzer wählt das Gewicht (vorbelegt ein Viertel nach oben im Lastraster) und macht so viele saubere Wiederholungen wie möglich. Kraftschätzung mit Reserve 1; daraus wie nach einem Kalibrierungssatz Last und Ziel der getesteten Übung (schwerste Last, die die Untergrenze mit Ziel-Reserve zulässt). Gewichtstests sind keine Max-Tests (kein Eintrag in `maxTests`).
- **Startgewicht weiterer Hantelübungen:** Für Last-Übungen ohne eigene Werte schlägt die App ein Gewicht vor: Kraftschätzung der getesteten Übung des Basis-Musters, umgerechnet mit vorsichtigen Faktoren je Übung (`ABLEITUNG` in der Konfiguration, z. B. Curls 0,45 × Rudern), mal 0,9; davon die schwerste Last, die die Untergrenze mit Reserve 3 zulässt. Der erste Satz bleibt ein Kalibrierungssatz mit diesem Gewicht vorbelegt; Vorschau und Heute zeigen „etwa 8 kg je Hand“.
- Der Testtag zählt nicht als Einheit der Woche: nicht für Wochenprognose und Wochenziel; die Wochenprognose wird bei der ersten regulären Einheit abgefragt (Entscheidung 20.10.2026). Er sperrt auch keine Muskeln für die Erholung, damit die erste Einheit am nächsten Tag vollständig ist (Entscheidung 21.10.2026).
- Nicht getestete Muster: Musterstufe nach Level (siehe Wirkung der Profilfelder). Varianten mit Last beginnen mit einem Kalibrierungssatz: Die App fragt „Mit welchem Gewicht startest du?“, vorbelegt mit der kleinsten verfügbaren Last; Ziel ist die Untergrenze des Bereichs mit Reserve 3; danach Kraftschätzung wie in „Progression pro Übung“.

## Datenmodell: Übungen, Equipment, Orte

Übungen sind Varianten eines Bewegungsmusters, sortiert nach Schwierigkeit. Equipment filtert nur, welche Varianten an einem Ort verfügbar sind; die Progression hängt am Muster, nicht an der einzelnen Übung.

### Bewegungsmuster

| Muster-ID | Bedeutung | Hauptmuskeln |
| --- | --- | --- |
| hDruck | Horizontales Drücken | Brust, Trizeps, Schultern |
| vDruck | Vertikales Drücken | Schultern, Trizeps |
| hZug | Horizontales Ziehen | Rücken, Bizeps, Schultern |
| vZug | Vertikales Ziehen | Rücken, Bizeps |
| Knie | Kniedominant (Kniebeuge) | Quadrizeps, Gesäß |
| Einbein | Einbeinig (Ausfallschritt, Split Squat) | Quadrizeps, Gesäß |
| Huefte | Hüftdominant (Kreuzheben, Hip Thrust) | Gesäß, hintere Oberschenkel |
| Rumpf | Rumpfstabilität und Bauch | Bauch |
| Bizeps | Bizeps-Isolation | Bizeps |
| Trizeps | Trizeps-Isolation | Trizeps |
| Schulter | Seitliche und hintere Schulter | Schultern |
| Waden | Waden | Waden |
| Kondition | Ganzkörper-Kondition, nur für Zirkel und Aufwärmen | (zählt nur bei genanntem Primärmuskel) |

Übungen eines Musters sind gegenseitig austauschbar.

**Ersatzregeln, wenn ein Muster am Ort keine Variante hat** (Variante wird im Plan als Ersatz markiert):

| Muster ohne Variante | Ersatz |
| --- | --- |
| vZug (keine Stange) | band_latzug, falls BAND und ANKER vorhanden; sonst hZug, bevorzugt tischrudern |
| Bizeps | chinup, falls Stange vorhanden; sonst tischrudern (Bizeps nur sekundär) |
| Schulter (seitlich/hinten) | vDruck-Variante |
| alle anderen | haben meist eine Variante, die nur immer vorhandene Utensilien (TISCH, ERH) oder gar keins braucht |

Gibt es auch keinen Ersatz (z. B. TISCH und ERH abgewählt: kein hZug, kein Waden-Training ohne Hanteln), **entfällt das Muster an diesem Ort**; der Equipment-Bildschirm zeigt dazu einen Hinweis wie „Für Ziehen fehlt Equipment“. Die Ersatzregeln gelten nur bei fehlendem Equipment, **nicht bei Sperren**: Blockiert eine Einschränkung alle Varianten eines Musters, fällt dessen Volumen weg (siehe Einschränkungen).

**Ersatzübungen mit kleinerem Bewegungsumfang** (Entscheidung 30.10.2026): Die Floor Press (`kh_bodendruecken`) ist nur an Orten ohne Bank und ohne Schrägbank möglich; mit Bank plant die App stattdessen Bankdrücken mit vollem Bewegungsumfang. Auch gespeicherte Hauptvarianten mit der Floor Press weichen dort ab der nächsten Einheit. Die Liste steht in `NUR_OHNE` in der Konfiguration.

### Beispiel: Variantenleiter vertikales Ziehen

| Stufe | Übung | Equipment |
| --- | --- | --- |
| 2 | Kneeling Band Lat Pulldowns | Widerstandsband, Befestigung |
| 3 | Negative Pullups | Klimmzugstange |
| 4 | Band-Assisted Pullups | Klimmzugstange, Widerstandsband |
| 6 | Pullups | Klimmzugstange |
| 8 | Weighted Pullups (Kurzhantel zwischen den Füßen) | Klimmzugstange, Kurzhantel |

### Entitäten (verbindlich für die Umsetzung)

Alle Daten liegen lokal in IndexedDB. Der Katalog (Übungen, Utensilien, Zirkel, Aufwärmen) ist eine mitgelieferte, schreibgeschützte Datei `katalog.json` (Schema-Version 2: Schlüssel `utensilien` mit `eigenes: false`, Muskeln als Typ-IDs wie `Ruecken`, `Gesaess`, `HintereOS`, „Ganzkörper“ als leere Liste, Feld `unterstuetzend`); alles, was der Nutzer anlegt oder trainiert, steht in eigenen Tabellen. Datumswerte sind ISO-8601-Strings in Gerätezeit, Wochen-IDs ISO-Wochen (`2026-W43`, Woche beginnt Montag).

```ts
type MusterId = 'hDruck'|'vDruck'|'hZug'|'vZug'|'Knie'|'Einbein'|'Huefte'|'Rumpf'|'Bizeps'|'Trizeps'|'Schulter'|'Waden'|'Kondition';
type Muskel = 'Brust'|'Ruecken'|'Schultern'|'Bizeps'|'Trizeps'|'Quadrizeps'|'Gesaess'|'HintereOS'|'Bauch'|'Waden';
type Prioritaet = 'hoch'|'normal'|'niedrig'|'sehrNiedrig';
type Feedback = 'leicht'|'passend'|'schwer';
type BandStufe = 'leicht'|'mittel'|'schwer'|'extraSchwer';

// Katalog (katalog.json) und eigene Einträge
interface Utensil { id: string; name: string; details: string; immerVorhanden: boolean; eigenes: boolean }
interface Uebung {
  id: string; name: string; muster: MusterId;
  primaer: Muskel[]; sekundaer: Muskel[];
  stufe: number;                    // 1 bis 10 innerhalb des Musters
  equipment: string[][];            // Gruppen; aus jeder Gruppe mind. ein Utensil nötig
  lasttyp: 'KG'|'Band'|'Last'|'Zeit';
  bereich: { von: number; bis: number; einheit: 'Wdh.'|'Sek.' };
  unterstuetzend: boolean;          // z. B. klimmzug_band: Fortschritt = leichteres Band
  anzahlGewichte?: 1|2;             // nur bei Last-Übungen mit KH/KB: eine oder zwei Hanteln (für die Lastanzeige)
  zirkelGeeignet: boolean;
  youtubeUrl: string;               // Standard: YouTube-Suche
  eigenerVideoLink?: string;        // vom Nutzer, hat Vorrang
  videoId?: string;                 // festes YouTube-Video zum Einbetten (alle Katalogübungen)
  anleitung?: string[];             // Kurzanleitung in Stichpunkten (jede Katalogübung)
  brauchtPlatz?: boolean;           // braucht Platz zum Gehen (Entscheidung 29.10.2026)
  herkunft: 'katalog'|'eigene';
}
interface Zirkel { id: string; name: string; runden: number; dauerHinweis: string;
  stationen: { muster: MusterId; vorgabe: number|string; hinweis: string }[] }
interface KatalogDatei { schemaVersion: number; utensilien: Utensil[]; uebungen: Uebung[]; zirkel: Zirkel[];
  aufwaermen: { allgemein: { immer: string[]; oben: string[]; unten: string[] }; mobility: Partial<Record<MusterId, string[]>>;
    maxMobilityZeilen: number; aufwaermsatz: { anteilLast: number; wdh: number } } }

// Orte und Equipment
type KurzhantelConfig = { modus: 'verstellbar'; minKg: number; maxKg: number; schrittKg: number }
                      | { modus: 'paare'; gewichteKg: number[] };
interface OrtEquipment {
  utensilId: string;
  kurzhanteln?: KurzhantelConfig;   // bei KH Pflicht
  bandStufen?: BandStufe[];          // bei BAND, MINI Pflicht
  gewichteKg?: number[];             // bei KB Pflicht
  langhantel?: { stangeKg: number; scheiben: { kg: number; paare: number }[] }; // bei LH Pflicht
}
interface Ort { id: string; name: string; standard: boolean; equipment: OrtEquipment[] }

// Einstellungen (genau ein Datensatz)
interface Einstellungen {
  ziele: ('muskelaufbau'|'fitness'|'kraft'|'ausdauer')[];
  level: 'einsteiger'|'fortgeschritten'|'erfahren';
  ueblicheEinheiten: number;        // 1 bis 6, Startwert der Prognose
  standardDauerMin: number;         // 20 bis 90
  laengerAnbieten: boolean;
  prioritaeten: Record<Muskel, Prioritaet>;
  zielReserve: '1-3'|'2-3';
  zirkelAnteil: 'aus'|'alle2Wochen'|'1proWoche'|'2proWoche';
  pausenSek: { grund: number; isolation: number; supersatz: number };
  favoriten: string[]; ausgeschlossen: string[];
  einschraenkungen: { id: string; typ: 'region'|'muster'; wert: string; bis?: string }[];
  onboardingAbgeschlossen: boolean;
  platzZumGehen?: boolean;          // fehlt: kein Platz (Entscheidung 29.10.2026)
  letztesBackup?: string;
  videoLinks?: Record<string, string>; // eigene Video-Links für Katalogübungen (eigene Übungen: eigenerVideoLink)
  bewertungen?: Record<string, 1|2|3|4|5>; // Sterne je Übungs-ID, letzte Bewertung zählt; fehlt sie, gilt 3
  sterneGefragt?: Record<string, { am: string; ohneAntwort: number }>; // letzte Frage bzw. Bewertung je Übung (Entscheidung 29.10.2026)
  workouts?: EigenesWorkout[];      // eigene Workouts (Entscheidung 21.10.2026)
}
// Übungsliste: je Übung Sätze; Zirkel: Runden und je Station eine Vorgabe (Wdh. bzw. Sek.)
interface EigenesWorkout { id: string; name: string; art: 'liste'|'zirkel'; runden: number;
  uebungen: { uebungId: string; saetze: number; vorgabe: number }[] }

// Trainingszustand (wird nur vom Planungsmodul geschrieben)
interface VarianteZustand { uebungId: string; last?: number; bandStufe?: BandStufe;
  zielWdh: number; e1rm?: number; bestErsterSatz?: number;
  seitSteigerung: number; schwerSerie: number; zuletzt?: string;
  langsam?: boolean }               // 3 Sek. absenken (Zwischenstufe oder schwerste Last erreicht)
interface MusterZustand { muster: MusterId; stufe: number; hauptvarianten: string[] } // max. 2 je Zyklus; letzter Test steht in maxTests
interface MuskelZustand { muskel: Muskel; letzteBelastung?: string; letzteDosis: number; letzteSchwer: boolean;
  persoenlicheGrenze: number; gleichWochen: number; leistung: { woche: string; wert: number }[] }
interface Woche { id: string; prognose: number; einheiten: number;
  ziele: Record<Muskel, number>; erledigt: Record<Muskel, number>;
  erholungswoche: boolean; laengerAngenommen: boolean; ausgewertet?: boolean;  // ausgewertet: Wochenabschluss gelaufen
  tage?: number[] }                 // gewählte Trainingstage, 0 = Montag … 6 = Sonntag (Wochenausblick)
interface Zyklus { nr: number; start: string; ende?: string; grund?: 'zeitablauf'|'erholungswoche' }

// Einheiten
interface SatzErgebnis { nr: number; wdh?: number; sek?: number; last?: number; bandStufe?: BandStufe; zeit: string }
interface Position { uebungId: string; saetze: number; zielWdh: number; last?: number; bandStufe?: BandStufe;
  istMaxTest?: boolean; istErsatz?: boolean; getauschtVon?: string; langsam?: boolean;
  ergebnisse: SatzErgebnis[]; feedback?: Feedback }
interface Block { typ: 'einzeln'|'supersatz'|'zirkel'; positionen: Position[];
  pauseSek: number; zirkelId?: string; runden?: number }
interface Einheit { id: string; woche: string; erstelltAm: string; gestartetAm?: string; beendetAm?: string;
  status: 'geplant'|'laufend'|'abgeschlossen'|'abgebrochen';
  ortId: string; fokus: 'ganz'|'oben'|'unten'; format: 'klassisch'|'supersatz'|'mix'|'zirkel'|'test';
  geschaetzteDauerMin: number;      // inklusive Bauch- und Wadensätze, kann über der Standarddauer liegen
  aufwaermen: { uebungId: string; vorgabe: string }[];
  bloecke: Block[]; gesamtbewertung?: 1|2|3|4|5; notiz?: string;
  name?: string }                   // Name des eigenen Workouts, aus dem die Einheit erstellt wurde
interface ZirkelErgebnis { zirkelId: string; ortId: string; datum: string; zeitSek: number; varianten: string[] }
interface MaxTest { id: string; datum: string; muster: MusterId; uebungId: string; ergebnis: number; einheit: 'Wdh.'|'Sek.' }
```

Tabellen in IndexedDB (Datenbank `fitness`, Version 1): `einstellungen`, `orte`, `eigeneUebungen`, `eigeneUtensilien`, `varianten`, `muster`, `muskeln`, `wochen`, `zyklen`, `einheiten` (Index auf `status`, `woche`), `zirkelErgebnisse`, `maxTests` (vollständiger Verlauf aller Max-Tests). „Letztes Mal“ im Training wird aus der letzten abgeschlossenen Position derselben Übung gelesen; dafür gibt es kein eigenes Feld.

### Equipment und Gewichtsstufen

Der Nutzer hakt pro Ort Utensilien aus dem Katalog ab und kann eigene ergänzen. Detailangaben sind Pflicht, sobald ein Utensil Gewichte oder Stufen hat; ohne sie lässt sich der Ort nicht speichern.

- **Lastraster:** Kurzhanteln im Modus „verstellbar“: Min, Min + Schritt, Min + 2 × Schritt … bis höchstens Max; Max ist immer zusätzlich enthalten (Beispiel 2,5 bis 24 kg in 2,5er Schritten: 2,5 … 22,5, 24). Bei „feste Paare“ die Liste. Kettlebells nutzen ihre Liste. Langhantel: mögliche Lasten = Stange + alle Kombinationen der vorhandenen Scheibenpaare.
- **Nächste Last:** die nächsthöhere Last im Raster (Langhantel: kleinste mögliche Last über der aktuellen). Bänder steigen um eine vorhandene Stufe; bei unterstützenden Übungen ist der Fortschritt das nächstleichtere Band.
- **Lastanzeige:** Kurzhantel oder Kettlebell mit `anzahlGewichte: 2` „16 kg je Hand“, mit `anzahlGewichte: 1` „16 kg“ (z. B. Goblet Squats, One-Arm Dumbbell Rows); Langhantel „40 kg gesamt“; Weighted Pullups „+8 kg“; Band „Band schwer“; unterstützendes Band „Unterstützung: Band mittel“; Körpergewicht ohne Lastangabe.
- **Ende der Leiter:** Gibt es keine nächste Last, gilt die Regel „Wenn die Last ausgeht“ (Progression).
- **Mehrere Orte:** Lasten werden pro Variante gespeichert, nicht pro Ort. Fehlt am neuen Ort die gespeicherte Last, wird die nächstniedrigere vorhandene genommen und das Ziel per Kraftschätzung umgerechnet.

### Orte (Equipment-Profile)

Ein Ort ist ein benanntes Profil mit einer Equipment-Auswahl, z. B. „Zuhause“ (Kurzhanteln, Hantelbank, Bänder, Klimmzugstange), „Unterwegs“ (Bänder) oder „Park“ (Klimmzugstange). Ein Ort ist als Standard markiert. Vor jedem Training ist der Standardort vorausgewählt und mit einem Tipp änderbar; der Plan der Einheit wird dann für diesen Ort erzeugt.

**Equipment-Bildschirm (Mockup 9):**

- Der Katalog behält die Utensilien BANK und SCHRAEG. Die UI zeigt eine Zeile „Hantelbank“ mit der Auswahl „keine / flach / verstellbar“; „flach“ setzt BANK, „verstellbar“ setzt SCHRAEG.
- Immer vorhandene Utensilien (TISCH, ERH) sind standardmäßig an und abwählbar.
- Die Details eines angehakten Utensils (Gewichte, Stufen, Bank) stehen direkt unter seiner Zeile (Entscheidung 30.10.2026).
- „X Übungen an diesem Ort möglich“ = Anzahl der Katalog- und eigenen Übungen, deren Equipment-Anforderung am Ort erfüllt ist, ohne Berücksichtigung von Ausschlüssen.
- Hat ein Muster am Ort weder Variante noch Ersatz, zeigt der Bildschirm einen Hinweis wie „Für Ziehen fehlt Equipment“.

Vollständiger Startkatalog mit allen Übungen, Utensilien und Zirkeln: Übungskatalog

## Wissenschaftliche Grundlagen

Die Planungslogik stützt sich auf Meta-Analysen zum Krafttraining: Entscheidend für Muskelaufbau ist das Wochenvolumen pro Muskel bei ausreichender Nähe zum Muskelversagen. Wie oft pro Woche und mit welchem Gerät trainiert wird, ist zweitrangig. Genau das macht flexible Wochen und den Wechsel zwischen Körpergewicht und Gewichten fachlich sauber möglich.

| Erkenntnis | Umsetzung in der App | Quelle |
| --- | --- | --- |
| Volumen (harte Sätze pro Muskel und Woche) zeigt eine Dosis-Wirkungs-Beziehung zur Hypertrophie, mit abnehmendem Zusatznutzen. Indirekte Sätze mit 0,5 zu zählen sagt Ergebnisse am besten voraus. | Steuergröße ist das Wochenvolumen pro Muskel in fraktionellen Sätzen (primär 1,0, sekundär 0,5). | [Pelland et al.](https://sponet.de/sponet/Record/4097139?lng=en) |
| Pro Einheit ist oberhalb von etwa 11 fraktionellen Sätzen pro Muskel kein Zusatznutzen mehr nachweisbar. | Obergrenze 10 fraktionelle Sätze pro Muskel und Einheit; Rest wird auf weitere Einheiten verteilt. | [Remmert et al. 2025](https://sportrxiv.org/index.php/server/preprint/view/537) |
| Bei gleichem Wochenvolumen beeinflusst die Trainingsfrequenz die Hypertrophie nicht signifikant. | Keine festen Splits: 2 oder 5 Einheiten pro Woche sind gleichwertig, solange das Volumen stimmt. | [Schoenfeld et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/table/T1) |
| Hypertrophie nimmt zu, je näher Sätze am Muskelversagen enden; Kraft hängt davon kaum ab. | Ziel 1 bis 3 Wiederholungen in Reserve; „passend“ ist genau so definiert. | [Robinson et al.](https://sportrxiv.org/index.php/server/preprint/download/295/699/654), [FAU-Zusammenfassung](https://www.fau.edu/newsdesk/articles/muscle-growth-strength-study) |
| Menschen unterschätzen ihre Reserve im Schnitt um knapp 1 Wiederholung; bei über 12 Wiederholungen wird die Schätzung ungenauer. | Körpergewichts- und Bandübungen wechseln zur schwereren Variante, sobald der erste Satz die Obergrenze ihres Bereichs erreicht; Max-Tests kalibrieren das Gefühl. | [Halperin et al. 2022](https://sportrxiv.org/index.php/server/preprint/view/67) |
| Leichte und schwere Lasten erzeugen bis zum Versagen ähnliche Hypertrophie; Maximalkraft profitiert von schweren Lasten. | Varianten mit Körpergewicht, Band oder Kurzhantel sind austauschbar, solange Wiederholungsbereich und Reserve passen. | [Schoenfeld et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28834797/) |
| Liegestütz mit Band und Bankdrücken bei vergleichbarer Muskelaktivität führen zu ähnlichen Kraftzuwächsen; Bänder und konventionelle Gewichte zeigen in einer Meta-Analyse keinen Unterschied. | Ortswechsel setzt die Progression nicht zurück; Bänder sind vollwertige Varianten. | [Calatayud et al. 2015](https://pubmed.ncbi.nlm.nih.gov/24983847/), [Lopes et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6383082/) |
| Pausen über 60 Sek. bringen einen kleinen Vorteil; über 90 Sek. wurde kein weiterer Unterschied gefunden. Bei Paarsätzen zählt die Ruhe pro Muskel; nur 1 Min. zwischen den Paaren senkte das Volumen, 2 Min. oder frei gewählt waren am effizientesten. | Standardpausen 90 Sek. (Grundübung), 60 Sek. (Isolation) und 60 Sek. nach einer Kombi-Runde; in einer Dreierrunde hat jeder Muskel so rund 2,5 Min. Ruhe (Entscheidung 21.10.2026). | [Singer et al. 2024](https://doaj.org/article/18363f4031e0487793db2084bee23f38), [Behenck et al. 2020](https://lida.sport-iat.de/ta/Record/4075858) |
| Geplanter, mäßiger Übungswechsel fördert das Wachstum; häufiges, zufälliges Wechseln kann schaden. Dranbleiben ist wichtiger als Feinheiten. | Höchstens 6 Übungen pro Einheit (plus Bauch und Waden), dafür mehr Sätze je Übung; Hauptvarianten bleiben einen Zyklus (6 Wochen) gleich. | [Kassiano et al. 2022](https://lida.sport-iat.de/ta/Record/4077216), [ACSM 2026](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/) |
| Supersätze verkürzen die Einheit ohne Einbußen bei Volumen und Hypertrophie, wenn Gegenspieler kombiniert werden; Paare für denselben Muskel senken das Volumen. | Supersätze nur aus nicht konkurrierenden Mustern; Hauptwerkzeug, wenn wenig Zeit da ist. | [Zhang et al. 2025](https://eprints.leedsbeckett.ac.uk/id/eprint/11908) |
| Training bis Versagen verlängert die Erholung um 24 bis 48 Std.; nach hartem Beintraining braucht es mindestens 48 Std. | Erholungsfenster pro Muskel abhängig von Satzzahl und Bewertung (24 bis 72 Std.). | [Morán-Navarro et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28965198/) |
| Eine Woche Trainingspause mitten im Programm änderte die Hypertrophie nicht, kostete aber etwas Beinkraft. | Kein fester Deload-Rhythmus; Erholungswochen nur reaktiv, schwache Wochen zählen als Entlastung. | [Coleman et al. 2024](https://peerj.com/articles/16777) |
| Kraft und Muskelmasse lassen sich mit sehr wenig Training erhalten, solange die Intensität bleibt. | In Wochen mit wenig Zeit bleibt die Intensität gleich, nur das Volumen sinkt. | [Spiering et al. 2021](https://pubmed.ncbi.nlm.nih.gov/33629972/) |
| Ausdauer- und Krafttraining kombiniert beeinträchtigen Hypertrophie und Maximalkraft nicht. | Zirkel-Workouts dürfen eingestreut werden, ohne den Muskelaufbau zu gefährden. | [Schumann et al. 2022](https://researchonline.jcu.edu.au/71546/) |

Alle Zahlenwerte in diesem Dokument sind Startwerte in der zentralen Konfiguration. Die Studien zeigen Mittelwerte; die App passt Volumen und Erholung über das Feedback individuell an.

## Planungslogik

Es gibt keinen festen Split und keine festen Wochentage. Jede Einheit wird unmittelbar vor dem Start neu erzeugt, aus fünf Größen: Wochenziel pro Muskel, in dieser Woche bereits erledigtes Volumen, Erholungsstatus jedes Muskels, Wochenprognose und Zeitbudget. Danach steht sie fest und wird während des Trainings nicht mehr verändert.

### Woche und Wochenprognose

- Eine Woche ist die Kalenderwoche von Montag bis Sonntag.
- **Trainingstage (Entscheidung 21.10.2026, ersetzt die Frage „Wie oft schaffst du es diese Woche?“):** Der Nutzer wählt die Tage der Woche, an denen er trainieren will (Mo bis So, vergangene Tage nicht wählbar, höchstens so viele, dass die Prognose 6 nicht übersteigt). Auf dem Heute-Screen jederzeit, auch vor der ersten Einheit; sonst bei der ersten Einheit der Woche auf „Vor dem Start“ (heute ist dort immer dabei). Vorausgewählt sind die Tage der Vorwoche ab heute, sonst die vorgeschlagene Zahl (gerundeter Durchschnitt der letzten 4 Wochen) gleichmäßig ab heute verteilt. War heute der Testtag, beginnt der Vorschlag morgen, und heute zählt nicht als anstehender Tag („Erste Einheit ab morgen“; Entscheidung 30.10.2026, vorher rechnete der Ausblick mit einer unsichtbaren Einheit am Testtag).
- **Prognose aus den Tagen:** erledigte Einheiten plus noch anstehende gewählte Tage (heute zählt, solange heute noch nicht trainiert wurde). Beim Start einer Einheit: erledigte + diese + gewählte Tage nach heute. Eine Einheit an einem nicht gewählten Tag erhöht die Prognose damit automatisch, ein ausgelassener Tag senkt sie. Wer die Tage auf Heute vor der ersten Einheit festlegt, hat die Wochenfrage beantwortet; das Angebot einer Erholungswoche entfällt dann für diese Woche (Entscheidung 21.10.2026).
- **„Morgen wieder?“** ist bei gewählten Tagen mit Ja vorbelegt, wenn morgen ein gewählter Tag ist, sonst mit Nein.
- Startet der Nutzer mehr Einheiten als prognostiziert, steigt die Prognose automatisch um 1 und das Wochenziel wird neu berechnet.
- **Pacing-Korrektur** (nur für Wochen ohne gewählte Tage, z. B. aus der Zeit vor dem Wochenausblick; mit Tagen ergibt sich die Restzahl direkt daraus): Liegt die letzte Einheit 72 Std. oder länger zurück, rechnet die App mit höchstens so vielen weiteren Einheiten, wie die halbe Zahl der verbleibenden Tage (aufgerundet) zulässt, und schlägt die korrigierte Prognose zur Bestätigung vor. Die Korrektur senkt nur die Restzahl n für die Verteilung; Prognose und Wochenziel ändern sich erst, wenn der Nutzer die vorgeschlagene Prognose bestätigt.
- Ein Defizit wird nicht in die nächste Woche übertragen. Nachholen würde die Folgewoche überladen; maßgeblich ist das Volumen pro Woche.

**Wenn sich die Tage unter der Woche ändern:** Es gibt nichts umzuplanen, weil keine Einheit im Voraus feststeht. Trainierst du an einem anderen Tag als gedacht, rechnet die nächste Einheit mit dem, was erledigt und erholt ist. Fällt eine Einheit aus, korrigiert die Pacing-Regel die Restzahl; kommt eine dazu, steigt die Prognose automatisch. Trainierst du zwei Tage hintereinander, sorgt „Morgen wieder?“ dafür, dass am zweiten Tag die andere Körperhälfte dran ist.

**Wochenausblick (Entscheidung 21.10.2026):** Sind Tage gewählt, zeigt Heute für jeden noch anstehenden Tag die voraussichtliche Einheit mit allen Übungen (Sätze, Ziel, Last), erledigte Einheiten an ihrem Tag. Berechnet wird nacheinander mit der echten Planung (`startfragen` und `erstelleEinheit` zur gleichen Uhrzeit wie jetzt); jede geschätzte Einheit gilt danach als wie geplant geschafft (alle Sätze mit Ziel und Last, Feedback „passend“), damit Erholung, Wochenvolumen und Progression der Folgetage stimmen. Ein vorgeschlagener Zirkel erscheint als „Zirkel · Auswahl beim Start“, ein zu kleiner Bedarf als „Ruhetag empfohlen“. Der Ausblick ist eine Schätzung und wird nicht gespeichert; jede Einheit entsteht weiterhin erst vor dem Start.

### Zeitbudget pro Einheit

Die Standarddauer (Einstellung, z. B. 40 Min) bestimmt die Zahl der Arbeitssätze:

- Sätze = (Dauer minus 5 Min Aufwärmen) geteilt durch die mittlere Satzdauer.
- Mittlere Satzdauer klassisch = 45 Sek. + 0,6 × Grundpause + 0,4 × Isolationspause. Die Pausen sind einstellbar (Standard 90 Sek. Grundübung, 60 Sek. Isolation, also rund 123 Sek.; Entscheidung 21.10.2026).
- Satzdauer im Kombi-Training (Standard): gerechnet wie ein Paar, zwei Sätze à 45 Sek. plus Supersatz-Pause (Standard 60 Sek., Entscheidung 21.10.2026) nach der Runde, also rund 75 Sek. pro Satz. Klassisch gilt die Satzdauer klassisch.
- **Kombi oder Klassisch** (Entscheidung 21.10.2026): Vor dem Start wählt der Nutzer pro Einheit, vorbelegt ist immer Kombi. Das Wochenziel rechnet stets mit Kombi; die Einheit selbst mit der gewählten Art. So bringt Kombi in Wochen mit wenigen Einheiten mehr Sätze unter, sonst wird die Einheit kürzer.
- **Bauch und Waden kommen zusätzlich:** Rumpf- und Wadenübungen sind eigene Übungen mit eigenen Sätzen und Pausen (nicht in den Pausen anderer Übungen). Sie werden nach dem Zeitbudget zusätzlich eingeplant und nehmen den anderen Muskeln keine Sätze weg. Die Einheit dauert dadurch etwas länger als die Standarddauer; die angezeigte geschätzte Dauer enthält sie.
- **Pausen einstellen:** je 30 bis 180 Sek. in 15-Sek.-Schritten, getrennt für Grundübung, Isolation und Supersatz (Entscheidung 20.10.2026).
- **Echte Satzdauer** = (Einheitsdauer − Aufwärmdauer) ÷ Zahl aller Arbeitssätze (inklusive Bauch und Waden), gleitender Mittelwert über die letzten 5 Einheiten je Format. Sie ersetzt die Schätzung ab der 5. Einheit eines Formats.

| Art der Einheit | Arbeitssätze pro 40-Min-Einheit (ohne Bauch und Waden) | Zusatz |
| --- | --- | --- |
| Kombi (Standard) | 28 | Bei Prognose 1 bis 2 vor dem Start Angebot „15 Min länger?“ (abschaltbar) |
| Klassisch | 17 |  |

### Wochenziel pro Muskel

Das Wochenziel ist das Minimum aus drei Grenzen: dem, was die Zeit hergibt, der persönlichen Volumengrenze (wächst mit dem Feedback, siehe Progression) und der absoluten Obergrenze.

- Wochenbudget = Prognose × Arbeitssätze pro Einheit × 1,7 (mittlere fraktionelle Sätze pro Arbeitssatz).
- Wochenziel Muskel = min(persönliche Grenze, Obergrenze, max(Untergrenze, Wochenbudget × Gewicht ÷ Summe aller Gewichte)), gerundet.
- Prioritäten sind in den Einstellungen pro Muskelgruppe änderbar. Standard sind seit 29.10.2026 **alle Muskelgruppen normal** (Entscheidung; der Nutzer passt sie bei Bedarf selbst an). Die Spalte „Muskelgruppen“ zeigt das frühere Profil „Oberkörper betont“, auf dem die Beispiele, Use Cases und Prototypen dieses Dokuments beruhen; es bleibt als Testszenario erhalten.
- Ändert sich die Priorität eines Muskels, springt seine persönliche Grenze um den Unterschied der Startwerte (z. B. Bauch von niedrig auf normal: +4), begrenzt auf Untergrenze + 2 bis Obergrenze der neuen Priorität. So wirkt die Änderung sofort, und der mit Feedback gewonnene Fortschritt bleibt (Entscheidung 29.10.2026). Bestehende Daten mit dem alten Standard „Oberkörper betont“ wurden einmalig so auf „alle normal“ umgestellt (Datenbank Version 3); selbst angepasste Prioritäten blieben.

| Priorität | Muskelgruppen („Oberkörper betont“) | Gewicht | Untergrenze | Persönliche Grenze (Start) | Obergrenze |
| --- | --- | --- | --- | --- | --- |
| Hoch | Brust, Rücken, Schultern, Bizeps, Trizeps | 1,0 | 4 | 12 | 20 |
| Normal | Quadrizeps, Gesäß, hintere Oberschenkel | 0,75 | 4 | 10 | 16 |
| Niedrig | Bauch | 0,5 | 2 | 6 | 10 |
| Sehr niedrig | Waden | 0,3 | 2 | 4 | 8 |

Ergebnis mit diesen Startwerten bei 40 Min: Beim Standard „alle normal“ erreicht mit 2 bis 5 Einheiten jeder Muskel die persönliche Grenze von 10 (mit 1 Einheit 5). Bei „Oberkörper betont“ erreichen hoch priorisierte Muskeln mit 2 bis 5 Einheiten 12 (mit 1 Einheit 6). Mehr Einheiten bedeuten also nicht automatisch mehr Volumen, sondern kürzere Einheiten mit besserer Verteilung und Raum für Zirkel, bis die persönliche Grenze durch gutes Feedback steigt.

Die Frage „Morgen wieder?“ ist der Schlüssel für Tage am Stück: Sie lässt die andere Körperhälfte für die nächste Einheit frisch.

### Algorithmus: Erzeugung einer Einheit

1. **Ort:** Standardort vorausgewählt, änderbar. Alle folgenden Schritte nutzen nur Varianten, die an diesem Ort möglich, nicht gesperrt und nicht ausgeschlossen sind.
2. **Restzahl n:** n = min(Prognose minus erledigte Einheiten, verbleibende Tage inklusive heute), mindestens 1. Pacing-Korrektur wie oben.
3. **„Morgen wieder trainieren?“** Mit gewählten Tagen: Ja, wenn morgen ein gewählter Tag ist. Sonst vorausgefüllt mit Ja, wenn nach heute noch Einheiten geplant sind und deren Zahl mindestens halb so groß ist wie die Zahl der verbleibenden Tage nach heute. Immer Nein, wenn die letzte Einheit 72 Std. oder länger zurückliegt. Ein Tipp ändert die Antwort.
4. **Fokus:** Bei Nein entsteht eine Ganzkörper-Einheit. Bei Ja eine Fokus-Einheit für Oberkörper (Brust, Rücken, Schultern, Bizeps, Trizeps) oder Unterkörper (Quadrizeps, Gesäß, hintere Oberschenkel, Waden); Bauch ist immer erlaubt. Gewählt wird die Gruppe, deren letzte Belastung länger zurückliegt; bei Gleichstand die mit dem größeren gewichteten Restbedarf. Ist kein Muskel dieser Gruppe erholt, wird die andere gewählt.
5. **Bedarf pro Muskel:** Rest = Wochenziel minus erledigt. Ganzkörper: Rest ÷ n. Fokus: Rest ÷ aufgerundet(n ÷ 2) für Muskeln der Fokusgruppe, 0 für die anderen. Aufrunden, höchstens 10, und 0 für nicht erholte Muskeln.
6. **Übungen wählen (gierig):** Kandidaten sind die Hauptvarianten A und B aller Muster außer Rumpf, Waden und Kondition (siehe Hauptvarianten und Abwechslung); A und B mit demselben Hauptmuskel wechseln sich strikt ab: Kandidat ist zunächst nur die fällige Variante, die andere erst als zweite Übung derselben Bewegung, wenn die fällige schon gewählt ist (Entscheidung 30.10.2026, ersetzt „abgewechselt wird über den Abschlag“ vom 20.10.2026). Haben A und B verschiedene Hauptmuskeln (z. B. Rumänisches Kreuzheben für die hinteren Oberschenkel und Hip Thrust für das Gesäß), sind beide frei wählbar. Für jede Kandidatenübung wird ihr Wert berechnet: Summe über ihre Muskeln von min(offener Bedarf, Beitrag pro Satz) × Gewicht. Zuschläge: Grundübung +0,3, Favorit +0,2, Bewertung 5 Sterne +0,2, 4 Sterne +0,1, 2 Sterne −0,2 (siehe Bewertung der Übungen). Abschlag −0,6, wenn sie für ihren Hauptmuskel schon in der letzten Einheit gewählt wurde, und weitere −0,6, wenn ihr Muster für diesen Muskel in der letzten Einheit dran war und der Muskel ein anderes Muster hat (z. B. Klimmzug nach Rudern; Entscheidung 21.10.2026). Kandidaten, deren Primärmuskeln nicht erholt sind, entfallen. Eine weitere Übung für einen schon bedienten Hauptmuskel kommt nur, wenn für ihn noch mindestens 2 Sätze offen sind (Ersatzübungen ausgenommen). Eine zweite Übung desselben Musters kommt nur, wenn für ihren Hauptmuskel keine Übung eines anderen, in dieser Einheit noch nicht gewählten Musters offen ist (Entscheidung 30.10.2026: z. B. Rudern statt einer zweiten Klimmzug-Variante). Die beste Übung wird übernommen (bei Gleichstand die höhere Variantenstufe; zwischen A und B desselben Musters ohne Gewicht die leichtere, Entscheidung 30.10.2026), mit Sätzen = offener Bedarf des Hauptmuskels, aufgerundet, 2 bis 4 (bei einer Prognose von 1 bis 2 bis 5), höchstens das restliche Zeitbudget. **Neue Übung** (noch nie trainiert; Testtag, Gewichtstest und Zirkel zählen nicht): beim ersten Mal höchstens 3 Sätze (Entscheidung 30.10.2026, `EINHEIT.maxSaetzeErstesMal`); der übrige Bedarf dieses Hauptmuskels bleibt in dieser Einheit offen, statt eine zweite Übung nachzuschieben. Wiederholen, bis das Zeitbudget voll ist, **6 Übungen** gewählt sind (Entscheidung 21.10.2026; Bauch und Waden kommen dazu) oder kein Bedarf über 0,25 bleibt.
7. **Bauch und Waden:** Haben sie offenen Bedarf und sind erholt, kommen je eine Übung mit höchstens 3 Sätzen zusätzlich zum Zeitbudget dazu (siehe Zeitbudget). Sie sind normale Übungen und laufen einzeln oder in einer Kombi-Runde laut Schritt 8.
8. **Reihenfolge und Kombi-Runden:** Max-Test (falls fällig, immer einzeln), Grundübungen, Isolationsübungen, Bauch und Waden. Klassisch läuft jede Übung einzeln. Kombi (Standard) bildet aus dieser Liste der Reihe nach Runden aus 2 bis 3 Übungen (`KOMBI.maxUebungen`): Je Runde läuft ein Satz jeder Übung, danach die Supersatz-Pause. In eine Runde kommen nur Übungen, die sich nicht überschneiden: Ein Muskel, der in einer Übung Hauptmuskel ist, darf in keiner anderen Übung der Runde arbeiten. Bauch und Waden dürfen mit allem kombiniert werden, das diese Regel erfüllt. Bevorzugt kommen Übungen mit gleicher Satzzahl zusammen; die Rundengröße richtet sich nach den übrigen Übungen, damit möglichst keine allein bleibt (bei 4 übrigen Übungen 2 + 2). Format der Einheit: keine Runden = klassisch, alle Übungen in Runden = supersatz, sonst mix (Entscheidung 21.10.2026).
9. **Zeit passt nicht:** Die App bietet vor dem Start „15 Min länger?“ nur an, wenn die Prognose 1 bis 2 ist, die Einstellung „Längere Einheiten anbieten“ an ist und nach vollem Budget noch Bedarf offen ist. Bleiben 3 oder mehr Sätze Budget frei, zeigt sie die kürzere Dauer an; einen Zirkel-Finisher bietet Version 1 nicht an (Entscheidung 21.10.2026).
10. **Ruhetag empfohlen:** Hätte die erzeugte Einheit weniger als 6 Arbeitssätze, empfiehlt die App einen Ruhetag und bietet an: trotzdem trainieren, Zirkel oder Mobility (die Aufwärm-Mobility aller Muster, ca. 10 Min). Mobility wird nur angezeigt (Liste wie beim Aufwärmen), nicht als Einheit gespeichert und erscheint nicht im Verlauf. Ist kein Muskel erholt und bleibt die Einheit nach „trotzdem trainieren“ leer, zeigt die Vorschau „Heute ist noch kein Muskel erholt. Mach einen Zirkel oder Mobility, oder trainiere morgen.“ (Entscheidung 21.10.2026).
11. **Fixieren:** Die Einheit wird gespeichert. Ausnahmen (Entscheidungen 21.10.2026): vor dem Start Tausch innerhalb desselben Musters und Anpassen (Sätze ändern, Übungen entfernen oder hinzufügen); im Training Tausch einer Übung, solange ihr erster Satz offen ist.

### Erholungsfenster pro Muskel

Ein Muskel gilt als erholt, wenn seit seiner letzten Belastung mindestens diese Zeit vergangen ist:

| Fraktionelle Sätze in der letzten Einheit | Erholungsfenster |
| --- | --- |
| 1 bis 3 | 24 Std. |
| 4 bis 6 | 36 Std. |
| 7 bis 9 | 48 Std. |
| 10 oder mehr | 72 Std. |
| Zusätzlich, wenn eine Übung dieses Muskels „zu schwer“ war | +24 Std. |

Zirkel zählen für das Erholungsfenster mit demselben Volumen wie für das Wochenvolumen (siehe Formate).

„Belastet“ heißt hier: Ein nicht erholter Muskel bekommt keinen Bedarf und damit keine eigenen Sätze. Als mitbeteiligter Muskel einer Übung für einen anderen Muskel darf er mitarbeiten (wie im Prototyp; Entscheidung 21.10.2026). Für Max-Tests gilt das Fenster aller beteiligten Muskeln.

### Hauptvarianten und Abwechslung

- Pro Muster und Zyklus (6 Wochen oder bis zur nächsten Erholungswoche) legt die App bis zu zwei Hauptvarianten A und B fest (z. B. Kurzhantel-Bankdrücken und Schrägbankdrücken), bestimmt bei Zyklusbeginn bzw. bei der ersten Nutzung des Musters am Ort. A und B wechseln sich von Einheit zu Einheit ab (Entscheidung 30.10.2026: strikt, siehe Schritt 6): Fällig ist die Variante, die beim letzten Training des Musters nicht dran war (Max-Tests und Zirkel zählen nicht); ohne Verlauf die mit mehr Sternen, bei Gleichstand A, bei zwei Varianten ohne Gewicht die leichtere. Jede führt ihren eigenen Progressionsverlauf.
- **Auswahl:** Kandidaten sind Varianten, die am Ort möglich, nicht gesperrt und nicht ausgeschlossen sind. „Am Ort möglich“ heißt hier und überall in der Planung auch: Braucht die Übung Platz zum Gehen, muss das Profil ihn haben (Entscheidung 29.10.2026); das gilt ebenso für eigene Workouts. Rangfolge: Favorit; dann Varianten mit 1 Stern ans Ende; dann Abstand zur Musterstufe (bei Lasttyp Last zählt nur, wie weit die Stufe über der Musterstufe liegt, weil die Last den Rest regelt); dann Bewertung (mehr Sterne zuerst); dann Lasttyp Last vor Band vor KG vor Zeit; dann Katalogreihenfolge. A = beste Variante, B = nächstbeste Variante mit anderer ID, bevorzugt mit anderem Equipment. **B höchstens 1 Stufe über der Musterstufe** (Entscheidung 30.10.2026, `EINHEIT.bMaxUeberMusterstufe`; gilt für Varianten ohne Gewicht, bei Last regelt das Gewicht die Schwierigkeit); gibt es keine, hat das Muster nur A. Gespeicherte Hauptvarianten bleiben bis zum nächsten Zyklus.
- Zu Beginn eines neuen Zyklus werden Nebenübungen bevorzugt gegen Varianten gleicher Stufe getauscht; Favoriten bleiben. Varianten mit 4 oder 5 Sternen bleiben ebenfalls, Varianten mit 1 oder 2 Sternen werden zuerst getauscht.
- **Lieblinge mit Pause** (Entscheidung 29.10.2026): Eine Nebenübung mit 4 oder 5 Sternen, die im endenden und im Zyklus davor jeweils trainiert wurde (also rund 12 Wochen am Stück), setzt den neuen Zyklus aus, sofern es eine Variante gleicher Stufe mit mindestens 3 Sternen gibt; sonst bleibt sie. In diesem Zyklus steht sie auch nicht als Ersatz zur Wahl. Beim nächsten Zyklusbeginn kommt sie über „mehr Sterne zuerst“ zurück. Favoriten (markiert) bleiben immer.
- **Eine neue Übung je Zyklus** (Entscheidung 29.10.2026): Von den Tauschen bei Zyklusbeginn nimmt einer eine Variante, die noch nie trainiert wurde (gleiche Stufe, mindestens 3 Sterne bzw. unbewertet, am Ort möglich). Welcher Tausch das ist, wechselt mit der Zyklusnummer. Eine zurückkehrende Variante mit 4 oder 5 Sternen geht vor; ohne passende neue Variante entfällt es.
- **Bewertung der Übungen** (Entscheidungen 21.10.2026 und 29.10.2026): Der Nutzer kann jede Übung im Tab Übungen jederzeit mit 1 bis 5 Sternen bewerten. Zusätzlich fragt die Abschlussseite nach Sternen, aber nur gezielt: für trainierte Übungen (ohne Max-Tests und Zirkel-Stationen), die noch keine Bewertung haben und höchstens einmal ohne Antwort gefragt wurden, oder deren Bewertung bzw. letzte Frage mindestens 6 Wochen (42 Tage) zurückliegt. Gefragt werden alle unbewerteten Übungen (Entscheidung 30.10.2026, ersetzt „höchstens 2 je Training“), dazu höchstens 2 bewertete, die am längsten nicht gefragt wurden. Die Sterne sind freiwillig und mit der letzten Bewertung vorausgefüllt; „Speichern“ bestätigt sie und startet die 6 Wochen neu. Bleibt eine unbewertete Übung leer, zählt das als Frage ohne Antwort; nach 2 solchen fragt die App nicht mehr. Eine Bewertung im Tab Übungen zählt wie eine Antwort; wird sie entfernt, gilt die Übung wieder als nie gefragt. Es zählt immer die letzte Bewertung. Ohne Bewertung gilt 3 (neutral). Wirkung („ausgewogen“):
  - **1 Stern:** Ist die Übung Hauptvariante, wird sie ab der nächsten Einheit ersetzt, sofern am Ort eine Alternative desselben Musters mit höchstens 1 Stufe Abstand und mindestens 2 Sternen möglich ist (Auswahl nach der Rangfolge oben). Gibt es keine, bleibt sie.
  - **2 Sterne:** seltener (Abschlag in Schritt 6, beim Zyklusbeginn zuerst getauscht).
  - **4 und 5 Sterne:** häufiger (Zuschlag in Schritt 6, Vorrang in der Rangfolge bei gleichem Abstand zur Musterstufe, bleiben beim Zyklusbeginn).
  - Die Bewertung ändert nie das Volumen pro Muskel, nur welche Übung es liefert. Max-Tests (immer dieselbe Übung) und Zirkel-Stationen bleiben unberührt. Für „nie wieder“ gibt es weiter den Ausschluss im Tab Übungen.
- Ein Ortswechsel wählt die passende Variante des Musters an diesem Ort, ohne den Zyklus zu beenden.

### Formate

- Klassisch, Supersatz und Mix ergeben sich aus der Wahl Kombi oder Klassisch vor dem Start und den gebildeten Runden (siehe Schritt 8).
- **Zirkel:** Häufigkeit laut Einstellung. Bei einer Prognose von 3 oder mehr ersetzt ein Zirkel eine reguläre Einheit; bei 1 bis 2 Einheiten erscheint er nur als Finisher in frei gebliebener Zeit, damit das Kraftvolumen nicht leidet.
- **Fälligkeit:** „alle 2 Wochen“ = 1 Zirkel in Wochen mit gerader ISO-Wochennummer; „1x pro Woche“ = 1; „2x pro Woche“ = 2.
- **Vorschlag:** Ein fälliger Zirkel wird bei Prognose 3 oder mehr vorgeschlagen, sobald die am höchsten priorisierten Muskeln (bei „Oberkörper betont“ die hohen, beim Standard „alle normal“ alle) mindestens 70 % ihres Wochenziels haben oder laut Prognose nur noch eine Einheit bleibt. Der Nutzer kann jederzeit „Stattdessen Zirkel“ bzw. „Doch Krafteinheit“ wählen.
- **Volumen:** je Runde und Station 0,5 fraktionelle Sätze für Primärmuskeln, 0,25 für Sekundärmuskeln. Das gilt für Wochenvolumen und Erholungsfenster.
- **Stationen:** Nennt der Hinweis der Station eine bevorzugte Übung (z. B. „Burpees bevorzugt“, „Thrusters, ohne Kurzhanteln Jump Squats“), nimmt die App die zuerst genannte, die am Ort möglich, nicht gesperrt und nicht ausgeschlossen ist (Entscheidung 21.10.2026). Sonst nutzt jede Station die Variante „Musterstufe − 2“. Fehlt sie: nächstniedrigere zirkel-geeignete Variante; sonst niedrigste zirkel-geeignete; sonst irgendeine Variante des Musters; sonst wird die Station ausgelassen.
- Jeder Zirkel hat einen festen Namen und eine feste Zusammensetzung; Varianten passen sich dem Ort an. Bestzeiten gelten pro Zirkel, Ort und Variantensatz.

### Wiederholungsbereiche und Intensität

| Übungsart | Bereich | Ziel-Reserve |
| --- | --- | --- |
| Grundübung mit Gewicht | 6 bis 12 | 1 bis 3 Wdh., nie bis Versagen |
| Grundübung Körpergewicht oder Band | 8 bis 15 (ab Obergrenze nächste Variante) | 1 bis 3 Wdh. |
| Isolation | 10 bis 20 | 1 bis 3 Wdh. (wie alle Übungen) |
| Halteübungen | 20 bis 60 Sek. | 5 bis 10 Sek. |

Die Bereiche stehen pro Übung im Katalog (`bereich.von` = Untergrenze U, `bereich.bis` = Obergrenze O) und sind dort überschreibbar; die Tabelle zeigt typische Werte. Die Feedback-Definition („passend“ = 1 bis 3 Wdh. Reserve) gilt für alle Übungen gleich. Beim letzten Satz einer Isolationsübung erscheint nur ein Hinweistext, dass hier 0 bis 1 Wdh. Reserve genügen.

## Simulation der Use Cases

Die Planungslogik wurde als Prototyp umgesetzt und mit realistischen Wochen durchgespielt (40-Min-Einheiten, Ort Zuhause, Startwerte dieses Dokuments mit dem Profil „Oberkörper betont“). In allen sieben Fällen erreicht jeder hoch priorisierte Muskel mindestens die Hälfte seines Ziels, in den fünf Fällen mit stimmiger Prognose praktisch das volle Ziel. Der erste Entwurf lieferte in sechs der sieben Fälle deutlich weniger oder leere Einheiten.

| Use Case | Wie die App plant | Ergebnis Oberkörper / Beine (erledigt von Ziel) | Erster Entwurf |
| --- | --- | --- | --- |
| Normalwoche Mo, Mi, Fr | 3 Ganzkörper-Einheiten à 18 bis 19 Sätze, Varianten wechseln (Rudern und Klimmzug, Bank- und Schrägbankdrücken) | 12/12 · 9/9, Bauch 6/6, Waden 4/4 | Nur rund 8 Sätze pro Muskel, Bauch und Waden nie, immer dieselben 4 Übungen |
| 5 Einheiten Mo, Di, Mi, Fr, Sa | Fokus wechselt Ober/Unter, 10 bis 14 Sätze (rund 25 bis 30 Min) plus Zirkel-Angebot | 12/12 · 10/10 | Samstag nur 7 Sätze, da nichts erholt; Trizeps 11 von 17 |
| 2 Einheiten Di, Sa | 2 Ganzkörper-Einheiten mit Supersätzen à 25 Sätze | 9 bis 12/11 · 8/8 | 6 bis 7 Sätze pro Muskel, Bauch und Waden nie |
| Prognose 3, tatsächlich 5 Tage am Stück | Prognose steigt automatisch; Zwischentage kürzer (7 bis 10 Sätze) plus Zirkel-Angebot | 12 bis 14/12 · 10/10 | 5. Einheit leer |
| Prognose 4, nur Mo und Do, am Do korrigiert | Mo Fokus Oberkörper, Do Ganzkörper mit 25 Sätzen | 8 bis 12/11 · 5 bis 8/8 | (in beiden Versionen nur teilweise lösbar) |
| Prognose 4, nur Mo und Do, ohne Korrektur | Pacing-Korrektur erkennt die Pause und plant Do als Ganzkörper | 6 bis 10/12 · 5 bis 7/10 | Prototyp ohne Pacing-Regel: Beine 0 |
| Fr abends, Sa und So morgens | Fokus Ober, dann Fokus Unter, dann Ganzkörper | 12/12 · 6 bis 9/9 | Samstag leer, da nichts erholt |

**Regelbasiert geprüft (ohne Zahlensimulation):**

- **Hotel mit nur Bändern:** Ort „Unterwegs“ wählt Band-Varianten derselben Muster; jede führt eigenen Verlauf, die Hauptvarianten zu Hause bleiben unberührt.
- **Rückkehr nach 2 Wochen Urlaub:** Erste Einheit pro Muster mit Ziel-Reserve 3 statt 1 bis 3; danach normale Progression (siehe Progression).
- **Schulter gesperrt:** Die laut Sperrtabelle (Einschränkungen) gesperrten Muster und Übungen entfallen; Übungen mit nur sekundärer Schulterbeteiligung bleiben. Das Volumen anderer Muskeln steigt nicht, das Wochenziel der Schulter wird auf 0 gesetzt.
- **Zu optimistische Prognose:** Kostet je nach Fall bis zu etwa ein Drittel des möglichen Volumens; deshalb fragt die App nach 72 Std. Pause aktiv nach.

Der Prototyp (Python) wird mit übergeben. Die Satzzahlen der Tabelle zählen nur die Sätze im Zeitbudget; Bauch und Waden kommen zusätzlich dazu. Die sieben Fälle der Tabelle sind als automatisierte Tests nachzubauen:

- **Test-Katalog:** die 14 Katalog-IDs `kh_bankdruecken, kh_schraegbank, kh_schulterdruecken_sitzend, klimmzug, kh_rudern_einarmig, goblet_squat, bss_kh, kh_rdl, kh_hip_thrust, kh_curls, kh_trizeps_ueberkopf, kh_seitheben, haengendes_knieheben, wadenheben` und ein Ort „Zuhause“ (KH verstellbar 2 bis 24 kg, Schritt 2, SCHRAEG, STANGE, BAND, ANKER).
- **Prüfung seit der Überarbeitung vom 21.10.2026** (höchstens 6 Übungen, Zugrichtung im Wechsel, Pausen 60 Sek.): Die Planung weicht bewusst vom Prototyp ab; die Tests prüfen Eigenschaften mit Test- und vollem Katalog: jeder hoch priorisierte Muskel mindestens 50 % seines Ziels; bei stimmiger Prognose (UC1, UC2, UC3, UC6) Brust, Rücken und Schultern mindestens 80 % und jeder Muskel mindestens 50 %; höchstens 6 Übungen im Zeitbudget; Klimmzug und Rudern wechseln sich ab. Bekannter Preis der 6-Übungen-Grenze: In Wochen mit 2 Einheiten bekommen Bizeps und Trizeps nur etwa die Hälfte ihres Ziels als direkte Sätze (sie arbeiten beim Drücken und Ziehen mit). Seit der Vielfalt-Regel (Entscheidung 30.10.2026) erreicht Bizeps in UC5 mit vollem Katalog 5,5 von 12 Sätzen (46 %): Klimmzug statt eines zweiten Ruderns nimmt einen Platz, Schulterdrücken verdrängt dann die Curls; der Test verlangt dort 45 %. Seit dem strikten Wechsel von A und B (Entscheidung 30.10.2026) gilt dasselbe für Trizeps in UC5b (5,5 von 12, Bizeps dafür 9,5). Die Use Cases beschreiben eingespielte Wochen: Alle Übungen gelten als schon trainiert (sonst gälten höchstens 3 Sätze je Übung). Die frühere Toleranz von ±1 Satz gegenüber dem Prototyp gilt nicht mehr.
- **Rauchtest mit vollem Katalog:** In Use Case 1 erreicht jeder Muskel mindestens 80 % seines Ziels.
- **Eigene Unit-Tests** (nicht Teil der Use-Case- oder 12-Wochen-Simulation): Deckel der persönlichen Volumengrenze (höchstens 4 über dem besten Wochenvolumen der letzten 4 Wochen), +24 Std. Erholung bei „zu schwer“, Favoriten-Bonus +0,2.

## Progression, Feedback, Erholungswochen und Max-Tests

Die Anpassung folgt einer doppelten Progression: erst mehr Wiederholungen im Zielbereich, dann mehr Last oder die nächstschwerere Variante. Gesteuert wird sie durch geschaffte Wiederholungen, die 3-stufige Bewertung pro Übung und die Gesamtbewertung pro Workout.

### Feedback erfassen

| Ebene | Wann | Eingabe |
| --- | --- | --- |
| Satz | Nach jedem Satz | Zähler mit −/+, vorbelegt mit dem Ziel; „Satz erledigt“ speichert die Zahl (Entscheidung 30.10.2026, ersetzt „gespeichert wird das Ziel“ vom 29.10.2026). Wer das Ziel schafft, tippt nur „Satz erledigt“. Halteübungen: Countdown bis zum Ziel, darunter der Zähler in Sekunden. Bleibt ein Satz 2 oder mehr Wiederholungen (Halteübungen 10 Sek.) unter seinem Ziel, zeigen die restlichen Sätze dieser Übung das Geschaffte als Ziel mit dem Hinweis „Ziel angepasst an deinen letzten Satz“ (`Position.zielFolgesaetze`); Maßstab der Progression bleibt das ursprüngliche Ziel |
| Übung | Einmal am Ende des Trainings auf der Abschlussseite, zusammen mit Gesamtanstrengung und Notiz (Entscheidungen 29.10.2026, ersetzt „nach jeder Übung bzw. Runde“ und die eigene Feedbackseite); beim vorzeitigen „Training beenden“ für die Übungen, deren Sätze alle erledigt sind | **Zu leicht** = 4 oder mehr Wiederholungen wären noch gegangen · **Passend** = 1 bis 3 wären noch gegangen · **Zu schwer** = Ziel nicht geschafft oder Technik brach ein. Halteübungen: **Zu leicht** = mehr als 10 Sek. wären noch gegangen · **Passend** = bis 10 Sek. · **Zu schwer** = Ziel nicht geschafft oder Haltung brach ein (Entscheidung 21.10.2026). Die Definition steht einmal als Hilfetext oben auf der Seite. Kein Feedback bei Max-Tests und Zirkel-Stationen. Wird das Training beendet, ohne dass bewertet wurde (z. B. „Training beenden“ auf der Abschlussseite), gilt für Übungen ohne Feedback automatisch „zu schwer“, wenn der erste Satz das Ziel verfehlt hat, sonst „passend“ (Entscheidung 21.10.2026). |
| Workout | Am Ende | Gesamtanstrengung 1 bis 5 (1 = sehr leicht, 5 = am Limit), freiwillig und nicht vorausgewählt (Entscheidung 21.10.2026), optional Notiz |
| Gefallen je Übung | Jederzeit im Tab Übungen; auf der Abschlussseite für alle noch unbewerteten Übungen und höchstens 2 seit 6 Wochen nicht bewertete (Entscheidungen 29.10. und 30.10.2026) | 1 bis 5 Sterne pro Übung, freiwillig (siehe Bewertung der Übungen) |

### Progression pro Übung

Ziel und Last werden pro Variante fortgeschrieben. Das Wiederholungsziel gilt für **alle Sätze**; der Nutzer hört bei 1 bis 3 Reserve auf und trägt ein, was er geschafft hat (Entscheidung 30.10.2026). Die Regeln unten messen am **letzten Satz** (Entscheidung 30.10.2026, ersetzt „alle Regeln messen am ersten Satz“): Gesteigert wird erst, wenn auch der letzte Satz das Ziel schafft. Am ersten Satz hängen nur noch das im ersten Satz geänderte Gewicht, die Eingewöhnung, „deutlich verfehlt“ und der beste erste Satz bei Körpergewicht. Bleibt der letzte Satz mehr als 2 Wiederholungen (Halteübungen 10 Sek.) unter dem Ziel, ist „zu schwer“ im Feedback vorausgewählt, sonst „passend“ (Entscheidung 30.10.2026, ersetzt „verfehlt der letzte Satz das Ziel“; nach einem Kalibrierungssatz zählen die Sätze danach); der Nutzer kann umstellen. Gesteigert wird trotzdem erst, wenn der letzte Satz das Ziel schafft.

Grund: Im ersten Training waren die Ziele für die späteren Sätze oft nicht zu schaffen, die App blieb aber beim Ziel, solange der erste Satz passte.

**Schwellen aus dem Bereich der Übung:** U = `bereich.von`, O = `bereich.bis`. „Deutlich verfehlt“ heißt: erster Satz unter U − 2 (Halteübungen U − 10 Sek.). Toleranz des letzten Satzes: 2 Wiederholungen (Halteübungen 10 Sek.).

**Kraftschätzung (nur für Übungen mit Kurzhantel, Kettlebell oder Langhantel):** Nach jeder Übung berechnet die App aus dem besten Satz e1RM = Last × (1 + (Wiederholungen + Reserve) ÷ 30), mit Reserve 4 bei „zu leicht“, 2 bei „passend“ (2,5 bei Ziel-Reserve „2 bis 3“), 1 bei „zu schwer“. Der gespeicherte Wert ist geglättet: neu = 0,5 × alt + 0,5 × aktuell. Die Schätzung begrenzt, wie schnell Ziele steigen, und prüft, ob ein Gewichtssprung machbar ist.

| Situation nach der Übung | Nächste Einheit dieser Variante |
| --- | --- |
| Letzter Satz geschafft, „passend“ | Ziel +1, aber höchstens so viele Wiederholungen, wie die Schätzung bei Reserve 1 zulässt (Reserve 2 bei Ziel-Reserve „2 bis 3“) |
| Letzter Satz geschafft, „zu leicht“ | Last + 1 Schritt, wenn die Schätzung dort im letzten Satz mindestens U − 1 Wiederholungen zulässt (Ziel = diese Schätzung, U − 1 bis O; Entscheidung 30.10.2026); sonst Ziel +2, gleiche Obergrenze |
| Neues Ziel läge über O | Schafft die Schätzung bei Last + 1 Schritt im letzten Satz mindestens U Wiederholungen mit Reserve 1 (geschätzte Wiederholungen minus 1 je weiterem Satz für die Ermüdung)? Ja: Last + 1 Schritt. Nein: Bereich bis O + 3 dehnen. Läge das Ziel über O + 3: Last + 1 Schritt in jedem Fall. Ziel nach jeder Laststeigerung = diese geschätzten Wiederholungen, begrenzt auf U − 1 bis O |
| Bereich gedehnt (Ziel über O), letzter Satz knapp unter dem Ziel, aber mindestens O | Last + 1 Schritt wie oben: Alle Sätze schaffen das obere Ende des Bereichs |
| Erster Satz unter U − 2 (deutlich verfehlt) | Last − 1 Schritt, Ziel U; bei der kleinsten Last die nächstleichtere Variante (wie bei Körpergewicht), ohne sie Ziel = letzter Satz (Entscheidung 30.10.2026) |
| Letzter Satz unter dem Ziel oder „zu schwer“, in den ersten 2 Einheiten nach einer Laststeigerung (Eingewöhnung, erster Satz mindestens U − 2) | Last halten, Ziel = max(U − 1, letzter Satz), nie höher als bisher |
| Letzter Satz mehr als 2 unter dem Ziel | Ziel = max(U − 1, letzter Satz); bei der leichtesten Möglichkeit am Ort (keine leichtere Last und Variante) auch unter U, mindestens 1 (Entscheidung 30.10.2026) |
| Letzter Satz bis 2 unter dem Ziel oder „zu schwer“ trotz geschafftem Ziel | Ziel unverändert |
| Erster Satz mit anderem Gewicht als geplant (im Training geändert, Entscheidung 21.10.2026) | Last = Gewicht des ersten Satzes, Ziel = geschätzte Wiederholungen dort bei Reserve 1 (Reserve 2 bei „2 bis 3“), begrenzt auf U − 1 bis O; die Zeilen oben gelten dann nicht. Ein geändertes Gewicht ab Satz 2 fließt nur in die Kraftschätzung ein |

**Körpergewicht und Band:** Gleiche Regeln ohne Kraftschätzung. **Ziel aus allen Sätzen** (Entscheidung 30.10.2026): Jeder Satz plus die Reserve laut Bewertung (4 bei „zu leicht“, 2 bei „passend“, 2,5 bei Ziel-Reserve „2 bis 3“, 1 bei „zu schwer“) ergibt, was in diesem Satz bis zum Versagen gegangen wäre; eine Ausgleichsgerade über die Sätze schätzt daraus das Nachlassen (nie eine Zunahme) und den letzten Satz. Geschätztes Ziel = dieser letzte Satz minus Ziel-Reserve (1 bzw. 2). Hat der letzte Satz das Ziel geschafft, gilt das größere aus +1 („passend“) bzw. +2 („zu leicht“) und dem geschätzten Ziel, höchstens 2 Wiederholungen über dem bisher besten ersten Satz und höchstens O. Beispiel: Chinups 9 · 8 · 8 · 7 · 7 bei Ziel 5, „passend“: nächstes Ziel 7 (vorher 6), bei „zu leicht“ 9. Sobald der letzte Satz O erreicht, folgt die nächstschwerere Variante bzw. die nächste Bandstufe, Ziel dann U der neuen Variante. Deutlich verfehlt (erster Satz unter U − 2): Band eine Stufe leichter; gibt es keins, und bei Körpergewicht und Halteübungen die nächstleichtere Variante am Ort (höchste kleinere Stufe, Ziel U), **auch wenn sie schon die andere Hauptvariante ist** (dann hat das Muster nur noch diese eine, Entscheidung 30.10.2026); bei gleicher Stufe zuerst eine, die noch keine Hauptvariante ist. Ohne leichtere Variante ist es die leichteste Möglichkeit am Ort: Ziel = Geschafftes im letzten Satz, auch unter U (mindestens 1 Wdh. bzw. 5 Sek.).

**Unterstützende Übungen** (`unterstuetzend: true`, z. B. klimmzug_band): Fortschritt ist das nächstleichtere Band. Ist die leichteste Stufe erreicht und schafft der erste Satz O, folgt die nächste Variante.

**Halteübungen (Lasttyp Zeit):** Ziel in Sekunden; „passend“ +5 Sek., „zu leicht“ +10 Sek.; ab O folgt die nächste Variante mit Ziel U. Keine Kraftschätzung.

**Ergebnis der 12-Wochen-Simulation** (Python-Prototyp `progression_prototyp.py`, simulierter Trainierender mit rund 0,5 bis 1 % Kraftzuwachs pro Woche, Frequenzen 1 bis 5, 50 Zufallsverläufe): im Schnitt 0,02 Lastrückschritte, die erste Laststeigerung von 16 auf 18,5 kg nach 5 bis 7 Wochen, fast alle Bewertungen „passend“. Die Kraftschätzung liegt bis zu 3 % unter der echten Kraft; sie ist bewusst vorsichtig, Max-Tests und „zu leicht“ korrigieren sie nach oben. Eine frühere Regelversion (Ziel für alle Sätze, keine Kraftschätzung) pendelte ständig zwischen zwei Gewichten und senkte das Volumen fälschlich; das ist damit behoben.

**12-Wochen-Tests in TypeScript:** eigener Simulator mit festem Zufallsstartwert (z. B. mulberry32) und demselben Modell wie der Prototyp; seit 30.10.2026 macht der simulierte Trainierende in jedem Satz das Ziel (sonst so viele wie mit 1 Reserve gehen), und sein Feedback richtet sich nach dem letzten Satz. Ergebnis mit der Regel „letzter Satz zählt“: 0 Lastrückschritte, erste Steigerung im Schnitt in Woche 3,5 bis 5,1 (spätestens Woche 9). Geprüft werden Eigenschaften, keine exakten Zahlen: über 50 Startwerte im Schnitt höchstens 0,1 Lastrückschritte, in keinem Verlauf mehr als 1; erste Laststeigerung im Schnitt spätestens in Woche 8 (in keinem Verlauf nach Woche 10; auch der Prototyp liegt bei 2 Einheiten pro Woche in einzelnen Verläufen bei Woche 9); kein Muster Last A, B, A innerhalb von 3 Einheiten.

**Wenn die Last ausgeht** (schwerste Kurzhantel erreicht): Progression in dieser Reihenfolge über langsameres Tempo (3 Sek. absenken, Ziel U), Wiederholungsbereich bis O + 5, einseitige Variante (falls im Katalog und am Ort vorhanden, z. B. Rumänisches Kreuzheben einbeinig; sonst direkt der nächste Schritt; Entscheidung 20.10.2026), nächste Variante im Muster.

**Nächste Variante:** die am Ort mögliche, nicht gesperrte und nicht ausgeschlossene Variante desselben Musters mit der kleinsten höheren Stufe; bei Gleichstand derselbe Lasttyp, dann Last vor Band vor KG vor Zeit. Der Wechsel ersetzt die Hauptvariante; die alte Variante behält ihre Werte.

### Musterstufe und Variantenwechsel

- Jede Variante speichert ihren eigenen Verlauf (letzte Last bzw. Bandstufe, Wiederholungen, Bewertung). Progression findet immer innerhalb einer Variante statt.
- Die **Musterstufe** ist die Stufe (1 bis 10) der schwersten Variante des Musters, die zuletzt im Zielbereich mit „passend“ oder „zu leicht“ bewältigt wurde. Sie dient nur dazu, an einem neuen Ort die passende Variante zu wählen.
- Wird eine bereits genutzte Variante gewählt, startet sie mit ihren letzten Werten.
- Wird eine Variante zum ersten Mal genutzt, gilt als Ziel das untere Ende des Bereichs mit Reserve 3. Der erste Satz ist ein Kalibrierungssatz; die geschafften Wiederholungen legen Last bzw. Ziel der restlichen Sätze dieser Einheit fest. Bei Varianten mit Last wählt der Nutzer das Gewicht im Kalibrierungssatz selbst (vorbelegt mit dem Vorschlag aus den Gewichtstests, sonst der kleinsten Last); danach gilt die schwerste Last am Ort, bei der die Kraftschätzung (Reserve 3) noch U Wiederholungen mit Ziel-Reserve zulässt, Ziel = geschätzte Wiederholungen dort (U − 1 bis O). Der zweite Satz zeigt dieses Ziel; die Regeln der Progression messen an ihm statt am Kalibrierungssatz.
- Erreicht der erste Satz einer Körpergewichts-, Band- oder Zeitvariante O, wechselt die nächste Einheit zur nächstschwereren Variante, Ziel U der neuen Variante.
- **Zwischenstufe:** Liegt die nächste am Ort mögliche Variante 2 oder mehr Stufen über der aktuellen, trainiert die App zuerst die aktuelle Variante mit langsamem Absenken (3 Sek.), Ziel U. Erreicht der erste Satz damit wieder O, folgt die nächste Variante. Band-Varianten sind bereits eigene Stufen der Leiter und brauchen keine Sonderregel.

### Persönliche Volumengrenze pro Muskel

Wie viel Volumen jemand verträgt, ist individuell. Deshalb hat jeder Muskel eine persönliche Grenze (Startwerte siehe Planungslogik), die die App einmal pro Woche anpasst (Wochenabschluss, siehe unten). Bewertet werden nur Muskeln, die in dieser Woche mindestens 80 % ihres Ziels erreicht haben; schwache Wochen verändern nichts.

Seit 30.10.2026 gilt „robust, behutsam mehr“ (Entscheidung; ersetzt „Leistung gestiegen: unverändert“ und „2 Wochen gleich: +2“):

| Lage in der Woche | Anpassung der Grenze |
| --- | --- |
| Leistung 2 Wochen in Folge mehr als 3 % gefallen oder Gesamtanstrengung im Schnitt 4 oder mehr (Warnzeichen) | −2 Sätze (nicht unter die Untergrenze + 2) |
| Gute Woche: Leistung nicht mehr als 3 % gefallen, keine „zu schwer“-Bewertung außerhalb einer Eingewöhnung, Gesamtanstrengung im Schnitt höchstens 3 | Zählt mit; nach 4 guten Wochen in Folge +2 Sätze (bis zur Obergrenze der Priorität) |
| Sonst (z. B. eine einzelne Woche mit Leistungsabfall oder „zu schwer“) | Unverändert; die guten Wochen zählen von vorn |

Grund: In der 12-Wochen-Simulation sank die Grenze trotz Fortschritt (Trizeps 10 → 6, beim Einsteiger mehrere Muskeln 8 → 6), weil einzelne Messfehler als Leistungsabfall zählten, und stieg bei Übungen, die am schwersten Gewicht festhingen. Mit der neuen Regel steigt sie bei stetigem Fortschritt etwa alle 4 Wochen um 2 Sätze.

Die Grenze liegt nie mehr als 4 Sätze über dem höchsten tatsächlich erreichten Wochenvolumen der letzten 4 Wochen. Sonst würde sie in zeitknappen Phasen unbemerkt steigen und bei mehr Zeit einen zu großen Sprung erlauben.

Diese Regel ist eine Designentscheidung auf Basis der Dosis-Wirkungs-Daten, keine direkt getestete Studienvorgabe; die Schrittweite steht in der Konfiguration.

**Leistung pro Muskel:** Jede Hauptvariante hat einen Leistungswert: e1RM bei Lasttyp Last, Wiederholungen des ersten Satzes bei KG und Band, Sekunden bei Zeit. Je Variante zählt die relative Veränderung gegenüber dem 2-Wochen-Mittel davor, und zwar nur gegenüber Einheiten mit gleicher Bedingung wie ihre letzte Einheit der Woche: gleiches Gewicht (des ersten Satzes), gleiches Band, gleiches Tempo (Entscheidung 30.10.2026; ein leichteres Gewicht oder langsames Absenken ist kein Leistungsabfall). Die erste Einheit einer Variante (Kalibrierungssatz bzw. neue Übung) und der Testtag zählen nicht. Die Leistung eines Muskels ist das Mittel dieser Veränderungen über alle Hauptvarianten, in denen der Muskel primär ist. Varianten ohne vergleichbare Einheit (z. B. in der Woche gewechselt) zählen nicht.

Der Deckel wirkt beim Anheben: Die Grenze steigt nie über bestes Wochenvolumen + 4, wird durch ihn aber nicht gesenkt (sonst würden schwache Wochen die Grenze verändern).

**Wochenabschluss:** Läuft beim Öffnen der App für alle abgeschlossenen, noch nicht ausgewerteten Wochen nacheinander (Nachholen; `Woche.ausgewertet`). Er speichert die Leistung je Muskel, passt die Grenzen an und beendet bei Bedarf den Zyklus (nach 6 Wochen oder mit einer Erholungswoche). Die Auslöser für Erholungswochen prüft die App bei der ersten Einheit der Folgewoche (siehe unten).

### Erholungswochen (nur reaktiv)

Ein fester Deload-Rhythmus entfällt: Eine Woche Pause brachte in der bisher einzigen kontrollierten Studie keinen Vorteil für die Hypertrophie, und schwache Wochen mit 1 bis 2 Einheiten wirken ohnehin entlastend. Die App schlägt eine Erholungswoche nur vor, wenn einer dieser Fälle eintritt:

- Leistung sinkt bei mindestens 2 Mustern in 2 aufeinanderfolgenden Einheiten (weniger Wiederholungen bei gleicher Last; bei KG und Band: erster Satz derselben Variante 2 oder mehr Wiederholungen unter dem Mittel der beiden vorherigen Einheiten).
- Gesamtanstrengung über die letzten 4 Workouts im Schnitt 4,5 oder höher.
- 10 Wochen ohne eine Woche unter 60 % des üblichen Volumens: dann nur als Angebot, das abgelehnt werden kann. **Übliches Volumen** = Mittel der erledigten Wochensätze (alle Muskeln) der letzten 4 Wochen.

**Alle drei Auslöser sind nur ein Angebot** (Entscheidung 20.10.2026): Bei der ersten Einheit einer Woche, zusammen mit der Frage nach der Wochenprognose, fragt die App, ob diese Woche eine Erholungswoche sein soll. Ausgewertet werden die Daten bis Ende der Vorwoche. Die Antwort gilt für die ganze Woche (`Woche.erholungswoche`); direkt nach einer Erholungswoche kommt kein neues Angebot.

In der Erholungswoche: Volumen 50 %, Last und Reserve unverändert (die Intensität erhält die Leistung), keine Max-Tests, keine Zirkel. Danach beginnt ein neuer Zyklus.

**Trainingspause** (Tage seit der letzten Einheit):

| Pause | Erste Einheiten danach |
| --- | --- |
| bis 7 Tage | Keine Anpassung |
| 8 bis 21 Tage | Erste Einheit je Muster mit Ziel-Reserve 3, Wochenziel in dieser Woche 70 % |
| über 21 Tage | Zusätzlich 10 % weniger Last bzw. eine Variantenstufe leichter; Wochenziel 2 Wochen lang 70 % |

„Ziel-Reserve 3“ heißt: Ziel im ersten Satz 2 Wdh. unter dem letzten Ziel der Variante, bei Halteübungen 10 Sek. weniger (Entscheidung 20.10.2026). Grund: Nach 1 bis 3 Wochen Pause sind Kraft, Sehnen und Gelenke etwas aus der Übung; eine leichtere erste Einheit je Muster vermeidet verfehlte Ziele, starken Muskelkater und Zerrungen. Ab der zweiten Einheit des Musters läuft die Progression normal. Über 21 Tage: Last 10 % weniger (nächste vorhandene darunter), Band eine Stufe leichter, Körpergewicht und Halteübungen eine Variantenstufe leichter.

Die Stufen ab 8 Tagen sind vorsichtige Startwerte, die Studienlage zu längeren Pausen ist dünner als zur einwöchigen.

### Max-Tests

- **Zeitpunkt:** Immer am Anfang einer Einheit, direkt nach dem Aufwärmen. Nie am Ende, da Vorermüdung das Ergebnis verfälscht.
- **Testtag beim Onboarding:** Max. Pushups, max. Pullups (oder max. Sekunden im Hängen, falls keiner geht), max. Squats, max. Plank in Sekunden (Details und Startvarianten siehe Onboarding).
- **Danach:** Frühestens 21 Tage nach dem letzten Test eines Musters, rotierend über hDruck, vZug, Knie und Rumpf, höchstens ein Test pro Einheit. Getestet wird immer mit derselben Übung wie am Testtag, damit die Ergebnisse vergleichbar sind; ist sie am Ort nicht möglich, wird der Test verschoben. In Wochen mit 1 bis 2 Einheiten nur, wenn der Test 28 Tage oder länger zurückliegt. Gibt es für ein Muster noch keinen Test (Testtag übersprungen), ist er sofort fällig, mit der Übung des Testtags (Entscheidung 20.10.2026). In einer Fokus-Einheit nur Muster, deren Primärmuskeln zur Fokusgruppe gehören.
- **Ausnahmen:** Kein Test in Erholungswochen und nicht, solange das Erholungsfenster eines beteiligten Muskels noch läuft.
- **Am Testtag:** Der Test zählt als ein harter Satz; das getestete Muster bekommt in dieser Einheit 50 % weniger weitere Sätze, aber je Übung mindestens 2 (Entscheidung 30.10.2026: keine Übung mit nur 1 Satz).
- **Auswertung:** Liegt das Ergebnis über dem Zielbereich der getesteten Variante, wechselt das Muster ab der nächsten Einheit zur nächstschwereren Variante; die Musterstufe steigt entsprechend. Jeder Test landet im Verlauf (Tabelle `maxTests`); ein neuer Rekord wird beim Abschluss hervorgehoben.

**Rekord** = neuer Bestwert bei: e1RM einer Last-Variante, erstem Satz einer KG- oder Band-Variante, Sekunden einer Zeit-Variante, Max-Test-Ergebnis, Zirkel-Bestzeit je Ort.

## Trainingsablauf und Screens

Das Training läuft geführt Schritt für Schritt: eine Übung pro Bildschirm, Satz abhaken, der Pausentimer startet automatisch. Anpassen geht vor dem Start; im Training lässt sich eine Übung nur tauschen, solange ihr erster Satz offen ist (Entscheidung 21.10.2026).

### Ablauf einer Einheit

1. **Startbildschirm:** Bei der ersten Einheit der Woche, solange keine Tage gewählt sind, die Frage „An welchen Tagen trainierst du diese Woche?“ (vorausgefüllt, heute immer dabei). Danach eine Zeile mit den vorausgefüllten Angaben („Zuhause · Kombi · morgen frei“) und „Ändern“, das Ort, „Wie trainierst du heute?“ (Kombi oder Klassisch, vorbelegt Kombi) und „Morgen wieder trainieren?“ aufklappt (Entscheidung 21.10.2026), gegebenenfalls „15 Min länger?“. Erst dann wird die Einheit erzeugt und mit Format, geschätzter Dauer und Muskelgruppen angezeigt. Alternativ: unter „Einheit erstellen“ ein zweiter, schlichter Button „Stattdessen Zirkel“; er öffnet die Liste der 5 Zirkel mit Dauer und Bestzeit am gewählten Ort. Ein dritter, „Eigenes Workout“, öffnet die Liste der eigenen Workouts (siehe „Eigene Workouts“).
2. **Vorschau:** Liste aller Übungen mit Sätzen, Zielwiederholungen und Last. Die Satzzahl umfasst alle Sätze inklusive Bauch und Waden. Pro Übung „Tauschen“: Die App zeigt nur Alternativen desselben Musters, die am Ort möglich sind, mit passender Zielvorgabe. Der Tausch wird gespeichert und fließt in den Verlauf des Musters ein. „Anpassen“ (nicht im Zirkel, Entscheidung 21.10.2026): Sätze je Übung ändern (1 bis 10), Übungen entfernen und „+ Übung hinzufügen“ (alle am Ort möglichen, nicht gesperrten oder ausgeschlossenen Übungen, die noch nicht in der Einheit sind; neu am Ende als einzelne Übung mit 3 Sätzen und Ziel und Last wie gewohnt). Bleibt in einer Kombi-Runde nur eine Übung, wird sie zur einzelnen Übung; Dauer und Aufwärmen passen sich an. Ob damit das Wochenziel erreicht wird, prüft die App nicht. „Zurück“ behält die erstellte Einheit samt Tausch und Anpassungen; Heute zeigt dann „Vorschau öffnen“, „Neu erstellen“ (verwirft sie) und die Übungen mit Tausch-Knopf (Entscheidungen 21.10.2026).
3. **Aufwärmen (ca. 5 Min):** 2 Min allgemein, passend zu den Körperhälften des Tages (Entscheidung 29.10.2026: Jumping Jacks immer; nur Oberkörper: Arm Circles und Backward Shoulder Circles; nur Unterkörper: Squats und Leg Swings; sonst Arm Circles und Squats), 2 Min Mobility für die Muster mit den meisten Sätzen des Tages, 1 Aufwärmsatz der ersten Grundübung mit etwa 50 % Last bzw. leichterer Variante; die Zeile nennt die Übung („8 Wdh. Goblet Squats: 8 kg“), ohne bekannte Last „leichtes Gewicht“ (Entscheidung 21.10.2026). Angezeigt Schritt für Schritt wie die Übungen (Entscheidung 29.10.2026, ersetzt die Liste auf einem Screen): je Übung ein Bildschirm mit „Aufwärmen · x von y“ (beim Aufwärmsatz „Aufwärmsatz“), Name, „So geht's“ wie bei den Übungen (Entscheidung 30.10.2026: Kurzanleitung und Video; Aufwärmübungen, die es im Katalog gibt, zeigen die Katalogübung, die übrigen ihre Anleitung aus `aufwaermen.anleitungen`, der Aufwärmsatz die Übung selbst) und Zielkarte, dazu „Weiter“ (beim letzten „Fertig“) und „Aufwärmen überspringen“; der Balken zeigt die Aufwärmschritte. Vorgaben sind Wiederholungen; nur Halteübungen (Dehnungen) haben Sekunden und bekommen den Countdown mit Vorlauf wie Halteübungen im Training. Gleich beim Testtag. Mobility nach „Ruhetag empfohlen“ und Abkühlen bleiben Listen.
4. **Max-Test (falls geplant):** Eigener Bildschirm mit Zähler bzw. Stoppuhr (mit 5 Sek. Vorlauf, siehe unten).
5. **Übungsbildschirme:** Name, „So geht's“ (aufklappbar: Kurzanleitung, eingebettetes Video, Link zu YouTube; jede Katalogübung hat ein festes Video), „Tauschen“ (nur solange der erste Satz der Übung offen ist, nicht beim Max-Test; gleiche Alternativen wie in der Vorschau, die neue Übung bekommt Ziel und Last wie gewohnt; im Zirkel bleibt die Vorgabe der Station; Entscheidung 21.10.2026), Satz x von y, Zielwiederholungen, Last, Zähler „Geschafft“ mit −/+ (vorbelegt mit dem Ziel, darunter „Weniger geschafft? Mit − anpassen.“; Entscheidung 30.10.2026, gilt auch in Kombi-Runden; ein Tipp auf die Zahl öffnet die Zifferntastatur, gilt für alle Zähler inklusive Testtag und Max-Test, Entscheidung 30.10.2026) und Button „Satz erledigt“; Halteübungen zusätzlich mit Countdown bis zum Ziel und Ton am Ende; „Stopp“ übernimmt die gehaltenen Sekunden in den Zähler (Entscheidung 30.10.2026). Countdown und Stoppuhr (auch im Testtag) starten nach dem Tipp mit 5 Sek. Vorlauf „Bereit machen“, dann ein Ton, und die Zeit läuft (Entscheidung 29.10.2026). Bei Übungen mit Last lässt sich das Gewicht in jedem Satz mit −/+ ändern; es gilt für die folgenden Sätze der Übung (Entscheidung 21.10.2026). Danach startet der Pausentimer (Ton und Vibration am Ende, Pause verlängern oder überspringen möglich; „Letzten Satz rückgängig“ öffnet den gerade erledigten Satz erneut, Entscheidung 21.10.2026). Die Kopfzeile zeigt „Block x von y“ (im Zirkel stattdessen „Runde x von y“) in der Farbe des Blocks, darunter groß und mittig die laufende Trainingszeit (Entscheidung 29.10.2026) und den Fortschrittsbalken. Jeder Block hat eine eigene Farbe, der Reihe nach Akzent, Blau, Orange, Pink, dann wieder von vorn (Entscheidung 29.10.2026): Sie färbt Block-Kennzeichnung, Balken, Satzpunkte, den Rand der Zielkarte, den Pausenring, „Als Nächstes“ und beim Blockwechsel die Karte des nächsten Blocks; der Zirkel bleibt im Akzent. Ein Block ist eine Kombi, eine einzelne Übung oder der Max-Test. Der Balken zeigt nur den aktuellen Block (Entscheidung 29.10.2026) mit einem Stück je Satz: In Kombi-Runden und im Zirkel trennt eine große Lücke die Runden und eine kleine die Übungen einer Runde. Erledigte Stücke sind voll, der aktuelle Satz ist heller markiert. In Kombi-Runden wechselt der Bildschirm zwischen den Übungen der Runde in der Reihenfolge A1 Satz 1, A2 Satz 1, A3 Satz 1, Pause, A1 Satz 2 usw.; Pause nur nach der Runde, „Als Nächstes“ ist innerhalb der Runde immer die nächste Übung. Kennzeichnung „Kombi A · Übung 1 von 3“.
   **Blockwechsel (Entscheidung 29.10.2026):** Die Pause nach dem letzten Satz eines Blocks zeigt oben die Restzeit mit „+30 Sek.“ und darunter groß „Als Nächstes · Kombi B“ mit allen Übungen des nächsten Blocks, Sätzen, Ziel und Last zum Aufbauen, dazu „Letzten Satz rückgängig“. Am Ende der Pause Ton und Vibration; weiter geht es erst mit „Los“. Nicht im Zirkel.
   **Ziel:** Das Ziel ist eine einzelne Zahl (`zielWdh`) für alle Sätze; die Progression misst am letzten Satz (Entscheidung 30.10.2026). Die UI zeigt in jedem Satz „Ziel 10“, darunter klein „Bereich 8 bis 12“ (seit 29.10.2026 keine „Vorgabe“ mehr in Folgesätzen). (Bereiche wie „8 bis 10“ als Ziel in den Mockups 3 bis 5 sind falsch.)
6. **Abschluss mit Übungsfeedback (Entscheidung 29.10.2026, ersetzt die getrennten Seiten Übungsfeedback und Abschluss):** Nach dem letzten Satz kommt genau eine Seite: Zusammenfassung mit Dauer, Sätzen und neuen Rekorden (Zirkel: Zeit und Bestzeit), darunter „Wie waren die Übungen?“ mit allen Übungen, dann Gesamtanstrengung 1 bis 5 (freiwillig, nichts vorausgewählt), optionale Notiz, optional Abkühlen (zeigt die Mobility-Zeilen des Aufwärmens erneut, ca. 3 Min.) und ein „Speichern“ für alles; danach geht es zu Heute. Das Training endet mit dem letzten erledigten Satz, die Zeit auf der Seite zählt nicht mit. „Training beenden“ vor dem Ende zeigt dieselbe Seite mit den Übungen, deren Sätze alle erledigt sind; über das Kreuz führt „Weiter trainieren“ dort zurück zum offenen Satz. Je Übung (links ein Streifen in der Farbe ihres Blocks): zu leicht / passend / zu schwer, vorausgewählt. Je Übung steht eine Zeile mit den Sätzen („3 Sätze: 10 · 10 · 10 Wdh.“). Das Geschaffte steht schon in den Sätzen; die Nachfrage „Wie viele hast du im 1. Satz geschafft?“ entfällt (Entscheidung 30.10.2026). Wechselte das Gewicht, steht darunter, welches Gewicht in welchem Satz galt (Entscheidung 21.10.2026). Darunter der Folgetext nach dem Muster „Nächstes Mal: 16 kg, Ziel 11 je Satz“ (Entscheidung 30.10.2026).

**Zirkel-Modus:** Laufende Stoppuhr für das ganze Workout, Übungen nacheinander mit Tipp auf „weiter“, Rundenanzeige, am Ende Vergleich mit der Bestzeit an diesem Ort. Stationen mit Sekunden (z. B. „Plank 30 Sek.“) haben den Countdown wie Halteübungen. Die Zirkel-Liste vor dem Start zeigt dieselbe Dauer wie die Vorschau, inklusive Aufwärmen (Entscheidungen 30.10.2026).

### Eigene Workouts (Entscheidungen 21.10.2026)

Im Tab Übungen unter „Meine Workouts“ legt der Nutzer eigene Workouts an, bearbeitet und löscht sie. Ein Workout hat einen Namen (eindeutig) und eine Art:

- **Übungsliste:** Übungen in fester Reihenfolge, je Übung 1 bis 10 Sätze (Standard 3). Ziel und Last rechnet die App wie in jeder Einheit (Progression, Kalibrierung, erste Einheit nach einer Pause leichter). Beim Start gilt „Kombi oder Klassisch“ wie bei der Einheit der App; Kombi bildet die Runden nach denselben Regeln.
- **Zirkel:** Stationen in fester Reihenfolge, 1 bis 10 Runden (Standard 3), je Station eine Vorgabe in Wdh. bzw. Sek. (Standard 10 Wdh. bzw. 30 Sek.). Ablauf, Stoppuhr und Bestzeit je Ort wie bei den 5 Zirkeln; geschätzte Dauer: Aufwärmen plus 40 Sek. je Station und Runde.

Bearbeiten: Name, Art, Runden, Übung hinzufügen (Suche, alle nicht ausgeschlossenen Übungen), Reihenfolge ändern, entfernen und ersetzen. Beim Ersetzen stehen oben bis zu 5 Vorschläge derselben Art, die mit der ähnlichsten Stufe zuerst, darunter alle Übungen mit Suche. Ein Wechsel der Art behält Sätze und Vorgaben. Gestartet wird auf „Vor dem Start“ mit „Eigenes Workout“: Liste mit Name, Art, Zahl der Übungen, Hinweis „2 Übungen gehen hier nicht“ und bei Zirkeln der Bestzeit am gewählten Ort; dazu „+ Neues Workout“ und „Workouts bearbeiten“. Übungen, die am Ort nicht gehen oder gesperrt sind, entfallen; geht keine, lässt sich das Workout dort nicht starten. Eine Einheit aus einem Workout heißt wie das Workout (`Einheit.name`), zählt wie jede Einheit für Woche, Erholung, Progression und Verlauf und lässt sich in der Vorschau tauschen und anpassen. Ein Max-Test wird nicht eingeplant. Gelöschte Workouts bleiben im Verlauf mit ihrem Namen erhalten.

**Unterbrechung:** Wird die App geschlossen, bleibt die Einheit gespeichert und lässt sich fortsetzen; es geht mit dem nächsten offenen Satz weiter, eine angefangene Pause entfällt. Das Kreuz oben bietet „Weiter trainieren“, „Später fortsetzen“ und „Training beenden“. Ein Abbruch speichert alle bis dahin erledigten Sätze (ein abgebrochener Zirkel zählt nur die erledigten Runden); ohne erledigten Satz bleibt die Einheit als erstellte Einheit bestehen.

### Gestaltung

Die verbindliche Vorlage für Aufbau und Stil sind die [Mockups der Kernscreens](https://claude.ai/artifact/53GvrjNfGDWYZy5YP8xNTu) (9 Screens, klickbar; im Repository als Bilder `docs/mockups/1-heute.png`, `2-start.png`, `3-vorschau.png`, `4-satz.png`, `5-pause.png`, `6-feedback.png`, `7-abschluss.png`, `8-fortschritt.png`, `9-equipment.png`). Texte, Zahlen und Beispielübungen darin sind Beispieldaten. Stil: hell, ruhig, minimalistisch; eine einzige Akzentfarbe, viel Weißraum, große Zahlen im Training.

**Übergänge (Entscheidung 29.10.2026):** Eine neue Seite gleitet kurz (ca. 0,25 Sek.) von rechts herein, beim Zurückgehen von links; ein Tabwechsel blendet nur ein, die Tab-Leiste bleibt stehen. Im Training gleitet jeder neue Schritt (Satz, Pause, Abschluss) herein, der Fortschrittsbalken wächst weich. Blätter (Tauschen, Training unterbrechen) fahren von unten hoch. Ist im Handy „Bewegung reduzieren“ (bzw. „Animationen entfernen“) eingestellt, gibt es keine Übergänge.

| Token | Wert | Verwendung |
| --- | --- | --- |
| Hintergrund | #F7F7F5 | Seitenfläche |
| Fläche | #FFFFFF, Rand #E4E5E2, Radius 16 px | Karten |
| Text | #16181D | Haupttext |
| Text gedämpft | #5B6270 | Nebeninfos (Kontrast über 4,5:1) |
| Akzent | #0F766E, hell #E6F2F1 | Primärbuttons, Auswahl, Fortschritt |
| Blockfarben (Entscheidung 29.10.2026) | Block 1 Akzent; Blau #4338CA, hell #ECEBFB; Orange #B45309, hell #FBF0E4; Pink #BE185D, hell #FBE9F1 | Blöcke im Training, der Reihe nach |
| Trainingszeit | 40 px, extrafett | Laufende Zeit im Training |
| Linie | #EEEFEC | Trenner, leere Balken |
| Schrift | Manrope, Gewichte 400, 600, 700, 800 als woff2-Dateien unter `public/fonts/`, per `@font-face` eingebunden (offline verfügbar) | alles |
| Größen | 30 Titel, 22 Screen-Titel, 15 bis 17 Text, 12 bis 13 Hinweise, 56 Zahlen im Training |  |
| Abstände | 20 px Seitenrand, 8er-Raster |  |
| Touch-Ziele | mindestens 44 px, Primärbutton 52 bis 56 px hoch |  |

Ein Dunkelmodus ist nicht Teil von Version 1. Icons sind eigene, schlichte Inline-SVG-Linien-Icons, keine Icon-Bibliothek, keine Emojis.

### Screens und Zustände

Navigation unten mit 4 Tabs: Heute, Fortschritt (mit Unterreiter Verlauf), Übungen, Einstellungen. Das Training läuft als Vollbild ohne Tab-Leiste.

| Screen | Inhalt | Besondere Zustände |
| --- | --- | --- |
| Heute | Nächste Einheit mit Ort und Dauer als Vorschau (`erstelleEinheit` mit den Vorschlägen aus `startfragen`, nur zur Anzeige, ohne zu speichern; nach den Startfragen wird neu erzeugt), Start-Button, darunter alle Übungen der Vorschau mit Sätzen, Ziel und Last („Voraussichtlich, mit den Standardangaben vor dem Start“); „Diese Woche“: „x von y Einheiten“, Trainingstage mit „ändern“ und Wochenausblick je Tag (aufklappbar mit allen Übungen); nächster Max-Test. Der Wochenfortschritt pro Muskel steht im Tab Fortschritt (Entscheidung 21.10.2026) | Noch keine Tage gewählt: Karte „An welchen Tagen trainierst du diese Woche?“ mit Vorschlag und „Übernehmen“ · Erster Start: Weiter zum Onboarding · Erholungswoche: Hinweisband · erstellte, noch nicht gestartete Einheit: „Vorschau öffnen“ und „Neu erstellen“ · Ruhetag empfohlen: Hinweis plus „trotzdem trainieren“, „Zirkel“, „Mobility“ (Mobility nur als Liste, ohne Speichern) · unterbrochene Einheit: „Fortsetzen“ statt Start · heute kein gewählter Trainingstag (Tage gewählt, nichts erstellt oder trainiert): „Heute frei“ mit „Nächstes Training: Fr, 06.11.“ und klein „Trotzdem trainieren“, das die übrigen Zustände öffnet (Entscheidung 30.10.2026) · Wochenstand „0 von 1 Einheit“ bzw. „2 von 3 Einheiten“ · Name der Einheit nach Inhalt: Eine Ganzkörper-Einheit, deren Hauptmuskeln (ohne Bauch) alle zu einer Körperhälfte gehören, heißt „Oberkörper“ bzw. „Unterkörper“ (Entscheidung 30.10.2026) · heute schon trainiert (auch Testtag): „Heute erledigt“ mit Häkchen, Name, Dauer, Sätzen und „Nächstes Training“ (nächster gewählter Tag); „Trotzdem trainieren“ klein darunter öffnet die übrigen Zustände (Entscheidung 21.10.2026) · neue Übung mit Last: „Gewicht wählst du im 1. Satz“ statt einer Last (auch in der Vorschau) |
| Vor dem Start | Trainingstage (nur erste Einheit der Woche, solange keine gewählt sind; heute immer dabei), eine Zeile „Ort · Kombi · morgen frei“ mit „Ändern“ (klappt Ort, Kombi oder Klassisch und „Morgen wieder?“ auf), „15 Min länger?“ (nur bei Prognose 1 bis 2, Einstellung an und offenem Bedarf), Button „Einheit erstellen“, darunter schlicht „Stattdessen Zirkel“ und „Eigenes Workout“ | Alle Felder vorausgefüllt; Start mit einem Tipp möglich · Zirkel vorgeschlagen: „Doch Krafteinheit“ · Eigenes Workout: Liste der Workouts, „Doch Einheit der App“ |
| Vorschau | Blöcke mit Übungen, Sätzen (alle, inklusive Bauch und Waden), Zielen, Last, geschätzte Dauer; Tausch-Button pro Übung; „Anpassen“ oben rechts; Aufwärmen oben | Tausch-Blatt mit Alternativen desselben Musters · Ersatz-Markierung · Anpassen: Sätze je Übung, Entfernen, „+ Übung hinzufügen“ (nicht im Zirkel) |
| Satz | Übung, „So geht's“ (Kurzanleitung, Video, YouTube-Link), „Tauschen“ bis zum ersten Satz der Übung, Satz x von y, „Ziel 10“ mit „Bereich 8 bis 12“ in jedem Satz, Last (bei Übungen mit Last in jedem Satz mit −/+ änderbar), Zähler „Geschafft“, vorbelegt mit dem Ziel (Entscheidung 30.10.2026), „Letztes Mal“ (aus der letzten abgeschlossenen Position derselben Übung), Hinweis zur Reserve; im ersten Satz statt „Letztes Mal“ der Fortschritt (Entscheidung 21.10.2026): „Letztes Mal 9 · heute 10“ (letzter Satz der letzten Einheit), darunter „Ab 12 in allen Sätzen: mehr Gewicht“ (Körpergewicht und Zeit: Name der nächsten Variante, bei großem Sprung erst langsames Absenken; Band: nächstes Band bzw. weniger Unterstützung) und ab 2 Einheiten eine kleine Kurve der Leistung (Kraftschätzung bzw. erster Satz) der letzten 8 Einheiten; nicht beim Kalibrierungssatz | Max-Test: Zähler ohne Ziel (Halteübung: Stoppuhr) · Kalibrierungssatz: Zähler · Halteübung: Countdown bis zum Ziel · Countdown und Stoppuhr mit 5 Sek. Vorlauf · Supersatz: Kennzeichnung A1/A2 |
| Pause | Timer-Ring, +30 Sek., Überspringen, „Letzten Satz rückgängig“, „Als Nächstes“ (in einer Kombi-Runde die nächste Übung der Runde, Pause nur nach der Runde) | Ton und Vibration am Ende; Bildschirm bleibt an · Blockwechsel: Restzeit, nächster Block mit allen Übungen, weiter erst mit „Los“ |
| Übungsfeedback | Eine Seite am Ende des Trainings für alle Übungen: Definition oben, je Übung die Sätze, 3 Buttons, Vorschau der Folge („Nächstes Mal: 16 kg, Ziel 11 je Satz“), ein „Weiter“ für alle | „Zu schwer“ vorausgewählt, wenn der letzte Satz mehr als 2 Wdh. (Halten 10 Sek.) unter dem Ziel bleibt (Entscheidung 30.10.2026) |
| Abschluss | Dauer, Sätze, Rekorde, Übungsfeedback aller Übungen, Gesamtanstrengung 1 bis 5 (nicht vorausgewählt), Notiz, optional Abkühlen, ein „Speichern“ | Zirkel: Zeit und Bestzeit-Vergleich |
| Fortschritt | Karte „Sätze pro Muskel“ (Entscheidung 21.10.2026: „Diese Woche“ und „Sätze pro Woche“ zusammengelegt): je Muskel diese Woche erledigt von Ziel als Balken, darunter die letzten 6 Wochen als kleine Säulen (erst ab der zweiten Woche), alle am Ziel gemessen, mit Hinweis „zählt als Entlastung“ bei abgeschlossenen Wochen unter 60 % des üblichen Volumens oder Erholungswochen; Max-Test-Verlauf pro Muster (Chips für alle getesteten Muster inklusive Plank in Sekunden); eigene Karte Zirkel-Bestzeiten (Zirkel, Ort, Bestzeit, Datum; eine Zeile je Übungsauswahl, abweichende Übungen werden genannt, Entscheidung 21.10.2026); Unterreiter Verlauf mit allen Einheiten. Tipp auf eine Einheit zeigt Datum, Ort, Dauer, alle Übungen mit Sätzen, Last, Feedback, Gesamtanstrengung und Notiz; darunter „Einheit löschen“ mit Rückfrage (nicht beim Testtag, Entscheidung 29.10.2026): Die Einheit verschwindet aus Verlauf, Woche, Sätzen pro Muskel, Max-Tests und Zirkel-Bestzeiten; die Erholung zählt ab der letzten übrigen Einheit. Ziel, Gewicht bzw. Band und Variante jeder Übung gehen auf den Stand vor der Einheit zurück, sofern die Übung (bzw. bei der Variante das Muster) danach nicht wieder trainiert wurde. | Leer: „Nach deiner ersten Einheit siehst du hier deinen Fortschritt.“ |
| Übungen | Oben „Meine Workouts“ (Liste, „Neues Workout“, Editor; siehe „Eigene Workouts“), Suche, Filter nach Muster und Ort, Favorit/Ausschluss, Sterne 1 bis 5, eigene Übung anlegen (ähnliche Übung als Vorlage, alle Angaben vorausgefüllt und änderbar; Kurzanleitung und festes Video der Vorlage werden nicht übernommen), Detail mit „So geht's“ (Kurzanleitung, Video), „Dein Verlauf“ (letzte 5 Einheiten mit Datum, Gewicht und Wiederholungen je Satz, darunter das nächste Ziel; nur mit Training, Entscheidung 21.10.2026), eigener Video-Link (ein YouTube-Link wird in der App abgespielt) | Eigene Übung lässt sich nur löschen, solange sie nie trainiert wurde (Entscheidung 20.10.2026) |
| Einstellungen | Orte und Equipment (Mockup 9, Regeln siehe Orte), Profil, Prioritäten, Dauer, Zirkel-Anteil, Pausen, Einschränkungen, Backup (Export/Import); ganz unten Karte „Von vorn beginnen“ mit „App zurücksetzen“: zuerst Backup anbieten (In Drive sichern, Auf dem Handy speichern, Ohne Backup weiter), dann „Wirklich alle Daten löschen?“ mit „Alles löschen“; löscht alle Daten in einem Schritt und startet das Onboarding (Entscheidungen 21.10.2026) | Ort ohne Pflichtangaben lässt sich nicht speichern · Ort lässt sich nur löschen, solange dort nie trainiert wurde (Entscheidung 20.10.2026) |

Texte sind auf Deutsch, Du-Form, kurz. Zahlen mit deutschem Dezimalkomma (2,5 kg).

### Einschränkungen

Der Nutzer kann Körperregionen (z. B. Schulter, Knie, unterer Rücken) oder einzelne Muster sperren, optional mit Enddatum. Gesperrte Übungen tauchen weder im Plan noch beim Tauschen auf. Das ausfallende Volumen wird nicht auf andere Muskeln umgelegt. Blockiert eine Sperre alle Varianten eines Musters, greift keine Ersatzregel; das Volumen fällt für die Dauer der Sperre weg.

**Sperren nach Körperregion** (blockiert die genannten Muster bzw. Übungen; sekundäre Beteiligung führt nicht zur Sperre; Muster können zusätzlich einzeln gesperrt werden):

| Region | Gesperrt |
| --- | --- |
| Schulter | vDruck, Schulter, dips, bank_dips, archer_liegestuetz, wand_hs_liegestuetz |
| Ellbogen | Bizeps, Trizeps, dips, bank_dips |
| Handgelenk | alle Liegestütz-Varianten, pike-Varianten, burpees, mountain_climbers |
| Unterer Rücken | Huefte außer glute_bridge, mini_glute_bridge, hip_thrust_einbeinig; kh_rudern_vorgebeugt, lh_rudern |
| Knie | Knie, Einbein, sprung_kniebeuge, skater, burpees, kh_thruster |
| Hüfte | Einbein, Huefte, skater |

## Technische Anforderungen

Die App ist eine reine Client-Anwendung ohne eigenen Server: statisch gehostet, offline-fähig, alle Daten im Browser des Handys. Der Technik-Stack ist festgelegt, damit der Coding-Agent nichts entscheiden muss.

| Bereich | Festlegung |
| --- | --- |
| Sprache und Build | TypeScript (strict), React 18, Vite |
| Styling | Tailwind CSS mit den Tokens aus „Gestaltung“ als Theme |
| Routing | React Router, Hash-Routing (funktioniert auf GitHub Pages ohne Server-Konfiguration) |
| Speicher | IndexedDB über Dexie; beim ersten Start `navigator.storage.persist()` anfordern |
| Validierung | zod für Import-Dateien und `katalog.json` |
| PWA | vite-plugin-pwa: installierbar, alle Dateien und die Schrift offline im Cache |
| Charts | Eigene schlanke SVG-Komponenten (keine Chart-Bibliothek nötig) |
| Tests | Vitest für Planungs- und Progressionsmodul, Testfälle aus den Python-Prototypen; fake-indexeddb als Ersatz für IndexedDB nur in Tests |
| Hosting | GitHub Pages, automatischer Build über GitHub Actions bei jedem Push auf `main` |
| Zielgerät | Android, Chrome; Bildschirm an über Screen Wake Lock API; Pausenende mit Ton und Vibration (Vibration API) |
| Absturz eines Bildschirms | Keine leere Seite: Die App baut den Bildschirm still neu auf. Stürzt derselbe Bildschirm innerhalb von 5 Sek. wieder ab, lädt sie die Seite neu; passiert es danach noch einmal, zeigt sie „Da ging etwas schief“ mit der Fehlermeldung und „Neu laden“. Ein Absturz auf einem anderen Bildschirm beginnt wieder beim stillen Neuaufbau (Entscheidungen 21.10.2026) |
| Parameter | Alle Zahlenwerte dieses Dokuments in `src/konfiguration.ts` |
| Mitgelieferte Dateien | `katalog.json`, `planungslogik_prototyp.py`, `progression_prototyp.py` im Ordner `docs/` |

### Schnittstellen

Es gibt keine Server-Schnittstelle. Nach außen gehen nur der YouTube-Link (öffnet im Browser) und, erst auf Tipp, das eingebettete Video (youtube-nocookie.com). Intern trennt die App strikt zwischen UI und zwei reinen Logikmodulen ohne UI-Abhängigkeit. Die Funktionen sind deterministisch: Die aktuelle Zeit wird immer übergeben, nie im Modul abgefragt.

```ts
// src/logik/planung.ts
startfragen(z: AppZustand, jetzt: string): {
  prognoseAbfragen: boolean; prognoseVorschlag: number; ortId: string;
  morgenWiederVorschlag: boolean; laengerAnbieten: boolean; ruhetagEmpfohlen: boolean;
  zirkelVorschlag: boolean; finisherAnbieten: boolean };  // Zirkel statt Krafteinheit; 3+ freie Sätze (Finisher in Version 1 nicht angezeigt)
erstelleEinheit(z: AppZustand, e: { jetzt: string; ortId: string; prognose: number;
  morgenWieder: boolean; laenger: boolean; zirkelId?: string;
  erholungswoche?: boolean;               // angenommenes Angebot, solange die Woche noch nicht gespeichert ist
  klassisch?: boolean }): Einheit;        // Klassisch statt Kombi (Standard Kombi)
alternativen(z: AppZustand, einheit: Einheit, block: number, position: number):
  { uebungId: string; zielWdh: number; last?: number; bandStufe?: BandStufe }[];
kannTauschen(einheit: Einheit, block: number, position: number): boolean;  // geplant, oder laufend vor dem ersten Satz
tausche(z: AppZustand, einheit: Einheit, block: number, position: number, uebungId: string): Einheit;
workoutEinheit(z: AppZustand, w: EigenesWorkout, e: <wie erstelleEinheit>): Einheit;   // eigenes Workout

// src/logik/anpassen.ts (erstellte Einheit vor dem Start, nicht im Zirkel)
setzeSaetze(z, einheit, block, position, saetze): Einheit;
entferneUebung(z, einheit, block, position): Einheit;
hinzufuegbar(z, einheit): Uebung[];
fuegeUebungHinzu(z, einheit, uebungId): Einheit;

// src/logik/workouts.ts: Prüfen, Speichern in Einstellungen.workouts, Vorschläge zum Ersetzen, Übungen am Ort, Bestzeit

// src/logik/progression.ts
werteUebungAus(z: AppZustand, p: Position, jetzt: string, ortId: string): { variante: VarianteZustand; muster: MusterZustand };
schliesseEinheitAb(z: AppZustand, e: Einheit, jetzt: string): AppZustand;   // Progression, Hauptvarianten, Max-Tests, Muskeln, Woche, Zirkel-Ergebnis
neueRekorde(z: AppZustand, e: Einheit): Rekord[];                          // vor schliesseEinheitAb aufrufen
wochenabschluss(z: AppZustand, wocheId: string): AppZustand;              // Leistung, Grenzen, Zyklus
offeneWochenabschluesse(z: AppZustand, jetzt: string): string[];
erholungswocheAngebot(z: AppZustand, jetzt: string): 'leistung' | 'anstrengung' | 'zehnWochen' | null;
maxTestFaellig(z: AppZustand, jetzt: string, ortId: string): { muster: MusterId; uebungId: string } | null;
naechsteLast(o: Ort, u: Uebung, aktuell: number, richtung: 1 | -1): number | null;

// src/daten/backup.ts
exportiere(jetzt?: string): Promise<Blob>;    // Datei fitness-backup-JJJJ-MM-TT.json (backupDateiname), setzt letztesBackup
pruefeBackup(datei: Blob): Promise<{ ok: true; zusammenfassung: { exportiertAm: string; einheiten: number; von?: string; bis?: string }; daten: Tabellen }
  | { ok: false; fehler: string }>;          // für die Bestätigung vor dem Import
importiere(datei: Blob): Promise<{ ok: true } | { ok: false; fehler: string }>;
```

`AppZustand` bündelt alle Tabellen aus „Entitäten“ plus den geladenen Katalog. Die UI liest und schreibt nur über diese Funktionen und die Datenbank-Schicht.

**Backup-Format:** `{ "format": "fitness-app-backup", "schemaVersion": 1, "exportiertAm": "…", "daten": { <alle Tabellen> } }`. Der Import prüft das Format mit zod, zeigt eine Zusammenfassung (Anzahl Einheiten, Zeitraum) und ersetzt nach Bestätigung alle Daten in einem Schritt; schlägt etwas fehl, bleiben die Daten unverändert. Eine beschädigte Datei wird mit kurzer Meldung samt Fundstelle abgelehnt, z. B. „Die Backup-Datei ist beschädigt (Einheiten, Eintrag 3). Deine Daten bleiben unverändert.“ Ändert sich das Schema, steigt `schemaVersion` und eine Migrationsfunktion hebt alte Backups an. **Wochen-Backup (Entscheidung 21.10.2026):** Ist das letzte Backup (bzw. ohne Backup die erste Einheit) 7 Tage oder länger her, schlägt die Heute-Seite ein Backup vor: „In Drive sichern“ öffnet das Teilen-Menü des Handys mit der Datei (Ziel z. B. Google Drive; Chrome teilt keine .json-Dateien, deshalb wird derselbe Inhalt als `fitness-backup-JJJJ-MM-TT.txt` geteilt), „Auf dem Handy speichern“ lädt die .json-Datei in den Download-Ordner. Ohne Teilen-Funktion im Browser gibt es nur Speichern. `Einstellungen.letztesBackup` wird erst gesetzt, wenn Teilen oder Speichern geklappt hat; bricht der Nutzer das Teilen ab, bleibt der Vorschlag. Die Backup-Seite bietet dieselben zwei Wege; Einlesen nimmt .json und .txt. Ganz ohne Tipp geht es nicht: Browser erlauben kein Speichern oder Hochladen ohne Zutun des Nutzers.

### Abnahmekriterien Version 1

- [ ] Onboarding inkl. Testtag führt direkt zur ersten Einheit; die Wochenprognose (1 bis 6) wird bei der ersten Einheit jeder Woche abgefragt.
- [ ] Ortswechsel vor dem Training tauscht alle Übungen innerhalb ihrer Muster, ohne die Progression zurückzusetzen.
- [ ] Manueller Tausch einer Übung vor dem Start, auf Heute und im Training bis zum ersten Satz der Übung zeigt nur Alternativen desselben Musters.
- [ ] Eigene Workouts (Übungsliste und Zirkel) lassen sich anlegen, bearbeiten, löschen und starten; die erstellte Einheit lässt sich vor dem Start anpassen.
- [ ] Feedback pro Satz, Übung und Workout verändert die nächste Einheit gemäß den Regeln im Abschnitt Progression.
- [ ] Kein Muskel wird vor Ablauf seines Erholungsfensters erneut belastet; Tage am Stück liefern dank Fokus-Einheiten trotzdem volle Einheiten.
- [ ] Max-Tests erscheinen nur am Anfang einer Einheit und nach dem festgelegten Rhythmus.
- [ ] Erholungswochen werden nur bei den definierten Auslösern vorgeschlagen; schwache Wochen verändern die persönliche Volumengrenze nicht.
- [ ] Zirkel-Workouts erscheinen gemäß Einstellung und speichern Bestzeiten pro Ort.
- [ ] App funktioniert im Flugmodus; Export und Import stellen alle Daten vollständig wieder her.
- [ ] Die sieben Use Cases aus „Simulation der Use Cases“ laufen als automatisierte Tests mit Test- und vollem Katalog und erfüllen die dort beschriebenen Eigenschaften (seit 21.10.2026 statt ±1 Satz neben dem Prototyp); der Rauchtest mit vollem Katalog besteht.

Alle früher offenen Punkte sind entschieden: Android, Equipment und Gewichte frei konfigurierbar, Katalog und Zirkel im Tab Übungskatalog, Stil laut Mockups.

## Arbeitspakete für den Coding-Agent

Der Agent arbeitet die Pakete in dieser Reihenfolge ab, je Paket eine Sitzung. Ein Paket ist erst fertig, wenn alle Abnahmepunkte erfüllt sind und `npm test` grün ist. Vor jedem Paket liest er dieses Dokument und den Tab Übungskatalog; bei Widersprüchen gilt dieses Dokument, danach die Mockups, danach die Prototypen.

| Nr. | Paket | Fertig, wenn |
| --- | --- | --- |
| 0 | Projektgerüst und Veröffentlichung: Vite, React, TypeScript, Tailwind mit Tokens, Schrift Manrope unter `public/fonts/`, Vitest, vite-plugin-pwa, GitHub-Actions-Workflow für GitHub Pages; legt `docs/annahmen.md` an und führt `docs/changelog.md` weiter | Leere App mit 4 Tabs ist unter der GitHub-Pages-Adresse erreichbar, auf Android installierbar und startet im Flugmodus |
| 1 | Datenmodell und Speicher: Typen, Dexie-Tabellen, `konfiguration.ts`, Laden und Prüfen von `katalog.json`, Backup-Export und -Import | Export und anschließender Import ergeben identische Daten (Test); eine beschädigte Datei wird mit verständlicher Meldung abgelehnt |
| 2 | Planungsmodul (`planung.ts`) nach Abschnitt Planungslogik | Die 7 Use Cases aus „Simulation der Use Cases“ laufen als Tests mit Test-Katalog (±1 Satz je Muskel gegenüber dem Prototyp), Rauchtest mit vollem Katalog besteht; Erholungsfenster (inkl. +24 Std. bei „zu schwer“), Prioritäten und Favoriten-Bonus haben eigene Tests |
| 3 | Progressionsmodul (`progression.ts`) nach Abschnitt Progression | 12-Wochen-Tests (eigener TS-Simulator, 50 feste Startwerte) für die Frequenzen „wechselnd“, 2x, 3x und 5x: im Schnitt höchstens 0,1 Lastrückschritte, in keinem Verlauf mehr als 1, erste Laststeigerung im Schnitt spätestens in Woche 8, kein Muster Last A, B, A innerhalb von 3 Einheiten; Deckel der Volumengrenze, Erholungswoche, Pausenregeln und Max-Test-Fälligkeit getestet |
| 4 | Einstellungen: Orte und Equipment (Mockup 9), Profil, Prioritäten, Dauer, Zirkel-Anteil, Pausen, Einschränkungen, Backup; Screen Übungen | Ort mit Kurzhanteln (verstellbar und feste Paare), Bändern und Bank anlegbar; Pflichtangaben werden geprüft; eigene Übung anlegbar und im Plan nutzbar |
| 5 | Onboarding und Testtag | Neuer Nutzer kommt in unter 5 Minuten vom ersten Öffnen zur ersten Einheit; Testergebnisse setzen Musterstufen und Startvarianten |
| 6 | Heute, Vor dem Start, Vorschau mit Tausch (Mockups 1 bis 3) | Startfragen vorausgefüllt; Tausch zeigt nur Alternativen desselben Musters, die am Ort möglich sind |
| 7 | Trainings-Player: Aufwärmen, Max-Test, Satz, Pause, Supersatz, Zirkel-Modus, Unterbrechen und Fortsetzen (Mockups 4 und 5) | Ganze Einheit ohne Netz durchführbar; Bildschirm bleibt an; Ton und Vibration am Pausenende; App-Neustart mitten im Training setzt am richtigen Satz fort |
| 8 | Übungsfeedback und Abschluss (Mockups 6 und 7) mit Rückschreiben in den Trainingszustand; Bewertung der Übungen mit 1 bis 5 Sternen (Abschluss und Tab Übungen) samt Wirkung auf die Auswahl | Nächste Einheit zeigt die laut Progression erwarteten Ziele und Lasten; 1 Stern ersetzt die Hauptvariante ab der nächsten Einheit (falls Alternative am Ort), 2, 4 und 5 Sterne wirken laut „Bewertung der Übungen“ (Tests) |
| 9 | Fortschritt und Verlauf (Mockup 8) | Max-Tests, Wochenvolumen pro Muskel und Zirkel-Bestzeiten werden korrekt dargestellt; leere Zustände vorhanden |
| 10 | Feinschliff und Endabnahme | Alle Punkte unter „Abnahmekriterien Version 1“ erfüllt; Test auf einem Android-Handy in Chrome |

**Arbeitsweise für den Agent:** Keine zusätzlichen Bibliotheken außer den festgelegten. Keine Funktionen, die dieses Dokument nicht beschreibt. Ist eine Regel unklar, gilt die Regel „Entscheidungen mit dem Nutzer“ in `CLAUDE.md`: Betrifft die Unklarheit Trainingslogik, Sichtbares und Bedienung, gespeicherte Daten, neue Bibliotheken oder Kosten, fragt er den Nutzer gebündelt vor der Umsetzung und hält die Antwort in `docs/entscheidungen.md` fest. Alles andere entscheidet er selbst nach der einfachsten Auslegung, die mit den Simulationsergebnissen übereinstimmt, und notiert die Annahme in `docs/annahmen.md`.

## Quellen

- Pelland et al.: [The resistance training dose response: meta-regressions on weekly volume and frequency](https://sponet.de/sponet/Record/4097139?lng=en)
- Remmert, Pelland, Robinson, Hinson, Zourdos 2025: [Meta-regressions of the effect of per-session volume on hypertrophy and strength](https://sportrxiv.org/index.php/server/preprint/view/537)
- Schoenfeld, Grgic, Krieger 2019: Trainingsfrequenz und Hypertrophie, [Übersichtstabelle](https://pmc.ncbi.nlm.nih.gov/articles/PMC9302196/table/T1)
- Robinson et al.: [Proximity to failure, strength gain and hypertrophy: a series of meta-regressions](https://sportrxiv.org/index.php/server/preprint/download/295/699/654); [Zusammenfassung der FAU](https://www.fau.edu/newsdesk/articles/muscle-growth-strength-study)
- Halperin et al. 2022: [Accuracy in predicting repetitions to task failure](https://sportrxiv.org/index.php/server/preprint/view/67)
- Schoenfeld et al. 2017: [Low- vs. high-load resistance training](https://pubmed.ncbi.nlm.nih.gov/28834797/)
- Calatayud et al. 2015: [Bench press and push-up at comparable muscle activity](https://pubmed.ncbi.nlm.nih.gov/24983847/)
- Lopes et al. 2019: [Elastic vs. conventional resistance training](https://pmc.ncbi.nlm.nih.gov/articles/PMC6383082/)
- Singer et al. 2024: [Inter-set rest interval duration and hypertrophy](https://doaj.org/article/18363f4031e0487793db2084bee23f38)
- Zhang et al. 2025: [Superset versus traditional resistance training](https://eprints.leedsbeckett.ac.uk/id/eprint/11908)
- Morán-Navarro et al. 2017: [Time course of recovery following training to failure or not](https://pubmed.ncbi.nlm.nih.gov/28965198/)
- Coleman et al. 2024: [Effects of a one-week deload period](https://peerj.com/articles/16777)
- Spiering et al. 2021: [Minimal dose to maintain strength and endurance](https://pubmed.ncbi.nlm.nih.gov/33629972/)
- Schumann et al. 2022: [Compatibility of concurrent aerobic and strength training](https://researchonline.jcu.edu.au/71546/)
