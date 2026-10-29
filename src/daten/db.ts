// IndexedDB über Dexie. Schemaänderungen nur mit neuer Version plus Migration (siehe CLAUDE.md).
import { Dexie, type EntityTable, type Table } from 'dexie';
import {
  MUSKELN, type AppZustand, type Einheit, type Einstellungen, type MaxTest, type MuskelZustand, MusterZustand, Ort, Tabellen,
  type Muskel, type Prioritaet, type Uebung, type Utensil, type VarianteZustand, type Woche, type ZirkelErgebnis, type Zyklus,
} from '../logik/typen';
import { STANDARD_EINSTELLUNGEN, STANDARD_PRIORITAETEN } from '../konfiguration';
import { KATALOG } from './katalog';
import { grenzenNachPrioritaeten } from '../logik/einstellungen';

// Früherer Standard der Isolations- und Kombi-Pause (bis Version 1 der Datenbank)
const PAUSE_ALT = 75;
// Früherer Standard der Muskelprioritäten „Oberkörper betont“ (bis Version 2 der Datenbank)
const PRIORITAETEN_ALT: Record<Muskel, Prioritaet> = {
  Brust: 'hoch', Ruecken: 'hoch', Schultern: 'hoch', Bizeps: 'hoch', Trizeps: 'hoch',
  Quadrizeps: 'normal', Gesaess: 'normal', HintereOS: 'normal',
  Bauch: 'niedrig', Waden: 'sehrNiedrig',
};

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
    // Version 2 (Entscheidung 21.10.2026): Isolations- und Kombi-Pause von 75 auf 60 Sek., aber nur,
    // wenn der Nutzer den alten Standardwert nicht selbst geändert hat. Sonst bleibt alles unverändert.
    this.version(2).upgrade((tx) => tx.table('einstellungen').toCollection().modify((e: Einstellungen) => {
      for (const art of ['isolation', 'supersatz'] as const) {
        if (e.pausenSek?.[art] === PAUSE_ALT) e.pausenSek[art] = STANDARD_EINSTELLUNGEN.pausenSek[art];
      }
    }));
    // Version 3 (Entscheidung 29.10.2026): Muskelprioritäten auf den neuen Standard (alle normal), aber
    // nur, wenn noch der alte Standard „Oberkörper betont“ gilt. Selbst angepasste bleiben.
    // Die persönlichen Grenzen ziehen mit und behalten den gewonnenen Fortschritt.
    this.version(3).upgrade(async (tx) => {
      const e: Einstellungen | undefined = await tx.table('einstellungen').get(EINSTELLUNGEN_SCHLUESSEL);
      if (!e?.prioritaeten || !MUSKELN.every((m) => e.prioritaeten[m] === PRIORITAETEN_ALT[m])) return;
      const muskeln: MuskelZustand[] = await tx.table('muskeln').toArray();
      await tx.table('muskeln').bulkPut(grenzenNachPrioritaeten(muskeln, PRIORITAETEN_ALT, STANDARD_PRIORITAETEN));
      await tx.table('einstellungen').put({ ...e, prioritaeten: { ...STANDARD_PRIORITAETEN } }, EINSTELLUNGEN_SCHLUESSEL);
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
