// Nur für Tests: Test-Katalog, Ort „Zuhause“ und ein einfacher Simulator, der erledigte Einheiten
// wie später `schliesseEinheitAb` in Woche und Muskeln fortschreibt.
import { KATALOG } from '../daten/katalog';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { plusTage, isoWoche } from './datum';
import { dosisProMuskel, einstellungenVon, erstelleEinheit, persoenlicheGrenze, startfragen } from './planung';
import {
  MUSKELN, type AppZustand, type Einheit, type Einstellungen, type Muskel, type MuskelZustand, type Ort, type OrtEquipment,
} from './typen';

// Test-Katalog laut Spezifikation, Abschnitt „Simulation der Use Cases“
export const TEST_IDS = [
  'kh_bankdruecken', 'kh_schraegbank', 'kh_schulterdruecken_sitzend', 'klimmzug', 'kh_rudern_einarmig',
  'goblet_squat', 'bss_kh', 'kh_rdl', 'kh_hip_thrust', 'kh_curls', 'kh_trizeps_ueberkopf', 'kh_seitheben',
  'haengendes_knieheben', 'wadenheben',
];

export const MONTAG = '2026-10-19T00:00:00';

export function zeitpunkt(tag: number, stunde: number): string {
  return `${plusTage(MONTAG, tag).slice(0, 10)}T${String(stunde).padStart(2, '0')}:00:00`;
}

export function ort(utensilien: string[] = ['KH', 'SCHRAEG', 'STANGE', 'BAND', 'ANKER', 'TISCH', 'ERH'], id = 'zuhause'): Ort {
  const equipment: OrtEquipment[] = utensilien.map((utensilId) => {
    if (utensilId === 'KH') return { utensilId, kurzhanteln: { modus: 'verstellbar', minKg: 2, maxKg: 24, schrittKg: 2 } };
    if (utensilId === 'BAND' || utensilId === 'MINI') return { utensilId, bandStufen: ['leicht', 'mittel', 'schwer', 'extraSchwer'] };
    if (utensilId === 'KB') return { utensilId, gewichteKg: [8, 12, 16] };
    return { utensilId };
  });
  return { id, name: id, standard: id === 'zuhause', equipment };
}

export function zustand(opt: { katalog?: 'test' | 'voll'; einstellungen?: Partial<Einstellungen>; orte?: Ort[] } = {}): AppZustand {
  const uebungen = opt.katalog === 'voll' ? KATALOG.uebungen : KATALOG.uebungen.filter((u) => TEST_IDS.includes(u.id));
  return {
    katalog: { ...KATALOG, uebungen },
    einstellungen: [{ ...STANDARD_EINSTELLUNGEN, ...opt.einstellungen }],
    orte: opt.orte ?? [ort()],
    eigeneUebungen: [], eigeneUtensilien: [], varianten: [], muster: [], muskeln: [],
    wochen: [], zyklen: [], einheiten: [], zirkelErgebnisse: [], maxTests: [],
  };
}

const null10 = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;

// Setzt die Wochenprognose, wie es die App nach der Frage „Wie oft schaffst du es diese Woche?“ tut.
export function setzePrognose(z: AppZustand, jetzt: string, prognose: number): AppZustand {
  const id = isoWoche(jetzt);
  const alt = z.wochen.find((w) => w.id === id);
  const woche = alt ? { ...alt, prognose } : {
    id, prognose, einheiten: 0, ziele: null10(), erledigt: null10(), erholungswoche: false, laengerAngenommen: false,
  };
  return { ...z, wochen: [...z.wochen.filter((w) => w.id !== id), woche] };
}

// Schreibt eine durchgeführte Einheit fort (alle geplanten Sätze erledigt).
export function absolviere(z: AppZustand, einheit: Einheit, jetzt: string, zuSchwer: Muskel[] = []): AppZustand {
  const dosis = dosisProMuskel(z, einheit);
  const z2 = setzePrognose(z, jetzt, z.wochen.find((w) => w.id === isoWoche(jetzt))?.prognose ?? 1);
  const woche = z2.wochen.find((w) => w.id === isoWoche(jetzt))!;
  const erledigt = { ...woche.erledigt };
  for (const m of MUSKELN) erledigt[m] += dosis[m];
  const neueWoche = {
    ...woche, einheiten: woche.einheiten + 1, erledigt, prognose: Math.max(woche.prognose, woche.einheiten + 1),
  };
  const e = einstellungenVon(z);
  const muskeln: MuskelZustand[] = MUSKELN.map((m) => {
    const alt = z.muskeln.find((x) => x.muskel === m) ?? {
      muskel: m, letzteDosis: 0, letzteSchwer: false, persoenlicheGrenze: persoenlicheGrenze(z, e, m), gleichWochen: 0, leistung: [],
    };
    if (dosis[m] <= 0) return alt;
    return { ...alt, letzteBelastung: jetzt, letzteDosis: dosis[m], letzteSchwer: zuSchwer.includes(m) };
  });
  return {
    ...z2,
    wochen: z2.wochen.map((w) => (w.id === neueWoche.id ? neueWoche : w)),
    muskeln,
    einheiten: [...z.einheiten, { ...einheit, status: 'abgeschlossen', gestartetAm: jetzt }],
  };
}

export interface Termin { tag: number; stunde: number; morgenWieder?: boolean; prognose?: number }

// Spielt eine Woche durch wie der Prototyp; liefert Zustand und erzeugte Einheiten.
export function simuliereWoche(z0: AppZustand, prognose: number, termine: Termin[]) {
  let z = setzePrognose(z0, zeitpunkt(termine[0]!.tag, termine[0]!.stunde), prognose);
  const einheiten: Einheit[] = [];
  for (const t of termine) {
    const jetzt = zeitpunkt(t.tag, t.stunde);
    if (t.prognose !== undefined) z = setzePrognose(z, jetzt, t.prognose);
    const fragen = startfragen(z, jetzt);
    const woche = z.wochen.find((w) => w.id === isoWoche(jetzt))!;
    const einheit = erstelleEinheit(z, {
      jetzt, ortId: fragen.ortId, prognose: woche.prognose,
      morgenWieder: t.morgenWieder ?? fragen.morgenWiederVorschlag, laenger: false,
    });
    einheiten.push(einheit);
    z = absolviere(z, einheit, jetzt);
  }
  return { z, einheiten, erledigt: z.wochen.find((w) => w.id === isoWoche(zeitpunkt(termine[0]!.tag, 0)))!.erledigt };
}
