# Technische Annahmen

Hier stehen technische Entscheidungen, die der Agent selbst getroffen hat (Regel siehe
`CLAUDE.md`, Abschnitt „Entscheidungen mit dem Nutzer“). Sie betreffen weder Trainingslogik noch
Bedienung noch gespeicherte Daten.

| Datum | Paket | Annahme | Grund |
| --- | --- | --- | --- |
| 20.10.2026 | 0 | Versionen: Vite 8, Tailwind CSS 4 (über `@tailwindcss/vite`), Vitest 5, vite-plugin-pwa 2, React Router 7 (Paket `react-router`), React 18. | Jeweils aktuelle Version, die zum festgelegten Stack passt; React bleibt laut Spezifikation auf 18. |
| 20.10.2026 | 0 | Die Design-Tokens stehen als Tailwind-Theme (`@theme`) in `src/index.css`, nicht in `src/konfiguration.ts`. Die Standardfarben von Tailwind sind abgeschaltet, nur die Token-Farben sind nutzbar. | Die Spezifikation verlangt die Tokens als Tailwind-Theme; `konfiguration.ts` ist für die Zahlenwerte der Trainingslogik. |
| 20.10.2026 | 0 | Token-Namen: Farben `hintergrund`, `flaeche`, `rand`, `text`, `gedaempft`, `akzent`, `akzent-hell`, `linie`; Größen `titel` 30, `screen` 22, `gross` 17, `basis` 15, `hinweis` 13, `klein` 12, `zahl` 56 px; Radius `karte` 16 px; Abstände `seite` 20 px, `touch` 44 px, `primaer` 52 px. | Deutsche Namen wie im Rest des Codes; Werte aus der Tabelle „Gestaltung“. |
| 20.10.2026 | 0 | Manrope stammt aus dem Open-Source-Paket `@fontsource/manrope` 5.3.0 (Untermenge „latin“, enthält ä, ö, ü, ß und deutsche Anführungszeichen). Die vier woff2-Dateien wurden einmalig nach `public/fonts/` kopiert, die Lizenz liegt als `OFL.txt` daneben. Das Paket ist keine Abhängigkeit. | Offline verfügbar ohne zusätzliche Bibliothek. |
| 20.10.2026 | 0 | Tab-Adressen: `#/` (Heute), `#/fortschritt`, `#/uebungen`, `#/einstellungen`; unbekannte Adressen führen zu Heute. | Kurz und lesbar. |
| 20.10.2026 | 0 | App-Icon: eine Grafik (`public/icon.svg` als Vorlage, daraus `icon-192.png` und `icon-512.png`); die 512er-Datei dient zugleich als „maskable“-Icon, die Hantel liegt innerhalb der sicheren Zone. | Ein Motiv für alle Größen; Android schneidet das Icon passend zu. |
| 20.10.2026 | 0 | Der Service Worker speichert alle Dateien des Builds (Code, Schrift, Icons) vorab im Cache; jede Adresse fällt offline auf `index.html` zurück. | Erfüllt „startet im Flugmodus“. |
| 20.10.2026 | 0 | Test für den App-Rahmen ohne zusätzliche Testbibliothek: Rendern mit `react-dom/server` und `MemoryRouter`. | Keine weiteren Bibliotheken erlaubt. |
| 20.10.2026 | 0 | Dexie und zod werden erst in Paket 1 installiert. | Paket 0 nutzt sie noch nicht. |
| 20.10.2026 | 0 | Der Workflow `deploy.yml` führt vor dem Veröffentlichen `npm test` und `npm run build` aus und lässt sich auch von Hand starten. | Fehlerhafte Stände gehen nicht online. |
| 20.10.2026 | 1 | Versionen: Dexie 4, zod 4, fake-indexeddb 6 (nur Tests). | Jeweils aktuelle Version. |
| 20.10.2026 | 1 | Datenschicht in `src/daten/` (`db.ts`, `katalog.ts`, `schemas.ts`, `backup.ts`, `zeit.ts`); Typen in `src/logik/typen.ts`, damit die Logikmodule nichts aus der Datenschicht brauchen. | Pfad `src/daten/backup.ts` steht in der Spezifikation; Logik bleibt ohne Abhängigkeit von Speicher und UI. |
| 20.10.2026 | 1 | Der Katalog wird nicht in die Datenbank kopiert, sondern beim Build aus `docs/katalog.json` eingebunden und beim Start mit zod geprüft (zusätzlich: eindeutige IDs, Utensilien vorhanden, `anzahlGewichte` nur bei Last). Ein ungültiger Katalog bricht mit klarer Meldung ab und fällt schon im Test auf. | Katalog ist schreibgeschützt und Teil der App; eine Datei bleibt die einzige Quelle. |
| 20.10.2026 | 1 | `einstellungen` liegt unter dem festen Schlüssel 1 (ohne eigenes Feld); im Backup ist die Tabelle wie alle anderen eine Liste (0 oder 1 Eintrag). | Typ `Einstellungen` bleibt wie in der Spezifikation. |
| 20.10.2026 | 1 | `zirkelErgebnisse` haben den zusammengesetzten Schlüssel Zirkel + Ort + Datum; `maxTests` zusätzlich einen Index auf `muster`. | Kein zusätzliches ID-Feld nötig; Datum mit Uhrzeit ist eindeutig genug. |
| 20.10.2026 | 1 | Zeitstempel (z. B. `exportiertAm`, `letztesBackup`) als ISO-String in Gerätezeit ohne Zeitzone (`2026-10-20T18:30:00`), erzeugt in `src/daten/zeit.ts`. | Spezifikation: „ISO-8601-Strings in Gerätezeit“. |
| 20.10.2026 | 1 | Import in zwei Schritten: `pruefeBackup` liefert die Zusammenfassung (Einheiten, Zeitraum nach Erstelldatum) für die Bestätigung, `importiere` prüft erneut und ersetzt alle Tabellen in einer Transaktion. Doppelte Schlüssel gelten als beschädigt. Unbekannte Zusatzfelder werden beim Import verworfen. | Bestätigung vor dem Ersetzen laut Spezifikation; bei jedem Fehler bleiben die Daten unverändert. |
| 20.10.2026 | 1 | `exportiere` setzt vor dem Lesen `einstellungen.letztesBackup`, damit das Backup das eigene Datum enthält. | Grundlage für die Backup-Erinnerung. |
| 20.10.2026 | 1 | Backup-Schema bisher nur Version 1; ältere oder unbekannte Versionen gelten als beschädigt, neuere als „aus einer neueren App-Version“. Eine Migrationsfunktion entsteht erst mit der ersten Schemaänderung. | Keine Funktion ohne Bedarf. |
| 20.10.2026 | 1 | `navigator.storage.persist()` wird bei jedem Start angefragt, falls noch nicht gewährt. | Wirkt nur einmal, schadet sonst nicht. |
| 20.10.2026 | 1 | Gleichheit von zod-Schemas und TypeScript-Typen wird beim Build geprüft (`schemas.ts`, Ende). | Typen und Prüfung können nicht unbemerkt auseinanderlaufen. |
| 20.10.2026 | 1 | Eigener Video-Link für Katalogübungen ist noch nicht gespeichert; folgt mit dem Screen Übungen (Paket 4), dann mit neuer Dexie-Version und Migration. | Datenbanktabellen in Paket 1 genau wie in der Spezifikation. |
