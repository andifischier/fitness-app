// 12-Wochen-Simulation mit realistischen Schätzfehlern (Gutachten 01.11.2026, Validierungsplan; Entscheidungen
// 01.11.2026): Der simulierte Trainierende macht den letzten Satz als Messsatz und schätzt seine Reserve
// mit einem persönlichen Fehler (im Mittel 1 Wdh. zu vorsichtig, Streuung 1,45 zwischen Personen) und
// einem Fehler von Einheit zu Einheit (1 Wdh.); dazu Tagesform (2 %). Durch den echten Ablauf
// (`schliesseEinheitAb`, `wochenabschluss`, `erholungswocheAngebot`) gemessen werden Fehlalarme,
// Erkennung eines echten Einbruchs und Laststeigerungen.
import { describe, expect, it } from 'vitest';
import { MESSSATZ } from '../konfiguration';
import { isoWoche, plusTage } from './datum';
import { erholungswocheAngebot, schliesseEinheitAb, wochenabschluss } from './progression';
import { MONTAG, ort, zustand } from './testhilfe';
import type { AppZustand, Einheit, Position } from './typen';
import { e1rm, feedbackAusMesssatz, einstellungenVon } from './verlauf';

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
// Normalverteilt (Box-Muller)
const normal = (zufall: () => number) => Math.sqrt(-2 * Math.log(1 - zufall())) * Math.cos(2 * Math.PI * zufall());

const UEBUNG = 'kh_bankdruecken'; // Bereich 8 bis 12, Grundübung: Messsatz bis Reserve 2
const ORT = { ...ort(['KH', 'BANK']), equipment: [{ utensilId: 'KH', kurzhanteln: { modus: 'verstellbar' as const, minKg: 1, maxKg: 41, schrittKg: 2.5 } }, { utensilId: 'BANK' }] };
const SAETZE = 4;
const TAGE = [0, 2, 4];       // Mo, Mi, Fr
const WOCHEN = 12;

interface Ergebnis { senkungen: number[]; angebote: number[]; lasten: number[]; ersteSteigerung?: number; grenzen: number[] }

// `kraft(woche)`: echte Kraft (e1RM) als Anteil der Startkraft.
function simuliere(seed: number, kraft: (woche: number) => number): Ergebnis {
  const zufall = mulberry32(seed);
  const bias = -0.95 + 1.45 * normal(zufall);           // geschätzte minus echte Reserve, je Person
  const s0 = e1rm(16, 14, 0);
  let z: AppZustand = {
    ...zustand({ orte: [ORT], einstellungen: { prioritaeten: { ...zustand().einstellungen[0]!.prioritaeten, Brust: 'normal' } } }),
    varianten: [{ uebungId: UEBUNG, last: 16, zielWdh: 10, e1rm: e1rm(16, 10, 2), seitSteigerung: 9, schwerSerie: 0, zuletzt: plusTage(MONTAG, -3) }],
    muster: [{ muster: 'hDruck', stufe: 5, hauptvarianten: [UEBUNG] }],
  };
  const e = einstellungenVon(z);
  const erg: Ergebnis = { senkungen: [], angebote: [], lasten: [], grenzen: [] };
  let grenzeVorher: number | undefined;
  for (let w = 0; w < WOCHEN; w++) {
    const montag = plusTage(MONTAG, 7 * w);
    if (erholungswocheAngebot(z, montag) === 'leistung') erg.angebote.push(w + 1);
    for (const tag of TAGE) {
      const jetzt = plusTage(montag, tag + 18 / 24);
      const v = z.varianten.find((x) => x.uebungId === UEBUNG)!;
      const last = v.last!;
      const s = s0 * kraft(w) * (1 + 0.02 * normal(zufall));
      const kapazitaet = (k: number) => 30 * (s / last - 1) - k;      // 1 Wdh. Ermüdung je Satz
      const saetze: number[] = [];
      for (let k = 0; k < SAETZE - 1; k++) {
        const moeglich = Math.floor(kapazitaet(k));
        saetze.push(moeglich - v.zielWdh >= 1 ? v.zielWdh : Math.max(0, moeglich - 1));
      }
      // Messsatz: aufhören, wenn gefühlt noch 2 gingen; echt sind es 2 − bias (± 1 von Tag zu Tag). Angetippt
      // wird die grobe Stufe „Noch 1 bis 2“ (Entscheidung 09.11.2026).
      const echteReserve = Math.max(0, 2 - bias + normal(zufall));
      saetze.push(Math.max(0, Math.floor(kapazitaet(SAETZE - 1) - echteReserve)));
      const p: Position = {
        uebungId: UEBUNG, saetze: SAETZE, zielWdh: v.zielWdh, last, reserve: MESSSATZ.stufen.einsBisZwei,
        ergebnisse: saetze.map((wdh, i) => ({ nr: i + 1, wdh, last, zeit: jetzt })),
      };
      p.feedback = feedbackAusMesssatz(e, p);
      const einheit: Einheit = {
        id: `s${w}-${tag}`, woche: isoWoche(jetzt), erstelltAm: jetzt, gestartetAm: jetzt, status: 'abgeschlossen', ortId: ORT.id,
        fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [],
        bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [p] }],
      };
      erg.lasten.push(last);
      z = schliesseEinheitAb(z, einheit, plusTage(jetzt, 0.03));
      if (erg.ersteSteigerung === undefined && z.varianten.find((x) => x.uebungId === UEBUNG)!.last! > last) erg.ersteSteigerung = w + 1;
    }
    z = wochenabschluss(z, isoWoche(montag));
    const grenze = z.muskeln.find((m) => m.muskel === 'Brust')!.persoenlicheGrenze;
    if (grenzeVorher !== undefined && grenze < grenzeVorher) erg.senkungen.push(w + 1);
    erg.grenzen.push(grenze);
    grenzeVorher = grenze;
  }
  return erg;
}

