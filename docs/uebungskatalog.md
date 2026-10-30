# Übungskatalog

Der Startkatalog umfasst 101 Übungen in 13 Mustern, 15 Utensilien und 5 feste Zirkel. Er wird als Datei `katalog.json` mitgeliefert (gleicher Inhalt wie hier) und beim ersten Start geladen; eigene Übungen speichert die App getrennt.

## Regeln für den Katalog

- **Equipment-Feld:** Liste von Gruppen, verbunden mit „+“. Aus jeder Gruppe muss mindestens ein Utensil am Ort vorhanden sein. „KH + BANK/SCHRAEG“ heißt: Kurzhanteln und (flache oder verstellbare Bank). „keins“ heißt: immer möglich.
- **Verstellbare Bank** (SCHRAEG) erfüllt auch jede Anforderung an eine flache Bank.
- **Lasttyp:** KG = Körpergewicht, Band = Bandstufe, Last = Gewicht in kg, Zeit = Sekunden. Nur „Last“ nutzt die Kraftschätzung.
- **Namen** (Entscheidung 29.10.2026): englisch wie bei Freeletics („Pushups“, „Pullups“, „Squats“), Hantelübungen mit der üblichen englischen Gym-Bezeichnung. Anleitungen bleiben deutsch.
- **YouTube-Link:** Standard ist eine YouTube-Suche nach „<Übungsname> richtige Ausführung“ (in `katalog.json` vorbefüllt). Der Nutzer kann pro Übung einen festen Video-Link eintragen, der dann Vorrang hat.
- **Festes Video** (`videoId` in `katalog.json`, YouTube-ID, Entscheidungen 21.10.2026): für jede Katalogübung ein eigenes Video, wird in der App eingebettet und ersetzt die Suche als Link. Die ersten 10 (z. B. liegestuetz X1qbPKGDuKM, kniebeuge u-G8nn6crRA, klimmzug 5eScXtldIaI) sind deutschsprachig; die übrigen 88 sind nach „beste Qualität, egal welche Sprache“ gewählt und daher meist englisch. Ein eigener Video-Link des Nutzers hat Vorrang.
- **Kurzanleitung** (`anleitung` in `katalog.json`): 3 Stichpunkte zur Ausführung für jede Übung; angezeigt unter „So geht's“.
- **Stufe:** 1 bis 10 innerhalb des Musters; bestimmt die Reihenfolge beim Variantenwechsel.
- **Anzahl Gewichte** (`anzahlGewichte` in `katalog.json`, nur Last-Übungen mit KH/KB): bestimmt die Lastanzeige („16 kg je Hand“ bzw. „16 kg“). Eine Hantel (1): kh\_rudern\_einarmig, kb\_schulterdruecken, kb\_rudern, klimmzug\_gewicht, goblet\_squat, kh\_rdl\_einbeinig, kb\_swing, kh\_russian\_twist, konzentrationscurl, kh\_trizeps\_ueberkopf, kh\_wadenheben, kh\_hip\_thrust (eine Hantel auf der Hüfte, Entscheidung 30.10.2026). Alle übrigen KH-Übungen: zwei Hanteln (2).
- **Sekundär „keine“:** Die Übung zählt nur für den Primärmuskel. Muster „Kondition“ mit Primär „Ganzkörper“ zählt nicht zum Muskelvolumen.

**Ersatz, wenn ein Muster am Ort keine Variante hat** (Variante wird im Plan als Ersatz markiert):

| Muster ohne Variante | Ersatz |
| --- | --- |
| vZug (keine Stange) | band_latzug, falls BAND und ANKER vorhanden; sonst hZug, bevorzugt tischrudern |
| Bizeps | chinup, falls Stange vorhanden; sonst tischrudern (Bizeps nur sekundär) |
| Schulter (seitlich/hinten) | vDruck-Variante |
| alle anderen | haben meist eine Variante, die nur immer vorhandene Utensilien (TISCH, ERH) oder gar keins braucht |

Gibt es auch keinen Ersatz, entfällt das Muster an diesem Ort (Hinweis im Equipment-Bildschirm). Bei Sperren greift kein Ersatz.

## Utensilien

