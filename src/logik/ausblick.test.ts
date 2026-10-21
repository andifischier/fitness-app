import { describe, expect, it } from 'vitest';
import { isoWoche } from './datum';
import {
  heuteTrainiert, maxOffeneTage, offeneTage, prognoseAusTagen, vorschlagTage, wochenausblick,
} from './ausblick';
import { erstelleEinheit, startfragen } from './planung';
import { absolviere, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand } from './typen';

const MO = zeitpunkt(0, 18);
const MI = zeitpunkt(2, 18);
const voll = () => zustand({ katalog: 'voll' });
const mitTagen = (z: AppZustand, jetzt: string, tage: number[], prognose = tage.length): AppZustand => {
  const z2 = setzePrognose(z, jetzt, prognose);
  return { ...z2, wochen: z2.wochen.map((w) => (w.id === isoWoche(jetzt) ? { ...w, tage } : w)) };
};
const einmalTrainiert = (z: AppZustand, jetzt: string) => {
  const f = startfragen(z, jetzt);
  return absolviere(z, erstelleEinheit(z, { jetzt, ortId: f.ortId, prognose: f.prognoseVorschlag, morgenWieder: false, laenger: false }), jetzt);
};

describe('Tage und Prognose', () => {
  it('zählt heute nur, solange heute noch nicht trainiert wurde', () => {
    const z = voll();
    expect(offeneTage(z, MI, [0, 2, 4])).toEqual([2, 4]);
    const nach = einmalTrainiert(z, MI);
    expect(heuteTrainiert(nach, MI)).toBe(true);
    expect(offeneTage(nach, MI, [0, 2, 4])).toEqual([4]);
  });

  it('Prognose = erledigte Einheiten plus anstehende Tage, höchstens 6', () => {
    const z = einmalTrainiert(voll(), MO);
    expect(prognoseAusTagen(z, MI, [0, 2, 4])).toBe(3);
    expect(prognoseAusTagen(z, MI, [2, 3, 4, 5, 6])).toBe(6);
    expect(maxOffeneTage(z, MI)).toBe(5);
  });

  it('schlägt die Tage gleichmäßig ab heute vor, sonst die der Vorwoche', () => {
    const z = voll();
    expect(vorschlagTage(z, MO)).toEqual([0, 2, 4]);   // übliche Einheiten 3
    expect(vorschlagTage(z, zeitpunkt(5, 9))).toEqual([5, 6]);
    const vorwoche = mitTagen(z, zeitpunkt(-7, 18), [1, 3, 5]);
    expect(vorschlagTage(vorwoche, MI)).toEqual([3, 5]);
  });
});

describe('startfragen mit gewählten Tagen', () => {
  it('nimmt Prognose und „Morgen wieder?“ aus den Tagen und fragt nicht nach', () => {
    const z = mitTagen(voll(), MO, [0, 1, 3]);
    const f = startfragen(z, MO);
    expect(f.prognoseAbfragen).toBe(false);
    expect(f.prognoseVorschlag).toBe(3);
    expect(f.morgenWiederVorschlag).toBe(true);
    expect(startfragen(mitTagen(voll(), MO, [0, 2, 4]), MO).morgenWiederVorschlag).toBe(false);
  });

  it('eine Einheit an einem nicht gewählten Tag erhöht die Prognose', () => {
    const z = mitTagen(voll(), MO, [2, 4]);
    expect(startfragen(z, MO).prognoseVorschlag).toBe(3);
  });
});

describe('wochenausblick', () => {
  it('zeigt je gewähltem Tag eine Einheit mit Übungen; der erste Tag gleicht der Vorschau auf Heute', () => {
    const z = mitTagen(voll(), MO, [0, 2, 4]);
    const tage = wochenausblick(z, MO, [0, 2, 4]);
    expect(tage.map((t) => t.tag)).toEqual([0, 2, 4]);
    expect(tage.map((t) => t.datum)).toEqual(['2026-10-19', '2026-10-21', '2026-10-23']);
    for (const t of tage) {
      expect(t.art).toBe('einheit');
      expect(t.einheit!.bloecke.length).toBeGreaterThan(0);
    }
    const f = startfragen(z, MO);
    const heute = erstelleEinheit(z, { jetzt: MO, ortId: f.ortId, prognose: f.prognoseVorschlag, morgenWieder: f.morgenWiederVorschlag, laenger: false });
    expect(tage[0]!.einheit).toEqual(heute);
  });

  it('plant bei Tagen am Stück zuerst nur eine Körperhälfte, am Folgetag die erholte', () => {
    const z = mitTagen(voll(), MO, [0, 1]);
    const [a, b] = wochenausblick(z, MO, [0, 1]);
    expect(['oben', 'unten']).toContain(a!.einheit!.fokus);
    expect(b!.art).toBe('einheit');
    expect(b!.einheit!.bloecke.length).toBeGreaterThan(0);
  });

  it('verteilt das Wochenziel: spätere Tage wiederholen nicht einfach den ersten', () => {
    const z = mitTagen(voll(), MO, [0, 2, 4]);
    const tage = wochenausblick(z, MO, [0, 2, 4]);
    const saetze = tage.map((t) => t.einheit!.bloecke.flatMap((b) => b.positionen).reduce((s, p) => s + p.saetze, 0));
    expect(saetze.every((s) => s >= 6)).toBe(true);
    expect(tage[1]!.einheit).not.toEqual(tage[0]!.einheit);
  });

  it('zeigt erledigte Einheiten an ihrem Tag und plant nur die restlichen', () => {
    let z = mitTagen(voll(), MO, [0, 2, 4]);
    z = einmalTrainiert(z, MO);
    const tage = wochenausblick(z, MI, [0, 2, 4]);
    expect(tage.map((t) => [t.tag, t.art])).toEqual([[0, 'erledigt'], [2, 'einheit'], [4, 'einheit']]);
  });

  it('ändert den Zustand nicht', () => {
    const z = mitTagen(voll(), MO, [0, 2, 4]);
    const kopie = structuredClone(z);
    wochenausblick(z, MO, [0, 2, 4]);
    expect(z).toEqual(kopie);
  });
});
