# Gutachten: Trainings- und Progressionslogik der Fitness-App

Nov 1, 2026 · @Andreas

## Kurzfazit

Die Logik ist fachlich solide und in ihrem Kern auf aktuellem Forschungsstand, deutlich über dem Niveau typischer Trainings-Apps. Die größten Risiken liegen nicht in den Startwerten, sondern im Messprotokoll und in einer Muskelabdeckung, die in Bewegungsmustern statt in Gelenkfunktionen denkt.

**Stärken**

- Steuerung über fraktionelle harte Sätze mit 0,5-Zählung und höchstens 10 Sätzen je Muskel und Einheit entspricht genau dem Stand der neuesten Meta-Regressionen.
- Planung ohne festen Split passt dazu, dass die Frequenz für Hypertrophie kaum eine Rolle spielt.
- Die doppelte Progression mit gedehntem Wiederholungsbereich ist gut begründet, weil Wiederholungs- und Lastprogression ähnlich wirken.
- 1 bis 3 Reserve, Supersätze, Pausenlängen und reaktive Erholungswochen sind evidenzkonform und für Training ohne Sicherung angemessen.
- Zentrale Parameter, Simulationen und offen benannte Grenzen machen das System prüfbar.

**Die sechs wichtigsten Baustellen**

1. **Mehrdeutiges Satzende und grobe Rückmeldung:** Ob das Ziel Obergrenze oder Mindestwert ist, bleibt offen; drei Kategorien nach dem Training sind gröber als die Rechenpräzision der Regeln.
2. **Ungleiche Leistungsmaße und Schwellen im Rauschen:** Bei Körpergewicht löst schon eine fehlende Wiederholung die 3-%-Schwelle aus, bei Last erst gut eine; Fehlalarme bei Volumen und Erholungswoche sind wahrscheinlich.
3. **Lücken in der Muskelabdeckung:** Es fehlt ein Kniebeuger-Muster, und Waden, langer Trizepskopf, Bizeps und seitliche Schulter hängen an Varianten, die laut Studien wenig wirken können. Die pauschale 0,5-Zählung kaschiert das.
4. **Volumen steigt ohne Fortschrittsbezug:** Die Grenze wächst nach 4 Wochen ohne Abfall, auch wenn die Leistung längst steigt. Das kostet Zeit ohne gesicherten Nutzen.
5. **Testtag mit 70 %:** Je nach Ergebnis liegt die Reserve im ersten Satz zwischen 0 und 6.
6. **Ausdauer fehlt:** Für „allgemeine Fitness“ plant die App nur die Kraft-Säule der Leitlinien.

Alle sechs Punkte lassen sich ohne Umbau der Grundarchitektur beheben; die konkrete Umsetzung steht im Abschnitt „Priorisierte Empfehlungen“.

## Ziel und Anforderungsprofil

Die App optimiert Muskelaufbau und allgemeine Fitness einer einzelnen Person pro investierter Minute, unter wechselndem Equipment, wechselnden Orten und unregelmäßigem Wochenplan. Daraus ergibt sich ein ungewöhnliches Anforderungsprofil: Die einzige „Sensorik“ ist die Selbstauskunft (Wiederholungen, kategoriales Feedback, Anstrengung), und jede Regel muss mit verrauschten Daten zurechtkommen.

**Steuer- und Messgrößen im Überblick**

| Ebene | Steuergröße | Messgröße, auf der sie beruht |
| --- | --- | --- |
| Woche | Fraktionelle harte Sätze je Muskel, persönliche Grenze G | Leistungsverlauf je Variante, Gesamtanstrengung 1 bis 5, Feedback |
| Einheit | Satzzahl, Übungswahl, Erholungsfenster | Fraktionelle Sätze der letzten Einheit, „zu schwer“ |
| Variante | Ziel-Wdh., Last, Band, Variantenstufe | Wdh. je Satz, Feedback (3 Stufen), e1RM |
| Zyklus | Erholungswoche, Variantenrotation | Leistungsabfall, Anstrengung, Volumenhistorie |

**Bewertungskriterien, die ich aus diesem Ziel ableite**

1. **Wirksamkeit:** Jeder Zielmuskel (und jede funktionell wichtige Region) erhält einen ausreichenden, nahe am Versagen liegenden Reiz.
2. **Zeiteffizienz:** Zeit ist die knappste Ressource; zusätzliches Volumen muss seinen Zeitpreis rechtfertigen.
3. **Robustheit gegen Messrauschen:** Regeln dürfen nicht auf Unterschiede reagieren, die kleiner sind als der typische Fehler von RIR-Schätzung und Tagesform.
4. **Konsistenz des Datenprotokolls:** Was der Nutzer einträgt, muss eindeutig definiert sein, sonst rechnen alle nachgelagerten Regeln mit falschen Größen.
5. **Sicherheit und Nachhaltigkeit:** Kein Training bis zum Versagen bei freien Gewichten ohne Sicherung, keine abrupten Belastungssprünge, Adhärenz vor Optimierung.
6. **Prüfbarkeit:** Jede Zahl ist entweder belegt, aus Belegen abgeleitet oder als Designentscheidung gekennzeichnet und über Simulation mit realistischem Rauschen abgesichert.

Ich kennzeichne im Folgenden die Evidenzlage je Aussage mit drei Stufen: **belegt** (Meta-Analysen oder mehrere konsistente RCTs), **begrenzt** (einzelne Studien, Mechanismus plausibel) und **Design** (keine direkte Evidenz, Abwägung).

## Unabhängige Evidenzbasis

Die aktuelle Studienlage stützt das Grundgerüst der App: Volumen in harten Sätzen ist der wichtigste dosierbare Hebel für Hypertrophie, Last und Frequenz sind zweitrangig, und 1 bis 3 Wiederholungen Reserve sind nahezu so wirksam wie Training bis zum Versagen. Die folgende Tabelle fasst zusammen, was ich ohne Blick auf die App recherchiert habe.

