import { describe, expect, it } from 'vitest';
import { isoWoche, plusTage, wocheVerschoben } from './datum';
import { dosisProMuskel, erstelleEinheit, startfragen, wochenziele } from './planung';
import {
  erholungswocheAngebot, maxTestFaellig, naechsteLast, neueRekorde, offeneWochenabschluesse, schliesseEinheitAb,
  werteUebungAus, wochenabschluss,
} from './progression';
import { MONTAG, ort, setzePrognose, TESTTAG, zeitpunkt, zustand } from './testhilfe';
import {
  MUSKELN, type AppZustand, type Einheit, type Feedback, type Muskel, type Ort, type Position, type VarianteZustand, type Woche,
} from './typen';
import { e1rm } from './verlauf';

const MO = zeitpunkt(0, 18);
const voll = (opt: Parameters<typeof zustand>[0] = {}) => zustand({ katalog: 'voll', ...opt });
const uebung = (z: AppZustand, id: string) => z.katalog.uebungen.find((u) => u.id === id)!;
const variante = (uebungId: string, werte: Partial<VarianteZustand>): VarianteZustand =>
  ({ uebungId, zielWdh: 8, seitSteigerung: 5, schwerSerie: 0, ...werte });
const position = (uebungId: string, zielWdh: number, saetze: number[], werte: Partial<Position> = {}): Position => ({
  uebungId, saetze: saetze.length, zielWdh, ...werte,
  ergebnisse: saetze.map((wdh, i) => ({ nr: i + 1, wdh, ...(werte.last !== undefined ? { last: werte.last } : {}), zeit: MO })),
});
const zeitPosition = (uebungId: string, zielWdh: number, sek: number[], feedback: Feedback): Position => ({
  uebungId, saetze: sek.length, zielWdh, feedback, ergebnisse: sek.map((s, i) => ({ nr: i + 1, sek: s, zeit: MO })),
});
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
const null10 = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;

// Führt eine Einheit vollständig durch: jeder Satz trifft das Ziel, Feedback „passend“.
function fuehreDurch(z: AppZustand, e: Einheit, jetzt: string, extra: Partial<Einheit> = {},
  satz: (p: Position) => { wdh?: number; sek?: number } = (p) => ({ wdh: p.zielWdh || 10 })): AppZustand {
  const bloecke = e.bloecke.map((b) => ({
    ...b,
    positionen: b.positionen.map((p) => ({
      ...p, feedback: 'passend' as const,
      ergebnisse: Array.from({ length: b.typ === 'zirkel' ? 1 : p.saetze }, (_, i) => ({
        nr: i + 1, ...satz(p), ...(p.last !== undefined ? { last: p.last } : {}), zeit: jetzt,
      })),
    })),
  }));
  return schliesseEinheitAb(z, { ...e, bloecke, gestartetAm: jetzt, ...extra }, plusTage(jetzt, 0.03));
}

const plane = (z: AppZustand, jetzt: string, extra: Partial<Parameters<typeof erstelleEinheit>[1]> = {}) =>
  erstelleEinheit(z, { jetzt, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, ...extra });

describe('Nächste Last', () => {
  const o = ort(['KH']);
  it('nächsthöhere und nächstniedrigere Last im Raster, null am Ende', () => {
    const u = uebung(zustand(), 'kh_curls');
    expect(naechsteLast(o, u, 10, 1)).toBe(12);
    expect(naechsteLast(o, u, 10, -1)).toBe(8);
    expect(naechsteLast(o, u, 11, 1)).toBe(12);
    expect(naechsteLast(o, u, 24, 1)).toBeNull();
    expect(naechsteLast(o, u, 2, -1)).toBeNull();
  });

  it('Langhantel: kleinste mögliche Last über der aktuellen', () => {
    const lh: Ort = { id: 'lh', name: 'lh', standard: true, equipment: [{ utensilId: 'LH', langhantel: { stangeKg: 20, scheiben: [{ kg: 5, paare: 1 }, { kg: 2.5, paare: 1 }] } }] };
    const u = uebung(voll(), 'lh_kreuzheben');
    expect(naechsteLast(lh, u, 20, 1)).toBe(25);
    expect(naechsteLast(lh, u, 30, 1)).toBe(35);
    expect(naechsteLast(lh, u, 35, 1)).toBeNull();
  });
});

