import { describe, expect, it } from 'vitest';
import katalogDatei from '../../docs/katalog.json';
import { KATALOG, pruefeKatalog } from './katalog';

const kopie = () => structuredClone(katalogDatei) as unknown as typeof KATALOG;

describe('Katalog', () => {
  it('lädt den mitgelieferten Katalog vollständig', () => {
    expect(KATALOG.schemaVersion).toBe(2);
    expect(KATALOG.uebungen).toHaveLength(98);
    expect(KATALOG.utensilien).toHaveLength(14);
    expect(KATALOG.zirkel).toHaveLength(5);
    expect(new Set(KATALOG.uebungen.map((u) => u.muster)).size).toBe(13);
    expect(KATALOG.uebungen.filter((u) => u.anzahlGewichte !== undefined)).toHaveLength(33);
  });

  it('lehnt eine doppelte Übungs-ID ab', () => {
    const k = kopie();
    k.uebungen[1]!.id = k.uebungen[0]!.id;
    expect(() => pruefeKatalog(k)).toThrow(/doppelt/);
  });

  it('lehnt einen unbekannten Muskel ab', () => {
    const k = kopie() as unknown as { uebungen: { primaer: string[] }[] };
    k.uebungen[0]!.primaer = ['Nacken'];
    expect(() => pruefeKatalog(k)).toThrow(/uebungen\.0\.primaer/);
  });

  it('lehnt ein unbekanntes Utensil ab', () => {
    const k = kopie();
    k.uebungen[0]!.equipment = [['HANTELSTANGE']];
    expect(() => pruefeKatalog(k)).toThrow(/HANTELSTANGE unbekannt/);
  });

  it('lehnt eine falsche Schema-Version ab', () => {
    expect(() => pruefeKatalog({ ...kopie(), schemaVersion: 1 })).toThrow(/schemaVersion/);
  });
});
