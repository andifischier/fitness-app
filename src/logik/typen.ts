// Datenmodell laut Spezifikation, Abschnitt „Entitäten (verbindlich für die Umsetzung)“.

export const MUSTER_IDS = [
  'hDruck', 'vDruck', 'hZug', 'vZug', 'Knie', 'Einbein', 'Huefte',
  'Rumpf', 'Bizeps', 'Trizeps', 'Schulter', 'Waden', 'Kondition',
] as const;
export const MUSKELN = [
  'Brust', 'Ruecken', 'Schultern', 'Bizeps', 'Trizeps',
  'Quadrizeps', 'Gesaess', 'HintereOS', 'Bauch', 'Waden',
] as const;
export const PRIORITAETEN = ['hoch', 'normal', 'niedrig', 'sehrNiedrig'] as const;
export const FEEDBACKS = ['leicht', 'passend', 'schwer'] as const;
export const BAND_STUFEN = ['leicht', 'mittel', 'schwer', 'extraSchwer'] as const;

export type MusterId = (typeof MUSTER_IDS)[number];
export type Muskel = (typeof MUSKELN)[number];
export type Prioritaet = (typeof PRIORITAETEN)[number];
export type Feedback = (typeof FEEDBACKS)[number];
export type BandStufe = (typeof BAND_STUFEN)[number];
export type Sterne = 1 | 2 | 3 | 4 | 5;

// Katalog (katalog.json) und eigene Einträge
export interface Utensil { id: string; name: string; details: string; immerVorhanden: boolean; eigenes: boolean }
export interface Uebung {
  id: string; name: string; muster: MusterId;
  primaer: Muskel[]; sekundaer: Muskel[];
  stufe: number;                    // 1 bis 10 innerhalb des Musters
  equipment: string[][];            // Gruppen; aus jeder Gruppe mind. ein Utensil nötig
  lasttyp: 'KG' | 'Band' | 'Last' | 'Zeit';
  bereich: { von: number; bis: number; einheit: 'Wdh.' | 'Sek.' };
  unterstuetzend: boolean;          // z. B. klimmzug_band: Fortschritt = leichteres Band
  anzahlGewichte?: 1 | 2;           // nur bei Last-Übungen mit KH/KB
  zirkelGeeignet: boolean;
  youtubeUrl: string;               // Standard: YouTube-Suche
  eigenerVideoLink?: string;        // vom Nutzer, hat Vorrang
  videoId?: string;                 // festes YouTube-Video zum Einbetten (nur ausgewählte Katalogübungen)
  anleitung?: string[];             // Kurzanleitung in Stichpunkten (alle Katalogübungen)
  herkunft: 'katalog' | 'eigene';
}
export interface Zirkel {
  id: string; name: string; runden: number; dauerHinweis: string;
  stationen: { muster: MusterId; vorgabe: number | string; hinweis: string }[];
}
export interface KatalogDatei {
  schemaVersion: number; utensilien: Utensil[]; uebungen: Uebung[]; zirkel: Zirkel[];
  aufwaermen: {
    allgemein: { immer: string[]; oben: string[]; unten: string[] }; mobility: Partial<Record<MusterId, string[]>>;
    maxMobilityZeilen: number; aufwaermsatz: { anteilLast: number; wdh: number };
  };
}

// Orte und Equipment
export type KurzhantelConfig =
  | { modus: 'verstellbar'; minKg: number; maxKg: number; schrittKg: number }
  | { modus: 'paare'; gewichteKg: number[] };
export interface OrtEquipment {
  utensilId: string;
  kurzhanteln?: KurzhantelConfig;   // bei KH Pflicht
  bandStufen?: BandStufe[];         // bei BAND, MINI Pflicht
  gewichteKg?: number[];            // bei KB Pflicht
  langhantel?: { stangeKg: number; scheiben: { kg: number; paare: number }[] }; // bei LH Pflicht
}
export interface Ort { id: string; name: string; standard: boolean; equipment: OrtEquipment[] }

// Einstellungen (genau ein Datensatz)
export interface Einstellungen {
  ziele: ('muskelaufbau' | 'fitness' | 'kraft' | 'ausdauer')[];
  level: 'einsteiger' | 'fortgeschritten' | 'erfahren';
  ueblicheEinheiten: number;        // 1 bis 6, Startwert der Prognose
  standardDauerMin: number;         // 20 bis 90
  laengerAnbieten: boolean;
  prioritaeten: Record<Muskel, Prioritaet>;
  zielReserve: '1-3' | '2-3';
  zirkelAnteil: 'aus' | 'alle2Wochen' | '1proWoche' | '2proWoche';
  pausenSek: { grund: number; isolation: number; supersatz: number };
  favoriten: string[]; ausgeschlossen: string[];
  einschraenkungen: { id: string; typ: 'region' | 'muster'; wert: string; bis?: string }[];
  onboardingAbgeschlossen: boolean;
  letztesBackup?: string;
  videoLinks?: Record<string, string>; // eigene Video-Links für Katalogübungen (eigene Übungen: eigenerVideoLink)
  bewertungen?: Record<string, Sterne>; // Sterne je Übungs-ID, letzte Bewertung zählt; fehlt sie, gilt 3
  sterneGefragt?: Record<string, { am: string; ohneAntwort: number }>; // letzte Frage bzw. Bewertung je Übung
  workouts?: EigenesWorkout[];      // eigene Workouts (Entscheidung 21.10.2026)
}

