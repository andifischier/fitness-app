// Schreibzugriffe der Screens Einstellungen und Übungen. Jede Änderung läuft in einer Transaktion;
// Löschen prüft dort noch einmal, dass der Eintrag nie genutzt wurde.
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { grenzenNachPrioritaeten, mitSternen, ohneUebung, ortGenutzt, uebungGenutzt, utensilGenutzt } from '../logik/einstellungen';
import { prognoseAusTagen } from '../logik/ausblick';
import { loescheEinheit } from '../logik/loeschen';
import { wocheMitPrognose } from '../logik/heute';
import { beende, erledigteSaetze, starte } from '../logik/player';
import {
  neueRekorde, offeneWochenabschluesse, schliesseEinheitAb, uebernimmBewertungen, wochenabschluss, type Rekord,
} from '../logik/progression';
import { schliesseTesttagAb } from '../logik/testtag';
import type { Einheit, Einstellungen, Ort, Sterne, Uebung, Utensil } from '../logik/typen';
import { db, EINSTELLUNGEN_SCHLUESSEL, ladeZustand, TABELLEN, type FitnessDb } from './db';

export async function ladeEinstellungen(d: FitnessDb = db): Promise<Einstellungen> {
  return (await d.einstellungen.get(EINSTELLUNGEN_SCHLUESSEL)) ?? STANDARD_EINSTELLUNGEN;
}

// Liest die aktuellen Einstellungen, ändert sie und speichert sie in einem Schritt.
export async function aendereEinstellungen(
  aenderung: (e: Einstellungen) => Einstellungen, d: FitnessDb = db,
): Promise<void> {
  await d.transaction('rw', d.einstellungen, async () => {
    await d.einstellungen.put(aenderung(await ladeEinstellungen(d)), EINSTELLUNGEN_SCHLUESSEL);
  });
}

// Neue Muskelprioritäten; die persönlichen Grenzen der geänderten Muskeln ziehen mit (Entscheidung 29.10.2026).
export async function speicherePrioritaeten(prioritaeten: Einstellungen['prioritaeten'], d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', d.einstellungen, d.muskeln, async () => {
    const e = await ladeEinstellungen(d);
    await d.muskeln.bulkPut(grenzenNachPrioritaeten(await d.muskeln.toArray(), e.prioritaeten, prioritaeten));
    await d.einstellungen.put({ ...e, prioritaeten }, EINSTELLUNGEN_SCHLUESSEL);
  });
}

// Speichert einen Ort; ist er Standard, verlieren alle anderen die Markierung. Gibt es danach
// keinen Standardort, wird der erste Ort Standard.
export async function speichereOrt(ort: Ort, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', d.orte, async () => {
    await d.orte.put(ort);
    const orte = await d.orte.toArray();
    const standard = ort.standard ? ort.id : orte.find((o) => o.standard)?.id ?? orte[0]?.id;
    for (const o of orte) {
      if (o.standard !== (o.id === standard)) await d.orte.put({ ...o, standard: o.id === standard });
    }
  });
}

// Löscht einen Ort, solange dort nie trainiert wurde und er nicht Standard ist.
export async function loescheOrt(ortId: string, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const z = await ladeZustand(d);
    const ort = z.orte.find((o) => o.id === ortId);
    if (!ort || ort.standard || ortGenutzt(z, ortId)) return false;
    await d.orte.delete(ortId);
    return true;
  });
}

export async function speichereEigeneUebung(u: Uebung, d: FitnessDb = db): Promise<void> {
  await d.eigeneUebungen.put(u);
}

// Löscht eine eigene Übung, solange sie nie trainiert wurde, samt Favorit, Ausschluss und Video-Link.
export async function loescheEigeneUebung(uebungId: string, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const z = await ladeZustand(d);
    if (!z.eigeneUebungen.some((u) => u.id === uebungId) || uebungGenutzt(z, uebungId)) return false;
    await d.eigeneUebungen.delete(uebungId);
    const e = await d.einstellungen.get(EINSTELLUNGEN_SCHLUESSEL);
    if (e) await d.einstellungen.put(ohneUebung(e, uebungId), EINSTELLUNGEN_SCHLUESSEL);
    return true;
  });
}

export async function speichereEigenesUtensil(u: Utensil, d: FitnessDb = db): Promise<void> {
  await d.eigeneUtensilien.put(u);
}

// Löscht ein eigenes Utensil, solange kein gespeicherter Ort und keine eigene Übung es nutzt.
export async function loescheEigenesUtensil(utensilId: string, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const z = await ladeZustand(d);
    if (!z.eigeneUtensilien.some((u) => u.id === utensilId) || utensilGenutzt(z, utensilId)) return false;
    await d.eigeneUtensilien.delete(utensilId);
    return true;
  });
}

