# Abgleich: Gutachten vom 01.11.2026 mit dem Stand der App

Grundlage: `docs/gutachten_2026-11-01.md`, abgeglichen mit `docs/spezifikation.md`, `docs/katalog.json`
und dem Code (Stand Commit efb105c). Status: **entschieden am 01.11.2026**, siehe `docs/entscheidungen.md`.
Die Fragen F1 bis F12 wurden in angepasster Form gestellt (Satzende mit Blick auf saubere Technik, F3 darin aufgegangen).

## 1. Wo das Gutachten den Stand der App nicht ganz trifft

| Aussage im Gutachten | Befund in App und Katalog | Folge |
| --- | --- | --- |
| Waden hängen an Varianten, die wenig wirken (sitzend) | Alle drei Wadenübungen sind stehend und laut Anleitung mit Fersen unter Stufenniveau (Defizit), eine davon einbeinig. | Bereits erfüllt, keine Änderung. |
| Es fehlt jede Übung für die Kniebeugung | `sliding_leg_curl` und `nordic_curl` existieren (Muster Huefte, primär hintere Oberschenkel). Sie konkurrieren aber mit Kreuzheben und Hip Thrust um die zwei Hauptvarianten der Hüfte und kommen daher oft nie dran. | Lücke ist real, aber kleiner: Es fehlt kein Katalog, sondern ein eigener Platz in der Planung (F7). |
| Trizeps und Bizeps ohne Übungen in Dehnposition | Überkopf-Trizeps (`kh_trizeps_ueberkopf`) und Schrägbank-Curls (`schraegbank_curls`) sind im Katalog. Die Variantenwahl bevorzugt sie aber nicht. | Nur die Rangfolge fehlt (F7). |
| Bauch und Waden verringern das Budget der übrigen Muskeln um 20 % | Stimmt rechnerisch (`wochenziele`: Summe über alle 10 Muskeln). Durch Rundung und die persönliche Grenze 10 wirkt es beim Standard „alle normal“ ab 2 Einheiten praktisch nicht (9,5 wird zu 10); bei 1 Einheit kostet es 1 Satz je Muskel (5 statt 6). | Kleiner Effekt (F12). |
| Muskelkater-Abfrage vor dem Start und weiche Erholungsschranke fehlen | Seit 31.10.2026 wählt der Nutzer vor dem Start die Muskeln: Abwählen bei Muskelkater, nicht erholte Muskeln trotzdem wählbar. | Bereits abgedeckt, keine Änderung. |
| Mikrolasten fehlen | Bei Kurzhanteln im Modus „feste Paare“ kann jede vorhandene Last eingetragen werden (z. B. 17 kg mit Manschetten). Im Modus „verstellbar“ nur das feste Raster. | Teilweise möglich, keine Änderung nötig. |

Alle übrigen Befunde des Gutachtens habe ich im Code bestätigt, insbesondere: Ziel für alle Sätze mit
Zähler vorbelegt (Daten meist beim Ziel abgeschnitten), Reserve 4/2/1 aus drei Kategorien, Leistung bei
Körpergewicht als Wiederholungen des ersten Satzes (1 Wdh. = 10 % bei 10 Wdh.), +2 nach 4 guten Wochen
ohne Fortschrittsbezug, Testtag-Startziel 70 % (Reserve 0 bis 6), Erholungswoche ohne Reservezuschlag,
Anstrengungsauslöser fest bei 4,5 von 5.

## 2. Empfehlungen und Einordnung

Spalte „Frage“: Entscheidung des Nutzers nötig (Trainingslogik oder Bedienung). „Selbst“: technische
Umsetzung, die ich ohne Frage erledige.

| Prio | Empfehlung des Gutachtens | Einordnung | Frage |
| --- | --- | --- | --- |
| 1 | Letzter Satz als Messsatz mit fester Reserve | Sinnvoll, Grundlage für alle anderen Regeln | F1 |
| 1 | Reserve als Zahl statt 3 Kategorien | Sinnvoll; berührt den Wunsch vom 29.10.2026 (alles am Ende) | F2 |
| 1 | Ziel-Reserve Standard 1 bis 2 | Vertretbar, geringer Aufwand | F3 |
| 1 | Ein Leistungsmaß für alle Lasttypen, Trend über 4 Wochen | Sinnvoll, wird mit Rauschsimulation abgesichert | F5 |
| 1 | Testtag: Startziel Maximum minus 3 | Sinnvoll, betrifft aber nur neue Testtage und nachgeholte Tests | F6 |
| 2 | Volumengrenze fortschrittsgesteuert | Sinnvoll | F4 |
| 2 | Eigener Platz für Beinbeuger, Vorrang für Dehnposition | Sinnvoll | F7 |
| 2 | Faktor je Übung und Muskel (0,25 bis 0,75), Pflichtminimum direkter Sätze | Dünne Datenlage (je 1 Studie), viele neue Zahlen; eher nicht | F7 |
| 2 | Arme bei 1 bis 2 Einheiten zusätzlich | Sinnvoll, Preis ca. 3 bis 5 Min. | F8 |
| 2 | Erholungszuschläge (neue Übung, Beine) | Neue Übung sinnvoll, Beine fraglich | F9 |
| 2 | Erholungswoche +1 Reserve, Anstrengung relativ, Rückkehr nach Pause leistungsgesteuert | Sinnvoll, wenig Aufwand | F10 |
| 2 | Wöchentliche Fragen zum Befinden | Mehr Aufwand für den Nutzer jede Woche | F10 |
| 2 | Ausdauerminuten, Körpermaße | Neue Bereiche, eigenes Paket | F11 |
| 3 | Zwischenstufen bei Körpergewicht, Mischlast beim Hantelsprung | Zwischenstufen sinnvoll, Mischlast aufwendig | F12 |
| 3 | Rechenschärfen: Gewichtssumme, Zeitfaktor einseitig, Einhaltungsquote | Erste zwei sinnvoll, dritte zweischneidig | F12 |
| 3 | Rauschmodell in der 12-Wochen-Simulation, Kennzahlen Fehlalarme | Sinnvoll, reine Testtechnik | Selbst |
| 3 | Persönlicher Teiler k, Ermüdung je Variante lernen | Erst sinnvoll nach ca. 12 Wochen Daten mit Messsatz | später |

