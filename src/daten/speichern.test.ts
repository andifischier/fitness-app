import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { KATALOG } from './katalog';
import { STANDARD_EINSTELLUNGEN, STANDARD_PRIORITAETEN } from '../konfiguration';
import { OBERKOERPER_BETONT } from '../logik/testhilfe';
import { entwurfAusVorlage, fertigeUebung, mitFavorit, mitVideoLink, neuesUtensil } from '../logik/einstellungen';
import { ort } from '../logik/testhilfe';
import { testtagEinheit } from '../logik/testtag';
import type { Einheit, Einstellungen, Muskel, MuskelZustand } from '../logik/typen';
import { Dexie } from 'dexie';
import { FitnessDb, ladeZustand } from './db';
import {
  aendereEinstellungen, aendereTage, beendeEinheit, beendeOnboarding, fuehreWochenabschluesseAus, ladeEinstellungen, loescheEigeneUebung,
  loescheEigenesUtensil, loescheOrt, speichereEigeneUebung, speichereEigenesUtensil, speichereNeueEinheit, speichereOrt,
  loescheBeendeteEinheit, speichereAbschluss, speicherePrioritaeten, speichereBewertung, speichereLaufendeEinheit, speichereTausch, speichereTesttag, starteEinheit,
  setzeZurueck, verwerfeEinheit,
} from './speichern';
import { schritte, trageSatzEin } from '../logik/player';

let nr = 0;
const offen: FitnessDb[] = [];
function neueDb(): FitnessDb {
  const d = new FitnessDb(`speichern-${++nr}`);
  offen.push(d);
  return d;
}
afterEach(async () => {
  for (const d of offen.splice(0)) await d.delete();
});

const einheit = (ortId: string, uebungId: string): Einheit => ({
  id: 'e1', woche: '2026-W43', erstelltAm: '2026-10-20T10:00:00', status: 'abgeschlossen', ortId, fokus: 'ganz',
  format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [],
  bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId, saetze: 3, zielWdh: 10, ergebnisse: [] }] }],
});

describe('Einstellungen speichern', () => {
  it('liefert ohne Datensatz die Standardwerte und speichert Änderungen', async () => {
    const d = neueDb();
    expect(await ladeEinstellungen(d)).toEqual(STANDARD_EINSTELLUNGEN);
    await aendereEinstellungen((e) => ({ ...e, standardDauerMin: 55 }), d);
    await aendereEinstellungen((e) => mitFavorit(e, 'klimmzug', true), d);
    expect(await ladeEinstellungen(d)).toMatchObject({ standardDauerMin: 55, favoriten: ['klimmzug'] });
  });
});

describe('Orte speichern und löschen', () => {
  it('hält genau einen Standardort', async () => {
    const d = neueDb();
    await speichereOrt({ ...ort(undefined, 'zuhause'), standard: false }, d);
    expect((await d.orte.get('zuhause'))?.standard).toBe(true);
    await speichereOrt({ ...ort(['BAND'], 'unterwegs'), standard: true }, d);
    const orte = await d.orte.toArray();
    expect(orte.filter((o) => o.standard).map((o) => o.id)).toEqual(['unterwegs']);
  });

  it('löscht nur ungenutzte Orte, die nicht Standard sind', async () => {
    const d = neueDb();
    await speichereOrt(ort(undefined, 'zuhause'), d);
    await speichereOrt(ort(['BAND'], 'unterwegs'), d);
    await speichereOrt(ort(['STANGE'], 'park'), d);
    await d.einheiten.add(einheit('park', 'klimmzug'));
    expect(await loescheOrt('zuhause', d)).toBe(false);
    expect(await loescheOrt('park', d)).toBe(false);
    expect(await loescheOrt('unterwegs', d)).toBe(true);
    expect((await d.orte.toArray()).map((o) => o.id).sort()).toEqual(['park', 'zuhause']);
  });
});