describe('Progression mit Last (Kraftschätzung)', () => {
  const mit = (v: VarianteZustand) => ({ ...zustand(), varianten: [v] });
  const kh = 'kh_bankdruecken'; // Bereich 8 bis 12, Raster 2, 4, … 24

  it('„passend“: Ziel +1, begrenzt durch die Schätzung bei Reserve 1; e1RM geglättet', () => {
    const z = mit(variante(kh, { last: 16, zielWdh: 9, e1rm: 22 }));
    const { variante: v } = werteUebungAus(z, position(kh, 9, [9, 9, 8], { last: 16, feedback: 'passend' }), MO, 'zuhause');
    expect(v.e1rm).toBeCloseTo(0.5 * 22 + 0.5 * e1rm(16, 9, 2));
    expect(v).toMatchObject({ last: 16, zielWdh: 10 });
    const knapp = mit(variante(kh, { last: 16, zielWdh: 9, e1rm: 16 * (1 + 9 / 30) }));
    expect(werteUebungAus(knapp, position(kh, 9, [9], { last: 16, feedback: 'passend' }), MO, 'zuhause').variante.zielWdh).toBe(9);
  });

  it('„zu leicht“: Ziel +2', () => {
    const z = mit(variante(kh, { last: 16, zielWdh: 8, e1rm: 25 }));
    expect(werteUebungAus(z, position(kh, 8, [8, 8], { last: 16, feedback: 'leicht' }), MO, 'zuhause').variante.zielWdh).toBe(10);
  });

  it('Ziel über O: Last + 1 Schritt, wenn die Schätzung dort U schafft; sonst Bereich bis O + 3', () => {
    const stark = mit(variante(kh, { last: 16, zielWdh: 12, e1rm: 24 }));
    const { variante: v } = werteUebungAus(stark, position(kh, 12, [12, 11], { last: 16, feedback: 'passend' }), MO, 'zuhause');
    expect(v.last).toBe(18);
    expect(v.zielWdh).toBeGreaterThanOrEqual(7);
    expect(v.zielWdh).toBeLessThanOrEqual(12);
    expect(v.seitSteigerung).toBe(0);
    // Großer Sprung 16 → 20 kg: dort schafft die Schätzung keine 8 Wdh., also Bereich dehnen.
    const paare: Ort = { id: 'paare', name: 'paare', standard: true, equipment: [{ utensilId: 'KH', kurzhanteln: { modus: 'paare', gewichteKg: [16, 20] } }, { utensilId: 'BANK' }] };
    const knapp = { ...mit(variante(kh, { last: 16, zielWdh: 12, e1rm: 25.5 })), orte: [paare] };
    const gedehnt = werteUebungAus(knapp, position(kh, 12, [12], { last: 16, feedback: 'passend' }), MO, 'paare').variante;
    expect(gedehnt).toMatchObject({ last: 16, zielWdh: 13 });
  });

  it('„zu schwer“: Eingewöhnung nach Steigerung, deutlich verfehlt Last − 1, sonst Ziel unverändert', () => {
    const neu = mit(variante(kh, { last: 18, zielWdh: 9, e1rm: 24, seitSteigerung: 0 }));
    expect(werteUebungAus(neu, position(kh, 9, [7], { last: 18, feedback: 'schwer' }), MO, 'zuhause').variante)
      .toMatchObject({ last: 18, zielWdh: 7 });
    const alt = mit(variante(kh, { last: 18, zielWdh: 9, e1rm: 24, seitSteigerung: 4 }));
    expect(werteUebungAus(alt, position(kh, 9, [5], { last: 18, feedback: 'schwer' }), MO, 'zuhause').variante)
      .toMatchObject({ last: 16, zielWdh: 8 });
    expect(werteUebungAus(alt, position(kh, 9, [8], { last: 18, feedback: 'schwer' }), MO, 'zuhause').variante)
      .toMatchObject({ last: 18, zielWdh: 9, schwerSerie: 1 });
  });

  it('erster Satz verfehlt das Ziel ohne Feedback: zählt als „zu schwer“', () => {
    const z = mit(variante(kh, { last: 16, zielWdh: 10, e1rm: 22 }));
    expect(werteUebungAus(z, position(kh, 10, [9], { last: 16 }), MO, 'zuhause').variante.zielWdh).toBe(10);
  });

  it('Last geht aus: langsames Tempo, Bereich bis O + 5, dann einseitige Variante', () => {
    const klein: Ort = { id: 'klein', name: 'klein', standard: true, equipment: [{ utensilId: 'KH', kurzhanteln: { modus: 'paare', gewichteKg: [10, 12] } }] };
    const basis = { ...voll({ orte: [klein] }), muster: [{ muster: 'Huefte' as const, stufe: 5, hauptvarianten: ['kh_rdl'] }] };
    const z = (v: Partial<VarianteZustand>) => ({ ...basis, varianten: [variante('kh_rdl', { last: 12, e1rm: 30, ...v })] });
    const p = (ziel: number) => position('kh_rdl', ziel, [ziel], { last: 12, feedback: 'passend' });
    const tempo = werteUebungAus(z({ zielWdh: 12 }), p(12), MO, 'klein');
    expect(tempo.variante).toMatchObject({ last: 12, zielWdh: 8, langsam: true });
    expect(werteUebungAus(z({ zielWdh: 12, langsam: true }), p(12), MO, 'klein').variante.zielWdh).toBe(13);
    const ende = werteUebungAus(z({ zielWdh: 17, langsam: true }), p(17), MO, 'klein');
    expect(ende.muster.hauptvarianten).toEqual(['kh_rdl_einbeinig']);
    expect(ende.variante.langsam).toBeUndefined();
  });
});

