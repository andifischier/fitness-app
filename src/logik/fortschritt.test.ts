import { describe, expect, it } from 'vitest';
import { isoWoche, wocheVerschoben } from './datum';
import {
  achse, dauerSek, maxTestReihen, saetzeVon, uebungVerlauf, verlauf, verlaufUebungen, wochenvolumen, zieleDieseWoche, zirkelBestzeiten,
} from './fortschritt';
import { startfragen, wochenziele } from './planung';
import { istEntlastung, wochenSaetze } from './progression';
import { setzePrognose, zeitpunkt, zustand } from './testhilfe';
import { MUSKELN, type AppZustand, type Einheit, type MaxTest, type Muskel, type Woche, type ZirkelErgebnis } from './typen';

const MI = zeitpunkt(2, 18);   // Mittwoch in KW 43
const KW43 = isoWoche(MI);

const test = (id: string, datum: string, muster: MaxTest['muster'], uebungId: string, ergebnis: number,
  einheit: MaxTest['einheit'] = 'Wdh.'): MaxTest => ({ id, datum, muster, uebungId, ergebnis, einheit });

const woche = (id: string, saetze: Partial<Record<Muskel, number>>, extra: Partial<Woche> = {}): Woche => ({
  id, prognose: 3, einheiten: 3,
  ziele: Object.fromEntries(MUSKELN.map((m) => [m, 10])) as Record<Muskel, number>,
  erledigt: Object.fromEntries(MUSKELN.map((m) => [m, saetze[m] ?? 0])) as Record<Muskel, number>,
  erholungswoche: false, laengerAngenommen: false, ...extra,
});

const einheit = (id: string, extra: Partial<Einheit> = {}): Einheit => ({
  id, woche: KW43, erstelltAm: zeitpunkt(1, 17), status: 'abgeschlossen', ortId: 'zuhause', fokus: 'ganz',
  format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [], bloecke: [], ...extra,
});

describe('maxTestReihen', () => {
  it('bildet je Muster und Übung einen Verlauf, älteste zuerst, mit Zuwachs seit dem ersten Test', () => {
    const z: AppZustand = {
      ...zustand(),
      maxTests: [
        test('a', '2026-09-01T10:00:00', 'vZug', 'klimmzug', 8),
        test('b', '2026-07-01T10:00:00', 'vZug', 'klimmzug', 6),
        test('c', '2026-10-01T10:00:00', 'vZug', 'klimmzug', 9),
        test('d', '2026-07-01T10:00:00', 'Rumpf', 'plank', 40, 'Sek.'),
        test('e', '2026-08-01T10:00:00', 'Rumpf', 'plank', 55, 'Sek.'),
        test('f', '2026-07-01T10:00:00', 'hDruck', 'liegestuetz', 20),
      ],
    };
    const reihen = maxTestReihen(z);
    expect(reihen.map((r) => r.muster)).toEqual(['hDruck', 'vZug', 'Rumpf']);
    const zug = reihen[1]!;
    expect(zug.punkte.map((p) => p.wert)).toEqual([6, 8, 9]);
    expect(zug.seitStart).toBe(3);
    expect(reihen[2]).toMatchObject({ einheit: 'Sek.', seitStart: 15 });
    expect(reihen[0]).toMatchObject({ seitStart: 0, punkte: [{ wert: 20 }] });
  });

  it('trennt Tests mit verschiedenen Übungen desselben Musters', () => {
    const z: AppZustand = {
      ...zustand(),
      maxTests: [test('a', '2026-07-01T10:00:00', 'vZug', 'klimmzug', 3), test('b', '2026-08-01T10:00:00', 'vZug', 'klimmzug_band', 9)],
    };
    expect(maxTestReihen(z).map((r) => [r.uebungId, r.seitStart])).toEqual([['klimmzug', 0], ['klimmzug_band', 0]]);
  });

  it('ist ohne Tests leer', () => {
    expect(maxTestReihen({ ...zustand(), maxTests: [] })).toEqual([]);
  });
});