describe('Eigene Übungen und Utensilien', () => {
  it('speichert eine eigene Übung, die danach im Zustand steht', async () => {
    const d = neueDb();
    const z = await ladeZustand(d);
    const u = fertigeUebung(z, { ...entwurfAusVorlage(KATALOG.uebungen[0]!), name: 'Meine Liegestütze' });
    await speichereEigeneUebung(u, d);
    expect((await ladeZustand(d)).eigeneUebungen).toEqual([u]);
  });

  it('löscht eine ungenutzte eigene Übung samt Verweisen, eine genutzte nicht', async () => {
    const d = neueDb();
    const z = await ladeZustand(d);
    const a = fertigeUebung(z, { ...entwurfAusVorlage(KATALOG.uebungen[0]!), name: 'A' });
    const b = fertigeUebung(z, { ...entwurfAusVorlage(KATALOG.uebungen[0]!), name: 'B' });
    await speichereEigeneUebung(a, d);
    await speichereEigeneUebung(b, d);
    await aendereEinstellungen((e) => mitVideoLink(mitFavorit(e, a.id, true), a.id, 'https://example.org'), d);
    await d.einheiten.add(einheit('zuhause', b.id));
    expect(await loescheEigeneUebung(b.id, d)).toBe(false);
    expect(await loescheEigeneUebung(a.id, d)).toBe(true);
    expect((await ladeZustand(d)).eigeneUebungen.map((u) => u.id)).toEqual([b.id]);
    const e = await ladeEinstellungen(d);
    expect(e.favoriten).toEqual([]);
    expect(e.videoLinks).toBeUndefined();
  });

  it('löscht ein eigenes Utensil nur, solange es nirgends genutzt wird', async () => {
    const d = neueDb();
    const sack = neuesUtensil(await ladeZustand(d), 'Sandsack');
    await speichereEigenesUtensil(sack, d);
    await speichereOrt(ort([sack.id], 'garage'), d);
    expect(await loescheEigenesUtensil(sack.id, d)).toBe(false);
    await speichereOrt(ort([], 'garage'), d);
    expect(await loescheEigenesUtensil(sack.id, d)).toBe(true);
    expect((await ladeZustand(d)).eigeneUtensilien).toEqual([]);
  });
});

describe('Onboarding', () => {
  it('speichert den Testtag mit Max-Tests, Startvarianten und schließt das Onboarding ab', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    const jetzt = '2026-10-20T18:00:00';
    const geplant = testtagEinheit(await ladeZustand(d), 'zuhause', jetzt);
    const e: Einheit = {
      ...geplant,
      bloecke: geplant.bloecke.map((b) => ({ ...b, positionen: b.positionen.map((p) => ({ ...p, ergebnisse: [{ nr: 1, wdh: 10, sek: 40, zeit: jetzt }] })) })),
    };
    await speichereTesttag(e, jetzt, d);
    const z = await ladeZustand(d);
    expect(z.maxTests).toHaveLength(4);
    expect(z.muster.map((m) => m.muster).sort()).toEqual(['Knie', 'Rumpf', 'hDruck', 'vZug']);
    expect(z.einheiten.map((x) => x.format)).toEqual(['test']);
    expect(z.wochen).toEqual([]);
    expect((await ladeEinstellungen(d)).onboardingAbgeschlossen).toBe(true);
  });

  it('Überspringen schließt das Onboarding ohne Trainingsdaten ab', async () => {
    const d = neueDb();
    await beendeOnboarding(d);
    expect((await ladeEinstellungen(d)).onboardingAbgeschlossen).toBe(true);
    expect((await ladeZustand(d)).maxTests).toEqual([]);
  });
});