describe('Progression ohne Last', () => {
  it('Körpergewicht: Ziel höchstens 2 über dem besten ersten Satz; ab O die nächste Variante', () => {
    const z = { ...voll(), varianten: [variante('liegestuetz', { zielWdh: 10, bestErsterSatz: 10 })],
      muster: [{ muster: 'hDruck' as const, stufe: 4, hauptvarianten: ['liegestuetz', 'kh_bankdruecken'] }] };
    expect(werteUebungAus(z, position('liegestuetz', 10, [10, 9], { feedback: 'leicht' }), MO, 'zuhause').variante.zielWdh).toBe(12);
    const gedeckelt = { ...z, varianten: [variante('liegestuetz', { zielWdh: 12, bestErsterSatz: 9 })] };
    expect(werteUebungAus(gedeckelt, position('liegestuetz', 12, [10], { feedback: 'leicht' }), MO, 'zuhause').variante.zielWdh).toBe(12);
    const oben = werteUebungAus(z, position('liegestuetz', 15, [15], { feedback: 'passend' }), MO, 'zuhause');
    expect(oben.muster.hauptvarianten).toEqual(['liegestuetz_fuesse_erhoeht', 'kh_bankdruecken']);
    expect(oben.muster.stufe).toBe(4);
  });

  it('Zwischenstufe: liegt die nächste Variante 2 Stufen höher, erst langsames Absenken mit Ziel U', () => {
    const z = { ...voll(), muster: [{ muster: 'vZug' as const, stufe: 6, hauptvarianten: ['klimmzug', 'chinup'] }] };
    const erst = werteUebungAus(z, position('klimmzug', 12, [12], { feedback: 'passend' }), MO, 'zuhause');
    expect(erst.variante).toMatchObject({ zielWdh: 5, langsam: true });
    expect(erst.muster.hauptvarianten).toEqual(['klimmzug', 'chinup']);
    const danach = werteUebungAus({ ...z, varianten: [erst.variante] }, position('klimmzug', 12, [12], { feedback: 'passend', langsam: true }), MO, 'zuhause');
    expect(danach.muster.hauptvarianten).toEqual(['klimmzug_gewicht', 'chinup']);
  });

  it('Band: nächste Stufe; unterstützend das leichtere Band, danach die nächste Variante', () => {
    const z = voll();
    const band = werteUebungAus(z, position('band_rudern', 15, [15], { bandStufe: 'mittel', feedback: 'passend' }), MO, 'zuhause');
    expect(band.variante).toMatchObject({ bandStufe: 'schwer', zielWdh: 10, seitSteigerung: 0 });
    const unterstuetzt = werteUebungAus(z, position('klimmzug_band', 12, [12], { bandStufe: 'schwer', feedback: 'passend' }), MO, 'zuhause');
    expect(unterstuetzt.variante.bandStufe).toBe('mittel');
    const mz = { ...z, muster: [{ muster: 'vZug' as const, stufe: 4, hauptvarianten: ['klimmzug_band'] }] };
    const leichteste = werteUebungAus(mz, position('klimmzug_band', 12, [12], { bandStufe: 'leicht', feedback: 'passend' }), MO, 'zuhause');
    expect(leichteste.muster.hauptvarianten).toEqual(['chinup']);
  });

  it('Halteübung: +5 Sek. bei „passend“, +10 bei „zu leicht“, ab O die nächste Variante', () => {
    const z = { ...voll(), muster: [{ muster: 'Rumpf' as const, stufe: 2, hauptvarianten: ['plank'] }] };
    expect(werteUebungAus(z, zeitPosition('plank', 30, [30], 'passend'), MO, 'zuhause').variante.zielWdh).toBe(35);
    expect(werteUebungAus(z, zeitPosition('plank', 30, [30], 'leicht'), MO, 'zuhause').variante.zielWdh).toBe(40);
    // Nächste Stufe (3): bei anderem Lasttyp gilt die Rangfolge Last vor Band
    expect(werteUebungAus(z, zeitPosition('plank', 60, [60], 'passend'), MO, 'zuhause').muster.hauptvarianten).toEqual(['kh_russian_twist']);
  });

  it('Musterstufe steigt mit der schwersten im Zielbereich bewältigten Variante', () => {
    const z = { ...voll(), muster: [{ muster: 'hDruck' as const, stufe: 4, hauptvarianten: [] }] };
    expect(werteUebungAus(z, position('liegestuetz_fuesse_erhoeht', 8, [9], { feedback: 'passend' }), MO, 'zuhause').muster.stufe).toBe(5);
    expect(werteUebungAus(z, position('liegestuetz_fuesse_erhoeht', 8, [6], { feedback: 'schwer' }), MO, 'zuhause').muster.stufe).toBe(4);
  });
});

