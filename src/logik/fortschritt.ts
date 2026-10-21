// Hilfen für Fortschritt und Verlauf (Paket 9, Mockup 8): Max-Test-Verlauf, Sätze pro Woche je
// Muskel mit Entlastungswochen, Zirkel-Bestzeiten und die Liste aller Einheiten. Rein und
// deterministisch: Die aktuelle Zeit wird übergeben, der Zustand nur gelesen.
import { FORTSCHRITT, MAXTEST } from '../konfiguration';
import { isoWoche, stundenZwischen, wocheVerschoben } from './datum';
import { startfragen, wochenziele } from './planung';
import { istEntlastung } from './progression';
import {
  MUSKELN, type AppZustand, type Einheit, type Feedback, type MaxTest, type Muskel, type MusterId, type Position,
} from './typen';
import { feedbackVon, fertigeEinheiten } from './verlauf';

// ---------- Max-Tests ----------

export interface MaxTestReihe {
  muster: MusterId; uebungId: string; einheit: MaxTest['einheit'];
  punkte: { datum: string; wert: number }[];    // älteste zuerst
  seitStart: number;                            // letzter minus erster Test
}

// Max-Test-Verlauf je Muster und Übung (nur gleiche Übungen sind vergleichbar), in der Reihenfolge
// der Rotation; Muster außerhalb der Rotation danach.
export function maxTestReihen(z: AppZustand): MaxTestReihe[] {
  const gruppen = new Map<string, MaxTest[]>();
  for (const t of z.maxTests) {
    const schluessel = `${t.muster}|${t.uebungId}`;
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), t]);
  }
  const rang = (m: MusterId) => {
    const i = MAXTEST.rotation.indexOf(m);
    return i < 0 ? MAXTEST.rotation.length : i;
  };
  return [...gruppen.values()].map((tests) => {
    const sortiert = [...tests].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
    const erster = sortiert[0]!;
    return {
      muster: erster.muster, uebungId: erster.uebungId, einheit: sortiert.at(-1)!.einheit,
      punkte: sortiert.map((t) => ({ datum: t.datum, wert: t.ergebnis })),
      seitStart: sortiert.at(-1)!.ergebnis - erster.ergebnis,
    };
  }).sort((a, b) => rang(a.muster) - rang(b.muster)
    || (a.punkte[0]!.datum < b.punkte[0]!.datum ? -1 : a.punkte[0]!.datum > b.punkte[0]!.datum ? 1 : 0));
}

// ---------- Sätze pro Woche ----------

const leer = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;

// Wochenziele der laufenden Woche, wie Heute sie zeigt: Prognose der Woche, sonst der Vorschlag
// der Startfragen, am Standardort. Ohne Ort gelten die gespeicherten Ziele der Woche.
export function zieleDieseWoche(z: AppZustand, jetzt: string): Record<Muskel, number> {
  const woche = z.wochen.find((w) => w.id === isoWoche(jetzt));
  const ort = z.orte.find((o) => o.standard) ?? z.orte[0];
  if (!ort) return woche?.ziele ?? leer();
  return wochenziele(z, woche?.prognose ?? startfragen(z, jetzt).prognoseVorschlag, ort.id, jetzt);
}

export interface WochenBalken {
  woche: string; einheiten: number; erledigt: Record<Muskel, number>;
  aktuell: boolean; erholungswoche: boolean;
  entlastung: boolean;                          // nur für abgeschlossene Wochen
}

export interface Wochenvolumen { wochen: WochenBalken[]; ziele: Record<Muskel, number>; muskeln: Muskel[] }

// Die letzten 6 Wochen bis zur laufenden, frühestens ab der ersten gespeicherten Woche. Gezeigt
// werden Muskeln mit Ziel oder mit erledigten Sätzen in diesen Wochen. Ohne gespeicherte Woche null.
export function wochenvolumen(z: AppZustand, jetzt: string): Wochenvolumen | null {
  const erste = z.wochen.map((w) => w.id).sort()[0];
  if (!erste) return null;
  const aktuell = isoWoche(jetzt);
  const ids = Array.from({ length: FORTSCHRITT.wochen }, (_, i) => wocheVerschoben(aktuell, i - FORTSCHRITT.wochen + 1))
    .filter((id) => id >= erste);
  const wochen = ids.map((id): WochenBalken => {
    const w = z.wochen.find((x) => x.id === id);
    return {
      woche: id, einheiten: w?.einheiten ?? 0, erledigt: w?.erledigt ?? leer(),
      aktuell: id === aktuell, erholungswoche: w?.erholungswoche ?? false,
      entlastung: id !== aktuell && istEntlastung(z, id),
    };
  });
  const ziele = zieleDieseWoche(z, jetzt);
  const muskeln = MUSKELN.filter((m) => ziele[m] > 0 || wochen.some((w) => w.erledigt[m] > 0));
  return { wochen, ziele, muskeln };
}

