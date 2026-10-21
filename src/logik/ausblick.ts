// Wochenausblick (Entscheidung 21.10.2026): Der Nutzer wählt zu Beginn der Woche seine Trainingstage,
// die App zeigt für jeden Tag die voraussichtliche Einheit mit allen Übungen. Die Einheiten werden
// nacheinander mit der echten Planung erzeugt; jede gilt danach als wie geplant geschafft (alle Sätze
// mit Ziel und Last, Feedback „passend“), damit Erholung und Wochenvolumen der Folgetage stimmen.
// Es ist eine Schätzung: Erstellt wird jede Einheit erst vor dem Start. Rein und deterministisch.
import { PROFIL } from '../konfiguration';
import { isoWoche, plusTage, wochentag } from './datum';
import { aktuelleEinheit, wocheMitPrognose } from './heute';
import { erstelleEinheit, startfragen } from './planung';
import { schliesseEinheitAb } from './progression';
import type { AppZustand, Einheit } from './typen';
import { einheitZeit, fertigeEinheiten, uebungVon } from './verlauf';

export interface AusblickTag {
  datum: string;                    // JJJJ-MM-TT
  tag: number;                      // 0 = Montag … 6 = Sonntag
  art: 'erledigt' | 'einheit' | 'zirkel' | 'ruhetag';
  einheit?: Einheit;                // erledigt: die echte Einheit, einheit: die geschätzte
}

const datumVon = (jetzt: string, tag: number) => plusTage(jetzt, tag - wochentag(jetzt)).slice(0, 10);

// Einheiten dieser Woche, die schon fertig sind (ohne Testtag).
function erledigtDieseWoche(z: AppZustand, jetzt: string): Einheit[] {
  const woche = isoWoche(jetzt);
  return fertigeEinheiten(z).filter((e) => e.woche === woche && e.format !== 'test');
}

export function heuteTrainiert(z: AppZustand, jetzt: string): boolean {
  return erledigtDieseWoche(z, jetzt).some((e) => einheitZeit(e).slice(0, 10) === jetzt.slice(0, 10));
}

// Tage, die noch anstehen: ab morgen, heute nur, solange heute noch nicht trainiert wurde.
export function offeneTage(z: AppZustand, jetzt: string, tage: readonly number[]): number[] {
  const heute = wochentag(jetzt);
  const heuteOffen = !heuteTrainiert(z, jetzt);
  return tage.filter((t) => t > heute || (t === heute && heuteOffen));
}

// Wochenprognose aus den gewählten Tagen: erledigte Einheiten plus noch anstehende Tage.
export function prognoseAusTagen(z: AppZustand, jetzt: string, tage: readonly number[]): number {
  const erledigt = z.wochen.find((w) => w.id === isoWoche(jetzt))?.einheiten ?? 0;
  const { min, max } = PROFIL.einheitenProWoche;
  return Math.min(max, Math.max(min, erledigt + offeneTage(z, jetzt, tage).length));
}

// Höchstens so viele Tage, dass die Prognose 6 nicht übersteigt.
export function maxOffeneTage(z: AppZustand, jetzt: string): number {
  const erledigt = z.wochen.find((w) => w.id === isoWoche(jetzt))?.einheiten ?? 0;
  return Math.max(0, PROFIL.einheitenProWoche.max - erledigt);
}

// Vorschlag, solange noch keine Tage gewählt sind: die Tage der Vorwoche ab heute, sonst die
// vorgeschlagene Zahl an Einheiten gleichmäßig auf die restlichen Tage verteilt (ab heute).
export function vorschlagTage(z: AppZustand, jetzt: string): number[] {
  const heute = wochentag(jetzt);
  const vorwoche = z.wochen.find((w) => w.id === isoWoche(plusTage(jetzt, -7)))?.tage?.filter((t) => t >= heute);
  if (vorwoche && vorwoche.length > 0) return vorwoche.slice(0, maxOffeneTage(z, jetzt));
  const rest = 7 - heute;
  const erledigt = z.wochen.find((w) => w.id === isoWoche(jetzt))?.einheiten ?? 0;
  const n = Math.max(1, Math.min(rest, maxOffeneTage(z, jetzt), startfragen(z, jetzt).prognoseVorschlag - erledigt));
  return Array.from({ length: n }, (_, i) => heute + Math.floor((i * rest) / n));
}

