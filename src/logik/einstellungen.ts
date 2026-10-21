// Regeln für die Screens Einstellungen und Übungen: Orte und Equipment, eigene Übungen und
// Utensilien, Favoriten, Ausschlüsse, Video-Links und Einschränkungen. Rein und deterministisch.
import { PROFIL } from '../konfiguration';
import { alleUebungen, uebungMoeglich } from './equipment';
import { hauptvarianten } from './planung';
import { einstellungenVon } from './verlauf';
import {
  MUSTER_IDS, type AppZustand, type Einstellungen, type MusterId, type Ort, type OrtEquipment, type Sterne, type Uebung,
  type Utensil,
} from './typen';

// ---------- Zahlen mit Dezimalkomma ----------

// „2,5“ oder „2.5“ → 2,5; leer oder ungültig → undefined.
export function leseZahl(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
}

// Liste wie „5, 10, 12,5, 20“: Ein Komma zwischen zwei Ziffern ist ein Dezimalkomma, sonst trennen
// Komma, Semikolon oder Leerzeichen. Leer oder ungültig → undefined. Ergebnis aufsteigend, ohne Doppelte.
export function leseZahlen(text: string): number[] | undefined {
  const teile = text.replace(/(\d),(\d)/g, '$1.$2').split(/[;,\s]+/).filter((t) => t !== '');
  if (teile.length === 0) return undefined;
  const zahlen = teile.map(leseZahl);
  if (zahlen.some((z) => z === undefined || z <= 0)) return undefined;
  return [...new Set(zahlen as number[])].sort((a, b) => a - b);
}

