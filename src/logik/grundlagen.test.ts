// Entscheidungen 09.11.2026: Steigerung in 2er-Schritten, grobe Reserve im Messsatz, leichte Tage jedes
// 3. Mal Körpergewicht statt einer Grundübung mit Gewicht.
import { describe, expect, it } from 'vitest';
import { MESSSATZ, PROGRESSION } from '../konfiguration';
import { erstelleEinheit, kgAbwechslung } from './planung';
import { satzVorgabe, schritte } from './player';
import { schliesseEinheitAb, werteUebungAus } from './progression';
import { ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit, Position, VarianteZustand } from './typen';
import { einstellungenVon, uebungVon, wdhStufe } from './verlauf';

const MO = zeitpunkt(0, 18);
const KH = 'kh_bankdruecken';   // Grundübung, Bereich 8 bis 12
const variante = (uebungId: string, werte: Partial<VarianteZustand>): VarianteZustand =>
  ({ uebungId, zielWdh: 10, seitSteigerung: 5, schwerSerie: 0, ...werte });
const position = (uebungId: string, zielWdh: number, saetze: number[], werte: Partial<Position> = {}): Position => ({
  uebungId, saetze: saetze.length, zielWdh, ...werte,
  ergebnisse: saetze.map((wdh, i) => ({ nr: i + 1, wdh, ...(werte.last !== undefined ? { last: werte.last } : {}), zeit: MO })),
});
const einheit = (id: string, jetzt: string, positionen: Position[]): Einheit => ({
  id, woche: '2026-W43', erstelltAm: jetzt, gestartetAm: jetzt, beendetAm: jetzt, status: 'abgeschlossen', ortId: 'zuhause',
  fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [], bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen }],
});

describe('Steigerung in 2er-Schritten', () => {
  it('Ziele mit Wiederholungen sind gerade Zahlen, abgerundet; mindestens 1', () => {
    expect([wdhStufe(11), wdhStufe(10), wdhStufe(7.5), wdhStufe(3), wdhStufe(1), wdhStufe(1.5)]).toEqual([10, 10, 6, 2, 1, 1]);
  });

  it('„passend“ +2, „zu leicht“ +4 (oder mehr Gewicht)', () => {
    expect(PROGRESSION.zielPlusPassend).toBe(2);
    expect(PROGRESSION.zielPlusLeicht).toBe(4);
    const z = { ...zustand(), varianten: [variante(KH, { last: 16, zielWdh: 8, e1rm: 26 })] };
    expect(werteUebungAus(z, position(KH, 8, [8, 8, 8], { last: 16, feedback: 'passend' }), MO, 'zuhause').variante.zielWdh).toBe(10);
  });

  it('ein geschafftes ungerades Ziel von früher sinkt durch das Abrunden nicht', () => {
    // Die Schätzung lässt nur 9 zu: das Ziel 9 bleibt, statt auf 8 zu fallen.
    const knapp = { ...zustand(), varianten: [variante(KH, { last: 16, zielWdh: 9, e1rm: 16 * (1 + 9 / 30) })] };
    expect(werteUebungAus(knapp, position(KH, 9, [9], { last: 16, feedback: 'passend' }), MO, 'zuhause').variante.zielWdh).toBe(9);
    // Lässt sie 10 zu, geht es auf die nächste gerade Zahl.
    const genug = { ...zustand(), varianten: [variante(KH, { last: 16, zielWdh: 9, e1rm: 24 })] };
    expect(werteUebungAus(genug, position(KH, 9, [9], { last: 16, feedback: 'passend' }), MO, 'zuhause').variante.zielWdh).toBe(10);
  });
});

describe('Messsatz mit groben Stufen', () => {
  it('„Noch 1 bis 2“ zählt als 1,5 Reserve: 10 Wdh. bei Ziel 10 sind passend, das Ziel steigt um 2', () => {
    const z = { ...zustand(), varianten: [variante(KH, { last: 16, zielWdh: 10, e1rm: 24 })] };
    const p = position(KH, 10, [10, 10, 10], { last: 16, reserve: MESSSATZ.stufen.einsBisZwei, feedback: 'passend' });
    expect(werteUebungAus(z, p, MO, 'zuhause').variante).toMatchObject({ last: 16, zielWdh: 12 });
  });
});

