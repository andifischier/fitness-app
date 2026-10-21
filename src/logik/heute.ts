// Hilfen für die Screens Heute, Vor dem Start und Vorschau (Paket 6). Rein und deterministisch:
// Die aktuelle Zeit wird übergeben, der Zustand nur gelesen.
import { BACKUP, MAXTEST, PROFIL } from '../konfiguration';
import { isoWoche, plusTage, stundenZwischen, wocheStart, wocheVerschoben } from './datum';
import { uebungErlaubt } from './equipment';
import { istErholungswoche, mobilityZeilen, wochenziele, zirkelStation } from './planung';
import { MUSKELN, MUSTER_IDS, type AppZustand, type Einheit, type MusterId, type Muskel, type Ort, type Woche } from './typen';
import { einheitZeit, einstellungenVon, fertigeEinheiten, istErholt, letzterMaxTest, uebungVon } from './verlauf';

const leer = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;

// Woche mit der Prognose des Nutzers (Trainingstage vor dem Start oder auf Heute). Erledigtes bleibt;
// die Prognose liegt nie unter den schon erledigten Einheiten. Eine gespeicherte Antwort zur
// Erholungswoche bleibt; „15 Min länger“ wird nur ergänzt; neu gewählte Tage ersetzen die alten.
export function wocheMitPrognose(z: AppZustand, jetzt: string, prognose: number, ortId: string,
  extra: { erholungswoche?: boolean; laenger?: boolean; tage?: number[] } = {}): Woche {
  const id = isoWoche(jetzt);
  const alt = z.wochen.find((w) => w.id === id);
  const { min, max } = PROFIL.einheitenProWoche;
  const einheiten = alt?.einheiten ?? 0;
  const p = Math.min(max, Math.max(min, einheiten, Math.round(prognose)));
  const erholungswoche = alt?.erholungswoche ?? extra.erholungswoche ?? false;
  return {
    ...alt,
    id, prognose: p, einheiten, erledigt: alt?.erledigt ?? leer(),
    ziele: wochenziele(z, p, ortId, jetzt, erholungswoche),
    erholungswoche,
    laengerAngenommen: (alt?.laengerAngenommen ?? false) || (extra.laenger ?? false),
    ...(extra.tage ? { tage: [...new Set(extra.tage)].sort((a, b) => a - b) } : {}),
  };
}

// Einheit, die Heute statt der Vorschau zeigt: eine laufende, sonst eine heute erstellte, noch
// nicht gestartete Einheit (Entscheidung 21.10.2026: Zurück aus der Vorschau behält sie).
export function aktuelleEinheit(z: AppZustand, jetzt: string): Einheit | undefined {
  const laufend = z.einheiten.filter((e) => e.status === 'laufend').sort((a, b) => (einheitZeit(a) < einheitZeit(b) ? 1 : -1))[0];
  if (laufend) return laufend;
  return z.einheiten.filter((e) => e.status === 'geplant' && e.erstelltAm.slice(0, 10) === jetzt.slice(0, 10))
    .sort((a, b) => (a.erstelltAm < b.erstelltAm ? 1 : -1))[0];
}