describe('Abschluss einer Einheit', () => {
  it('schreibt Varianten, Hauptvarianten, Muskeln und Woche fort', () => {
    let z = setzePrognose(zustand(), MO, 3);
    const e = plane(z, MO);
    z = fuehreDurch(z, e, MO);
    const woche = z.wochen.find((w) => w.id === isoWoche(MO))!;
    expect(woche.einheiten).toBe(1);
    expect(woche.erledigt).toEqual(dosisProMuskel(z, z.einheiten[0]!));
    expect(woche.ziele.Brust).toBe(12);
    expect(z.einheiten[0]).toMatchObject({ status: 'abgeschlossen', gestartetAm: MO });
    expect(z.varianten.map((v) => v.uebungId).sort()).toEqual([...new Set(ids(e))].sort());
    expect(z.muster.find((m) => m.muster === 'hDruck')!.hauptvarianten).toEqual(['kh_bankdruecken', 'kh_schraegbank']);
    expect(z.muskeln.find((m) => m.muskel === 'Brust')).toMatchObject({ letzteBelastung: MO, letzteSchwer: false });
    expect(z.zyklen).toEqual([{ nr: 1, start: MO }]);
  });

  it('„zu schwer“ verlängert die Erholung der Primärmuskeln; die nächste Einheit zeigt die neuen Ziele', () => {
    const z0 = setzePrognose(zustand(), MO, 3);
    const e = plane(z0, MO);
    const schwer = { ...e, bloecke: e.bloecke.map((b) => ({ ...b, positionen: b.positionen.map((p) => ({ ...p })) })) };
    const z = fuehreDurch(z0, schwer, MO);
    const mitSchwer = schliesseEinheitAb(z0, {
      ...z.einheiten[0]!, bloecke: z.einheiten[0]!.bloecke.map((b) => ({ ...b, positionen: b.positionen.map((p) => (p.uebungId === 'kh_bankdruecken' ? { ...p, feedback: 'schwer' as const } : p)) })),
    }, MO);
    expect(mitSchwer.muskeln.find((m) => m.muskel === 'Brust')!.letzteSchwer).toBe(true);
    expect(mitSchwer.muskeln.find((m) => m.muskel === 'Ruecken')!.letzteSchwer).toBe(false);
    const naechste = plane(z, zeitpunkt(2, 18));
    const bank = naechste.bloecke.flatMap((b) => b.positionen).find((p) => p.uebungId === 'kh_bankdruecken' || p.uebungId === 'kh_schraegbank')!;
    expect(bank.zielWdh).toBe(z.varianten.find((v) => v.uebungId === bank.uebungId)?.zielWdh ?? 8);
  });

  it('Max-Test landet im Verlauf; Ergebnis über dem Bereich hebt Musterstufe und Variante', () => {
    let z = voll({ maxTests: [] });
    z = { ...z, muster: [{ muster: 'hDruck', stufe: 4, hauptvarianten: ['liegestuetz', 'kh_bankdruecken'] }] };
    const e = plane(setzePrognose(z, MO, 3), MO);
    expect(e.bloecke[0]!.positionen[0]).toMatchObject({ uebungId: 'liegestuetz', istMaxTest: true, saetze: 1 });
    const fertig = fuehreDurch(setzePrognose(z, MO, 3), e, MO, {}, (p) => ({ wdh: p.istMaxTest ? 22 : p.zielWdh }));
    expect(fertig.maxTests).toHaveLength(1);
    expect(fertig.maxTests[0]).toMatchObject({ muster: 'hDruck', uebungId: 'liegestuetz', ergebnis: 22, einheit: 'Wdh.' });
    expect(fertig.muster.find((m) => m.muster === 'hDruck')).toMatchObject({ stufe: 5, hauptvarianten: ['liegestuetz_fuesse_erhoeht', 'kh_bankdruecken'] });
  });

  it('Zirkel: Ergebnis mit Zeit je Zirkel und Ort; Bestzeit als Rekord', () => {
    const z0 = voll();
    const e = plane(z0, MO, { zirkelId: 'fundament' });
    const z1 = fuehreDurch(z0, e, MO, { beendetAm: plusTage(MO, 20 / 1440) });
    expect(z1.zirkelErgebnisse).toEqual([expect.objectContaining({ zirkelId: 'fundament', ortId: 'zuhause', zeitSek: 1200 })]);
    const zweite = { ...plane(z1, zeitpunkt(2, 18), { zirkelId: 'fundament' }), gestartetAm: zeitpunkt(2, 18), beendetAm: plusTage(zeitpunkt(2, 18), 18 / 1440) };
    expect(neueRekorde(z1, zweite)).toEqual([{ art: 'zirkel', zirkelId: 'fundament', wert: 1080, bisher: 1200 }]);
  });

  it('Rekorde: neuer Bestwert der Kraftschätzung und des ersten Satzes', () => {
    const z0 = setzePrognose(zustand(), MO, 3);
    const z1 = fuehreDurch(z0, plane(z0, MO), MO);
    const zweite = plane(z1, zeitpunkt(3, 18));
    const besser = { ...zweite, bloecke: zweite.bloecke.map((b) => ({ ...b, positionen: b.positionen.map((p) => ({
      ...p, feedback: 'passend' as const, ergebnisse: [{ nr: 1, wdh: p.zielWdh + 3, ...(p.last ? { last: p.last } : {}), zeit: zeitpunkt(3, 18) }],
    })) })) };
    const rekorde = neueRekorde(z1, besser);
    expect(rekorde.length).toBeGreaterThan(0);
    expect(rekorde.every((r) => r.wert > r.bisher)).toBe(true);
    expect(rekorde.some((r) => r.art === 'kraft')).toBe(true);
  });
});