describe('Abwechslung mit Körpergewicht', () => {
  const basis = (): AppZustand => ({
    ...zustand({ katalog: 'voll', orte: [ort()] }), varianten: [variante(KH, { last: 16, zielWdh: 10, e1rm: 24 })],
    muster: [{ muster: 'hDruck', stufe: 5, hauptvarianten: [KH] }],
  });
  // `art`: n = normales Hanteltraining, k = Abwechslung mit Liegestützen
  const mitEinheiten = (z: AppZustand, art: string): AppZustand => ({
    ...z,
    einheiten: [...art].map((a, i) => einheit(`e${i}`, zeitpunkt(i, 18), [a === 'k'
      ? position('liegestuetz_fuesse_erhoeht', 10, [10, 10, 10], { abwechslungFuer: KH })
      : position(KH, 10, [10, 10, 10], { last: 16 })])),
  });
  const o = ort();
  const jetzt = zeitpunkt(6, 18);
  const kg = (z: AppZustand, id = KH) => kgAbwechslung(z, einstellungenVon(z), o, uebungVon(z, id)!, jetzt);

  it('jedes 3. Mal: nach 2 Hanteltrainings eine Körpergewichtsvariante desselben Musters', () => {
    expect(kg(mitEinheiten(basis(), ''))).toBeUndefined();
    expect(kg(mitEinheiten(basis(), 'n'))).toBeUndefined();
    const u = kg(mitEinheiten(basis(), 'nn'))!;
    expect(u).toMatchObject({ muster: 'hDruck', lasttyp: 'KG' });
    // Passend schwer: die schwerste am Ort bis zur Musterstufe 5
    expect(u.stufe).toBe(5);
    expect(kg(mitEinheiten(basis(), 'nnk'))).toBeUndefined();
    expect(kg(mitEinheiten(basis(), 'nnkn'))).toBeUndefined();
    expect(kg(mitEinheiten(basis(), 'nnknn'))).toBeDefined();
  });

  it('nur für Grundübungen mit Gewicht; die gespeicherte Variante des Musters geht vor', () => {
    const z = mitEinheiten(basis(), 'nn');
    const curls = { ...z, varianten: [...z.varianten, variante('kh_curls', { last: 10 })] };
    expect(kg(curls, 'kh_curls')).toBeUndefined();
    const gespeichert = { ...z, muster: [{ muster: 'hDruck' as const, stufe: 5, hauptvarianten: [KH], kgVariante: 'liegestuetz' }] };
    expect(kg(gespeichert)!.id).toBe('liegestuetz');
  });

  it('die Planung ersetzt die Hantelübung; die Körpergewichtsvariante wird normal gesteigert', () => {
    const z = mitEinheiten(basis(), 'nn');
    const e = erstelleEinheit(z, { jetzt, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, muskeln: ['Brust'] });
    const p = e.bloecke.flatMap((b) => b.positionen).find((x) => x.abwechslungFuer === KH)!;
    expect(uebungVon(z, p.uebungId)).toMatchObject({ muster: 'hDruck', lasttyp: 'KG' });
    expect(e.bloecke.flatMap((b) => b.positionen).some((x) => x.uebungId === KH)).toBe(false);
    const fertig = { ...e, status: 'abgeschlossen' as const, gestartetAm: jetzt, bloecke: e.bloecke.map((b) => ({ ...b, positionen: b.positionen.map((x) => ({
      ...x, feedback: 'passend' as const, ergebnisse: Array.from({ length: x.saetze }, (_, i) => ({ nr: i + 1, wdh: x.zielWdh, zeit: jetzt })),
    })) })) };
    const nach = schliesseEinheitAb(z, fertig, zeitpunkt(6, 19));
    // Hantelübung unverändert, die Körpergewichtsvariante hat einen eigenen Verlauf und ist gemerkt
    expect(nach.varianten.find((v) => v.uebungId === KH)).toMatchObject({ last: 16, zielWdh: 10 });
    expect(nach.varianten.some((v) => v.uebungId === p.uebungId)).toBe(true);
    expect(nach.muster.find((m) => m.muster === 'hDruck')!.kgVarianten?.Brust).toBe(p.uebungId);
    expect(satzVorgabe(z, e, schritte(e).find((s) => e.bloecke[s.block]!.positionen[s.position] === p)!).reserve).toContain('Abwechslung');
  });
});
