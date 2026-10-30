// Entscheidungen 30.10.2026 nach der Testrunde mit verschiedenen Nutzern: Schwierigkeit der zweiten
// Übung, Reaktion auf unmachbare Übungen, Vorauswahl „zu schwer“, Ziel bei Körpergewicht und Band aus
// allen Sätzen, Vielfalt je Bewegung, höchstens 3 Sätze beim ersten Mal, Anzeige-Korrekturen.
import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { heuteFrei, offeneTage, prognoseAusTagen, testtagHeute, vorschlagTage, wochenausblick } from './ausblick';
import { fokusNachInhalt, wocheMitPrognose } from './heute';
import { erstelleEinheit, hauptvarianten, nieTrainiert } from './planung';
import { werteUebungAus, zielAusSaetzen } from './progression';
import { startvarianteLautTabelle } from './testtag';
import { eingespielt, ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit, Einstellungen, Feedback, Position } from './typen';
import { feedbackVon } from './verlauf';
import { einheitenText } from '../ui/texte';

const MO = zeitpunkt(0, 18);
const voll = (e: Partial<Einstellungen> = {}, utensilien?: string[]) =>
  zustand({ katalog: 'voll', einstellungen: { ...STANDARD_EINSTELLUNGEN, ...e }, orte: [ort(utensilien)], maxTests: [] });
const OHNE_GERAETE = ['TISCH', 'ERH'];
const position = (uebungId: string, zielWdh: number, wdh: number[], werte: Partial<Position> = {}): Position => ({
  uebungId, saetze: wdh.length, zielWdh, ...werte,
  ergebnisse: wdh.map((w, i) => ({ nr: i + 1, wdh: w, ...(werte.last !== undefined ? { last: werte.last } : {}), zeit: MO })),
});
const plane = (z: AppZustand, extra: Partial<Parameters<typeof erstelleEinheit>[1]> = {}) =>
  erstelleEinheit(z, { jetzt: MO, ortId: 'zuhause', prognose: 2, morgenWieder: false, laenger: false, ...extra });
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));

describe('Frage 1: zweite Übung höchstens 1 Stufe schwerer', () => {
  it('Einsteiger ohne Geräte: keine Diamond Pushups und keine Elevated Pike Pushups als Variante B', () => {
    const z = voll({ level: 'einsteiger' }, OHNE_GERAETE);   // Musterstufe 3
    const o = z.orte[0]!;
    const trizeps = hauptvarianten(z, 'Trizeps', o, MO).map((k) => k.uebung.id);
    expect(trizeps).toEqual(['bank_dips']);
    const vDruck = hauptvarianten(z, 'vDruck', o, MO).map((k) => k.uebung.id);
    expect(vDruck).toEqual(['pike_liegestuetz']);
    for (const m of ['hDruck', 'Knie', 'Huefte'] as const) {
      for (const k of hauptvarianten(z, m, o, MO)) expect(k.uebung.stufe, k.uebung.id).toBeLessThanOrEqual(4);
    }
  });

  it('Varianten mit Gewicht: die Last regelt die Schwierigkeit, B bleibt frei', () => {
    const z = voll({ level: 'einsteiger' });
    expect(hauptvarianten(z, 'hDruck', z.orte[0]!, MO)).toHaveLength(2);
  });

  it('bei Gleichstand von A und B ohne Gewicht kommt die leichtere zuerst', () => {
    const z = eingespielt(voll({ level: 'einsteiger' }, OHNE_GERAETE));
    expect(hauptvarianten(z, 'hDruck', z.orte[0]!, MO).map((k) => k.uebung.id))
      .toEqual(expect.arrayContaining(['liegestuetz_erhoeht_haende', 'liegestuetz']));
    const druck = ids(plane(z)).filter((id) => ['liegestuetz_erhoeht_haende', 'liegestuetz'].includes(id));
    expect(druck.at(-1)).toBe('liegestuetz_erhoeht_haende');   // vorne steht der Max-Test (Pushups)
  });
});