// Nächster Max-Test am Ort: Muster, Übung und ab wann er fällig ist (Rhythmus wie `maxTestFaellig`,
// ohne Erholungsfenster). In einer Erholungswoche frühestens am nächsten Montag.
export function naechsterMaxTest(z: AppZustand, jetzt: string, ortId: string):
  { muster: MusterId; uebungId: string; ab: string } | null {
  const ort = z.orte.find((o) => o.id === ortId);
  if (!ort) return null;
  const e = einstellungenVon(z);
  const prognose = z.wochen.find((w) => w.id === isoWoche(jetzt))?.prognose ?? e.ueblicheEinheiten;
  const abstand = prognose <= MAXTEST.wenigeEinheitenBis ? MAXTEST.abstandTageWenigeEinheiten : MAXTEST.abstandTage;
  const frueheste = istErholungswoche(z, jetzt) ? wocheStart(wocheVerschoben(isoWoche(jetzt), 1)) : jetzt;
  const liste: { muster: MusterId; uebungId: string; ab: string; datum: string; rang: number }[] = [];
  MAXTEST.rotation.forEach((muster, rang) => {
    const letzter = letzterMaxTest(z, muster);
    const uebungId = letzter?.uebungId ?? MAXTEST.uebungen[muster];
    const u = uebungId ? uebungVon(z, uebungId) : undefined;
    if (!u || !uebungErlaubt(e, ort, u, jetzt)) return;
    const faellig = letzter ? plusTage(letzter.datum, abstand) : jetzt;
    liste.push({ muster, uebungId: u.id, ab: faellig > frueheste ? faellig : frueheste, datum: letzter?.datum ?? '', rang });
  });
  liste.sort((a, b) => (a.ab !== b.ab ? (a.ab < b.ab ? -1 : 1) : a.datum !== b.datum ? (a.datum < b.datum ? -1 : 1) : a.rang - b.rang));
  const erster = liste[0];
  return erster ? { muster: erster.muster, uebungId: erster.uebungId, ab: erster.ab } : null;
}

// Ist zum Zeitpunkt kein einziger Muskel erholt? Dann bleibt „Trotzdem trainieren“ leer, und die
// Vorschau nennt den Grund (Entscheidung 21.10.2026).
export function keinMuskelErholt(z: AppZustand, jetzt: string): boolean {
  return MUSKELN.every((m) => !istErholt(z.muskeln.find((x) => x.muskel === m), jetzt));
}

// Vorschlag eines Backups: jede Woche (7 Tage) seit dem letzten Backup bzw. seit der ersten Einheit.
export function backupErinnerung(z: AppZustand, jetzt: string): boolean {
  const erste = fertigeEinheiten(z)[0];
  if (!erste) return false;
  const seit = einstellungenVon(z).letztesBackup ?? einheitZeit(erste);
  return stundenZwischen(seit, jetzt) >= BACKUP.erinnerungWochen * 7 * 24;
}

// Bestzeit eines Zirkels am Ort für den Variantensatz, den er dort heute nutzen würde (Sekunden).
export function zirkelBestzeit(z: AppZustand, zirkelId: string, ortId: string, jetzt: string): number | undefined {
  const zirkel = z.katalog.zirkel.find((x) => x.id === zirkelId);
  const ort = z.orte.find((o) => o.id === ortId);
  if (!zirkel || !ort) return undefined;
  const e = einstellungenVon(z);
  const varianten = zirkel.stationen.map((s) => zirkelStation(z, e, ort, s.muster, jetzt, s.hinweis)?.id).filter((id) => id !== undefined).join();
  const zeiten = z.zirkelErgebnisse.filter((r) => r.zirkelId === zirkelId && r.ortId === ortId && r.varianten.join() === varianten)
    .map((r) => r.zeitSek);
  return zeiten.length > 0 ? Math.min(...zeiten) : undefined;
}

// Mobility nach „Ruhetag empfohlen“: die Aufwärm-Mobility aller Muster am Ort (nur Anzeige).
export function mobilityAlle(z: AppZustand, ort: Ort): string[] {
  return mobilityZeilen(z, ort, MUSTER_IDS);
}

// Vorgabe jeder Zirkel-Station als Text aus dem Katalog (z. B. „30 Sek.“, „2-4-6-8-10“), in der
// Reihenfolge der Positionen. Ausgelassene Stationen werden übersprungen.
export function zirkelVorgaben(z: AppZustand, einheit: Einheit): string[] {
  const block = einheit.bloecke.find((b) => b.typ === 'zirkel');
  const zirkel = z.katalog.zirkel.find((x) => x.id === block?.zirkelId);
  if (!block || !zirkel) return [];
  let i = 0;
  return block.positionen.map((p) => {
    const muster = uebungVon(z, p.uebungId)?.muster;
    while (i < zirkel.stationen.length && zirkel.stationen[i]!.muster !== muster) i++;
    const s = zirkel.stationen[i++];
    return s ? String(s.vorgabe) : String(p.zielWdh);
  });
}
