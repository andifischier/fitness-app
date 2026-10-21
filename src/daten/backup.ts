// Backup als JSON-Datei: Export aller Tabellen, Prüfung und Import (ersetzt alle Daten).
import { z } from 'zod';
import { BACKUP } from '../konfiguration';
import type { Tabellen } from '../logik/typen';
import { db, EINSTELLUNGEN_SCHLUESSEL, ersetzeTabellen, leseTabellen, TABELLEN, type FitnessDb } from './db';
import { tabellenSchemas } from './schemas';
import { lokaleZeit } from './zeit';

export interface BackupDatei {
  format: typeof BACKUP.format;
  schemaVersion: number;
  exportiertAm: string;
  daten: Tabellen;
}

export interface BackupZusammenfassung {
  exportiertAm: string;
  einheiten: number;
  von?: string;   // ältestes Erstelldatum einer Einheit
  bis?: string;   // jüngstes Erstelldatum einer Einheit
}

export type PruefErgebnis =
  | { ok: true; zusammenfassung: BackupZusammenfassung; daten: Tabellen }
  | { ok: false; fehler: string };

const TABELLEN_NAMEN: Record<keyof Tabellen, string> = {
  einstellungen: 'Einstellungen',
  orte: 'Orte',
  eigeneUebungen: 'Eigene Übungen',
  eigeneUtensilien: 'Eigene Utensilien',
  varianten: 'Varianten',
  muster: 'Muster',
  muskeln: 'Muskeln',
  wochen: 'Wochen',
  zyklen: 'Zyklen',
  einheiten: 'Einheiten',
  zirkelErgebnisse: 'Zirkel-Ergebnisse',
  maxTests: 'Max-Tests',
};

// Primärschlüssel je Tabelle, um doppelte Einträge vor dem Import zu erkennen.
const SCHLUESSEL: { [T in keyof Tabellen]: (e: Tabellen[T][number]) => string } = {
  einstellungen: () => String(EINSTELLUNGEN_SCHLUESSEL),
  orte: (e) => e.id,
  eigeneUebungen: (e) => e.id,
  eigeneUtensilien: (e) => e.id,
  varianten: (e) => e.uebungId,
  muster: (e) => e.muster,
  muskeln: (e) => e.muskel,
  wochen: (e) => e.id,
  zyklen: (e) => String(e.nr),
  einheiten: (e) => e.id,
  zirkelErgebnisse: (e) => [e.zirkelId, e.ortId, e.datum].join('|'),
  maxTests: (e) => e.id,
};

export const MELDUNG = {
  unlesbar: 'Die Datei lässt sich nicht lesen. Wähle eine Backup-Datei der Fitness-App.',
  falschesFormat: 'Das ist keine Backup-Datei der Fitness-App.',
  neuereVersion: 'Dieses Backup stammt aus einer neueren App-Version. Aktualisiere zuerst die App.',
  beschaedigt: (fundstelle: string) =>
    `Die Backup-Datei ist beschädigt (${fundstelle}). Deine Daten bleiben unverändert.`,
  speichern: 'Das Backup ließ sich nicht speichern. Deine Daten bleiben unverändert.',
} as const;

export function backupDateiname(jetzt: string): string {
  return `fitness-backup-${jetzt.slice(0, 10)}.json`;
}

// Erstellt die Backup-Datei. Mit `merken` gilt das Backup sofort als gespeichert (letztesBackup);
// beim Teilen erst, wenn das Teilen geklappt hat (`merkeBackup`).
export async function exportiere(jetzt: string = lokaleZeit(), d: FitnessDb = db, merken = true): Promise<Blob> {
  const daten = await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    const einstellungen = await d.einstellungen.get(EINSTELLUNGEN_SCHLUESSEL);
    if (einstellungen && merken) {
      await d.einstellungen.put({ ...einstellungen, letztesBackup: jetzt }, EINSTELLUNGEN_SCHLUESSEL);
    }
    return leseTabellen(d);
  });
  const datei: BackupDatei = { format: BACKUP.format, schemaVersion: BACKUP.schemaVersion, exportiertAm: jetzt, daten };
  return new Blob([JSON.stringify(datei, null, 2)], { type: 'application/json' });
}

