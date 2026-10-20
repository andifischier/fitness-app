# Übungskatalog

Der Startkatalog umfasst 98 Übungen in 13 Mustern, 14 Utensilien und 5 feste Zirkel. Er wird als Datei `katalog.json` mitgeliefert (gleicher Inhalt wie hier) und beim ersten Start geladen; eigene Übungen speichert die App getrennt.

## Regeln für den Katalog

- **Equipment-Feld:** Liste von Gruppen, verbunden mit „+“. Aus jeder Gruppe muss mindestens ein Utensil am Ort vorhanden sein. „KH + BANK/SCHRAEG“ heißt: Kurzhanteln und (flache oder verstellbare Bank). „keins“ heißt: immer möglich.
- **Verstellbare Bank** (SCHRAEG) erfüllt auch jede Anforderung an eine flache Bank.
- **Lasttyp:** KG = Körpergewicht, Band = Bandstufe, Last = Gewicht in kg, Zeit = Sekunden. Nur „Last“ nutzt die Kraftschätzung.
- **YouTube-Link:** Standard ist eine YouTube-Suche nach „<Übungsname> richtige Ausführung“ (in `katalog.json` vorbefüllt). Der Nutzer kann pro Übung einen festen Video-Link eintragen, der dann Vorrang hat.
- **Stufe:** 1 bis 10 innerhalb des Musters; bestimmt die Reihenfolge beim Variantenwechsel.
- **Sekundär „keine“:** Die Übung zählt nur für den Primärmuskel. Muster „Kondition“ mit Primär „Ganzkörper“ zählt nicht zum Muskelvolumen.

**Ersatz, wenn ein Muster am Ort keine Variante hat** (Variante wird im Plan als Ersatz markiert):

| Muster ohne Variante | Ersatz |
| --- | --- |
| vZug (keine Stange) | band_latzug, falls BAND und ANKER vorhanden; sonst hZug, bevorzugt tischrudern |
| Bizeps | chinup, falls Stange vorhanden; sonst tischrudern (Bizeps nur sekundär) |
| Schulter (seitlich/hinten) | vDruck-Variante |
| alle anderen | haben immer mindestens eine Variante ohne gekauftes Equipment |

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

Der Nutzer kann eigene Utensilien anlegen (Name, ID) und sie eigenen Übungen zuordnen.

## Übungen

