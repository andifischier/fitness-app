// Die sieben Use Cases aus „Simulation der Use Cases“: je Muskel höchstens 1 Satz neben dem
// Python-Prototyp (docs/planungslogik_prototyp.py), plus Rauchtest mit vollem Katalog.
import { describe, expect, it } from 'vitest';
import { wochenziele } from './planung';
import { ort, simuliereWoche, zeitpunkt, zustand, type Termin } from './testhilfe';
import { MUSKELN, type Muskel } from './typen';

type Werte = [number, number, number, number, number, number, number, number, number, number];
const proMuskel = (w: Werte) => Object.fromEntries(MUSKELN.map((m, i) => [m, w[i]])) as Record<Muskel, number>;

// Erledigte fraktionelle Sätze laut Prototyp, Reihenfolge wie MUSKELN:
// Brust, Rücken, Schultern, Bizeps, Trizeps, Quadrizeps, Gesäß, hintere OS, Bauch, Waden
const FAELLE: { name: string; prognose: number; termine: Termin[]; prototyp: Werte }[] = [
  {
    name: 'UC1 Normalwoche Mo, Mi, Fr', prognose: 3,
    termine: [{ tag: 0, stunde: 18 }, { tag: 2, stunde: 18 }, { tag: 4, stunde: 18 }],
    prototyp: [12, 12, 12, 12, 12, 9, 10.5, 9, 6, 4],
  },
  {
    name: 'UC2 5 Einheiten Mo, Di, Mi, Fr, Sa', prognose: 5,
    termine: [{ tag: 0, stunde: 18 }, { tag: 1, stunde: 18 }, { tag: 2, stunde: 18 }, { tag: 4, stunde: 18 }, { tag: 5, stunde: 10 }],
    prototyp: [12, 12, 12, 12, 13, 10, 13, 10, 6, 4],
  },
  {
    name: 'UC3 2 Einheiten Di, Sa', prognose: 2,
    termine: [{ tag: 1, stunde: 18 }, { tag: 5, stunde: 10 }],
    prototyp: [12, 12, 12, 9, 11, 8, 9.5, 8, 5, 3],
  },
  {
    name: 'UC4 Prognose 3, tatsächlich 5 Tage am Stück', prognose: 3,
    termine: [0, 1, 2, 3, 4].map((tag) => ({ tag, stunde: 18 })),
    prototyp: [14, 13, 14.5, 12.5, 13, 10, 11.5, 10, 6, 4],
  },
  {
    name: 'UC5 Prognose 4, nur Mo und Do, am Do korrigiert', prognose: 4,
    termine: [{ tag: 0, stunde: 18 }, { tag: 3, stunde: 18, prognose: 2 }],
    prototyp: [12, 11, 12, 8.5, 8, 8, 8, 5, 5, 3],
  },
  {
    name: 'UC5b Prognose 4, nur Mo und Do, ohne Korrektur', prognose: 4,
    termine: [{ tag: 0, stunde: 18 }, { tag: 3, stunde: 18 }],
    prototyp: [9, 9, 10, 7.5, 6.5, 6, 7, 5, 5, 2],
  },
  {
    name: 'UC6 Fr abends, Sa und So morgens', prognose: 3,
    termine: [{ tag: 4, stunde: 18 }, { tag: 5, stunde: 10 }, { tag: 6, stunde: 10 }],
    prototyp: [12, 12, 12, 12, 12, 8, 9, 5.5, 6, 4],
  },
];

describe('Use Cases mit Test-Katalog', () => {
  for (const fall of FAELLE) {
    it(`${fall.name}: je Muskel höchstens 1 Satz neben dem Prototyp`, () => {
      const { erledigt } = simuliereWoche(zustand(), fall.prognose, fall.termine);
      const soll = proMuskel(fall.prototyp);
      for (const m of MUSKELN) expect(Math.abs(erledigt[m] - soll[m]), `${m}: ${erledigt[m]} statt ${soll[m]}`).toBeLessThanOrEqual(1);
    });
  }

  it('Wochenziele bei 40 Min wie in der Spezifikation', () => {
    const z = zustand();
    const jetzt = zeitpunkt(0, 18);
    expect(wochenziele(z, 2, 'zuhause', jetzt)).toMatchObject({ Brust: 11, Quadrizeps: 8, Bauch: 5, Waden: 3 });
    expect(wochenziele(z, 3, 'zuhause', jetzt)).toMatchObject({ Brust: 12, Quadrizeps: 9, Bauch: 6, Waden: 4 });
    expect(wochenziele(z, 5, 'zuhause', jetzt)).toMatchObject({ Brust: 12, Quadrizeps: 10, Bauch: 6, Waden: 4 });
  });
});

describe('Rauchtest mit vollem Katalog', () => {
  it('UC1: jeder Muskel erreicht mindestens 80 % seines Ziels', () => {
    const z = zustand({ katalog: 'voll', orte: [ort()] });
    const { erledigt } = simuliereWoche(z, 3, FAELLE[0]!.termine);
    const ziele = wochenziele(z, 3, 'zuhause', zeitpunkt(0, 18));
    for (const m of MUSKELN) expect(erledigt[m], `${m}: ${erledigt[m]} von ${ziele[m]}`).toBeGreaterThanOrEqual(0.8 * ziele[m]);
  });
});