describe('Einheit erstellen, tauschen, verwerfen', () => {
  const geplant = (id: string): Einheit => ({ ...einheit('zuhause', 'kh_bankdruecken'), id, status: 'geplant' });

  it('speichert die Einheit samt Woche und ersetzt ältere geplante Einheiten', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await d.einheiten.add(geplant('alt'));
    await d.einheiten.add({ ...geplant('fertig'), status: 'abgeschlossen' });
    await speichereNeueEinheit(geplant('neu'), 4, '2026-10-20T10:00:00', { erholungswoche: true, laenger: true }, d);
    const z = await ladeZustand(d);
    expect(z.einheiten.map((e) => e.id).sort()).toEqual(['fertig', 'neu']);
    expect(z.wochen).toHaveLength(1);
    expect(z.wochen[0]).toMatchObject({ id: '2026-W43', prognose: 4, einheiten: 0, erholungswoche: true, laengerAngenommen: true });
  });

  it('tauscht in geplanten und laufenden Einheiten, verwirft nur nie gestartete', async () => {
    const d = neueDb();
    await d.einheiten.add(geplant('g'));
    await d.einheiten.add({ ...geplant('l'), status: 'laufend' });
    await d.einheiten.add({ ...geplant('a'), status: 'abgeschlossen' });
    expect(await speichereTausch({ ...geplant('g'), notiz: 'getauscht' }, d)).toBe(true);
    expect(await speichereTausch({ ...geplant('l'), notiz: 'getauscht' }, d)).toBe(false);
    expect(await speichereTausch({ ...geplant('l'), status: 'laufend', notiz: 'im Training' }, d)).toBe(true);
    expect(await speichereTausch({ ...geplant('a'), status: 'abgeschlossen' }, d)).toBe(false);
    expect((await d.einheiten.get('l'))?.notiz).toBe('im Training');
    await d.einheiten.delete('a');
    expect((await d.einheiten.get('g'))?.notiz).toBe('getauscht');
    await verwerfeEinheit('g', d);
    await verwerfeEinheit('l', d);
    expect((await d.einheiten.toArray()).map((e) => e.id)).toEqual(['l']);
  });

  it('speichert die Trainingstage auch vor der ersten Einheit; die Prognose folgt daraus', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await aendereTage([4, 0], 'zuhause', '2026-10-19T08:00:00', d);
    expect((await d.wochen.get('2026-W43'))).toMatchObject({ prognose: 2, einheiten: 0, erholungswoche: false, tage: [0, 4] });
    await aendereTage([1, 2, 3, 4, 5], 'zuhause', '2026-10-20T08:00:00', d);
    expect((await d.wochen.get('2026-W43'))).toMatchObject({ prognose: 5, tage: [1, 2, 3, 4, 5] });
  });

  it('wertet beim Öffnen alle abgelaufenen Wochen aus', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await aendereTage([0, 2, 4], 'zuhause', '2026-10-12T08:00:00', d);
    await aendereTage([0, 2, 4], 'zuhause', '2026-10-19T08:00:00', d);
    await fuehreWochenabschluesseAus('2026-10-21T08:00:00', d);
    const wochen = await d.wochen.toArray();
    expect(wochen.map((w) => [w.id, w.ausgewertet ?? false])).toEqual([['2026-W42', true], ['2026-W43', false]]);
  });
});

describe('Trainings-Player speichern', () => {
  const geplant = (): Einheit => {
    const e: Einheit = { ...einheit('zuhause', 'kh_bankdruecken'), id: 't', status: 'geplant' };
    e.bloecke[0]!.positionen[0]!.last = 2;
    return e;
  };

  it('startet nach dem Aufwärmen, speichert jeden Satz und schließt am Ende ab', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await d.einheiten.add(geplant());
    expect(await starteEinheit('t', '2026-10-20T18:05:00', d)).toBe(true);
    let e = (await d.einheiten.get('t'))!;
    expect(e).toMatchObject({ status: 'laufend', gestartetAm: '2026-10-20T18:05:00' });
    const z = await ladeZustand(d);
    for (const s of schritte(e)) {
      e = trageSatzEin(z, e, s, 10, '2026-10-20T18:10:00', 12);
      expect(await speichereLaufendeEinheit(e, d)).toBe(true);
    }
    expect((await d.einheiten.get('t'))?.bloecke[0]!.positionen[0]!.ergebnisse).toHaveLength(3);
    const fertig = (await beendeEinheit(e, '2026-10-20T18:40:00', d))?.einheit;
    expect(fertig).toMatchObject({ status: 'abgeschlossen', beendetAm: '2026-10-20T18:40:00' });
    const nachher = await ladeZustand(d);
    expect(nachher.wochen[0]).toMatchObject({ id: '2026-W43', einheiten: 1 });
    expect(nachher.varianten.find((v) => v.uebungId === 'kh_bankdruecken')?.last).toBe(12);
    // ein zweites Beenden ändert nichts mehr
    expect(await beendeEinheit(e, '2026-10-20T18:41:00', d)).toBeUndefined();
    expect(await speichereLaufendeEinheit(e, d)).toBe(false);
  });

  it('speichert bei einem Abbruch die erledigten Sätze', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await d.einheiten.add(geplant());
    await starteEinheit('t', '2026-10-20T18:05:00', d);
    const e = trageSatzEin(await ladeZustand(d), (await d.einheiten.get('t'))!, { block: 0, position: 0, satz: 1 }, 9, '2026-10-20T18:10:00', 12);
    await speichereLaufendeEinheit(e, d);
    const fertig = (await beendeEinheit(e, '2026-10-20T18:15:00', d))?.einheit;
    expect(fertig?.status).toBe('abgebrochen');
    expect(fertig?.bloecke[0]!.positionen[0]!.ergebnisse).toHaveLength(1);
  });

  it('macht eine Einheit ohne erledigten Satz wieder zur geplanten', async () => {
    const d = neueDb();
    await d.einheiten.add(geplant());
    await starteEinheit('t', '2026-10-20T18:05:00', d);
    expect(await beendeEinheit((await d.einheiten.get('t'))!, '2026-10-20T18:06:00', d)).toBeUndefined();
    const e = (await d.einheiten.get('t'))!;
    expect(e.status).toBe('geplant');
    expect(e.gestartetAm).toBeUndefined();
    expect(await d.wochen.count()).toBe(0);
  });
});

