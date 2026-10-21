import { describe, expect, it } from 'vitest';
import { isoWoche } from './datum';
import {
  aktuelleEinheit, backupErinnerung, heuteErledigt, keinMuskelErholt, mobilityAlle, naechsterMaxTest, wocheMitPrognose, zirkelBestzeit, zirkelVorgaben,
} from './heute';
import { erstelleEinheit, wochenziele } from './planung';
import { ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import { MUSKELN, type AppZustand, type Einheit } from './typen';

const MI = zeitpunkt(2, 18);
const voll = (opt: Parameters<typeof zustand>[0] = {}) => zustand({ katalog: 'voll', ...opt });

const einheit = (id: string, status: Einheit['status'], erstelltAm: string): Einheit => ({
  id, woche: isoWoche(erstelltAm), erstelltAm, status, ortId: 'zuhause', fokus: 'ganz', format: 'klassisch',
  geschaetzteDauerMin: 40, aufwaermen: [], bloecke: [],
});

describe('wocheMitPrognose', () => {
  it('legt eine neue Woche mit Prognose und Wochenzielen an', () => {
    const z = zustand();
    const w = wocheMitPrognose(z, MI, 3, 'zuhause');
    expect(w).toMatchObject({ id: '2026-W43', prognose: 3, einheiten: 0, erholungswoche: false, laengerAngenommen: false });
    expect(w.ziele).toEqual(wochenziele(z, 3, 'zuhause', MI));
    expect(Object.values(w.erledigt).every((x) => x === 0)).toBe(true);
  });

  it('behält Erledigtes und liegt nie unter den erledigten Einheiten', () => {
    let z = setzePrognose(zustand(), MI, 4);
    z = { ...z, wochen: z.wochen.map((w) => ({ ...w, einheiten: 2, erledigt: { ...w.erledigt, Brust: 5 } })) };
    const w = wocheMitPrognose(z, MI, 1, 'zuhause');
    expect(w.prognose).toBe(2);
    expect(w.einheiten).toBe(2);
    expect(w.erledigt.Brust).toBe(5);
    expect(wocheMitPrognose(z, MI, 9, 'zuhause').prognose).toBe(6);
  });

  it('übernimmt die Erholungswoche nur für eine neue Woche, „länger“ bleibt gesetzt', () => {
    const neu = wocheMitPrognose(zustand(), MI, 3, 'zuhause', { erholungswoche: true, laenger: true });
    expect(neu).toMatchObject({ erholungswoche: true, laengerAngenommen: true });
    expect(neu.ziele).toEqual(wochenziele(zustand(), 3, 'zuhause', MI, true));
    expect(neu.ziele.Brust).toBeLessThan(wochenziele(zustand(), 3, 'zuhause', MI).Brust);
    const z = { ...zustand(), wochen: [neu] };
    expect(wocheMitPrognose(z, MI, 2, 'zuhause', { erholungswoche: false })).toMatchObject({ erholungswoche: true, laengerAngenommen: true });
  });
});

describe('aktuelleEinheit', () => {
  it('bevorzugt eine laufende Einheit, sonst die heute erstellte', () => {
    const z: AppZustand = {
      ...zustand(),
      einheiten: [einheit('alt', 'geplant', zeitpunkt(1, 18)), einheit('heute', 'geplant', zeitpunkt(2, 9))],
    };
    expect(aktuelleEinheit(z, MI)?.id).toBe('heute');
    expect(aktuelleEinheit(z, zeitpunkt(3, 9))).toBeUndefined();
    const mitLaufend = { ...z, einheiten: [...z.einheiten, einheit('lauf', 'laufend', zeitpunkt(0, 18))] };
    expect(aktuelleEinheit(mitLaufend, MI)?.id).toBe('lauf');
  });
});

describe('naechsterMaxTest', () => {
  it('ohne bisherigen Test ist der erste Test der Rotation sofort fällig', () => {
    expect(naechsterMaxTest(voll({ maxTests: [] }), MI, 'zuhause')).toEqual({ muster: 'hDruck', uebungId: 'liegestuetz', ab: MI });
  });

  it('nach dem Testtag 21 Tage später, bei 1 bis 2 Einheiten 28 Tage', () => {
    // Testtag am Sonntag, 18.10.2026: alle Muster gleich alt, Reihenfolge der Rotation
    expect(naechsterMaxTest(voll(), MI, 'zuhause')).toEqual({ muster: 'hDruck', uebungId: 'liegestuetz', ab: '2026-11-08T10:00:00' });
    const z = setzePrognose(voll(), MI, 2);
    expect(naechsterMaxTest(z, MI, 'zuhause')?.ab).toBe('2026-11-15T10:00:00');
  });

  it('überspringt Tests, die am Ort nicht gehen, und wartet in der Erholungswoche bis Montag', () => {
    const ohneStange = { ...voll({ maxTests: [] }), orte: [ort(['KH', 'TISCH', 'ERH'])] };
    const z: AppZustand = {
      ...ohneStange,
      maxTests: [{ id: 't', datum: '2026-10-18T10:00:00', muster: 'hDruck', uebungId: 'liegestuetz', ergebnis: 20, einheit: 'Wdh.' }],
    };
    expect(naechsterMaxTest(z, MI, 'zuhause')?.muster).toBe('Knie');
    const erholung = setzePrognose(z, MI, 3);
    erholung.wochen = erholung.wochen.map((w) => ({ ...w, erholungswoche: true }));
    expect(naechsterMaxTest(erholung, MI, 'zuhause')).toEqual({ muster: 'Knie', uebungId: 'kniebeuge', ab: '2026-10-26T00:00:00' });
  });
});

describe('keinMuskelErholt', () => {
  it('erkennt, wenn kein Muskel erholt ist; die Einheit bleibt dann leer', () => {
    const z: AppZustand = {
      ...voll(),
      muskeln: MUSKELN.map((muskel) => ({
        muskel, letzteBelastung: zeitpunkt(0, 18), letzteDosis: 3, letzteSchwer: false, persoenlicheGrenze: 12, gleichWochen: 0, leistung: [],
      })),
    };
    const dienstag = zeitpunkt(1, 17);   // 23 Std. später, Fenster 24 Std.
    expect(keinMuskelErholt(z, dienstag)).toBe(true);
    expect(erstelleEinheit(z, { jetzt: dienstag, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false }).bloecke).toEqual([]);
    expect(keinMuskelErholt(z, zeitpunkt(1, 18))).toBe(false);
    expect(keinMuskelErholt(voll(), dienstag)).toBe(false);
  });
});

describe('backupErinnerung', () => {
  const fertig = (zeit: string) => ({ ...einheit(zeit, 'abgeschlossen', zeit), gestartetAm: zeit });

  it('schlägt 1 Woche nach dem letzten Backup bzw. nach der ersten Einheit ein Backup vor', () => {
    const z = zustand();
    expect(backupErinnerung(z, MI)).toBe(false);
    const mitEinheit = { ...z, einheiten: [fertig('2026-09-20T10:00:00')] };
    expect(backupErinnerung(mitEinheit, '2026-09-27T09:00:00')).toBe(false);
    expect(backupErinnerung(mitEinheit, '2026-09-27T10:00:00')).toBe(true);
    const mitBackup = { ...mitEinheit, einstellungen: [{ ...mitEinheit.einstellungen[0]!, letztesBackup: '2026-10-01T10:00:00' }] };
    expect(backupErinnerung(mitBackup, '2026-10-08T09:00:00')).toBe(false);
    expect(backupErinnerung(mitBackup, '2026-10-08T10:00:00')).toBe(true);
  });
});

describe('Zirkel', () => {
  it('Bestzeit gilt je Zirkel, Ort und Variantensatz', () => {
    const z = voll();
    const plan = erstelleEinheit(z, { jetzt: MI, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, zirkelId: 'sprint' });
    const varianten = plan.bloecke[0]!.positionen.map((p) => p.uebungId);
    const mit: AppZustand = {
      ...z,
      zirkelErgebnisse: [
        { zirkelId: 'sprint', ortId: 'zuhause', datum: zeitpunkt(0, 9), zeitSek: 700, varianten },
        { zirkelId: 'sprint', ortId: 'zuhause', datum: zeitpunkt(1, 9), zeitSek: 650, varianten },
        { zirkelId: 'sprint', ortId: 'zuhause', datum: zeitpunkt(1, 19), zeitSek: 500, varianten: ['andere'] },
        { zirkelId: 'sprint', ortId: 'park', datum: zeitpunkt(1, 20), zeitSek: 400, varianten },
      ],
    };
    expect(zirkelBestzeit(mit, 'sprint', 'zuhause', MI)).toBe(650);
    expect(zirkelBestzeit(mit, 'fundament', 'zuhause', MI)).toBeUndefined();
  });

  it('liefert die Vorgaben der Stationen aus dem Katalog', () => {
    const z = voll();
    const plan = erstelleEinheit(z, { jetzt: MI, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, zirkelId: 'fundament' });
    const katalog = z.katalog.zirkel.find((x) => x.id === 'fundament')!.stationen.map((s) => String(s.vorgabe));
    expect(zirkelVorgaben(z, plan)).toEqual(katalog);
  });
});

describe('mobilityAlle', () => {
  it('zeigt die Mobility aller Muster ohne Doppelte, Zeilen mit Utensil nur, wenn es da ist', () => {
    const z = voll();
    const mitBand = mobilityAlle(z, ort());
    expect(mitBand).toContain('10 Band-Pull-Aparts');
    expect(new Set(mitBand).size).toBe(mitBand.length);
    expect(mobilityAlle(z, ort(['KH']))).not.toContain('10 Band-Pull-Aparts');
  });
});

describe('heuteErledigt', () => {
  const satz = { nr: 1, wdh: 10, zeit: MI };
  const fertig = (id: string, gestartetAm: string, saetze: number, format: Einheit['format'] = 'klassisch'): Einheit => ({
    ...einheit(id, 'abgeschlossen', gestartetAm), gestartetAm, beendetAm: gestartetAm.replace('T18:00', 'T18:42'), format,
    bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId: 'liegestuetz', saetze, zielWdh: 10, ergebnisse: Array.from({ length: saetze }, () => satz) }] }],
  });

  it('meldet die heute beendete Einheit mit Dauer und Sätzen, auch den Testtag', () => {
    const z = { ...zustand(), einheiten: [fertig('a', zeitpunkt(1, 18), 3), fertig('b', MI, 4)] };
    expect(heuteErledigt(z, zeitpunkt(2, 20))).toMatchObject({ einheit: { id: 'b' }, dauerMin: 42, saetze: 4 });
    const test = { ...zustand(), einheiten: [fertig('t', MI, 4, 'test')] };
    expect(heuteErledigt(test, zeitpunkt(2, 20))?.einheit.id).toBe('t');
  });

  it('meldet nichts ohne heute erledigten Satz', () => {
    const z = { ...zustand(), einheiten: [fertig('a', zeitpunkt(1, 18), 3), { ...fertig('b', MI, 0), status: 'abgebrochen' as const }] };
    expect(heuteErledigt(z, zeitpunkt(2, 20))).toBeUndefined();
  });
});
