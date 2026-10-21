import { describe, expect, it } from 'vitest';
import { zirkelAnteilFuerZiele } from './einstellungen';
import { erstelleEinheit, startfragen } from './planung';
import { ort, zeitpunkt, zustand } from './testhilfe';
import {
  schliesseTesttagAb, startvariante, startvarianteLautTabelle, testtagEinheit, testtagErgebnisse, testtagTests,
} from './testtag';
import type { AppZustand, Einheit, SatzErgebnis } from './typen';

const MO = zeitpunkt(0, 18);
const neu = (utensilien?: string[]) => zustand({ katalog: 'voll', maxTests: [], orte: [ort(utensilien)] });
const uebung = (z: AppZustand, id: string) => z.katalog.uebungen.find((u) => u.id === id)!;

// Trägt die Ergebnisse je Test-Übung ein, wie es der Testtag-Bildschirm tut.
function mitErgebnissen(e: Einheit, werte: Record<string, Omit<SatzErgebnis, 'nr' | 'zeit'>>): Einheit {
  return {
    ...e,
    bloecke: e.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => ({ ...p, ergebnisse: werte[p.uebungId] ? [{ nr: 1, ...werte[p.uebungId], zeit: MO }] : [] })),
    })),
  };
}

describe('Startvariante laut Tabelle', () => {
  it.each([
    [0, 'knieliegestuetz'], [1, 'liegestuetz_erhoeht_haende'], [7, 'liegestuetz_erhoeht_haende'], [8, 'liegestuetz'],
    [20, 'liegestuetz'], [21, 'liegestuetz_fuesse_erhoeht'], [30, 'liegestuetz_fuesse_erhoeht'], [31, 'liegestuetz_band'],
  ])('hDruck %i ⇒ %s', (n, id) => expect(startvarianteLautTabelle('hDruck', n)).toBe(id));

  it.each([
    [0, 19, 'scapula_pullups'], [0, 20, 'negative_klimmzuege'], [1, 0, 'klimmzug_band'], [3, 0, 'klimmzug_band'],
    [4, 0, 'chinup'], [7, 0, 'chinup'], [8, 0, 'klimmzug'], [14, 0, 'klimmzug'], [15, 0, 'klimmzug_gewicht'],
  ])('vZug %i Wdh., %i Sek. hängen ⇒ %s', (n, sek, id) => expect(startvarianteLautTabelle('vZug', n, sek)).toBe(id));

  it.each([
    [14, 'kniebeuge'], [15, 'pausen_kniebeuge'], [30, 'pausen_kniebeuge'], [31, 'goblet_squat'],
  ])('Knie %i ⇒ %s', (n, id) => expect(startvarianteLautTabelle('Knie', n)).toBe(id));

  it.each([
    [29, 'dead_bug'], [30, 'plank'], [60, 'plank'], [61, 'hollow_hold'],
  ])('Rumpf %i Sek. ⇒ %s', (n, id) => expect(startvarianteLautTabelle('Rumpf', n)).toBe(id));
});

describe('Startvariante am Ort', () => {
  it('nimmt die nächstleichtere Variante der Tabelle, wenn die Startvariante am Ort nicht geht', () => {
    const z = neu(['KH']);
    const o = z.orte[0]!;
    const h = startvariante(z, o, 'hDruck', 25, 0, MO)!;
    expect(h.tabelle.id).toBe('liegestuetz_fuesse_erhoeht');
    expect(h.uebung.id).toBe('liegestuetz');
  });

  it('Knie über 30: Goblet Squat, sonst bulgarische Kniebeuge, sonst Pausen-Kniebeuge', () => {
    expect(startvariante(neu(['KH']), ort(['KH']), 'Knie', 35, 0, MO)!.uebung.id).toBe('goblet_squat');
    expect(startvariante(neu(['ERH']), ort(['ERH']), 'Knie', 35, 0, MO)!.uebung.id).toBe('bss_kg');
    expect(startvariante(neu([]), ort([]), 'Knie', 35, 0, MO)!.uebung.id).toBe('pausen_kniebeuge');
  });

  it('beachtet Sperren', () => {
    const z = { ...neu(), einstellungen: [{ ...neu().einstellungen[0]!, einschraenkungen: [{ id: 's', typ: 'region' as const, wert: 'handgelenk' }] }] };
    expect(startvariante(z, z.orte[0]!, 'hDruck', 10, 0, MO)).toBeUndefined();
  });
});

