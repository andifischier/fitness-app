# Changelog

## 20.10.2026: Klarstellungen eingearbeitet
- **Was:** `klarstellungen.md`, `katalog.json` und `progression_prototyp.py` aus dem Hauptordner nach
  `docs/` verschoben (Katalog Schema 2 und angeglichener Prototyp ersetzen die alten Dateien).
  Alle 47 Klarstellungen in `docs/spezifikation.md` eingearbeitet; Ersatz-Tabelle in
  `docs/uebungskatalog.md` korrigiert. Mockups auf `1-heute.png` bis `9-equipment.png` umbenannt.
  `CLAUDE.md`: Rangfolge Spezifikation, Mockups, Prototypen; neuer Abschnitt „Entscheidungen mit
  dem Nutzer“. Neu: `docs/entscheidungen.md`, `docs/changelog.md`.
- **Warum:** Der Probelauf hat Widersprüche zwischen Spezifikation, Mockups und Prototypen gezeigt;
  die Spezifikation soll wieder allein verbindlich sein. Kein App-Code geändert.

## 20.10.2026: Offene Punkte entschieden
- **Was:** Zehn Entscheidungen des Nutzers in `docs/entscheidungen.md` festgehalten und in
  `docs/spezifikation.md` eingearbeitet: Bauch und Waden als eigene Übungen zusätzlich zum
  Zeitbudget (Paare nur mit Beinen oder Waden), Mobility nur anzeigen, Bereich bis O + 5 bei
  fehlender Last, Tempo-Zwischenstufe ab 2 Stufen, Muster ohne Equipment entfällt mit Hinweis,
  kein Ersatz bei Sperren, `MusterZustand.letzterTest` entfällt, Lastanzeige nach neuem
  Katalogfeld `anzahlGewichte`. Katalog um `anzahlGewichte` ergänzt (33 Übungen), Prototyp nur
  umbenannt (Ergebnisse unverändert).
- **Warum:** Diese Punkte waren nach dem Einarbeiten der Klarstellungen offen oder widersprüchlich.

## Paket 0: Projektgerüst und Veröffentlichung (20.10.2026)
- **Was:** Projekt mit Vite, React 18, TypeScript (strict), Tailwind (Tokens aus „Gestaltung“ als
  Theme), React Router (Hash-Routing) und Vitest eingerichtet. Schrift Manrope (400, 600, 700, 800)
  unter `public/fonts/`. Leere App mit 4 Tabs (Heute, Fortschritt, Übungen, Einstellungen) und
  Tab-Leiste wie in Mockup 1. PWA mit vite-plugin-pwa: Name „Fitness“, Hantel-Icon in der
  Akzentfarbe, alle Dateien offline im Cache. Workflow `.github/workflows/deploy.yml` testet, baut
  und veröffentlicht bei jedem Push auf `main` auf GitHub Pages. Test für den App-Rahmen.
  Neu: `docs/annahmen.md`; zwei Entscheidungen (leere Tabs, Icon) in `docs/entscheidungen.md`.
- **Warum:** Arbeitspaket 0 der Spezifikation; Grundlage für alle weiteren Pakete.

## Paket 1: Datenmodell und Speicher (20.10.2026)
- **Was:** Alle Typen der Spezifikation in `src/logik/typen.ts`; alle Zahlenwerte in
  `src/konfiguration.ts` (inklusive Standard-Einstellungen). Datenbank `fitness` (Version 1) mit
  den 12 Tabellen der Spezifikation (`src/daten/db.ts`), Speicherschutz beim Start.
  `katalog.json` wird beim Start mit zod geprüft (`src/daten/katalog.ts`, `schemas.ts`).
  Backup: Export als `fitness-backup-JJJJ-MM-TT.json`, Prüfung mit Zusammenfassung und Import, der
  alle Daten in einem Schritt ersetzt; beschädigte Dateien werden mit Meldung samt Fundstelle
  abgelehnt (`src/daten/backup.ts`). Tests für Katalog, Konfiguration und Backup (mit
  fake-indexeddb). Zwei Entscheidungen in `docs/entscheidungen.md`, Spezifikation (Schnittstelle
  Backup, Tests) und `CLAUDE.md` (Testhilfe) angepasst. Noch keine sichtbare Änderung in der App.