| ID | Utensil | Detailangaben | Immer vorhanden |
| --- | --- | --- | --- |
| KH | Kurzhanteln | Modus verstellbar (Min, Max, Schritt in kg) oder feste Paare (Liste in kg) | nein |
| BANK | Hantelbank flach | keine | nein |
| SCHRAEG | Hantelbank verstellbar (schräg) | keine; schließt flach ein | nein |
| STANGE | Klimmzugstange | keine | nein |
| BAND | Widerstandsbänder (lang) | vorhandene Stufen: leicht, mittel, schwer, extra schwer | nein |
| ANKER | Türanker für Bänder | keine | nein |
| MINI | Mini-Bänder (Loops) | vorhandene Stufen | nein |
| KB | Kettlebell | Liste der Gewichte in kg | nein |
| LH | Langhantel mit Scheiben | Stangengewicht, Scheiben in kg | nein |
| DIP | Dip-Barren | keine | nein |
| RINGE | Ringe / Schlingentrainer | keine | nein |
| SEIL | Springseil | keine | nein |
| TISCH | Stabiler Tisch | keine | ja |
| ERH | Erhöhung (Stuhl, Kasten, Stufe) | keine | ja |
| GRIFFE | Liegestützgriffe | keine | nein |

Der Nutzer kann eigene Utensilien anlegen (Name, ID) und sie eigenen Übungen zuordnen.

## Übungen

