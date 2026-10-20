// IndexedDB über Dexie. Schemaänderungen nur mit neuer Version plus Migration (siehe CLAUDE.md).
import { Dexie, type EntityTable, type Table } from 'dexie';
import type {
  AppZustand, Einheit, Einstellungen, MaxTest, MuskelZustand, MusterZustand, Ort, Tabellen,
  Uebung, Utensil, VarianteZustand, Woche, ZirkelErgebnis, Zyklus,
} from '../logik/typen';
import { KATALOG } from './katalog';

// Einstellungen sind genau ein Datensatz unter diesem Schlüssel.
export const EINSTELLUNGEN_SCHLUESSEL = 1;

export const TABELLEN = [
  'einstellungen', 'orte', 'eigeneUebungen', 'eigeneUtensilien', 'varianten', 'muster',
  'muskeln', 'wochen', 'zyklen', 'einheiten', 'zirkelErgebnisse', 'maxTests',
] as const satisfies readonly (keyof Tabellen)[];

export class FitnessDb extends Dexie {
  einstellungen!: Table<Einstellungen, number>;
  orte!: EntityTable<Ort, 'id'>;
  eigeneUebungen!: EntityTable<Uebung, 'id'>;
  eigeneUtensilien!: EntityTable<Utensil, 'id'>;
  varianten!: EntityTable<VarianteZustand, 'uebungId'>;
  muster!: EntityTable<MusterZustand, 'muster'>;
  muskeln!: EntityTable<MuskelZustand, 'muskel'>;
  wochen!: EntityTable<Woche, 'id'>;
  zyklen!: EntityTable<Zyklus, 'nr'>;
  einheiten!: EntityTable<Einheit, 'id'>;
  zirkelErgebnisse!: Table<ZirkelErgebnis, [string, string, string]>;
  maxTests!: EntityTable<MaxTest, 'id'>;

  constructor(name = 'fitness') {
    super(name);
    this.version(1).stores({
      einstellungen: '',
      orte: 'id',
      eigeneUebungen: 'id',
      eigeneUtensilien: 'id',
      varianten: 'uebungId',
      muster: 'muster',
      muskeln: 'muskel',
      wochen: 'id',
      zyklen: 'nr',
      einheiten: 'id, status, woche',
      zirkelErgebnisse: '[zirkelId+ortId+datum]',
      maxTests: 'id, muster',
    });
  }
}

export const db = new FitnessDb();

export async function leseTabellen(d: FitnessDb = db): Promise<Tabellen> {
  return d.transaction('r', TABELLEN.map((t) => d.table(t)), async () => {
    const eintraege = await Promise.all(TABELLEN.map((t) => d.table(t).toArray()));
    return Object.fromEntries(TABELLEN.map((t, i) => [t, eintraege[i]])) as unknown as Tabellen;
  });
}

// Ersetzt alle Tabellen in einer Transaktion: Schlägt etwas fehl, bleibt alles wie vorher.
export async function ersetzeTabellen(daten: Tabellen, d: FitnessDb = db): Promise<void> {
  await d.transaction('rw', TABELLEN.map((t) => d.table(t)), async () => {
    for (const t of TABELLEN) await d.table(t).clear();
    const einstellungen = daten.einstellungen[0];
    if (einstellungen) await d.einstellungen.put(einstellungen, EINSTELLUNGEN_SCHLUESSEL);
    for (const t of TABELLEN) {
      if (t !== 'einstellungen') await d.table(t).bulkAdd(daten[t]);
    }
  });
}

export async function ladeZustand(d: FitnessDb = db): Promise<AppZustand> {
  return { ...(await leseTabellen(d)), katalog: KATALOG };
}

// Bittet den Browser, die Daten nicht bei Speichermangel zu löschen.
export async function speicherSchutz(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Ohne Schutz läuft die App trotzdem.
  }
}