- **Warum:** Arbeitspaket 1 der Spezifikation; Grundlage für Planung, Progression und alle Screens.

## Paket 2: Planungsmodul (20.10.2026)
- **Was:** `src/logik/planung.ts` mit `startfragen`, `erstelleEinheit`, `alternativen` und `tausche` nach
  Abschnitt Planungslogik: Wochenziel pro Muskel, Zeitbudget, Erholungsfenster, Fokus-Einheiten,
  Pacing, gierige Übungswahl, Bauch und Waden zusätzlich, Supersatz-Paare, Hauptvarianten mit
  Ersatzregeln, Sperren, Aufwärmen, Zirkel-Einheiten und Zirkel-Vorschlag. Dazu
  `src/logik/datum.ts` und `src/logik/equipment.ts` (Lastraster, Sperren). Tests: die 7 Use Cases mit
  Test-Katalog (je Muskel höchstens 1 Satz neben dem Prototyp), Rauchtest mit vollem Katalog sowie
  Erholung, Prioritäten, Favoriten-Bonus, Ersatz, Sperren, Ortswechsel, Tausch und Zirkel.
  Entscheidung „beide Hauptvarianten in einer Einheit“ in `docs/entscheidungen.md`; Spezifikation
  (Schritt 6, Schnittstelle `startfragen`) angepasst. Noch keine sichtbare Änderung in der App.
- **Warum:** Arbeitspaket 2 der Spezifikation; Grundlage für Heute, Vor dem Start und Vorschau.

## Paket 3: Progressionsmodul (20.10.2026)
- **Was:** `src/logik/progression.ts` mit `werteUebungAus` (doppelte Progression am ersten Satz,
  Kraftschätzung, Eingewöhnung, Bandstufen, Halteübungen, Variantenwechsel mit Zwischenstufe, „wenn die
  Last ausgeht“), `schliesseEinheitAb` (Varianten, Hauptvarianten, Max-Tests, Muskeln, Woche,
  Zirkel-Ergebnis, Zyklus), `neueRekorde`, `wochenabschluss` (Leistung je Muskel, persönliche
  Volumengrenze mit Deckel, Zyklusende, neue Nebenübungen), `offeneWochenabschluesse`,
  `erholungswocheAngebot`, `maxTestFaellig`, `naechsteLast`. Neu `src/logik/verlauf.ts` (gemeinsame
  Hilfen). Planung ergänzt: Max-Test am Anfang der Einheit, Erholungswoche 50 %, Trainingspause
  (Wochenziel 70 %, erste Einheit je Muster leichter), Tempo-Hinweis. Neue optionale Felder
  `langsam` und `Woche.ausgewertet`. Tests: 12-Wochen-Simulator (mulberry32, 50 Startwerte, 4
  Frequenzen) sowie Einzeltests für alle Regeln. Vier Entscheidungen in `docs/entscheidungen.md`,
  Spezifikation angepasst. Noch keine sichtbare Änderung in der App.
- **Warum:** Arbeitspaket 3 der Spezifikation; Grundlage für Feedback, Abschluss und Fortschritt.

## Paket 4: Einstellungen und Übungen (20.10.2026)
- **Was:** Tab Einstellungen mit Unterseiten: Orte und Equipment nach Mockup 9 (Utensilien abhaken,
  Hantelbank keine/flach/verstellbar, Details für Kurzhanteln verstellbar oder feste Paare, Bänder,
  Kettlebells, Langhantel; Pflichtangaben werden vor dem Speichern geprüft; Zahl der möglichen
  Übungen; Hinweis „Für … fehlt Equipment“; eigene Utensilien; Standardort; Löschen nur, solange nie
  genutzt), Profil (Ziele, Level, übliche Einheiten, Ziel-Reserve), Muskelprioritäten, Dauer/Zirkel/
  Pausen (30 bis 180 Sek.), Einschränkungen mit optionalem Enddatum, Backup speichern und einlesen
  mit Bestätigung. Tab Übungen: Suche, Filter nach Muster und Ort, Favorit, Ausschluss, eigener
  Video-Link, eigene Übung aus einer Vorlage anlegen, bearbeiten und löschen. Neue Logik in
  `src/logik/einstellungen.ts`, Speichern in `src/daten/speichern.ts`, jeweils mit Tests. Neues
  optionales Feld `Einstellungen.videoLinks`. Drei Entscheidungen in `docs/entscheidungen.md`,
  Spezifikation angepasst.
