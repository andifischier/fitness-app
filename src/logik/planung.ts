// Planungsmodul laut Spezifikation, Abschnitt „Planungslogik“. Rein und deterministisch: Die
// aktuelle Zeit wird übergeben; der Zustand wird nur gelesen, nie verändert.
import {
  BEWERTUNG, ERHOLUNGSWOCHE, EINHEIT, ERSATZ, FOKUS_GRUPPEN, LASTTYP_RANG, MAXTEST, MUSTER_ART, PROFIL,
  SUPERSATZ_PAARE, TRAININGSPAUSE, WOCHENZIEL, ZEITBUDGET, ZIRKEL,
} from '../konfiguration';
import { isoWoche, plusTage, stundenZwischen, verbleibendeTage, wochenNummer } from './datum';
import {
  alleUebungen, bandStufen, hatAktiveSperre, hatUtensil, istGesperrt, lastraster, uebungErlaubt, uebungMoeglich,
} from './equipment';
import {
  BAND_STUFEN, MUSKELN, MUSTER_IDS, type AppZustand, type BandStufe, type Block, type Einheit, type Einstellungen,
  type Muskel, type MusterId, type Ort, type Position, type Uebung, type Zirkel,
} from './typen';
import {
  einstellungenVon, faelligerMaxTest, fertigeEinheiten, istErholt, letzteEinheitZeit, seitRueckkehrTrainiert,
  sterneVon, trainingspause, uebungVon, wdhBei, zielReserve, type Pause,
} from './verlauf';

export { einstellungenVon, erholungsfenster, istErholt } from './verlauf';

type ProMuskel = Record<Muskel, number>;
type Fokus = Einheit['fokus'];
type Format = Einheit['format'];

export interface Kandidat { uebung: Uebung; istErsatz: boolean }
export interface Startwerte { zielWdh: number; last?: number; bandStufe?: BandStufe; langsam?: boolean }
export interface StartfragenErgebnis {
  prognoseAbfragen: boolean; prognoseVorschlag: number; ortId: string;
  morgenWiederVorschlag: boolean; laengerAnbieten: boolean; ruhetagEmpfohlen: boolean;
  zirkelVorschlag: boolean; finisherAnbieten: boolean;
}
export interface EinheitEingabe {
  jetzt: string; ortId: string; prognose: number; morgenWieder: boolean; laenger: boolean; zirkelId?: string;
  erholungswoche?: boolean;         // angenommene Erholungswoche, solange die Woche noch nicht gespeichert ist
}

const leer = (): ProMuskel => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as ProMuskel;
const begrenze = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

const hauptmuskel = (u: Uebung): Muskel | undefined => u.primaer[0];
const istGrund = (u: Uebung) => MUSTER_ART[u.muster] === 'grund';

export function gewicht(e: Einstellungen, m: Muskel): number {
  return WOCHENZIEL.prioritaet[e.prioritaeten[m]].gewicht;
}

// Beitrag einer Übung pro Satz zu jedem Muskel (fraktionelle Sätze).
function beitrag(u: Uebung, primaer: number = WOCHENZIEL.anteilPrimaer, sekundaer: number = WOCHENZIEL.anteilSekundaer) {
  return [
    ...u.primaer.map((m) => [m, primaer] as const),
    ...u.sekundaer.map((m) => [m, sekundaer] as const),
  ];
}

// ---------- Zeitbudget ----------

function supersatzAnteil(prognose: number): number {
  return ZEITBUDGET.supersatzAnteil[begrenze(Math.round(prognose), PROFIL.einheitenProWoche.min, PROFIL.einheitenProWoche.max)] ?? 0;
}

function erwartetesFormat(anteil: number): Format {
  return anteil >= 1 ? 'supersatz' : anteil > 0 ? 'mix' : 'klassisch';
}

// Echte Satzdauer in Sekunden: gleitender Mittelwert der letzten Einheiten dieses Formats.
export function echteSatzdauer(z: AppZustand, format: Format): number | undefined {
  const anzahl = ZEITBUDGET.echteSatzdauerAbEinheit;
  const werte = fertigeEinheiten(z)
    .filter((e) => e.status === 'abgeschlossen' && e.format === format && e.gestartetAm && e.beendetAm)
    .slice(-anzahl)
    .map((e) => {
      const saetze = e.bloecke.reduce((s, b) => s + b.positionen.reduce((t, p) => t + p.ergebnisse.length, 0), 0);
      const sek = stundenZwischen(e.gestartetAm!, e.beendetAm!) * 3600 - ZEITBUDGET.aufwaermenMin * 60;
      return saetze > 0 && sek > 0 ? sek / saetze : undefined;
    })
    .filter((w): w is number => w !== undefined);
  return werte.length >= anzahl ? werte.reduce((a, b) => a + b, 0) / werte.length : undefined;
}

function satzdauerKlassisch(e: Einstellungen): number {
  return ZEITBUDGET.satzArbeitSek + ZEITBUDGET.anteilGrundpause * e.pausenSek.grund
    + ZEITBUDGET.anteilIsolationspause * e.pausenSek.isolation;
}

function satzdauerSupersatz(e: Einstellungen): number {
  return (2 * ZEITBUDGET.satzArbeitSek + e.pausenSek.supersatz) / 2;
}

// Arbeitssätze pro Einheit ohne Bauch und Waden.
export function arbeitssaetze(z: AppZustand, prognose: number, minuten: number): number {
  const e = einstellungenVon(z);
  const anteil = supersatzAnteil(prognose);
  const dauer = echteSatzdauer(z, erwartetesFormat(anteil))
    ?? anteil * satzdauerSupersatz(e) + (1 - anteil) * satzdauerKlassisch(e);
  return Math.max(0, Math.floor(((minuten - ZEITBUDGET.aufwaermenMin) * 60) / dauer));
}

