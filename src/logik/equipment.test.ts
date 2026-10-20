import { describe, expect, it } from 'vitest';
import { KATALOG } from '../daten/katalog';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { bandStufen, istGesperrt, lastraster, uebungMoeglich } from './equipment';
import type { Einstellungen, Ort, Uebung } from './typen';

const uebung = (id: string): Uebung => KATALOG.uebungen.find((u) => u.id === id)!;
const ort = (equipment: Ort['equipment']): Ort => ({ id: 'o', name: 'o', standard: true, equipment });
const mitSperre = (typ: 'region' | 'muster', wert: string, bis?: string): Einstellungen => ({
  ...STANDARD_EINSTELLUNGEN, einschraenkungen: [{ id: 's', typ, wert, ...(bis ? { bis } : {}) }],
});

describe('Lastraster', () => {
  it('Kurzhanteln verstellbar: Schritte bis höchstens Max, Max immer dabei', () => {
    const o = ort([{ utensilId: 'KH', kurzhanteln: { modus: 'verstellbar', minKg: 2.5, maxKg: 24, schrittKg: 2.5 } }]);
    expect(lastraster(o, uebung('kh_curls'))).toEqual([2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 24]);
  });

  it('Kurzhanteln als feste Paare: die Liste', () => {
    const o = ort([{ utensilId: 'KH', kurzhanteln: { modus: 'paare', gewichteKg: [12, 8, 20] } }]);
    expect(lastraster(o, uebung('kh_curls'))).toEqual([8, 12, 20]);
  });

  it('Langhantel: Stange plus alle Kombinationen der Scheibenpaare', () => {
    const o = ort([{ utensilId: 'LH', langhantel: { stangeKg: 20, scheiben: [{ kg: 5, paare: 2 }, { kg: 10, paare: 1 }] } }]);
    expect(lastraster(o, uebung('lh_kreuzheben'))).toEqual([20, 30, 40, 50, 60]);
  });

  it('Klimmzug mit Gewicht nutzt Kurzhanteln und Kettlebells', () => {
    const o = ort([
      { utensilId: 'STANGE' },
      { utensilId: 'KH', kurzhanteln: { modus: 'paare', gewichteKg: [10] } },
      { utensilId: 'KB', gewichteKg: [8, 16] },
    ]);
    expect(lastraster(o, uebung('klimmzug_gewicht'))).toEqual([8, 10, 16]);
  });

  it('Übungen ohne Last haben kein Raster', () => {
    expect(lastraster(ort([]), uebung('liegestuetz'))).toEqual([]);
  });
});

describe('Equipment und Sperren', () => {
  it('aus jeder Equipment-Gruppe ist ein Utensil nötig', () => {
    expect(uebungMoeglich(ort([{ utensilId: 'KH' }]), uebung('kh_bankdruecken'))).toBe(false);
    expect(uebungMoeglich(ort([{ utensilId: 'KH' }, { utensilId: 'SCHRAEG' }]), uebung('kh_bankdruecken'))).toBe(true);
    expect(uebungMoeglich(ort([]), uebung('liegestuetz'))).toBe(true);
  });

  it('Bandstufen in der Reihenfolge leicht bis extra schwer', () => {
    const o = ort([{ utensilId: 'BAND', bandStufen: ['schwer', 'leicht'] }]);
    expect(bandStufen(o, uebung('band_rudern'))).toEqual(['leicht', 'schwer']);
  });

  it('Sperre nach Region blockiert Muster und Übungen, sekundäre Beteiligung nicht', () => {
    const e = mitSperre('region', 'schulter');
    const jetzt = '2026-10-20T10:00:00';
    expect(istGesperrt(e, uebung('kh_schulterdruecken_sitzend'), jetzt)).toBe(true);
    expect(istGesperrt(e, uebung('kh_seitheben'), jetzt)).toBe(true);
    expect(istGesperrt(e, uebung('dips'), jetzt)).toBe(true);
    expect(istGesperrt(e, uebung('kh_bankdruecken'), jetzt)).toBe(false);
  });

  it('Unterer Rücken: Hüfte gesperrt außer den Ausnahmen', () => {
    const e = mitSperre('region', 'untererRuecken');
    const jetzt = '2026-10-20T10:00:00';
    expect(istGesperrt(e, uebung('kh_rdl'), jetzt)).toBe(true);
    expect(istGesperrt(e, uebung('glute_bridge'), jetzt)).toBe(false);
    expect(istGesperrt(e, uebung('kh_rudern_vorgebeugt'), jetzt)).toBe(true);
  });

  it('Sperre mit Enddatum gilt bis einschließlich diesem Tag', () => {
    const e = mitSperre('muster', 'Knie', '2026-10-20');
    expect(istGesperrt(e, uebung('goblet_squat'), '2026-10-20T20:00:00')).toBe(true);
    expect(istGesperrt(e, uebung('goblet_squat'), '2026-10-21T08:00:00')).toBe(false);
  });
});