export async function merkeBackup(jetzt: string, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', d.einstellungen, async () => {
    const einstellungen = await d.einstellungen.get(EINSTELLUNGEN_SCHLUESSEL);
    if (einstellungen) await d.einstellungen.put({ ...einstellungen, letztesBackup: jetzt }, EINSTELLUNGEN_SCHLUESSEL);
  });
}

function fundstelle(tabelle: keyof Tabellen, index?: number): string {
  return index === undefined ? `${TABELLEN_NAMEN[tabelle]} fehlt` : `${TABELLEN_NAMEN[tabelle]}, Eintrag ${index + 1}`;
}

export function pruefeBackupInhalt(roh: unknown): PruefErgebnis {
  const kopf = z.object({ format: z.literal(BACKUP.format) }).safeParse(roh);
  if (!kopf.success) return { ok: false, fehler: MELDUNG.falschesFormat };

  const datei = roh as Record<string, unknown>;
  const version = datei.schemaVersion;
  if (typeof version === 'number' && Number.isInteger(version) && version > BACKUP.schemaVersion) {
    return { ok: false, fehler: MELDUNG.neuereVersion };
  }
  if (version !== BACKUP.schemaVersion) return { ok: false, fehler: MELDUNG.beschaedigt('Versionsangabe') };
  if (typeof datei.exportiertAm !== 'string') return { ok: false, fehler: MELDUNG.beschaedigt('Exportdatum') };
  const rohDaten = datei.daten;
  if (typeof rohDaten !== 'object' || rohDaten === null) return { ok: false, fehler: MELDUNG.beschaedigt('Daten fehlen') };

  const daten: Partial<Record<keyof Tabellen, unknown[]>> = {};
  for (const t of TABELLEN) {
    const eintraege = (rohDaten as Record<string, unknown>)[t];
    if (!Array.isArray(eintraege)) return { ok: false, fehler: MELDUNG.beschaedigt(fundstelle(t)) };
    if (t === 'einstellungen' && eintraege.length > 1) {
      return { ok: false, fehler: MELDUNG.beschaedigt(fundstelle(t, 1)) };
    }
    const schema = tabellenSchemas[t];
    const schluessel = SCHLUESSEL[t] as (e: unknown) => string;
    const gesehen = new Set<string>();
    const geprueft: unknown[] = [];
    for (const [i, eintrag] of eintraege.entries()) {
      const ergebnis = schema.safeParse(eintrag);
      if (!ergebnis.success) return { ok: false, fehler: MELDUNG.beschaedigt(fundstelle(t, i)) };
      const s = schluessel(ergebnis.data);
      if (gesehen.has(s)) return { ok: false, fehler: MELDUNG.beschaedigt(fundstelle(t, i)) };
      gesehen.add(s);
      geprueft.push(ergebnis.data);
    }
    daten[t] = geprueft;
  }

  const tabellen = daten as unknown as Tabellen;
  const erstellt = tabellen.einheiten.map((e) => e.erstelltAm).sort();
  return {
    ok: true,
    daten: tabellen,
    zusammenfassung: {
      exportiertAm: datei.exportiertAm,
      einheiten: erstellt.length,
      von: erstellt[0],
      bis: erstellt[erstellt.length - 1],
    },
  };
}

export async function pruefeBackup(datei: Blob): Promise<PruefErgebnis> {
  let roh: unknown;
  try {
    roh = JSON.parse(await datei.text());
  } catch {
    return { ok: false, fehler: MELDUNG.unlesbar };
  }
  return pruefeBackupInhalt(roh);
}

export async function importiere(
  datei: Blob, d: FitnessDb = db,
): Promise<{ ok: true } | { ok: false; fehler: string }> {
  const pruefung = await pruefeBackup(datei);
  if (!pruefung.ok) return pruefung;
  try {
    await ersetzeTabellen(pruefung.daten, d);
  } catch {
    return { ok: false, fehler: MELDUNG.speichern };
  }
  return { ok: true };
}