describe('Entlastungswochen', () => {
  it('zählt eine Woche unter 60 % des Mittels der 4 Wochen davor als Entlastung, fehlende Wochen mit 0', () => {
    const ids = [-5, -4, -3, -2, -1].map((d) => wocheVerschoben(KW43, d));
    const z: AppZustand = {
      ...zustand(),
      wochen: [woche(ids[0]!, { Brust: 50 }), woche(ids[1]!, { Brust: 50 }), woche(ids[2]!, { Brust: 50 }),
        woche(ids[3]!, { Brust: 50 }), woche(ids[4]!, { Brust: 29.5 })],
    };
    expect(wochenSaetze(z, ids[4]!)).toBe(29.5);
    expect(istEntlastung(z, ids[4]!)).toBe(true);                 // 29,5 < 0,6 × 50
    const genau: AppZustand = { ...z, wochen: z.wochen.map((w) => (w.id === ids[4] ? woche(w.id, { Brust: 30 }) : w)) };
    expect(istEntlastung(genau, ids[4]!)).toBe(false);            // 30 = 60 %
    expect(istEntlastung(z, ids[0]!)).toBe(false);                // keine Wochen davor: übliches Volumen 0
  });

  it('zählt eine Erholungswoche immer als Entlastung', () => {
    const id = wocheVerschoben(KW43, -1);
    const z: AppZustand = { ...zustand(), wochen: [woche(id, { Brust: 99 }, { erholungswoche: true })] };
    expect(istEntlastung(z, id)).toBe(true);
  });
});

describe('wochenvolumen', () => {
  it('ist ohne gespeicherte Woche null', () => {
    expect(wochenvolumen(zustand(), MI)).toBeNull();
  });

  it('zeigt höchstens 6 Wochen bis zur laufenden und markiert abgeschlossene Entlastungswochen', () => {
    const ids = Array.from({ length: 9 }, (_, i) => wocheVerschoben(KW43, i - 8));
    const wochen = ids.map((id, i) => woche(id, { Brust: i === 6 ? 4 : 12, Ruecken: i === 6 ? 2 : 10 }, { einheiten: i === 6 ? 1 : 3 }));
    wochen[8] = woche(KW43, { Brust: 2 }, { einheiten: 1 });     // laufende Woche, noch wenig
    const z: AppZustand = { ...zustand(), wochen };
    const v = wochenvolumen(z, MI)!;
    expect(v.wochen.map((w) => w.woche)).toEqual(ids.slice(3));
    expect(v.wochen.at(-1)).toMatchObject({ woche: KW43, aktuell: true, entlastung: false });
    expect(v.wochen.filter((w) => w.entlastung).map((w) => w.woche)).toEqual([ids[6]]);
    expect(v.wochen.find((w) => w.woche === ids[6])).toMatchObject({ einheiten: 1 });
    expect(v.wochen.map((w) => w.erledigt.Brust)).toEqual([12, 12, 12, 4, 12, 2]);
  });

  it('beginnt frühestens mit der ersten gespeicherten Woche; Wochen ohne Training zählen 0', () => {
    const z: AppZustand = { ...zustand(), wochen: [woche(wocheVerschoben(KW43, -2), { Brust: 12 })] };
    const v = wochenvolumen(z, MI)!;
    expect(v.wochen.map((w) => [w.woche, w.erledigt.Brust, w.einheiten])).toEqual([
      [wocheVerschoben(KW43, -2), 12, 3], [wocheVerschoben(KW43, -1), 0, 0], [KW43, 0, 0],
    ]);
    expect(v.wochen[1]!.entlastung).toBe(true);
  });

  it('nutzt die Wochenziele wie Heute und zeigt nur Muskeln mit Ziel oder Erledigtem', () => {
    const z = setzePrognose(zustand(), MI, 4);
    const v = wochenvolumen(z, MI)!;
    expect(v.ziele).toEqual(wochenziele(z, 4, 'zuhause', MI));
    expect(v.muskeln).toEqual(MUSKELN.filter((m) => v.ziele[m] > 0));
    const ohneWoche = zustand();
    expect(zieleDieseWoche(ohneWoche, MI)).toEqual(wochenziele(ohneWoche, startfragen(ohneWoche, MI).prognoseVorschlag, 'zuhause', MI));
    expect(zieleDieseWoche({ ...z, orte: [] }, MI)).toEqual(z.wochen[0]!.ziele);
  });
});

