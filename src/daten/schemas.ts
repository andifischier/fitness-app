// zod-Schemas für Katalog und Backup. Sie spiegeln src/logik/typen.ts; die Prüfungen am Dateiende
// lassen den Build scheitern, wenn Schema und Typ auseinanderlaufen.
import { z } from 'zod';
import {
  BAND_STUFEN, FEEDBACKS, MUSKELN, MUSTER_IDS, PRIORITAETEN,
  type Einheit, type Einstellungen, type KatalogDatei, type MaxTest, type MuskelZustand,
  type MusterZustand, type Ort, type Uebung, type Utensil, type VarianteZustand, type Woche,
  type ZirkelErgebnis, type Zyklus,
} from '../logik/typen';

const musterId = z.enum(MUSTER_IDS);
const muskel = z.enum(MUSKELN);
const bandStufe = z.enum(BAND_STUFEN);
const zahl = z.number().finite();
const sterne = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const ganzzahl = z.number().int();
const muskelWerte = <T extends z.ZodType>(wert: T) =>
  z.object(Object.fromEntries(MUSKELN.map((m) => [m, wert])) as Record<(typeof MUSKELN)[number], T>);

export const utensilSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), details: z.string(),
  immerVorhanden: z.boolean(), eigenes: z.boolean(),
});

export const uebungSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), muster: musterId,
  primaer: z.array(muskel), sekundaer: z.array(muskel),
  stufe: ganzzahl.min(1).max(10),
  equipment: z.array(z.array(z.string().min(1)).min(1)),
  lasttyp: z.enum(['KG', 'Band', 'Last', 'Zeit']),
  bereich: z.object({ von: zahl.positive(), bis: zahl.positive(), einheit: z.enum(['Wdh.', 'Sek.']) })
    .refine((b) => b.von <= b.bis, 'Bereich: „von“ ist größer als „bis“'),
  unterstuetzend: z.boolean(),
  anzahlGewichte: z.union([z.literal(1), z.literal(2)]).optional(),
  zirkelGeeignet: z.boolean(),
  youtubeUrl: z.string().min(1),
  eigenerVideoLink: z.string().optional(),
  videoId: z.string().regex(/^[\w-]{11}$/).optional(),
  anleitung: z.array(z.string().min(1)).optional(),
  brauchtPlatz: z.boolean().optional(),
  herkunft: z.enum(['katalog', 'eigene']),
});

export const zirkelSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), runden: ganzzahl.positive(), dauerHinweis: z.string(),
  stationen: z.array(z.object({ muster: musterId, vorgabe: z.union([zahl, z.string()]), hinweis: z.string() })).min(1),
});

export const katalogSchema = z.object({
  schemaVersion: z.literal(2),
  utensilien: z.array(utensilSchema),
  uebungen: z.array(uebungSchema),
  zirkel: z.array(zirkelSchema),
  aufwaermen: z.object({
    allgemein: z.object({ immer: z.array(z.string()), oben: z.array(z.string()), unten: z.array(z.string()) }),
    mobility: z.partialRecord(musterId, z.array(z.string())),
    maxMobilityZeilen: ganzzahl.positive(),
    aufwaermsatz: z.object({ anteilLast: zahl.positive().max(1), wdh: ganzzahl.positive() }),
    // „So geht's“ je Aufwärmübung (Name wie in den Zeilen): Verweis auf eine Katalogübung oder eigene Anleitung
    anleitungen: z.record(z.string(), z.object({
      uebungId: z.string().optional(), videoId: z.string().optional(), anleitung: z.array(z.string()).optional(),
    })).optional(),
  }),
});

const kurzhantelSchema = z.discriminatedUnion('modus', [
  z.object({ modus: z.literal('verstellbar'), minKg: zahl.positive(), maxKg: zahl.positive(), schrittKg: zahl.positive() }),
  z.object({ modus: z.literal('paare'), gewichteKg: z.array(zahl.positive()) }),
]);

