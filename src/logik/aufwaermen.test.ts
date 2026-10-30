import { describe, expect, it } from 'vitest';
import { KATALOG } from '../daten/katalog';
import { aufwaermSchritt, aufwaermTechnik } from './aufwaermen';
import { zustand } from './testhilfe';

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
      if (s.sek !== undefined) expect(s.name).toMatch(/Stretch/);
      else expect(s.wdh).toBeGreaterThan(0);
    }
  });
});

describe("So geht's beim Aufwärmen (Entscheidung 30.10.2026)", () => {
  const z = zustand({ katalog: 'voll' });

  it('zeigt beim Aufwärmsatz die Übung selbst', () => {
    expect(aufwaermTechnik(z, { uebungId: 'goblet_squat', vorgabe: '8 Wdh. Goblet Squat: 8 kg' }).id).toBe('goblet_squat');
  });

  it('verweist auf die Katalogübung oder liefert Anleitung und Video', () => {
    expect(aufwaermTechnik(z, { uebungId: '', vorgabe: '50 Jumping Jacks' }).id).toBe('hampelmann');
    const katze = aufwaermTechnik(z, { uebungId: '', vorgabe: '8 Cat-Cow' });
    expect(katze).toMatchObject({ name: 'Cat-Cow', videoId: '5KYLaU6Lg2E' });
    expect(katze.anleitung).toHaveLength(3);
    expect(aufwaermTechnik(z, { uebungId: '', vorgabe: '30 Sek. Kneeling Hip Flexor Stretch je Seite' }).videoId).toBe('UU7Nqd_Dric');
  });

  it('ohne Eintrag bleibt die YouTube-Suche', () => {
    const t = aufwaermTechnik(z, { uebungId: '', vorgabe: '10 Unbekannt' });
    expect(t.videoId).toBeUndefined();
    expect(t.youtubeUrl).toContain('Unbekannt');
  });
});