// ---------- Zirkel-Bestzeiten ----------

export interface ZirkelBestzeit {
  zirkelId: string; ortId: string; varianten: string[]; zeitSek: number; datum: string;
  abweichend: string[];   // Übungen, die andere Bestzeiten desselben Zirkels am selben Ort nicht haben
}

// Bestzeit je Zirkel, Ort und Variantensatz (Entscheidung 21.10.2026: eine Zeile je
// Übungsauswahl). Reihenfolge: Zirkel wie im Katalog, dann Ort, dann ältere Bestzeit zuerst.
export function zirkelBestzeiten(z: AppZustand): ZirkelBestzeit[] {
  const beste = new Map<string, ZirkelBestzeit>();
  for (const r of z.zirkelErgebnisse) {
    const schluessel = `${r.zirkelId}|${r.ortId}|${r.varianten.join()}`;
    const bisher = beste.get(schluessel);
    if (!bisher || r.zeitSek < bisher.zeitSek || (r.zeitSek === bisher.zeitSek && r.datum < bisher.datum)) {
      beste.set(schluessel, { zirkelId: r.zirkelId, ortId: r.ortId, varianten: r.varianten, zeitSek: r.zeitSek, datum: r.datum, abweichend: [] });
    }
  }
  const liste = [...beste.values()];
  for (const b of liste) {
    const andere = liste.filter((x) => x !== b && x.zirkelId === b.zirkelId && x.ortId === b.ortId);
    b.abweichend = andere.length === 0 ? [] : [...new Set(b.varianten.filter((v) => andere.some((x) => !x.varianten.includes(v))))];
  }
  const zirkelRang = (id: string) => {
    const i = z.katalog.zirkel.findIndex((x) => x.id === id);
    return i < 0 ? z.katalog.zirkel.length : i;
  };
  const ortName = (id: string) => z.orte.find((o) => o.id === id)?.name ?? '';
  return liste.sort((a, b) => zirkelRang(a.zirkelId) - zirkelRang(b.zirkelId)
    || ortName(a.ortId).localeCompare(ortName(b.ortId), 'de')
    || (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

// ---------- Verlauf ----------

// Alle beendeten Einheiten (auch abgebrochene und der Testtag), neueste zuerst.
export function verlauf(z: AppZustand): Einheit[] {
  return fertigeEinheiten(z).reverse();
}

// Dauer einer Einheit in Sekunden (Start bis Ende), sonst undefined.
export function dauerSek(e: Einheit): number | undefined {
  if (!e.gestartetAm || !e.beendetAm) return undefined;
  return Math.max(0, Math.round(stundenZwischen(e.gestartetAm, e.beendetAm) * 3600));
}

export function saetzeVon(e: Einheit): number {
  return e.bloecke.reduce((n, b) => n + b.positionen.reduce((m, p) => m + p.ergebnisse.length, 0), 0);
}

export interface VerlaufUebung {
  position: Position; zirkel: boolean;
  feedback?: Feedback;    // nicht bei Max-Tests und Zirkel-Stationen
}

// Übungen einer Einheit mit mindestens einem Satz, in der Reihenfolge des Trainings. Das Feedback
// ist das gespeicherte; fehlt es, gilt dieselbe Regel wie in der Progression.
export function verlaufUebungen(e: Einheit): VerlaufUebung[] {
  return e.bloecke.flatMap((b) => b.positionen.filter((p) => p.ergebnisse.length > 0).map((p) => {
    const zirkel = b.typ === 'zirkel';
    return { position: p, zirkel, ...(zirkel || p.istMaxTest ? {} : { feedback: feedbackVon(p) }) };
  }));
}

// ---------- Diagramm ----------

// Achse für den Max-Test-Verlauf: runde, ganzzahlige Schrittweite (1, 2, 5, 10 …) mit 2 bis 4 Linien, die alle
// Werte einschließen.
export function achse(werte: number[]): { min: number; max: number; linien: number[] } {
  const lo = Math.min(...werte);
  const hi = Math.max(...werte);
  const spanne = Math.max(hi - lo, 1);
  const basis = Math.max(1, 10 ** Math.floor(Math.log10(spanne / 2)));   // ganze Zahlen (Wdh., Sek.)
  const schritt = [1, 2, 5, 10].map((f) => f * basis).find((s) => spanne / s <= 2) ?? 10 * basis;
  let min = Math.floor(lo / schritt) * schritt;
  let max = Math.ceil(hi / schritt) * schritt;
  if (max === min) max = min + schritt;
  if (min < 0 && lo >= 0) min = 0;
  const linien: number[] = [];
  for (let w = min; w <= max + 1e-9; w += schritt) linien.push(Math.round(w * 1e6) / 1e6);
  return { min, max, linien };
}
