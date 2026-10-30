import { describe, expect, it } from 'vitest';
import katalogDatei from '../../docs/katalog.json';
import { aufwaermSchritt } from '../logik/aufwaermen';
import { KATALOG, pruefeKatalog } from './katalog';

const kopie = () => structuredClone(katalogDatei) as unknown as typeof KATALOG;

describe('Katalog', () => {
  it('lädt den mitgelieferten Katalog vollständig', () => {
    expect(KATALOG.schemaVersion).toBe(2);
    expect(KATALOG.uebungen).toHaveLength(100);
    expect(KATALOG.utensilien).toHaveLength(15);
    expect(KATALOG.zirkel).toHaveLength(5);
    expect(new Set(KATALOG.uebungen.map((u) => u.muster)).size).toBe(13);
    expect(KATALOG.uebungen.filter((u) => u.anzahlGewichte !== undefined)).toHaveLength(33);
  });

  it('hat für jede Übung eine Kurzanleitung und ein eigenes festes Video', () => {
    for (const u of KATALOG.uebungen) {
      expect(u.anleitung?.length, u.id).toBeGreaterThanOrEqual(3);
      for (const zeile of u.anleitung!) expect(zeile, u.id).not.toMatch(/[–—]/);
      expect(u.videoId, u.id).toMatch(/^[\w-]{11}$/);
    }
    expect(new Set(KATALOG.uebungen.map((u) => u.videoId)).size).toBe(KATALOG.uebungen.length);
  });

  it("hat für jede Aufwärmübung „So geht's“: Katalogübung oder Anleitung mit eigenem Video (Entscheidung 30.10.2026)", () => {
    const a = KATALOG.aufwaermen;
    const zeilen = [...a.allgemein.immer, ...a.allgemein.oben, ...a.allgemein.unten, ...Object.values(a.mobility).flat()]
      .map((z) => z.replace(/\s*\(nur mit [A-Z]+\)$/, ''));
    const ids = new Set(KATALOG.uebungen.map((u) => u.id));
    const videos = new Set(KATALOG.uebungen.map((u) => u.videoId));
    for (const name of new Set(zeilen.map((zeile) => aufwaermSchritt(zeile).name))) {
      const eintrag = a.anleitungen?.[name];
      expect(eintrag, name).toBeDefined();
      if (eintrag!.uebungId) expect(ids.has(eintrag!.uebungId), name).toBe(true);
      else {
        expect(eintrag!.anleitung?.length, name).toBeGreaterThanOrEqual(3);
        for (const z of eintrag!.anleitung!) expect(z, name).not.toMatch(/[–—]/);
        expect(eintrag!.videoId, name).toMatch(/^[\w-]{11}$/);
        expect(videos.has(eintrag!.videoId), name).toBe(false);
        videos.add(eintrag!.videoId);
      }
    }
  });

  it('lehnt eine unbekannte Übung im Aufwärmen ab', () => {
    const k = kopie();
    k.aufwaermen.anleitungen = { Squats: { uebungId: 'gibtsnicht' } };
    expect(() => pruefeKatalog(k)).toThrow(/Aufwärmen Squats: Übung gibtsnicht unbekannt/);
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