// ---------- Wochenziel ----------

export function persoenlicheGrenze(z: AppZustand, e: Einstellungen, m: Muskel): number {
  const gespeichert = z.muskeln.find((x) => x.muskel === m)?.persoenlicheGrenze;
  return gespeichert ?? WOCHENZIEL.prioritaet[e.prioritaeten[m]].grenzeStart + PROFIL.grenzeNachLevel[e.level];
}

export function istErholungswoche(z: AppZustand, jetzt: string, angenommen = false): boolean {
  return z.wochen.find((w) => w.id === isoWoche(jetzt))?.erholungswoche ?? angenommen;
}

// Erholungswoche 50 %; nach einer Trainingspause 70 % (über 21 Tage zwei Wochen lang).
export function wochenzielFaktor(z: AppZustand, jetzt: string, erholungswoche = false): number {
  if (istErholungswoche(z, jetzt, erholungswoche)) return ERHOLUNGSWOCHE.volumenAnteil;
  const pause = trainingspause(z, jetzt);
  if (!pause) return 1;
  const wochen = pause.tage > TRAININGSPAUSE.leichtBisTage ? TRAININGSPAUSE.wochenNachLangerPause : 1;
  const ab = isoWoche(pause.rueckkehr);
  const bis = isoWoche(plusTage(pause.rueckkehr, 7 * (wochen - 1)));
  const woche = isoWoche(jetzt);
  return woche >= ab && woche <= bis ? TRAININGSPAUSE.wochenzielAnteil : 1;
}

export function wochenziele(z: AppZustand, prognose: number, ortId: string, jetzt: string, erholungswoche = false): ProMuskel {
  const e = einstellungenVon(z);
  const faktor = wochenzielFaktor(z, jetzt, erholungswoche);
  const budget = prognose * arbeitssaetze(z, prognose, e.standardDauerMin) * WOCHENZIEL.fraktionelleSaetzeProArbeitssatz;
  const summe = MUSKELN.reduce((s, m) => s + gewicht(e, m), 0);
  const ziele = leer();
  for (const m of MUSKELN) {
    const p = WOCHENZIEL.prioritaet[e.prioritaeten[m]];
    ziele[m] = Math.round(faktor * Math.min(persoenlicheGrenze(z, e, m), p.obergrenze,
      Math.max(p.untergrenze, (budget * gewicht(e, m)) / summe)));
  }
  const ort = z.orte.find((o) => o.id === ortId);
  if (ort && hatAktiveSperre(e, jetzt)) {
    // Fällt durch eine Sperre jede Übung weg, in der ein Muskel primär ist, ist sein Ziel 0.
    const ohneSperren = { ...e, einschraenkungen: [] };
    const vorher = primaerAbgedeckt(z, ohneSperren, ort, jetzt);
    const nachher = primaerAbgedeckt(z, e, ort, jetzt);
    for (const m of vorher) if (!nachher.has(m)) ziele[m] = 0;
  }
  return ziele;
}

function primaerAbgedeckt(z: AppZustand, e: Einstellungen, ort: Ort, jetzt: string): Set<Muskel> {
  const muskeln = new Set<Muskel>();
  for (const muster of MUSTER_IDS) {
    if (MUSTER_ART[muster] === 'kondition') continue;
    for (const k of hauptvarianten(z, muster, ort, jetzt, e)) k.uebung.primaer.forEach((m) => muskeln.add(m));
  }
  return muskeln;
}

// ---------- Volumen ----------

// Fraktionelle Sätze pro Muskel; geplante Einheiten zählen die geplanten, sonst die erledigten Sätze.
export function dosisProMuskel(z: AppZustand, einheit: Einheit): ProMuskel {
  const dosis = leer();
  for (const block of einheit.bloecke) {
    for (const p of block.positionen) {
      const u = uebungVon(z, p.uebungId);
      if (!u) continue;
      if (block.typ === 'zirkel') {
        // Ein abgebrochener Zirkel zählt nur die erledigten Runden.
        const runden = einheit.status === 'abgebrochen' ? p.ergebnisse.length : block.runden ?? p.saetze;
        for (const [m, v] of beitrag(u, ZIRKEL.volumenPrimaer, ZIRKEL.volumenSekundaer)) dosis[m] += runden * v;
      } else {
        const saetze = einheit.status === 'geplant' ? p.saetze : p.ergebnisse.length;
        for (const [m, v] of beitrag(u)) dosis[m] += saetze * v;
      }
    }
  }
  return dosis;
}

// ---------- Hauptvarianten ----------

export function musterstufe(z: AppZustand, e: Einstellungen, muster: MusterId): number {
  return z.muster.find((x) => x.muster === muster)?.stufe ?? PROFIL.musterstufeNachLevel[e.level];
}

// Rangfolge: Favorit; Varianten mit 1 Stern ans Ende; Abstand zur Musterstufe; mehr Sterne;
// Lasttyp; Katalogreihenfolge.
function rangiere(z: AppZustand, e: Einstellungen, muster: MusterId, liste: Uebung[]) {
  const stufe = musterstufe(z, e, muster);
  const reihenfolge = alleUebungen(z).map((u) => u.id);
  const schluessel = (u: Uebung) => [
    e.favoriten.includes(u.id) ? 0 : 1,
    sterneVon(e, u.id) === 1 ? 1 : 0,
    u.lasttyp === 'Last' ? Math.max(0, u.stufe - stufe) : Math.abs(u.stufe - stufe),
    -sterneVon(e, u.id),
    LASTTYP_RANG[u.lasttyp],
    reihenfolge.indexOf(u.id),
  ];
  const vergleiche = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
    return 0;
  };
  return liste.map((u) => ({ u, k: schluessel(u) })).sort((a, b) => vergleiche(a.k, b.k));
}

