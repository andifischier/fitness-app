// Zwei Varianten derselben Bewegung: die schwerere zuerst; vorbelastete Übungen mit niedrigerem Ziel,
// ausgewertet wie ausgeruht (Entscheidung 02.11.2026).
import { describe, expect, it } from 'vitest';
import { EINHEIT, PROGRESSION } from '../konfiguration';
import { entferneUebung } from './anpassen';
import { erstelleEinheit, setzeVorbelastung, tausche } from './planung';
import { satzVorgabe, schritte, trageSatzEin } from './player';
import { werteUebungAus } from './progression';
import { eingespielt, ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit, Position } from './typen';
import { ausgeruht, kapazitaetswert, einstellungenVon, uebungVon } from './verlauf';

const MO = zeitpunkt(0, 18);
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
const positionen = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen);
const finde = (e: Einheit, id: string) => positionen(e).find((p) => p.uebungId === id)!;
const W = EINHEIT.vorbelastungWeniger;

// Zuhause mit Kurzhanteln, ohne Bank: Brust nur über Liegestütz; A = Pushups, B = Pause Pushups (wie im
// Bericht des Nutzers).
function liegestuetzZustand(): AppZustand {
  const z = eingespielt({
    ...zustand({ katalog: 'voll', orte: [ort(['KH'])] }),
    muster: [{ muster: 'hDruck', stufe: 4, hauptvarianten: ['liegestuetz', 'liegestuetz_pause'] }],
  });
  z.varianten = [
    ...z.varianten.filter((v) => !v.uebungId.startsWith('liegestuetz')),
    { uebungId: 'liegestuetz', zielWdh: 12, seitSteigerung: 3, schwerSerie: 0, zuletzt: '2026-09-01T10:00:00' },
    { uebungId: 'liegestuetz_pause', zielWdh: 10, seitSteigerung: 3, schwerSerie: 0, zuletzt: '2026-09-01T10:00:00' },
  ];
  return setzePrognose(z, MO, 3);
}
const plane = (z: AppZustand, extra: Partial<Parameters<typeof erstelleEinheit>[1]> = {}) =>
  erstelleEinheit(z, { jetzt: MO, ortId: 'zuhause', prognose: 3, morgenWieder: true, laenger: false, ...extra });

describe('Zwei Varianten derselben Bewegung', () => {
  it('die schwerere kommt zuerst, die leichtere danach mit 2 Wdh. weniger', () => {
    for (const klassisch of [false, true]) {
      const e = plane(liegestuetzZustand(), { klassisch });
      const reihe = ids(e).filter((id) => id.startsWith('liegestuetz'));
      expect(reihe).toEqual(['liegestuetz_pause', 'liegestuetz']);
      expect(finde(e, 'liegestuetz_pause')).toMatchObject({ zielWdh: 10 });
      expect(finde(e, 'liegestuetz_pause').vorbelastet).toBeUndefined();
      expect(finde(e, 'liegestuetz')).toMatchObject({ zielWdh: 12 - W, vorbelastet: W });
    }
  });

  it('der gespeicherte Stand der Variante bleibt unverändert', () => {
    const z = liegestuetzZustand();
    plane(z);
    expect(z.varianten.find((v) => v.uebungId === 'liegestuetz')!.zielWdh).toBe(12);
  });
});