| ID | Übung | Muster | Primär | Sekundär | Stufe | Equipment | Lasttyp | Bereich | Zirkel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| knieliegestuetz | Knee Pushups | hDruck | Brust | Trizeps, Schultern | 1 | keins | KG | 8 bis 15 Wdh. | ja |
| liegestuetz\_erhoeht\_haende | Incline Pushups | hDruck | Brust | Trizeps, Schultern | 2 | ERH | KG | 8 bis 15 Wdh. | ja |
| band\_brustpresse | Band Chest Press | hDruck | Brust | Trizeps, Schultern | 3 | BAND + ANKER/STANGE | Band | 10 bis 15 Wdh. | nein |
| liegestuetz | Pushups | hDruck | Brust | Trizeps, Schultern | 4 | keins | KG | 8 bis 15 Wdh. | ja |
| kh\_bodendruecken | Dumbbell Floor Press (nur ohne Bank und Schrägbank, Entscheidung 30.10.2026) | hDruck | Brust | Trizeps, Schultern | 4 | KH | Last | 8 bis 12 Wdh. | nein |
| liegestuetz\_fuesse\_erhoeht | Decline Pushups | hDruck | Brust | Trizeps, Schultern | 5 | ERH | KG | 8 bis 15 Wdh. | ja |
| liegestuetz\_griffe | Handle Pushups | hDruck | Brust | Trizeps, Schultern | 5 | GRIFFE | KG | 8 bis 15 Wdh. | ja |
| liegestuetz\_griffe\_fuesse\_erhoeht | Decline Handle Pushups | hDruck | Brust | Trizeps, Schultern | 6 | GRIFFE + ERH | KG | 8 bis 15 Wdh. | nein |
| kh\_bankdruecken | Dumbbell Bench Press | hDruck | Brust | Trizeps, Schultern | 5 | KH + BANK/SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| kh\_schraegbank | Incline Dumbbell Press | hDruck | Brust | Schultern, Trizeps | 5 | KH + SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| liegestuetz\_band | Banded Pushups | hDruck | Brust | Trizeps, Schultern | 6 | BAND | Band | 8 bis 15 Wdh. | nein |
| lh\_bankdruecken | Barbell Bench Press | hDruck | Brust | Trizeps, Schultern | 6 | LH + BANK/SCHRAEG | Last | 6 bis 10 Wdh. | nein |
| dips | Dips | hDruck | Brust | Trizeps, Schultern | 7 | DIP | KG | 6 bis 12 Wdh. | nein |
| ringe\_liegestuetz | Ring Pushups | hDruck | Brust | Trizeps, Schultern | 7 | RINGE | KG | 8 bis 15 Wdh. | nein |
| archer\_liegestuetz | Archer Pushups | hDruck | Brust | Trizeps, Schultern | 8 | keins | KG | 6 bis 12 Wdh. | nein |
| band\_schulterdruecken | Band Shoulder Press | vDruck | Schultern | Trizeps | 3 | BAND | Band | 10 bis 15 Wdh. | nein |
| pike\_liegestuetz | Pike Pushups | vDruck | Schultern | Trizeps | 4 | keins | KG | 8 bis 15 Wdh. | ja |
| kh\_schulterdruecken\_stehend | Standing Dumbbell Shoulder Press | vDruck | Schultern | Trizeps | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kh\_schulterdruecken\_sitzend | Seated Dumbbell Shoulder Press | vDruck | Schultern | Trizeps | 5 | KH + SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| arnold\_press | Arnold Press | vDruck | Schultern | Trizeps | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kb\_schulterdruecken | Kettlebell Shoulder Press | vDruck | Schultern | Trizeps | 5 | KB | Last | 8 bis 12 Wdh. | nein |
| pike\_erhoeht | Elevated Pike Pushups | vDruck | Schultern | Trizeps | 6 | ERH | KG | 6 bis 12 Wdh. | nein |
| lh\_ueberkopf | Barbell Overhead Press | vDruck | Schultern | Trizeps | 6 | LH | Last | 6 bis 10 Wdh. | nein |
| wand\_hs\_liegestuetz | Wall Handstand Pushups | vDruck | Schultern | Trizeps | 9 | keins | KG | 3 bis 8 Wdh. | nein |
| band\_rudern | Seated Band Rows | hZug | Rücken | Bizeps, Schultern | 3 | BAND | Band | 10 bis 15 Wdh. | nein |
| band\_face\_pull | Band Face Pulls | hZug | Schultern | Rücken | 3 | BAND + ANKER/STANGE | Band | 12 bis 20 Wdh. | nein |
| tischrudern | Table Rows | hZug | Rücken | Bizeps, Schultern | 4 | TISCH | KG | 8 bis 15 Wdh. | ja |
| kh\_rudern\_einarmig | One-Arm Dumbbell Rows | hZug | Rücken | Bizeps, Schultern | 5 | KH + BANK/SCHRAEG/ERH | Last | 8 bis 12 Wdh. | nein |
| kh\_rudern\_vorgebeugt | Bent-Over Dumbbell Rows | hZug | Rücken | Bizeps, Schultern | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kh\_rudern\_brustgestuetzt | Chest-Supported Dumbbell Rows | hZug | Rücken | Bizeps, Schultern | 5 | KH + SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| kb\_rudern | Kettlebell Rows | hZug | Rücken | Bizeps, Schultern | 5 | KB | Last | 8 bis 12 Wdh. | nein |
| ringe\_rudern | Ring Rows | hZug | Rücken | Bizeps, Schultern | 5 | RINGE | KG | 8 bis 15 Wdh. | ja |
| lh\_rudern | Barbell Rows | hZug | Rücken | Bizeps, Schultern | 6 | LH | Last | 6 bis 10 Wdh. | nein |
| scapula\_pullups | Scapula Pullups | vZug | Rücken | keine | 1 | STANGE | KG | 8 bis 15 Wdh. | nein |
| band\_latzug | Kneeling Band Lat Pulldowns | vZug | Rücken | Bizeps | 2 | BAND + ANKER/STANGE | Band | 10 bis 15 Wdh. | nein |
| negative\_klimmzuege | Negative Pullups | vZug | Rücken | Bizeps | 3 | STANGE | KG | 3 bis 6 Wdh. | nein |
| klimmzug\_band | Band-Assisted Pullups | vZug | Rücken | Bizeps | 4 | STANGE + BAND | Band | 6 bis 12 Wdh. | nein |
| chinup | Chinups | vZug | Rücken | Bizeps | 5 | STANGE | KG | 5 bis 12 Wdh. | nein |
| klimmzug | Pullups | vZug | Rücken | Bizeps | 6 | STANGE | KG | 5 bis 12 Wdh. | nein |
| klimmzug\_gewicht | Weighted Pullups | vZug | Rücken | Bizeps | 8 | STANGE + KH/KB | Last | 5 bis 10 Wdh. | nein |
| box\_squat | Box Squats | Knie | Quadrizeps | Gesäß | 1 | ERH | KG | 8 bis 15 Wdh. | ja |
| kniebeuge | Squats | Knie | Quadrizeps | Gesäß | 2 | keins | KG | 12 bis 20 Wdh. | ja |
| band\_kniebeuge | Band Squats | Knie | Quadrizeps | Gesäß | 3 | BAND | Band | 10 bis 15 Wdh. | nein |
| pausen\_kniebeuge | Pause Squats | Knie | Quadrizeps | Gesäß | 3 | keins | KG | 10 bis 15 Wdh. | nein |
| goblet\_squat | Goblet Squats | Knie | Quadrizeps | Gesäß | 4 | KH/KB | Last | 8 bis 12 Wdh. | ja |
| kh\_kniebeuge | Dumbbell Squats | Knie | Quadrizeps | Gesäß | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| pistol\_assistiert | Assisted Pistols | Knie | Quadrizeps | Gesäß | 7 | ERH | KG | 5 bis 10 Wdh. | nein |
| pistol | Pistols | Knie | Quadrizeps | Gesäß | 9 | keins | KG | 3 bis 8 Wdh. | nein |
| ausfallschritt\_rueck | Reverse Lunges | Einbein | Quadrizeps | Gesäß | 3 | keins | KG | 10 bis 15 Wdh. | ja |
| step\_up | Step-ups | Einbein | Quadrizeps | Gesäß | 3 | ERH | KG | 10 bis 15 Wdh. | ja |
| bss\_kg | Bulgarian Split Squats | Einbein | Quadrizeps | Gesäß | 4 | ERH/BANK/SCHRAEG | KG | 8 bis 15 Wdh. | nein |
| kh\_step\_up | Dumbbell Step-ups | Einbein | Quadrizeps | Gesäß | 4 | KH + ERH/BANK/SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| kh\_ausfallschritt | Dumbbell Walking Lunges | Einbein | Quadrizeps | Gesäß | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| bss\_kh | Dumbbell Bulgarian Split Squats | Einbein | Quadrizeps | Gesäß | 6 | KH + ERH/BANK/SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| shrimp\_squat | Shrimp Squats | Einbein | Quadrizeps | Gesäß | 8 | keins | KG | 5 bis 10 Wdh. | nein |
| glute\_bridge | Glute Bridges | Huefte | Gesäß | Hintere Oberschenkel | 1 | keins | KG | 12 bis 20 Wdh. | ja |
| mini\_glute\_bridge | Mini-Band Glute Bridges | Huefte | Gesäß | Hintere Oberschenkel | 2 | MINI | Band | 12 bis 20 Wdh. | ja |
| band\_pull\_through | Band Pull-Throughs | Huefte | Gesäß | Hintere Oberschenkel | 3 | BAND + ANKER/STANGE | Band | 12 bis 15 Wdh. | nein |
| hip\_thrust\_einbeinig | Single-Leg Hip Thrusts | Huefte | Gesäß | Hintere Oberschenkel | 3 | ERH/BANK/SCHRAEG | KG | 8 bis 15 Wdh. | nein |
| sliding\_leg\_curl | Sliding Leg Curls | Huefte | Hintere Oberschenkel | Gesäß | 4 | keins | KG | 8 bis 15 Wdh. | nein |
| kh\_hip\_thrust | Dumbbell Hip Thrusts | Huefte | Gesäß | Hintere Oberschenkel | 4 | KH + BANK/SCHRAEG | Last | 8 bis 15 Wdh. | nein |
| kh\_rdl | Dumbbell Romanian Deadlifts | Huefte | Hintere Oberschenkel | Gesäß | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kh\_rdl\_einbeinig | Single-Leg Romanian Deadlifts | Huefte | Hintere Oberschenkel | Gesäß | 5 | KH/KB | Last | 8 bis 12 Wdh. | nein |
| kb\_swing | Kettlebell Swings | Huefte | Gesäß | Hintere Oberschenkel | 5 | KB | Last | 12 bis 20 Wdh. | ja |
| lh\_kreuzheben | Barbell Deadlifts | Huefte | Hintere Oberschenkel | Gesäß, Rücken | 6 | LH | Last | 5 bis 8 Wdh. | nein |
| nordic\_curl | Nordic Curls | Huefte | Hintere Oberschenkel | keine | 8 | keins | KG | 3 bis 8 Wdh. | nein |
| dead\_bug | Dead Bugs | Rumpf | Bauch | keine | 1 | keins | KG | 8 bis 12 Wdh. | ja |
| plank | Plank | Rumpf | Bauch | keine | 2 | keins | Zeit | 20 bis 60 Sek. | ja |
| seitstuetz | Side Plank | Rumpf | Bauch | keine | 2 | keins | Zeit | 20 bis 45 Sek. | ja |
| band\_pallof | Band Pallof Press | Rumpf | Bauch | keine | 3 | BAND + ANKER/STANGE | Band | 10 bis 15 Wdh. | nein |
| kh\_russian\_twist | Dumbbell Russian Twists | Rumpf | Bauch | keine | 3 | KH/KB | Last | 10 bis 20 Wdh. | ja |
| hollow\_hold | Hollow Hold | Rumpf | Bauch | keine | 4 | keins | Zeit | 20 bis 45 Sek. | ja |
| haengendes\_knieheben | Hanging Knee Raises | Rumpf | Bauch | keine | 5 | STANGE | KG | 8 bis 15 Wdh. | nein |
| haengendes\_beinheben | Hanging Leg Raises | Rumpf | Bauch | keine | 7 | STANGE | KG | 6 bis 12 Wdh. | nein |
| band\_curls | Band Curls | Bizeps | Bizeps | keine | 2 | BAND | Band | 12 bis 20 Wdh. | nein |
| kh\_curls | Dumbbell Curls | Bizeps | Bizeps | keine | 3 | KH | Last | 10 bis 15 Wdh. | nein |
| hammer\_curls | Hammer Curls | Bizeps | Bizeps | keine | 3 | KH | Last | 10 bis 15 Wdh. | nein |
| konzentrationscurl | Concentration Curls | Bizeps | Bizeps | keine | 3 | KH + ERH/BANK/SCHRAEG | Last | 10 bis 15 Wdh. | nein |
| schraegbank\_curls | Incline Dumbbell Curls | Bizeps | Bizeps | keine | 4 | KH + SCHRAEG | Last | 10 bis 15 Wdh. | nein |
| lh\_curls | Barbell Curls | Bizeps | Bizeps | keine | 4 | LH | Last | 8 bis 12 Wdh. | nein |
| band\_trizeps | Band Triceps Pushdowns | Trizeps | Trizeps | keine | 2 | BAND + ANKER/STANGE | Band | 12 bis 20 Wdh. | nein |
| kh\_kickback | Dumbbell Kickbacks | Trizeps | Trizeps | keine | 2 | KH | Last | 12 bis 15 Wdh. | nein |
| bank\_dips | Bench Dips | Trizeps | Trizeps | Brust | 3 | ERH/BANK/SCHRAEG | KG | 10 bis 20 Wdh. | ja |
| kh\_trizeps\_ueberkopf | Overhead Dumbbell Triceps Extensions | Trizeps | Trizeps | keine | 3 | KH | Last | 10 bis 15 Wdh. | nein |
| kh\_trizeps\_liegend | Dumbbell Skull Crushers | Trizeps | Trizeps | keine | 4 | KH + BANK/SCHRAEG | Last | 10 bis 15 Wdh. | nein |
| diamond\_liegestuetz | Diamond Pushups | Trizeps | Trizeps | Brust | 5 | keins | KG | 8 bis 15 Wdh. | ja |
| band\_pull\_apart | Band Pull-Aparts | Schulter | Schultern | Rücken | 2 | BAND | Band | 15 bis 20 Wdh. | nein |
| band\_seitheben | Band Lateral Raises | Schulter | Schultern | keine | 2 | BAND | Band | 12 bis 20 Wdh. | nein |
| kh\_seitheben | Dumbbell Lateral Raises | Schulter | Schultern | keine | 3 | KH | Last | 12 bis 20 Wdh. | nein |
| kh\_reverse\_flys | Reverse Dumbbell Flys | Schulter | Schultern | Rücken | 3 | KH | Last | 12 bis 20 Wdh. | nein |
| wadenheben | Calf Raises | Waden | Waden | keine | 1 | ERH | KG | 15 bis 25 Wdh. | ja |
| wadenheben\_einbeinig | Single-Leg Calf Raises | Waden | Waden | keine | 3 | ERH | KG | 10 bis 20 Wdh. | nein |
| kh\_wadenheben | Dumbbell Calf Raises | Waden | Waden | keine | 4 | KH + ERH | Last | 10 bis 20 Wdh. | nein |
| hampelmann | Jumping Jacks | Kondition | Ganzkörper | Waden | 1 | keins | KG | 20 bis 50 Wdh. | ja |
| high\_knees | High Knees | Kondition | Ganzkörper | Quadrizeps | 2 | keins | KG | 20 bis 50 Wdh. | ja |
| mountain\_climbers | Climbers | Kondition | Bauch | Schultern | 3 | keins | KG | 20 bis 40 Wdh. | ja |
| seilspringen | Jump Rope | Kondition | Waden | keine | 3 | SEIL | KG | 50 bis 150 Wdh. | ja |
| skater | Skater Jumps | Kondition | Gesäß | Quadrizeps | 4 | keins | KG | 16 bis 30 Wdh. | ja |
| sprung\_kniebeuge | Jump Squats | Kondition | Quadrizeps | Gesäß | 4 | keins | KG | 10 bis 20 Wdh. | ja |
| burpees | Burpees | Kondition | Brust | Quadrizeps, Schultern | 5 | keins | KG | 8 bis 20 Wdh. | ja |
| kh\_thruster | Dumbbell Thrusters | Kondition | Quadrizeps | Schultern, Gesäß, Trizeps | 5 | KH | Last | 8 bis 15 Wdh. | ja |