const equipmentSchluessel = (u: Uebung) => JSON.stringify(u.equipment.map((g) => [...g].sort()).sort());

// Hauptvarianten A und B eines Musters am Ort; bei fehlendem Equipment der Ersatz (markiert).
export function hauptvarianten(z: AppZustand, muster: MusterId, ort: Ort, jetzt: string,
  e: Einstellungen = einstellungenVon(z)): Kandidat[] {
  const varianten = alleUebungen(z).filter((u) => u.muster === muster);
  const erlaubt = varianten.filter((u) => uebungErlaubt(e, ort, u, jetzt));
  if (erlaubt.length > 0) {
    const gespeichert = z.muster.find((x) => x.muster === muster)?.hauptvarianten ?? [];
    const gueltig = gespeichert.map((id) => erlaubt.find((u) => u.id === id));
    if (gueltig.length > 0 && gueltig.every((u) => u)) {
      return ohneEinStern(z, e, gueltig as Uebung[], erlaubt).map((u) => ({ uebung: u, istErsatz: false }));
    }
    const sortiert = rangiere(z, e, muster, erlaubt);
    const a = sortiert[0]!;
    const rest = sortiert.slice(1);
    if (rest.length === 0) return [{ uebung: a.u, istErsatz: false }];
    // B: nächstbeste Variante, innerhalb derselben Stufe bevorzugt mit anderem Equipment.
    const gleichAuf = rest.filter((r) => [0, 1, 2].every((i) => r.k[i] === rest[0]!.k[i]));
    const b = gleichAuf.find((r) => equipmentSchluessel(r.u) !== equipmentSchluessel(a.u)) ?? rest[0]!;
    return [a.u, b.u].slice(0, EINHEIT.maxHauptvarianten).map((u) => ({ uebung: u, istErsatz: false }));
  }
  // Ersatz nur bei fehlendem Equipment, nicht bei Sperren oder Ausschlüssen.
  if (varianten.some((u) => uebungMoeglich(ort, u) || istGesperrt(e, u, jetzt))) return [];
  for (const regel of ERSATZ[muster] ?? []) {
    if ('uebung' in regel) {
      const u = uebungVon(z, regel.uebung);
      if (u && uebungErlaubt(e, ort, u, jetzt)) return [{ uebung: u, istErsatz: true }];
    } else {
      const k = hauptvarianten(z, regel.muster, ort, jetzt, e)[0];
      if (k) return [{ uebung: k.uebung, istErsatz: true }];
    }
  }
  return [];
}

// 1 Stern: Eine Hauptvariante wird durch die beste erlaubte Alternative desselben Musters mit
// höchstens 1 Stufe Abstand und mindestens 2 Sternen ersetzt; gibt es keine, bleibt sie.
export function ohneEinStern(z: AppZustand, e: Einstellungen, liste: Uebung[], erlaubt: Uebung[]): Uebung[] {
  const neu = [...liste];
  neu.forEach((u, i) => {
    if (sterneVon(e, u.id) !== 1) return;
    const kandidaten = erlaubt.filter((v) => v.muster === u.muster && !neu.some((x) => x.id === v.id)
      && Math.abs(v.stufe - u.stufe) <= BEWERTUNG.ersatzMaxStufen && sterneVon(e, v.id) >= BEWERTUNG.ersatzMinSterne);
    const ersatz = rangiere(z, e, u.muster, kandidaten)[0];
    if (ersatz) neu[i] = ersatz.u;
  });
  return neu;
}

// A und B wechseln sich ab: fällig ist die Variante, die zuletzt nicht dran war.
function faellige(z: AppZustand, kandidaten: Kandidat[]): Kandidat | undefined {
  const [a, b] = kandidaten;
  if (!a || !b) return a;
  const ids = new Set([a.uebung.id, b.uebung.id]);
  for (const einheit of fertigeEinheiten(z).reverse()) {
    const p = einheit.bloecke.flatMap((bl) => bl.positionen).filter((x) => ids.has(x.uebungId)).at(-1);
    if (p) return p.uebungId === a.uebung.id ? b : a;
  }
  return a;
}

// Je Hauptmuskel die zuletzt dafür gewählte Übung (aus der letzten Einheit mit diesem Muskel).
function letzteUebungJeMuskel(z: AppZustand): Map<Muskel, string> {
  const letzte = new Map<Muskel, string>();
  for (const einheit of fertigeEinheiten(z)) {
    for (const block of einheit.bloecke) {
      if (block.typ === 'zirkel') continue;
      for (const p of block.positionen) {
        const u = uebungVon(z, p.uebungId);
        const h = u && hauptmuskel(u);
        if (h && !p.istMaxTest) letzte.set(h, u.id);
      }
    }
  }
  return letzte;
}

// ---------- Startwerte einer Variante ----------

export function bereichFuer(e: Einstellungen, u: Uebung): { von: number; bis: number } {
  if (e.ziele.includes('kraft') && istGrund(u) && u.lasttyp === 'Last') return PROFIL.kraftBereich;
  return u.bereich;
}