- **Warum:** Arbeitspaket 4 der Spezifikation; Grundlage für Onboarding (Paket 5) und die
  Trainingsscreens.

## Paket 5: Onboarding und Testtag (20.10.2026)
- **Was:** Beim ersten Start führt Heute direkt ins Onboarding (Vollbild, 5 Schritte, alles
  vorausgefüllt): Ziele und Level; übliche Einheiten, Dauer und Muskelprioritäten; erster Ort mit
  Equipment; optionale Einschränkungen (Hinweis auf Favoriten und Ausschlüsse im Tab Übungen);
  Testtag oder Überspringen. Testtag: Aufwärmen als Checkliste, dann Liegestütz, Klimmzug (bei 0:
  Hängen mit Stoppuhr), Kniebeuge und Plank mit Zähler bzw. Stoppuhr; Tests, die am Ort nicht gehen,
  entfallen. Die Ergebnisse setzen Musterstufe, Startvariante (als Hauptvariante A) und Startziel
  (70 %) und werden als Max-Tests gespeichert. Neue Logik `src/logik/testtag.ts` mit Tests;
  `schliesseEinheitAb` lässt die Woche beim Testtag unverändert und speichert Max-Tests in der
  Einheit der Übung. Drei Entscheidungen in `docs/entscheidungen.md`, Spezifikation angepasst.
- **Warum:** Arbeitspaket 5 der Spezifikation.

## Paket 6: Heute, Vor dem Start, Vorschau mit Tausch (21.10.2026)
- **Was:** Heute nach Mockup 1: Datum, nächste Einheit als Vorschau (Ort, Fokus, Dauer, Muskelgruppen),
  „Training starten“, Wochenfortschritt pro Muskel, Wochenzahl mit „ändern“, nächster Max-Test;
  Zustände Erholungswoche (Hinweisband), Ruhetag empfohlen („Trotzdem trainieren“, „Zirkel“,
  „Mobility“ als Checkliste ohne Speichern), erstellte Einheit („Vorschau öffnen“, „Neu erstellen“),
  unterbrochene Einheit („Fortsetzen“), Backup-Erinnerung. Vor dem Start nach Mockup 2: Wochenfrage
  (erste Einheit der Woche bzw. nach längerer Pause), Angebot einer Erholungswoche, Ort, „Morgen wieder
  trainieren?“, „15 Min länger?“, „Einheit erstellen“, „Stattdessen Zirkel“ mit den 5 Zirkeln samt
  Dauer und Bestzeit am Ort bzw. „Doch Krafteinheit“. Vorschau nach Mockup 3 mit Aufwärmen,
  Supersätzen, Zielen, Lasten und Tausch-Blatt (nur Alternativen desselben Musters am Ort).
  Wochenabschluss läuft beim Öffnen der App. Neue Logik `src/logik/heute.ts`, neue
  Speicherfunktionen, jeweils mit Tests. Drei Entscheidungen in `docs/entscheidungen.md`,
  Spezifikation angepasst.
- **Warum:** Arbeitspaket 6 der Spezifikation; „Los geht's“ führt vorerst auf einen Platzhalter, den
  Trainings-Player baut Paket 7.

## Paket 7: Trainings-Player (21.10.2026)
- **Was:** Training Schritt für Schritt nach Mockup 4 und 5: Aufwärmen als Checkliste, Max-Test mit
  Zähler bzw. Stoppuhr, Satz-Bildschirm mit Ziel und Bereich im ersten Satz, Vorgabe ab Satz 2, Last,
  Hinweis zur Reserve, Zähler, „Letztes Mal“ und Video-Link; Pause mit Timer-Ring, „+30 Sek.“,
  Überspringen, „Als Nächstes“, Ton und Vibration am Ende; Supersätze (A1, A2, dann Pause);
  Zirkel-Modus mit laufender Stoppuhr, Runden und „Weiter“; Bildschirm bleibt an. Jeder Satz wird
  sofort gespeichert, ein Neustart setzt am richtigen Satz fort; das Kreuz bietet „Weiter
  trainieren“, „Später fortsetzen“ und „Training beenden“ (erledigte Sätze bleiben). Kalibrierungssatz
  mit Gewichtswahl bei neuen Last-Übungen. Bis Paket 8 endet das Training mit einer kurzen
  Zusammenfassung. Neue Logik `src/logik/player.ts`, Speicherfunktionen, jeweils mit Tests;
  `werteUebungAus` misst nach einer Kalibrierung am zweiten Satz; ein abgebrochener Zirkel zählt nur
  erledigte Runden.
