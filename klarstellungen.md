# Klarstellungen zur Spezifikation (verbindlich)

Stand 20.10.2026. Beantwortet alle Punkte aus dem Probelauf. Diese Datei hat Vorrang vor
`docs/spezifikation.md`, den Mockups und den Prototypen, bis ihr Inhalt in die Spezifikation
eingearbeitet ist.

## Grundsatz

- Rangfolge: diese Klarstellungen, dann `docs/spezifikation.md`, dann Mockups, dann Prototypen.
- Die Prototypen sind Illustrationen und Quelle für Testszenarien, nicht für Regeln. Wo ein Prototyp
  von der Spezifikation abweicht, gilt die Spezifikation. `docs/progression_prototyp.py` ist auf
  die Regeln unten angeglichen (Ergebnis unverändert: 0 Lastrückschritte über 50 Zufallsverläufe).
- Mockups zeigen Aufbau und Stil. Texte, Zahlen und Beispielübungen darin sind Beispieldaten.

## A. Spezifikation gegen Mockups

1. **Ziel ist eine einzelne Zahl** (`zielWdh: number`) und gilt für den ersten Satz. Die UI zeigt
   „Ziel 10“, darunter klein „Bereich 8 bis 12“. Folgesätze zeigen „Vorgabe 9“ = geschaffte
   Wiederholungen des vorherigen Satzes. Bereiche wie „8 bis 10“ in Mockups 3 bis 5 sind falsch.
2. **Mockup 6:** Der Folgetext lautet nach dem Muster „Nächstes Mal: 16 kg, Ziel 11 im ersten Satz“.
   „Ziel in allen Sätzen“ gibt es nicht.
3. **Supersatz-Reihenfolge:** A1 Satz 1, A2 Satz 1, Pause, A1 Satz 2, A2 Satz 2, Pause usw.
   „Als Nächstes“ nach A1 ist immer A2. Pause nur nach dem Paar.
4. **Satzzahl in der Vorschau** = alle Sätze inklusive Partnersätze. Partnerübungen (Bauch, Waden)
   stehen im Block der zugehörigen Oberkörperübung; der Block wird damit zum Supersatz. Der
   Block-Typ `partner` entfällt.
5. Übungsnamen und Bereiche in Mockups sind Beispiele; maßgeblich ist der Katalog.
6. **Mockup 9, Bank:** Katalog behält BANK und SCHRAEG. Die UI zeigt eine Zeile „Hantelbank“
   mit Auswahl „keine / flach / verstellbar“, die auf BANK bzw. SCHRAEG abbildet.
   **Immer vorhandene Utensilien** (TISCH, ERH) sind standardmäßig an und abwählbar.
   **„X Übungen an diesem Ort möglich“** bleibt: Anzahl der Katalog- und eigenen Übungen, deren
   Equipment-Anforderung am Ort erfüllt ist, ohne Ausschlüsse.
7. **Mockup 8:** Zirkel-Bestzeiten sind Pflicht (eigene Karte: Zirkel, Ort, Bestzeit, Datum).
   Max-Test-Chips zeigen alle getesteten Muster inklusive Plank (Sekunden).
   Hinweis „zählt als Entlastung“ erscheint bei Wochen unter 60 % des üblichen Volumens (D8).
8. **„Stattdessen Zirkel“** ist ein zweiter, schlichter Button unter „Einheit erstellen“ auf
   „Vor dem Start“. Er öffnet die Liste der 5 Zirkel mit Dauer und Bestzeit am gewählten Ort.
9. **Heute-Vorschau:** `erstelleEinheit` wird mit den Vorschlägen aus `startfragen` aufgerufen,
   nur zur Anzeige und ohne zu speichern. Angezeigt als „voraussichtlich: Ganzkörper, ca. 40 Min“.
   Nach den Startfragen wird neu erzeugt.
10. **Mockup-Dateien** im Repository umbenennen auf `1-heute.png`, `2-start.png`,
    `3-vorschau.png`, `4-satz.png`, `5-pause.png`, `6-feedback.png`, `7-abschluss.png`,
    `8-fortschritt.png`, `9-equipment.png`.