| ID | Übung | Muster | Primär | Sekundär | Stufe | Equipment | Lasttyp | Bereich | Zirkel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| knieliegestuetz | Knieliegestütz | hDruck | Brust | Trizeps, Schultern | 1 | keins | KG | 8 bis 15 Wdh. | ja |
| liegestuetz\_erhoeht\_haende | Liegestütz, Hände erhöht | hDruck | Brust | Trizeps, Schultern | 2 | ERH | KG | 8 bis 15 Wdh. | ja |
| band\_brustpresse | Band-Brustpresse stehend | hDruck | Brust | Trizeps, Schultern | 3 | BAND + ANKER/STANGE | Band | 10 bis 15 Wdh. | nein |
| liegestuetz | Liegestütz | hDruck | Brust | Trizeps, Schultern | 4 | keins | KG | 8 bis 15 Wdh. | ja |
| kh\_bodendruecken | Kurzhantel-Bodendrücken | hDruck | Brust | Trizeps, Schultern | 4 | KH | Last | 8 bis 12 Wdh. | nein |
| liegestuetz\_fuesse\_erhoeht | Liegestütz, Füße erhöht | hDruck | Brust | Trizeps, Schultern | 5 | ERH | KG | 8 bis 15 Wdh. | ja |
| kh\_bankdruecken | Kurzhantel-Bankdrücken | hDruck | Brust | Trizeps, Schultern | 5 | KH + BANK/SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| kh\_schraegbank | Kurzhantel-Schrägbankdrücken | hDruck | Brust | Schultern, Trizeps | 5 | KH + SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| liegestuetz\_band | Liegestütz mit Band | hDruck | Brust | Trizeps, Schultern | 6 | BAND | Band | 8 bis 15 Wdh. | nein |
| lh\_bankdruecken | Langhantel-Bankdrücken | hDruck | Brust | Trizeps, Schultern | 6 | LH + BANK/SCHRAEG | Last | 6 bis 10 Wdh. | nein |
| dips | Dips am Barren | hDruck | Brust | Trizeps, Schultern | 7 | DIP | KG | 6 bis 12 Wdh. | nein |
| ringe\_liegestuetz | Liegestütz an Ringen | hDruck | Brust | Trizeps, Schultern | 7 | RINGE | KG | 8 bis 15 Wdh. | nein |
| archer\_liegestuetz | Archer-Liegestütz | hDruck | Brust | Trizeps, Schultern | 8 | keins | KG | 6 bis 12 Wdh. | nein |
| band\_schulterdruecken | Band-Schulterdrücken | vDruck | Schultern | Trizeps | 3 | BAND | Band | 10 bis 15 Wdh. | nein |
| pike\_liegestuetz | Pike-Liegestütz | vDruck | Schultern | Trizeps | 4 | keins | KG | 8 bis 15 Wdh. | ja |
| kh\_schulterdruecken\_stehend | Kurzhantel-Schulterdrücken stehend | vDruck | Schultern | Trizeps | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kh\_schulterdruecken\_sitzend | Kurzhantel-Schulterdrücken sitzend | vDruck | Schultern | Trizeps | 5 | KH + SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| arnold\_press | Arnold-Press | vDruck | Schultern | Trizeps | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kb\_schulterdruecken | Kettlebell-Schulterdrücken | vDruck | Schultern | Trizeps | 5 | KB | Last | 8 bis 12 Wdh. | nein |
| pike\_erhoeht | Pike-Liegestütz, Füße erhöht | vDruck | Schultern | Trizeps | 6 | ERH | KG | 6 bis 12 Wdh. | nein |
| lh\_ueberkopf | Langhantel-Überkopfdrücken | vDruck | Schultern | Trizeps | 6 | LH | Last | 6 bis 10 Wdh. | nein |
| wand\_hs\_liegestuetz | Handstand-Liegestütz an der Wand | vDruck | Schultern | Trizeps | 9 | keins | KG | 3 bis 8 Wdh. | nein |
| band\_rudern | Band-Rudern sitzend | hZug | Rücken | Bizeps, Schultern | 3 | BAND | Band | 10 bis 15 Wdh. | nein |
| band\_face\_pull | Band-Face-Pull | hZug | Schultern | Rücken | 3 | BAND + ANKER/STANGE | Band | 12 bis 20 Wdh. | nein |
| tischrudern | Rudern unter dem Tisch | hZug | Rücken | Bizeps, Schultern | 4 | TISCH | KG | 8 bis 15 Wdh. | ja |
| kh\_rudern\_einarmig | Kurzhantel-Rudern einarmig | hZug | Rücken | Bizeps, Schultern | 5 | KH + BANK/SCHRAEG/ERH | Last | 8 bis 12 Wdh. | nein |
| kh\_rudern\_vorgebeugt | Kurzhantel-Rudern vorgebeugt | hZug | Rücken | Bizeps, Schultern | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kh\_rudern\_brustgestuetzt | Brustgestütztes Kurzhantel-Rudern | hZug | Rücken | Bizeps, Schultern | 5 | KH + SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| kb\_rudern | Kettlebell-Rudern | hZug | Rücken | Bizeps, Schultern | 5 | KB | Last | 8 bis 12 Wdh. | nein |
| ringe\_rudern | Rudern an Ringen | hZug | Rücken | Bizeps, Schultern | 5 | RINGE | KG | 8 bis 15 Wdh. | ja |
| lh\_rudern | Langhantel-Rudern | hZug | Rücken | Bizeps, Schultern | 6 | LH | Last | 6 bis 10 Wdh. | nein |
| scapula\_pullups | Schulterblatt-Klimmzüge | vZug | Rücken | keine | 1 | STANGE | KG | 8 bis 15 Wdh. | nein |
| band\_latzug | Band-Latzug kniend | vZug | Rücken | Bizeps | 2 | BAND + ANKER/STANGE | Band | 10 bis 15 Wdh. | nein |
| negative\_klimmzuege | Negative Klimmzüge | vZug | Rücken | Bizeps | 3 | STANGE | KG | 3 bis 6 Wdh. | nein |
| klimmzug\_band | Klimmzug mit Bandunterstützung | vZug | Rücken | Bizeps | 4 | STANGE + BAND | Band | 6 bis 12 Wdh. | nein |
| chinup | Klimmzug Untergriff (Chin-up) | vZug | Rücken | Bizeps | 5 | STANGE | KG | 5 bis 12 Wdh. | nein |
| klimmzug | Klimmzug Obergriff | vZug | Rücken | Bizeps | 6 | STANGE | KG | 5 bis 12 Wdh. | nein |
| klimmzug\_gewicht | Klimmzug mit Zusatzgewicht | vZug | Rücken | Bizeps | 8 | STANGE + KH/KB | Last | 5 bis 10 Wdh. | nein |
| kniebeuge | Kniebeuge | Knie | Quadrizeps | Gesäß | 2 | keins | KG | 12 bis 20 Wdh. | ja |
| band\_kniebeuge | Band-Kniebeuge | Knie | Quadrizeps | Gesäß | 3 | BAND | Band | 10 bis 15 Wdh. | nein |
| pausen\_kniebeuge | Kniebeuge mit Pause unten | Knie | Quadrizeps | Gesäß | 3 | keins | KG | 10 bis 15 Wdh. | nein |
| goblet\_squat | Goblet Squat | Knie | Quadrizeps | Gesäß | 4 | KH/KB | Last | 8 bis 12 Wdh. | ja |
| kh\_kniebeuge | Kurzhantel-Kniebeuge | Knie | Quadrizeps | Gesäß | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| pistol\_assistiert | Einbeinige Kniebeuge mit Halt | Knie | Quadrizeps | Gesäß | 7 | ERH | KG | 5 bis 10 Wdh. | nein |
| pistol | Pistol Squat | Knie | Quadrizeps | Gesäß | 9 | keins | KG | 3 bis 8 Wdh. | nein |
| ausfallschritt\_rueck | Ausfallschritt rückwärts | Einbein | Quadrizeps | Gesäß | 3 | keins | KG | 10 bis 15 Wdh. | ja |
| step\_up | Step-up | Einbein | Quadrizeps | Gesäß | 3 | ERH | KG | 10 bis 15 Wdh. | ja |
| bss\_kg | Bulgarian Split Squat | Einbein | Quadrizeps | Gesäß | 4 | ERH/BANK/SCHRAEG | KG | 8 bis 15 Wdh. | nein |
| kh\_step\_up | Kurzhantel-Step-up | Einbein | Quadrizeps | Gesäß | 4 | KH + ERH/BANK/SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| kh\_ausfallschritt | Kurzhantel-Ausfallschritt gehend | Einbein | Quadrizeps | Gesäß | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| bss\_kh | Bulgarian Split Squat mit Kurzhanteln | Einbein | Quadrizeps | Gesäß | 6 | KH + ERH/BANK/SCHRAEG | Last | 8 bis 12 Wdh. | nein |
| shrimp\_squat | Shrimp Squat | Einbein | Quadrizeps | Gesäß | 8 | keins | KG | 5 bis 10 Wdh. | nein |
| glute\_bridge | Glute Bridge | Huefte | Gesäß | Hintere Oberschenkel | 1 | keins | KG | 12 bis 20 Wdh. | ja |
| mini\_glute\_bridge | Glute Bridge mit Mini-Band | Huefte | Gesäß | Hintere Oberschenkel | 2 | MINI | Band | 12 bis 20 Wdh. | ja |
| band\_pull\_through | Band-Pull-Through | Huefte | Gesäß | Hintere Oberschenkel | 3 | BAND + ANKER/STANGE | Band | 12 bis 15 Wdh. | nein |
| hip\_thrust\_einbeinig | Hip Thrust einbeinig | Huefte | Gesäß | Hintere Oberschenkel | 3 | ERH/BANK/SCHRAEG | KG | 8 bis 15 Wdh. | nein |
| sliding\_leg\_curl | Beinbeuger mit Handtuch (Sliding Leg Curl) | Huefte | Hintere Oberschenkel | Gesäß | 4 | keins | KG | 8 bis 15 Wdh. | nein |
| kh\_hip\_thrust | Kurzhantel-Hip-Thrust | Huefte | Gesäß | Hintere Oberschenkel | 4 | KH + BANK/SCHRAEG | Last | 8 bis 15 Wdh. | nein |
| kh\_rdl | Rumänisches Kreuzheben mit Kurzhanteln | Huefte | Hintere Oberschenkel | Gesäß | 5 | KH | Last | 8 bis 12 Wdh. | nein |
| kh\_rdl\_einbeinig | Einbeiniges Kreuzheben mit Kurzhantel | Huefte | Hintere Oberschenkel | Gesäß | 5 | KH/KB | Last | 8 bis 12 Wdh. | nein |
| kb\_swing | Kettlebell-Swing | Huefte | Gesäß | Hintere Oberschenkel | 5 | KB | Last | 12 bis 20 Wdh. | ja |
| lh\_kreuzheben | Langhantel-Kreuzheben | Huefte | Hintere Oberschenkel | Gesäß, Rücken | 6 | LH | Last | 5 bis 8 Wdh. | nein |
| nordic\_curl | Nordic Curl (Füße fixiert) | Huefte | Hintere Oberschenkel | keine | 8 | keins | KG | 3 bis 8 Wdh. | nein |
| dead\_bug | Dead Bug | Rumpf | Bauch | keine | 1 | keins | KG | 8 bis 12 Wdh. | ja |
| plank | Unterarmstütz (Plank) | Rumpf | Bauch | keine | 2 | keins | Zeit | 20 bis 60 Sek. | ja |
| seitstuetz | Seitstütz | Rumpf | Bauch | keine | 2 | keins | Zeit | 20 bis 45 Sek. | ja |
| band\_pallof | Band-Pallof-Press | Rumpf | Bauch | keine | 3 | BAND + ANKER/STANGE | Band | 10 bis 15 Wdh. | nein |
| kh\_russian\_twist | Russian Twist mit Kurzhantel | Rumpf | Bauch | keine | 3 | KH/KB | Last | 10 bis 20 Wdh. | ja |
| hollow\_hold | Hollow Hold | Rumpf | Bauch | keine | 4 | keins | Zeit | 20 bis 45 Sek. | ja |
| haengendes\_knieheben | Hängendes Knieheben | Rumpf | Bauch | keine | 5 | STANGE | KG | 8 bis 15 Wdh. | nein |
| haengendes\_beinheben | Hängendes Beinheben | Rumpf | Bauch | keine | 7 | STANGE | KG | 6 bis 12 Wdh. | nein |
| band\_curls | Band-Curls | Bizeps | Bizeps | keine | 2 | BAND | Band | 12 bis 20 Wdh. | nein |
| kh\_curls | Kurzhantel-Curls | Bizeps | Bizeps | keine | 3 | KH | Last | 10 bis 15 Wdh. | nein |
| hammer\_curls | Hammer-Curls | Bizeps | Bizeps | keine | 3 | KH | Last | 10 bis 15 Wdh. | nein |
| konzentrationscurl | Konzentrationscurl | Bizeps | Bizeps | keine | 3 | KH + ERH/BANK/SCHRAEG | Last | 10 bis 15 Wdh. | nein |
| schraegbank\_curls | Schrägbank-Curls | Bizeps | Bizeps | keine | 4 | KH + SCHRAEG | Last | 10 bis 15 Wdh. | nein |
| lh\_curls | Langhantel-Curls | Bizeps | Bizeps | keine | 4 | LH | Last | 8 bis 12 Wdh. | nein |
| band\_trizeps | Band-Trizepsdrücken | Trizeps | Trizeps | keine | 2 | BAND + ANKER/STANGE | Band | 12 bis 20 Wdh. | nein |
| kh\_kickback | Kurzhantel-Kickback | Trizeps | Trizeps | keine | 2 | KH | Last | 12 bis 15 Wdh. | nein |
| bank\_dips | Dips an der Bank | Trizeps | Trizeps | Brust | 3 | ERH/BANK/SCHRAEG | KG | 10 bis 20 Wdh. | ja |
| kh\_trizeps\_ueberkopf | Trizepsdrücken über Kopf mit Kurzhantel | Trizeps | Trizeps | keine | 3 | KH | Last | 10 bis 15 Wdh. | nein |
| kh\_trizeps\_liegend | Liegendes Trizepsdrücken mit Kurzhanteln | Trizeps | Trizeps | keine | 4 | KH + BANK/SCHRAEG | Last | 10 bis 15 Wdh. | nein |
| diamond\_liegestuetz | Diamant-Liegestütz | Trizeps | Trizeps | Brust | 5 | keins | KG | 8 bis 15 Wdh. | ja |
| band\_pull\_apart | Band-Pull-Apart | Schulter | Schultern | Rücken | 2 | BAND | Band | 15 bis 20 Wdh. | nein |
| band\_seitheben | Band-Seitheben | Schulter | Schultern | keine | 2 | BAND | Band | 12 bis 20 Wdh. | nein |
| kh\_seitheben | Kurzhantel-Seitheben | Schulter | Schultern | keine | 3 | KH | Last | 12 bis 20 Wdh. | nein |
| kh\_reverse\_flys | Vorgebeugtes Seitheben (hintere Schulter) | Schulter | Schultern | Rücken | 3 | KH | Last | 12 bis 20 Wdh. | nein |
| wadenheben | Wadenheben | Waden | Waden | keine | 1 | ERH | KG | 15 bis 25 Wdh. | ja |
| wadenheben\_einbeinig | Wadenheben einbeinig | Waden | Waden | keine | 3 | ERH | KG | 10 bis 20 Wdh. | nein |
| kh\_wadenheben | Kurzhantel-Wadenheben | Waden | Waden | keine | 4 | KH + ERH | Last | 10 bis 20 Wdh. | nein |
| hampelmann | Hampelmann | Kondition | Ganzkörper | Waden | 1 | keins | KG | 20 bis 50 Wdh. | ja |
| high\_knees | Kniehebelauf auf der Stelle | Kondition | Ganzkörper | Quadrizeps | 2 | keins | KG | 20 bis 50 Wdh. | ja |
| mountain\_climbers | Mountain Climbers | Kondition | Bauch | Schultern | 3 | keins | KG | 20 bis 40 Wdh. | ja |
| seilspringen | Seilspringen | Kondition | Waden | keine | 3 | SEIL | KG | 50 bis 150 Wdh. | ja |
| skater | Skater-Sprünge | Kondition | Gesäß | Quadrizeps | 4 | keins | KG | 16 bis 30 Wdh. | ja |
| sprung\_kniebeuge | Sprung-Kniebeuge | Kondition | Quadrizeps | Gesäß | 4 | keins | KG | 10 bis 20 Wdh. | ja |
| burpees | Burpees | Kondition | Brust | Quadrizeps, Schultern | 5 | keins | KG | 8 bis 20 Wdh. | ja |
| kh\_thruster | Kurzhantel-Thruster | Kondition | Quadrizeps | Schultern, Gesäß, Trizeps | 5 | KH | Last | 8 bis 15 Wdh. | ja |

