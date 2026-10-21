import { describe, expect, it } from 'vitest';
import { KATALOG } from '../daten/katalog';
import { abText, datumLang, lastText, muskelgruppenText, saetzeText, zeitText } from './texte';

const u = (id: string) => KATALOG.uebungen.find((x) => x.id === id)!;

describe('Lastanzeige', () => {
  it('zeigt Last je nach Gerät und Zahl der Hanteln', () => {
    expect(lastText(u('kh_bankdruecken'), { last: 16 })).toBe('16 kg je Hand');
    expect(lastText(u('goblet_squat'), { last: 12.5 })).toBe('12,5 kg');
    expect(lastText(u('lh_kreuzheben'), { last: 40 })).toBe('40 kg gesamt');
    expect(lastText(u('klimmzug_gewicht'), { last: 8 })).toBe('+8 kg');
  });

  it('zeigt Bänder, unterstützende Bänder und nichts bei Körpergewicht', () => {
    const band = KATALOG.uebungen.find((x) => x.lasttyp === 'Band' && !x.unterstuetzend)!;
    expect(lastText(band, { bandStufe: 'schwer' })).toBe('Band schwer');
    expect(lastText(u('klimmzug_band'), { bandStufe: 'mittel' })).toBe('Unterstützung: Band mittel');
    expect(lastText(u('liegestuetz'), {})).toBeUndefined();
  });
});

describe('Datum und Zahlen', () => {
  it('schreibt das Datum aus', () => {
    expect(datumLang('2026-10-20T18:30:00')).toBe('Dienstag, 20. Oktober');
    expect(datumLang('2026-03-01T08:00:00')).toBe('Sonntag, 1. März');
  });

  it('nennt den Fälligkeitstag', () => {
    const jetzt = '2026-10-20T18:00:00';
    expect(abText('2026-10-20T09:00:00', jetzt)).toBe('ab heute');
    expect(abText('2026-10-19T09:00:00', jetzt)).toBe('ab heute');
    expect(abText('2026-10-21T09:00:00', jetzt)).toBe('ab morgen');
    expect(abText('2026-10-22T09:00:00', jetzt)).toBe('ab Donnerstag');
    expect(abText('2026-11-12T09:00:00', jetzt)).toBe('ab 12.11.');
  });

  it('formatiert Zeiten und Sätze mit Dezimalkomma', () => {
    expect(zeitText(725)).toBe('12:05');
    expect(saetzeText(4.5)).toBe('4,5');
    expect(saetzeText(4.24)).toBe('4');
  });

  it('fasst Muskeln zu Gruppen zusammen', () => {
    expect(muskelgruppenText(['Bizeps', 'Quadrizeps', 'Brust', 'Ruecken', 'Waden'])).toBe('Brust, Rücken, Arme, Beine');
  });
});
