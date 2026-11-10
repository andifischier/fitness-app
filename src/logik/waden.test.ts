// Entscheidung 10.11.2026: Waden auf „sehr niedrig“ höchstens in einem Training je Woche, mit dem ganzen
// Wochenziel (höchstens 3 Sätze), ohne Erhaltungssätze. Bauch und andere Prioritäten bleiben wie bisher.
import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN, STANDARD_PRIORITAETEN, WOCHENZIEL } from '../konfiguration';
import { wocheMitPrognose } from './heute';
import { dosisProMuskel, erstelleEinheit, startfragen, wochenziele } from './planung';
import { offeneWochenabschluesse, schliesseEinheitAb, wochenabschluss } from './progression';
import { ort, zeitpunkt, zustand } from './testhilfe';
import { type AppZustand, type Einheit, type Einstellungen, type Prioritaet } from './typen';
import { uebungVon } from './verlauf';

function absolviert(z: AppZustand, e: Einheit, jetzt: string): Einheit {
  return {
    ...e, status: 'abgeschlossen', gestartetAm: jetzt, beendetAm: jetzt,
    bloecke: e.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => {
        const sek = uebungVon(z, p.uebungId)!.bereich.einheit === 'Sek.';
        const n = b.typ === 'zirkel' ? b.runden ?? 1 : p.istMaxTest ? 1 : p.saetze;
        return {
          ...p, ...(sek || p.istMaxTest || b.typ === 'zirkel' ? { feedback: 'passend' as const } : { reserve: 1.5 }),
          ergebnisse: Array.from({ length: n }, (_, i) => ({
            nr: i + 1, ...(sek ? { sek: p.zielWdh } : { wdh: p.zielWdh }),
            ...(p.last !== undefined ? { last: p.last } : {}), ...(p.bandStufe ? { bandStufe: p.bandStufe } : {}), zeit: jetzt,
          })),
        };
      }),
    })),
  };
}

// Spielt Wochen durch und liefert je Training die geplanten Sätze für Waden und Bauch.
function simuliere(waden: Prioritaet, level: Einstellungen['level'], tage: number[], wochen = 3) {
  let z = zustand({
    katalog: 'voll', orte: [ort()], maxTests: [],
    einstellungen: { ...STANDARD_EINSTELLUNGEN, level, prioritaeten: { ...STANDARD_PRIORITAETEN, Waden: waden } },
  });
  const ergebnis: { woche: number; waden: number; bauch: number; ziel: number }[] = [];
  for (let w = 0; w < wochen; w++) {
    for (const tag of tage) {
      const jetzt = zeitpunkt(w * 7 + tag, 18);
      for (const id of offeneWochenabschluesse(z, jetzt)) z = wochenabschluss(z, id);
      const f = startfragen(z, jetzt);
      const woche = wocheMitPrognose(z, jetzt, tage.length, f.ortId);
      z = { ...z, wochen: [...z.wochen.filter((x) => x.id !== woche.id), woche] };
      const e = erstelleEinheit(z, { jetzt, ortId: f.ortId, prognose: woche.prognose, morgenWieder: f.morgenWiederVorschlag, laenger: false });
      if (e.format === 'zirkel' || e.bloecke.length === 0) continue;
      const d = dosisProMuskel(z, e);
      ergebnis.push({ woche: w, waden: d.Waden, bauch: d.Bauch, ziel: wochenziele(z, woche.prognose, f.ortId, jetzt).Waden });
      z = schliesseEinheitAb(z, absolviert(z, e, jetzt), jetzt);
    }
  }
  return ergebnis;
}

describe('Waden auf „sehr niedrig“: einmal pro Woche', () => {
  for (const tage of [[0, 2, 4], [0, 1, 3, 5], [1, 5], [0, 1, 2, 3, 4]]) {
    for (const level of ['einsteiger', 'fortgeschritten', 'erfahren'] as const) {
      it(`${tage.length} Trainings, ${level}: Waden in genau einem Training je Woche mit dem ganzen Ziel`, () => {
        const r = simuliere('sehrNiedrig', level, tage);
        for (let w = 0; w < 3; w++) {
          const woche = r.filter((x) => x.woche === w);
          const mitWaden = woche.filter((x) => x.waden > 0);
          expect(mitWaden).toHaveLength(1);
          expect(mitWaden[0]!.waden).toBe(woche[0]!.ziel);
          expect(mitWaden[0]!.waden).toBeGreaterThanOrEqual(2);
          expect(mitWaden[0]!.waden).toBeLessThanOrEqual(WOCHENZIEL.einmalProWoche.maxSaetze);
        }
      });
    }
  }

  it('Wochenziel höchstens 3 Sätze bei 3 Trainings (Fortgeschritten vorher 4, Einsteiger bleibt 2)', () => {
    expect(simuliere('sehrNiedrig', 'fortgeschritten', [0, 2, 4], 1)[0]!.ziel).toBe(3);
    expect(simuliere('sehrNiedrig', 'einsteiger', [0, 2, 4], 1)[0]!.ziel).toBe(2);
  });

  it('auf „niedrig“ und für Bauch bleibt die Verteilung über die Woche', () => {
    const niedrig = simuliere('niedrig', 'fortgeschritten', [0, 2, 4], 1);
    expect(niedrig.filter((x) => x.waden > 0).length).toBeGreaterThan(1);
    const r = simuliere('sehrNiedrig', 'fortgeschritten', [0, 2, 4], 1);
    expect(r.filter((x) => x.bauch > 0).length).toBeGreaterThan(1);
  });
});
