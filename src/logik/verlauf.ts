// Gemeinsame Hilfen für Planung und Progression: Einstellungen, Verlauf der Einheiten, Erholung,
// Trainingspause, Kraftschätzung und Fälligkeit der Max-Tests. Rein und deterministisch.
import { BEWERTUNG, ERHOLUNG, MAXTEST, PROGRESSION, STANDARD_EINSTELLUNGEN, TRAININGSPAUSE } from '../konfiguration';
import { stundenZwischen } from './datum';
import { alleUebungen, uebungErlaubt } from './equipment';
import type {
  AppZustand, Einheit, Einstellungen, Feedback, MuskelZustand, MusterId, Ort, Position, Sterne, Uebung,
} from './typen';

export function einstellungenVon(z: AppZustand): Einstellungen {
  return z.einstellungen[0] ?? STANDARD_EINSTELLUNGEN;
}

// Bewertung einer Übung; ohne Bewertung gilt 3 (neutral).
export function sterneVon(e: Einstellungen, uebungId: string): Sterne {
  return e.bewertungen?.[uebungId] ?? BEWERTUNG.neutral;
}

export function uebungVon(z: AppZustand, id: string): Uebung | undefined {
  return alleUebungen(z).find((u) => u.id === id);
}

export const einheitZeit = (e: Einheit) => e.gestartetAm ?? e.erstelltAm;

// Abgeschlossene und abgebrochene Einheiten, älteste zuerst.
export function fertigeEinheiten(z: AppZustand): Einheit[] {
  return z.einheiten
    .filter((e) => e.status === 'abgeschlossen' || e.status === 'abgebrochen')
    .sort((a, b) => (einheitZeit(a) < einheitZeit(b) ? -1 : einheitZeit(a) > einheitZeit(b) ? 1 : 0));
}

export function letzteEinheitZeit(z: AppZustand): string | undefined {
  const letzte = fertigeEinheiten(z).at(-1);
  return letzte ? einheitZeit(letzte) : undefined;
}

// ---------- Erholung ----------

export function erholungsfenster(dosis: number, zuSchwer: boolean): number {
  if (dosis <= 0) return 0;
  const stunden = dosis >= ERHOLUNG.maxFenster.abSaetzen
    ? ERHOLUNG.maxFenster.stunden
    : ERHOLUNG.fenster.filter((f) => dosis > f.ueberSaetzen).at(-1)?.stunden ?? 0;
  return stunden + (zuSchwer ? ERHOLUNG.zuschlagZuSchwerStunden : 0);
}

export function istErholt(mz: MuskelZustand | undefined, jetzt: string): boolean {
  if (!mz?.letzteBelastung) return true;
  return stundenZwischen(mz.letzteBelastung, jetzt) >= erholungsfenster(mz.letzteDosis, mz.letzteSchwer);
}

// ---------- Kraftschätzung ----------

export function e1rm(last: number, wdh: number, reserve: number): number {
  return last * (1 + (wdh + reserve) / PROGRESSION.e1rmTeiler);
}

// Wiederholungen, die die Schätzung bei dieser Last und Reserve zulässt.
export function wdhBei(e1rmWert: number, last: number, reserve: number): number {
  return Math.floor(PROGRESSION.e1rmTeiler * (e1rmWert / last - 1) + 1e-6) - reserve;
}

export function reserveFuer(fb: Feedback, e: Einstellungen): number {
  const r = PROGRESSION.reserve;
  if (fb === 'passend') return e.zielReserve === '2-3' ? r.passendSchonend : r.passend;
  return r[fb];
}

export function zielReserve(e: Einstellungen): number {
  return e.zielReserve === '2-3' ? PROGRESSION.zielReserveSchonend : PROGRESSION.zielReserve;
}

export function ersterSatz(p: Position): number | undefined {
  const s = p.ergebnisse[0];
  return s ? (s.wdh ?? s.sek) : undefined;
}

// Feedback der Übung; fehlt es, gilt „zu schwer“, wenn der erste Satz das Ziel verfehlt.
export function feedbackVon(p: Position): Feedback {
  const erster = ersterSatz(p);
  return p.feedback ?? (erster !== undefined && erster < p.zielWdh ? 'schwer' : 'passend');
}

// Leistungswert einer Übung in einer Einheit: e1RM aus dem besten Satz (Last), sonst erster Satz.
export function leistungswert(e: Einstellungen, u: Uebung, p: Position): number | undefined {
  if (p.ergebnisse.length === 0) return undefined;
  if (u.lasttyp !== 'Last') return ersterSatz(p);
  const reserve = reserveFuer(feedbackVon(p), e);
  const werte = p.ergebnisse
    .map((s) => ((s.last ?? p.last) !== undefined && s.wdh !== undefined ? e1rm(s.last ?? p.last!, s.wdh, reserve) : undefined))
    .filter((w): w is number => w !== undefined);
  return werte.length > 0 ? Math.max(...werte) : undefined;
}