describe('zirkelBestzeiten', () => {
  const r = (zirkelId: string, ortId: string, zeitSek: number, datum: string, varianten = ['a', 'b']): ZirkelErgebnis =>
    ({ zirkelId, ortId, zeitSek, datum, varianten });

  it('liefert die beste Zeit je Zirkel, Ort und Übungsauswahl in Katalogreihenfolge', () => {
    const [erster, zweiter] = zustand().katalog.zirkel.map((x) => x.id);
    const z: AppZustand = {
      ...zustand(),
      zirkelErgebnisse: [
        r(zweiter!, 'zuhause', 700, '2026-09-01T10:00:00'),
        r(erster!, 'zuhause', 650, '2026-09-02T10:00:00'),
        r(erster!, 'zuhause', 600, '2026-09-09T10:00:00'),
        r(erster!, 'zuhause', 600, '2026-09-16T10:00:00'),
      ],
    };
    const liste = zirkelBestzeiten(z);
    expect(liste.map((b) => [b.zirkelId, b.zeitSek, b.datum])).toEqual([
      [erster, 600, '2026-09-09T10:00:00'], [zweiter, 700, '2026-09-01T10:00:00'],
    ]);
    expect(liste.every((b) => b.abweichend.length === 0)).toBe(true);
  });

  it('führt eine andere Übungsauswahl als eigene Zeile und nennt die abweichenden Übungen', () => {
    const z: AppZustand = {
      ...zustand(),
      zirkelErgebnisse: [
        r('sprint', 'zuhause', 500, '2026-09-01T10:00:00', ['a', 'b', 'c']),
        r('sprint', 'zuhause', 450, '2026-10-01T10:00:00', ['a', 'x', 'c']),
        r('sprint', 'hotel', 480, '2026-10-02T10:00:00', ['a', 'y', 'c']),
      ],
    };
    const liste = zirkelBestzeiten(z).filter((b) => b.ortId === 'zuhause');
    expect(liste.map((b) => [b.zeitSek, b.abweichend])).toEqual([[500, ['b']], [450, ['x']]]);
    expect(zirkelBestzeiten(z).find((b) => b.ortId === 'hotel')!.abweichend).toEqual([]);
  });
});

describe('verlauf', () => {
  it('listet beendete Einheiten neueste zuerst, ohne geplante und laufende', () => {
    const z: AppZustand = {
      ...zustand(),
      einheiten: [
        einheit('alt', { gestartetAm: zeitpunkt(0, 18) }),
        einheit('neu', { gestartetAm: zeitpunkt(2, 18), status: 'abgebrochen' }),
        einheit('test', { gestartetAm: zeitpunkt(-1, 10), format: 'test' }),
        einheit('plan', { status: 'geplant' }),
        einheit('lauf', { status: 'laufend', gestartetAm: zeitpunkt(3, 8) }),
      ],
    };
    expect(verlauf(z).map((e) => e.id)).toEqual(['neu', 'alt', 'test']);
  });

  it('berechnet Dauer und Sätze und zeigt Feedback nur für normale Übungen', () => {
    const e = einheit('e', {
      gestartetAm: '2026-10-20T18:00:00', beendetAm: '2026-10-20T18:42:30',
      bloecke: [
        { typ: 'einzeln', pauseSek: 90, positionen: [
          { uebungId: 'liegestuetz', saetze: 1, zielWdh: 0, istMaxTest: true, ergebnisse: [{ nr: 1, wdh: 22, zeit: '' }] },
        ] },
        { typ: 'supersatz', pauseSek: 75, positionen: [
          { uebungId: 'kh_bankdruecken', saetze: 3, zielWdh: 10, last: 16, feedback: 'leicht',
            ergebnisse: [{ nr: 1, wdh: 12, zeit: '' }, { nr: 2, wdh: 11, zeit: '' }, { nr: 3, wdh: 10, zeit: '' }] },
          { uebungId: 'kh_rudern_einarmig', saetze: 3, zielWdh: 10, last: 14, ergebnisse: [{ nr: 1, wdh: 7, zeit: '' }] },
          { uebungId: 'kh_curls', saetze: 3, zielWdh: 10, ergebnisse: [] },
        ] },
      ],
    });
    expect(dauerSek(e)).toBe(2550);
    expect(dauerSek(einheit('x'))).toBeUndefined();
    expect(saetzeVon(e)).toBe(5);
    const liste = verlaufUebungen(e);
    expect(liste.map((u) => [u.position.uebungId, u.feedback])).toEqual([
      ['liegestuetz', undefined], ['kh_bankdruecken', 'leicht'], ['kh_rudern_einarmig', 'schwer'],
    ]);
  });

  it('gibt Zirkel-Stationen kein Feedback', () => {
    const e = einheit('z', {
      format: 'zirkel',
      bloecke: [{ typ: 'zirkel', pauseSek: 0, zirkelId: 'sprint', runden: 3, positionen: [
        { uebungId: 'kniebeuge', saetze: 3, zielWdh: 15, ergebnisse: [{ nr: 1, wdh: 15, zeit: '' }] },
      ] }],
    });
    const [station] = verlaufUebungen(e);
    expect(station).toMatchObject({ zirkel: true });
    expect(station!.feedback).toBeUndefined();
  });
});