11. **Lastanzeige:** Kurzhanteln „16 kg je Hand“; Kettlebell „16 kg“; Langhantel „40 kg gesamt“;
    Klimmzug mit Zusatzgewicht „+8 kg“; Band „Band schwer“; unterstützendes Band
    „Unterstützung: Band mittel“; Körpergewicht ohne Lastangabe.

## B. Spezifikation gegen Prototypen

12. **„Zu schwer“** wird am ersten Satz gemessen (erster Satz < Ziel ⇒ vorausgewählt; der Nutzer
    kann umstellen). „Deutlich verfehlt“ heißt: erster Satz < Untergrenze − 2.
13. **Eingewöhnung** (zu schwer in den ersten 2 Einheiten nach Laststeigerung, erster Satz
    ≥ Untergrenze − 2): Last halten, Ziel = max(Untergrenze − 1, geschaffte Wdh. im ersten Satz).
14. **Nach Laststeigerung:** Ziel = geschätzte Wdh. bei Reserve 1, begrenzt auf
    [Untergrenze − 1, Obergrenze].
15. **Schwellen aus dem Bereich der Übung** (`bereich.von` = U, `bereich.bis` = O):
    „über 12“ ⇒ über O; „mindestens 8“ ⇒ mindestens U; „mindestens 7“ ⇒ U − 1; „unter 6“ ⇒
    unter U − 2; „Bereich bis 15 dehnen“ ⇒ bis O + 3. Körpergewicht und Band: Variantenwechsel,
    sobald der erste Satz O erreicht (statt fest 15), neues Ziel = U der neuen Variante.
16. **Volumengrenze, Deckel „höchstens 4 über dem besten Wochenvolumen der letzten 4 Wochen“:**
    gilt laut Spezifikation; eigener Unit-Test, nicht Teil der 12-Wochen-Simulation.
17. **Leistung pro Muskel:** Pro Hauptvariante ein Leistungswert: e1RM bei Last, Wdh. des ersten
    Satzes bei KG und Band, Sekunden bei Zeit. Relative Veränderung je Variante gegenüber dem
    2-Wochen-Mittel davor. Muskel-Leistung = Mittel dieser Veränderungen über alle Hauptvarianten,
    in denen der Muskel primär ist. Varianten, die in der Woche gewechselt wurden, zählen nicht.
18. **+24 Std. bei „zu schwer“ und Favoriten-Bonus +0,2** gelten laut Spezifikation; eigene
    Unit-Tests.
19. **Use-Case-Tests** laufen mit einem Test-Katalog aus diesen 14 Katalog-IDs und einem Ort
    „Zuhause“ (KH 2 bis 24 kg, Schritt 2, SCHRAEG, STANGE, BAND, ANKER):
    `kh_bankdruecken, kh_schraegbank, kh_schulterdruecken_sitzend, klimmzug, kh_rudern_einarmig,
    goblet_squat, bss_kh, kh_rdl, kh_hip_thrust, kh_curls, kh_trizeps_ueberkopf, kh_seitheben,
    haengendes_knieheben, wadenheben`. Toleranz je Muskel ±1 Satz gegenüber dem Prototyp.
    Zusätzlich ein Rauchtest mit vollem Katalog: In Use Case 1 erreicht jeder Muskel ≥ 80 % des Ziels.
20. **Zeitbudget:** mittlere klassische Satzdauer = 45 Sek. + 0,6 × Grundpause + 0,4 × Isolationspause.
    Die einstellbaren Pausen fließen ein.
21. **12-Wochen-Tests in TypeScript:** eigener Simulator mit festem Zufallsstartwert (z. B. mulberry32)
    und demselben Modell wie der Prototyp. Geprüft werden Eigenschaften, keine exakten Zahlen:
    über 50 Startwerte im Schnitt höchstens 0,1 Lastrückschritte, keiner mehr als 1; erste
    Laststeigerung spätestens in Woche 8; kein Muster Last A, B, A innerhalb von 3 Einheiten.