export interface Sitzung { zeit: string; einheit: Einheit; position: Position }

// Bisherige Sitzungen einer Variante (ohne Zirkel und Max-Tests), älteste zuerst.
export function sitzungen(z: AppZustand, uebungId: string, bis?: string): Sitzung[] {
  const liste: Sitzung[] = [];
  for (const einheit of fertigeEinheiten(z)) {
    if (bis !== undefined && einheitZeit(einheit) >= bis) continue;
    for (const b of einheit.bloecke) {
      if (b.typ === 'zirkel') continue;
      for (const p of b.positionen) {
        if (p.uebungId === uebungId && !p.istMaxTest && p.ergebnisse.length > 0) liste.push({ zeit: einheitZeit(einheit), einheit, position: p });
      }
    }
  }
  return liste;
}

// ---------- Trainingspause ----------

export interface Pause { tage: number; rueckkehr: string }

// Letzte Pause von mehr als 7 Tagen vor einer Einheit; gilt höchstens 2 Wochen nach der Rückkehr.
export function trainingspause(z: AppZustand, jetzt: string): Pause | undefined {
  const zeiten = [...fertigeEinheiten(z).map(einheitZeit).filter((t) => t < jetzt), jetzt];
  const gueltigStunden = TRAININGSPAUSE.wochenNachLangerPause * 7 * 24;
  for (let i = zeiten.length - 1; i > 0; i--) {
    const rueckkehr = zeiten[i]!;
    if (stundenZwischen(rueckkehr, jetzt) > gueltigStunden) return undefined;
    const tage = stundenZwischen(zeiten[i - 1]!, rueckkehr) / 24;
    if (tage > TRAININGSPAUSE.keineAnpassungBisTage) return { tage, rueckkehr };
  }
  return undefined;
}

// Wurde das Muster seit der Rückkehr schon trainiert?
export function seitRueckkehrTrainiert(z: AppZustand, muster: MusterId, rueckkehr: string, jetzt: string): boolean {
  return fertigeEinheiten(z).some((e) => einheitZeit(e) >= rueckkehr && einheitZeit(e) < jetzt
    && e.format !== 'zirkel'
    && e.bloecke.some((b) => b.positionen.some((p) => !p.istMaxTest && p.ergebnisse.length > 0 && uebungVon(z, p.uebungId)?.muster === muster)));
}

// ---------- Max-Tests ----------

export function letzterMaxTest(z: AppZustand, muster: MusterId) {
  return z.maxTests.filter((t) => t.muster === muster).sort((a, b) => (a.datum < b.datum ? -1 : 1)).at(-1);
}

// Fälliger Max-Test: frühestens 21 Tage (bei 1 bis 2 Einheiten 28 Tage) nach dem letzten Test des
// Musters, rotierend, mit derselben Übung wie zuletzt; ohne bisherigen Test sofort (Entscheidung).
export function faelligerMaxTest(z: AppZustand, jetzt: string, ort: Ort, prognose: number, erholungswoche: boolean,
  erlaubterMuskel: (m: Uebung['primaer'][number]) => boolean = () => true): { muster: MusterId; uebungId: string } | null {
  if (erholungswoche) return null;
  const e = einstellungenVon(z);
  const abstand = prognose <= MAXTEST.wenigeEinheitenBis ? MAXTEST.abstandTageWenigeEinheiten : MAXTEST.abstandTage;
  const faellig: { muster: MusterId; uebungId: string; datum: string; rang: number }[] = [];
  MAXTEST.rotation.forEach((muster, rang) => {
    const letzter = letzterMaxTest(z, muster);
    if (letzter && stundenZwischen(letzter.datum, jetzt) < abstand * 24) return;
    const uebungId = letzter?.uebungId ?? MAXTEST.uebungen[muster];
    const u = uebungId ? uebungVon(z, uebungId) : undefined;
    if (!u || !uebungErlaubt(e, ort, u, jetzt)) return; // am Ort nicht möglich: verschoben
    const beteiligt = [...u.primaer, ...u.sekundaer];
    if (!u.primaer.every(erlaubterMuskel)) return;
    if (!beteiligt.every((m) => istErholt(z.muskeln.find((x) => x.muskel === m), jetzt))) return;
    faellig.push({ muster, uebungId: u.id, datum: letzter?.datum ?? '', rang });
  });
  faellig.sort((a, b) => (a.datum !== b.datum ? (a.datum < b.datum ? -1 : 1) : a.rang - b.rang));
  const erster = faellig[0];
  return erster ? { muster: erster.muster, uebungId: erster.uebungId } : null;
}