describe('Beendete Einheit löschen (Entscheidung 29.10.2026)', () => {
  const trainiere = async (d: FitnessDb, id: string, tag: number) => {
    const plan: Einheit = { ...einheit('zuhause', 'kh_bankdruecken'), id, status: 'geplant', erstelltAm: `2026-10-${tag}T10:00:00` };
    plan.bloecke[0]!.positionen[0]!.last = 12;
    const v = (await ladeZustand(d)).varianten.find((x) => x.uebungId === 'kh_bankdruecken');
    if (v) Object.assign(plan.bloecke[0]!.positionen[0]!, { last: v.last, zielWdh: v.zielWdh });
    await d.einheiten.add(plan);
    await starteEinheit(id, `2026-10-${tag}T18:05:00`, d);
    let e = (await d.einheiten.get(id))!;
    const z = await ladeZustand(d);
    for (const s of schritte(e)) e = trageSatzEin(z, e, s, 12, `2026-10-${tag}T18:10:00`);
    await speichereLaufendeEinheit(e, d);
    await beendeEinheit(e, `2026-10-${tag}T18:40:00`, d);
  };

  it('entfernt die Einheit und holt Ziel und Gewicht von davor zurück', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await trainiere(d, 'a', 20);
    const davor = await ladeZustand(d);
    await trainiere(d, 'b', 22);
    expect((await ladeZustand(d)).varianten).not.toEqual(davor.varianten);
    expect(await loescheBeendeteEinheit('b', d)).toBe(true);
    const nachher = await ladeZustand(d);
    expect(nachher.einheiten.map((e) => e.id)).toEqual(['a']);
    expect(nachher.varianten).toEqual(davor.varianten);
    expect(nachher.muster).toEqual(davor.muster);
    expect(nachher.wochen[0]?.einheiten).toBe(1);
    expect(nachher.wochen[0]?.erledigt).toEqual(davor.wochen[0]?.erledigt);
    expect(nachher.muskeln).toEqual(davor.muskeln);
  });

  it('lässt geplante Einheiten und den Testtag stehen', async () => {
    const d = neueDb();
    await d.einheiten.add({ ...einheit('zuhause', 'kh_bankdruecken'), id: 'g', status: 'geplant' });
    await d.einheiten.add({ ...einheit('zuhause', 'liegestuetz'), id: 't', format: 'test' });
    expect(await loescheBeendeteEinheit('g', d)).toBe(false);
    expect(await loescheBeendeteEinheit('t', d)).toBe(false);
    expect(await d.einheiten.count()).toBe(2);
  });
});

