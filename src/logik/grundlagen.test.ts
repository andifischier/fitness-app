// Entscheidungen 09.11.2026: Steigerung in 2er-Schritten, grobe Reserve im Messsatz, leichte Tage jedes
// 3. Mal bei Grundübungen mit Gewicht.
import { describe, expect, it } from 'vitest';
import { MESSSATZ, PROGRESSION } from '../konfiguration';
import { leichterTag } from './planung';
import { offeneFeedbacks, satzVorgabe, schritte } from './player';
import { schliesseEinheitAb, werteUebungAus } from './progression';
import { ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit, Position, VarianteZustand } from './typen';
import { einstellungenVon, uebungVon, wdhBei, wdhStufe } from './verlauf';

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

describe('Leichte Tage', () => {
  const basis = (): AppZustand => ({ ...zustand({ orte: [ort()] }), varianten: [variante(KH, { last: 16, zielWdh: 10, e1rm: 24 })] });
  const mitEinheiten = (z: AppZustand, leicht: boolean[]): AppZustand => ({
    ...z,
    einheiten: leicht.map((l, i) => einheit(`e${i}`, zeitpunkt(i, 18),
      [position(KH, l ? 16 : 10, l ? [16, 16, 16] : [10, 10, 10], { last: l ? 10 : 16, ...(l ? { leicht: true } : {}) })])),
  });
  const o = ort();
  const u = (z: AppZustand) => uebungVon(z, KH)!;

  it('jedes 3. Mal: nach 2 normalen Trainings leicht, danach wieder 2 normale', () => {
    const jetzt = zeitpunkt(6, 18);
    expect(leichterTag(mitEinheiten(basis(), []), einstellungenVon(basis()), o, u(basis()), jetzt)).toBeUndefined();
    expect(leichterTag(mitEinheiten(basis(), [false]), einstellungenVon(basis()), o, u(basis()), jetzt)).toBeUndefined();
    const z = mitEinheiten(basis(), [false, false]);
    const l = leichterTag(z, einstellungenVon(z), o, u(z), jetzt)!;
    // Schwerstes Gewicht mit mindestens 16 Wdh. laut Schätzung; Ziel 16 bis 20, gerade Zahl
    expect(l.last).toBeLessThan(16);
    expect(wdhBei(24, l.last, 1)).toBeGreaterThanOrEqual(16);
    expect(l.zielWdh).toBeGreaterThanOrEqual(16);
    expect(l.zielWdh).toBeLessThanOrEqual(20);
    expect(l.zielWdh % 2).toBe(0);
    expect(leichterTag(mitEinheiten(basis(), [false, false, true]), einstellungenVon(z), o, u(z), jetzt)).toBeUndefined();
    expect(leichterTag(mitEinheiten(basis(), [false, false, true, false]), einstellungenVon(z), o, u(z), jetzt)).toBeUndefined();
    expect(leichterTag(mitEinheiten(basis(), [false, false, true, false, false]), einstellungenVon(z), o, u(z), jetzt)).toBeDefined();
  });

  it('nur Grundübungen mit Gewicht und bekannter Kraftschätzung', () => {
    const z = mitEinheiten(basis(), [false, false]);
    const e = einstellungenVon(z);
    const curls = { ...z, varianten: [...z.varianten, variante('kh_curls', { last: 10, zielWdh: 10, e1rm: 14 })] };
    expect(leichterTag(curls, e, o, uebungVon(z, 'kh_curls')!, zeitpunkt(6, 18))).toBeUndefined();
    const ohneSchaetzung = { ...z, varianten: [variante(KH, { last: 16, zielWdh: 10 })] };
    expect(leichterTag(ohneSchaetzung, e, o, u(z), zeitpunkt(6, 18))).toBeUndefined();
  });

  it('ein leichter Tag steigert nichts, hat keinen Messsatz und kein Feedback am Ende', () => {
    const z = mitEinheiten(basis(), [false, false]);
    const leicht = einheit('leicht', zeitpunkt(6, 18), [position(KH, 16, [18, 18, 18], { last: 10, leicht: true })]);
    const nach = schliesseEinheitAb(z, leicht, zeitpunkt(6, 19));
    expect(nach.varianten.find((v) => v.uebungId === KH)).toMatchObject({ last: 16, zielWdh: 10, e1rm: 24 });
    const geplant: Einheit = { ...leicht, status: 'geplant', bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ ...position(KH, 16, [], { last: 10, leicht: true }), saetze: 3 }] }] };
    const letzter = schritte(geplant).at(-1)!;
    expect(satzVorgabe(z, geplant, letzter).messReserve).toBeUndefined();
    expect(satzVorgabe(z, geplant, letzter).reserve).toContain('Leichter Tag');
    expect(offeneFeedbacks(leicht)).toEqual([]);
  });
});