describe('Max-Test-Fälligkeit', () => {
  const amTag = (tage: number, z = voll()) => maxTestFaellig(z, plusTage(MONTAG, tage), 'zuhause');

  it('ohne bisherigen Test sofort (Entscheidung 20.10.2026), danach frühestens nach 21 Tagen, rotierend', () => {
    expect(maxTestFaellig(voll({ maxTests: [] }), MO, 'zuhause')).toEqual({ muster: 'hDruck', uebungId: 'liegestuetz' });
    expect(amTag(19)).toBeNull();
    expect(amTag(21)).toEqual({ muster: 'hDruck', uebungId: 'liegestuetz' });
    const nachHDruck = voll({ maxTests: [...TESTTAG.filter((t) => t.muster !== 'hDruck'), { ...TESTTAG[0]!, datum: '2026-11-08T10:00:00' }] });
    expect(amTag(21, nachHDruck)).toEqual({ muster: 'vZug', uebungId: 'klimmzug' });
  });

  it('immer mit derselben Übung wie zuletzt; am Ort nicht möglich: verschoben', () => {
    const tests = [{ ...TESTTAG[0]!, uebungId: 'liegestuetz_erhoeht_haende' }, ...TESTTAG.slice(1).map((t) => ({ ...t, datum: plusTage(MONTAG, 20) }))];
    expect(maxTestFaellig(voll({ maxTests: tests }), plusTage(MONTAG, 22), 'zuhause')).toEqual({ muster: 'hDruck', uebungId: 'liegestuetz_erhoeht_haende' });
    expect(maxTestFaellig(voll({ maxTests: tests, orte: [ort(['KH'])] }), plusTage(MONTAG, 22), 'zuhause')).toBeNull();
  });

  it('bei 1 bis 2 Einheiten pro Woche erst nach 28 Tagen', () => {
    const z = (tage: number) => setzePrognose(voll(), plusTage(MONTAG, tage), 2);
    expect(maxTestFaellig(z(22), plusTage(MONTAG, 22), 'zuhause')).toBeNull();
    expect(maxTestFaellig(z(28), plusTage(MONTAG, 28), 'zuhause')).not.toBeNull();
  });

  it('nicht in Erholungswochen und nicht, solange ein beteiligter Muskel nicht erholt ist', () => {
    const tag = plusTage(MONTAG, 22);
    const erholung = setzePrognose(voll(), tag, 3);
    erholung.wochen[0]!.erholungswoche = true;
    expect(maxTestFaellig(erholung, tag, 'zuhause')).toBeNull();
    const muede = { ...voll(), muskeln: [{ muskel: 'Brust' as const, letzteBelastung: plusTage(tag, -0.5), letzteDosis: 5, letzteSchwer: false, persoenlicheGrenze: 12, gleichWochen: 0, leistung: [] }] };
    expect(maxTestFaellig(muede, tag, 'zuhause')?.muster).not.toBe('hDruck');
  });

  it('im Plan: am Anfang, ein Test pro Einheit, das getestete Muster bekommt 50 % weniger Sätze', () => {
    const tag = plusTage(MONTAG, 22);
    const mit = plane(setzePrognose(voll(), tag, 3), tag);
    const ohne = plane(setzePrognose(voll({ maxTests: TESTTAG.map((t) => ({ ...t, datum: plusTage(tag, -1) })) }), tag, 3), tag);
    expect(mit.bloecke[0]!.positionen).toEqual([expect.objectContaining({ istMaxTest: true, uebungId: 'liegestuetz' })]);
    expect(mit.bloecke.flatMap((b) => b.positionen).filter((p) => p.istMaxTest)).toHaveLength(1);
    expect(ohne.bloecke.flatMap((b) => b.positionen).some((p) => p.istMaxTest)).toBe(false);
    const hDruckSaetze = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen)
      .filter((p) => !p.istMaxTest && uebung(voll(), p.uebungId).muster === 'hDruck').reduce((s, p) => s + p.saetze, 0);
    expect(hDruckSaetze(mit)).toBeLessThanOrEqual(Math.ceil(hDruckSaetze(ohne) / 2) + 1);
    expect(mit.aufwaermen.at(-1)!.uebungId).not.toBe('liegestuetz');
  });
});