export function zahlText(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function zahlenText(zahlen: number[]): string {
  return zahlen.map(zahlText).join(', ');
}

// ---------- IDs ----------

export function kurzname(name: string): string {
  return name.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Neue, noch nicht vergebene ID aus Präfix und Name.
export function neueId(praefix: string, name: string, vergeben: Iterable<string>): string {
  const belegt = new Set(vergeben);
  const basis = `${praefix}${kurzname(name) || 'neu'}`;
  if (!belegt.has(basis)) return basis;
  let n = 2;
  while (belegt.has(`${basis}_${n}`)) n++;
  return `${basis}_${n}`;
}

const gleicherName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ---------- Orte und Equipment ----------

// Utensilien mit Pflichtangaben (Gewichte oder Stufen)
export const UTENSILIEN_MIT_DETAILS = ['KH', 'BAND', 'MINI', 'KB', 'LH'] as const;

export function alleUtensilien(z: AppZustand): Utensil[] {
  return [...z.katalog.utensilien, ...z.eigeneUtensilien];
}

export function hatDetails(utensilId: string): boolean {
  return (UTENSILIEN_MIT_DETAILS as readonly string[]).includes(utensilId);
}

// Neuer Ort mit den immer vorhandenen Utensilien; der erste Ort wird Standard.
export function neuerOrt(z: AppZustand, name: string): Ort {
  return {
    id: neueId('ort_', name, z.orte.map((o) => o.id)),
    name,
    standard: z.orte.length === 0,
    equipment: z.katalog.utensilien.filter((u) => u.immerVorhanden).map((u) => ({ utensilId: u.id })),
  };
}

export function equipmentVon(ort: Ort, utensilId: string): OrtEquipment | undefined {
  return ort.equipment.find((e) => e.utensilId === utensilId);
}

// Utensil an- oder abwählen; neu angewählte Utensilien starten ohne Detailangaben.
export function mitUtensil(ort: Ort, utensilId: string, an: boolean): Ort {
  const ohne = ort.equipment.filter((e) => e.utensilId !== utensilId);
  if (!an) return { ...ort, equipment: ohne };
  if (equipmentVon(ort, utensilId)) return ort;
  return { ...ort, equipment: [...ohne, { utensilId }] };
}

export function mitDetails(ort: Ort, utensilId: string, teil: Omit<Partial<OrtEquipment>, 'utensilId'>): Ort {
  return {
    ...ort,
    equipment: ort.equipment.map((e) => (e.utensilId === utensilId ? { ...e, ...teil } : e)),
  };
}

// Die UI zeigt eine Zeile „Hantelbank“: flach = BANK, verstellbar = SCHRAEG (schließt flach ein).
export type Hantelbank = 'keine' | 'flach' | 'verstellbar';

export function hantelbank(ort: Ort): Hantelbank {
  if (equipmentVon(ort, 'SCHRAEG')) return 'verstellbar';
  if (equipmentVon(ort, 'BANK')) return 'flach';
  return 'keine';
}

export function mitHantelbank(ort: Ort, wahl: Hantelbank): Ort {
  const ohne = mitUtensil(mitUtensil(ort, 'BANK', false), 'SCHRAEG', false);
  if (wahl === 'flach') return mitUtensil(ohne, 'BANK', true);
  if (wahl === 'verstellbar') return mitUtensil(ohne, 'SCHRAEG', true);
  return ohne;
}

// Genau ein Ort ist Standard.
export function mitStandard(orte: Ort[], ortId: string): Ort[] {
  return orte.map((o) => ({ ...o, standard: o.id === ortId }));
}

export interface OrtFehler { utensilId?: string; text: string }

const positiv = (n: number | undefined) => n !== undefined && Number.isFinite(n) && n > 0;

// Prüft Name und Pflichtangaben; ohne Fehler lässt sich der Ort speichern.
export function pruefeOrt(ort: Ort, andereOrte: Ort[]): OrtFehler[] {
  const fehler: OrtFehler[] = [];
  if (ort.name.trim() === '') fehler.push({ text: 'Gib dem Ort einen Namen.' });
  else if (andereOrte.some((o) => o.id !== ort.id && gleicherName(o.name, ort.name))) {
    fehler.push({ text: 'Einen Ort mit diesem Namen gibt es schon.' });
  }
  for (const e of ort.equipment) {
    const id = e.utensilId;
    if (id === 'KH') {
      const k = e.kurzhanteln;
      if (!k) fehler.push({ utensilId: id, text: 'Gib die Gewichte der Kurzhanteln an.' });
      else if (k.modus === 'verstellbar') {
        if (!positiv(k.minKg) || !positiv(k.maxKg) || !positiv(k.schrittKg)) {
          fehler.push({ utensilId: id, text: 'Gib Min., Max. und Schritt der Kurzhanteln an.' });
        } else if (k.minKg > k.maxKg) {
          fehler.push({ utensilId: id, text: 'Bei den Kurzhanteln ist Min. größer als Max.' });
        }
      } else if (k.gewichteKg.length === 0 || !k.gewichteKg.every(positiv)) {
        fehler.push({ utensilId: id, text: 'Gib die Gewichte der Kurzhantel-Paare an.' });
      }
    }
    if ((id === 'BAND' || id === 'MINI') && !(e.bandStufen && e.bandStufen.length > 0)) {
      fehler.push({ utensilId: id, text: id === 'BAND' ? 'Wähle die Stufen der Widerstandsbänder.' : 'Wähle die Stufen der Mini-Bänder.' });
    }
    if (id === 'KB' && !(e.gewichteKg && e.gewichteKg.length > 0 && e.gewichteKg.every(positiv))) {
      fehler.push({ utensilId: id, text: 'Gib die Gewichte der Kettlebells an.' });
    }
    if (id === 'LH') {
      const l = e.langhantel;
      const stangeOk = l !== undefined && Number.isFinite(l.stangeKg) && l.stangeKg >= 0;
      const scheibenOk = l !== undefined && l.scheiben.length > 0
        && l.scheiben.every((s) => positiv(s.kg) && Number.isInteger(s.paare) && s.paare > 0);
      if (!stangeOk || !scheibenOk) fehler.push({ utensilId: id, text: 'Gib Stange und Scheiben der Langhantel an.' });
    }
  }
  return fehler;
}

// Katalog- und eigene Übungen, deren Equipment am Ort vorhanden ist (ohne Ausschlüsse).
export function moeglicheUebungen(z: AppZustand, ort: Ort): Uebung[] {
  return alleUebungen(z).filter((u) => uebungMoeglich(ort, u));
}

// Muster, die am Ort weder eine Variante noch einen Ersatz haben (nur Equipment zählt).
export function fehlendeMuster(z: AppZustand, ort: Ort): MusterId[] {
  const e: Einstellungen = { ...einstellungenVon(z), einschraenkungen: [], ausgeschlossen: [] };
  const ohneGespeicherte: AppZustand = { ...z, muster: [] };
  return MUSTER_IDS.filter((m) => hauptvarianten(ohneGespeicherte, m, ort, '2000-01-01T00:00:00', e).length === 0);
}

// ---------- Löschen nur, solange nie genutzt (Entscheidung 20.10.2026) ----------

// Jede gespeicherte Einheit zählt, auch eine geplante: Sie verweist auf Ort und Übungen.
export function ortGenutzt(z: AppZustand, ortId: string): boolean {
  return z.einheiten.some((e) => e.ortId === ortId) || z.zirkelErgebnisse.some((r) => r.ortId === ortId);
}

export function uebungGenutzt(z: AppZustand, uebungId: string): boolean {
  return z.einheiten.some((e) => e.bloecke.some((b) => b.positionen.some(
    (p) => p.uebungId === uebungId || p.getauschtVon === uebungId,
  )))
    || z.varianten.some((v) => v.uebungId === uebungId)
    || z.muster.some((m) => m.hauptvarianten.includes(uebungId))
    || z.maxTests.some((t) => t.uebungId === uebungId)
    || z.zirkelErgebnisse.some((r) => r.varianten.includes(uebungId));
}

// Ein eigenes Utensil ist in Gebrauch, solange ein gespeicherter Ort oder eine eigene Übung es nutzt.
export function utensilGenutzt(z: AppZustand, utensilId: string): boolean {
  return z.orte.some((o) => o.equipment.some((e) => e.utensilId === utensilId))
    || z.eigeneUebungen.some((u) => u.equipment.flat().includes(utensilId));
}

export function neuesUtensil(z: AppZustand, name: string): Utensil {
  return {
    id: neueId('eigen_', name, alleUtensilien(z).map((u) => u.id)),
    name: name.trim(), details: 'keine', immerVorhanden: false, eigenes: true,
  };
}

export function pruefeUtensilName(z: AppZustand, name: string): string | undefined {
  if (name.trim() === '') return 'Gib dem Utensil einen Namen.';
  if (alleUtensilien(z).some((u) => gleicherName(u.name, name))) return 'Ein Utensil mit diesem Namen gibt es schon.';
  return undefined;
}

// ---------- Eigene Übungen ----------

export function youtubeSuche(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name.trim()} richtige Ausführung`).replace(/%20/g, '+')}`;
}

// Entwurf aus einer Vorlage: alle Angaben übernommen, Name leer (Entscheidung 20.10.2026).
export function entwurfAusVorlage(vorlage: Uebung): Uebung {
  const { eigenerVideoLink: _, ...rest } = vorlage;
  return {
    ...rest, id: '', name: '', herkunft: 'eigene',
    primaer: [...vorlage.primaer], sekundaer: [...vorlage.sekundaer],
    equipment: vorlage.equipment.map((g) => [...g]), bereich: { ...vorlage.bereich },
  };
}

// Bringt abhängige Felder in eine gültige Form (Einheit des Bereichs, Bandunterstützung,
// Zahl der Gewichte, leere Equipment-Gruppen, Muskeln nicht doppelt).
export function normalisiereUebung(u: Uebung): Uebung {
  const n: Uebung = {
    ...u,
    name: u.name.trim(),
    sekundaer: u.sekundaer.filter((m) => !u.primaer.includes(m)),
    // Eine verstellbare Bank erfüllt jede Anforderung an eine flache Bank (Katalogregel).
    equipment: u.equipment.map((g) => [...new Set(g.includes('BANK') ? [...g, 'SCHRAEG'] : g)]).filter((g) => g.length > 0),
    bereich: { ...u.bereich, einheit: u.lasttyp === 'Zeit' ? 'Sek.' : 'Wdh.' },
    unterstuetzend: u.lasttyp === 'Band' && u.unterstuetzend,
  };
  const mitHantel = n.equipment.some((g) => g.includes('KH') || g.includes('KB'));
  if (n.lasttyp === 'Last' && mitHantel) n.anzahlGewichte = u.anzahlGewichte ?? 2;
  else delete n.anzahlGewichte;
  if (!n.eigenerVideoLink) delete n.eigenerVideoLink;
  return n;
}

const ganz = (n: number) => Number.isInteger(n);

export function pruefeEigeneUebung(z: AppZustand, entwurf: Uebung): string[] {
  const u = normalisiereUebung(entwurf);
  const fehler: string[] = [];
  if (u.name === '') fehler.push('Gib der Übung einen Namen.');
  else if (alleUebungen(z).some((x) => x.id !== u.id && gleicherName(x.name, u.name))) {
    fehler.push('Eine Übung mit diesem Namen gibt es schon.');
  }
  if (u.muster !== 'Kondition' && u.primaer.length === 0) fehler.push('Wähle mindestens einen Hauptmuskel.');
  if (!ganz(u.stufe) || u.stufe < 1 || u.stufe > 10) fehler.push('Die Schwierigkeit muss zwischen 1 und 10 liegen.');
  const { von, bis } = u.bereich;
  if (!ganz(von) || !ganz(bis) || von < 1 || bis < 1) fehler.push('Gib den Bereich als ganze Zahlen an.');
  else if (von > bis) fehler.push('Beim Bereich ist „von“ größer als „bis“.');
  const bekannt = new Set(alleUtensilien(z).map((x) => x.id));
  if (u.equipment.flat().some((id) => !bekannt.has(id))) fehler.push('Ein Utensil gibt es nicht mehr.');
  if (u.eigenerVideoLink !== undefined && !istVideoLink(u.eigenerVideoLink)) fehler.push('Der Video-Link muss mit https:// beginnen.');
  return fehler;
}

// Fertige eigene Übung zum Speichern: neue ID (bei neuen Übungen) und YouTube-Suche zum Namen.
export function fertigeUebung(z: AppZustand, entwurf: Uebung): Uebung {
  const u = normalisiereUebung(entwurf);
  const id = u.id || neueId('eigen_', u.name, alleUebungen(z).map((x) => x.id));
  return { ...u, id, herkunft: 'eigene', youtubeUrl: youtubeSuche(u.name) };
}

// ---------- Favoriten, Ausschlüsse, Video-Links ----------

// Favorit und Ausschluss schließen sich aus.
export function mitFavorit(e: Einstellungen, uebungId: string, an: boolean): Einstellungen {
  const favoriten = e.favoriten.filter((id) => id !== uebungId);
  return {
    ...e,
    favoriten: an ? [...favoriten, uebungId] : favoriten,
    ausgeschlossen: an ? e.ausgeschlossen.filter((id) => id !== uebungId) : e.ausgeschlossen,
  };
}

export function mitAusschluss(e: Einstellungen, uebungId: string, an: boolean): Einstellungen {
  const ausgeschlossen = e.ausgeschlossen.filter((id) => id !== uebungId);
  return {
    ...e,
    ausgeschlossen: an ? [...ausgeschlossen, uebungId] : ausgeschlossen,
    favoriten: an ? e.favoriten.filter((id) => id !== uebungId) : e.favoriten,
  };
}

export function istVideoLink(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Eigener Link hat Vorrang vor der YouTube-Suche.
export function videoLinkVon(e: Einstellungen, u: Uebung): string {
  return u.eigenerVideoLink ?? e.videoLinks?.[u.id] ?? u.youtubeUrl;
}

export function eigenerLinkVon(e: Einstellungen, u: Uebung): string | undefined {
  return u.herkunft === 'eigene' ? u.eigenerVideoLink : e.videoLinks?.[u.id];
}

// Video-Link einer Katalogübung setzen oder (mit undefined) entfernen.
export function mitVideoLink(e: Einstellungen, uebungId: string, link: string | undefined): Einstellungen {
  const { [uebungId]: _, ...rest } = e.videoLinks ?? {};
  const videoLinks = link ? { ...rest, [uebungId]: link.trim() } : rest;
  const neu: Einstellungen = { ...e, videoLinks };
  if (Object.keys(videoLinks).length === 0) delete neu.videoLinks;
  return neu;
}

// Bewertungen setzen (die letzte zählt); undefined entfernt die Bewertung einer Übung.
export function mitBewertungen(e: Einstellungen, neu: Record<string, Sterne | undefined>): Einstellungen {
  const bewertungen = { ...e.bewertungen };
  for (const [id, sterne] of Object.entries(neu)) {
    if (sterne === undefined) delete bewertungen[id];
    else bewertungen[id] = sterne;
  }
  const ergebnis: Einstellungen = { ...e, bewertungen };
  if (Object.keys(bewertungen).length === 0) delete ergebnis.bewertungen;
  return ergebnis;
}

// Entfernt alle Verweise der Einstellungen auf eine gelöschte eigene Übung.
export function ohneUebung(e: Einstellungen, uebungId: string): Einstellungen {
  return mitBewertungen(mitVideoLink(mitAusschluss(mitFavorit(e, uebungId, false), uebungId, false), uebungId, undefined),
    { [uebungId]: undefined });
}

// ---------- Einschränkungen ----------

export type Einschraenkung = Einstellungen['einschraenkungen'][number];

export function sperreAktiv(s: Einschraenkung, jetzt: string): boolean {
  return !s.bis || s.bis.slice(0, 10) >= jetzt.slice(0, 10);
}

export function mitEinschraenkung(e: Einstellungen, s: Omit<Einschraenkung, 'id'>): Einstellungen {
  const id = neueId('sperre_', s.wert, e.einschraenkungen.map((x) => x.id));
  const neu: Einschraenkung = { id, typ: s.typ, wert: s.wert, ...(s.bis ? { bis: s.bis } : {}) };
  return { ...e, einschraenkungen: [...e.einschraenkungen, neu] };
}

export function ohneEinschraenkung(e: Einstellungen, id: string): Einstellungen {
  return { ...e, einschraenkungen: e.einschraenkungen.filter((s) => s.id !== id) };
}

// Zirkel-Anteil als Startwert nach den Zielen: Ausdauer oder Fitness allgemein ⇒ 1x pro Woche.
export function zirkelAnteilFuerZiele(ziele: Einstellungen['ziele']): Einstellungen['zirkelAnteil'] {
  return ziele.includes('ausdauer') || ziele.includes('fitness') ? PROFIL.zirkelMitAusdauer : PROFIL.zirkelSonst;
}
