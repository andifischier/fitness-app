// Katalogerweiterung 09.11.2026: 79 bekannte Übungen, Brust isoliert als Ergänzung, Pullovers nur ohne
// Klimmzugstange, Shrugs nur auf Wunsch (Entscheidungen 09.11.2026).
import { describe, expect, it } from 'vitest';
import { ERGAENZUNG, NUR_OHNE, PROGRESSION } from '../konfiguration';
import { fehlendeMuster } from './einstellungen';
import { uebungMoeglich } from './equipment';
import { erstelleEinheit, hauptvarianten } from './planung';
import { eingespielt, ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit, Einstellungen, Ort } from './typen';
import { uebungVon } from './verlauf';

const MO = zeitpunkt(0, 18);
const voll = (orte: Ort[] = [ort()], einstellungen: Partial<Einstellungen> = {}): AppZustand =>
  setzePrognose(eingespielt(zustand({ katalog: 'voll', orte, einstellungen })), MO, 3);
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
const muster = (z: AppZustand, id: string) => uebungVon(z, id)!.muster;
const haupt = (z: AppZustand, m: Parameters<typeof hauptvarianten>[1], o: Ort) =>
  hauptvarianten(z, m, o, MO).map((k) => k.uebung.id);
const plane = (z: AppZustand, extra: Partial<Parameters<typeof erstelleEinheit>[1]> = {}) =>
  erstelleEinheit(z, { jetzt: MO, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, ...extra });

describe('Brust isoliert ergänzt das Drücken', () => {
  it('Flys kommen nur in eine Einheit, in der schon eine Drückübung ist', () => {
    const z = voll([ort(['KH', 'SCHRAEG'])]);
    for (const dauerMin of [20, 30, 45, 60, 90]) {
      const e = plane(z, { muskeln: ['Brust'], dauerMin });
      const liste = ids(e);
      const flys = liste.findIndex((id) => muster(z, id) === 'BrustIso');
      const druck = liste.findIndex((id) => muster(z, id) === 'hDruck');
      expect(druck, `${dauerMin} Min.`).toBeGreaterThanOrEqual(0);
      if (flys >= 0) expect(flys, `${dauerMin} Min.`).toBeGreaterThan(druck);
    }
  });

  it('bei langer Einheit mit offenem Brustbedarf kommen Flys dazu', () => {
    const z = voll([ort(['KH', 'SCHRAEG'])]);
    const e = plane(z, { muskeln: ['Brust'], dauerMin: 90 });
    expect(ids(e).some((id) => muster(z, id) === 'BrustIso')).toBe(true);
  });

  it('ohne mögliche Drückübung sind Flys erlaubt', () => {
    const drueck = zustand({ katalog: 'voll' }).katalog.uebungen.filter((u) => u.muster === 'hDruck').map((u) => u.id);
    const z = voll([ort(['KH', 'SCHRAEG'])], { ausgeschlossen: drueck });
    const e = plane(z, { muskeln: ['Brust'] });
    expect(ids(e).some((id) => muster(z, id) === 'BrustIso')).toBe(true);
  });

  it('Flys mit Bank, am Boden nur ohne Bank, mit Band überall dort, wo ein Band hängt', () => {
    const z = voll();
    expect(haupt(z, 'BrustIso', ort(['KH', 'SCHRAEG']))).toEqual(['kh_flys']);
    expect(haupt(z, 'BrustIso', ort(['KH']))).toEqual(['kh_boden_flys']);
    expect(haupt(z, 'BrustIso', ort(['BAND', 'ANKER']))).toEqual(['band_flys']);
    expect(ERGAENZUNG.BrustIso).toBe('hDruck');
  });

  it('ohne Geräte fehlt keine Bewegung, die man vermissen müsste', () => {
    const z = voll();
    const ohne = ort(['TISCH', 'ERH']);
    expect(fehlendeMuster(z, ohne)).not.toContain('BrustIso');
    // Schulter hat jetzt eine eigene Übung ohne Geräte (Prone Y-T-W Raises) statt des Ersatzes Schulterdrücken.
    expect(hauptvarianten(z, 'Schulter', ohne, MO)[0]).toMatchObject({ uebung: { id: 'prone_ytw' }, istErsatz: false });
  });
});