## Zirkel

Fünf feste Zirkel im Freeletics-Stil, jeweils auf Zeit. Eine Station nennt ein Muster, keine feste Übung: Die App wählt am Ort die zirkel-geeignete Variante, deren Stufe 2 unter der aktuellen Musterstufe liegt (damit das Tempo hoch bleibt), oder die bevorzugte Übung aus dem Hinweis, wenn möglich. Für dieselbe Zusammensetzung an einem Ort bleibt die Auswahl fest, damit Bestzeiten vergleichbar sind; Bestzeiten werden pro Zirkel und Ort gespeichert.

| Zirkel | Runden | Dauer | Stationen (Muster: Vorgabe) |
| --- | --- | --- | --- |
| Sprint | 4 | ca. 10 Min | Kondition: 10 (Burpees bevorzugt); Knie: 20; hDruck: 10; Kondition: 20 (Climbers bevorzugt) |
| Fundament | 5 | ca. 15 Min | Knie: 15; hDruck: 10; hZug: 10; Rumpf: 30 Sek. (Plank bevorzugt) |
| Leiter | 1 | ca. 12 Min | Stufen 2, 4, 6, 8, 10 Wiederholungen, auf jeder Stufe alle drei Stationen: hDruck, Knie, Rumpf (Dead Bugs oder Knee Raises) |
| Kraftprobe | 4 | ca. 15 Min | Kondition: 10 (Thrusters, ohne Kurzhanteln Jump Squats); hZug: 10; Einbein: 10 je Seite; vDruck: 10 |
| Ausdauer | 3 | ca. 16 Min | Kondition: 50 (Jumping Jacks bevorzugt); Huefte: 15; hDruck: 12; Einbein: 20 gesamt; Rumpf: 30 Sek. Side Plank je Seite |

