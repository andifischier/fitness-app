// Alle Zahlenwerte der Spezifikation an einer Stelle. Es sind Startwerte; Logik steht in src/logik/.
import type { Einstellungen, MusterId, Muskel, Prioritaet } from './logik/typen';

// Nutzerprofil und Onboarding
export const PROFIL = {
  einheitenProWoche: { min: 1, max: 6 },
  dauerMin: { min: 20, max: 90, schritt: 5 },
  // Musterstufe ohne Testtag
  musterstufeNachLevel: { einsteiger: 3, fortgeschritten: 5, erfahren: 6 },
  // Persönliche Volumengrenze (Start) relativ zur Tabelle „Wochenziel pro Muskel“
  grenzeNachLevel: { einsteiger: -2, fortgeschritten: 0, erfahren: 2 },
  // Bereich für Grundübungen mit Last, wenn das Ziel „Kraft“ gewählt ist
  kraftBereich: { von: 6, bis: 10 },
} as const;

export const STANDARD_PRIORITAETEN: Record<Muskel, Prioritaet> = {
  Brust: 'hoch', Ruecken: 'hoch', Schultern: 'hoch', Bizeps: 'hoch', Trizeps: 'hoch',
  Quadrizeps: 'normal', Gesaess: 'normal', HintereOS: 'normal',
  Bauch: 'niedrig', Waden: 'sehrNiedrig',
};

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  ziele: ['muskelaufbau', 'fitness'],
  level: 'fortgeschritten',
  ueblicheEinheiten: 3,
  standardDauerMin: 40,
  laengerAnbieten: true,
  prioritaeten: STANDARD_PRIORITAETEN,
  zielReserve: '1-3',
  zirkelAnteil: 'alle2Wochen',
  pausenSek: { grund: 90, isolation: 75, supersatz: 75 },
  favoriten: [],
  ausgeschlossen: [],
  einschraenkungen: [],
  onboardingAbgeschlossen: false,
};

// Testtag: Startvarianten (Tabelle im Abschnitt Onboarding). Grenzen = höchstes Ergebnis einer
// Stufe (inklusive); darüber folgt die nächste Variante. vZug: Grenzen gelten ab 1 Wiederholung.
export const TESTTAG = {
  startzielAnteil: 0.7,
  hDruck: { grenzen: [0, 7, 20, 30], varianten: ['knieliegestuetz', 'liegestuetz_erhoeht_haende', 'liegestuetz', 'liegestuetz_fuesse_erhoeht', 'liegestuetz_band'] },
  vZug: { haengenSek: 20, grenzen: [3, 7, 14], varianten: ['scapula_pullups', 'negative_klimmzuege', 'klimmzug_band', 'chinup', 'klimmzug', 'klimmzug_gewicht'] },
  Knie: { grenzen: [14, 30], varianten: ['kniebeuge', 'pausen_kniebeuge', 'goblet_squat'], ersatzOhneLast: 'bss_kg' },
  Rumpf: { grenzen: [29, 60], varianten: ['dead_bug', 'plank', 'hollow_hold'] },
  kalibrierungReserve: 3,
} as const;

// Zeitbudget pro Einheit
export const ZEITBUDGET = {
  aufwaermenMin: 5,
  satzArbeitSek: 45,
  anteilGrundpause: 0.6,
  anteilIsolationspause: 0.4,
  echteSatzdauerAbEinheit: 5,     // gleitender Mittelwert über die letzten 5 Einheiten je Format
  laengerMin: 15,
  laengerBisPrognose: 2,
  // Supersatz-Anteil nach Wochenprognose (1 = so viele wie möglich)
  supersatzAnteil: { 1: 1, 2: 1, 3: 0.5, 4: 0.3, 5: 0.3, 6: 0.3 } as Record<number, number>,
} as const;

// Wochenziel pro Muskel
export const WOCHENZIEL = {
  fraktionelleSaetzeProArbeitssatz: 1.7,
  anteilPrimaer: 1,
  anteilSekundaer: 0.5,
  prioritaet: {
    hoch: { gewicht: 1, untergrenze: 4, grenzeStart: 12, obergrenze: 20 },
    normal: { gewicht: 0.75, untergrenze: 4, grenzeStart: 10, obergrenze: 16 },
    niedrig: { gewicht: 0.5, untergrenze: 2, grenzeStart: 6, obergrenze: 10 },
    sehrNiedrig: { gewicht: 0.3, untergrenze: 2, grenzeStart: 4, obergrenze: 8 },
  } satisfies Record<Prioritaet, { gewicht: number; untergrenze: number; grenzeStart: number; obergrenze: number }>,
  durchschnittWochen: 4,          // Vorschlag der Prognose
  pacingAbStunden: 72,
} as const;