describe('Nur ohne bestimmtes Utensil', () => {
  const pullover = (utensilien: string[]) => uebungMoeglich(ort(utensilien), uebungVon(voll(), 'kh_pullover')!);

  it('Pullovers nur ohne Klimmzugstange (Entscheidung 09.11.2026)', () => {
    expect(NUR_OHNE.kh_pullover).toEqual(['STANGE']);
    expect(pullover(['KH', 'BANK'])).toBe(true);
    expect(pullover(['KH', 'BANK', 'STANGE'])).toBe(false);
    const z = voll();
    expect(haupt(z, 'vZug', ort(['KH', 'BANK']))).toContain('kh_pullover');
    expect(haupt(z, 'vZug', ort(['KH', 'BANK', 'STANGE']))).not.toContain('kh_pullover');
  });

  it('Boden-Flys und Glute Bridges mit Hantel nur ohne Bank, Swings mit Kurzhantel nur ohne Kettlebell', () => {
    const z = voll();
    const moeglich = (id: string, utensilien: string[]) => uebungMoeglich(ort(utensilien), uebungVon(z, id)!);
    expect(moeglich('kh_boden_flys', ['KH'])).toBe(true);
    expect(moeglich('kh_boden_flys', ['KH', 'BANK'])).toBe(false);
    expect(moeglich('kh_glute_bridge', ['KH'])).toBe(true);
    expect(moeglich('kh_glute_bridge', ['KH', 'SCHRAEG'])).toBe(false);
    expect(moeglich('kh_swing', ['KH'])).toBe(true);
    expect(moeglich('kh_swing', ['KH', 'KB'])).toBe(false);
  });
});

describe('Shrugs nur auf Wunsch (Entscheidung 09.11.2026)', () => {
  it('zählen für den Rücken und sind keine automatische Schulterübung', () => {
    const z = voll();
    expect(uebungVon(z, 'kh_shrugs')).toMatchObject({ muster: 'Schulter', primaer: ['Ruecken'] });
    for (const level of ['einsteiger', 'fortgeschritten', 'erfahren'] as const) {
      const mitLevel = voll([ort()], { level });
      expect(haupt(mitLevel, 'Schulter', ort())).not.toContain('kh_shrugs');
      expect(haupt(mitLevel, 'Schulter', ort(['KH']))).not.toContain('kh_shrugs');
    }
  });

  it('als Lieblingsübung werden sie eingeplant', () => {
    const z = voll([ort()], { favoriten: ['kh_shrugs'] });
    expect(haupt(z, 'Schulter', ort())).toContain('kh_shrugs');
  });
});

describe('Neue Übungen im Katalog', () => {
  it('einseitige Hantel-Varianten für „die Last geht aus“ tragen die Kennzeichnung', () => {
    const z = voll();
    for (const id of ['kh_bankdruecken_einarmig', 'kh_schulterdruecken_einarmig']) {
      expect(PROGRESSION.einseitigKennzeichen.some((k) => id.includes(k)), id).toBe(true);
      expect(uebungVon(z, id), id).toMatchObject({ einseitig: true, anzahlGewichte: 1 });
    }
    // Mindestens gleiche Stufe wie die beidarmige Übung, sonst greift die Regel nicht.
    expect(uebungVon(z, 'kh_bankdruecken_einarmig')!.stufe).toBeGreaterThanOrEqual(uebungVon(z, 'kh_bankdruecken')!.stufe);
    expect(uebungVon(z, 'kh_schulterdruecken_einarmig')!.stufe)
      .toBeGreaterThanOrEqual(uebungVon(z, 'kh_schulterdruecken_stehend')!.stufe);
  });

  it('neue leichte Körpergewichtsvarianten verdrängen bei Einsteigern nicht die Hantelübung', () => {
    // Wall Pushups stehen mit Knee Pushups auf Stufe 1, Negative Pushups auf Stufe 2, Incline Pike Pushups auf
    // Stufe 1: Sonst lägen sie der Musterstufe 3 näher als die bisherigen Hauptübungen (Tisch und Erhöhung
    // sind an jedem Ort vorhanden). Die Auswahl bleibt wie vor der Erweiterung.
    const z = voll([ort()], { level: 'einsteiger' });
    expect(haupt(z, 'hDruck', ort(['KH', 'BANK', 'TISCH', 'ERH']))).toEqual(['liegestuetz_erhoeht_haende', 'liegestuetz']);
    expect(haupt(z, 'vDruck', ort(['KH', 'TISCH', 'ERH']))).toEqual(['pike_liegestuetz', 'kh_schulterdruecken_stehend']);
    expect(uebungVon(z, 'wand_liegestuetz')!.stufe).toBe(1);
  });

  it('Ausfallschritte mit Hanteln gibt es auch ohne Platz zum Gehen', () => {
    const z = voll([ort(['KH'])]);
    const varianten = haupt(z, 'Einbein', ort(['KH']));
    expect(varianten.some((id) => uebungVon(z, id)!.lasttyp === 'Last')).toBe(true);
    expect(varianten.every((id) => !uebungVon(z, id)!.brauchtPlatz)).toBe(true);
    // Mit Platz zum Gehen bleibt der Ausfallschritt gehend möglich.
    const mitPlatz = voll([ort(['KH'])], { platzZumGehen: true });
    expect(haupt(mitPlatz, 'Einbein', ort(['KH']))).toContain('kh_ausfallschritt');
  });
});
