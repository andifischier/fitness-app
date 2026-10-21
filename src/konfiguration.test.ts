import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN, TESTTAG, ZEITBUDGET } from './konfiguration';
import { einstellungenSchema } from './daten/schemas';
import { KATALOG } from './daten/katalog';

describe('Konfiguration', () => {
  it('Standard-Einstellungen sind gültig', () => {
    expect(einstellungenSchema.safeParse(STANDARD_EINSTELLUNGEN).success).toBe(true);
  });

  it('mittlere Satzdauer passt zur Spezifikation (rund 123 bzw. 75 Sek.)', () => {
    const { grund, isolation, supersatz } = STANDARD_EINSTELLUNGEN.pausenSek;
    const arbeit = ZEITBUDGET.satzArbeitSek;
    const klassisch = arbeit + ZEITBUDGET.anteilGrundpause * grund + ZEITBUDGET.anteilIsolationspause * isolation;
    expect(Math.round(klassisch)).toBe(123);
    expect(Math.round((2 * arbeit + supersatz) / 2)).toBe(75);
  });

  it('Startvarianten des Testtags stehen im Katalog', () => {
    const ids = new Set(KATALOG.uebungen.map((u) => u.id));
    const varianten = [TESTTAG.hDruck, TESTTAG.vZug, TESTTAG.Knie, TESTTAG.Rumpf].flatMap((t) => t.varianten);
    for (const id of [...varianten, TESTTAG.Knie.ersatzOhneLast]) expect(ids.has(id), id).toBe(true);
  });
});