describe('Testtag', () => {
  it('erzeugt eine Test-Einheit mit Aufwärmen und je Test einem Satz ohne Ziel', () => {
    const e = testtagEinheit(neu(), 'zuhause', MO);
    expect(e.format).toBe('test');
    expect(e.bloecke.map((b) => b.positionen[0]!.uebungId)).toEqual(['liegestuetz', 'klimmzug', 'kniebeuge', 'plank']);
    expect(e.bloecke.every((b) => b.positionen.length === 1 && b.positionen[0]!.istMaxTest && b.positionen[0]!.zielWdh === 0)).toBe(true);
    expect(e.aufwaermen.length).toBeGreaterThan(0);
    expect(e.geschaetzteDauerMin).toBe(17);
  });

  it('lässt Tests weg, die am Ort nicht gehen', () => {
    expect(testtagTests(neu(['KH']), 'zuhause', MO).map((t) => t.muster)).toEqual(['hDruck', 'Knie', 'Rumpf']);
  });

  it('setzt Musterstufen, Startvarianten und Startziele aus den Ergebnissen', () => {
    const z = neu();
    const e = mitErgebnissen(testtagEinheit(z, 'zuhause', MO), {
      liegestuetz: { wdh: 25 }, klimmzug: { wdh: 0, sek: 25 }, kniebeuge: { wdh: 35 }, plank: { sek: 45 },
    });
    const n = schliesseTesttagAb(z, e, MO);
    const stufe = (m: string) => n.muster.find((x) => x.muster === m)!;
    const ziel = (id: string) => n.varianten.find((v) => v.uebungId === id)!.zielWdh;

    expect(stufe('hDruck').stufe).toBe(uebung(z, 'liegestuetz_fuesse_erhoeht').stufe);
    expect(stufe('hDruck').hauptvarianten[0]).toBe('liegestuetz_fuesse_erhoeht');
    expect(stufe('hDruck').hauptvarianten).toHaveLength(2);
    expect(ziel('liegestuetz_fuesse_erhoeht')).toBe(15);  // 70 % von 25 = 18, begrenzt auf 8 bis 15
    expect(stufe('vZug').hauptvarianten[0]).toBe('negative_klimmzuege');
    expect(ziel('negative_klimmzuege')).toBe(3);          // 0 Wdh. ⇒ Untergrenze
    expect(stufe('Knie').hauptvarianten[0]).toBe('goblet_squat');
    expect(ziel('goblet_squat')).toBe(12);
    expect(stufe('Rumpf').hauptvarianten[0]).toBe('plank');
    expect(ziel('plank')).toBe(32);                       // 70 % von 45 = 31,5

    expect(n.maxTests.map((t) => [t.uebungId, t.ergebnis, t.einheit])).toEqual([
      ['liegestuetz', 25, 'Wdh.'], ['klimmzug', 0, 'Wdh.'], ['kniebeuge', 35, 'Wdh.'], ['plank', 45, 'Sek.'],
    ]);
    expect(n.einheiten).toHaveLength(1);
    expect(n.einheiten[0]!.status).toBe('abgeschlossen');
    expect(n.muskeln.find((m) => m.muskel === 'Brust')!.letzteBelastung).toBe(MO);
  });

  it('fasst für den Ergebnisbildschirm Ergebnis, Startübung und Startziel je Test zusammen', () => {
    const z = neu();
    const e = mitErgebnissen(testtagEinheit(z, 'zuhause', MO), {
      liegestuetz: { wdh: 25 }, klimmzug: { wdh: 0, sek: 25 }, kniebeuge: { wdh: 35 }, plank: { sek: 45 },
    });
    const liste = testtagErgebnisse(schliesseTesttagAb(z, e, MO), e);
    expect(liste.map((t) => [t.test.id, t.ergebnis, t.inSek, t.haengenSek, t.start?.uebung.id, t.start?.zielWdh])).toEqual([
      ['liegestuetz', 25, false, undefined, 'liegestuetz_fuesse_erhoeht', 15],
      ['klimmzug', 0, false, 25, 'negative_klimmzuege', 3],
      ['kniebeuge', 35, false, undefined, 'goblet_squat', 12],
      ['plank', 45, true, undefined, 'plank', 32],
    ]);
  });

  it('zählt nicht als Einheit der Woche: Die Wochenfrage kommt bei der ersten Einheit', () => {
    const z = neu();
    const e = mitErgebnissen(testtagEinheit(z, 'zuhause', MO), { liegestuetz: { wdh: 15 }, klimmzug: { wdh: 5 }, kniebeuge: { wdh: 20 }, plank: { sek: 40 } });
    const n = schliesseTesttagAb(z, e, MO);
    expect(n.wochen).toEqual([]);
    expect(startfragen(n, zeitpunkt(1, 18)).prognoseAbfragen).toBe(true);
  });

  it('die erste Einheit danach nutzt die Startvarianten und enthält keinen Max-Test', () => {
    const z = neu();
    const e = mitErgebnissen(testtagEinheit(z, 'zuhause', MO), { liegestuetz: { wdh: 15 }, klimmzug: { wdh: 5 }, kniebeuge: { wdh: 20 }, plank: { sek: 40 } });
    const n = schliesseTesttagAb(z, e, MO);
    const jetzt = zeitpunkt(2, 18);
    const einheit = erstelleEinheit(n, { jetzt, ortId: 'zuhause', prognose: 2, morgenWieder: false, laenger: false });
    const positionen = einheit.bloecke.flatMap((b) => b.positionen);
    expect(positionen.some((p) => p.istMaxTest)).toBe(false);
    const hDruck = n.muster.find((m) => m.muster === 'hDruck')!.hauptvarianten;
    expect(positionen.some((p) => hDruck.includes(p.uebungId))).toBe(true);
    const chinup = positionen.find((p) => p.uebungId === 'chinup');
    if (chinup) expect(chinup.zielWdh).toBe(5);           // 70 % von 5 = 4, begrenzt auf 5 bis 12
  });

  it('ohne Ergebnis bleibt das Muster beim Level', () => {
    const z = neu();
    const e = mitErgebnissen(testtagEinheit(z, 'zuhause', MO), { liegestuetz: { wdh: 15 } });
    const n = schliesseTesttagAb(z, e, MO);
    expect(n.muster.map((m) => m.muster)).toEqual(['hDruck']);
    expect(n.maxTests).toHaveLength(1);
  });
});

describe('Zirkel-Anteil nach Zielen', () => {
  it('Ausdauer oder Fitness ⇒ 1x pro Woche, sonst alle 2 Wochen', () => {
    expect(zirkelAnteilFuerZiele(['ausdauer'])).toBe('1proWoche');
    expect(zirkelAnteilFuerZiele(['muskelaufbau', 'fitness'])).toBe('1proWoche');
    expect(zirkelAnteilFuerZiele(['muskelaufbau', 'kraft'])).toBe('alle2Wochen');
  });
});
