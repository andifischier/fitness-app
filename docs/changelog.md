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