| Thema | Kernbefund | Evidenz | Quelle |
| --- | --- | --- | --- |
| Wochenvolumen | Positive Dosis-Wirkung mit abnehmendem Grenznutzen, für Kraft deutlich früher flach als für Hypertrophie. Laut Preprint keine nachweisbare Überlegenheit jenseits von etwa 31 fraktionellen Sätzen pro Woche (Hypertrophie) bzw. etwa 3 (Kraft). | belegt | [Pelland et al.](https://sponet.de/sponet/Record/4097139?lng=en), [Remmert et al.](https://sportrxiv.org/index.php/server/preprint/view/537) |
| Zählung indirekter Sätze | 0,5 erklärt die Daten besser als 1,0 oder 0. Explorativ lag die beste Gewichtung für Hypertrophie eher bei etwa 0,32. | belegt (0,5) / begrenzt (0,32) | [Remmert et al.](https://sportrxiv.org/index.php/server/preprint/download/537/1148/1071) |
| Volumen je Einheit | Kein nachweisbarer Zusatznutzen jenseits von etwa 11 fraktionellen Sätzen (Hypertrophie) bzw. etwa 2 direkten Sätzen der getesteten Übung (Kraft). | belegt (Preprint) | [Remmert et al.](https://sportrxiv.org/index.php/server/preprint/view/537) |
| Frequenz | Hypertrophie: etwa +0,32 % je zusätzlichem Trainingstag, Intervall schließt null ein. Kraft: etwa +3,27 % je zusätzlichem Tag. | belegt | [Remmert et al.](https://sportrxiv.org/index.php/server/preprint/download/537/1148/1071) (zitiert Pelland) |
| Nähe zum Versagen | Hypertrophie steigt, je näher am Versagen der Satz endet; Kraft kaum. 1 bis 2 Reserve und Versagen ergaben gleiche Quadrizeps-Hypertrophie, Versagen aber mehr akute Ermüdung. | belegt | [Robinson et al. 2024](https://lida.sport-iat.de/ta/Record/4089104?lng=en), [Refalo et al. 2024](https://pubmed.ncbi.nlm.nih.gov/38393985/) |
| Lastbereich | Bei Sätzen bis nahe Versagen ist Hypertrophie weitgehend lastunabhängig; Kraft profitiert von hohen Lasten. | belegt | [Lopez et al. 2021](https://pubmed.ncbi.nlm.nih.gov/33433148/) |
| Progressionsform | Steigerung über Wiederholungen und über Last führten bei Trainierten zu vergleichbarer Hypertrophie und Kraft. | begrenzt (1 RCT, 8 Wochen) | [Plotkin et al. 2022](https://peerj.com/articles/14142) |
| RIR-Genauigkeit | Menschen unterschätzen ihre Reserve im Mittel um etwa 0,95 Wdh., Streuung zwischen Personen etwa 1,45 Wdh. Genauer bei bis zu 12 Wdh. und nahe am Versagen. | belegt | [Halperin et al. 2022](https://cris.iucc.ac.il/en/publications/accuracy-in-predicting-repetitions-to-task-failure-in-resistance-/) |
| Wiederholungen je %1RM | Die Beziehung ist übungsabhängig (Beinpresse mehr Wdh. als Bankdrücken) und streut stark zwischen Personen. | belegt | [Nuzzo et al. 2024](https://pure.solent.ac.uk/en/publications/maximal-number-of-repetitions-at-percentages-of-the-one-repetitio/) |
| Satzpausen | Kleiner Hypertrophievorteil über 60 Sek., jenseits von 90 Sek. kein klarer Zusatznutzen. | begrenzt (9 Studien) | [Singer et al. 2024](https://rgu-repository.worktribe.com/output/2344312) |
| Supersätze | Gleiche chronische Anpassungen bei kürzerer Dauer, aber höheres Laktat und höhere Anstrengung. Agonist-Antagonist-Paare erlauben sogar mehr Wiederholungen. | belegt | [Zhang et al. 2025](https://digibug.ugr.es/handle/10481/102755) |
| Erholung | Versagen verlängert die Erholung um 24 bis 48 Std. Nach 4 Sätzen bis Versagen blieb die Kniebeuge-Geschwindigkeit bis 72 Std. reduziert, Bankdrücken war nach 24 Std. erholt. | begrenzt | [Morán-Navarro et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28965198/), [Belcher et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30779596/) |
| Gewöhnung (Repeated Bout) | Nach 12 Wochen Training zeigte ein exzentrischer Belastungstest kaum noch Muskelschaden (MRT-T2 +4 bis 6 % statt +52 % bei Untrainierten). | begrenzt | [Maeo et al. 2021](https://pubmed.ncbi.nlm.nih.gov/33009197/) |
| Muskellänge | Training in Dehnposition förderte Hypertrophie biartikulärer Muskeln: sitzender statt liegender Beinbeuger (+14 % statt +9 %), Überkopf-Trizeps (langer Kopf +28,5 % statt +19,6 %), stehendes statt sitzendes Wadenheben (Gastrocnemius +9 bis 12 % statt +1 bis 2 %). | begrenzt (je 1 RCT, Untrainierte) | [Maeo 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7969179/), [Maeo 2023](https://informahealthcare.com/doi/full/10.1080/17461391.2022.2100279), [Kinoshita 2023](https://frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1272106/text) |
| Teil-ROM in Dehnposition | Meta-Analyse mit möglichem, aber unsicherem Vorteil; ein späteres RCT fand gleiche Ergebnisse wie volle ROM. | begrenzt | [Wolf et al. 2023](https://doaj.org/article/99e86b317bec40f5abc2f0008358737e), [Wolf et al. 2025](https://rgu-repository.worktribe.com/OutputFile/2656095) |
| Mehrgelenkig vs. isoliert | Curls brachten mehr Ellbogenbeuger-Wachstum als Kurzhantelrudern (+11,1 % statt +5,2 %). Kniebeugen ließen hintere Oberschenkel und Rectus femoris kaum wachsen, Gesäß und Adduktoren dagegen gut. | begrenzt | [Mannarino et al. 2021](https://www.bohrium.com/scholar/88630s30/Thiago_Torres_da_Matta), [Kubo et al. 2019](https://link.springer.com/content/pdf/10.1007/s00421-019-04181-y.pdf) |
| Übungsvariation | Systematische Variation kann regionale Hypertrophie fördern; zu häufiger, zufälliger Wechsel kann schaden. | begrenzt | [Kassiano et al. 2022](https://pubmed.ncbi.nlm.nih.gov/35438660/) |
| Volumensteigerung | Individuell +20 % über dem bisherigen Volumen war einem Standardvolumen überlegen. Zusätzliche Sätze alle 2 Wochen steigerten die Kraft, der Hypertrophie-Effekt blieb unsicher. | begrenzt | [Scarpelli et al. 2022](https://pubmed.ncbi.nlm.nih.gov/32108724/), [Enes et al. 2024](https://pubmed.ncbi.nlm.nih.gov/37796222/) |
| Deload | Eine Woche Trainingspause brachte keinen Hypertrophievorteil und etwas weniger Beinkraft. Expertenkonsens definiert Deload als Phase reduzierter Belastung, meist über Volumen oder Anstrengung. | begrenzt / Konsens | [Coleman et al. 2024](https://pubmed.ncbi.nlm.nih.gov/38274324/), [Bell et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/) |
| Trainingspausen | In den ersten 3 Wochen ohne Training kein messbarer Kraftverlust; Verluste wurden beim Wiedereinstieg rasch aufgeholt. | begrenzt | [Räntilä et al. 2021](https://converis.jyu.fi/converis/portal/detail/Publication/89729816), [Scand J Med Sci Sports 2024](https://pubmed.ncbi.nlm.nih.gov/39364857/) |
| Monitoring | Subjektive Maße (Stimmung, Stress, Erholung) bilden Belastung empfindlicher und konsistenter ab als objektive. Session-RPE auf der CR-10-Skala ist für Krafttraining reliabel. | belegt | [Saw et al. 2016](https://www.omicsdi.org/dataset/biostudies-literature/S-EPMC4789708), [Day et al. 2004](https://paulogentil.com/pdf/TREINO%20DE%20FORC%CC%A7A/Monitoring%20Exercise%20Intensity%20During%20Resistance%20Training%20Using%20the%20Session%20RPE%20Scale.pdf) |
| Kraft plus Ausdauer | Kein Nachteil für Hypertrophie und Maximalkraft; Schnellkraft leidet, vor allem in derselben Einheit. | belegt | [Schumann et al. 2022](https://pubmed.ncbi.nlm.nih.gov/34757594/) |
| Beweglichkeit | Krafttraining mit externer Last verbessert die Beweglichkeit ähnlich wie Dehnen; reines Körpergewichtstraining zeigte keinen signifikanten Effekt. | belegt | [Alizadeh et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36622555/) |
| Gesundheit | Stärkste Risikosenkung bei etwa 30 bis 60 Min. Krafttraining pro Woche; kombiniert mit Ausdauer etwa 40 % geringere Gesamtsterblichkeit. WHO: 150 bis 300 Min. moderat oder 75 bis 150 Min. intensiv plus 2 Krafttage. | belegt (Kohorten) | [Momma et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9209691/), [Bull et al. 2020](https://pure.qub.ac.uk/en/publications/world-health-organization-2020-guidelines-on-physical-activity-an/) |
| Zirkeltraining | Kraft-Zirkel erhöhen die maximale Sauerstoffaufnahme messbar. | begrenzt | [Muñoz-Martínez et al. 2017](https://repositorio.ucam.edu/handle/10952/3070?show=full) |
| Verletzungsprävention | Programme mit Nordic Hamstring Curls halbierten die Rate von Oberschenkelverletzungen bei Sportlern. | belegt | [van Dyk et al. 2019](https://bjsm.bmj.com/content/53/21/1362) |

**Was ein ideales System daraus ableiten müsste**

1. Volumen je Muskel als Hauptsteuergröße, moderat dosiert, mit höchstens etwa 10 bis 11 fraktionellen Sätzen je Muskel und Einheit.
2. Anstrengung zwischen 0 und 3 Reserve; Versagen nur dort, wo es sicher ist (Isolation, Körpergewicht).
3. Datenqualität vor Regelkomplexität: Die Reserve ist auf etwa 1 bis 1,5 Wdh. ungenau, also brauchen alle Schwellen Abstand zu diesem Rauschen und regelmäßige Kalibrierung.
4. Übungsauswahl nach Gelenkfunktion und Muskellänge, nicht nur nach Bewegungsmustern; biartikuläre Muskeln brauchen eigene Übungen.
5. Progression über Wiederholungen ist gleichwertig zur Lastprogression, was zu Kurzhanteln mit groben Sprüngen passt.
6. Erholung und Deload reaktiv und individuell, mit subjektiven Markern statt nur Leistungsdaten.
7. „Allgemeine Fitness“ schließt Ausdauer ein; sie gehört in die Planung, nicht nur in Zirkel.

## Abgleich: Volumensteuerung

Die Volumensteuerung ist das stärkste Element der App: Steuergröße, Startwerte und die Grenze je Einheit liegen mitten in der Evidenz. Schwächen liegen in der pauschalen 0,5-Zählung, in der Anpassungsregel der persönlichen Grenze und in zwei kleinen Rechenschärfen.

| Element | Bewertung | Empfehlung |
| --- | --- | --- |
| Startgrenze 10 (normal) / 12 (hoch), Obergrenze 16 / 20 | Passend für das Ziel „Ergebnis pro Minute“: deutlich unter dem Punkt, ab dem kein Zusatznutzen mehr nachweisbar ist (etwa 31), aber im steilen Teil der Kurve. | Beibehalten. Optional für „Erfahren“ mit Zeitüberschuss eine Obergrenze bis 24 bei hoher Priorität zulassen. |
| Höchstens 10 fraktionelle Sätze je Muskel und Einheit | Deckt sich fast exakt mit dem Wert von etwa 11 aus der Meta-Regression. | Beibehalten. |
| 0,5 für jeden Sekundärmuskel | Als Standard gut begründet, anatomisch aber zu grob. Rudern liefert etwa den halben Bizepsreiz von Curls; Drücken lässt den langen Trizepskopf kaum in Dehnposition arbeiten; Hip Thrust trainiert die hinteren Oberschenkel kaum. | Faktor je Übung und Muskel hinterlegen (0,25 bis 0,75 statt pauschal 0,5) und für Bizeps, Trizeps, seitliche Schulter, hintere Oberschenkel und Waden einen Mindestanteil direkter Sätze vorgeben, z. B. 4 pro Woche. |
| Armvolumen bei 2 Einheiten (5,5 von 12 direkt) | Für das Ziel Muskelaufbau nicht vertretbar, wenn Arme Priorität haben; zeitlich leicht lösbar. | Bei Prognose 1 bis 2 Armisolation wie Bauch und Waden außerhalb des Budgets anhängen, als Supersatz-Partner der Grundübungen (Curl zu Drücken, Trizeps zu Ziehen), je 2 bis 3 Sätze. Kosten etwa 3 Minuten. |
| Budget B verteilt auch auf Bauch und Waden | Beide laufen außerhalb des Zeitbudgets, erhalten aber einen Anteil an B. Bei „alle normal“ sinkt der rechnerische Anteil der übrigen 8 Muskeln dadurch um 20 % (bei 2 Einheiten 9,5 statt 11,9 Sätze). | Summe der Gewichte nur über die Muskeln bilden, die das Budget tatsächlich verbrauchen. |
| Prognose aus geplanten Tagen | Überplanung führt systematisch zu Unterversorgung (Szenario „ohne Korrektur“: Oberkörper 6 bis 10 von 12). | Prognose mit der persönlichen Einhaltungsquote der letzten 4 Wochen gewichten: erledigt plus verbleibende geplante Tage mal Quote. |
| Ziel „Kraft“ | Ändert nur den Wiederholungsbereich. Für Kraft zählen aber vor allem direkte Sätze der Zielbewegung, Frequenz und schwere Lasten. Der strikte A/B-Wechsel halbiert die Frequenz der einzelnen Variante. | Bei Ziel Kraft die Testvariante häufiger setzen (z. B. A, A, B) und je Einheit 2 bis 3 direkte Sätze im unteren Bereich (4 bis 8 Wdh.), soweit mit Kurzhanteln sicher. |

**Anpassung der persönlichen Grenze**

Die Regel erhöht das Volumen nach 4 Wochen ohne Leistungsabfall, auch wenn die Leistung längst steigt. Das kostet Zeit, ohne dass ein Zusatznutzen gesichert ist: Bei Trainierten brachten 12, 18 und 24 Sätze pro Woche ähnliche Hypertrophie, und der Nutzen zusätzlicher Sätze war in Studien mit schrittweiser Steigerung unsicher. Belegt ist dagegen, dass eine individuelle Steigerung um etwa 20 % über dem gewohnten Volumen besser wirkte als ein Standardvolumen.

Ich empfehle deshalb eine fortschrittsgesteuerte Regel (Design, gestützt auf die genannten Befunde):

| Lage über 4 Wochen | Anpassung |
| --- | --- |
| Leistungstrend steigt deutlich über dem Messrauschen | Volumen halten; der Reiz reicht offenbar. |
| Leistung stagniert, Erholung und subjektive Marker gut | +2 Sätze (entspricht etwa +20 % bei 10 Sätzen). |
| Leistung fällt im Trend oder subjektive Marker zeigen Überlastung | −2 Sätze, nicht unter Untergrenze plus 2 (wie bisher). |

Die Schwelle „mehr als 3 % Abfall“ ist für Körpergewicht und Band außerdem viel zu empfindlich; das erläutert der nächste Abschnitt.

## Abgleich: Intensität und Datenqualität

Die größte methodische Schwachstelle liegt im Messprotokoll, nicht in den Parametern: Was ein eingetragener Satz bedeutet, ist nicht eindeutig, und die Rückmeldung ist gröber als die Präzision, mit der die Regeln rechnen. Jede nachgelagerte Regel erbt diese Unschärfe.

**1. Mehrdeutiges Satzende**

Das Dokument sagt, das Ziel gelte für alle Sätze und der Nutzer höre bei 1 bis 3 Reserve auf. Das Chinup-Beispiel (9 · 8 · 8 · 7 · 7 bei Ziel 5) zeigt aber, dass das Ziel übertroffen wird. Gleichzeitig kann „zu leicht“ (4 oder mehr Reserve) nur auftreten, wenn jemand beim Ziel stoppt. Beide Lesarten erzeugen verschiedene Daten:

- **Ziel als Obergrenze:** Die Wiederholungen sind abgeschnitten. „Leistung im ersten Satz“ misst dann vor allem das Ziel selbst, nicht die Leistungsfähigkeit.
- **Ziel als Mindestwert:** Die Daten sind unverzerrt, aber „zu leicht“ ist kaum möglich, und die Satzdauer schwankt.

**Empfehlung:** Arbeitssätze mit festem Ziel; der letzte Satz jeder Übung endet bei definierter Reserve (Grundübung 1, Körpergewicht 1, Isolation 0). Dieser Messsatz liefert je Übung und Einheit einen unverzerrten Wert, die übrigen Sätze bleiben zeitlich planbar.

**2. Rückmeldung zu grob und zu spät**

Drei Kategorien, einmal nach dem Training erfasst, werden auf Reserve 4, 2 oder 1 abgebildet. „Zu leicht“ ist nach oben offen und steht für 4 bis 8. Allein ein Kategorienwechsel verschiebt die Kraftschätzung bei identischer Leistung: von „passend“ zu „zu schwer“ bei 12 Wdh. um −2,3 %, von „zu leicht“ zu „passend“ bei 10 Wdh. um −4,5 %.

**Empfehlung:** Direkt nach dem Messsatz die Reserve antippen (0, 1, 2, 3, 4, 5+). Die drei Kategorien lassen sich daraus automatisch ableiten; der Aufwand liegt bei etwa 2 Sekunden je Übung.

**3. Kalibrierung der Selbsteinschätzung**

Menschen unterschätzen ihre Reserve im Mittel um etwa eine Wiederholung. Wer „2 Reserve“ schätzt, hat also eher 3; das Band „passend = 1 bis 3“ liegt real oft bei 2 bis 4. Die App kalibriert bisher nur indirekt über Max-Tests und „zu leicht“.

**Empfehlung:**

1. Letzten Isolationssatz bis zum technischen Versagen führen; das liefert die Kapazität ohne Schätzfehler.
2. Bei jedem Max-Test vorhergesagte und erreichte Wiederholungen vergleichen und daraus einen persönlichen Schätzfehler ableiten.
3. Alle 4 bis 6 Wochen ein „Reserve-Check“ in einer sicheren Übung: bei geschätzter Reserve 2 kurz stoppen, Schätzung eintragen, dann bis zum Versagen weitermachen.
4. Den gespeicherten persönlichen Fehler bei allen künftigen Reserve-Angaben berücksichtigen.

**4. Uneinheitliches Leistungsmaß**

Last wird über die Kraftschätzung bewertet, Körpergewicht und Band über die Wiederholungen im ersten Satz. Eine Wiederholung weniger bei 10 Wdh. sind bei Körpergewicht −10 %, bei Last aber nur etwa −2,3 %. Die 3-%-Schwelle der Volumenanpassung schlägt bei Körpergewicht daher bei jeder einzelnen fehlenden Wiederholung an. Auch die Auslöser der Erholungswoche sind ungleich (Last: 1 Wdh., Körpergewicht: 2 Wdh.).

**Empfehlung:** Ein gemeinsames Maß für alle Lasttypen. Kapazität K = Wiederholungen plus Reserve des Messsatzes; die relative Änderung ist dann ΔK ÷ (30 + K). Damit entspricht eine Wiederholung bei jedem Lasttyp etwa 2 bis 3 %. Halteübungen bekommen eine eigene Schwelle in Sekunden.

**5. Schwellen liegen im Messrauschen**

Ein Schätzfehler von einer Wiederholung bewegt die Kraftschätzung um gut 2 %, Tagesform kommt hinzu. Die Glättung mit 50 % senkt die Streuung auf etwa 58 % und verzögert um etwa eine Einheit. Eine Schwelle von 3 % liegt damit nur bei etwa ein bis zwei Standardabweichungen des Rauschens; über Monate sind Fehlalarme wahrscheinlich.

**Empfehlung:** Entscheidungen über Volumen und Erholungswochen auf den Trend der letzten 4 Wochen stützen (robuste Regressionssteigung mit Unsicherheitsband). Als Schwelle mindestens das Doppelte des persönlichen typischen Fehlers, den die App aus den eigenen Daten schätzt. Die kurzfristige Glättung bleibt für die Lastwahl.

**6. Ziel-Reserve**

1 bis 3 Reserve bei Grundübungen ist für Training allein zu Hause ohne Sicherung richtig und gut belegt. Weil die Hypertrophie mit sinkender Reserve zunimmt und Selbsteinschätzungen systematisch zu vorsichtig sind, sollte der Standard für Muskelaufbau eine *gefühlte* Reserve von 1 bis 2 sein; 2 bis 3 bleibt die schonende Option.

**7. Isolation mit 0 bis 1 im letzten Satz**

Fachlich sinnvoll: geringes Risiko, näher am Hypertrophie-Optimum und, richtig genutzt, der genaueste Datenpunkt der ganzen App. Das Feedback muss dann aber wissen, dass dieser Satz anders definiert ist; sonst wird „passend“ mit Reserve 2 verrechnet, obwohl sie 0 war.

## Abgleich: Kraftschätzung und Progression

Die doppelte Progression ist fachlich gut begründet, denn Steigerung über Wiederholungen wirkt ähnlich wie Steigerung über Last. Die Rechenkette dahinter stapelt jedoch mehrere vorsichtige Annahmen und sollte ihre wichtigsten Größen aus den eigenen Daten lernen.

**Formel mit Teiler 30**

Für Entscheidungen innerhalb derselben Variante ist die Formel brauchbar, weil sich systematische Fehler weitgehend herauskürzen. Beim Lastsprung zählt aber die Steigung (Wiederholungen je kg), und die hängt von Übung und Person ab. Je höher die Wiederholungszahl, desto unsicherer werden Formel und Reserve-Schätzung zugleich.

**Empfehlung:** Sobald eine Variante Messsätze bei zwei Lasten hat, einen persönlichen Teiler k schätzen und mit 30 als Vorwert mitteln (gewichtet nach Datenmenge):

```latex
k = \frac{L_1 K_1 - L_2 K_2}{L_2 - L_1}, \qquad K = \text{Wdh.} + \text{Reserve}
```

Beispiel: 16 kg mit K = 14 und 18 kg mit K = 10 ergeben k = 22. Diese Person verliert beim Lastsprung also mehr Wiederholungen, als die Standardformel annimmt.

**Verzerrungskette**

Jeder der folgenden Schritte ist für sich vertretbar; zusammen erklären sie, warum die Simulation bis zu 3 % unter der echten Kraft lag und die erste Laststeigerung erst in Woche 3,5 bis 5,1 (spätestens 9) kam.

1. Gewertet wird der beste Satz, die Reserve kommt aber aus dem Übungsfeedback, das sich meist nach dem letzten, härtesten Satz anfühlt.
2. „Zu leicht“ zählt als 4, obwohl es nach oben offen ist.
3. Mögliche Wiederholungen werden abgerundet.
4. Die Ziel-Reserve wird abgezogen.
5. Pauschal eine Wiederholung Ermüdung je weiterem Satz.
6. Die Glättung mischt während eines Kraftzuwachses ältere, niedrigere Werte bei.

**Empfehlung:** Kraftschätzung aus dem Messsatz mit dessen eigener Reserve; nur eine explizite Sicherheitsmarge behalten (die Ziel-Reserve); Ermüdung lernen statt pauschal abziehen.

**Ermüdung je Satz**

Eine Wiederholung je weiterem Satz bei 1 bis 3 Reserve und 90 Sek. Pause ist als Startwert plausibel. Der Wiederholungsverlust ist beim Training bis zum Versagen deutlich größer als mit Reserve, und Agonist-Antagonist-Paare erlauben sogar mehr Wiederholungen. Der wahre Wert hängt also stark von Übung, Person und Format ab.

**Empfehlung:** Die Ausgleichsgerade, die für Körpergewicht schon existiert, für alle Lasttypen nutzen: Steigung je Variante, Vorwert −1, begrenzt auf −2 bis 0. Damit Daten entstehen, z. B. jede vierte Einheit alle Sätze bis zur Ziel-Reserve ausführen lassen.

**Lastsprünge bei Kurzhanteln**

Die Dehnung bis O plus 3 vor dem Sprung und „Ziel ab U minus 1“ danach sind gut begründet: Hypertrophie ist in diesem Bereich weitgehend lastunabhängig, und Wiederholungsprogression wirkt ähnlich wie Lastprogression. Der Preis sind Sätze über 12 Wiederholungen, in denen die Reserve ungenauer geschätzt wird. Drei Werkzeuge glätten den Übergang (Design):

| Werkzeug | Umsetzung | Beispiel |
| --- | --- | --- |
| Mischlast (Top-Satz) | Satz 1 mit der nächsten Hantel, restliche Sätze mit der alten Last. Erreicht der Top-Satz U plus 2, wandert der nächste Satz mit. | Nach 16 kg × 13 „passend“ (Kraftschätzung 24,0 kg): Satz 1 mit 18 kg, Ziel 8 (Schätzung 10 minus 2 Reserve); Sätze 2 und 3 mit 16 kg. |
| Mikrolasten | Gewichtsmanschetten mit 0,5 bis 1 kg oder Aufsteckscheiben als eigene Laststufen im Equipment hinterlegen. | 16 → 17 → 18 kg statt eines 12,5-%-Sprungs. |
| Tempo und Pause | Langsames Absenken oder Pause in Dehnposition schon als Zwischenstufe vor dem Sprung, nicht erst am Ende der Lastleiter. | 16 kg mit 3 Sek. Absenken, Ziel U. |

**Wechsel des Wiederholungsbereichs je Zyklus (optional)**

Für Hypertrophie bringt ein Wechsel zwischen schweren und leichten Phasen keinen eigenen Vorteil, solange die Sätze nah am Versagen enden. Sinnvoll ist er aus anderen Gründen: schwere Phasen für das Ziel Kraft, leichtere zur Entlastung von Gelenken und wenn die Hanteln nicht mehr reichen. Empfehlung: kein Wechsel von Einheit zu Einheit, sondern optional je Zyklus den Bereich der Grundübungen verschieben (z. B. 6 bis 10, dann 10 bis 15); das hält die Kraftschätzung stabil. Isolation bleibt dauerhaft im höheren Bereich (Design auf Basis belegter Lastbefunde).

**Körpergewicht und Band**

Die Ausgleichsgerade über alle Sätze ist eine gute Idee, der Deckel „bester erster Satz plus 2“ schützt sinnvoll vor Ausreißern. Der Variantenwechsel bei O (meist 15) ist zeitlich und messtechnisch richtig gesetzt. Das Problem sind die Stufenabstände: Der Sprung von Liegestütz zu Liegestütz mit erhöhten Füßen ist oft größer als jeder Hantelsprung.

**Empfehlung:** Zwischenstufen als eigene Varianten im Katalog: 3 Sek. Absenken, Pause in Dehnposition, Defizit (Hände erhöht), zusätzliches Band über dem Rücken, Rucksack mit Gewicht. Bänder lassen sich kombinieren, um feinere Stufen zu erzeugen.

**Testtag: Startziel 70 %**

70 % des Maximums erzeugen je nach Ergebnis sehr unterschiedliche Reserven, und die Begrenzung auf den Bereich kann das Ziel sogar ans Versagen schieben (Liegestütz, Bereich 8 bis 15):

| Max-Ergebnis | 70 % | Ziel (gerundet, auf den Bereich begrenzt) | Reserve im ersten Satz |
| --- | --- | --- | --- |
| 8 | 5,6 | 8 | 0 (Versagen) |
| 12 | 8,4 | 8 | 4 |
| 20 | 14 | 14 | 6 |

Ab 21 wird zudem die schwerere Decline-Variante gewählt, das Ziel stammt aber aus der leichteren Testübung. Das ist nur unkritisch, wenn hier die Kalibrierungsregel für neue Varianten greift.

**Empfehlung:** Startvariante so wählen, dass das Testergebnis zwischen U plus 3 und O plus 3 liegt (Liegestütz: 11 bis 18). Startziel im ersten Satz = Maximum minus 3, Folgesätze über das Ermüdungsmodell. Darunter die leichtere Variante, darüber die schwerere mit Kalibrierungssatz.

## Abgleich: Erholung, Erholungswochen und Pausen

Die Erholungslogik ist plausibel und eher vorsichtig, behandelt aber alle Muskeln, Übungen und Gewöhnungszustände gleich und schaltet binär. Die Evidenz spricht für drei Differenzierungen und für subjektive Marker als zusätzliche Signalquelle.

**Erholungsfenster**

Die Basiswerte von 24 bis 72 Std. passen zur Studienlage für Training mit Reserve: Versagen verlängert die Erholung um 24 bis 48 Std., ohne Versagen erholen sich Leistungsmarker meist innerhalb von 24 bis 48 Std. Unterschiede zeigen sich aber zwischen Körperregionen und vor allem zwischen gewohnten und neuen Reizen.

| Zuschlag oder Regel | Begründung | Evidenz |
| --- | --- | --- |
| Beine (Knie, Einbein, Huefte) ab 6 fraktionellen Sätzen: +12 Std. | Nach Sätzen bis zum Versagen blieb die Kniebeuge-Geschwindigkeit bis 72 Std. reduziert, Bankdrücken war nach 24 Std. erholt. | begrenzt |
| Neue Variante oder 4 Wochen nicht trainiert: +24 Std. | Gewohnte Muskeln zeigten nach exzentrischer Belastung kaum Schaden, ungewohnte sehr viel mehr (Repeated-Bout-Effekt). | begrenzt |
| Exzentrisch betonte Übungen (Nordic Curl, 3 Sek. Absenken, rumänisches Kreuzheben): +12 bis 24 Std. bei den ersten 3 Expositionen | Exzentrische Arbeit in Dehnposition erzeugt den größten Muskelschaden; die Gewöhnung baut ihn rasch ab. | begrenzt |
| Weiche statt harter Schranke | Nach 75 % des Fensters und höchstens leichtem Muskelkater 50 % des Bedarfs zulassen statt 0. | Design |
| Muskelkater-Abfrage vor dem Start | Ein Tippen je Region (Oberkörper, Beine) auf einer Skala 0 bis 3; subjektive Maße bilden Belastung empfindlicher ab als objektive. | belegt (Monitoring) |

**Erholungswochen**

Die reaktive Lösung ist vertretbar, denn die Evidenz für feste Deload-Rhythmen ist dünn. Die zitierte Studie von Coleman et al. prüfte allerdings eine komplette Trainingspause, keine Woche mit halbem Volumen; sie stützt nur die Aussage, dass eine Pause keinen Hypertrophievorteil bringt. Für reduzierte Deloads gibt es vor allem Expertenkonsens.

| Auslöser | Bewertung | Empfehlung |
| --- | --- | --- |
| Leistungsabfall bei 2 Mustern in 2 Einheiten | Sinnvolle Idee, aber ungleiche Schwellen (Last 1 Wdh., Körpergewicht 2 Wdh.) und nahe am Rauschen. | Gemeinsames Kapazitätsmaß und Trend über 4 Wochen (siehe Datenqualität). |
| Gesamtanstrengung im Schnitt mindestens 4,5 von 5 | Die 5er-Skala ist nicht validiert; 4,5 bedeutet fast nur noch Höchstwerte. | Session-RPE auf der CR-10-Skala etwa 30 Min. nach dem Training; Auslöser, wenn der Schnitt der letzten 4 Einheiten mindestens 1,5 Punkte über dem persönlichen 8-Wochen-Mittel liegt. |
| 10 Wochen ohne Woche unter 60 % | Gutes Sicherheitsnetz. | Beibehalten. |
| Fehlt: subjektives Befinden | Schlaf, Stress, Motivation und Muskelkater reagieren früh und konsistent auf Überlastung. | Wöchentlich 4 Fragen (Skala 1 bis 5); Auslöser, wenn der Schnitt 2 Wochen in Folge mindestens 1 Punkt unter dem persönlichen Mittel liegt. |
| Fehlt: Gelenkschmerz | Kein Deload-Grund, sondern ein Grund für Übungstausch. | Schmerz je Übung erfassen (ja/nein); bei Wiederholung Variante mit anderem Gelenkwinkel oder Lasttyp anbieten. |

**Gestaltung der Erholungswoche:** 50 % Volumen bei gleicher Last ist gute Praxis. Weil akute Ermüdung vor allem von der Nähe zum Versagen abhängt, empfehle ich zusätzlich eine Wiederholung mehr Reserve (Design). Die Last bleibt, damit kein Kraftverlust entsteht.

**Trainingspausen**

In den ersten 3 Wochen ohne Training ist kein Kraftverlust messbar, und Verluste nach längeren Pausen werden rasch aufgeholt. Die App-Regeln sind daher vorsichtiger als nötig, aber harmlos; ihr eigentlicher Nutzen ist die Begrenzung von Muskelkater, weil der Gewöhnungsschutz mit der Zeit nachlässt.

**Empfehlung:** Rückkehr leistungsgesteuert statt zeitgesteuert. Die erste Einheit je Muster nach der Pause bleibt wie geplant leichter; liegt die Kapazität dort bei mindestens 95 % des Werts vor der Pause, gilt ab sofort wieder das normale Ziel. Die 70-%-Volumenregel gilt dann nur für die erste Woche, auch nach mehr als 21 Tagen. Pausen wegen Krankheit mit Fieber separat markieren und dort vorsichtiger bleiben (Design).

## Abgleich: Übungsauswahl und Muskelabdeckung

Die größte inhaltliche Lücke liegt im Mustermodell: Es bildet die Gelenkfunktionen biartikulärer Muskeln und die Muskellänge nicht ab. Dadurch können hintere Oberschenkel, Waden, langer Trizepskopf und Bizeps zu wenig echten Reiz bekommen, obwohl ihr Volumenkonto voll aussieht.

| Muskel | Problem im aktuellen Modell | Empfehlung |
| --- | --- | --- |
| Hintere Oberschenkel | Es gibt kein Kniebeuge-Muster. Weder Kniebeugen noch Hip Thrust ließen sie in Studien messbar wachsen. Kniebeugung in Dehnposition (sitzend) wirkte deutlich stärker als in Verkürzung. | Neues Muster „Kniebeuger“: Nordic Curl (zusätzlich verletzungspräventiv), Slider- oder Handtuch-Curl, Band-Beincurl. Im Muster Huefte rumänisches Kreuzheben für die hinteren Oberschenkel mit 1,0 zählen, Hip Thrust und Brücke nur mit 0,25. |
| Waden | Stehendes Wadenheben ließ den Gastrocnemius wachsen, sitzendes kaum. | Stehende, einbeinige Variante mit Defizit (Ferse unter Stufenniveau) als Standard; sitzende Varianten nur als Ergänzung für den Soleus. |
| Trizeps | Drücken trainiert den langen Kopf kaum in Dehnposition; Überkopf-Strecken brachte deutlich mehr Wachstum als Pushdowns. | Mindestens eine Überkopf-Variante als Hauptvariante der Trizeps-Isolation (Kurzhantel, Band hinter dem Körper verankert). |
| Bizeps | Rudern lieferte etwa den halben Reiz von Curls. | Curls bevorzugen, besonders Varianten mit gestrecktem Arm hinter dem Körper (Schrägbank-Curl). |
| Schultern | Eine Gruppe vermischt vordere, seitliche und hintere Anteile. Der vordere Anteil wird durch Drücken gut versorgt, der seitliche kaum. | In vordere, seitliche und hintere Schulter aufteilen, oder zumindest Seitheben als Pflicht-Isolation führen. Vordere Schulter aus Drücken mit etwa 0,75 zählen. |
| Quadrizeps (Rectus femoris) | Kniebeugen lassen den biartikulären Rectus femoris kaum wachsen. | Optional Knieextension: Band-Beinstrecker, Sissy Squat, Reverse Nordic. |
| Gesäß, Adduktoren | Tiefe Kniebeugen trainieren beide gut; flache deutlich weniger. | Zählung 0,5 beibehalten, volle Tiefe als Standard. |

**Muskellänge als Auswahlkriterium**

Training in Dehnposition hatte in mehreren Studien Vorteile, ein großes RCT mit Teilwiederholungen in Dehnposition fand dagegen gleiche Ergebnisse wie volle Bewegungsamplitude. Die robuste Folgerung lautet: volle Amplitude mit Betonung der Dehnposition. In die Rangfolge der Variantenwahl gehört deshalb ein Kriterium „Last in Dehnposition“.

Bänder sind hier ein Sonderfall: Ihr Zug ist am kleinsten, wo das Band am wenigsten gedehnt ist, und das ist bei vielen Übungen genau die Dehnposition des Muskels (z. B. Band-Curl mit gestrecktem Arm). Die App sollte Bandvarianten so beschreiben, dass das Band vorgespannt ist, oder für dehnungsabhängige Übungen Hanteln bevorzugen (physikalische Ableitung, Design).

**Variation**

Feste Hauptvarianten je Zyklus mit Wechsel von A und B und ein Tausch der Nebenübungen alle 6 Wochen entsprechen dem, was die Literatur als systematische Variation empfiehlt. Für das Ziel Kraft gilt die Einschränkung aus dem Volumenabschnitt: Die Testvariante braucht mehr Frequenz.

**Zeitmodell**

Einseitige Übungen (Einbein-Muster, einarmiges Rudern, einbeiniges Wadenheben) kosten pro Satz etwa doppelt so viel Zeit, weil beide Seiten nacheinander arbeiten. 45 Sek. je Satz unterschätzen sie systematisch, und der gleitende Mittelwert je Format gleicht das nur im Schnitt aus. Empfehlung: Zeitfaktor je Übung (einseitig etwa 1,8) und gemessene Dauer je Übung statt je Format.

**Pausen und Zirkel**

90 Sek. bei Grundübungen und die Kombi-Pausen liegen im gut belegten Bereich; tatsächlich ruht jeder Muskel im Supersatz etwa 105 Sek. 60 Sek. bei Isolation liegen an der Untergrenze; bei Zeitüberschuss 75 bis 90 Sek. Im Zirkel sollte eine Station nur dann 0,5 Sätze zählen, wenn sie mit höchstens 3 Reserve endet; Stationen mit Musterstufe minus 2 und fester Zeit liegen oft weiter vom Versagen entfernt (Design).

## Allgemeine Fitness: Ausdauer, Beweglichkeit, Monitoring

Für das erklärte Ziel „allgemeine Fitness“ fehlt der App die zweite Säule aller Leitlinien: Ausdauertraining wird weder geplant noch gezählt. Gleichzeitig liegt das Krafttraining mit typischen 3 × 40 Min. bereits über der Dosis, die gesundheitlich den größten Effekt zeigt.

**Ausdauer**

Die WHO empfiehlt 150 bis 300 Min. moderate oder 75 bis 150 Min. intensive Ausdauer pro Woche plus mindestens 2 Krafttage. In Kohortendaten war die Kombination beider Formen mit etwa 40 % geringerer Gesamtsterblichkeit verbunden. Kraft-Zirkel verbessern zwar die maximale Sauerstoffaufnahme, ersetzen diese Minuten aber nicht.

**Empfehlung:**

1. Wochenziel für Ausdauerminuten führen (manuelle Erfassung oder Import), getrennt nach moderat und intensiv.
2. Bei Ziel „Ausdauer“ 2 bis 3 Einheiten einplanen, davon höchstens eine intensiv.
3. Laufen und Radfahren im Erholungsmodell der Beine berücksichtigen; Laufen belastet exzentrisch und wirkt damit ähnlich wie zusätzliche Beinsätze (Design).
4. Kraft und Ausdauer am selben Tag mindestens 3 Std. trennen, wenn Schnellkraft wichtig ist; für Hypertrophie und Maximalkraft ist die Reihenfolge laut Meta-Analyse unerheblich.

**Beweglichkeit**

Krafttraining mit externer Last verbessert die Beweglichkeit ähnlich wie Dehnen; reines Körpergewichtstraining zeigte in der Meta-Analyse keinen signifikanten Effekt. Ein eigenes Mobility-Modul ist deshalb nur in Phasen mit reinem Körpergewicht (z. B. Hotel) oder bei konkreten Einschränkungen nötig. Wichtiger ist volle Bewegungsamplitude als Standard in allen Varianten.

**Schnellkraft (optional)**

Schnellkraft reagiert am empfindlichsten auf zusätzliches Ausdauertraining. Für allgemeine Fitness, besonders mit zunehmendem Alter, lohnt sich ein kleiner Block: Konzentrische Phase mit maximaler Bewegungsabsicht und 1 bis 2 Mal pro Woche wenige Sprünge am Anfang einer Einheit (Design).

**Fortschritt jenseits der Kraft**

Die App misst Leistung, aber nicht Muskelmasse. Für eine Einzelperson sind einfache, standardisierte Messungen alle 4 Wochen sinnvoll: Körpergewicht, Taille, Oberarm- und Oberschenkelumfang zur selben Tageszeit mit demselben Maßband, dazu Fotos. Das ist verrauscht, macht aber über Monate sichtbar, ob Leistungszuwächse auch Masse bedeuten (Design).

## Antworten auf die Prüffragen

Sieben der elf Fragen lassen sich mit „ja, mit Ergänzung“ beantworten; bei Volumenanpassung, Armvolumen, Erholungswochen-Auslösern und Testtag empfehle ich eine Änderung der Logik.

| Frage | Kurzantwort | Änderung |
| --- | --- | --- |
| Volumen: 10/12 Start, 16/20 Obergrenze, 10 je Einheit | Ja. Zeiteffizient und im steilen Teil der Dosis-Wirkungs-Kurve; 10 je Einheit trifft den belegten Wert von etwa 11. | Keine; optional höhere Obergrenze für „Erfahren“. |
| Zählung 0,5, Armvolumen bei 2 Einheiten | 0,5 als Standard ja, anatomisch aber zu grob. Das Armdefizit ist für Muskelaufbau nicht vertretbar. | Faktor je Übung und Muskel, Mindestzahl direkter Sätze; Arme bei 1 bis 2 Einheiten außerhalb des Budgets als Supersätze. |
| Anpassung der Volumengrenze | −2 bei Warnzeichen ja. +2 nach 4 „guten“ Wochen ohne Fortschrittsbezug nein; 3 % ist bei Körpergewicht eine einzige Wiederholung. | Fortschrittsgesteuert (halten bei Fortschritt, +2 bei Stagnation), gemeinsames Kapazitätsmaß, Trend über 4 Wochen. |
| Erholungsfenster 24 bis 72 Std. | Als Basis ja. | Zuschläge für Beine, neue Varianten und exzentrisch betonte Übungen; weiche statt harter Schranke; Muskelkater-Abfrage. |
| Kraftschätzung | Für relative Entscheidungen bis etwa 12 Wdh. ausreichend. Die Reserven 4/2/1 sind zu grob, die Glättung taugt für die Lastwahl, nicht für Trends. 1 Wdh. Ermüdung je Satz ist ein plausibler Startwert. | Reserve des Messsatzes direkt erfassen; persönlichen Teiler und Ermüdungssteigung lernen. |
| Laststeigerung bei Kurzhanteln | Ja, die Dehnung bis O plus 3 und „Ziel ab U minus 1“ sind ein guter Umgang. | Mischlast (Top-Satz), Mikrolasten und Tempo als Zwischenstufen ergänzen. |
| Körpergewicht: Ausgleichsgerade, Deckel, Wechsel bei O | Ja zu allen drei Punkten. | Satzende eindeutig definieren; Zwischenstufen (Tempo, Pause, Defizit, Band, Rucksack) als Varianten. |
| Erholungswochen | Reaktiv und 50 % Volumen sind vertretbar; die Evidenz ist dünn. Es fehlt subjektives Befinden als Auslöser. | Wellness-Fragen, Session-RPE auf CR-10, eine Wiederholung mehr Reserve während der Erholungswoche. |
| Trainingspause | Vorsichtiger als nötig, aber harmlos. | Leistungsgesteuerte Rückkehr nach der ersten Einheit je Muster. |
| Isolation mit 0 bis 1 Reserve im letzten Satz | Ja, fachlich sinnvoll. | Als Messsatz mit Reserve 0 definieren und auswerten. |
| Testtag mit 70 % | Nein. Die Reserve im ersten Satz schwankt zwischen 0 und 6, je nach Ergebnis. | Startziel = Maximum minus 3; Variantengrenzen so, dass das Ergebnis zwischen U plus 3 und O plus 3 liegt (Liegestütz 11 bis 18). |

## Priorisierte Empfehlungen

Zuerst sollte die Datenbasis eindeutig werden (Priorität 1), denn alle anderen Regeln rechnen mit diesen Werten. Danach folgen inhaltliche Lücken (Priorität 2) und Feinschliff (Priorität 3).

| Prio | Maßnahme | Konkrete Umsetzung | Evidenz | Aufwand |
| --- | --- | --- | --- | --- |
| 1 | Satzende eindeutig definieren | Arbeitssätze mit festem Ziel; letzter Satz als Messsatz mit definierter Reserve (Grundübung und Körpergewicht 1, Isolation 0). | Design auf Basis belegter RIR-Befunde | gering |
| 1 | Reserve direkt erfassen und kalibrieren | Nach dem Messsatz 0, 1, 2, 3, 4 oder 5+ antippen; persönlichen Schätzfehler aus Max-Tests und einem Reserve-Check alle 4 bis 6 Wochen ableiten. | belegt (Schätzfehler) | gering |
| 1 | Ein Leistungsmaß für alle Lasttypen | Kapazität K = Wdh. plus Reserve; relative Änderung ΔK ÷ (30 + K); Entscheidungen über Trend der letzten 4 Wochen, Schwelle mindestens doppelter persönlicher typischer Fehler. | Design | mittel |
| 1 | Testtag korrigieren | Startziel = Maximum minus 3; Variante so wählen, dass das Ergebnis zwischen U plus 3 und O plus 3 liegt. | Design | gering |
| 2 | Muster „Kniebeuger“ ergänzen | Nordic Curl, Slider-Curl, Band-Beincurl; Hip Thrust für hintere Oberschenkel nur 0,25, rumänisches Kreuzheben 1,0. | begrenzt (Hypertrophie), belegt (Prävention) | mittel |
| 2 | Zählung je Übung und Mindestanteil direkter Sätze | Faktor 0,25 bis 0,75 je Übung und Muskel; mindestens 4 direkte Sätze pro Woche für Bizeps, Trizeps (davon eine Überkopf-Variante), seitliche Schulter und Waden (stehend). | begrenzt | mittel |
| 2 | Arme bei 1 bis 2 Einheiten | Armisolation außerhalb des Zeitbudgets als Supersatz-Partner, je 2 bis 3 Sätze. | Design (Supersätze belegt) | gering |
| 2 | Volumenanpassung fortschrittsgesteuert | Halten bei Fortschritt, +2 bei Stagnation mit guter Erholung, −2 bei fallendem Trend oder schlechtem Befinden. | begrenzt | gering |
| 2 | Erholung differenzieren | Zuschläge für Beine (+12 Std.), neue Varianten (+24 Std.) und exzentrische Übungen; weiche Schranke; Muskelkater-Abfrage vor dem Start. | begrenzt | mittel |
| 2 | Erholungswoche und Pausen überarbeiten | 4 Wellness-Fragen pro Woche, Session-RPE auf CR-10, eine Wiederholung mehr Reserve im Deload; Rückkehr nach Pausen leistungsgesteuert. | belegt (Monitoring), Design | gering |
| 2 | Ausdauer und Fortschrittsmessung | Wochenziel für Ausdauerminuten nach WHO, Laufen im Erholungsmodell der Beine; Umfänge und Körpergewicht alle 4 Wochen. | belegt (Leitlinien) | mittel bis hoch |
| 3 | Kraftschätzung lernen lassen | Schätzung aus dem Messsatz; persönlicher Teiler k ab zwei Lasten; Ermüdungssteigung je Variante mit Vorwert −1. | Design (Variabilität belegt) | mittel |
| 3 | Feinere Stufen | Mischlast (Top-Satz), Mikrolasten, Tempo und Pause als Zwischenstufen; Körpergewichts-Zwischenvarianten und Bandkombinationen. | Design | mittel |
| 3 | Rechenschärfen beheben | Zeitfaktor je Übung (einseitig etwa 1,8) und Dauer je Übung; Prognose mal Einhaltungsquote; Gewichtssumme nur über Budget-Muskeln. | Design | gering |
| 3 | Ziel „Kraft“ schärfen | Testvariante häufiger (A, A, B), je Einheit 2 bis 3 direkte Sätze mit 4 bis 8 Wdh. | belegt (Frequenz, Last) | gering |

**Validierungsplan**

Die bestehende 12-Wochen-Simulation prüft vor allem, ob Lasten nicht pendeln. Entscheidend ist aber, wie die Regeln auf realistisches Rauschen reagieren. Ich empfehle vier Erweiterungen:

1. **Rauschmodell:** Reserve-Schätzfehler mit mittlerer Unterschätzung von etwa 1 Wdh. und Streuung von etwa 1,5 Wdh. zwischen Personen, zusätzlich Streuung innerhalb der Person und Tagesform.
2. **Realistische Verläufe:** Stagnationsphasen, Krankheitspausen, Ortswechsel mit anderem Equipment, überplante Wochen.
3. **Kennzahlen:** Fehlalarme je 12 Wochen bei stabilem Trainierenden (Volumensenkung, Deload-Angebot); Zeit bis zur Erkennung eines echten Leistungseinbruchs; Anteil Sätze mit realer Reserve 0 oder über 4; erreichtes direktes und fraktionelles Volumen je Muskel.
4. **Zielwerte (Design):** höchstens etwa ein Fehlalarm je 12 Wochen; echte Einbrüche innerhalb von 2 Wochen erkannt; mindestens 80 % der Sätze real zwischen 0 und 3 Reserve.

Parallel lohnt sich ein Eigenexperiment: Nach 12 Wochen mit dem neuen Messsatz-Protokoll lassen sich der persönliche typische Fehler, der Teiler k und die Ermüdungssteigung aus den eigenen Daten bestimmen und als Konfiguration zurückspielen.

## Quellen

Stand der Recherche: 1.11.2026. Angaben aus Preprints können sich in der Endfassung ändern.

**Volumen, Frequenz, Anstrengung, Last**

- Pelland et al. (Sports Med 2025): [The resistance training dose response: weekly volume and frequency](https://sponet.de/sponet/Record/4097139?lng=en)
- Remmert et al. (SportRxiv 2025): [Meta-regressions of the effect of per-session volume](https://sportrxiv.org/index.php/server/preprint/view/537), [Volltext](https://sportrxiv.org/index.php/server/preprint/download/537/1148/1071)
- Robinson et al. (Sports Med 2024): [Proximity to failure, strength gain and hypertrophy](https://lida.sport-iat.de/ta/Record/4089104?lng=en)
- Refalo et al. (J Sports Sci 2024): [Similar hypertrophy training to failure or with RIR](https://pubmed.ncbi.nlm.nih.gov/38393985/)
- Lopez et al. (Med Sci Sports Exerc 2021): [Resistance training load effects: network meta-analysis](https://pubmed.ncbi.nlm.nih.gov/33433148/)
- Plotkin et al. (PeerJ 2022): [Load or repetition progression](https://peerj.com/articles/14142)
- Scarpelli et al. (J Strength Cond Res 2022): [Hypertrophy and previous training volume](https://pubmed.ncbi.nlm.nih.gov/32108724/)
- Enes et al. (Med Sci Sports Exerc 2024): [Weekly set progressions in trained males](https://pubmed.ncbi.nlm.nih.gov/37796222/)
- Aube et al. (J Strength Cond Res 2022), Zusammenfassung: [12, 18 oder 24 Sätze pro Woche](https://www.strongerbyscience.com/research-spotlight-muscle-growth/)

**Selbsteinschätzung, Kraftschätzung, Monitoring**

- Halperin et al. (Sports Med 2022): [Accuracy in predicting repetitions to task failure](https://cris.iucc.ac.il/en/publications/accuracy-in-predicting-repetitions-to-task-failure-in-resistance-/)
- Nuzzo et al. (Sports Med 2024): [Maximal repetitions at percentages of 1RM](https://pure.solent.ac.uk/en/publications/maximal-number-of-repetitions-at-percentages-of-the-one-repetitio/)
- Saw et al. (Br J Sports Med 2016): [Subjective self-reported measures trump objective measures](https://www.omicsdi.org/dataset/biostudies-literature/S-EPMC4789708)
- Day et al. (J Strength Cond Res 2004): [Session RPE during resistance training](https://paulogentil.com/pdf/TREINO%20DE%20FORC%CC%A7A/Monitoring%20Exercise%20Intensity%20During%20Resistance%20Training%20Using%20the%20Session%20RPE%20Scale.pdf)

**Pausen, Supersätze, Erholung, Deload, Detraining**

- Singer et al. (Front Sports Act Living 2024): [Inter-set rest interval and hypertrophy](https://rgu-repository.worktribe.com/output/2344312)
- Zhang et al. (Sports Med 2025): [Superset versus traditional training](https://digibug.ugr.es/handle/10481/102755)
- Morán-Navarro et al. (Eur J Appl Physiol 2017): [Recovery after training to failure or not](https://pubmed.ncbi.nlm.nih.gov/28965198/)
- Belcher et al. (Appl Physiol Nutr Metab 2019): [Recovery after squat, bench press and deadlift](https://pubmed.ncbi.nlm.nih.gov/30779596/)
- Coleman et al. (PeerJ 2024): [One-week deload period](https://pubmed.ncbi.nlm.nih.gov/38274324/)
- Bell et al. (Sports Med Open 2023): [Deloading: international Delphi consensus](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)
- Räntilä et al. (J Strength Cond Res 2021): [Responders during training and detraining](https://converis.jyu.fi/converis/portal/detail/Publication/89729816)
- Scand J Med Sci Sports 2024: [Continuous versus periodic resistance training](https://pubmed.ncbi.nlm.nih.gov/39364857/)

**Übungsauswahl und Muskellänge**

- Maeo et al. (Med Sci Sports Exerc 2021): [Seated versus prone leg curl](https://pmc.ncbi.nlm.nih.gov/articles/PMC7969179/)
- Maeo et al. (Eur J Sport Sci 2023): [Overhead versus neutral elbow extension](https://informahealthcare.com/doi/full/10.1080/17461391.2022.2100279)
- Kinoshita et al. (Front Physiol 2023): [Standing versus seated calf raise](https://frontiersin.org/journals/physiology/articles/10.3389/fphys.2023.1272106/text)
- Kubo et al. (Eur J Appl Physiol 2019): [Squat depth and lower limb muscle volumes](https://link.springer.com/content/pdf/10.1007/s00421-019-04181-y.pdf)
- Plotkin et al. (Front Physiol 2023): [Hip thrust versus back squat](https://doaj.org/article/e0f865b8c13d4086895c8762e72a6988)
- Mannarino et al. (J Strength Cond Res 2021): [Biceps curl versus dumbbell row](https://paulogentil.com/pdf/Single-Joint%20Exercise%20Results%20in%20Higher%20Hypertrophy%20of%20Elbow%20Flexors%20Than%20Multijoint%20Exercise.pdf)
- Wolf et al. (Int J Strength Cond 2023): [Partial versus full range of motion](https://doaj.org/article/99e86b317bec40f5abc2f0008358737e)
- Wolf et al. (PeerJ 2025): [Lengthened partials versus full ROM](https://rgu-repository.worktribe.com/OutputFile/2656095)
- Gschneidner et al. (SportRxiv 2024): [Lengthened partials, multi-site cluster trial](https://sportrxiv.org/index.php/server/preprint/download/485/1040/972)
- Kassiano et al. (J Strength Cond Res 2022): [Varying resistance exercises](https://pubmed.ncbi.nlm.nih.gov/35438660/)
- van Dyk et al. (Br J Sports Med 2019): [Nordic hamstring exercise and injury rates](https://bjsm.bmj.com/content/53/21/1362)

**Allgemeine Fitness**

- Schumann et al. (Sports Med 2022): [Concurrent aerobic and strength training](https://pubmed.ncbi.nlm.nih.gov/34757594/)
- Alizadeh et al. (Sports Med 2023): [Resistance training and range of motion](https://pubmed.ncbi.nlm.nih.gov/36622555/)
- Momma et al. (Br J Sports Med 2022): [Muscle-strengthening activities and mortality](https://pmc.ncbi.nlm.nih.gov/articles/PMC9209691/)
- Bull et al. (Br J Sports Med 2020): [WHO 2020 guidelines on physical activity](https://pure.qub.ac.uk/en/publications/world-health-organization-2020-guidelines-on-physical-activity-an/)
- Muñoz-Martínez et al. (Sports Med 2017): [Resistance circuit training and VO2max](https://repositorio.ucam.edu/handle/10952/3070?show=full)