## Zirkel

Fünf feste Zirkel im Freeletics-Stil, jeweils auf Zeit. Eine Station nennt ein Muster, keine feste Übung: Die App wählt am Ort die zirkel-geeignete Variante, deren Stufe 2 unter der aktuellen Musterstufe liegt (damit das Tempo hoch bleibt), oder die bevorzugte Übung aus dem Hinweis, wenn möglich. Für dieselbe Zusammensetzung an einem Ort bleibt die Auswahl fest, damit Bestzeiten vergleichbar sind; Bestzeiten werden pro Zirkel und Ort gespeichert.

| Zirkel | Runden | Dauer | Stationen (Muster: Vorgabe) |
| --- | --- | --- | --- |
| Sprint | 4 | ca. 10 Min | Kondition: 10 (Burpees bevorzugt); Knie: 20; hDruck: 10; Kondition: 20 (Mountain Climbers bevorzugt) |
| Fundament | 5 | ca. 15 Min | Knie: 15; hDruck: 10; hZug: 10; Rumpf: 30 Sek. (Plank bevorzugt) |
| Leiter | 1 | ca. 12 Min | Stufen 2, 4, 6, 8, 10 Wiederholungen, auf jeder Stufe alle drei Stationen: hDruck, Knie, Rumpf (Dead Bug oder Knieheben) |
| Kraftprobe | 4 | ca. 15 Min | Kondition: 10 (Thruster, ohne Kurzhanteln Sprung-Kniebeuge); hZug: 10; Einbein: 10 je Seite; vDruck: 10 |
| Ausdauer | 3 | ca. 16 Min | Kondition: 50 (Hampelmann bevorzugt); Huefte: 15; hDruck: 12; Einbein: 20 gesamt; Rumpf: 30 Sek. Seitstütz je Seite |

