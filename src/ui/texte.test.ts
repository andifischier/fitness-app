import { describe, expect, it } from 'vitest';
import { KATALOG } from '../daten/katalog';
import { zustand } from '../logik/testhilfe';
import type { Einheit } from '../logik/typen';
import {
  abText, datumLang, feedbackOptionen, lastTeile, lastText, muskelgruppenText, naechstesMalText, rekordZeile, saetzeText, zeitText,
} from './texte';

const u = (id: string) => KATALOG.uebungen.find((x) => x.id === id)!;

describe('Lastanzeige', () => {
  it('teilt die Last fürs Training in Zahl und Zusatz', () => {
    expect(lastTeile(u('kh_bankdruecken'), { last: 16 })).toEqual({ titel: 'Gewicht', gross: '16 kg', klein: 'je Hand' });
    expect(lastTeile(u('goblet_squat'), { last: 12.5 })).toEqual({ titel: 'Gewicht', gross: '12,5 kg' });
    expect(lastTeile(u('klimmzug_gewicht'), { last: 8 })).toEqual({ titel: 'Gewicht', gross: '+8 kg', klein: 'zusätzlich' });
    expect(lastTeile(u('klimmzug_band'), { bandStufe: 'mittel' })).toEqual({ titel: 'Band', gross: 'mittel', klein: 'zur Unterstützung' });
    expect(lastTeile(u('liegestuetz'), {})).toBeUndefined();
  });

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

describe('Übungsfeedback und Abschluss', () => {
  it('erklärt die Buttons bei Halteübungen in Sekunden', () => {
    expect(feedbackOptionen(false).map((o) => o.text)[1]).toBe('1 bis 3 Wiederholungen wären noch gegangen');
    expect(feedbackOptionen(true).map((o) => o.text)).toEqual([
      'Mehr als 10 Sekunden wären noch gegangen', 'Bis 10 Sekunden wären noch gegangen', 'Ziel nicht geschafft oder Haltung brach ein',
    ]);
  });

  it('beschreibt die nächste Einheit', () => {
    const basis = { neueVariante: false, kalibrierung: false };
    expect(naechstesMalText(u('kh_bankdruecken'), { ...basis, uebungId: 'kh_bankdruecken', zielWdh: 11, last: 16 }))
      .toBe('Nächstes Mal: 16 kg je Hand, Ziel 11 im ersten Satz.');
    expect(naechstesMalText(u('plank'), { ...basis, uebungId: 'plank', zielWdh: 45 })).toBe('Nächstes Mal: Ziel 45 Sek. im ersten Satz.');
    expect(naechstesMalText(u('liegestuetz'), { ...basis, uebungId: 'liegestuetz', zielWdh: 8, langsam: true }))
      .toBe('Nächstes Mal: Ziel 8 im ersten Satz. 3 Sek. absenken.');
    expect(naechstesMalText(u('klimmzug'), { ...basis, uebungId: 'klimmzug', zielWdh: 5, neueVariante: true }))
      .toBe(`Nächstes Mal: ${u('klimmzug').name}, Ziel 5 im ersten Satz.`);
    expect(naechstesMalText(u('goblet_squat'), { ...basis, uebungId: 'goblet_squat', zielWdh: 8, neueVariante: true, kalibrierung: true }))
      .toBe(`Nächstes Mal: ${u('goblet_squat').name}, das Gewicht wählst du im ersten Satz.`);
  });

  it('zeigt Rekorde mit dem besten Satz', () => {
    const z = zustand();
    const e = {
      bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId: 'kh_rudern_einarmig', saetze: 2, zielWdh: 10, last: 18,
        ergebnisse: [{ nr: 1, wdh: 10, zeit: '' }, { nr: 2, wdh: 12, last: 16, zeit: '' }] }] }],
    } as unknown as Einheit;
    expect(rekordZeile(z, e, { art: 'kraft', uebungId: 'kh_rudern_einarmig', wert: 25, bisher: 24 }))
      .toEqual({ name: u('kh_rudern_einarmig').name, wert: '18 kg × 10' });
    expect(rekordZeile(z, e, { art: 'maxTest', uebungId: 'klimmzug', wert: 9, bisher: 8 }).wert).toBe('Max-Test 9 Wdh.');
    expect(rekordZeile(z, e, { art: 'sekunden', uebungId: 'plank', wert: 50, bisher: 45 }).wert).toBe('50 Sek.');
  });
});
