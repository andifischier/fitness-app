# Fitness-App: Regeln für Claude

## Projekt
Persönliche Trainings-App als PWA für ein Android-Handy, ohne Server, Daten nur lokal.
Verbindliche Unterlagen (vor jeder Aufgabe die betroffenen Abschnitte lesen):
- `docs/spezifikation.md`: vollständige Spezifikation, Arbeitspakete, Abnahmekriterien
- `docs/uebungskatalog.md` und `docs/katalog.json`: Übungen, Utensilien, Zirkel, Aufwärmen
- `docs/mockups/`: Bilder der Screens, Vorlage für Aufbau und Stil
- `docs/planungslogik_prototyp.py`, `docs/progression_prototyp.py`: Illustration und Quelle für Testszenarien
- `docs/entscheidungen.md`: Entscheidungen des Nutzers (verbindlich, wie die Spezifikation)
- `docs/annahmen.md`: eigene technische Annahmen
- `docs/klarstellungen.md`: nur Historie, in die Spezifikation eingearbeitet

## Rangfolge bei Widersprüchen
Spezifikation (inklusive `docs/entscheidungen.md`), dann Mockups, dann Prototypen.
- Prototypen sind Illustrationen und Testszenarien, keine Regelquelle. Weichen sie ab, gilt die Spezifikation.
- Mockups zeigen Aufbau und Stil. Texte, Zahlen und Beispielübungen darin sind Beispieldaten;
  maßgeblich ist der Katalog.
- Bleibt etwas unklar: siehe „Entscheidungen mit dem Nutzer“.

## Entscheidungen mit dem Nutzer
Der Nutzer ist kein Entwickler. Zwei Arten von Unklarheiten:

**Fragen, bevor du es umsetzt**, wenn es eines davon betrifft:
- Trainingslogik (Volumen, Progression, Erholung, Variantenwahl)
- was der Nutzer in der App sieht oder bedienen muss
- seine gespeicherten Daten
- neue Bibliotheken oder Kosten

So fragen:
- Jede Frage mit 2 bis 3 Optionen, je mit einem Satz Vor- und Nachteil; deine Empfehlung markieren.
- Kurz und ohne Fachbegriffe.
- Mehrere Fragen sammeln und gebündelt am Anfang der Aufgabe stellen, nicht verteilt.
- Jede Antwort in `docs/entscheidungen.md` festhalten: Datum, Frage, gewählte Option, Grund.
  Betrifft sie beschriebenes Verhalten, `docs/spezifikation.md` anpassen.

**Selbst entscheiden** bei allem anderen (Code-Struktur, Benennungen, technische Details):
die einfachste Auslegung wählen, die zu Spezifikation und Simulationsergebnissen passt, und
in `docs/annahmen.md` notieren. Im Zweifel, ob ein Punkt in die erste Gruppe fällt: fragen.

## Technik (nicht ändern ohne ausdrücklichen Auftrag)
TypeScript strict, React 18, Vite, Tailwind, React Router (Hash-Routing), Dexie, zod,
vite-plugin-pwa (registerType autoUpdate), Vitest, fake-indexeddb (nur in Tests). Keine weiteren Bibliotheken.
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
2. Ändert sich ein in der Spezifikation beschriebenes Verhalten: `docs/spezifikation.md` mitändern
   (bei Entscheidungen des Nutzers zusätzlich `docs/entscheidungen.md`).
3. Eintrag in `docs/changelog.md` (Datum, was, warum).
4. Abschlussbericht auf Deutsch: was geändert wurde, welche Abnahmepunkte erfüllt sind,
   und wie der Nutzer es am Handy in 2 bis 3 Schritten prüfen kann.

## Befehle
`npm install` · `npm run dev` · `npm test` · `npm run build`