- **Bewertung der Übungen:** Auf Wunsch des Nutzers sind 1 bis 5 Sterne je Übung in Spezifikation und
  Entscheidungen festgelegt (umgesetzt mit Paket 8).
- **Warum:** Arbeitspaket 7 der Spezifikation; Wunsch des Nutzers nach einer Bewertung der Übungen.


## Paket 8: Übungsfeedback, Abschluss und Bewertung der Übungen (21.10.2026)
- **Was:** Übungsfeedback nach Mockup 6: nach dem letzten Satz einer Übung (im Supersatz nach dem Paar)
  „Wie war die Übung?“ mit den geschafften Wiederholungen, drei Buttons mit Definition (Halteübungen
  in Sekunden), Vorauswahl „zu schwer“ bei verfehltem ersten Satz und Folgetext „Nächstes Mal: 16 kg je
  Hand, Ziel 11 im ersten Satz.“ (auch Laststeigerung, langsames Absenken und Wechsel zur nächsten
  Variante). Das Feedback wird sofort gespeichert und fließt über `schliesseEinheitAb` in die nächste
  Einheit. Abschluss nach Mockup 7: Minuten, Sätze, Rekorde mit bestem Satz, Gesamtanstrengung 1 bis 5
  (freiwillig), Sterne je Übung (vorausgefüllt mit der letzten Bewertung), Notiz, optional Abkühlen,
  „Speichern“. Bewertung der Übungen: 1 Stern ersetzt die Hauptvariante ab der nächsten Einheit (falls
  eine Alternative mit höchstens 1 Stufe Abstand und mindestens 2 Sternen am Ort möglich ist), 2 Sterne
  Abschlag, 4 und 5 Sterne Zuschlag und Vorrang, Zyklusbeginn berücksichtigt Sterne; im Tab Übungen auf
  der Übungsseite änderbar und in der Liste sichtbar. Neues optionales Feld `Einstellungen.bewertungen`
  (keine neue Datenbankversion nötig). Neue Logik in `player.ts` (`offeneFeedbacks`, `setzeFeedback`,
  `feedbackVorschlag`), `progression.ts` (`vorschauNaechstesMal`, `uebernimmBewertungen`) und
  `planung.ts` (`ohneEinStern`, Sterne in Rangfolge und Übungswahl), Speichern mit `speichereAbschluss`
  und `speichereBewertung`; Tests für alle Regeln, darunter „nächste Einheit zeigt die angekündigten
  Ziele und Lasten“. Vier Entscheidungen in `docs/entscheidungen.md`, Spezifikation angepasst.
- **Warum:** Arbeitspaket 8 der Spezifikation; Wunsch des Nutzers nach einer Bewertung der Übungen.

## Paket 9: Fortschritt und Verlauf (21.10.2026)
- **Was:** Tab Fortschritt nach Mockup 8 mit Unterreitern Übersicht und Verlauf. Übersicht: Max-Test-Verlauf
  als Liniendiagramm mit Chips für alle getesteten Muster (Plank in Sekunden) und „+3 seit Start“; Sätze pro
  Woche für alle Muskeln untereinander über 6 Wochen mit Ziel und Hinweis „zählt als Entlastung“; Karte
  Zirkel-Bestzeiten (Zirkel, Ort, Bestzeit, Datum, eine Zeile je Übungsauswahl). Verlauf: alle Einheiten,
  Tipp zeigt Datum, Ort, Dauer, Übungen mit Sätzen, Last und Feedback, Gesamtanstrengung und Notiz. Leere
  Zustände vorhanden. Neue Logik `src/logik/fortschritt.ts`, die 60-%-Regel als gemeinsame Funktion
  `istEntlastung` in `progression.ts` (Verhalten des Erholungswochen-Angebots unverändert), Texthilfen in
  `texte.ts`, jeweils mit Tests. Drei Entscheidungen in `docs/entscheidungen.md`, Spezifikation angepasst.
