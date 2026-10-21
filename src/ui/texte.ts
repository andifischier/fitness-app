// Anzeigenamen für IDs aus Datenmodell und Konfiguration (Deutsch, kurz).
import { PLAYER, PROGRESSION } from '../konfiguration';
import type { NaechstesMal, Rekord } from '../logik/progression';
import type {
  AppZustand, BandStufe, Einheit, Einstellungen, Feedback, MusterId, Muskel, Prioritaet, Uebung, Utensil,
} from '../logik/typen';
import { uebungVon } from '../logik/verlauf';

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

export const FOKUS_NAMEN: Record<'ganz' | 'oben' | 'unten', string> = {
  ganz: 'Ganzkörper', oben: 'Oberkörper', unten: 'Unterkörper',
};

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const tagVon = (iso: string) => {
  const [j = 0, m = 1, t = 1] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, t));
};

// „2026-10-20T…“ → „Dienstag, 20. Oktober“
export function datumLang(iso: string): string {
  const d = tagVon(iso);
  return `${WOCHENTAGE[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]}`;
}

// Ab wann etwas fällig ist: „ab heute“, „ab morgen“, „ab Donnerstag“ (innerhalb einer Woche), sonst „ab 12.11.“
export function abText(ab: string, jetzt: string): string {
  const tage = Math.round((tagVon(ab).getTime() - tagVon(jetzt).getTime()) / 86_400_000);
  if (tage <= 0) return 'ab heute';
  if (tage === 1) return 'ab morgen';
  if (tage < 7) return `ab ${WOCHENTAGE[tagVon(ab).getUTCDay()]}`;
  const [, m, t] = ab.slice(0, 10).split('-');
  return `ab ${t}.${m}.`;
}