const STARTWERTE = Array.from({ length: 40 }, (_, i) => i + 1);
const schnitt = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
const rueckschritte = (r: Ergebnis) => r.lasten.slice(1).filter((x, i) => x < r.lasten[i]!).length;
const fehlalarme = (r: Ergebnis) => r.senkungen.length + r.angebote.length;

describe('12-Wochen-Simulation mit Schätzfehlern (Messsatz)', () => {
  it('stabile Kraft: im Schnitt höchstens ein Fehlalarm (weniger Sätze oder Erholungswoche) je 12 Wochen', () => {
    const laeufe = STARTWERTE.map((seed) => simuliere(seed, () => 1));
    expect(schnitt(laeufe.map(fehlalarme))).toBeLessThanOrEqual(1);
  });

  it('stabile Kraft: kaum Lastrückschritte', () => {
    const laeufe = STARTWERTE.map((seed) => simuliere(seed, () => 1));
    expect(schnitt(laeufe.map(rueckschritte))).toBeLessThanOrEqual(0.2);
  });

  // Der Sprung von 16 auf 18,5 kg sind gut 15 %; bei 1 % Kraftzuwachs je Woche schafft der simulierte
  // Trainierende ihn mit 4 Sätzen und Reserve 1 im letzten Satz erst um Woche 10. Die App steigert im
  // Schnitt früher (Ziel danach ab U − 1), aber nicht in jedem Verlauf innerhalb von 12 Wochen.
  it('steigende Kraft (1 % je Woche): keine Senkung der Grenze, Last steigt in den meisten Verläufen, kaum Rückschritte', () => {
    const laeufe = STARTWERTE.map((seed) => simuliere(seed, (w) => 1 + 0.01 * w));
    expect(schnitt(laeufe.map((r) => r.senkungen.length))).toBeLessThanOrEqual(0.2);
    expect(schnitt(laeufe.map((r) => r.angebote.length))).toBeLessThanOrEqual(0.2);
    expect(laeufe.filter((r) => r.ersteSteigerung !== undefined).length / laeufe.length).toBeGreaterThanOrEqual(0.8);
    expect(schnitt(laeufe.map((r) => r.ersteSteigerung ?? WOCHEN + 1))).toBeLessThanOrEqual(10);
    expect(schnitt(laeufe.map(rueckschritte))).toBeLessThanOrEqual(0.2);
  });

  it('echter Einbruch (−10 % ab Woche 7): in den meisten Verläufen nach spätestens 3 Wochen erkannt', () => {
    const laeufe = STARTWERTE.map((seed) => simuliere(seed, (w) => (w >= 6 ? 0.9 : 1)));
    const erkannt = laeufe.filter((r) => [...r.senkungen, ...r.angebote].some((w) => w >= 7 && w <= 10));
    expect(erkannt.length / laeufe.length).toBeGreaterThanOrEqual(0.8);
  });
});