describe('Frage 2: Übung geht gar nicht', () => {
  const z0 = voll({ level: 'einsteiger' }, OHNE_GERAETE);
  const mitMuster = (muster: 'Trizeps' | 'Knie', haupt: string[], z = z0): AppZustand =>
    ({ ...z, muster: [...z.muster, { muster, stufe: 3, hauptvarianten: haupt }] });

  it('nimmt die leichtere Variante, auch wenn sie schon die andere Hauptvariante ist', () => {
    const z = mitMuster('Trizeps', ['bank_dips', 'diamond_liegestuetz']);
    const { muster, variante } = werteUebungAus(z, position('diamond_liegestuetz', 8, [1, 0]), MO, 'zuhause');
    expect(muster.hauptvarianten).toEqual(['bank_dips']);
    expect(variante.zielWdh).toBe(8);
  });

  it('bei der leichtesten Übung sinkt das Ziel unter den Bereich', () => {
    const z = mitMuster('Knie', ['box_squat']);
    // Deutlich verfehlt (Untergrenze 8): Ziel = Geschafftes im letzten Satz
    expect(werteUebungAus(z, position('box_squat', 8, [5, 4, 4]), MO, 'zuhause').variante.zielWdh).toBe(4);
    // Mehr als 2 unter dem Ziel: Ziel = letzter Satz, auch unter U − 1
    expect(werteUebungAus(z, position('box_squat', 10, [10, 8, 5]), MO, 'zuhause').variante.zielWdh).toBe(5);
    // Mit leichterer Variante bleibt die Grenze U − 1
    const squats = mitMuster('Knie', ['kniebeuge']);
    expect(werteUebungAus(squats, position('kniebeuge', 14, [14, 12, 6]), MO, 'zuhause').variante.zielWdh).toBe(11);
  });

  it('Box Squats sind die Startvariante unter 12 Squats im Testtag', () => {
    expect(startvarianteLautTabelle('Knie', 8)).toBe('box_squat');
    expect(startvarianteLautTabelle('Knie', 11)).toBe('box_squat');
    expect(startvarianteLautTabelle('Knie', 12)).toBe('kniebeuge');
    expect(startvarianteLautTabelle('Knie', 20)).toBe('pausen_kniebeuge');
  });
});

describe('Frage 3: „zu schwer“ erst ab 3 Wiederholungen zu wenig', () => {
  const p = (ziel: number, letzter: number, sek = false): Position => ({
    uebungId: 'x', saetze: 2, zielWdh: ziel,
    ergebnisse: [{ nr: 1, ...(sek ? { sek: ziel } : { wdh: ziel }), zeit: MO }, { nr: 2, ...(sek ? { sek: letzter } : { wdh: letzter }), zeit: MO }],
  });
  it('Wiederholungen: 1 bis 2 darunter passend, 3 darunter zu schwer', () => {
    expect(feedbackVon(p(8, 8))).toBe('passend');
    expect(feedbackVon(p(8, 6))).toBe('passend');
    expect(feedbackVon(p(8, 5))).toBe('schwer');
    expect(feedbackVon({ ...p(8, 8), feedback: 'schwer' })).toBe('schwer');
  });
  it('Halteübungen: bis 10 Sek. darunter passend', () => {
    expect(feedbackVon(p(40, 30, true))).toBe('passend');
    expect(feedbackVon(p(40, 29, true))).toBe('schwer');
  });
});

describe('Frage 4: Ziel bei Körpergewicht und Band aus allen Sätzen', () => {
  const e = { ...STANDARD_EINSTELLUNGEN };
  const ziel = (wdh: number[], fb: Feedback) => zielAusSaetzen(e, position('chinup', 5, wdh), fb);

  it('rechnet das Nachlassen über die Sätze ein', () => {
    // Genau das Ziel geschafft, „passend“ (2 Reserve): ein Ziel mehr
    expect(ziel([8, 8, 8], 'passend')).toBe(9);
    // Chinups 9, 8, 8, 7, 7: der letzte Satz ginge mit 1 Reserve auf 7
    expect(ziel([9, 8, 8, 7, 7], 'passend')).toBe(7);
    expect(ziel([9, 8, 8, 7, 7], 'leicht')).toBe(9);
    // Steigende Sätze zählen nicht als Zunahme
    expect(ziel([6, 8, 10], 'passend')).toBe(9);
  });

  it('springt, wenn deutlich mehr geht; sonst +1; höchstens 2 über dem besten ersten Satz', () => {
    const z = voll();
    const aus = (zielWdh: number, wdh: number[], feedback: Feedback, best?: number) =>
      werteUebungAus({ ...z, varianten: best ? [{ uebungId: 'chinup', zielWdh, seitSteigerung: 5, schwerSerie: 0, bestErsterSatz: best }] : [] },
        position('chinup', zielWdh, wdh, { feedback }), MO, 'zuhause').variante.zielWdh;
    expect(aus(5, [9, 8, 8, 7, 7], 'passend')).toBe(7);        // vorher: 6
    expect(aus(5, [9, 8, 8, 7, 7], 'leicht')).toBe(9);
    expect(aus(8, [8, 8, 8], 'passend')).toBe(9);
    expect(aus(6, [10, 10, 10], 'leicht')).toBe(12);           // Schätzung 13, bester erster Satz + 2 = 12
    expect(aus(6, [7, 7, 6], 'passend', 7)).toBe(7);
  });
});