## C. Planungslogik

22. **Variantenwahl:** Pro Muster und Zyklus bis zu zwei Hauptvarianten A und B, bestimmt bei
    Zyklusbeginn bzw. erster Nutzung des Musters am Ort. Kandidaten: am Ort möglich, nicht gesperrt,
    nicht ausgeschlossen. Rangfolge: Favorit; dann Abstand zur Musterstufe (bei Lasttyp Last zählt
    nur, wie weit die Stufe über der Musterstufe liegt, weil die Last den Rest regelt); dann Lasttyp
    Last vor Band vor KG vor Zeit; dann Katalogreihenfolge. B = nächstbeste Variante mit anderer ID,
    bevorzugt mit anderem Equipment. A und B wechseln sich von Einheit zu Einheit ab.
    In Schritt 6 des Algorithmus sind die Kandidaten genau die fälligen Hauptvarianten aller Muster.
23. **Supersatz-Paare** aus dieser Liste, der Reihe nach: hDruck + hZug, vDruck + vZug,
    Bizeps + Trizeps, Knie oder Einbein + Rumpf, Huefte + Schulter. Gepaart wird, bis der
    Supersatz-Anteil (Anteil der Arbeitssätze in Paaren) erreicht ist. Format: keine Paare =
    klassisch, alle möglichen Paare gebildet = supersatz, sonst mix.
24. **„15 Min länger?“** nur, wenn Prognose 1 bis 2, Einstellung an und nach vollem Budget noch
    Bedarf offen ist.
25. **Pacing-Korrektur** senkt nur die Restzahl n für die Verteilung. Prognose und Wochenziel
    ändern sich erst, wenn der Nutzer die vorgeschlagene Prognose bestätigt.
26. **Ruhetag empfohlen**, wenn die erzeugte Einheit weniger als 6 Arbeitssätze hätte. Angeboten
    werden dann: trotzdem trainieren, Zirkel, Mobility (Aufwärm-Mobility aller Muster, ca. 10 Min).
27. **Zirkel:**
    - Fällig: „alle 2 Wochen“ = in Wochen mit gerader ISO-Wochennummer 1 Zirkel; „1 pro Woche“ = 1;
      „2 pro Woche“ = 2.
    - Vorgeschlagen wird ein fälliger Zirkel bei Prognose ≥ 3, sobald die hoch priorisierten Muskeln
      ≥ 70 % ihres Wochenziels haben oder nur noch eine Einheit laut Prognose bleibt. Der Nutzer
      kann jederzeit „Stattdessen Zirkel“ bzw. „Doch Krafteinheit“ wählen.
    - Volumen: je Runde und Station 0,5 Sätze für Primärmuskeln, 0,25 für Sekundärmuskeln.
      Das zählt auch für Erholungsfenster.
    - Fehlt die Variante „Musterstufe − 2“: nächstniedrigere zirkel-geeignete; sonst niedrigste
      zirkel-geeignete; sonst irgendeine Variante des Musters; sonst Station auslassen. Bestzeiten
      gelten pro Zirkel, Ort und Variantensatz.
28. **Echte Satzdauer** = (Einheitsdauer − Aufwärmdauer) ÷ Zahl der Arbeitssätze, gleitender
    Mittelwert über die letzten 5 Einheiten je Format; ersetzt die Schätzung ab der 5. Einheit.
29. **Sperren nach Körperregion** (blockiert die genannten Muster bzw. Übungen):

    | Region | Gesperrt |
    | --- | --- |
    | Schulter | vDruck, Schulter, dips, bank_dips, archer_liegestuetz, wand_hs_liegestuetz |
    | Ellbogen | Bizeps, Trizeps, dips, bank_dips |
    | Handgelenk | alle Liegestütz-Varianten, pike-Varianten, burpees, mountain_climbers |
    | Unterer Rücken | Huefte außer glute_bridge, mini_glute_bridge, hip_thrust_einbeinig; kh_rudern_vorgebeugt, lh_rudern |
    | Knie | Knie, Einbein, sprung_kniebeuge, skater, burpees, kh_thruster |
    | Hüfte | Einbein, Huefte, skater |

    Sekundäre Beteiligung führt nicht zur Sperre. Muster können zusätzlich einzeln gesperrt werden.