export function startwerte(z: AppZustand, e: Einstellungen, ort: Ort, u: Uebung): Startwerte {
  const bereich = bereichFuer(e, u);
  const v = z.varianten.find((x) => x.uebungId === u.id);
  const werte: Startwerte = { zielWdh: v?.zielWdh ?? bereich.von };

  if (u.lasttyp === 'Last') {
    const raster = lastraster(ort, u);
    if (raster.length > 0) {
      if (v?.last === undefined) werte.last = raster[0];
      else if (raster.includes(v.last)) werte.last = v.last;
      else {
        // Fehlt die Last am Ort: nächstniedrigere, Ziel per Kraftschätzung umgerechnet.
        const last = [...raster].reverse().find((kg) => kg < v.last!) ?? raster[0]!;
        werte.last = last;
        if (v.e1rm) werte.zielWdh = begrenze(wdhBei(v.e1rm, last, zielReserve(e)), bereich.von - 1, bereich.bis);
      }
    }
  }
  if (u.lasttyp === 'Band') {
    // Einfachste Stufe zuerst; bei unterstützenden Übungen ist das schwerere Band einfacher.
    const reihe = u.unterstuetzend ? [...BAND_STUFEN].reverse() : [...BAND_STUFEN];
    const vorhanden = reihe.filter((s) => bandStufen(ort, u).includes(s));
    if (!v?.bandStufe) werte.bandStufe = vorhanden[0];
    else if (vorhanden.includes(v.bandStufe)) werte.bandStufe = v.bandStufe;
    else {
      // Fehlt die Stufe am Ort: nächst einfachere vorhandene, sonst die einfachste.
      const pos = reihe.indexOf(v.bandStufe);
      werte.bandStufe = [...vorhanden].reverse().find((s) => reihe.indexOf(s) < pos) ?? vorhanden[0];
    }
  }
  if (v?.langsam) werte.langsam = true;
  return werte;
}

// Erste Einheit je Muster nach einer Pause: Ziel 2 Wdh. (Halteübungen 10 Sek.) weniger; nach über
// 21 Tagen zusätzlich 10 % weniger Last, ein leichteres Band bzw. eine Variantenstufe leichter.
function nachPause(z: AppZustand, e: Einstellungen, ort: Ort, u: Uebung, pause: Pause, jetzt: string): { uebung: Uebung; werte: Startwerte } {
  let uebung = u;
  if (pause.tage > TRAININGSPAUSE.leichtBisTage && (u.lasttyp === 'KG' || u.lasttyp === 'Zeit')) {
    const leichter = alleUebungen(z)
      .filter((v) => v.muster === u.muster && v.stufe < u.stufe && uebungErlaubt(e, ort, v, jetzt))
      .sort((a, b) => b.stufe - a.stufe || Number(b.lasttyp === u.lasttyp) - Number(a.lasttyp === u.lasttyp))[0];
    if (leichter) uebung = leichter;
  }
  const werte = startwerte(z, e, ort, uebung);
  if (z.varianten.some((v) => v.uebungId === uebung.id)) {
    const weniger = uebung.lasttyp === 'Zeit' ? TRAININGSPAUSE.zeitWeniger : TRAININGSPAUSE.zielWeniger;
    werte.zielWdh = Math.max(1, werte.zielWdh - weniger);
  }
  if (pause.tage > TRAININGSPAUSE.leichtBisTage) {
    if (werte.last !== undefined) {
      const ziel = werte.last * (1 - TRAININGSPAUSE.lastAbschlag);
      const raster = lastraster(ort, uebung);
      werte.last = [...raster].reverse().find((kg) => kg <= ziel + 1e-9) ?? raster[0] ?? werte.last;
    }
    if (werte.bandStufe) {
      const reihe = uebung.unterstuetzend ? [...BAND_STUFEN].reverse() : [...BAND_STUFEN];
      const vorhanden = reihe.filter((s) => bandStufen(ort, uebung).includes(s));
      const pos = vorhanden.indexOf(werte.bandStufe);
      if (pos > 0) werte.bandStufe = vorhanden[pos - 1];
    }
  }
  return { uebung, werte };
}

// ---------- Erzeugung einer Einheit ----------

interface Auswahl { k: Kandidat; saetze: number }
interface Plan { einheit: Einheit; budgetSaetze: number; freieSaetze: number; bedarfOffen: boolean }

function waehleFokus(z: AppZustand, e: Einstellungen, erholt: Record<Muskel, boolean>, ziele: ProMuskel, erledigt: ProMuskel): Fokus {
  const zuletzt = (g: readonly Muskel[]) =>
    g.map((m) => z.muskeln.find((x) => x.muskel === m)?.letzteBelastung ?? '').reduce((a, b) => (a > b ? a : b), '');
  const defizit = (g: readonly Muskel[]) =>
    g.filter((m) => erholt[m]).reduce((s, m) => s + Math.max(0, ziele[m] - erledigt[m]) * gewicht(e, m), 0);
  const { oben, unten } = FOKUS_GRUPPEN;
  let fokus: 'oben' | 'unten';
  if (zuletzt(oben) !== zuletzt(unten)) fokus = zuletzt(oben) < zuletzt(unten) ? 'oben' : 'unten';
  else fokus = defizit(oben) >= defizit(unten) ? 'oben' : 'unten';
  if (!FOKUS_GRUPPEN[fokus].some((m) => erholt[m])) fokus = fokus === 'oben' ? 'unten' : 'oben';
  return fokus;
}

function leereEinheit(eing: EinheitEingabe, format: Format = 'klassisch'): Einheit {
  return {
    id: `einheit-${eing.jetzt}`, woche: isoWoche(eing.jetzt), erstelltAm: eing.jetzt, status: 'geplant',
    ortId: eing.ortId, fokus: 'ganz', format, geschaetzteDauerMin: 0, aufwaermen: [], bloecke: [],
  };
}

interface Kontext { z: AppZustand; e: Einstellungen; ort: Ort; jetzt: string; pause?: Pause }

