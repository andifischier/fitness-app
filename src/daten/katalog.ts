// Lädt und prüft den mitgelieferten Katalog (docs/katalog.json, wird beim Build eingebunden).
import katalogDatei from '../../docs/katalog.json';
import type { KatalogDatei } from '../logik/typen';
import { katalogSchema } from './schemas';

export function pruefeKatalog(roh: unknown): KatalogDatei {
  const ergebnis = katalogSchema.safeParse(roh);
  if (!ergebnis.success) {
    const fehler = ergebnis.error.issues[0];
    throw new Error(`Katalog ungültig bei ${fehler?.path.join('.') ?? '?'}: ${fehler?.message ?? ''}`);
  }
  const katalog = ergebnis.data;
  const probleme: string[] = [];

  const doppelt = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of doppelt(katalog.utensilien.map((u) => u.id))) probleme.push(`Utensil ${id} doppelt`);
  for (const id of doppelt(katalog.uebungen.map((u) => u.id))) probleme.push(`Übung ${id} doppelt`);
  for (const id of doppelt(katalog.zirkel.map((z) => z.id))) probleme.push(`Zirkel ${id} doppelt`);

  const utensilIds = new Set(katalog.utensilien.map((u) => u.id));
  for (const u of katalog.uebungen) {
    for (const id of u.equipment.flat()) {
      if (!utensilIds.has(id)) probleme.push(`Übung ${u.id}: Utensil ${id} unbekannt`);
    }
    if (u.anzahlGewichte !== undefined && u.lasttyp !== 'Last') {
      probleme.push(`Übung ${u.id}: anzahlGewichte nur bei Lasttyp Last`);
    }
    if (u.herkunft !== 'katalog') probleme.push(`Übung ${u.id}: Herkunft muss „katalog“ sein`);
  }

  const uebungIds = new Set(katalog.uebungen.map((u) => u.id));
  for (const [name, a] of Object.entries(katalog.aufwaermen.anleitungen ?? {})) {
    if (a.uebungId !== undefined && !uebungIds.has(a.uebungId)) probleme.push(`Aufwärmen ${name}: Übung ${a.uebungId} unbekannt`);
  }

  if (probleme.length > 0) throw new Error(`Katalog ungültig: ${probleme.join('; ')}`);
  return katalog;
}

export const KATALOG: KatalogDatei = pruefeKatalog(katalogDatei);
