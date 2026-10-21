// Alle Zahlenwerte der Spezifikation an einer Stelle. Es sind Startwerte; Logik steht in src/logik/.
import type { Einstellungen, MusterId, Muskel, Prioritaet } from './logik/typen';

// Nutzerprofil und Onboarding
export const PROFIL = {
  einheitenProWoche: { min: 1, max: 6 },
  dauerMin: { min: 20, max: 90, schritt: 5 },
  // Einstellbare Pausen je Art (Entscheidung 20.10.2026)
  pausenSek: { min: 30, max: 180, schritt: 15 },
  // Musterstufe ohne Testtag
  musterstufeNachLevel: { einsteiger: 3, fortgeschritten: 5, erfahren: 6 },
  // Persönliche Volumengrenze (Start) relativ zur Tabelle „Wochenziel pro Muskel“
  grenzeNachLevel: { einsteiger: -2, fortgeschritten: 0, erfahren: 2 },
  // Bereich für Grundübungen mit Last, wenn das Ziel „Kraft“ gewählt ist
  kraftBereich: { von: 6, bis: 10 },
  // Vorschlag für den Zirkel-Anteil nach den Zielen (nur im Onboarding)
  zirkelMitAusdauer: '1proWoche',
  zirkelSonst: 'alle2Wochen',
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
  minutenProTest: 3,              // geschätzte Dauer je Test (plus Aufwärmen)
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

// Art der Übung nach Muster: Grundübung, Isolation, Zusatz (Bauch und Waden, außerhalb des
// Zeitbudgets) oder Kondition (nur Zirkel und Aufwärmen)
export const MUSTER_ART: Record<MusterId, 'grund' | 'isolation' | 'zusatz' | 'kondition'> = {
  hDruck: 'grund', vDruck: 'grund', hZug: 'grund', vZug: 'grund', Knie: 'grund', Einbein: 'grund', Huefte: 'grund',
  Bizeps: 'isolation', Trizeps: 'isolation', Schulter: 'isolation',
  Rumpf: 'zusatz', Waden: 'zusatz', Kondition: 'kondition',
};

// Fokus-Gruppen; Bauch ist immer erlaubt
export const FOKUS_GRUPPEN: Record<'oben' | 'unten', readonly Muskel[]> = {
  oben: ['Brust', 'Ruecken', 'Schultern', 'Bizeps', 'Trizeps'],
  unten: ['Quadrizeps', 'Gesaess', 'HintereOS', 'Waden'],
};

// Rangfolge der Lasttypen bei der Wahl der Hauptvarianten (kleiner = bevorzugt)
export const LASTTYP_RANG = { Last: 0, Band: 1, KG: 2, Zeit: 3 } as const;

// Ersatz, wenn ein Muster am Ort keine Variante hat (der Reihe nach)
export const ERSATZ: Partial<Record<MusterId, readonly ({ uebung: string } | { muster: MusterId })[]>> = {
  vZug: [{ uebung: 'band_latzug' }, { uebung: 'tischrudern' }, { muster: 'hZug' }],
  Bizeps: [{ uebung: 'chinup' }, { uebung: 'tischrudern' }],
  Schulter: [{ muster: 'vDruck' }],
};

// Sperren nach Körperregion: gesperrte Muster und Übungen; Ausnahmen bleiben erlaubt
export const SPERREN_NACH_REGION: Record<string, { muster: readonly MusterId[]; uebungen: readonly string[]; ausnahmen: readonly string[] }> = {
  schulter: { muster: ['vDruck', 'Schulter'], uebungen: ['dips', 'bank_dips', 'archer_liegestuetz', 'wand_hs_liegestuetz'], ausnahmen: [] },
  ellbogen: { muster: ['Bizeps', 'Trizeps'], uebungen: ['dips', 'bank_dips'], ausnahmen: [] },
  handgelenk: {
    muster: [],
    uebungen: [
      'knieliegestuetz', 'liegestuetz_erhoeht_haende', 'liegestuetz', 'liegestuetz_fuesse_erhoeht', 'liegestuetz_band',
      'ringe_liegestuetz', 'archer_liegestuetz', 'diamond_liegestuetz', 'wand_hs_liegestuetz',
      'pike_liegestuetz', 'pike_erhoeht', 'burpees', 'mountain_climbers',
    ],
    ausnahmen: [],
  },
  untererRuecken: {
    muster: ['Huefte'], uebungen: ['kh_rudern_vorgebeugt', 'lh_rudern'],
    ausnahmen: ['glute_bridge', 'mini_glute_bridge', 'hip_thrust_einbeinig'],
  },
  knie: { muster: ['Knie', 'Einbein'], uebungen: ['sprung_kniebeuge', 'skater', 'burpees', 'kh_thruster'], ausnahmen: [] },
  huefte: { muster: ['Einbein', 'Huefte'], uebungen: ['skater'], ausnahmen: [] },
};

// Erholungsfenster: Fenster der höchsten Stufe, deren Grenze die fraktionellen Sätze der letzten
// Einheit überschreiten; ab 10 Sätzen 72 Std.
export const ERHOLUNG = {
  fenster: [
    { ueberSaetzen: 0, stunden: 24 },
    { ueberSaetzen: 3, stunden: 36 },
    { ueberSaetzen: 6, stunden: 48 },
  ],
  maxFenster: { abSaetzen: 10, stunden: 72 },
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
  startSeitSteigerung: 2,         // neue Variante: keine Eingewöhnung
  // Wenn die Last ausgeht: einseitige Variante desselben Musters (Kennzeichen in der Übungs-ID)
  einseitigKennzeichen: ['einbeinig', 'einarmig'] as readonly string[],
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
  // Ziel-Reserve 3 statt 1: erster Satz der ersten Einheit je Muster weniger (Entscheidung 20.10.2026)
  zielWeniger: 2,
  zeitWeniger: 10,
} as const;

// Max-Tests
export const MAXTEST = {
  abstandTage: 21,
  abstandTageWenigeEinheiten: 28,
  wenigeEinheitenBis: 2,
  weitereSaetzeAnteil: 0.5,
  rotation: ['hDruck', 'vZug', 'Knie', 'Rumpf'] as readonly MusterId[],
  // Übung des Testtags je Muster; spätere Tests nutzen dieselbe Übung wie der letzte Test
  uebungen: { hDruck: 'liegestuetz', vZug: 'klimmzug', Knie: 'kniebeuge', Rumpf: 'plank' } as Partial<Record<MusterId, string>>,
} as const;

// Backup
export const BACKUP = {
  format: 'fitness-app-backup',
  schemaVersion: 1,
  erinnerungWochen: 4,
} as const;

// Trainings-Player (Paket 7)
export const PLAYER = {
  pauseVerlaengernSek: 30,
  reserveHaltenSek: { von: 5, bis: 10 },     // Hinweis bei Halteübungen
  reserveLetzterIsolationssatz: { von: 0, bis: 1 },
  // Signal am Pausenende: drei kurze Töne und Vibration (Millisekunden)
  ton: { frequenzHz: 880, dauerMs: 180, abstandMs: 120, anzahl: 3, lautstaerke: 0.3 },
  vibration: [200, 100, 200, 100, 400],
} as const;

// Bewertung der Übungen mit 1 bis 5 Sternen (Entscheidung 21.10.2026, „ausgewogen“)
export const BEWERTUNG = {
  neutral: 3,                       // ohne Bewertung
  // Zu- und Abschlag in Schritt 6 der Übungswahl
  zuschlag: { 1: 0, 2: -0.2, 3: 0, 4: 0.1, 5: 0.2 },
  // 1 Stern: Ersatz der Hauptvariante mit höchstens 1 Stufe Abstand und mindestens 2 Sternen
  ersatzMaxStufen: 1,
  ersatzMinSterne: 2,
  // Zyklusbeginn: ab 4 Sternen bleibt die Nebenübung; ein Tausch nur gegen mindestens 3 Sterne
  // (bei einer Übung mit 1 oder 2 Sternen genügen 2)
  bleibtAbSterne: 4,
  tauschMinSterne: 3,
} as const;