30. **Ersatzregeln (korrigiert):** vZug ohne Stange: band_latzug, falls BAND und ANKER vorhanden,
    sonst hZug (bevorzugt tischrudern). Bizeps ohne Variante: chinup, falls Stange, sonst
    tischrudern (Bizeps nur sekundär). Schulter ohne Variante: vDruck-Variante. Die Trizeps-Regel
    entfällt.
31. **Profilfelder:**
    - Ziele setzen nur Startwerte: „kraft“ ⇒ Grundübungen mit Last nutzen Bereich 6 bis 10;
      „ausdauer“ oder „fitness“ ⇒ Zirkel-Anteil-Vorschlag 1 pro Woche; sonst alle 2 Wochen.
    - Level: Musterstufe ohne Testtag Einsteiger 3, Fortgeschritten 5, Erfahren 6; persönliche
      Grenzen Einsteiger −2, Erfahren +2 gegenüber der Tabelle.
    - Ziel-Reserve „2 bis 3“: Reserve für „passend“ in der Kraftschätzung 2,5; Zielgrenze mit
      Reserve 2 statt 1; Hinweistext „Aufhören, wenn noch 2 bis 3 gingen“.

## D. Progression, Tests, Verlauf

32. **Unterstützende Übungen** (`unterstuetzend: true`, im Katalog: klimmzug_band): Fortschritt =
    leichteres Band. Bei der leichtesten Stufe und erstem Satz ≥ O folgt die nächste Variante.
33. **Halteübungen (Zeit):** Ziel in Sekunden; passend +5 Sek., zu leicht +10 Sek.; ab O nächste
    Variante mit Ziel U. Keine Kraftschätzung.
34. **Isolation:** Feedback-Definition bleibt für alle Übungen gleich (passend = 1 bis 3 Reserve).
    „Letzter Satz 0 bis 1“ ist nur ein Hinweistext beim letzten Isolationssatz.
35. Variantenwechsel bei KG und Band ab O (siehe 15), damit passen die Katalogbereiche.
36. **Lastraster:**
    - Kurzhanteln verstellbar: Min, Min + Schritt, … bis ≤ Max, Max immer zusätzlich enthalten
      (2,5 bis 24 kg in 2,5er Schritten: 2,5 … 22,5, 24).
    - Langhantel: `scheiben: { kg: number; paare: number }[]`; mögliche Lasten = Stange + alle
      Kombinationen der Paare; nächste Last = kleinste mögliche über der aktuellen.
37. **Testtag:**
    - Tests: Liegestütz (hDruck), Klimmzug Obergriff (vZug, bei 0: Sekunden im Hängen), Kniebeuge
      (Knie), Plank (Rumpf, Sekunden). Gespeichert als Einheit mit `format: 'test'`; jeder Test zählt
      als 1 Satz.
    - Startvariante:

      | Muster | Ergebnis | Startvariante |
      | --- | --- | --- |
      | hDruck | 0 / 1 bis 7 / 8 bis 20 / 21 bis 30 / über 30 | knieliegestuetz / liegestuetz_erhoeht_haende / liegestuetz / liegestuetz_fuesse_erhoeht / liegestuetz_band |
      | vZug | 0 und unter 20 Sek. hängen / 0 und mind. 20 Sek. / 1 bis 3 / 4 bis 7 / 8 bis 14 / ab 15 | scapula_pullups / negative_klimmzuege / klimmzug_band / chinup / klimmzug / klimmzug_gewicht |
      | Knie | unter 15 / 15 bis 30 / über 30 | kniebeuge / pausen_kniebeuge / goblet_squat, falls möglich, sonst bss_kg |
      | Rumpf | unter 30 / 30 bis 60 / über 60 Sek. | dead_bug / plank / hollow_hold |

    - Musterstufe = Stufe der Startvariante. Startziel = 70 % des Testergebnisses, begrenzt auf
      den Bereich der Variante.
    - Nicht getestete Muster: Musterstufe nach Level (31). Varianten mit Last beginnen mit einem
      Kalibrierungssatz: Die App fragt „Mit welchem Gewicht startest du?“, vorbelegt mit der
      kleinsten verfügbaren Last; Ziel U mit Reserve 3; danach Kraftschätzung wie beschrieben.