function neuePosition(c: Kontext, k: Kandidat, saetze: number): Position {
  const { z, e, ort, jetzt, pause } = c;
  const angepasst = pause && !seitRueckkehrTrainiert(z, k.uebung.muster, pause.rueckkehr, jetzt)
    ? nachPause(z, e, ort, k.uebung, pause, jetzt)
    : { uebung: k.uebung, werte: startwerte(z, e, ort, k.uebung) };
  return {
    uebungId: angepasst.uebung.id, saetze, ...angepasst.werte,
    ...(k.istErsatz ? { istErsatz: true } : {}), ergebnisse: [],
  };
}

function kgText(kg: number): string {
  return `${String(kg).replace('.', ',')} kg`;
}

// Mobility-Zeilen der Muster ohne Doppelte; Zeilen „(nur mit BAND)“ nur, wenn das Utensil am Ort ist.
export function mobilityZeilen(z: AppZustand, ort: Ort, muster: Iterable<MusterId>): string[] {
  const mobility: string[] = [];
  for (const m of muster) {
    for (const zeile of z.katalog.aufwaermen.mobility[m] ?? []) {
      const nurMit = /\s*\(nur mit ([A-Z]+)\)$/.exec(zeile);
      if (nurMit && !hatUtensil(ort, nurMit[1]!)) continue;
      const text = zeile.replace(/\s*\(nur mit [A-Z]+\)$/, '');
      if (!mobility.includes(text)) mobility.push(text);
    }
  }
  return mobility;
}

export function aufwaermenFuer(z: AppZustand, ort: Ort, bloecke: Block[]): Einheit['aufwaermen'] {
  const a = z.katalog.aufwaermen;
  const zeilen = a.allgemein.map((t) => ({ uebungId: '', vorgabe: t }));
  const uebungen = bloecke.flatMap((b) => b.positionen).map((p) => uebungVon(z, p.uebungId)).filter((u) => u !== undefined);
  const mobility = mobilityZeilen(z, ort, new Set(uebungen.map((u) => u.muster)));
  zeilen.push(...mobility.slice(0, a.maxMobilityZeilen).map((t) => ({ uebungId: '', vorgabe: t })));
  const erste = bloecke.flatMap((b) => b.positionen).find((p) => {
    const u = uebungVon(z, p.uebungId);
    return u && istGrund(u) && !p.istMaxTest;
  });
  if (erste) {
    const u = uebungVon(z, erste.uebungId)!;
    let vorgabe = `${a.aufwaermsatz.wdh} Wdh., leichtere Variante`;
    if (erste.last !== undefined) {
      const raster = lastraster(ort, u);
      const ziel = erste.last * a.aufwaermsatz.anteilLast;
      const kg = [...raster].reverse().find((x) => x <= ziel) ?? raster[0] ?? ziel;
      vorgabe = `${a.aufwaermsatz.wdh} Wdh. mit ${kgText(kg)}`;
    }
    zeilen.push({ uebungId: erste.uebungId, vorgabe });
  }
  return zeilen;
}

