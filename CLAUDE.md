# Fitness-App: Regeln für Claude

## Projekt
Persönliche Trainings-App als PWA für ein Android-Handy, ohne Server, Daten nur lokal.
Verbindliche Unterlagen (vor jeder Aufgabe die betroffenen Abschnitte lesen):
- `docs/spezifikation.md`: vollständige Spezifikation, Arbeitspakete, Abnahmekriterien
- `docs/uebungskatalog.md` und `docs/katalog.json`: Übungen, Utensilien, Zirkel, Aufwärmen
- `docs/mockups/`: Bilder der Screens, Vorlage für das Aussehen
- `docs/planungslogik_prototyp.py`, `docs/progression_prototyp.py`: Referenzlogik und Testwerte

## Rangfolge bei Widersprüchen
Spezifikation, dann Mockups, dann eigene Annahmen. Unklare Regeln: die einfachste
Auslegung wählen, die zu den Simulationsergebnissen passt, und in `docs/annahmen.md` notieren.

## Technik (nicht ändern ohne ausdrücklichen Auftrag)
TypeScript strict, React 18, Vite, Tailwind, React Router (Hash-Routing), Dexie, zod,
vite-plugin-pwa (registerType autoUpdate), Vitest. Keine weiteren Bibliotheken.
GitHub Pages über `.github/workflows/deploy.yml`, `base: '/fitness-app/'`.

## Regeln für Code
- Logik nur in `src/logik/`, ohne UI-Abhängigkeit und deterministisch (Zeit wird übergeben).
- Alle Zahlenwerte nur in `src/konfiguration.ts`.
- Neue oder geänderte Logik immer mit Tests.
- Datenbankschema nur mit neuer Dexie-Version plus Migration ändern. Nie Nutzerdaten löschen.
- Texte in der App: Deutsch, Du-Form, kurz, Dezimalkomma.
- Keine Funktionen, die weder Spezifikation noch Auftrag verlangen.

## Vor dem Abschluss jeder Aufgabe
1. `npm test` und `npm run build` ausführen; beide müssen fehlerfrei sein.
2. Ändert sich ein in der Spezifikation beschriebenes Verhalten: `docs/spezifikation.md` mitändern.
3. Eintrag in `docs/changelog.md` (Datum, was, warum).
4. Abschlussbericht auf Deutsch: was geändert wurde, welche Abnahmepunkte erfüllt sind,
   und wie der Nutzer es am Handy in 2 bis 3 Schritten prüfen kann.

## Befehle
`npm install` · `npm run dev` · `npm test` · `npm run build`
