// Schreibzugriffe der Screens Einstellungen und Übungen. Jede Änderung läuft in einer Transaktion;
// Löschen prüft dort noch einmal, dass der Eintrag nie genutzt wurde.
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { ohneUebung, ortGenutzt, uebungGenutzt, utensilGenutzt } from '../logik/einstellungen';
import { wocheMitPrognose } from '../logik/heute';
import { beende, erledigteSaetze, starte } from '../logik/player';
import { offeneWochenabschluesse, schliesseEinheitAb, wochenabschluss } from '../logik/progression';
import { schliesseTesttagAb } from '../logik/testtag';
import type { Einheit, Einstellungen, Ort, Uebung, Utensil } from '../logik/typen';
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

// Onboarding ohne Testtag beenden: Die Startstufen kommen aus dem Level.
export async function beendeOnboarding(d: FitnessDb = db): Promise<void> {
  await aendereEinstellungen((e) => ({ ...e, onboardingAbgeschlossen: true }), d);
}

// ---------- Heute, Vor dem Start und Vorschau ----------

// Speichert eine neu erstellte Einheit und die Woche mit der Prognose. Ältere, nie gestartete
// Einheiten werden ersetzt; es gibt höchstens eine geplante Einheit.
export async function speichereNeueEinheit(einheit: Einheit, prognose: number, jetzt: string,
  extra: { erholungswoche?: boolean; laenger?: boolean } = {}, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const z = await ladeZustand(d);
    await d.wochen.put(wocheMitPrognose(z, jetzt, prognose, einheit.ortId, extra));
    await d.einheiten.where('status').equals('geplant').delete();
    await d.einheiten.put(einheit);
  });
}

// Speichert einen Tausch in der Vorschau; nur, solange die Einheit nicht gestartet ist.
export async function speichereTausch(einheit: Einheit, d: FitnessDb = db): Promise<boolean> {
  return d.transaction('rw', d.einheiten, async () => {
    if ((await d.einheiten.get(einheit.id))?.status !== 'geplant' || einheit.status !== 'geplant') return false;
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

// Prognose der Woche auf Heute ändern (Entscheidung 21.10.2026: jederzeit, auch vor der ersten Einheit).
export async function aenderePrognose(prognose: number, ortId: string, jetzt: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    await d.wochen.put(wocheMitPrognose(await ladeZustand(d), jetzt, prognose, ortId));
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
// allen erledigten Sätzen. Danach schreibt `schliesseEinheitAb` Progression, Erholung und Woche fort.
// Ohne einen erledigten Satz wird die Einheit wieder „geplant“ (es gibt nichts zu speichern).
export async function beendeEinheit(einheit: Einheit, jetzt: string, d: FitnessDb = db): Promise<Einheit | undefined> {
  return d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    if ((await d.einheiten.get(einheit.id))?.status !== 'laufend') return undefined;
    if (erledigteSaetze(einheit) === 0) {
      const geplant: Einheit = { ...einheit, status: 'geplant' };
      delete geplant.gestartetAm;
      await d.einheiten.put(geplant);
      return undefined;
    }
    const neu = schliesseEinheitAb(await ladeZustand(d), beende(einheit, jetzt), jetzt);
    for (const t of [...TRAININGSTABELLEN, 'zirkelErgebnisse'] as const) await d.table(t).bulkPut(neu[t]);
    return neu.einheiten.find((x) => x.id === einheit.id);
  });
}