// Erzeugung einer Einheit
export const EINHEIT = {
  maxSaetzeProMuskel: 10,
  zuschlagGrunduebung: 0.3,
  zuschlagFavorit: 0.2,
  abschlagLetzteEinheit: 0.6,
  saetzeProUebung: { min: 2, max: 4 },
  minOffenerBedarf: 0.25,
  maxSaetzeBauchWaden: 3,
  ruhetagUnterSaetzen: 6,
  freiFuerZirkelAbSaetzen: 3,
  finisherMin: { von: 10, bis: 15 },
  mobilityMin: 10,
  maxHauptvarianten: 2,
  zyklusWochen: 6,
} as const;

// Supersatz-Paare in der Reihenfolge der Bildung
export const SUPERSATZ_PAARE: readonly (readonly [readonly MusterId[], readonly MusterId[]])[] = [
  [['hDruck'], ['hZug']],
  [['vDruck'], ['vZug']],
  [['Bizeps'], ['Trizeps']],
  [['Knie', 'Einbein'], ['Rumpf']],
  [['Huefte'], ['Schulter']],
  [['Rumpf'], ['Waden']],
];

// Erholungsfenster: ab dieser Zahl fraktioneller Sätze gilt das Fenster in Stunden
export const ERHOLUNG = {
  fenster: [
    { abSaetzen: 10, stunden: 72 },
    { abSaetzen: 7, stunden: 48 },
    { abSaetzen: 4, stunden: 36 },
    { abSaetzen: 0, stunden: 24 },
  ],
  zuschlagZuSchwerStunden: 24,
} as const;

// Zirkel
export const ZIRKEL = {
  volumenPrimaer: 0.5,
  volumenSekundaer: 0.25,
  abPrognose: 3,
  vorschlagAbAnteilZiel: 0.7,
  stationStufenUnterMuster: 2,
  proWoche: { aus: 0, alle2Wochen: 1, '1proWoche': 1, '2proWoche': 2 },
} as const;

// Progression pro Übung
export const PROGRESSION = {
  reserve: { leicht: 4, passend: 2, passendSchonend: 2.5, schwer: 1 },
  zielReserve: 1,
  zielReserveSchonend: 2,
  e1rmGlaettung: 0.5,
  e1rmTeiler: 30,
  zielPlusPassend: 1,
  zielPlusLeicht: 2,
  dehnungUeberO: 3,
  dehnungLastEnde: 5,
  deutlichVerfehltUnterU: 2,
  eingewoehnungEinheiten: 2,
  kgMaxUeberBestem: 2,
  zeitPlusPassend: 5,
  zeitPlusLeicht: 10,
  neueVarianteReserve: 3,
  zwischenstufeAbStufen: 2,
  tempoAbsenkenSek: 3,
} as const;

// Persönliche Volumengrenze pro Muskel
export const VOLUMENGRENZE = {
  bewertenAbAnteilZiel: 0.8,
  gestiegenUeber: 0.01,
  gleichInnerhalb: 0.01,
  gleichWochen: 2,
  gefallenUeber: 0.03,
  mittelWochen: 2,
  anstrengungHoechstens: 3,
  anstrengungAb: 4,
  schritt: 2,
  minUeberUntergrenze: 2,
  maxUeberBestem: 4,
  bestesAusWochen: 4,
} as const;

// Erholungswochen und Trainingspause
export const ERHOLUNGSWOCHE = {
  musterMitAbfall: 2,
  einheitenInFolge: 2,
  abfallWdh: 2,
  anstrengungWorkouts: 4,
  anstrengungAb: 4.5,
  wochenOhneEntlastung: 10,
  entlastungUnterAnteil: 0.6,
  ueblichesVolumenWochen: 4,
  volumenAnteil: 0.5,
} as const;

export const TRAININGSPAUSE = {
  keineAnpassungBisTage: 7,
  leichtBisTage: 21,
  reserveNachPause: 3,
  wochenzielAnteil: 0.7,
  lastAbschlag: 0.1,
  wochenNachLangerPause: 2,
} as const;

// Max-Tests
export const MAXTEST = {
  abstandTage: 21,
  abstandTageWenigeEinheiten: 28,
  wenigeEinheitenBis: 2,
  weitereSaetzeAnteil: 0.5,
  rotation: ['hDruck', 'vZug', 'Knie', 'Rumpf'] as readonly MusterId[],
} as const;

// Backup
export const BACKUP = {
  format: 'fitness-app-backup',
  schemaVersion: 1,
  erinnerungWochen: 4,
} as const;