describe('Vorbelastung in der Einheit', () => {
  const e0 = (bloecke: Einheit['bloecke'], format: Einheit['format'] = 'klassisch'): Einheit => ({
    id: 'e', woche: '2026-W43', erstelltAm: MO, status: 'geplant', ortId: 'zuhause', fokus: 'oben', format,
    geschaetzteDauerMin: 0, aufwaermen: [], bloecke,
  });
  const pos = (uebungId: string, zielWdh: number, extra: Partial<Position> = {}): Position =>
    ({ uebungId, saetze: 3, zielWdh, ergebnisse: [], ...extra });
  const einzeln = (p: Position) => ({ typ: 'einzeln' as const, pauseSek: 90, positionen: [p] });

  it('zählt nur frühere Blöcke mit demselben Hauptmuskel als Primärmuskel, auch den Max-Test', () => {
    const z = zustand({ katalog: 'voll' });
    const e = setzeVorbelastung(z, e0([
      { typ: 'einzeln', pauseSek: 90, positionen: [pos('liegestuetz', 0, { istMaxTest: true, saetze: 1 })] },
      einzeln(pos('kh_bankdruecken', 10)),
      einzeln(pos('kh_trizeps_ueberkopf', 12)),   // Trizeps arbeitet beim Drücken nur mit
      einzeln(pos('plank', 40)),                  // Bauch noch nicht dran
      einzeln(pos('seitstuetz', 30)),             // Halteübung nach Plank: in Sekunden
    ]));
    const p = positionen(e);
    const sek = W * PROGRESSION.sekProWdh;
    expect(p[0]!.zielWdh).toBe(0);
    expect(p[1]).toMatchObject({ zielWdh: 10 - W, vorbelastet: W });
    expect(p[2]!.vorbelastet).toBeUndefined();
    expect(p[3]!.vorbelastet).toBeUndefined();
    expect(p[4]).toMatchObject({ zielWdh: 30 - sek, vorbelastet: sek });
  });

  it('Kombi-Runden belasten sich nicht gegenseitig vor; das Ziel sinkt nie unter 1', () => {
    const z = zustand({ katalog: 'voll' });
    const e = setzeVorbelastung(z, e0([
      { typ: 'supersatz', pauseSek: 60, positionen: [pos('plank', 40), pos('kh_curls', 10)] },
      einzeln(pos('hammer_curls', 2)),
      einzeln(pos('konzentrationscurl', 1)),
    ], 'mix'));
    const p = positionen(e);
    expect(p[0]!.vorbelastet).toBeUndefined();
    expect(p[1]!.vorbelastet).toBeUndefined();
    expect(p[2]).toMatchObject({ zielWdh: 1, vorbelastet: 1 });
    expect(p[3]!.zielWdh).toBe(1);
    expect(p[3]!.vorbelastet).toBeUndefined();
  });

  it('wird nach Entfernen und Tauschen neu bestimmt; erledigte Übungen bleiben', () => {
    const z = liegestuetzZustand();
    const e = plane(z, { klassisch: true });
    const bi = e.bloecke.findIndex((b) => b.positionen[0]!.uebungId === 'liegestuetz_pause');
    const ohne = entferneUebung(z, e, bi, 0);
    expect(finde(ohne, 'liegestuetz')).toMatchObject({ zielWdh: 12 });
    expect(finde(ohne, 'liegestuetz').vorbelastet).toBeUndefined();
    // Tausch der späteren Übung: die neue bekommt die Senkung ebenso.
    const bj = e.bloecke.findIndex((b) => b.positionen[0]!.uebungId === 'liegestuetz');
    const getauscht = tausche(z, e, bj, 0, 'knieliegestuetz');
    expect(finde(getauscht, 'knieliegestuetz').vorbelastet).toBe(W);
    // Mehrfaches Neubestimmen ändert nichts.
    expect(setzeVorbelastung(z, setzeVorbelastung(z, e))).toEqual(e);
    // Erledigte Sätze: keine Änderung mehr.
    const mitSatz = structuredClone(e);
    finde(mitSatz, 'liegestuetz').ergebnisse.push({ nr: 1, wdh: 10, zeit: MO });
    mitSatz.bloecke.splice(bi, 1);
    expect(finde(setzeVorbelastung(z, mitSatz), 'liegestuetz')).toMatchObject({ zielWdh: 12 - W, vorbelastet: W });
  });
});