- **Warum:** Arbeitspaket 9 der Spezifikation.

## Paket 10: Feinschliff und Endabnahme (21.10.2026)
- **Was:** Endabnahme als automatischer Test (`src/daten/abnahme.test.ts`): 12 Wochen im echten Ablauf der App
  (Testtag, Startfragen, Einheit, jeder Satz, Feedback, Abschluss, Wochenabschluss, Backup) prüfen Wochenfrage,
  Erholungsfenster, Fokus-Einheiten an Folgetagen, Max-Tests, Zirkel und Bestzeiten je Ort, Ortswechsel, Tausch,
  Wirkung des Feedbacks, Erholungswochen und Export/Import. Zusätzlich ein Durchlauf im Browser (Handygröße):
  Onboarding, Testtag, Krafteinheit mit Kalibrierung und Supersatz, Zirkel, Fortschritt, Backup, Flugmodus.
  Gefunden und behoben: Zirkel-Stationen beachten jetzt die bevorzugte Übung aus dem Katalog (z. B. Burpees);
  eine leere Einheit, weil kein Muskel erholt ist, nennt den richtigen Grund; Einstellungen zeigen „Zirkel alle
  2 Wochen“ statt „alle 2 wochen“. Drei Entscheidungen in `docs/entscheidungen.md`, Spezifikation angepasst
  (Ruhetag, Erholungsfenster, Zirkel-Stationen).
- **Warum:** Arbeitspaket 10 der Spezifikation; letzte Prüfung vor Version 1.

## Kombi oder Klassisch (21.10.2026)
- **Was:** Auf „Vor dem Start“ neue Frage „Wie trainierst du heute?“ mit Kombi (vorbelegt) oder Klassisch. Kombi bildet
  Runden aus 2 bis 3 Übungen ohne gemeinsamen Hauptmuskel (Bauch und Waden mit allem kombinierbar): je ein Satz jeder
  Übung, dann Pause. Klassisch: alle Sätze einer Übung, dann die nächste. Der feste Supersatz-Anteil je Wochenprognose und
  die festen Supersatz-Paare entfallen; das Wochenziel rechnet mit Kombi (bei 3 Einheiten Beine 10 statt 9 Sätze).
  Anzeige „Kombi A · Übung 1 von 3“, Pausen-Einstellung „Kombi (nach jeder Runde)“. Use-Case-Werte mit dem Prototyp neu
  berechnet; Tests für Rundenbildung, Klassisch, Bauch mit Oberkörper und Dreier-Runden im Player. Vier Entscheidungen in
  `docs/entscheidungen.md`, Spezifikation angepasst. Keine neue Datenbankversion.
- **Warum:** Wunsch des Nutzers: zeiteffizientes Training zu Hause, Kombi als Standard.

## Heute mit Übungsliste, Wochenausblick, Kurzanleitungen und Videos (21.10.2026)
- **Was:** Heute zeigt unter „Training starten“ alle Übungen der nächsten Einheit (Sätze, Ziel, Last). „Diese Woche“
  ist jetzt ein Wochenausblick: Trainingstage wählen (ersetzt „Wie oft schaffst du es diese Woche?“, auch auf „Vor dem
  Start“), danach je Tag die voraussichtliche Einheit mit allen Übungen. Prognose und „Morgen wieder?“ folgen den Tagen.
  Der Fortschritt pro Muskel steht als Karte „Diese Woche“ im Tab Fortschritt. Neu „So geht's“ im Training, beim
  Testtag und in der Übungsansicht: Kurzanleitung für alle 98 Übungen, eingebettetes YouTube-Video für 10 Übungen.
  Onboarding: Seiten lesen beim Öffnen zusätzlich direkt aus der Datenbank, damit keine Seite leer bleibt.
  Neue Tests für Ausblick, Tage, Video-Links und Katalog.
- **Warum:** Wünsche des Nutzers (drei Entscheidungen in `docs/entscheidungen.md`), Fehlerbericht zum Onboarding.

## Wochen-Backup (21.10.2026)
- **Was:** Heute schlägt jede Woche ein Backup vor (statt alle 4 Wochen). „In Drive sichern“ öffnet das Teilen-Menü mit
  der Backup-Datei, „Auf dem Handy speichern“ legt sie in den Download-Ordner. Als gesichert gilt es erst nach Erfolg.
  Die Backup-Seite bietet dieselben Wege; Einlesen nimmt jetzt auch .txt. Tests für Erinnerung und `merkeBackup`.