describe('Trainingspause', () => {
  // Eine Einheit am Montag, dann `tage` Tage Pause.
  const nachPause = (tage: number) => {
    const z0 = setzePrognose(zustand(), MO, 3);
    const z1 = fuehreDurch(z0, plane(z0, MO), MO);
    const zurueck = plusTage(MO, tage);
    return { z1, zurueck, e: plane(setzePrognose(z1, zurueck, 3), zurueck) };
  };
  const pos = (e: Einheit, id: string) => e.bloecke.flatMap((b) => b.positionen).find((p) => p.uebungId === id);

  it('bis 7 Tage keine Anpassung', () => {
    const { z1, e, zurueck } = nachPause(7);
    expect(pos(e, 'kh_bankdruecken') ?? pos(e, 'kh_schraegbank')).toBeDefined();
    expect(wochenziele(z1, 3, 'zuhause', zurueck).Brust).toBe(12);
  });

  it('8 bis 21 Tage: erste Einheit je Muster 2 Wdh. weniger, Wochenziel 70 %', () => {
    const { z1, e, zurueck } = nachPause(10);
    for (const p of e.bloecke.flatMap((b) => b.positionen)) {
      const v = z1.varianten.find((x) => x.uebungId === p.uebungId);
      if (v) expect(p.zielWdh).toBe(Math.max(1, v.zielWdh - 2));
      if (v?.last !== undefined) expect(p.last).toBe(v.last);
    }
    expect(wochenziele(z1, 3, 'zuhause', zurueck).Brust).toBe(8);
    const z2 = fuehreDurch(setzePrognose(z1, zurueck, 3), e, zurueck);
    expect(wochenziele(z2, 3, 'zuhause', plusTage(zurueck, 1)).Brust).toBe(8);
    expect(wochenziele(z2, 3, 'zuhause', plusTage(zurueck, 7)).Brust).toBe(12);
  });

  it('über 21 Tage: zusätzlich 10 % weniger Last; Wochenziel 2 Wochen lang 70 %', () => {
    const z0 = setzePrognose(zustand(), MO, 3);
    const stark = { ...z0, varianten: [variante('kh_bankdruecken', { last: 20, zielWdh: 10, e1rm: 28 }), variante('kh_schraegbank', { last: 20, zielWdh: 10, e1rm: 28 })] };
    const z1 = fuehreDurch(stark, plane(stark, MO), MO);
    const zurueck = plusTage(MO, 28);
    const e = plane(setzePrognose(z1, zurueck, 3), zurueck);
    const bank = e.bloecke.flatMap((b) => b.positionen).find((p) => p.uebungId.startsWith('kh_') && uebung(z1, p.uebungId).muster === 'hDruck')!;
    const vorher = z1.varianten.find((v) => v.uebungId === bank.uebungId)!;
    expect(bank.last).toBe(Math.floor((vorher.last! * 0.9) / 2) * 2);
    const z2 = fuehreDurch(setzePrognose(z1, zurueck, 3), e, zurueck);
    expect(wochenziele(z2, 3, 'zuhause', plusTage(zurueck, 7)).Brust).toBe(8);
    const z3 = fuehreDurch(setzePrognose(z2, plusTage(zurueck, 5), 3), plane(z2, plusTage(zurueck, 5)), plusTage(zurueck, 5));
    const z4 = fuehreDurch(setzePrognose(z3, plusTage(zurueck, 11), 3), plane(z3, plusTage(zurueck, 11)), plusTage(zurueck, 11));
    expect(wochenziele(z4, 3, 'zuhause', plusTage(zurueck, 12)).Brust).toBe(8);
    expect(wochenziele(z4, 3, 'zuhause', plusTage(zurueck, 14)).Brust).toBe(12);
  });

  it('über 21 Tage: Körpergewicht eine Variantenstufe leichter', () => {
    const z0 = { ...setzePrognose(voll({ orte: [ort(['STANGE', 'TISCH', 'ERH'])] }), MO, 3) };
    const z1 = fuehreDurch(z0, plane(z0, MO), MO);
    const zurueck = plusTage(MO, 28);
    const vorher = new Set(z1.muster.flatMap((m) => m.hauptvarianten));
    const e = plane(setzePrognose(z1, zurueck, 3), zurueck);
    const leichter = e.bloecke.flatMap((b) => b.positionen).filter((p) => !p.istMaxTest && !vorher.has(p.uebungId));
    expect(leichter.length).toBeGreaterThan(0);
  });

  it('nur die erste Einheit je Muster nach der Pause ist leichter', () => {
    const { e, zurueck, z1 } = nachPause(10);
    const z2 = fuehreDurch(setzePrognose(z1, zurueck, 3), e, zurueck);
    const danach = plane(z2, plusTage(zurueck, 2));
    const musterNachPause = new Set(ids(e).map((id) => uebung(z2, id).muster));
    const geprueft = danach.bloecke.flatMap((b) => b.positionen).filter((p) => musterNachPause.has(uebung(z2, p.uebungId).muster));
    expect(geprueft.length).toBeGreaterThan(0);
    for (const p of geprueft) {
      const v = z2.varianten.find((x) => x.uebungId === p.uebungId);
      if (v) expect(p.zielWdh).toBe(v.zielWdh);
    }
  });
});