// Trägt eine geschätzte Einheit als wie geplant geschafft ein.
function alsGeschafft(z: AppZustand, einheit: Einheit, zeit: string): Einheit {
  return {
    ...einheit,
    status: 'abgeschlossen', gestartetAm: zeit,
    bloecke: einheit.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => {
        const u = uebungVon(z, p.uebungId);
        const wert = p.zielWdh > 0 ? p.zielWdh : u?.bereich.bis ?? 0;
        const inSek = u?.bereich.einheit === 'Sek.';
        return {
          ...p, feedback: 'passend' as const,
          ergebnisse: Array.from({ length: b.typ === 'zirkel' ? 0 : p.saetze }, (_, i) => ({
            nr: i + 1, ...(inSek ? { sek: wert } : { wdh: wert }),
            ...(p.last !== undefined ? { last: p.last } : {}), ...(p.bandStufe ? { bandStufe: p.bandStufe } : {}), zeit,
          })),
        };
      }),
    })),
  };
}

// Ausblick der Woche: erledigte Einheiten an ihrem Tag, dann je gewähltem, noch anstehendem Tag die
// voraussichtliche Einheit (Uhrzeit wie jetzt). Eine heute schon erstellte oder laufende Einheit
// steht für heute.
export function wochenausblick(z: AppZustand, jetzt: string, tage: readonly number[]): AusblickTag[] {
  const liste: AusblickTag[] = erledigtDieseWoche(z, jetzt).map((e) => {
    const datum = einheitZeit(e).slice(0, 10);
    return { datum, tag: wochentag(`${datum}T00:00:00`), art: 'erledigt' as const, einheit: e };
  });
  const heute = wochentag(jetzt);
  const uhrzeit = jetzt.slice(10);
  const aktuell = aktuelleEinheit(z, jetzt);
  let sim = z;
  const offen = new Set([...offeneTage(z, jetzt, tage), ...(aktuell ? [heute] : [])]);
  for (const tag of [...offen].sort((a, b) => a - b)) {
    const datum = datumVon(jetzt, tag);
    const zeit = tag === heute ? jetzt : `${datum}${uhrzeit}`;
    const fragen = startfragen(sim, zeit);
    let einheit: Einheit | undefined;
    let art: AusblickTag['art'] = 'einheit';
    if (tag === heute && aktuell) {
      einheit = aktuell;
    } else if (fragen.zirkelVorschlag) {
      art = 'zirkel';
      const zirkelId = sim.katalog.zirkel[0]?.id;
      if (zirkelId) {
        einheit = erstelleEinheit(sim, {
          jetzt: zeit, ortId: fragen.ortId, prognose: fragen.prognoseVorschlag, morgenWieder: false, laenger: false, zirkelId,
        });
      }
    } else if (fragen.ruhetagEmpfohlen) {
      art = 'ruhetag';
    } else {
      einheit = erstelleEinheit(sim, {
        jetzt: zeit, ortId: fragen.ortId, prognose: fragen.prognoseVorschlag,
        morgenWieder: fragen.morgenWiederVorschlag, laenger: false,
      });
    }
    liste.push({ datum, tag, art, ...(art === 'einheit' && einheit ? { einheit } : {}) });
    if (!einheit) continue;
    const woche = wocheMitPrognose(sim, zeit, fragen.prognoseVorschlag, einheit.ortId);
    sim = { ...sim, wochen: [...sim.wochen.filter((w) => w.id !== woche.id), woche] };
    const ende = plusTage(zeit, einheit.geschaetzteDauerMin / (24 * 60));
    sim = schliesseEinheitAb(sim, { ...alsGeschafft(sim, einheit, zeit), beendetAm: ende }, ende);
  }
  return liste.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}