- **Warum:** Wunsch des Nutzers nach regelmäßigem Backup außerhalb des Browsers.

## Videos für alle Übungen, eigene Workouts, Anpassen und Tauschen überall (21.10.2026)
- **Was:** Jede der 98 Katalogübungen hat jetzt ein eingebettetes Video unter „So geht's“ (88 neue, nach bester Qualität
  gewählt, meist englisch). Neu „Meine Workouts“ im Tab Übungen: eigene Workouts als Übungsliste (Sätze je Übung, Ziel und
  Gewicht wie gewohnt) oder Zirkel (Runden, Vorgabe je Station, Bestzeit) anlegen, bearbeiten, ersetzen mit Vorschlägen
  derselben Art, sortieren und löschen; gestartet über „Vor dem Start“, „Eigenes Workout“. Vorschau mit „Anpassen“: Sätze
  ändern, Übungen entfernen und hinzufügen. „Tauschen“ zusätzlich auf Heute (erstellte Einheit) und im Training bis zum
  ersten Satz einer Übung. Neue optionale Felder `Einstellungen.workouts` und `Einheit.name` (keine neue Datenbankversion,
  Backup-Schema ergänzt). Neue Logik `src/logik/workouts.ts` und `src/logik/anpassen.ts`, `planung.ts` mit
  `workoutEinheit` und `kannTauschen`; Tests für Workouts, Anpassen, Tausch im Training, Speichern, Backup und Katalog.
  Vier Entscheidungen in `docs/entscheidungen.md`, Spezifikation angepasst.
- **Warum:** Wünsche des Nutzers: Videos für alle Übungen, eigene Workouts, bestehende bearbeiten und Übungen einfach ersetzen.

## Usability-Prüfung und acht Verbesserungen (21.10.2026)
- **Was:** Gesamte App im Handyformat durchgespielt (Onboarding, Testtag, Krafteinheit mit Kombi, Fortschritt, Übungen,
  Einstellungen). Daraus acht Vorschläge, alle vom Nutzer gewählt und umgesetzt:
  1. Gewicht in jedem Satz mit −/+ änderbar, gilt für die folgenden Sätze; anderes Gewicht im ersten Satz ⇒ nächstes Ziel
     aus der Kraftschätzung bei diesem Gewicht (`player.ts`: `satzLast`, `lastWaehlbar`; `progression.ts`).
  2. „Letzten Satz rückgängig“ in der Pause; auf „Wie war die Übung?“ lassen sich alle Zahlen antippen und korrigieren
     (`korrigiereSatz`), bei wechselndem Gewicht steht darunter das Gewicht je Satz.
  3. Ergebnisbildschirm nach dem Testtag mit Ergebnis, Startübung und Startziel je Test (`testtagErgebnisse`).
  4. Heute zeigt nach dem Training (auch nach dem Testtag) „Heute erledigt“ mit Dauer, Sätzen und nächstem Trainingstag;
     „Trotzdem trainieren“ klein darunter (`heuteErledigt`).
  5. Vorschau, Heute und Wochenausblick zeigen bei neuen Übungen mit Last „Gewicht wählst du im 1. Satz“ statt der
     kleinsten Last; der Aufwärmsatz nennt die Übung.
  6. Kopfzeile im Training nur noch Zeit und Fortschritt („Übung x von y“ entfällt, im Zirkel bleibt die Runde).
  7. Fortschritt: „Diese Woche“ und „Sätze pro Woche“ zu „Sätze pro Muskel“ zusammengelegt, Balken am Ziel gemessen,
     Wochensäulen erst ab der zweiten Woche.
  8. Übungsansicht mit „Dein Verlauf“: letzte 5 Einheiten und nächstes Ziel (`uebungVerlauf`, `saetzeMitLast`).
  Neue Tests für alle neuen Funktionen. Acht Entscheidungen in `docs/entscheidungen.md`, Spezifikation angepasst. Keine
  neue Datenbankversion.
- **Warum:** Wunsch des Nutzers nach einer gesamtheitlichen Prüfung von Bedienung und Funktion.
