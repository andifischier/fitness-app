import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { KATALOG } from './katalog';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { entwurfAusVorlage, fertigeUebung, mitFavorit, mitVideoLink, neuesUtensil } from '../logik/einstellungen';
import { ort } from '../logik/testhilfe';
import { testtagEinheit } from '../logik/testtag';
import type { Einheit } from '../logik/typen';
import { FitnessDb, ladeZustand } from './db';
import {
  aendereEinstellungen, aenderePrognose, beendeEinheit, beendeOnboarding, fuehreWochenabschluesseAus, ladeEinstellungen, loescheEigeneUebung,
  loescheEigenesUtensil, loescheOrt, speichereEigeneUebung, speichereEigenesUtensil, speichereNeueEinheit, speichereOrt,
  speichereAbschluss, speichereBewertung, speichereLaufendeEinheit, speichereTausch, speichereTesttag, starteEinheit,
  verwerfeEinheit,
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

  it('tauscht und verwirft nur nie gestartete Einheiten', async () => {
    const d = neueDb();
    await d.einheiten.add(geplant('g'));
    await d.einheiten.add({ ...geplant('l'), status: 'laufend' });
    expect(await speichereTausch({ ...geplant('g'), notiz: 'getauscht' }, d)).toBe(true);
    expect(await speichereTausch({ ...geplant('l'), notiz: 'getauscht' }, d)).toBe(false);
    expect((await d.einheiten.get('g'))?.notiz).toBe('getauscht');
    await verwerfeEinheit('g', d);
    await verwerfeEinheit('l', d);
    expect((await d.einheiten.toArray()).map((e) => e.id)).toEqual(['l']);
  });

  it('ändert die Prognose auch vor der ersten Einheit der Woche', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await aenderePrognose(2, 'zuhause', '2026-10-19T08:00:00', d);
    expect((await d.wochen.get('2026-W43'))).toMatchObject({ prognose: 2, einheiten: 0, erholungswoche: false });
    await aenderePrognose(5, 'zuhause', '2026-10-20T08:00:00', d);
    expect((await d.wochen.get('2026-W43'))?.prognose).toBe(5);
  });

  it('wertet beim Öffnen alle abgelaufenen Wochen aus', async () => {
    const d = neueDb();
    await speichereOrt(ort(), d);
    await aenderePrognose(3, 'zuhause', '2026-10-12T08:00:00', d);
    await aenderePrognose(3, 'zuhause', '2026-10-19T08:00:00', d);
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
