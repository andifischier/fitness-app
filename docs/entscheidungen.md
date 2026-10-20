# Entscheidungen mit dem Nutzer

Hier steht jede Entscheidung, die der Nutzer auf eine Frage hin getroffen hat (Regel siehe
`CLAUDE.md`, Abschnitt „Entscheidungen mit dem Nutzer“). Einträge gelten wie die Spezifikation;
betrifft eine Entscheidung beschriebenes Verhalten, ist `docs/spezifikation.md` mit angepasst.

| Datum | Frage | Gewählte Option | Grund |
| --- | --- | --- | --- |
| 20.10.2026 | Wohin kommen Bauch und Waden im Plan? | Eigene Übungen mit eigenen Sätzen und Pausen, nicht in den Pausen von Oberkörperübungen. Bauch darf mit Waden oder Beinübungen ein Supersatz-Paar bilden, nie mit Oberkörper. | Sauber ausgeführte Sätze statt Zusatz in der Pause; Paare mit Beinen oder Waden passen auch in Einheiten mit Fokus Beine. |
| 20.10.2026 | Kosten Bauch- und Wadensätze Planzeit? | Sie kommen zusätzlich zum Zeitbudget; die Einheit darf länger als die Standarddauer dauern, die geschätzte Dauer zeigt das an. | Andere Muskeln (v. a. Arme) behalten ihr volles Volumen; die Dauer ist ohnehin nur ein Richtwert. Simulationswerte bleiben unverändert. |
| 20.10.2026 | Dreierblock, wenn ein Paar schon besteht und Bauch dazukommt? | Zunächst „Dreierblock erlauben“; durch die Entscheidung zu Bauch und Waden überholt: Es gibt nur Zweierblöcke. | Bauch hängt nicht mehr an Oberkörper-Paaren, ein Dreierblock wird nicht mehr gebraucht. |
| 20.10.2026 | Wird die Mobility-Einheit nach „Ruhetag empfohlen“ gespeichert? | Nur anzeigen, nicht speichern. | Einfach, kein zusätzliches Datenfeld. |
| 20.10.2026 | Wie weit darf der Bereich wachsen, wenn die schwerste Hantel erreicht ist? | Bis Obergrenze + 5. | Passt zu jeder Übung und zur Regel „Obergrenze + 3“. |
| 20.10.2026 | Zwischenstufe bei großem Sprung zur nächsten Variante? | Ab 2 Stufen Abstand zuerst die aktuelle Variante mit langsamem Absenken (3 Sek.), dann die nächste Variante. | Sanftere Übergänge. Band-Varianten sind bereits eigene Stufen der Leiter. |
| 20.10.2026 | Muster ohne Variante und ohne Ersatz am Ort (z. B. Tisch abgewählt)? | Muster entfällt, Hinweis am Ort („Für Ziehen fehlt Equipment“). | Ehrlich und einfach. |
| 20.10.2026 | Sperre blockiert alle Varianten eines Musters? | Volumen fällt weg, kein Ersatz. | Entspricht der Regel, gesperrtes Volumen nicht umzulegen; schützt die gesperrte Stelle. |
| 20.10.2026 | Max-Tests doppelt speichern? | Nur Test-Verlauf (`maxTests`); `MusterZustand.letzterTest` entfällt. | Keine widersprüchlichen Daten möglich. |
| 20.10.2026 | Lastanzeige bei einer oder zwei Hanteln? | „16 kg je Hand“ bei zwei Hanteln, „16 kg“ bei einer; neues Katalogfeld `anzahlGewichte`. | Jede Übung zeigt die Last eindeutig an. |
| 20.10.2026 | Was zeigen die noch leeren Tabs (Paket 0)? | Nur den Titel, ohne weiteren Text. | Schlicht; nichts muss später wieder entfernt werden. |
| 20.10.2026 | Wie sieht das App-Icon aus? | Weiße, schlichte Hantel auf petrolfarbener Fläche (#0F766E). | Sofort als Trainings-App erkennbar. |
| 20.10.2026 | Darf für den Backup-Test eine Testhilfe (fake-indexeddb) als zusätzliche Bibliothek genutzt werden? | Ja, nur für Tests. | Der Test prüft den echten Speicherweg; die Bibliothek landet nicht in der App. |
| 20.10.2026 | Wie genau ist die Meldung bei einer beschädigten Backup-Datei? | Kurz mit Fundstelle, z. B. „Die Backup-Datei ist beschädigt (Einheiten, Eintrag 3). Deine Daten bleiben unverändert.“ | Hilft bei der Fehlersuche. |
| 20.10.2026 | Dürfen beide Hauptvarianten eines Musters (z. B. Bankdrücken und Schrägbankdrücken) in derselben Einheit vorkommen? | Ja, beide sind Kandidaten; abgewechselt wird über den Abschlag für die zuletzt gewählte Übung. | Mit nur der fälligen Variante fehlen bei 2 bis 4 Einheiten pro Woche bis zu ein Drittel der Sätze (nachgerechnet: Brust 8 statt 11, hintere Oberschenkel 1 bis 6 statt 9 bis 10); so bleiben die Simulationsergebnisse gültig. |
| 20.10.2026 | Wie setzt die App „Ziel-Reserve 3“ in der ersten Einheit je Muster nach 8 bis 21 Tagen Pause um? (Nachfrage „Warum?“ beantwortet: Kraft, Sehnen und Gelenke sind nach der Pause etwas aus der Übung; eine leichtere erste Einheit vermeidet verfehlte Ziele, starken Muskelkater und Zerrungen.) | Ziel im ersten Satz 2 Wdh. unter dem letzten Ziel, bei Halteübungen 10 Sek. weniger. | Klar und spürbar leichter; ab der zweiten Einheit normale Progression. |
| 20.10.2026 | Wann kommt der erste Max-Test, wenn der Testtag übersprungen wurde? | Sofort, in der ersten passenden Einheit. | Früher Messwert. |
| 20.10.2026 | Schwerste Hantel erreicht, 3. Schritt „einseitige Variante“: was tun, wenn der Katalog keine hat? | Einseitige Variante desselben Musters, wenn im Katalog und am Ort möglich; sonst gleich die nächste Variante. | Wie in der Spezifikation. |
| 20.10.2026 | Startet eine Erholungswoche wegen sinkender Leistung oder sehr hoher Anstrengung automatisch? | Nein, als Angebot mit Ja/Nein, wie beim Angebot nach 10 Wochen. | Volle Kontrolle für den Nutzer. |
| 20.10.2026 | Wie wird eine eigene Übung angelegt? | Eine ähnliche Übung als Vorlage wählen; alle Angaben sind daraus vorausgefüllt und änderbar. | Schnell und kaum Fehler. |
| 20.10.2026 | Dürfen Orte und eigene Übungen gelöscht werden? | Nur solange damit noch nie trainiert wurde; sonst umbenennen bzw. ausschließen. | Der Verlauf bleibt immer vollständig. |
| 20.10.2026 | In welchem Bereich lassen sich die Pausen einstellen? | 30 bis 180 Sek. in 15-Sek.-Schritten, getrennt für Grundübung, Isolation und Supersatz. | Viel Spielraum. |
| 20.10.2026 | Soll die Startübung aus dem Testtag sicher im Plan vorkommen? | Ja: Sie wird Hauptvariante A des Musters (B nach den üblichen Regeln). Geht sie am Ort nicht, gilt die nächstleichtere Variante aus der Tabelle; die Musterstufe bleibt die der Tabelle. | Das Testergebnis wirkt sofort sichtbar im Plan. |
| 20.10.2026 | Zählt der Testtag als Einheit der Woche? | Nein. Er zählt nur für die Erholung (jeder Test 1 Satz), nicht für Wochenprognose und Wochenziel; die Frage „Wie oft schaffst du es diese Woche?“ kommt bei der ersten richtigen Einheit. | Alle Einheiten der Woche bleiben voll. |
| 20.10.2026 | Wie kommen Lieblingsübungen und Ausschlüsse ins Onboarding? | Nur als Hinweis, dass sie jederzeit im Tab Übungen gesetzt werden können. | Das Onboarding bleibt unter 5 Minuten. |
