import { describe, expect, it } from 'vitest';
import { KATALOG } from '../daten/katalog';
import { aufwaermSchritt } from './aufwaermen';

describe('Aufwärmen Schritt für Schritt (Entscheidung 29.10.2026)', () => {
  it('gezählte Übungen: Anzahl und Name', () => {
    expect(aufwaermSchritt('50 Hampelmann')).toEqual({ name: 'Hampelmann', wdh: 50 });
    expect(aufwaermSchritt('10 Beinpendel je Bein')).toEqual({ name: 'Beinpendel', wdh: 10, je: 'je Bein' });
    expect(aufwaermSchritt('10 Armkreisen je Richtung')).toEqual({ name: 'Armkreisen', wdh: 10, je: 'je Richtung' });
  });

  it('Halteübungen mit Sekunden', () => {
    expect(aufwaermSchritt('30 Sek. Hüftbeuger-Dehnung kniend je Seite'))
      .toEqual({ name: 'Hüftbeuger-Dehnung kniend', sek: 30, je: 'je Seite' });
  });

  it('Aufwärmsatz mit Gewicht bzw. Hinweis', () => {
    expect(aufwaermSchritt('8 Wdh. Goblet Squat: 8 kg')).toEqual({ name: 'Goblet Squat', wdh: 8, last: '8 kg' });
    expect(aufwaermSchritt('8 Wdh. Liegestütz: leichtere Variante')).toEqual({ name: 'Liegestütz', wdh: 8, last: 'leichtere Variante' });
  });

  it('Zeile ohne Zahl bleibt nur Name', () => {
    expect(aufwaermSchritt('Locker gehen')).toEqual({ name: 'Locker gehen' });
  });

  it('im Katalog haben nur Halteübungen eine Zeitangabe, alles andere wird gezählt', () => {
    const a = KATALOG.aufwaermen;
    const zeilen = [...a.allgemein.immer, ...a.allgemein.oben, ...a.allgemein.unten, ...Object.values(a.mobility).flat()]
      .map((z) => z.replace(/\s*\(nur mit [A-Z]+\)$/, ''));
    for (const z of zeilen) {
      const s = aufwaermSchritt(z);
      if (s.sek !== undefined) expect(s.name).toMatch(/Dehnung/);
      else expect(s.wdh).toBeGreaterThan(0);
    }
  });
});