// Eigenes Workout: Übungsliste (je Übung Sätze) oder Zirkel (Runden, je Station eine Vorgabe in
// Wdh. bzw. Sek.). Beide Angaben bleiben gespeichert, damit ein Wechsel der Art nichts verliert.
export interface EigenesWorkout {
  id: string; name: string; art: 'liste' | 'zirkel'; runden: number;
  uebungen: { uebungId: string; saetze: number; vorgabe: number }[];
}

// Trainingszustand (wird nur vom Planungsmodul geschrieben)
export interface VarianteZustand {
  uebungId: string; last?: number; bandStufe?: BandStufe;
  zielWdh: number; e1rm?: number; bestErsterSatz?: number;
  seitSteigerung: number; schwerSerie: number; zuletzt?: string;
  langsam?: boolean;                // 3 Sek. absenken (Zwischenstufe oder schwerste Last erreicht)
}
export interface MusterZustand { muster: MusterId; stufe: number; hauptvarianten: string[] } // letzter Test steht in maxTests
export interface MuskelZustand {
  muskel: Muskel; letzteBelastung?: string; letzteDosis: number; letzteSchwer: boolean;
  persoenlicheGrenze: number; gleichWochen: number; leistung: { woche: string; wert: number }[];
}
export interface Woche {
  id: string; prognose: number; einheiten: number;
  ziele: Record<Muskel, number>; erledigt: Record<Muskel, number>;
  erholungswoche: boolean; laengerAngenommen: boolean;
  ausgewertet?: boolean;            // Wochenabschluss gelaufen
  tage?: number[];                  // gewählte Trainingstage (0 = Montag … 6 = Sonntag), sortiert
}
export interface Zyklus { nr: number; start: string; ende?: string; grund?: 'zeitablauf' | 'erholungswoche' }

// Einheiten
export interface SatzErgebnis { nr: number; wdh?: number; sek?: number; last?: number; bandStufe?: BandStufe; zeit: string }
export interface Position {
  uebungId: string; saetze: number; zielWdh: number; last?: number; bandStufe?: BandStufe;
  istMaxTest?: boolean; istErsatz?: boolean; getauschtVon?: string;
  istLasttest?: boolean;             // Gewichtstest am Testtag (Entscheidung 21.10.2026)
  langsam?: boolean;                // 3 Sek. absenken
  ergebnisse: SatzErgebnis[]; feedback?: Feedback;
}
export interface Block {
  typ: 'einzeln' | 'supersatz' | 'zirkel'; positionen: Position[];
  pauseSek: number; zirkelId?: string; runden?: number;
}
export interface Einheit {
  id: string; woche: string; erstelltAm: string; gestartetAm?: string; beendetAm?: string;
  status: 'geplant' | 'laufend' | 'abgeschlossen' | 'abgebrochen';
  ortId: string; fokus: 'ganz' | 'oben' | 'unten'; format: 'klassisch' | 'supersatz' | 'mix' | 'zirkel' | 'test';
  geschaetzteDauerMin: number;      // inklusive Bauch- und Wadensätze
  aufwaermen: { uebungId: string; vorgabe: string }[];
  bloecke: Block[]; gesamtbewertung?: 1 | 2 | 3 | 4 | 5; notiz?: string;
  name?: string;                    // Name des eigenen Workouts, aus dem die Einheit erstellt wurde
  vorher?: Vorstand;                // Stand vor dem Abschluss, damit Löschen ihn zurückholt (Entscheidung 29.10.2026)
}
// Varianten und Muster der Übungen einer Einheit, wie sie vor ihrem Abschluss waren; ohne `zustand`
// gab es noch keinen Eintrag.
export interface Vorstand {
  varianten: { uebungId: string; zustand?: VarianteZustand }[];
  muster: { muster: MusterId; zustand?: MusterZustand }[];
}
export interface ZirkelErgebnis { zirkelId: string; ortId: string; datum: string; zeitSek: number; varianten: string[] }
export interface MaxTest { id: string; datum: string; muster: MusterId; uebungId: string; ergebnis: number; einheit: 'Wdh.' | 'Sek.' }

// Alle Tabellen der Datenbank, wie sie gespeichert und gesichert werden.
export interface Tabellen {
  einstellungen: Einstellungen[];   // höchstens ein Eintrag
  orte: Ort[];
  eigeneUebungen: Uebung[];
  eigeneUtensilien: Utensil[];
  varianten: VarianteZustand[];
  muster: MusterZustand[];
  muskeln: MuskelZustand[];
  wochen: Woche[];
  zyklen: Zyklus[];
  einheiten: Einheit[];
  zirkelErgebnisse: ZirkelErgebnis[];
  maxTests: MaxTest[];
}

export interface AppZustand extends Tabellen {
  katalog: KatalogDatei;
}