export const ortSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), standard: z.boolean(),
  equipment: z.array(z.object({
    utensilId: z.string().min(1),
    kurzhanteln: kurzhantelSchema.optional(),
    bandStufen: z.array(bandStufe).optional(),
    gewichteKg: z.array(zahl.positive()).optional(),
    langhantel: z.object({
      stangeKg: zahl.nonnegative(),
      scheiben: z.array(z.object({ kg: zahl.positive(), paare: ganzzahl.positive() })),
    }).optional(),
  })),
});

export const einstellungenSchema = z.object({
  ziele: z.array(z.enum(['muskelaufbau', 'fitness', 'kraft', 'ausdauer'])),
  level: z.enum(['einsteiger', 'fortgeschritten', 'erfahren']),
  ueblicheEinheiten: ganzzahl.min(1).max(6),
  standardDauerMin: ganzzahl.min(20).max(90),
  laengerAnbieten: z.boolean(),
  prioritaeten: muskelWerte(z.enum(PRIORITAETEN)),
  zielReserve: z.enum(['1-3', '2-3']),
  zirkelAnteil: z.enum(['aus', 'alle2Wochen', '1proWoche', '2proWoche']),
  pausenSek: z.object({ grund: zahl.nonnegative(), isolation: zahl.nonnegative(), supersatz: zahl.nonnegative() }),
  favoriten: z.array(z.string()), ausgeschlossen: z.array(z.string()),
  einschraenkungen: z.array(z.object({
    id: z.string().min(1), typ: z.enum(['region', 'muster']), wert: z.string().min(1), bis: z.string().optional(),
  })),
  onboardingAbgeschlossen: z.boolean(),
  platzZumGehen: z.boolean().optional(),
  letztesBackup: z.string().optional(),
  videoLinks: z.record(z.string(), z.string()).optional(),
  bewertungen: z.record(z.string(), sterne).optional(),
  sterneGefragt: z.record(z.string(), z.object({ am: z.string(), ohneAntwort: ganzzahl.nonnegative() })).optional(),
  workouts: z.array(z.object({
    id: z.string().min(1), name: z.string().min(1), art: z.enum(['liste', 'zirkel']), runden: ganzzahl.positive(),
    uebungen: z.array(z.object({ uebungId: z.string().min(1), saetze: ganzzahl.positive(), vorgabe: zahl.positive() })),
  })).optional(),
});

export const varianteSchema = z.object({
  uebungId: z.string().min(1), last: zahl.optional(), bandStufe: bandStufe.optional(),
  zielWdh: zahl, e1rm: zahl.optional(), bestErsterSatz: zahl.optional(),
  seitSteigerung: ganzzahl.nonnegative(), schwerSerie: ganzzahl.nonnegative(), zuletzt: z.string().optional(),
  langsam: z.boolean().optional(),
});

export const musterZustandSchema = z.object({
  muster: musterId, stufe: ganzzahl.min(1).max(10), hauptvarianten: z.array(z.string()),
});

export const muskelZustandSchema = z.object({
  muskel, letzteBelastung: z.string().optional(), letzteDosis: zahl, letzteSchwer: z.boolean(),
  persoenlicheGrenze: zahl, gleichWochen: ganzzahl.nonnegative(),
  leistung: z.array(z.object({ woche: z.string(), wert: zahl })),
});

export const wocheSchema = z.object({
  id: z.string().min(1), prognose: ganzzahl.min(1).max(6), einheiten: ganzzahl.nonnegative(),
  ziele: muskelWerte(zahl), erledigt: muskelWerte(zahl),
  erholungswoche: z.boolean(), laengerAngenommen: z.boolean(), ausgewertet: z.boolean().optional(),
  tage: z.array(ganzzahl.min(0).max(6)).optional(),
});

export const zyklusSchema = z.object({
  nr: ganzzahl.nonnegative(), start: z.string(), ende: z.string().optional(),
  grund: z.enum(['zeitablauf', 'erholungswoche']).optional(),
});

const satzSchema = z.object({
  nr: ganzzahl.positive(), wdh: zahl.optional(), sek: zahl.optional(), last: zahl.optional(),
  bandStufe: bandStufe.optional(), zeit: z.string(),
});

