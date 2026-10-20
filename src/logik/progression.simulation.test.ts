// 12-Wochen-Tests laut Spezifikation („12-Wochen-Tests in TypeScript“): eigener Simulator mit festem
// Zufallsstartwert (mulberry32) und demselben Modell des Trainierenden wie docs/progression_prototyp.py.
// Geprüft werden Eigenschaften, keine exakten Zahlen.
import { describe, expect, it } from 'vitest';
import { e1rm } from './verlauf';
import { werteUebungAus } from './progression';
import { ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Feedback, Position } from './typen';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Runden wie Python (bei .5 zur geraden Zahl), damit die Satzzahlen dem Prototyp entsprechen.
const rundeWiePython = (x: number) => {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
};

const UEBUNG = 'kh_bankdruecken'; // Bereich 8 bis 12 wie im Prototyp
// Kurzhanteln in 2,5er-Schritten mit 16 kg im Raster (Start wie im Prototyp)
const ORT = { ...ort(['KH', 'BANK']), equipment: [{ utensilId: 'KH', kurzhanteln: { modus: 'verstellbar' as const, minKg: 1, maxKg: 41, schrittKg: 2.5 } }, { utensilId: 'BANK' }] };

interface Verlauf { lasten: number[]; ersteSteigerungWoche?: number }

function simuliere(frequenzen: number[], seed: number): Verlauf {
  const zufall = mulberry32(seed);
  let z: AppZustand = {
    ...zustand({ orte: [ORT] }),
    varianten: [{ uebungId: UEBUNG, last: 16, zielWdh: 8, e1rm: e1rm(16, 8, 3), seitSteigerung: 9, schwerSerie: 0 }],
  };
  let S = 24;
  let form = 1;
  let grenze = 12;
  let gleich = 0;
  let prevE: number | undefined;
  let erholungNaechste = false;
  const bewertungen: number[] = [];
  const eWochen: number[] = [];
  const verlauf: Verlauf = { lasten: [] };
  let tag = 0;

  frequenzen.forEach((freq, w) => {
    const woche = w + 1;
    const budgetZiel = ({ 1: 6, 2: 11, 3: 12, 4: 12, 5: 12, 6: 12 } as Record<number, number>)[freq]!;
    let wz = freq > 1 ? Math.min(grenze, budgetZiel) : 6;
    const ew = erholungNaechste;
    if (ew) wz = rundeWiePython(wz * 0.5);
    const spe = Math.max(2, rundeWiePython((wz / freq) * 0.75));
    let saetzeWoche = 0;
    const eWoche: number[] = [];
    for (let i = 0; i < freq; i++) {
      const v = z.varianten[0]!;
      const last = v.last!;
      const ziel = v.zielWdh;
      const maxWdh = 30 * ((S * form) / last - 1) + (zufall() * 2 - 1);
      const saetze: { wdh: number; reserve: number }[] = [];
      for (let k = 0; k < spe; k++) {
        const moeglich = Math.max(0, Math.floor(maxWdh - k));
        const gemacht = k === 0
          ? (moeglich - ziel >= 1 ? ziel : Math.max(0, moeglich - 1))
          : Math.min(saetze.at(-1)!.wdh, Math.max(0, moeglich - 1));
        saetze.push({ wdh: gemacht, reserve: moeglich - gemacht });
      }
      const erster = saetze[0]!;
      const fb: Feedback = erster.wdh < ziel ? 'schwer' : erster.reserve >= 4 ? 'leicht' : 'passend';
      const best = Math.max(...saetze.map((s) => s.wdh));
      eWoche.push(e1rm(last, best, fb === 'leicht' ? 4 : fb === 'passend' ? 2 : 1));
      const jetzt = zeitpunkt(tag++, 18);
      const p: Position = {
        uebungId: UEBUNG, saetze: spe, zielWdh: ziel, last, feedback: fb,
        ergebnisse: saetze.map((s, nr) => ({ nr: nr + 1, wdh: s.wdh, last, zeit: jetzt })),
      };
      verlauf.lasten.push(last);
      const { variante } = werteUebungAus(z, p, jetzt, ORT.id);
      if (variante.last! > last && verlauf.ersteSteigerungWoche === undefined) verlauf.ersteSteigerungWoche = woche;
      z = { ...z, varianten: [variante] };
      saetzeWoche += spe / 0.75;
    }
    // Modell des Trainierenden und Volumengrenze wie im Prototyp
    const ueber = Math.max(0, saetzeWoche - 16);
    form = Math.max(0.85, Math.min(1, form - 0.02 * ueber + 0.03));
    S += ueber === 0 ? S * 0.008 * (1 - Math.exp(-saetzeWoche / 8)) : S * 0.004;
    const bew = 3 + (ueber > 0 ? 1 : 0);
    bewertungen.push(bew);
    eWochen.push(eWoche.reduce((a, b) => a + b, 0) / eWoche.length);
    const letzte = eWochen.slice(-2);
    const eMittel = letzte.reduce((a, b) => a + b, 0) / letzte.length;
    if (saetzeWoche >= 0.8 * wz && !ew) {
      if (prevE !== undefined) {
        if (eMittel > prevE * 1.01) gleich = 0;
        else if (eMittel < prevE * 0.97 || bew >= 4) {
          grenze = Math.max(6, grenze - 2);
          gleich = 0;
        } else {
          gleich += 1;
          if (gleich >= 2 && bew <= 3) {
            grenze = Math.min(20, grenze + 2);
            gleich = 0;
          }
        }
      }
      prevE = eMittel;
    }
    const vier = bewertungen.slice(-4);
    erholungNaechste = bewertungen.length >= 4 && vier.reduce((a, b) => a + b, 0) / 4 >= 4.5;
  });
  return verlauf;
}