// Sekunden als „12:05“
export function zeitText(sek: number): string {
  const s = Math.round(sek);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Fraktionelle Sätze mit Dezimalkomma, auf halbe Sätze gerundet: „4,5“
export function saetzeText(n: number): string {
  return String(Math.round(n * 2) / 2).replace('.', ',');
}

// Lastanzeige laut Spezifikation „Equipment und Gewichtsstufen“
export function lastText(u: Uebung, werte: { last?: number; bandStufe?: BandStufe }): string | undefined {
  if (werte.bandStufe) return `${u.unterstuetzend ? 'Unterstützung: ' : ''}Band ${BAND_NAMEN[werte.bandStufe]}`;
  if (werte.last === undefined) return undefined;
  const kg = `${String(Math.round(werte.last * 100) / 100).replace('.', ',')} kg`;
  const braucht = (id: string) => u.equipment.some((g) => g.includes(id));
  if (braucht('LH')) return `${kg} gesamt`;
  if (braucht('STANGE')) return `+${kg}`;
  return u.anzahlGewichte === 2 ? `${kg} je Hand` : kg;
}

// Lastanzeige zweigeteilt für das Training: große Zahl und Zusatz („16 kg“ und „je Hand“).
export function lastTeile(u: Uebung, werte: { last?: number; bandStufe?: BandStufe }):
  { titel: string; gross: string; klein?: string } | undefined {
  if (werte.bandStufe) {
    return { titel: 'Band', gross: BAND_NAMEN[werte.bandStufe], ...(u.unterstuetzend ? { klein: 'zur Unterstützung' } : {}) };
  }
  const text = lastText(u, werte);
  if (!text) return undefined;
  const [gross, ...rest] = text.split(' kg');
  const klein = rest.join(' kg').trim();
  if (gross!.startsWith('+')) return { titel: 'Gewicht', gross: `${gross} kg`, klein: 'zusätzlich' };
  return { titel: 'Gewicht', gross: `${gross} kg`, ...(klein ? { klein } : {}) };
}

// Muskelgruppen einer Einheit für die Kurzbeschreibung („Brust, Rücken, Beine, Arme“)
const GRUPPEN: [string, Muskel[]][] = [
  ['Brust', ['Brust']], ['Rücken', ['Ruecken']], ['Schultern', ['Schultern']], ['Arme', ['Bizeps', 'Trizeps']],
  ['Beine', ['Quadrizeps', 'Gesaess', 'HintereOS', 'Waden']], ['Bauch', ['Bauch']],
];

export function muskelgruppenText(muskeln: Iterable<Muskel>): string {
  const alle = new Set(muskeln);
  return GRUPPEN.filter(([, ms]) => ms.some((m) => alle.has(m))).map(([name]) => name).join(', ');
}

// ---------- Übungsfeedback und Abschluss (Paket 8) ----------

// Die drei Buttons mit Definition; Halteübungen in Sekunden (Entscheidung 21.10.2026).
export function feedbackOptionen(inSek: boolean): { wert: Feedback; titel: string; text: string }[] {
  const h = PLAYER.reserveHaltenSek.bis;
  return inSek
    ? [
      { wert: 'leicht', titel: 'Zu leicht', text: `Mehr als ${h} Sekunden wären noch gegangen` },
      { wert: 'passend', titel: 'Passend', text: `Bis ${h} Sekunden wären noch gegangen` },
      { wert: 'schwer', titel: 'Zu schwer', text: 'Ziel nicht geschafft oder Haltung brach ein' },
    ]
    : [
      { wert: 'leicht', titel: 'Zu leicht', text: '4 oder mehr Wiederholungen wären noch gegangen' },
      { wert: 'passend', titel: 'Passend', text: '1 bis 3 Wiederholungen wären noch gegangen' },
      { wert: 'schwer', titel: 'Zu schwer', text: 'Ziel nicht geschafft oder Technik brach ein' },
    ];
}

// Folgetext unter dem Feedback: „Nächstes Mal: 16 kg je Hand, Ziel 11 im ersten Satz.“
export function naechstesMalText(u: Uebung, n: NaechstesMal): string {
  if (n.kalibrierung) return `Nächstes Mal: ${u.name}, das Gewicht wählst du im ersten Satz.`;
  const ziel = `Ziel ${n.zielWdh}${u.bereich.einheit === 'Sek.' ? ' Sek.' : ''} im ersten Satz`;
  const teile = [n.neueVariante ? u.name : undefined, lastText(u, n), ziel].filter(Boolean).join(', ');
  return `Nächstes Mal: ${teile}.${n.langsam ? ` ${PROGRESSION.tempoAbsenkenSek} Sek. absenken.` : ''}`;
}

const kgZahl = (kg: number) => `${String(Math.round(kg * 100) / 100).replace('.', ',')} kg`;

// Zeile eines Rekords im Abschluss: Name und Wert („18 kg × 10“, „12 Wdh.“, „Max-Test 25 Wdh.“, „11:40“).
export function rekordZeile(z: AppZustand, einheit: Einheit, r: Rekord): { name: string; wert: string } {
  if (r.art === 'zirkel') {
    return { name: z.katalog.zirkel.find((x) => x.id === r.zirkelId)?.name ?? 'Zirkel', wert: zeitText(r.wert) };
  }
  const u = r.uebungId ? uebungVon(z, r.uebungId) : undefined;
  const name = u?.name ?? r.uebungId ?? '';
  const einheitText = u?.bereich.einheit ?? 'Wdh.';
  if (r.art === 'maxTest') return { name, wert: `Max-Test ${r.wert} ${einheitText}` };
  if (r.art === 'kraft') {
    // Bester Satz: höchste Kraftschätzung (die Reserve ist für alle Sätze einer Übung gleich).
    const p = einheit.bloecke.flatMap((b) => b.positionen).find((x) => x.uebungId === r.uebungId && !x.istMaxTest);
    const saetze = (p?.ergebnisse ?? []).map((s) => ({ kg: s.last ?? p?.last, wdh: s.wdh ?? 0 }))
      .filter((s): s is { kg: number; wdh: number } => s.kg !== undefined);
    const bester = saetze.reduce<{ kg: number; wdh: number } | undefined>(
      (b, s) => (!b || s.kg * (1 + s.wdh / PROGRESSION.e1rmTeiler) > b.kg * (1 + b.wdh / PROGRESSION.e1rmTeiler) ? s : b), undefined);
    return { name, wert: bester ? `${kgZahl(bester.kg)} × ${bester.wdh}` : kgZahl(r.wert) };
  }
  return { name, wert: `${r.wert} ${r.art === 'sekunden' ? 'Sek.' : 'Wdh.'}` };
}
