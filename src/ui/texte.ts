// Anzeigenamen für IDs aus Datenmodell und Konfiguration (Deutsch, kurz).
import type { BandStufe, Einstellungen, MusterId, Muskel, Prioritaet, Uebung, Utensil } from '../logik/typen';

export const MUSKEL_NAMEN: Record<Muskel, string> = {
  Brust: 'Brust', Ruecken: 'Rücken', Schultern: 'Schultern', Bizeps: 'Bizeps', Trizeps: 'Trizeps',
  Quadrizeps: 'Quadrizeps', Gesaess: 'Gesäß', HintereOS: 'Hintere Oberschenkel', Bauch: 'Bauch', Waden: 'Waden',
};

export const MUSTER_NAMEN: Record<MusterId, string> = {
  hDruck: 'Horizontales Drücken', vDruck: 'Vertikales Drücken', hZug: 'Horizontales Ziehen', vZug: 'Vertikales Ziehen',
  Knie: 'Kniedominant', Einbein: 'Einbeinig', Huefte: 'Hüftdominant', Rumpf: 'Rumpf und Bauch',
  Bizeps: 'Bizeps', Trizeps: 'Trizeps', Schulter: 'Seitliche und hintere Schulter', Waden: 'Waden', Kondition: 'Kondition',
};

// Hinweis im Equipment-Bildschirm, wenn ein Muster entfällt („Für Ziehen fehlt Equipment“)
export const MUSTER_FEHLT: Record<MusterId, string> = {
  hDruck: 'Drücken', vDruck: 'Drücken über Kopf', hZug: 'Rudern', vZug: 'Ziehen von oben',
  Knie: 'Kniebeugen', Einbein: 'einbeinige Übungen', Huefte: 'Hüftübungen', Rumpf: 'Bauch', Bizeps: 'Bizeps',
  Trizeps: 'Trizeps', Schulter: 'Schultern', Waden: 'Waden', Kondition: 'Kondition',
};

export const PRIORITAET_NAMEN: Record<Prioritaet, string> = {
  hoch: 'Hoch', normal: 'Normal', niedrig: 'Niedrig', sehrNiedrig: 'Sehr niedrig',
};

export const BAND_NAMEN: Record<BandStufe, string> = {
  leicht: 'leicht', mittel: 'mittel', schwer: 'schwer', extraSchwer: 'extra schwer',
};

export const LASTTYP_NAMEN: Record<Uebung['lasttyp'], string> = {
  KG: 'Körpergewicht', Band: 'Band', Last: 'Gewicht (kg)', Zeit: 'Halten (Sek.)',
};

export const ZIEL_NAMEN: Record<Einstellungen['ziele'][number], string> = {
  muskelaufbau: 'Muskelaufbau', fitness: 'Fettabbau / Fitness allgemein', kraft: 'Kraft', ausdauer: 'Ausdauer',
};

export const LEVEL_NAMEN: Record<Einstellungen['level'], string> = {
  einsteiger: 'Einsteiger', fortgeschritten: 'Fortgeschritten', erfahren: 'Erfahren',
};

export const ZIRKEL_ANTEIL_NAMEN: Record<Einstellungen['zirkelAnteil'], string> = {
  aus: 'Aus', alle2Wochen: 'Alle 2 Wochen', '1proWoche': '1x pro Woche', '2proWoche': '2x pro Woche',
};

export const RESERVE_NAMEN: Record<Einstellungen['zielReserve'], string> = {
  '1-3': '1 bis 3 Wdh. (Standard)', '2-3': '2 bis 3 Wdh. (schonender)',
};

// Schlüssel wie in SPERREN_NACH_REGION (konfiguration.ts)
export const REGION_NAMEN: Record<string, string> = {
  schulter: 'Schulter', ellbogen: 'Ellbogen', handgelenk: 'Handgelenk', untererRuecken: 'Unterer Rücken',
  knie: 'Knie', huefte: 'Hüfte',
};

// Anzeigename eines Utensils; die Hantelbank-Einträge heißen in der UI kürzer.
export function utensilName(u: Utensil): string {
  if (u.id === 'BAND') return 'Widerstandsbänder';
  if (u.id === 'BANK') return 'Hantelbank flach';
  if (u.id === 'SCHRAEG') return 'Hantelbank verstellbar';
  return u.name;
}

// Equipment einer Übung als Text: „Kurzhanteln + Hantelbank flach oder Hantelbank verstellbar“
export function equipmentText(gruppen: string[][], utensilien: Utensil[]): string {
  if (gruppen.length === 0) return 'Kein Equipment nötig';
  const name = (id: string) => {
    const u = utensilien.find((x) => x.id === id);
    return u ? utensilName(u) : id;
  };
  return gruppen.map((g) => g.map(name).join(' oder ')).join(' + ');
}

// Datum „2026-11-30“ → „30.11.2026“
export function datumText(iso: string): string {
  const [j, m, t] = iso.slice(0, 10).split('-');
  return `${t}.${m}.${j}`;
}