describe('Frage 5: zweite Übung derselben Bewegung nur ohne offene Alternative', () => {
  it('Rudern statt einer zweiten Klimmzug-Variante', () => {
    const z = eingespielt(voll({ level: 'erfahren' }, ['KH', 'SCHRAEG', 'STANGE', 'BAND', 'ANKER', 'TISCH', 'ERH']));
    const e = plane(z, { morgenWieder: true });
    const muster = e.bloecke.flatMap((b) => b.positionen).map((p) => z.katalog.uebungen.find((u) => u.id === p.uebungId)!.muster);
    expect(muster).toContain('hZug');
    expect(muster).toContain('vZug');
    expect(muster.filter((m) => m === 'vZug')).toHaveLength(1);
  });
});

describe('Neue Übung: beim ersten Mal höchstens 3 Sätze', () => {
  it('begrenzt nie trainierte Übungen, eingespielte nicht', () => {
    const neu = voll({}, ['KH', 'SCHRAEG', 'STANGE', 'TISCH', 'ERH']);
    const satzzahlen = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen).filter((p) => !p.istMaxTest).map((p) => p.saetze);
    expect(Math.max(...satzzahlen(plane(neu)))).toBeLessThanOrEqual(3);
    expect(Math.max(...satzzahlen(plane(eingespielt(neu))))).toBeGreaterThan(3);
    expect(nieTrainiert(neu, 'kh_bankdruecken')).toBe(true);
    expect(nieTrainiert(eingespielt(neu), 'kh_bankdruecken')).toBe(false);
  });
});

describe('Anzeige-Korrekturen', () => {
  const testtag = (z: AppZustand, jetzt: string): AppZustand => ({
    ...z,
    einheiten: [{
      id: 't', woche: '2026-W43', erstelltAm: jetzt, gestartetAm: jetzt, beendetAm: jetzt, status: 'abgeschlossen',
      ortId: 'zuhause', fokus: 'ganz', format: 'test', geschaetzteDauerMin: 20, aufwaermen: [],
      bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId: 'liegestuetz', saetze: 1, zielWdh: 0, istMaxTest: true, ergebnisse: [{ nr: 1, wdh: 10, zeit: jetzt }] }] }],
    }],
  });

  it('nach dem Testtag zählt heute nicht mehr als Trainingstag', () => {
    const fr = zeitpunkt(4, 19);
    const ohneWoche = testtag(voll(), fr);
    const z = { ...ohneWoche, wochen: [wocheMitPrognose(ohneWoche, fr, 1, 'zuhause', { tage: [4, 5] })] };
    expect(testtagHeute(z, fr)).toBe(true);
    expect(offeneTage(z, fr, [4, 5])).toEqual([5]);
    expect(prognoseAusTagen(z, fr, [4, 5])).toBe(1);
    expect(vorschlagTage(z, fr)[0]).toBe(5);
    expect(vorschlagTage(testtag(voll(), zeitpunkt(6, 19)), zeitpunkt(6, 19))).toEqual([]);
    // Der Ausblick rechnet ohne unsichtbare Einheit am Freitag: Samstag ist eine volle Einheit.
    const sa = wochenausblick(z, fr, [4, 5]).find((t) => t.tag === 5)!;
    const muskeln = new Set(sa.einheit!.bloecke.flatMap((b) => b.positionen)
      .flatMap((p) => z.katalog.uebungen.find((u) => u.id === p.uebungId)!.primaer));
    expect(muskeln.has('Brust')).toBe(true);
    expect(muskeln.has('Quadrizeps')).toBe(true);
  });

  it('heute frei an einem nicht gewählten Tag', () => {
    expect(heuteFrei(MO, [1, 3])).toBe(true);
    expect(heuteFrei(MO, [0, 3])).toBe(false);
    expect(heuteFrei(MO, undefined)).toBe(false);
  });

  it('Bezeichnung nach Inhalt', () => {
    const z = voll();
    const einheit = (fokus: Einheit['fokus'], uebungen: string[]): Einheit => ({
      id: 'e', woche: '2026-W43', erstelltAm: MO, status: 'geplant', ortId: 'zuhause', fokus, format: 'klassisch',
      geschaetzteDauerMin: 30, aufwaermen: [],
      bloecke: uebungen.map((uebungId) => ({ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId, saetze: 3, zielWdh: 10, ergebnisse: [] }] })),
    });
    expect(fokusNachInhalt(z, einheit('ganz', ['goblet_squat', 'kh_rdl', 'plank']))).toBe('unten');
    expect(fokusNachInhalt(z, einheit('ganz', ['kh_bankdruecken', 'kh_curls']))).toBe('oben');
    expect(fokusNachInhalt(z, einheit('ganz', ['kh_bankdruecken', 'goblet_squat']))).toBe('ganz');
    expect(fokusNachInhalt(z, einheit('oben', ['kh_bankdruecken']))).toBe('oben');
  });

  it('„0 von 1 Einheit“', () => {
    expect(einheitenText(0, 1)).toBe('0 von 1 Einheit');
    expect(einheitenText(1, 3)).toBe('1 von 3 Einheiten');
  });
});