38. **Spätere Max-Tests** rotieren über hDruck, vZug, Knie, Rumpf, immer mit derselben Übung wie
    am Testtag (vergleichbar). Ist sie am Ort nicht möglich, wird der Test verschoben.
39. **Wochenabschluss** läuft beim Öffnen der App für alle abgeschlossenen, noch nicht
    ausgewerteten Wochen nacheinander (Nachholen).
40. **Übliches Volumen** = Mittel der erledigten Wochensätze (alle Muskeln) der letzten 4 Wochen.
    **Leistung sinkt** bei KG und Band = erster Satz derselben Variante 2 oder mehr Wdh. unter dem
    Mittel der beiden vorherigen Einheiten.
41. **Rekord** = neuer Bestwert bei: e1RM einer Last-Variante, erster Satz einer KG- oder
    Band-Variante, Sekunden einer Zeit-Variante, Max-Test-Ergebnis, Zirkel-Bestzeit je Ort.

## E. Formales und Datenmodell

42. `katalog.json` ist auf Schema-Version 2 angeglichen: Schlüssel `utensilien` (mit `eigenes:
    false`), Muskeln als Typ-IDs (`Ruecken`, `Gesaess`, `HintereOS` …), „Ganzkörper“ als leere
    Liste, Feld `unterstuetzend`. Die neue Datei ersetzt die alte.
43. **Typänderungen:**

    ```ts
    interface Uebung { /* wie bisher */ bereich: { von: number; bis: number; einheit: 'Wdh.'|'Sek.' };
      unterstuetzend: boolean }
    interface KatalogDatei { schemaVersion: number; utensilien: Utensil[]; uebungen: Uebung[];
      zirkel: Zirkel[]; aufwaermen: { allgemein: string[]; mobility: Partial<Record<MusterId, string[]>>;
      maxMobilityZeilen: number; aufwaermsatz: { anteilLast: number; wdh: number } } }
    interface OrtEquipment { /* wie bisher */ langhantel?: { stangeKg: number; scheiben: { kg: number; paare: number }[] } }
    interface Block { typ: 'einzeln'|'supersatz'|'zirkel'; /* Rest wie bisher */ }
    interface Einheit { /* wie bisher */ format: 'klassisch'|'supersatz'|'mix'|'zirkel'|'test' }
    interface Einstellungen { /* wie bisher */ letztesBackup?: string }
    interface MaxTest { id: string; datum: string; muster: MusterId; uebungId: string; ergebnis: number; einheit: 'Wdh.'|'Sek.' }
    ```

    Neue Tabelle `maxTests` (vollständiger Verlauf). „Letztes Mal“ wird aus der letzten
    abgeschlossenen Position derselben Übung gelesen, kein eigenes Feld.
44. Das Diagramm der Planungslogik ist nicht nötig; der Algorithmus ist im Text vollständig.
45. **Icons:** eigene schlichte Inline-SVG-Icons, keine Icon-Bibliothek. **Schrift:** Manrope als
    woff2-Datei unter `public/fonts/` (Gewichte 400, 600, 700, 800), per `@font-face` eingebunden.
46. `docs/annahmen.md` und `docs/changelog.md` legt Paket 0 an.
47. **Abkühlen:** optional nach dem Abschluss, zeigt die Mobility-Zeilen des Aufwärmens erneut,
    ca. 3 Min. **Verlauf-Detail:** Tipp auf eine Einheit zeigt Datum, Ort, Dauer, alle Übungen mit
    Sätzen, Last, Feedback, Gesamtanstrengung und Notiz. **Aufwärmen** wird als Checkliste auf
    einem Screen gezeigt, mit „Fertig“ und „Überspringen“.