Als Finisher (siehe Planungslogik) wird der Zirkel verwendet, dessen Dauer in die frei gebliebene Zeit passt, bevorzugt der am längsten nicht absolvierte.

## Aufwärmen

Das Aufwärmen (ca. 5 Min) setzt sich aus drei Teilen zusammen und wird beim Erzeugen der Einheit festgelegt. Es zählt nicht zum Volumen.

| Teil | Inhalt |
| --- | --- |
| Allgemein (immer, ca. 2 Min) | 60 Sek. Hampelmann, 30 Sek. Armkreisen vorwärts und rückwärts, 10 Kniebeugen ohne Last |
| Mobility für hDruck oder vDruck | 10 Wand-Slides; mit Band zusätzlich 10 Band-Pull-Aparts |
| Mobility für hZug oder vZug | 10 Schulterblatt-Rudern im Stand (ohne Gewicht); mit Stange 5 Schulterblatt-Klimmzüge |
| Mobility für Knie oder Einbein | 5 Ausfallschritte mit Oberkörperdrehung je Seite |
| Mobility für Huefte | 10 Hüftbeuger ohne Last (Good Mornings), 30 Sek. Hüftbeuger-Dehnung kniend je Seite |
| Mobility für Rumpf | 8 Katze-Kuh |
| Aufwärmsatz | 1 Satz der ersten Grundübung mit etwa 50 % der Last (bzw. leichterer Variante), 8 Wiederholungen |

Es werden höchstens drei Mobility-Zeilen gewählt, nach den Mustern mit den meisten Sätzen der Einheit.