describe('Abschluss und Bewertung', () => {
  const beendet = (): Einheit => {
    const e: Einheit = { ...einheit('zuhause', 'kh_bankdruecken'), id: 'a', gestartetAm: '2026-10-20T18:00:00', beendetAm: '2026-10-20T18:40:00' };
    e.bloecke[0]!.positionen[0]!.ergebnisse = [{ nr: 1, wdh: 10, last: 16, zeit: '2026-10-20T18:10:00' }];
    return e;
  };

  it('speichert Gesamtanstrengung, Notiz und Sterne; 1 Stern ersetzt die Hauptvariante', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await d.einheiten.add(beendet());
    await d.muster.put({ muster: 'hDruck', stufe: 5, hauptvarianten: ['kh_bankdruecken', 'kh_bodendruecken'] });
    expect(await speichereAbschluss('a', { gesamtbewertung: 4, notiz: '  Schulter ok ', bewertungen: { kh_bankdruecken: 1 } }, '2026-10-20T18:41:00', d)).toBe(true);
    const e = (await d.einheiten.get('a'))!;
    expect(e).toMatchObject({ gesamtbewertung: 4, notiz: 'Schulter ok' });
    expect((await ladeEinstellungen(d)).bewertungen).toEqual({ kh_bankdruecken: 1 });
    expect((await d.muster.get('hDruck'))?.hauptvarianten).toEqual(['kh_schraegbank', 'kh_bodendruecken']);
  });

  it('lässt Gesamtanstrengung und Notiz weg, wenn nichts angegeben ist', async () => {
    const d = neueDb();
    await d.einheiten.add(beendet());
    await speichereAbschluss('a', { notiz: ' ', bewertungen: {} }, '2026-10-20T18:41:00', d);
    const e = (await d.einheiten.get('a'))!;
    expect('gesamtbewertung' in e || 'notiz' in e).toBe(false);
    expect((await ladeEinstellungen(d)).bewertungen).toBeUndefined();
  });

  it('merkt sich gefragte Übungen, auch ohne Antwort, und die Bewertung aus dem Tab Übungen', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await d.einheiten.add(beendet());
    await speichereAbschluss('a', { bewertungen: { kh_curls: 4 }, gefragt: ['kh_curls', 'hammer_curls'] }, '2026-10-20T18:41:00', d);
    expect((await ladeEinstellungen(d)).bewertungen).toEqual({ kh_curls: 4 });
    expect((await ladeEinstellungen(d)).sterneGefragt).toEqual({
      kh_curls: { am: '2026-10-20T18:41:00', ohneAntwort: 0 }, hammer_curls: { am: '2026-10-20T18:41:00', ohneAntwort: 1 },
    });
    await speichereBewertung('hammer_curls', 5, '2026-10-21T10:00:00', d);
    expect((await ladeEinstellungen(d)).sterneGefragt?.hammer_curls).toEqual({ am: '2026-10-21T10:00:00', ohneAntwort: 0 });
  });

  it('speichert nichts für eine noch nicht beendete Einheit', async () => {
    const d = neueDb();
    await d.einheiten.add({ ...beendet(), status: 'laufend' });
    expect(await speichereAbschluss('a', { gesamtbewertung: 3, bewertungen: {} }, '2026-10-20T18:41:00', d)).toBe(false);
  });

  it('ändert die Bewertung im Tab Übungen und entfernt sie mit der eigenen Übung', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await speichereBewertung('kh_curls', 5, '2026-10-20T10:00:00', d);
    await speichereBewertung('kh_curls', 2, '2026-10-20T10:00:00', d);
    expect((await ladeEinstellungen(d)).bewertungen).toEqual({ kh_curls: 2 });
    const eigene = fertigeUebung(await ladeZustand(d), { ...entwurfAusVorlage(KATALOG.uebungen[0]!), name: 'Test' });
    await speichereEigeneUebung(eigene, d);
    await speichereBewertung(eigene.id, 4, '2026-10-20T10:00:00', d);
    expect(await loescheEigeneUebung(eigene.id, d)).toBe(true);
    expect((await ladeEinstellungen(d)).bewertungen).toEqual({ kh_curls: 2 });
  });
});