## 3. Nicht empfohlen (mit Grund)

| Empfehlung | Grund |
| --- | --- |
| Obergrenze 24 für „Erfahren“ | Widerspricht dem Ziel „Ergebnis pro Minute“; das Gutachten nennt es selbst optional. |
| Session-Anstrengung 30 Min. nach dem Training auf Skala 0 bis 10 | Eine Web-App ohne Server kann nicht zuverlässig 30 Min. später fragen; die Skala 1 bis 5 bleibt, der Auslöser wird relativ (F10). |
| Reserve-Check alle 4 bis 6 Wochen (stoppen, schätzen, weiter bis Versagen) | Bei Messsatz bis Reserve 0 in der Isolation (F1) entsteht die Kalibrierung ohnehin; ein eigener Check wäre zusätzliche Bedienung. |
| Schulter in vordere, seitliche, hintere aufteilen | Neues Muskelmodell mit Folgen für Prioritäten, Ziele, Verlauf und gespeicherte Daten; Vorrang für Seitheben (F7) erreicht das Wesentliche. |
| Gelenkschmerz je Übung erfassen | 1 Stern ersetzt eine Übung bereits ab der nächsten Einheit, Ausschluss sperrt sie ganz. |
| Zirkel-Station nur mit höchstens 3 Reserve zählen | Im Zirkel nicht messbar; Zirkel zählen bereits nur 0,5. |
| Ziel „Kraft“: Testvariante A, A, B | Nur relevant, wenn „Kraft“ als Ziel gewählt ist; bei Bedarf eigener Auftrag. |
| Schnellkraft- und Beweglichkeitsmodul | Optional laut Gutachten, kein Bezug zu einem Problem der App. |

## 4. Umsetzungsplan nach den Entscheidungen vom 01.11.2026

**Schritt 1: Messung und Auswertung** (umgesetzt am 01.11.2026)
1. Letzter Satz als Messsatz („sauberes Limit“): Grundübungen Schluss bei 2 sauberen Wiederholungen übrig, Isolation bis zur letzten sauberen; Zähler ohne Deckel beim Ziel.
2. Reserve direkt nach dem letzten Satz (0 bis 5+, „Technik wurde unsauber“); Feedback am Ende entfällt und wird daraus abgeleitet.
3. Kraftschätzung und Ziel aus dem Messsatz mit seiner eigenen Reserve.
4. Ein Leistungsmaß für alle Lasttypen (Kapazität = Wiederholungen + Reserve), Entscheidung über den Verlauf von 4 Wochen.
5. Volumengrenze: +2 nur bei Stillstand mit guter Erholung, −2 bei fallendem Verlauf oder hoher Anstrengung.
6. Simulation mit realistischen Schätzfehlern; Kennzahl Fehlalarme.

**Schritt 2: Abdeckung, Erholung, Feinschliff**
1. Bewegung „Beinbeuger“ (Sliding Leg Curls, Nordic Curls, Band-Beincurls) mit Datenbank-Migration der gespeicherten Hauptvarianten; Hip Thrust und Brücken zählen für hintere Oberschenkel 0,25.
2. Vorrang für Übungen mit Last in der Dehnung (Überkopf-Trizeps, Schrägbank-Curls, Seitheben).
3. Arme bei 1 bis 2 Einheiten zusätzlich zum Zeitbudget.
4. Erholungswoche mit 1 Wdh. mehr Reserve, Anstrengung relativ zum eigenen Schnitt, Rückkehr nach Pause leistungsgesteuert.
5. Zwischenstufen bei Körpergewicht, Wochenbudget ohne Bauch und Waden in der Gewichtssumme, einseitige Übungen mit doppelter Zeit.
6. Ziel „Kraft“: Hauptvariante A, A, B und schwere Sätze (nur bei gewähltem Ziel).