describe('achse', () => {
  it('wählt runde Linien, die alle Werte einschließen', () => {
    expect(achse([6, 7, 7, 8, 9])).toEqual({ min: 6, max: 10, linien: [6, 8, 10] });
    expect(achse([20])).toEqual({ min: 20, max: 21, linien: [20, 21] });
    expect(achse([40, 55, 75])).toEqual({ min: 40, max: 80, linien: [40, 60, 80] });
    expect(achse([0, 1])).toEqual({ min: 0, max: 1, linien: [0, 1] });
    for (const werte of [[3, 17], [0, 0], [120, 180], [5, 6]]) {
      const a = achse(werte);
      expect(a.min).toBeLessThanOrEqual(Math.min(...werte));
      expect(a.max).toBeGreaterThan(Math.min(...werte));
      expect(a.max).toBeGreaterThanOrEqual(Math.max(...werte));
      expect(a.linien.length).toBeGreaterThanOrEqual(2);
      expect(a.linien.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('uebungVerlauf', () => {
  const mit = (id: string, tag: number, wdh: number[], last: number, extra: Partial<Einheit> = {}) => einheit(id, {
    erstelltAm: zeitpunkt(tag, 18), gestartetAm: zeitpunkt(tag, 18),
    bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{
      uebungId: 'kh_bankdruecken', saetze: wdh.length, zielWdh: 10, last,
      ergebnisse: wdh.map((w, i) => ({ nr: i + 1, wdh: w, ...(i === wdh.length - 1 ? { last: last - 2 } : {}), zeit: zeitpunkt(tag, 18) })),
    }] }],
    ...extra,
  });

  it('zeigt die letzten 5 Einheiten neueste zuerst mit Gewicht je Satz und das nächste Ziel', () => {
    const einheiten = [0, 1, 2, 3, 4, 5].map((t) => mit(`e${t}`, t, [10, 9], 16 + t));
    const z: AppZustand = { ...zustand(), einheiten, varianten: [{ uebungId: 'kh_bankdruecken', last: 22, zielWdh: 11, seitSteigerung: 0, schwerSerie: 0 }] };
    const v = uebungVerlauf(z, 'kh_bankdruecken');
    expect(v.sitzungen.map((s) => s.datum)).toEqual([5, 4, 3, 2, 1].map((t) => zeitpunkt(t, 18).slice(0, 10)));
    expect(v.sitzungen[0]!.saetze).toEqual([{ wert: 10, last: 21 }, { wert: 9, last: 19 }]);
    expect(v.naechstes).toEqual({ zielWdh: 11, last: 22 });
  });

  it('ist leer ohne Training mit der Übung; Zirkel und Max-Tests zählen nicht', () => {
    const zirkel = einheit('z', { format: 'zirkel', bloecke: [{ typ: 'zirkel', pauseSek: 0, runden: 1, positionen: [
      { uebungId: 'kh_bankdruecken', saetze: 1, zielWdh: 10, ergebnisse: [{ nr: 1, wdh: 10, zeit: MI }] }] }] });
    const z: AppZustand = { ...zustand(), einheiten: [zirkel] };
    expect(uebungVerlauf(z, 'kh_bankdruecken')).toEqual({ sitzungen: [] });
  });
});