const rueckschritte = (l: number[]) => l.slice(1).filter((x, i) => x < l[i]!).length;
const pendelt = (l: number[]) => l.slice(2).some((x, i) => x === l[i] && l[i + 1] !== l[i]);

const SZENARIEN: Record<string, number[]> = {
  wechselnd: [3, 2, 5, 3, 4, 2, 3, 3, 5, 1, 3, 4],
  '2x': Array(12).fill(2),
  '3x': Array(12).fill(3),
  '5x': Array(12).fill(5),
};
const STARTWERTE = Array.from({ length: 50 }, (_, i) => i + 1);

describe('12-Wochen-Simulation der Progression', () => {
  for (const [name, frequenzen] of Object.entries(SZENARIEN)) {
    it(`Frequenz ${name}: kaum Lastrückschritte, erste Steigerung im Schnitt bis Woche 8, kein Pendeln`, () => {
      const verlaeufe = STARTWERTE.map((seed) => simuliere(frequenzen, seed));
      const rueck = verlaeufe.map((v) => rueckschritte(v.lasten));
      expect(rueck.reduce((a, b) => a + b, 0) / rueck.length).toBeLessThanOrEqual(0.1);
      expect(Math.max(...rueck)).toBeLessThanOrEqual(1);
      // Erste Steigerung im Schnitt spätestens in Woche 8. Auch der Prototyp liegt bei 2x in einzelnen
      // Verläufen später (mit derselben Zufallsfolge ergibt er dieselben Wochen); keiner nach Woche 10.
      const wochen = verlaeufe.map((v) => v.ersteSteigerungWoche ?? Infinity);
      expect(wochen.reduce((a, b) => a + b, 0) / wochen.length).toBeLessThanOrEqual(8);
      expect(Math.max(...wochen)).toBeLessThanOrEqual(10);
      for (const [i, v] of verlaeufe.entries()) {
        expect(pendelt(v.lasten), `Startwert ${STARTWERTE[i]}: ${v.lasten.join(', ')}`).toBe(false);
      }
    });
  }
});