describe('Erholungswoche', () => {
  const woche = (id: string, werte: Partial<Woche> = {}): Woche => ({
    id, prognose: 3, einheiten: 3, ziele: null10(), erledigt: { ...null10(), Brust: 12, Ruecken: 12 },
    erholungswoche: false, laengerAngenommen: false, ausgewertet: true, ...werte,
  });

  it('Gesamtanstrengung der letzten 4 Workouts im Schnitt 4,5 oder höher: Angebot', () => {
    let z = setzePrognose(zustand(), MO, 4);
    for (const [i, bewertung] of ([5, 4, 5, 4] as const).entries()) {
      const t = zeitpunkt(i * 2 > 6 ? 6 : i * 2, 8 + i);
      z = fuehreDurch(z, plane(z, t), t, { gesamtbewertung: bewertung });
    }
    const naechsterMontag = plusTage(MONTAG, 7);
    expect(erholungswocheAngebot(z, naechsterMontag)).toBe('anstrengung');
    expect(erholungswocheAngebot(z, zeitpunkt(6, 20))).toBeNull(); // Woche läuft schon
    const mild = fuehreDurch(z, plane(z, zeitpunkt(6, 19)), zeitpunkt(6, 19), { gesamtbewertung: 3 });
    expect(erholungswocheAngebot(mild, naechsterMontag)).toBeNull();
  });

  it('Leistung sinkt bei 2 Mustern in 2 Einheiten in Folge: Angebot', () => {
    const sitzung = (tag: number, wdh: number): Einheit => ({
      id: `e${tag}`, woche: isoWoche(zeitpunkt(tag, 18)), erstelltAm: zeitpunkt(tag, 18), gestartetAm: zeitpunkt(tag, 18),
      status: 'abgeschlossen', ortId: 'zuhause', fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [],
      bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [
        position('kh_bankdruecken', 10, [wdh], { last: 16, feedback: 'passend' }),
        position('klimmzug', 10, [wdh], { feedback: 'passend' }),
      ] }],
    });
    const z = { ...zustand(), einheiten: [sitzung(-6, 10), sitzung(-4, 10), sitzung(2, 10), sitzung(4, 8), sitzung(6, 7)] };
    expect(erholungswocheAngebot(z, plusTage(MONTAG, 7))).toBe('leistung');
    const nurEins = { ...z, einheiten: z.einheiten.map((e, i) => (i < 3 ? e : { ...e, bloecke: [{ ...e.bloecke[0]!, positionen: [e.bloecke[0]!.positionen[0]!] }] })) };
    expect(erholungswocheAngebot(nurEins, plusTage(MONTAG, 7))).toBeNull();
  });

  it('10 Wochen ohne Entlastung: Angebot; eine schwache Woche setzt es zurück', () => {
    const ids = Array.from({ length: 14 }, (_, i) => wocheVerschoben('2026-W43', -14 + i));
    const z = { ...zustand(), wochen: ids.map((id) => woche(id)) };
    expect(erholungswocheAngebot(z, MO)).toBe('zehnWochen');
    const schwach = { ...z, wochen: z.wochen.map((w, i) => (i === 10 ? woche(w.id, { erledigt: { ...null10(), Brust: 6 } }) : w)) };
    expect(erholungswocheAngebot(schwach, MO)).toBeNull();
    const kurz = { ...z, wochen: z.wochen.slice(5) };
    expect(erholungswocheAngebot(kurz, MO)).toBeNull();
    const direktNachErholung = { ...z, wochen: z.wochen.map((w, i) => (i === 13 ? { ...w, erholungswoche: true } : w)) };
    expect(erholungswocheAngebot(direktNachErholung, MO)).toBeNull();
  });

  it('In der Erholungswoche: Volumen 50 %, Last und Ziel unverändert, keine Max-Tests und Zirkel', () => {
    const z = { ...voll({ maxTests: [], einstellungen: { zirkelAnteil: '2proWoche' } }), varianten: [variante('kh_bankdruecken', { last: 16, zielWdh: 10 })] };
    const normal = setzePrognose(z, MO, 3);
    const erholung = { ...normal, wochen: normal.wochen.map((w) => ({ ...w, erholungswoche: true })) };
    expect(wochenziele(erholung, 3, 'zuhause', MO).Brust).toBe(6);
    expect(wochenziele(z, 3, 'zuhause', MO, true).Brust).toBe(6);
    const e = plane(erholung, MO);
    expect(e.bloecke.flatMap((b) => b.positionen).some((p) => p.istMaxTest)).toBe(false);
    const bank = e.bloecke.flatMap((b) => b.positionen).find((p) => p.uebungId === 'kh_bankdruecken');
    if (bank) expect(bank).toMatchObject({ last: 16, zielWdh: 10 });
    expect(startfragen(erholung, MO)).toMatchObject({ zirkelVorschlag: false, finisherAnbieten: false });
    expect(dosisProMuskel(z, e).Brust).toBeLessThanOrEqual(dosisProMuskel(z, plane(normal, MO)).Brust);
  });
});