// Trainingszustand, den der Testtag fortschreibt (Einträge werden nur ergänzt oder ersetzt).
const TRAININGSTABELLEN = ['varianten', 'muster', 'muskeln', 'wochen', 'zyklen', 'einheiten', 'maxTests'] as const;

// Speichert den Testtag und schließt das Onboarding ab, beides in einem Schritt.
export async function speichereTesttag(einheit: Einheit, jetzt: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const neu = schliesseTesttagAb(await ladeZustand(d), einheit, jetzt);
    for (const t of TRAININGSTABELLEN) await d.table(t).bulkPut(neu[t]);
    await d.einstellungen.put({ ...(await ladeEinstellungen(d)), onboardingAbgeschlossen: true }, EINSTELLUNGEN_SCHLUESSEL);
  });
}

// App zurücksetzen (Entscheidung 21.10.2026): löscht alle Daten in einem Schritt; danach startet die
// App wie frisch installiert mit dem Onboarding. Schlägt etwas fehl, bleibt alles wie vorher.
export async function setzeZurueck(d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    for (const t of TABELLEN) await d.table(t).clear();
  });
}

// Onboarding ohne Testtag beenden: Die Startstufen kommen aus dem Level.
export async function beendeOnboarding(d: FitnessDb = db): Promise<void> {
  await aendereEinstellungen((e) => ({ ...e, onboardingAbgeschlossen: true }), d);
}

// ---------- Heute, Vor dem Start und Vorschau ----------

// Speichert eine neu erstellte Einheit und die Woche mit der Prognose. Ältere, nie gestartete
// Einheiten werden ersetzt; es gibt höchstens eine geplante Einheit.
export async function speichereNeueEinheit(einheit: Einheit, prognose: number, jetzt: string,
  extra: { erholungswoche?: boolean; laenger?: boolean; tage?: number[] } = {}, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const z = await ladeZustand(d);
    await d.wochen.put(wocheMitPrognose(z, jetzt, prognose, einheit.ortId, extra));
    await d.einheiten.where('status').equals('geplant').delete();
    await d.einheiten.put(einheit);
  });
}

// Speichert einen Tausch oder eine Anpassung der Einheit (Vorschau, Heute oder im Training); nur,
// solange die Einheit geplant ist bzw. läuft und sich ihr Status nicht geändert hat.
export async function speichereTausch(einheit: Einheit, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', d.einheiten, async () => {
    const status = (await d.einheiten.get(einheit.id))?.status;
    if (status !== einheit.status || (status !== 'geplant' && status !== 'laufend')) return false;
    await d.einheiten.put(einheit);
    return true;
  });
}

// „Neu erstellen“: verwirft eine nie gestartete Einheit.
export async function verwerfeEinheit(einheitId: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', d.einheiten, async () => {
    if ((await d.einheiten.get(einheitId))?.status === 'geplant') await d.einheiten.delete(einheitId);
  });
}

// Trainingstage der Woche auf Heute wählen (jederzeit, auch vor der ersten Einheit; Entscheidungen
// 21.10.2026 und 21.10.2026). Die Prognose folgt aus erledigten Einheiten und anstehenden Tagen.
export async function aendereTage(tage: number[], ortId: string, jetzt: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const z = await ladeZustand(d);
    await d.wochen.put(wocheMitPrognose(z, jetzt, prognoseAusTagen(z, jetzt, tage), ortId, { tage }));
  });
}

// Wochenabschluss beim Öffnen der App für alle abgeschlossenen, noch nicht ausgewerteten Wochen.
export async function fuehreWochenabschluesseAus(jetzt: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    let z = await ladeZustand(d);
    const offen = offeneWochenabschluesse(z, jetzt);
    if (offen.length === 0) return;
    for (const id of offen) z = wochenabschluss(z, id);
    for (const t of ['muskeln', 'zyklen', 'muster', 'wochen'] as const) await d.table(t).bulkPut(z[t]);
  });
}

// ---------- Trainings-Player ----------

// Nach dem Aufwärmen: Die Einheit läuft (im Zirkel startet die Stoppuhr). Nur aus „geplant“ oder
// beim Fortsetzen einer laufenden Einheit.
export async function starteEinheit(einheitId: string, jetzt: string, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', d.einheiten, async () => {
    const e = await d.einheiten.get(einheitId);
    if (!e || (e.status !== 'geplant' && e.status !== 'laufend')) return false;
    await d.einheiten.put(starte(e, jetzt));
    return true;
  });
}

