import { describe, expect, it } from 'vitest';
import { loescheEinheit } from './loeschen';
import { zustand } from './testhilfe';
import type { AppZustand, Einheit, Position } from './typen';

const pos = (extra: Partial<Position> = {}): Position => ({
  uebungId: 'kh_bankdruecken', saetze: 2, zielWdh: 10, last: 16,
  ergebnisse: [{ nr: 1, wdh: 12, last: 16, zeit: '' }, { nr: 2, wdh: 12, last: 16, zeit: '' }], feedback: 'leicht', ...extra,
});

const einheit = (id: string, tag: number, extra: Partial<Einheit> = {}): Einheit => ({
  id, woche: '2026-W43', erstelltAm: `2026-10-${tag}T10:00:00`, gestartetAm: `2026-10-${tag}T18:00:00`, beendetAm: `2026-10-${tag}T18:40:00`,
  status: 'abgeschlossen', ortId: 'zuhause', fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [],
  bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [pos()] }], ...extra,
});

// Zustand nach einer Einheit, die das Bankdrücken von 16 auf 18 kg gesteigert hat.
const nach = (e: Einheit, z: AppZustand = zustand()): AppZustand => ({
  ...z,
  einheiten: [...z.einheiten, e],
  varianten: [{ uebungId: 'kh_bankdruecken', last: 18, zielWdh: 8, seitSteigerung: 0, schwerSerie: 0 }],
  muskeln: [{ muskel: 'Brust', letzteBelastung: e.gestartetAm, letzteDosis: 2, letzteSchwer: false, persoenlicheGrenze: 20, gleichWochen: 0, leistung: [] }],
  wochen: [{ id: '2026-W43', prognose: 3, einheiten: 1, ziele: {} as never, erledigt: { Brust: 2 } as never, erholungswoche: false, laengerAngenommen: false }],
});

describe('Beendete Einheit löschen', () => {
  const vorher = { uebungId: 'kh_bankdruecken', last: 16, zielWdh: 10, seitSteigerung: 3, schwerSerie: 0, e1rm: 20 };

  it('holt den gemerkten Stand der Übung und des Musters zurück', () => {
    const e = einheit('e1', 20, { vorher: { varianten: [{ uebungId: 'kh_bankdruecken', zustand: vorher }], muster: [{ muster: 'hDruck' }] } });
    const z = { ...nach(e), muster: [{ muster: 'hDruck' as const, stufe: 5, hauptvarianten: ['kh_bankdruecken'] }] };
    const neu = loescheEinheit(z, 'e1')!;
    expect(neu.einheiten).toEqual([]);
    expect(neu.varianten).toEqual([vorher]);
    expect(neu.muster).toEqual([]);
    expect(neu.wochen[0]).toMatchObject({ einheiten: 0, erledigt: { Brust: 0 } });
    expect(neu.muskeln[0]).toMatchObject({ letzteDosis: 0, letzteSchwer: false });
    expect(neu.muskeln[0]!.letzteBelastung).toBeUndefined();
  });

  it('nimmt bei älteren Einheiten ohne gemerkten Stand Ziel und Gewicht aus der Einheit', () => {
    const neu = loescheEinheit(nach(einheit('e1', 20)), 'e1')!;
    expect(neu.varianten[0]).toMatchObject({ last: 16, zielWdh: 10 });
  });

  it('lässt die Übung, wenn danach schon wieder mit ihr trainiert wurde, und die Erholung zählt ab der übrigen Einheit', () => {
    const spaeter = einheit('e2', 22);
    const z = nach(spaeter, { ...zustand(), einheiten: [einheit('e1', 20, { vorher: { varianten: [{ uebungId: 'kh_bankdruecken', zustand: vorher }], muster: [] } })] });
    const neu = loescheEinheit(z, 'e2')!;
    expect(neu.varianten[0]).toMatchObject({ last: 16, zielWdh: 10 });   // e2 ohne gemerkten Stand: aus der Einheit
    expect(neu.muskeln[0]).toMatchObject({ letzteBelastung: '2026-10-20T18:00:00' });
    const ohneE1 = loescheEinheit(z, 'e1')!;
    expect(ohneE1.varianten[0]).toMatchObject({ last: 18, zielWdh: 8 });  // e2 kam danach: bleibt
  });

  it('löscht den Max-Test und die Zirkelzeit der Einheit', () => {
    const e = einheit('e1', 20);
    const z = {
      ...nach(e),
      maxTests: [{ id: 'maxtest-2026-10-20T18:00:00-hDruck', datum: '2026-10-20T18:00:00', muster: 'hDruck' as const, uebungId: 'liegestuetz', ergebnis: 20, einheit: 'Wdh.' as const }],
      zirkelErgebnisse: [{ zirkelId: 'z', ortId: 'zuhause', datum: '2026-10-20T18:00:00', zeitSek: 600, varianten: [] }],
    };
    const neu = loescheEinheit(z, 'e1')!;
    expect(neu.maxTests).toEqual([]);
    expect(neu.zirkelErgebnisse).toEqual([]);
  });

  it('löscht weder geplante Einheiten noch den Testtag', () => {
    expect(loescheEinheit(nach(einheit('e1', 20, { status: 'geplant' })), 'e1')).toBeUndefined();
    expect(loescheEinheit(nach(einheit('e1', 20, { format: 'test' })), 'e1')).toBeUndefined();
  });
});
