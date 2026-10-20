// Schreibzugriffe der Screens Einstellungen und Übungen. Jede Änderung läuft in einer Transaktion;
// Löschen prüft dort noch einmal, dass der Eintrag nie genutzt wurde.
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { ohneUebung, ortGenutzt, uebungGenutzt, utensilGenutzt } from '../logik/einstellungen';
import type { Einstellungen, Ort, Uebung, Utensil } from '../logik/typen';
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
