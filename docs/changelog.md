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