function plane(z: AppZustand, eing: EinheitEingabe): Plan {
  const e = einstellungenVon(z);
  const ort = z.orte.find((o) => o.id === eing.ortId);
  if (!ort) return { einheit: leereEinheit(eing), budgetSaetze: 0, freieSaetze: 0, bedarfOffen: false };
  if (eing.zirkelId) {
    const zirkel = z.katalog.zirkel.find((x) => x.id === eing.zirkelId);
    if (zirkel) return { einheit: zirkelEinheit(z, e, ort, zirkel, eing), budgetSaetze: 0, freieSaetze: 0, bedarfOffen: false };
  }

  // Schritt 2: Woche, Prognose (steigt automatisch) und Restzahl n mit Pacing-Korrektur
  const jetzt = eing.jetzt;
  const woche = z.wochen.find((w) => w.id === isoWoche(jetzt));
  const erledigteEinheiten = woche?.einheiten ?? 0;
  const prognose = Math.max(eing.prognose, erledigteEinheiten + 1);
  const erledigt = woche?.erledigt ?? leer();
  const erholungswoche = istErholungswoche(z, jetzt, eing.erholungswoche);
  const ziele = wochenziele(z, prognose, ort.id, jetzt, erholungswoche);
  const tage = verbleibendeTage(jetzt);
  const letzte = letzteEinheitZeit(z);
  let n = Math.max(1, Math.min(prognose - erledigteEinheiten, tage));
  if (letzte && stundenZwischen(letzte, jetzt) >= WOCHENZIEL.pacingAbStunden) {
    n = Math.max(1, Math.min(n, Math.ceil(tage / 2)));
  }

  // Schritte 4 und 5: Fokus und Bedarf
  const erholt = Object.fromEntries(MUSKELN.map((m) => [m, istErholt(z.muskeln.find((x) => x.muskel === m), jetzt)])) as Record<Muskel, boolean>;
  const fokus: Fokus = eing.morgenWieder ? waehleFokus(z, e, erholt, ziele, erledigt) : 'ganz';
  const bedarf = leer();
  for (const m of MUSKELN) {
    const rest = Math.max(0, ziele[m] - erledigt[m]);
    let anteil = rest / n;
    if (fokus !== 'ganz') {
      anteil = FOKUS_GRUPPEN[fokus].includes(m) || m === 'Bauch' ? rest / Math.max(1, Math.ceil(n / 2)) : 0;
    }
    bedarf[m] = erholt[m] ? Math.min(EINHEIT.maxSaetzeProMuskel, Math.ceil(anteil)) : 0;
  }

  // Schritt 6: Übungen gierig wählen aus den Hauptvarianten A und B aller Muster außer Rumpf und Waden
  const budget = arbeitssaetze(z, prognose, e.standardDauerMin + (eing.laenger ? ZEITBUDGET.laengerMin : 0));
  const kandidaten: Kandidat[] = [];
  for (const muster of MUSTER_IDS) {
    const art = MUSTER_ART[muster];
    if (art !== 'grund' && art !== 'isolation') continue;
    for (const k of hauptvarianten(z, muster, ort, jetzt, e)) {
      if (!kandidaten.some((x) => x.uebung.id === k.uebung.id)) kandidaten.push(k);
    }
  }
  const dosis = leer();
  let gesamt = 0;

  // Max-Test (falls fällig) am Anfang; er zählt als ein harter Satz.
  const imFokus = (m: Muskel) => fokus === 'ganz' || m === 'Bauch' || FOKUS_GRUPPEN[fokus].includes(m);
  const test = faelligerMaxTest(z, jetzt, ort, prognose, erholungswoche, imFokus);
  const testUebung = test ? uebungVon(z, test.uebungId) : undefined;
  if (testUebung) {
    for (const [m, v] of beitrag(testUebung)) dosis[m] += v;
    gesamt += 1;
  }

  const wert = (u: Uebung) =>
    beitrag(u).reduce((s, [m, v]) => s + Math.min(Math.max(0, bedarf[m] - dosis[m]), v) * gewicht(e, m), 0);
  const letzteJeMuskel = letzteUebungJeMuskel(z);
  const gewaehlt: Auswahl[] = [];
  const benutzt = new Set<string>();
  const offen = () => kandidaten.filter((k) => !benutzt.has(k.uebung.id) && wert(k.uebung) > EINHEIT.minOffenerBedarf);
  while (gesamt < budget) {
    const liste = offen();
    if (liste.length === 0) break;
    const punkte = (u: Uebung) => wert(u)
      + (istGrund(u) ? EINHEIT.zuschlagGrunduebung : 0)
      + (e.favoriten.includes(u.id) ? EINHEIT.zuschlagFavorit : 0)
      + BEWERTUNG.zuschlag[sterneVon(e, u.id)]
      - (letzteJeMuskel.get(hauptmuskel(u)!) === u.id ? EINHEIT.abschlagLetzteEinheit : 0);
    // Bei Gleichstand gewinnt die höhere Variantenstufe, danach die Reihenfolge der Kandidaten.
    let beste = liste[0]!;
    for (const k of liste) {
      const d = punkte(k.uebung) - punkte(beste.uebung);
      if (d > 1e-9 || (Math.abs(d) <= 1e-9 && k.uebung.stufe > beste.uebung.stufe)) beste = k;
    }
    benutzt.add(beste.uebung.id);
    const h = hauptmuskel(beste.uebung)!;
    const { min, max } = EINHEIT.saetzeProUebung;
    const saetze = Math.min(Math.max(min, Math.min(max, Math.ceil(bedarf[h] - dosis[h]))), budget - gesamt);
    if (saetze <= 0) break;
    gewaehlt.push({ k: beste, saetze });
    gesamt += saetze;
    for (const [m, v] of beitrag(beste.uebung)) dosis[m] += saetze * v;
  }
  const bedarfOffen = gesamt >= budget && offen().length > 0;

  // Schritt 7: Bauch und Waden zusätzlich zum Zeitbudget
  const zusatz: Auswahl[] = [];
  for (const muster of MUSTER_IDS.filter((m) => MUSTER_ART[m] === 'zusatz')) {
    const k = faellige(z, hauptvarianten(z, muster, ort, jetzt, e));
    const m = k && hauptmuskel(k.uebung);
    if (!k || !m || !erholt[m]) continue;
    const saetze = Math.min(EINHEIT.maxSaetzeBauchWaden, Math.ceil(bedarf[m] - dosis[m]));
    if (saetze <= 0) continue;
    zusatz.push({ k, saetze });
    for (const [mm, v] of beitrag(k.uebung)) dosis[mm] += saetze * v;
  }

  // Das getestete Muster bekommt 50 % weniger weitere Sätze.
  if (testUebung) {
    for (const a of [...gewaehlt, ...zusatz]) {
      if (a.k.uebung.muster !== testUebung.muster) continue;
      const weniger = Math.max(1, Math.round(a.saetze * MAXTEST.weitereSaetzeAnteil));
      if (gewaehlt.includes(a)) gesamt -= a.saetze - weniger;
      a.saetze = weniger;
    }
  }

  // Schritt 8: Reihenfolge und Supersatz-Paare
  const liste = [
    ...gewaehlt.filter((a) => istGrund(a.k.uebung)),
    ...gewaehlt.filter((a) => !istGrund(a.k.uebung)),
    ...zusatz,
  ];
  const c: Kontext = { z, e, ort, jetzt, pause: trainingspause(z, jetzt) };
  const gebildet = bildeBloecke(c, liste, supersatzAnteil(prognose));
  const format = gebildet.format;
  const bloecke: Block[] = testUebung
    ? [{
      typ: 'einzeln', pauseSek: e.pausenSek.grund,
      positionen: [{ uebungId: testUebung.id, saetze: 1, zielWdh: 0, istMaxTest: true, ergebnisse: [] }],
    }, ...gebildet.bloecke]
    : gebildet.bloecke;
  const einheit: Einheit = {
    ...leereEinheit(eing, format),
    fokus,
    aufwaermen: aufwaermenFuer(z, ort, bloecke),
    bloecke,
  };
  einheit.geschaetzteDauerMin = geschaetzteDauer(z, einheit);
  return { einheit, budgetSaetze: gesamt, freieSaetze: budget - gesamt, bedarfOffen };
}

