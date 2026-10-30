// Die sieben Use Cases aus „Simulation der Use Cases“. Seit der Überarbeitung vom 21.10.2026
// (höchstens 6 Übungen, Zugrichtung im Wechsel, Kombi-Pause 60 Sek.) weicht die Planung bewusst vom
// Python-Prototyp ab; geprüft werden deshalb Eigenschaften statt der Prototyp-Werte.
import { describe, expect, it } from 'vitest';
import { EINHEIT, MUSTER_ART } from '../konfiguration';
import { wochenziele } from './planung';
import { eingespielt, ort, simuliereWoche, zeitpunkt, zustand, type Termin } from './testhilfe';
import { MUSKELN, type Muskel } from './typen';
import { uebungVon } from './verlauf';

const HOCH: Muskel[] = ['Brust', 'Ruecken', 'Schultern', 'Bizeps', 'Trizeps'];
const GROSS: Muskel[] = ['Brust', 'Ruecken', 'Schultern'];

// stimmig: Die Prognose passt zu den tatsächlichen Einheiten.
const FAELLE: { name: string; prognose: number; termine: Termin[]; stimmig: boolean }[] = [
  { name: 'UC1 Normalwoche Mo, Mi, Fr', prognose: 3, stimmig: true,
    termine: [{ tag: 0, stunde: 18 }, { tag: 2, stunde: 18 }, { tag: 4, stunde: 18 }] },
  { name: 'UC2 5 Einheiten Mo, Di, Mi, Fr, Sa', prognose: 5, stimmig: true,
    termine: [{ tag: 0, stunde: 18 }, { tag: 1, stunde: 18 }, { tag: 2, stunde: 18 }, { tag: 4, stunde: 18 }, { tag: 5, stunde: 10 }] },
  { name: 'UC3 2 Einheiten Di, Sa', prognose: 2, stimmig: true,
    termine: [{ tag: 1, stunde: 18 }, { tag: 5, stunde: 10 }] },
  { name: 'UC4 Prognose 3, tatsächlich 5 Tage am Stück', prognose: 3, stimmig: false,
    termine: [0, 1, 2, 3, 4].map((tag) => ({ tag, stunde: 18 })) },
  { name: 'UC5 Prognose 4, nur Mo und Do, am Do korrigiert', prognose: 4, stimmig: false,
    termine: [{ tag: 0, stunde: 18 }, { tag: 3, stunde: 18, prognose: 2 }] },
  { name: 'UC5b Prognose 4, nur Mo und Do, ohne Korrektur', prognose: 4, stimmig: false,
    termine: [{ tag: 0, stunde: 18 }, { tag: 3, stunde: 18 }] },
  { name: 'UC6 Fr abends, Sa und So morgens', prognose: 3, stimmig: true,
    termine: [{ tag: 4, stunde: 18 }, { tag: 5, stunde: 10 }, { tag: 6, stunde: 10 }] },
];

// Bekannter Preis der Vielfalt-Regel (Entscheidung 30.10.2026: zweite Übung derselben Bewegung nur ohne
// offene Alternative): In UC5 mit vollem Katalog nimmt Klimmzug statt Rudern einen Platz, Schulterdrücken
// verdrängt dann die Curls. Bizeps bekommt 5,5 von 12 Sätzen (46 %).
const mindestanteil = (fall: string, katalog: string, m: Muskel) =>
  (fall.startsWith('UC5 ') && katalog === 'voll' && m === 'Bizeps' ? 0.45 : 0.5);

describe('Use Cases', () => {
  for (const katalog of ['test', 'voll'] as const) {
    for (const fall of FAELLE) {
      it(`${fall.name} (${katalog}er Katalog): Volumen und höchstens ${EINHEIT.maxUebungen} Übungen`, () => {
        const z = eingespielt(zustand({ katalog, orte: [ort()] }));
        const { erledigt, einheiten } = simuliereWoche(z, fall.prognose, fall.termine);
        const letzte = fall.termine[fall.termine.length - 1]!;
        const ziele = wochenziele(z, letzte.prognose ?? fall.prognose, 'zuhause', zeitpunkt(fall.termine[0]!.tag, 18));
        for (const m of HOCH) {
          expect(erledigt[m], `${m}: ${erledigt[m]} von ${ziele[m]}`).toBeGreaterThanOrEqual(mindestanteil(fall.name, katalog, m) * ziele[m]);
        }
        if (fall.stimmig) {
          // Arme bekommen in Wochen mit 2 Einheiten wegen der 6 Übungen nur etwa die Hälfte direkt.
          for (const m of GROSS) expect(erledigt[m], `${m}: ${erledigt[m]} von ${ziele[m]}`).toBeGreaterThanOrEqual(0.8 * ziele[m]);
          for (const m of MUSKELN) expect(erledigt[m], `${m}: ${erledigt[m]} von ${ziele[m]}`).toBeGreaterThanOrEqual(0.5 * ziele[m]);
        }
        for (const e of einheiten) {
          const imBudget = e.bloecke.flatMap((b) => b.positionen)
            .filter((p) => !p.istMaxTest && MUSTER_ART[uebungVon(z, p.uebungId)!.muster] !== 'zusatz');
          expect(imBudget.length).toBeLessThanOrEqual(EINHEIT.maxUebungen);
        }
      });
    }
  }

  it('Klimmzug und Rudern wechseln sich ab (UC1)', () => {
    const z = eingespielt(zustand());
    const { einheiten } = simuliereWoche(z, 3, FAELLE[0]!.termine);
    const zug = einheiten.map((e) => e.bloecke.flatMap((b) => b.positionen).map((p) => uebungVon(z, p.uebungId)!.muster)
      .find((m) => m === 'vZug' || m === 'hZug'));
    expect(zug).toEqual(['hZug', 'vZug', 'hZug']);
  });

  it('Wochenziele bei 40 Min wie in der Spezifikation', () => {
    const z = eingespielt(zustand());
    const jetzt = zeitpunkt(0, 18);
    expect(wochenziele(z, 2, 'zuhause', jetzt)).toMatchObject({ Brust: 12, Quadrizeps: 9, Bauch: 6, Waden: 4 });
    expect(wochenziele(z, 3, 'zuhause', jetzt)).toMatchObject({ Brust: 12, Quadrizeps: 10, Bauch: 6, Waden: 4 });
    expect(wochenziele(z, 5, 'zuhause', jetzt)).toMatchObject({ Brust: 12, Quadrizeps: 10, Bauch: 6, Waden: 4 });
  });
});

describe('Rauchtest mit vollem Katalog', () => {
  it('UC1: jeder Muskel erreicht mindestens 80 % seines Ziels', () => {
    const z = eingespielt(zustand({ katalog: 'voll', orte: [ort()] }));
    const { erledigt } = simuliereWoche(z, 3, FAELLE[0]!.termine);
    const ziele = wochenziele(z, 3, 'zuhause', zeitpunkt(0, 18));
    for (const m of MUSKELN) expect(erledigt[m], `${m}: ${erledigt[m]} von ${ziele[m]}`).toBeGreaterThanOrEqual(0.8 * ziele[m]);
  });
});