describe('App zurücksetzen', () => {
  it('löscht alle Daten; danach gelten die Standardwerte und das Onboarding beginnt neu', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await speichereTesttag({ ...testtagEinheit({ ...(await ladeZustand(d)) }, 'zuhause', '2026-10-20T10:00:00'), status: 'abgeschlossen' }, '2026-10-20T10:00:00', d);
    await aendereEinstellungen((e) => mitFavorit(e, 'klimmzug', true), d);
    expect((await ladeEinstellungen(d)).onboardingAbgeschlossen).toBe(true);
    await setzeZurueck(d);
    const z = await ladeZustand(d);
    for (const t of ['einstellungen', 'orte', 'eigeneUebungen', 'eigeneUtensilien', 'varianten', 'muster', 'muskeln',
      'wochen', 'zyklen', 'einheiten', 'zirkelErgebnisse', 'maxTests'] as const) expect(z[t]).toEqual([]);
    expect(await ladeEinstellungen(d)).toEqual(STANDARD_EINSTELLUNGEN);
  });
});

describe('Datenbank Version 2', () => {
  it('stellt die alten Standardpausen (75 Sek.) auf 60 Sek. um, eigene Werte bleiben', async () => {
    const name = `migration-${Math.random()}`;
    const alt = new Dexie(name);
    alt.version(1).stores({ einstellungen: '' });
    await alt.table('einstellungen').put({ ...STANDARD_EINSTELLUNGEN, pausenSek: { grund: 120, isolation: 75, supersatz: 90 } }, 1);
    alt.close();
    const d = new FitnessDb(name);
    const e = (await d.einstellungen.toArray())[0]!;
    expect(e.pausenSek).toEqual({ grund: 120, isolation: 60, supersatz: 90 });
    d.close();
  });
});

describe('Datenbank Version 3', () => {
  const muskel = (m: Muskel, persoenlicheGrenze: number): MuskelZustand =>
    ({ muskel: m, letzteDosis: 0, letzteSchwer: false, persoenlicheGrenze, gleichWochen: 0, leistung: [] });
  const nachMigration = async (prioritaeten: Einstellungen['prioritaeten']) => {
    const name = `migration-${Math.random()}`;
    const alt = new Dexie(name);
    alt.version(2).stores({ einstellungen: '', muskeln: 'muskel' });
    await alt.table('einstellungen').put({ ...STANDARD_EINSTELLUNGEN, prioritaeten }, 1);
    await alt.table('muskeln').bulkPut([muskel('Brust', 14), muskel('Bauch', 6), muskel('Waden', 4)]);
    alt.close();
    const d = new FitnessDb(name);
    const e = (await d.einstellungen.toArray())[0]!;
    const grenzen = Object.fromEntries((await d.muskeln.toArray()).map((m) => [m.muskel, m.persoenlicheGrenze]));
    d.close();
    return { prioritaeten: e.prioritaeten, grenzen };
  };

  it('stellt den alten Standard „Oberkörper betont“ auf alle normal um und gleicht die Grenzen an', async () => {
    expect(await nachMigration(OBERKOERPER_BETONT)).toEqual({ prioritaeten: STANDARD_PRIORITAETEN, grenzen: { Brust: 12, Bauch: 10, Waden: 10 } });
    expect(Object.values(STANDARD_PRIORITAETEN).every((p) => p === 'normal')).toBe(true);
  });

  it('lässt selbst angepasste Prioritäten und ihre Grenzen unverändert', async () => {
    const eigene = { ...OBERKOERPER_BETONT, Waden: 'niedrig' as const };
    expect(await nachMigration(eigene)).toEqual({ prioritaeten: eigene, grenzen: { Brust: 14, Bauch: 6, Waden: 4 } });
  });

  it('eine Änderung in den Einstellungen zieht die Grenze mit', async () => {
    const d = neueDb();
    await d.muskeln.put(muskel('Bauch', 10));
    await speicherePrioritaeten({ ...STANDARD_PRIORITAETEN, Bauch: 'hoch' }, d);
    expect((await ladeEinstellungen(d)).prioritaeten.Bauch).toBe('hoch');
    expect((await d.muskeln.get('Bauch'))?.persoenlicheGrenze).toBe(12);
  });
});