Als Finisher (siehe Planungslogik) wird der Zirkel verwendet, dessen Dauer in die frei gebliebene Zeit passt, bevorzugt der am längsten nicht absolvierte.

## Aufwärmen

Das Aufwärmen (ca. 5 Min) setzt sich aus drei Teilen zusammen und wird beim Erzeugen der Einheit festgelegt. Es zählt nicht zum Volumen. Alle Vorgaben sind Wiederholungen, nur Halteübungen (Dehnungen) stehen in Sekunden (Entscheidung 29.10.2026).

| Teil | Inhalt |
| --- | --- |
| Allgemein (immer, ca. 2 Min) | 50 Jumping Jacks; dazu nach Körperhälfte (Entscheidung 29.10.2026): nur Oberkörper 10 Arm Circles je Richtung und 10 Backward Shoulder Circles; nur Unterkörper 10 Squats (ohne Last) und 10 Leg Swings je Bein; sonst Arm Circles und Squats |
| Mobility für hDruck oder vDruck | 10 Wall Slides; mit Band zusätzlich 10 Band Pull-Aparts |
| Mobility für hZug oder vZug | 10 Scapula Squeezes (Schulterblätter im Stand zusammenziehen, ohne Gewicht); mit Stange 5 Scapula Pullups |
| Mobility für Knie oder Einbein | 5 Lunges with Twist (Ausfallschritt mit Oberkörperdrehung) je Seite |
| Mobility für Huefte | 10 Good Mornings ohne Last, 30 Sek. Kneeling Hip Flexor Stretch (Hüftbeuger-Dehnung kniend) je Seite |
| Mobility für Rumpf | 8 Cat-Cow |
| Aufwärmsatz | 1 Satz der ersten Grundübung mit etwa 50 % der Last (bzw. leichterer Variante), 8 Wiederholungen |

**„So geht's“ beim Aufwärmen** (`aufwaermen.anleitungen` in `katalog.json`, Entscheidung 30.10.2026): Jumping Jacks, Squats, Band Pull-Aparts und Scapula Pullups zeigen die Katalogübung; Arm Circles, Backward Shoulder Circles, Leg Swings, Wall Slides, Scapula Squeezes, Lunges with Twist, Good Mornings, Kneeling Hip Flexor Stretch und Cat-Cow haben eine eigene Kurzanleitung (3 Stichpunkte) und ein festes Video. Der Aufwärmsatz zeigt die Übung selbst.

Es werden höchstens drei Mobility-Zeilen gewählt, nach den Mustern mit den meisten Sätzen der Einheit.