function bildeBloecke(c: Kontext, liste: Auswahl[], anteil: number): { bloecke: Block[]; format: Format } {
  const { e } = c;
  const gesamt = liste.reduce((s, a) => s + a.saetze, 0);
  const partner = new Map<number, number>();
  let paarSaetze = 0;
  const suche = (muster: readonly MusterId[], ausser = -1) =>
    liste.findIndex((a, i) => i !== ausser && !partner.has(i) && muster.includes(a.k.uebung.muster));
  const naechstesPaar = () => {
    for (const [as, bs] of SUPERSATZ_PAARE) {
      const i = suche(as);
      const j = i < 0 ? -1 : suche(bs, i);
      if (i >= 0 && j >= 0) return [i, j] as const;
    }
    return undefined;
  };
  let paar = naechstesPaar();
  while (paar && paarSaetze < anteil * gesamt) {
    const [i, j] = paar;
    partner.set(i, j).set(j, i);
    paarSaetze += liste[i]!.saetze + liste[j]!.saetze;
    paar = naechstesPaar();
  }
  const bloecke: Block[] = [];
  liste.forEach((a, i) => {
    const j = partner.get(i);
    if (j !== undefined && j < i) return;
    const position = (x: Auswahl) => neuePosition(c, x.k, x.saetze);
    if (j !== undefined) {
      bloecke.push({ typ: 'supersatz', positionen: [position(a), position(liste[j]!)], pauseSek: e.pausenSek.supersatz });
    } else {
      bloecke.push({ typ: 'einzeln', positionen: [position(a)], pauseSek: istGrund(a.k.uebung) ? e.pausenSek.grund : e.pausenSek.isolation });
    }
  });
  const format: Format = partner.size === 0 ? 'klassisch' : paar ? 'mix' : 'supersatz';
  return { bloecke, format };
}

function geschaetzteDauer(z: AppZustand, einheit: Einheit): number {
  const saetze = einheit.bloecke.reduce((s, b) => s + b.positionen.reduce((t, p) => t + p.saetze, 0), 0);
  const echte = echteSatzdauer(z, einheit.format);
  let sek = 0;
  if (echte !== undefined) sek = saetze * echte;
  else {
    for (const b of einheit.bloecke) {
      const s = b.positionen.map((p) => p.saetze);
      const runden = b.typ === 'supersatz' ? Math.max(...s) : s.reduce((a, x) => a + x, 0);
      sek += s.reduce((a, x) => a + x, 0) * ZEITBUDGET.satzArbeitSek + runden * b.pauseSek;
    }
  }
  return saetze === 0 ? 0 : Math.round(ZEITBUDGET.aufwaermenMin + sek / 60);
}

// ---------- Zirkel ----------

export function zirkelStation(z: AppZustand, e: Einstellungen, ort: Ort, muster: MusterId, jetzt: string): Uebung | undefined {
  const varianten = alleUebungen(z).filter((u) => u.muster === muster && uebungErlaubt(e, ort, u, jetzt));
  const ziel = musterstufe(z, e, muster) - ZIRKEL.stationStufenUnterMuster;
  const geeignet = varianten.filter((u) => u.zirkelGeeignet);
  const exakt = varianten.filter((u) => u.stufe === ziel);
  const niedriger = geeignet.filter((u) => u.stufe < ziel);
  const hoechste = (l: Uebung[]) => l.reduce<Uebung | undefined>((b, u) => (!b || u.stufe > b.stufe ? u : b), undefined);
  const niedrigste = (l: Uebung[]) => l.reduce<Uebung | undefined>((b, u) => (!b || u.stufe < b.stufe ? u : b), undefined);
  return exakt.find((u) => u.zirkelGeeignet) ?? exakt[0] ?? hoechste(niedriger) ?? niedrigste(geeignet) ?? niedrigste(varianten);
}

function zirkelEinheit(z: AppZustand, e: Einstellungen, ort: Ort, zirkel: Zirkel, eing: EinheitEingabe): Einheit {
  const positionen: Position[] = [];
  for (const s of zirkel.stationen) {
    const u = zirkelStation(z, e, ort, s.muster, eing.jetzt);
    if (!u) continue;
    const vorgabe = typeof s.vorgabe === 'number' ? s.vorgabe : Number.parseInt(s.vorgabe, 10) || 0;
    positionen.push({ ...neuePosition({ z, e, ort, jetzt: eing.jetzt }, { uebung: u, istErsatz: false }, zirkel.runden), zielWdh: vorgabe });
  }
  const bloecke: Block[] = positionen.length > 0
    ? [{ typ: 'zirkel', positionen, pauseSek: 0, zirkelId: zirkel.id, runden: zirkel.runden }]
    : [];
  const minuten = Number.parseInt(/\d+/.exec(zirkel.dauerHinweis)?.[0] ?? '0', 10);
  const aufwaermen = aufwaermenFuer(z, ort, bloecke).filter((a) => a.uebungId === '');
  return { ...leereEinheit(eing, 'zirkel'), aufwaermen, bloecke, geschaetzteDauerMin: ZEITBUDGET.aufwaermenMin + minuten };
}

// Fälliger Zirkel bei Prognose ab 3: sobald die hoch priorisierten Muskeln 70 % ihres Ziels haben
// oder laut Prognose nur noch eine Einheit bleibt.
export function zirkelVorschlagen(z: AppZustand, jetzt: string, prognose: number, ortId: string): boolean {
  const e = einstellungenVon(z);
  const wocheId = isoWoche(jetzt);
  const woche = z.wochen.find((w) => w.id === wocheId);
  let faellig: number = ZIRKEL.proWoche[e.zirkelAnteil];
  if (e.zirkelAnteil === 'alle2Wochen' && wochenNummer(wocheId) % 2 !== 0) faellig = 0;
  const gemacht = z.einheiten.filter((x) => x.woche === wocheId && x.format === 'zirkel' && x.status === 'abgeschlossen').length;
  if (gemacht >= faellig || prognose < ZIRKEL.abPrognose || woche?.erholungswoche) return false;
  const erledigteEinheiten = woche?.einheiten ?? 0;
  if (prognose - erledigteEinheiten <= 1) return true;
  const ziele = wochenziele(z, prognose, ortId, jetzt);
  const erledigt = woche?.erledigt ?? leer();
  return MUSKELN.filter((m) => e.prioritaeten[m] === 'hoch' && ziele[m] > 0)
    .every((m) => erledigt[m] >= ZIRKEL.vorschlagAbAnteilZiel * ziele[m]);
}