const positionSchema = z.object({
  uebungId: z.string().min(1), saetze: ganzzahl.nonnegative(), zielWdh: zahl, last: zahl.optional(),
  bandStufe: bandStufe.optional(), istMaxTest: z.boolean().optional(), istLasttest: z.boolean().optional(), istErsatz: z.boolean().optional(),
  getauschtVon: z.string().optional(), langsam: z.boolean().optional(), zielFolgesaetze: zahl.optional(), ergebnisse: z.array(satzSchema), feedback: z.enum(FEEDBACKS).optional(),
});

export const einheitSchema = z.object({
  id: z.string().min(1), woche: z.string().min(1), erstelltAm: z.string(),
  gestartetAm: z.string().optional(), beendetAm: z.string().optional(),
  status: z.enum(['geplant', 'laufend', 'abgeschlossen', 'abgebrochen']),
  ortId: z.string(), fokus: z.enum(['ganz', 'oben', 'unten']),
  format: z.enum(['klassisch', 'supersatz', 'mix', 'zirkel', 'test']),
  geschaetzteDauerMin: zahl.nonnegative(),
  aufwaermen: z.array(z.object({ uebungId: z.string(), vorgabe: z.string() })),
  bloecke: z.array(z.object({
    typ: z.enum(['einzeln', 'supersatz', 'zirkel']), positionen: z.array(positionSchema),
    pauseSek: zahl.nonnegative(), zirkelId: z.string().optional(), runden: ganzzahl.positive().optional(),
  })),
  gesamtbewertung: sterne.optional(),
  notiz: z.string().optional(),
  name: z.string().optional(),
  vorher: z.object({
    varianten: z.array(z.object({ uebungId: z.string().min(1), zustand: varianteSchema.optional() })),
    muster: z.array(z.object({ muster: musterId, zustand: musterZustandSchema.optional() })),
  }).optional(),
});

export const zirkelErgebnisSchema = z.object({
  zirkelId: z.string().min(1), ortId: z.string().min(1), datum: z.string().min(1),
  zeitSek: zahl.nonnegative(), varianten: z.array(z.string()),
});

export const maxTestSchema = z.object({
  id: z.string().min(1), datum: z.string(), muster: musterId, uebungId: z.string().min(1),
  ergebnis: zahl.nonnegative(), einheit: z.enum(['Wdh.', 'Sek.']),
});

export const tabellenSchemas = {
  einstellungen: einstellungenSchema,
  orte: ortSchema,
  eigeneUebungen: uebungSchema,
  eigeneUtensilien: utensilSchema,
  varianten: varianteSchema,
  muster: musterZustandSchema,
  muskeln: muskelZustandSchema,
  wochen: wocheSchema,
  zyklen: zyklusSchema,
  einheiten: einheitSchema,
  zirkelErgebnisse: zirkelErgebnisSchema,
  maxTests: maxTestSchema,
} as const;

// Schema und Typ müssen in beide Richtungen zueinander passen.
type Gleich<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const passt = <T extends true>(_: T) => _;
passt<Gleich<z.infer<typeof utensilSchema>, Utensil>>(true);
passt<Gleich<z.infer<typeof uebungSchema>, Uebung>>(true);
passt<Gleich<z.infer<typeof katalogSchema>, KatalogDatei & { schemaVersion: 2 }>>(true);
passt<Gleich<z.infer<typeof ortSchema>, Ort>>(true);
passt<Gleich<z.infer<typeof einstellungenSchema>, Einstellungen>>(true);
passt<Gleich<z.infer<typeof varianteSchema>, VarianteZustand>>(true);
passt<Gleich<z.infer<typeof musterZustandSchema>, MusterZustand>>(true);
passt<Gleich<z.infer<typeof muskelZustandSchema>, MuskelZustand>>(true);
passt<Gleich<z.infer<typeof wocheSchema>, Woche>>(true);
passt<Gleich<z.infer<typeof zyklusSchema>, Zyklus>>(true);
passt<Gleich<z.infer<typeof einheitSchema>, Einheit>>(true);
passt<Gleich<z.infer<typeof zirkelErgebnisSchema>, ZirkelErgebnis>>(true);
passt<Gleich<z.infer<typeof maxTestSchema>, MaxTest>>(true);