describe('Auswertung wie ausgeruht', () => {
  it('Ziel der Vorbelastung geschafft: die Variante steigt wie nach dem Ziel ausgeruht', () => {
    const z = liegestuetzZustand();
    const p: Position = {
      uebungId: 'liegestuetz', saetze: 3, zielWdh: 12 - W, vorbelastet: W, feedback: 'passend',
      ergebnisse: [12 - W, 12 - W, 12 - W].map((wdh, i) => ({ nr: i + 1, wdh, zeit: MO })),
    };
    const frisch: Position = { ...ausgeruht(p) };
    expect(frisch.zielWdh).toBe(12);
    expect(frisch.ergebnisse.map((s) => s.wdh)).toEqual([12, 12, 12]);
    expect(frisch.vorbelastet).toBeUndefined();
    const { variante } = werteUebungAus(z, p, MO, 'zuhause');
    expect(variante.zielWdh).toBe(werteUebungAus(z, frisch, MO, 'zuhause').variante.zielWdh);
    expect(variante.zielWdh).toBeGreaterThan(12);
  });

  it('knapp unter dem gesenkten Ziel: das Ziel der Variante bleibt bei 12, kein Rückschritt durch Müdigkeit', () => {
    const z = liegestuetzZustand();
    const p: Position = {
      uebungId: 'liegestuetz', saetze: 3, zielWdh: 12 - W, vorbelastet: W, feedback: 'schwer',
      ergebnisse: [10, 10, 9].map((wdh, i) => ({ nr: i + 1, wdh, zeit: MO })),
    };
    expect(werteUebungAus(z, p, MO, 'zuhause').variante.zielWdh).toBe(12);
  });

  it('der Verlauf vergleicht vorbelastete Einheiten wie ausgeruhte', () => {
    const z = liegestuetzZustand();
    const e = einstellungenVon(z);
    const u = uebungVon(z, 'liegestuetz')!;
    const satz = (wdh: number) => [{ nr: 1, wdh, zeit: MO }];
    const vor: Position = { uebungId: u.id, saetze: 1, zielWdh: 15 - W, vorbelastet: W, ergebnisse: satz(15 - W), feedback: 'passend' };
    const frei: Position = { uebungId: u.id, saetze: 1, zielWdh: 15, ergebnisse: satz(15), feedback: 'passend' };
    expect(kapazitaetswert(e, u, vor)).toBe(kapazitaetswert(e, u, frei));
  });
});

describe('Im Training', () => {
  const einheit = (vorbelastet: boolean): Einheit => ({
    id: 'e', woche: '2026-W43', erstelltAm: MO, status: 'laufend', ortId: 'zuhause', fokus: 'oben', format: 'klassisch',
    geschaetzteDauerMin: 0, aufwaermen: [],
    bloecke: [
      { typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId: 'kh_bankdruecken', saetze: 1, zielWdh: 10, last: 10, ergebnisse: [{ nr: 1, wdh: 10, last: 10, zeit: MO }] }] },
      { typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId: 'kh_schraegbank', saetze: 3, last: 8, ergebnisse: [],
        ...(vorbelastet ? { zielWdh: 8 - W, vorbelastet: W } : { zielWdh: 8 }) }] },
    ],
  });
  const schritt = (e: Einheit) => schritte(e).find((x) => x.block === 1)!;

  it('der Satz nennt die Senkung', () => {
    const z = zustand({ katalog: 'voll' });
    z.varianten = [{ uebungId: 'kh_schraegbank', zielWdh: 8, last: 8, e1rm: 11, seitSteigerung: 3, schwerSerie: 0 }];
    expect(satzVorgabe(z, einheit(true), schritt(einheit(true))).reserve).toContain(`Ziel ${W} niedriger`);
    expect(satzVorgabe(z, einheit(false), schritt(einheit(false))).reserve).not.toContain('niedriger');
  });

  it('Kalibrierungssatz: das Geschaffte zählt wie ausgeruht, das neue Ziel bleibt um die Senkung tiefer', () => {
    const z = zustand({ katalog: 'voll' });
    const vor = trageSatzEin(z, einheit(true), schritt(einheit(true)), 8, MO, 8).bloecke[1]!.positionen[0]!;
    const frei = trageSatzEin(z, einheit(false), schritt(einheit(false)), 8 + W, MO, 8).bloecke[1]!.positionen[0]!;
    expect(vor.last).toBe(frei.last);
    expect(vor.zielWdh).toBe(Math.max(1, frei.zielWdh - W));
  });
});
