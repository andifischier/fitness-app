import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { KATALOG } from './katalog';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { entwurfAusVorlage, fertigeUebung, mitFavorit, mitVideoLink, neuesUtensil } from '../logik/einstellungen';
import { ort } from '../logik/testhilfe';
import type { Einheit } from '../logik/typen';
import { FitnessDb, ladeZustand } from './db';
import {
  aendereEinstellungen, ladeEinstellungen, loescheEigeneUebung, loescheEigenesUtensil, loescheOrt,
  speichereEigeneUebung, speichereEigenesUtensil, speichereOrt,
} from './speichern';

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
