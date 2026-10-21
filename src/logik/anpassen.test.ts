import { describe, expect, it } from 'vitest';
import { WORKOUT } from '../konfiguration';
import { entferneUebung, fuegeUebungHinzu, hinzufuegbar, kannAnpassen, setzeSaetze } from './anpassen';
import { erstelleEinheit } from './planung';
import { zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit } from './typen';

const MO = zeitpunkt(0, 18);
const plane = (z: AppZustand, klassisch = false) =>
  erstelleEinheit(z, { jetzt: MO, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, klassisch });
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
const saetze = (e: Einheit) => e.bloecke.reduce((s, b) => s + b.positionen.reduce((t, p) => t + p.saetze, 0), 0);

describe('Erstellte Einheit anpassen', () => {
  it('geht nur vor dem Start und nicht im Zirkel', () => {
    const z = zustand({ katalog: 'voll' });
    const e = plane(z);
    expect(kannAnpassen(e)).toBe(true);
    expect(kannAnpassen({ ...e, status: 'laufend' })).toBe(false);
    expect(kannAnpassen({ ...e, format: 'zirkel' })).toBe(false);
    expect(() => setzeSaetze(z, { ...e, status: 'laufend' }, 0, 0, 2)).toThrow();
  });

  it('Sätze ändern: in Grenzen, Dauer passt sich an', () => {
    const z = zustand({ katalog: 'voll' });
    const e = plane(z, true);
    const mehr = setzeSaetze(z, e, 0, 0, 99);
    expect(mehr.bloecke[0]!.positionen[0]!.saetze).toBe(WORKOUT.saetze.max);
    expect(mehr.geschaetzteDauerMin).toBeGreaterThan(e.geschaetzteDauerMin);
    expect(setzeSaetze(z, e, 0, 0, 0).bloecke[0]!.positionen[0]!.saetze).toBe(WORKOUT.saetze.min);
    expect(e.bloecke[0]!.positionen[0]!.saetze).not.toBe(WORKOUT.saetze.max);
  });

  it('Entfernen: leere Runden fallen weg, eine Kombi-Runde mit einer Übung wird einzeln', () => {
    const z = zustand({ katalog: 'voll' });
    const e = plane(z);
    const bi = e.bloecke.findIndex((b) => b.typ === 'supersatz' && b.positionen.length === 2);
    expect(bi).toBeGreaterThanOrEqual(0);
    const rest = e.bloecke[bi]!.positionen[1]!.uebungId;
    const neu = entferneUebung(z, e, bi, 0);
    expect(neu.bloecke[bi]).toMatchObject({ typ: 'einzeln', positionen: [{ uebungId: rest }] });
    expect(saetze(neu)).toBe(saetze(e) - e.bloecke[bi]!.positionen[0]!.saetze);
    let leer = e;
    while (leer.bloecke.length > 0) leer = entferneUebung(z, leer, 0, 0);
    expect(leer).toMatchObject({ bloecke: [], format: 'klassisch', geschaetzteDauerMin: 0 });
  });

  it('Hinzufügen: nur am Ort mögliche, neue Übungen, am Ende mit 3 Sätzen und Ziel', () => {
    const z = zustand({ katalog: 'voll' });
    const e = plane(z);
    const moeglich = hinzufuegbar(z, e);
    expect(moeglich.some((u) => ids(e).includes(u.id))).toBe(false);
    expect(moeglich.some((u) => u.id === 'lh_bankdruecken')).toBe(false);
    const neu = fuegeUebungHinzu(z, e, 'hammer_curls');
    expect(neu.bloecke.at(-1)).toMatchObject({ typ: 'einzeln', positionen: [{ uebungId: 'hammer_curls', saetze: WORKOUT.saetze.standard, last: 2 }] });
    expect(neu.geschaetzteDauerMin).toBeGreaterThan(e.geschaetzteDauerMin);
    expect(() => fuegeUebungHinzu(z, neu, 'hammer_curls')).toThrow();
    expect(() => fuegeUebungHinzu(z, e, 'lh_bankdruecken')).toThrow();
  });
});
