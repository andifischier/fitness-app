// Erstellte Einheit vor dem Start anpassen (Entscheidung 21.10.2026): Sätze ändern, Übungen
// entfernen und hinzufügen, zusätzlich zum Tauschen. Gilt nicht für Zirkel. Rein und deterministisch.
import { MUSTER_ART, WORKOUT } from '../konfiguration';
import { alleUebungen, uebungErlaubt } from './equipment';
import { aufwaermenFuer, geschaetzteDauer, startwerte } from './planung';
import type { AppZustand, Block, Einheit, Uebung } from './typen';
import { einstellungenVon, uebungVon } from './verlauf';

export function kannAnpassen(einheit: Einheit): boolean {
  return einheit.status === 'geplant' && einheit.format !== 'zirkel' && einheit.format !== 'test';
}

function pruefe(einheit: Einheit): void {
  if (!kannAnpassen(einheit)) throw new Error('Anpassen geht nur vor dem Start und nicht im Zirkel.');
}

const pauseEinzeln = (z: AppZustand, u: Uebung | undefined) => {
  const e = einstellungenVon(z);
  return u && MUSTER_ART[u.muster] === 'grund' ? e.pausenSek.grund : e.pausenSek.isolation;
};

// Format, Aufwärmen und Dauer nach einer Änderung neu bestimmen. Eine Kombi-Runde mit nur noch einer
// Übung wird zur einzelnen Übung mit deren Pause.
function aufgeraeumt(z: AppZustand, einheit: Einheit): Einheit {
  const bloecke: Block[] = einheit.bloecke.filter((b) => b.positionen.length > 0).map((b) =>
    (b.typ === 'supersatz' && b.positionen.length === 1
      ? { typ: 'einzeln', positionen: b.positionen, pauseSek: pauseEinzeln(z, uebungVon(z, b.positionen[0]!.uebungId)) }
      : b));
  const normal = bloecke.flatMap((b) => b.positionen.filter((p) => !p.istMaxTest).map(() => b.typ));
  const kombi = normal.filter((t) => t === 'supersatz').length;
  const format: Einheit['format'] = kombi === 0 ? 'klassisch' : kombi === normal.length ? 'supersatz' : 'mix';
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  const neu: Einheit = { ...einheit, bloecke, format, aufwaermen: ort ? aufwaermenFuer(z, ort, bloecke) : einheit.aufwaermen };
  neu.geschaetzteDauerMin = geschaetzteDauer(z, neu);
  return neu;
}

export function setzeSaetze(z: AppZustand, einheit: Einheit, block: number, position: number, saetze: number): Einheit {
  pruefe(einheit);
  const p = einheit.bloecke[block]?.positionen[position];
  if (!p || p.istMaxTest) return einheit;
  const neu = structuredClone(einheit);
  neu.bloecke[block]!.positionen[position]!.saetze = Math.min(WORKOUT.saetze.max, Math.max(WORKOUT.saetze.min, Math.round(saetze)));
  return aufgeraeumt(z, neu);
}

export function entferneUebung(z: AppZustand, einheit: Einheit, block: number, position: number): Einheit {
  pruefe(einheit);
  if (!einheit.bloecke[block]?.positionen[position]) return einheit;
  const neu = structuredClone(einheit);
  neu.bloecke[block]!.positionen.splice(position, 1);
  return aufgeraeumt(z, neu);
}

// Übungen, die sich hinzufügen lassen: am Ort möglich, nicht gesperrt oder ausgeschlossen und noch
// nicht in der Einheit.
export function hinzufuegbar(z: AppZustand, einheit: Einheit): Uebung[] {
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  if (!ort) return [];
  const e = einstellungenVon(z);
  const drin = new Set(einheit.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId)));
  return alleUebungen(z).filter((u) => !drin.has(u.id) && uebungErlaubt(e, ort, u, einheit.erstelltAm));
}

// Neue Übung als einzelne Übung am Ende, mit 3 Sätzen und Ziel und Last wie in jeder Einheit.
export function fuegeUebungHinzu(z: AppZustand, einheit: Einheit, uebungId: string): Einheit {
  pruefe(einheit);
  const u = uebungVon(z, uebungId);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  if (!u || !ort || !hinzufuegbar(z, einheit).some((x) => x.id === uebungId)) {
    throw new Error(`Übung ${uebungId} lässt sich hier nicht hinzufügen.`);
  }
  const neu = structuredClone(einheit);
  neu.bloecke.push({
    typ: 'einzeln', pauseSek: pauseEinzeln(z, u),
    positionen: [{ uebungId, saetze: WORKOUT.saetze.standard, ...startwerte(z, einstellungenVon(z), ort, u), ergebnisse: [] }],
  });
  return aufgeraeumt(z, neu);
}