// Speichert die laufende Einheit nach jedem Satz, damit ein Neustart am richtigen Satz fortsetzt.
export async function speichereLaufendeEinheit(einheit: Einheit, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', d.einheiten, async () => {
    if ((await d.einheiten.get(einheit.id))?.status !== 'laufend' || einheit.status !== 'laufend') return false;
    await d.einheiten.put(einheit);
    return true;
  });
}

// Beendet die laufende Einheit: abgeschlossen, wenn alle Sätze erledigt sind, sonst abgebrochen mit
// allen erledigten Sätzen. Danach schreibt `schliesseEinheitAb` Progression, Erholung und Woche fort;
// die neuen Rekorde werden vorher ermittelt. Ohne einen erledigten Satz wird die Einheit wieder
// „geplant“ (es gibt nichts zu speichern).
export async function beendeEinheit(einheit: Einheit, jetzt: string, d: FitnessDb = db):
  Promise<{ einheit: Einheit; rekorde: Rekord[] } | undefined> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    if ((await d.einheiten.get(einheit.id))?.status !== 'laufend') return undefined;
    if (erledigteSaetze(einheit) === 0) {
      const geplant: Einheit = { ...einheit, status: 'geplant' };
      delete geplant.gestartetAm;
      await d.einheiten.put(geplant);
      return undefined;
    }
    const z = await ladeZustand(d);
    const beendet = beende(einheit, jetzt);
    const rekorde = neueRekorde(z, beendet);
    const neu = schliesseEinheitAb(z, beendet, jetzt);
    for (const t of [...TRAININGSTABELLEN, 'zirkelErgebnisse'] as const) await d.table(t).bulkPut(neu[t]);
    return { einheit: neu.einheiten.find((x) => x.id === einheit.id)!, rekorde };
  });
}

// Löscht eine beendete Einheit aus dem Verlauf und holt den Stand davor zurück (Entscheidung 29.10.2026).
// Die betroffenen Tabellen werden in einer Transaktion neu geschrieben.
export async function loescheBeendeteEinheit(einheitId: string, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const neu = loescheEinheit(await ladeZustand(d), einheitId);
    if (!neu) return false;
    for (const t of [...TRAININGSTABELLEN, 'zirkelErgebnisse'] as const) {
      await d.table(t).clear();
      await d.table(t).bulkPut(neu[t]);
    }
    return true;
  });
}

// ---------- Abschluss und Bewertung der Übungen ----------

// Speichert Gesamtanstrengung und Notiz einer beendeten Einheit sowie die Sterne der gefragten Übungen
// (`gefragt`, auch ohne Antwort; Entscheidung 29.10.2026). Eine Bewertung mit 1 Stern ersetzt die
// Hauptvariante ab der nächsten Einheit (falls am Ort möglich).
export async function speichereAbschluss(einheitId: string, angaben: {
  gesamtbewertung?: Sterne; notiz?: string; bewertungen: Record<string, Sterne>; gefragt?: string[];
}, jetzt: string, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const alt = await d.einheiten.get(einheitId);
    if (!alt || (alt.status !== 'abgeschlossen' && alt.status !== 'abgebrochen')) return false;
    const einheit: Einheit = { ...alt };
    delete einheit.gesamtbewertung;
    delete einheit.notiz;
    if (angaben.gesamtbewertung) einheit.gesamtbewertung = angaben.gesamtbewertung;
    const notiz = angaben.notiz?.trim();
    if (notiz) einheit.notiz = notiz;
    await d.einheiten.put(einheit);
    await bewerte(angaben.gefragt ?? [], angaben.bewertungen, einheit.ortId, jetzt, d);
    return true;
  });
}

// Bewertung im Tab Übungen (undefined entfernt sie); der Ersatz bei 1 Stern gilt für den Standardort.
export async function speichereBewertung(uebungId: string, sterne: Sterne | undefined, jetzt: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const ort = (await d.orte.toArray()).find((o) => o.standard);
    await bewerte([], { [uebungId]: sterne }, ort?.id ?? '', jetzt, d);
  });
}

async function bewerte(gefragt: string[], bewertungen: Record<string, Sterne | undefined>, ortId: string, jetzt: string,
  d: FitnessDb): Promise<void> {
  if (gefragt.length === 0 && Object.keys(bewertungen).length === 0) return;
  await d.einstellungen.put(mitSternen(await ladeEinstellungen(d), gefragt, bewertungen, jetzt), EINSTELLUNGEN_SCHLUESSEL);
  if (Object.keys(bewertungen).length === 0) return;
  await d.muster.bulkPut(uebernimmBewertungen(await ladeZustand(d), ortId, jetzt).muster);
}