// ---------- Schnittstellen laut Spezifikation ----------

// Vorschlag der Prognose: gerundeter Schnitt der letzten 4 Wochen (seit der ersten Trainingswoche).
function prognoseDurchschnitt(z: AppZustand, e: Einstellungen, jetzt: string): number {
  const erste = z.wochen.map((w) => w.id).sort()[0];
  const wochen = Array.from({ length: WOCHENZIEL.durchschnittWochen }, (_, i) => isoWoche(plusTage(jetzt, -7 * (i + 1))))
    .filter((id) => erste !== undefined && id >= erste);
  if (wochen.length === 0) return e.ueblicheEinheiten;
  const summe = wochen.reduce((s, id) => s + (z.wochen.find((w) => w.id === id)?.einheiten ?? 0), 0);
  const { min, max } = PROFIL.einheitenProWoche;
  return begrenze(Math.round(summe / wochen.length), min, max);
}

export function startfragen(z: AppZustand, jetzt: string): StartfragenErgebnis {
  const e = einstellungenVon(z);
  const woche = z.wochen.find((w) => w.id === isoWoche(jetzt));
  const erledigteEinheiten = woche?.einheiten ?? 0;
  const ort = z.orte.find((o) => o.standard) ?? z.orte[0];
  const tage = verbleibendeTage(jetzt);
  const letzte = letzteEinheitZeit(z);
  const langePause = letzte !== undefined && stundenZwischen(letzte, jetzt) >= WOCHENZIEL.pacingAbStunden;

  let prognoseAbfragen = !woche;
  let prognose = woche ? Math.max(woche.prognose, erledigteEinheiten + 1) : prognoseDurchschnitt(z, e, jetzt);
  if (woche && langePause) {
    const korrigiert = erledigteEinheiten + Math.max(1, Math.min(prognose - erledigteEinheiten, Math.ceil(tage / 2)));
    if (korrigiert < prognose) {
      prognoseAbfragen = true;
      prognose = korrigiert;
    }
  }
  const nachHeute = prognose - erledigteEinheiten - 1;
  const morgenWiederVorschlag = !langePause && nachHeute > 0 && nachHeute >= (tage - 1) / 2;
  const ortId = ort?.id ?? '';
  const probe = plane(z, { jetzt, ortId, prognose, morgenWieder: morgenWiederVorschlag, laenger: false });
  const ruhetagEmpfohlen = probe.budgetSaetze < EINHEIT.ruhetagUnterSaetzen;
  return {
    prognoseAbfragen,
    prognoseVorschlag: prognose,
    ortId,
    morgenWiederVorschlag,
    laengerAnbieten: e.laengerAnbieten && prognose <= ZEITBUDGET.laengerBisPrognose && probe.bedarfOffen,
    ruhetagEmpfohlen,
    zirkelVorschlag: zirkelVorschlagen(z, jetzt, prognose, ortId),
    finisherAnbieten: !ruhetagEmpfohlen && !istErholungswoche(z, jetzt) && probe.freieSaetze >= EINHEIT.freiFuerZirkelAbSaetzen,
  };
}

export function erstelleEinheit(z: AppZustand, eing: EinheitEingabe): Einheit {
  return plane(z, eing).einheit;
}

export function alternativen(z: AppZustand, einheit: Einheit, block: number, position: number):
  { uebungId: string; zielWdh: number; last?: number; bandStufe?: BandStufe }[] {
  const p = einheit.bloecke[block]?.positionen[position];
  const u = p && uebungVon(z, p.uebungId);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  if (!u || !ort) return [];
  const e = einstellungenVon(z);
  return alleUebungen(z)
    .filter((v) => v.muster === u.muster && v.id !== u.id && uebungErlaubt(e, ort, v, einheit.erstelltAm))
    .map((v) => ({ uebungId: v.id, ...startwerte(z, e, ort, v) }));
}

export function tausche(z: AppZustand, einheit: Einheit, block: number, position: number, uebungId: string): Einheit {
  if (einheit.status !== 'geplant') throw new Error('Tauschen geht nur vor dem Start.');
  if (!alternativen(z, einheit, block, position).some((a) => a.uebungId === uebungId)) {
    throw new Error(`Übung ${uebungId} ist hier keine Alternative.`);
  }
  const neu = structuredClone(einheit);
  const alt = neu.bloecke[block]!.positionen[position]!;
  const e = einstellungenVon(z);
  const ort = z.orte.find((o) => o.id === einheit.ortId)!;
  const u = uebungVon(z, uebungId)!;
  const urspruenglich = alt.getauschtVon ?? alt.uebungId;
  const ersetzt: Position = {
    uebungId, saetze: alt.saetze, ...startwerte(z, e, ort, u),
    ...(alt.istMaxTest ? { istMaxTest: true } : {}),
    ...(urspruenglich !== uebungId ? { getauschtVon: urspruenglich } : {}),
    ergebnisse: [],
  };
  neu.bloecke[block]!.positionen[position] = ersetzt;
  if (neu.format !== 'zirkel') neu.aufwaermen = aufwaermenFuer(z, ort, neu.bloecke);
  return neu;
}