describe('Wochenabschluss und persönliche Volumengrenze', () => {
  // Hauptvariante kh_bankdruecken (Brust primär) mit einer Sitzung je Woche und Leistungswert `wdh`.
  const sitzung = (wocheId: string, wdh: number, bewertung?: 1 | 2 | 3 | 4 | 5, feedback: Feedback = 'passend'): Einheit => {
    const start = plusTage(MONTAG, 7 * (Number(wocheId.slice(-2)) - 43) + 1);
    return {
      id: `e-${wocheId}`, woche: wocheId, erstelltAm: start, gestartetAm: start, status: 'abgeschlossen', ortId: 'zuhause',
      fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [], ...(bewertung ? { gesamtbewertung: bewertung } : {}),
      bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [position('kh_bankdruecken', 10, [wdh], { last: 16, feedback })] }],
    };
  };
  const wochenIds = ['2026-W40', '2026-W41', '2026-W42', '2026-W43'];
  const aufbau = (wdh: number[], opt: { brust?: number; bewertung?: 1 | 2 | 3 | 4 | 5; grenze?: number; gleich?: number; erholung?: boolean; feedback?: Feedback } = {}): AppZustand => ({
    ...zustand(),
    muster: [{ muster: 'hDruck', stufe: 5, hauptvarianten: ['kh_bankdruecken'] }],
    einheiten: wochenIds.map((id, i) => sitzung(id, wdh[i]!, i === 3 ? opt.bewertung : undefined, i === 3 ? opt.feedback : 'passend')),
    wochen: wochenIds.map((id) => ({
      id, prognose: 3, einheiten: 1, ziele: { ...null10(), Brust: 12 }, erledigt: { ...null10(), Brust: opt.brust ?? 12 },
      erholungswoche: id === '2026-W43' && !!opt.erholung, laengerAngenommen: false, ...(id !== '2026-W43' ? { ausgewertet: true } : {}),
    })),
    muskeln: [{ muskel: 'Brust', letzteDosis: 1, letzteSchwer: false, persoenlicheGrenze: opt.grenze ?? 12, gleichWochen: opt.gleich ?? 1, leistung: [] }],
  });
  const grenze = (z: AppZustand) => z.muskeln.find((m) => m.muskel === 'Brust')!;

  it('Leistung gestiegen: Grenze unverändert; Leistung je Woche gespeichert', () => {
    const z = wochenabschluss(aufbau([10, 10, 10, 12]), '2026-W43');
    expect(grenze(z)).toMatchObject({ persoenlicheGrenze: 12, gleichWochen: 0 });
    expect(grenze(z).leistung[0]!.woche).toBe('2026-W43');
    expect(grenze(z).leistung[0]!.wert).toBeGreaterThan(0.01);
    expect(z.wochen.find((w) => w.id === '2026-W43')!.ausgewertet).toBe(true);
  });

  it('2 Wochen gleich, kein „zu schwer“, Anstrengung höchstens 3: +2 Sätze', () => {
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 10], { bewertung: 3, brust: 12 }), '2026-W43')).persoenlicheGrenze).toBe(14);
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 10], { gleich: 0 }), '2026-W43'))).toMatchObject({ persoenlicheGrenze: 12, gleichWochen: 1 });
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 10], { feedback: 'schwer' }), '2026-W43')).persoenlicheGrenze).toBe(12);
  });

  it('Deckel: höchstens 4 Sätze über dem besten Wochenvolumen der letzten 4 Wochen', () => {
    const z = aufbau([10, 10, 10, 10], { grenze: 14, brust: 10 });
    expect(grenze(wochenabschluss(z, '2026-W43')).persoenlicheGrenze).toBe(14);
    const tief = aufbau([10, 10, 10, 10], { grenze: 12, brust: 10 });
    tief.wochen = tief.wochen.map((w) => ({ ...w, ziele: { ...w.ziele, Brust: 11 } }));
    expect(grenze(wochenabschluss(tief, '2026-W43')).persoenlicheGrenze).toBe(14);
    const knapp = aufbau([10, 10, 10, 10], { grenze: 12, brust: 9 });
    knapp.wochen = knapp.wochen.map((w) => ({ ...w, ziele: { ...w.ziele, Brust: 11 } }));
    expect(grenze(wochenabschluss(knapp, '2026-W43')).persoenlicheGrenze).toBe(13);
  });

  it('Leistung über 3 % gefallen oder Anstrengung ab 4: −2 Sätze, nicht unter Untergrenze + 2', () => {
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 8]), '2026-W43')).persoenlicheGrenze).toBe(10);
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 11], { bewertung: 4 }), '2026-W43')).persoenlicheGrenze).toBe(10);
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 8], { grenze: 7 }), '2026-W43')).persoenlicheGrenze).toBe(6);
  });

  it('schwache Wochen (unter 80 % des Ziels) und Erholungswochen verändern die Grenze nicht', () => {
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 8], { brust: 9 }), '2026-W43')).persoenlicheGrenze).toBe(12);
    expect(grenze(wochenabschluss(aufbau([10, 10, 10, 8], { erholung: true }), '2026-W43')).persoenlicheGrenze).toBe(12);
  });

  it('läuft nur einmal je Woche; offene Wochen werden nachgeholt', () => {
    const z = aufbau([10, 10, 10, 8]);
    expect(offeneWochenabschluesse(z, plusTage(MONTAG, 15))).toEqual(['2026-W43']);
    expect(offeneWochenabschluesse(z, MO)).toEqual([]);
    const einmal = wochenabschluss(z, '2026-W43');
    expect(wochenabschluss(einmal, '2026-W43')).toBe(einmal);
  });

  it('Zyklus endet nach 6 Wochen oder mit einer Erholungswoche; Nebenübungen wechseln, Favoriten bleiben', () => {
    const basis = { ...voll(), zyklen: [{ nr: 1, start: plusTage(MONTAG, -35) }],
      muster: [
        { muster: 'Schulter' as const, stufe: 3, hauptvarianten: ['kh_seitheben'] },
        { muster: 'hDruck' as const, stufe: 5, hauptvarianten: ['kh_bankdruecken', 'kh_schraegbank'] },
      ],
      wochen: [{ id: '2026-W43', prognose: 3, einheiten: 0, ziele: null10(), erledigt: null10(), erholungswoche: false, laengerAngenommen: false }] };
    const z = wochenabschluss(basis, '2026-W43');
    expect(z.zyklen).toEqual([
      { nr: 1, start: plusTage(MONTAG, -35), ende: plusTage(MONTAG, 7), grund: 'zeitablauf' },
      { nr: 2, start: plusTage(MONTAG, 7) },
    ]);
    expect(z.muster.find((m) => m.muster === 'Schulter')!.hauptvarianten).toEqual(['kh_reverse_flys']);
    expect(z.muster.find((m) => m.muster === 'hDruck')!.hauptvarianten).toEqual(['kh_bankdruecken', 'kh_schraegbank']);
    const favorit = wochenabschluss({ ...basis, einstellungen: [{ ...basis.einstellungen[0]!, favoriten: ['kh_seitheben'] }] }, '2026-W43');
    expect(favorit.muster.find((m) => m.muster === 'Schulter')!.hauptvarianten).toEqual(['kh_seitheben']);
    const frueh = wochenabschluss({ ...basis, zyklen: [{ nr: 1, start: plusTage(MONTAG, -14) }] }, '2026-W43');
    expect(frueh.zyklen).toHaveLength(1);
    const erholung = wochenabschluss({ ...basis, zyklen: [{ nr: 1, start: plusTage(MONTAG, -14) }], wochen: basis.wochen.map((w) => ({ ...w, erholungswoche: true })) }, '2026-W43');
    expect(erholung.zyklen.map((x) => x.grund)).toEqual(['erholungswoche', undefined]);
  });
});
