// Progressionsmodul laut Spezifikation, Abschnitt „Progression, Feedback, Erholungswochen und
// Max-Tests“. Rein und deterministisch: Die aktuelle Zeit wird übergeben; der Zustand wird nur
// gelesen und als neuer Zustand zurückgegeben.
import {
  BEWERTUNG, EINHEIT, ERHOLUNGSWOCHE, LASTTYP_RANG, MUSTER_ART, PROGRESSION, VOLUMENGRENZE, WOCHENZIEL,
} from '../konfiguration';
import { isoWoche, plusTage, stundenZwischen, wocheStart, wocheVerschoben } from './datum';
import { alleUebungen, bandStufen, lastraster, uebungErlaubt } from './equipment';
import {
  bereichFuer, dosisProMuskel, hauptvarianten, istErholungswoche, musterstufe, persoenlicheGrenze, startwerte,
  wochenziele,
} from './planung';
import {
  BAND_STUFEN, MUSKELN, type AppZustand, type BandStufe, type Einheit, type Einstellungen, type MaxTest,
  type Muskel, type MuskelZustand, type MusterId, type MusterZustand, type Ort, type Position, type Uebung,
  type VarianteZustand, type Vorstand, type Woche, type Zyklus,
} from './typen';
import {
  e1rm, einheitZeit, einstellungenVon, ersterSatz, faelligerMaxTest, feedbackVon, fertigeEinheiten,
  leistungswert, reserveFuer, sitzungen, sterneVon, uebungVon, wdhBei, zielReserve, type Sitzung,
} from './verlauf';

const begrenze = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const mittel = (l: number[]) => (l.length > 0 ? l.reduce((a, b) => a + b, 0) / l.length : undefined);

function ortVon(z: AppZustand, ortId: string): Ort | undefined {
  return z.orte.find((o) => o.id === ortId) ?? z.orte.find((o) => o.standard) ?? z.orte[0];
}

// ---------- Lasten, Bänder und Varianten ----------

// Nächsthöhere (1) bzw. nächstniedrigere (−1) Last im Raster des Ortes; null am Ende der Leiter.
export function naechsteLast(o: Ort, u: Uebung, aktuell: number, richtung: 1 | -1): number | null {
  const raster = lastraster(o, u);
  const kandidat = richtung === 1
    ? raster.find((kg) => kg > aktuell + 1e-9)
    : [...raster].reverse().find((kg) => kg < aktuell - 1e-9);
  return kandidat ?? null;
}

// Nächste vorhandene Bandstufe: 1 = schwerer (Fortschritt), −1 = leichter. Bei unterstützenden
// Übungen ist der Fortschritt das leichtere Band.
export function naechsteBandStufe(o: Ort, u: Uebung, aktuell: BandStufe, richtung: 1 | -1): BandStufe | null {
  const reihe = u.unterstuetzend ? [...BAND_STUFEN].reverse() : [...BAND_STUFEN];
  const vorhanden = reihe.filter((s) => bandStufen(o, u).includes(s));
  const pos = reihe.indexOf(aktuell);
  const kandidat = richtung === 1
    ? vorhanden.find((s) => reihe.indexOf(s) > pos)
    : [...vorhanden].reverse().find((s) => reihe.indexOf(s) < pos);
  return kandidat ?? null;
}

// Nächstschwerere Variante des Musters am Ort: kleinste höhere Stufe, derselbe Lasttyp bevorzugt;
// die andere Hauptvariante nur, wenn es keine gibt.
export function naechsteVariante(z: AppZustand, ort: Ort, u: Uebung, jetzt: string, ausser: string[] = []): Uebung | undefined {
  const e = einstellungenVon(z);
  const reihenfolge = alleUebungen(z).map((x) => x.id);
  const anderer = (v: Uebung) => Number(v.lasttyp !== u.lasttyp);
  const liste = alleUebungen(z)
    .filter((v) => v.muster === u.muster && v.stufe > u.stufe && uebungErlaubt(e, ort, v, jetzt))
    .sort((a, b) => a.stufe - b.stufe || anderer(a) - anderer(b) || LASTTYP_RANG[a.lasttyp] - LASTTYP_RANG[b.lasttyp]
      || reihenfolge.indexOf(a.id) - reihenfolge.indexOf(b.id));
  return liste.find((v) => !ausser.includes(v.id)) ?? liste[0];
}

// Einseitige Variante desselben Musters (mindestens gleiche Stufe), falls im Katalog und am Ort möglich.
function einseitigeVariante(z: AppZustand, ort: Ort, u: Uebung, jetzt: string, ausser: string[]): Uebung | undefined {
  const e = einstellungenVon(z);
  return alleUebungen(z).find((v) => v.muster === u.muster && v.id !== u.id && !ausser.includes(v.id)
    && v.stufe >= u.stufe && PROGRESSION.einseitigKennzeichen.some((k) => v.id.includes(k))
    && !PROGRESSION.einseitigKennzeichen.some((k) => u.id.includes(k))
    && uebungErlaubt(e, ort, v, jetzt));
}

function musterZustand(z: AppZustand, e: Einstellungen, muster: MusterId): MusterZustand {
  const mz = z.muster.find((x) => x.muster === muster);
  return mz ? { ...mz, hauptvarianten: [...mz.hauptvarianten] } : { muster, stufe: musterstufe(z, e, muster), hauptvarianten: [] };
}

// Ersetzt eine Hauptvariante durch die nächste Variante; die Musterstufe ändert sich dabei nicht.
function wechsle(muster: MusterZustand, von: string, zu: string) {
  const i = muster.hauptvarianten.indexOf(von);
  if (i < 0) return;
  muster.hauptvarianten[i] = zu;
  muster.hauptvarianten = [...new Set(muster.hauptvarianten)];
}

// ---------- Auswertung einer Übung ----------

// Schreibt Ziel, Last bzw. Band und Kraftschätzung der Variante fort (alle Regeln am ersten Satz).
// `ortId` ist der Ort der Einheit; er bestimmt Lastraster, Bänder und die nächste Variante.
export function werteUebungAus(z: AppZustand, position: Position, jetzt: string, ortId: string): { variante: VarianteZustand; muster: MusterZustand } {
  const e = einstellungenVon(z);
  let p = position;
  const u = uebungVon(z, p.uebungId);
  const ort = ortVon(z, ortId);
  if (!u || !ort) throw new Error(`Übung ${p.uebungId} oder Ort ${ortId} fehlt.`);
  const alt = z.varianten.find((v) => v.uebungId === u.id);
  const v: VarianteZustand = alt ? { ...alt } : {
    uebungId: u.id, zielWdh: p.zielWdh, seitSteigerung: PROGRESSION.startSeitSteigerung, schwerSerie: 0,
  };
  const muster = musterZustand(z, e, u.muster);

  // Kalibrierungssatz (erste Nutzung einer Last-Variante, Trainings-Player): Er legt Last und Ziel der
  // restlichen Sätze fest; die Regeln messen am ersten Satz danach. Gibt es keinen, gelten die
  // kalibrierten Werte.
  const kalibrierung = p.ergebnisse[0];
  if (u.lasttyp === 'Last' && alt?.last === undefined && !p.istMaxTest && p.last !== undefined && kalibrierung?.last !== undefined) {
    if (p.ergebnisse.length === 1) {
      const variante: VarianteZustand = {
        ...v, last: p.last, zielWdh: p.zielWdh, zuletzt: jetzt,
        e1rm: e1rm(kalibrierung.last, kalibrierung.wdh ?? 0, PROGRESSION.neueVarianteReserve),
      };
      return { variante, muster };
    }
    p = { ...p, ergebnisse: p.ergebnisse.slice(1) };
  }
  const erster = ersterSatz(p);
  if (erster === undefined) return { variante: alt ?? v, muster };
  const { von: U, bis: O } = bereichFuer(e, u);

  if (p.istMaxTest) {
    // Ergebnis über dem Bereich der getesteten Variante: nächstschwerere Variante ab der nächsten Einheit.
    if (erster > O) {
      const naechste = naechsteVariante(z, ort, u, jetzt, muster.hauptvarianten);
      if (naechste) {
        muster.stufe = Math.max(muster.stufe, naechste.stufe);
        wechsle(muster, u.id, naechste.id);
      }
    }
    return { variante: alt ?? v, muster };
  }

  const fb = feedbackVon(p);
  const ziel = p.zielWdh;
  const seit = alt?.seitSteigerung ?? PROGRESSION.startSeitSteigerung;
  const eingewoehnung = seit < PROGRESSION.eingewoehnungEinheiten && erster >= U - PROGRESSION.deutlichVerfehltUnterU;
  const deutlichVerfehlt = erster < U - PROGRESSION.deutlichVerfehltUnterU;
  const last = p.ergebnisse[0]?.last ?? p.last;
  const band = p.ergebnisse[0]?.bandStufe ?? p.bandStufe;
  if (last !== undefined) v.last = last;
  if (band !== undefined) v.bandStufe = band;
  v.zielWdh = ziel;
  v.zuletzt = jetzt;
  v.schwerSerie = fb === 'schwer' ? v.schwerSerie + 1 : 0;
  v.bestErsterSatz = Math.max(alt?.bestErsterSatz ?? erster, erster);
  let gesteigert = false;

  // Nächste Variante; bei einem Sprung ab 2 Stufen zuerst langsames Absenken (nur Körpergewicht).
  const wechselZurNaechsten = (naechste = naechsteVariante(z, ort, u, jetzt, muster.hauptvarianten)) => {
    if (!naechste) return;
    if (u.lasttyp === 'KG' && !v.langsam && naechste.stufe - u.stufe >= PROGRESSION.zwischenstufeAbStufen) {
      v.langsam = true;
      v.zielWdh = U;
      return;
    }
    delete v.langsam;
    v.zielWdh = U;
    wechsle(muster, u.id, naechste.id);
  };

  if (u.lasttyp === 'Last' && last !== undefined) {
    const aktuell = leistungswert(e, u, p);
    if (aktuell !== undefined) {
      v.e1rm = alt?.e1rm === undefined ? aktuell : PROGRESSION.e1rmGlaettung * alt.e1rm + (1 - PROGRESSION.e1rmGlaettung) * aktuell;
    }
    const schaetzung = v.e1rm ?? e1rm(last, erster, reserveFuer(fb, e));
    if (p.last !== undefined && last !== p.last) {
      // Gewicht im ersten Satz geändert (Entscheidung 21.10.2026): Ziel wie nach dem Kalibrierungssatz
      // aus der Kraftschätzung bei diesem Gewicht; das Ziel des geplanten Gewichts ist kein Maßstab.
      v.zielWdh = begrenze(wdhBei(schaetzung, last, zielReserve(e)), U - 1, O);
    } else if (fb === 'schwer') {
      if (eingewoehnung) v.zielWdh = Math.max(U - 1, erster);
      else if (deutlichVerfehlt) {
        v.last = naechsteLast(ort, u, last, -1) ?? last;
        v.zielWdh = U;
      }
    } else {
      const plus = fb === 'leicht' ? PROGRESSION.zielPlusLeicht : PROGRESSION.zielPlusPassend;
      const neu = Math.max(ziel, Math.min(ziel + plus, wdhBei(schaetzung, last, zielReserve(e))));
      if (neu <= O) v.zielWdh = neu;
      else {
        const hoeher = naechsteLast(ort, u, last, 1);
        if (hoeher !== null) {
          const moeglich = wdhBei(schaetzung, hoeher, zielReserve(e));
          if (moeglich >= U || neu > O + PROGRESSION.dehnungUeberO) {
            v.last = hoeher;
            v.zielWdh = begrenze(moeglich, U - 1, O);
            gesteigert = true;
          } else v.zielWdh = neu;
        } else if (!v.langsam) {
          // Die Last geht aus: 1. langsameres Tempo, 2. Bereich bis O + 5, 3. einseitig, 4. nächste Variante
          v.langsam = true;
          v.zielWdh = U;
        } else if (neu <= O + PROGRESSION.dehnungLastEnde) v.zielWdh = neu;
        else {
          const naechste = einseitigeVariante(z, ort, u, jetzt, muster.hauptvarianten) ?? naechsteVariante(z, ort, u, jetzt, muster.hauptvarianten);
          if (naechste) wechselZurNaechsten(naechste);
          else v.zielWdh = O + PROGRESSION.dehnungLastEnde;
        }
      }
    }
  } else if (fb === 'schwer') {
    if (eingewoehnung) v.zielWdh = Math.max(U - 1, erster);
    else if (deutlichVerfehlt) {
      if (u.lasttyp === 'Band' && band) v.bandStufe = naechsteBandStufe(ort, u, band, -1) ?? band;
      v.zielWdh = U;
    }
  } else if (erster >= O) {
    const staerker = u.lasttyp === 'Band' && band ? naechsteBandStufe(ort, u, band, 1) : null;
    if (staerker) {
      v.bandStufe = staerker;
      v.zielWdh = U;
      gesteigert = true;
    } else wechselZurNaechsten();
  } else if (u.lasttyp === 'Zeit') {
    v.zielWdh = Math.min(O, ziel + (fb === 'leicht' ? PROGRESSION.zeitPlusLeicht : PROGRESSION.zeitPlusPassend));
  } else {
    // Körpergewicht und Band: höchstens 2 Wdh. über dem bisher besten ersten Satz.
    const plus = fb === 'leicht' ? PROGRESSION.zielPlusLeicht : PROGRESSION.zielPlusPassend;
    v.zielWdh = Math.min(O, Math.max(ziel, Math.min(ziel + plus, v.bestErsterSatz + PROGRESSION.kgMaxUeberBestem)));
  }

  if (gesteigert) delete v.langsam;
  v.seitSteigerung = gesteigert ? 0 : Math.min(seit + 1, 99);
  // Musterstufe: schwerste Variante, die im Zielbereich mit „passend“ oder „zu leicht“ bewältigt wurde.
  if (fb !== 'schwer' && erster >= U) muster.stufe = Math.max(muster.stufe, u.stufe);
  return { variante: v, muster };
}

// ---------- Abschluss einer Einheit ----------

const ersetze = <T>(liste: T[], neu: T, gleich: (a: T) => boolean) => [...liste.filter((x) => !gleich(x)), neu];

// Hauptvarianten bei der ersten Nutzung des Musters festlegen. Danach übernimmt sie den Ersatz für
// Varianten mit 1 Stern, solange alle gespeicherten Hauptvarianten am Ort möglich sind (an einem
// anderen Ort bleibt der gespeicherte Stand unberührt).
function legeHauptvariantenFest(z: AppZustand, einheit: Einheit, ort: Ort, start: string): AppZustand {
  if (einheit.format === 'zirkel' || einheit.format === 'test') return z;
  const e = einstellungenVon(z);
  let neu = z;
  for (const p of einheit.bloecke.flatMap((b) => b.positionen)) {
    const u = uebungVon(neu, p.uebungId);
    if (!u || p.ergebnisse.length === 0 || p.istMaxTest || p.istErsatz) continue;
    const mz = musterZustand(neu, e, u.muster);
    const alle = mz.hauptvarianten.map((id) => uebungVon(neu, id));
    if (mz.hauptvarianten.length > 0) {
      const einStern = mz.hauptvarianten.some((id) => sterneVon(e, id) === 1);
      if (!einStern || !alle.every((v) => v && uebungErlaubt(e, ort, v, start))) continue;
    }
    const ids = hauptvarianten(neu, u.muster, ort, start).filter((k) => !k.istErsatz).map((k) => k.uebung.id);
    if (ids.length === 0 || ids.join() === mz.hauptvarianten.join()) continue;
    neu = { ...neu, muster: ersetze(neu.muster, { ...mz, hauptvarianten: ids }, (x) => x.muster === u.muster) };
  }
  return neu;
}

// Bewertungen sofort auf die gespeicherten Hauptvarianten anwenden (1 Stern ersetzt eine
// Hauptvariante, falls am Ort eine Alternative möglich ist). Gilt für alle Muster mit Hauptvarianten.
export function uebernimmBewertungen(z: AppZustand, ortId: string, jetzt: string): AppZustand {
  const ort = ortVon(z, ortId);
  if (!ort) return z;
  const positionen = z.muster.flatMap((mz) => mz.hauptvarianten.slice(0, 1))
    .map((uebungId): Position => ({ uebungId, saetze: 1, zielWdh: 0, ergebnisse: [{ nr: 1, zeit: jetzt }] }));
  const einheit: Einheit = {
    id: '', woche: '', erstelltAm: jetzt, status: 'abgeschlossen', ortId: ort.id, fokus: 'ganz', format: 'klassisch',
    geschaetzteDauerMin: 0, aufwaermen: [], bloecke: [{ typ: 'einzeln', positionen, pauseSek: 0 }],
  };
  return legeHauptvariantenFest(z, einheit, ort, jetzt);
}

export interface NaechstesMal {
  uebungId: string; zielWdh: number; last?: number; bandStufe?: BandStufe; langsam?: boolean;
  neueVariante: boolean;            // das Muster wechselt zur nächsten Variante
  kalibrierung: boolean;            // Last-Variante ohne Last: Gewicht wählt der Nutzer im ersten Satz
}

// Vorschau für das Übungsfeedback: Was gilt nächstes Mal für diese Übung, wenn die Position mit
// diesem Feedback ausgewertet wird (gleiche Regeln wie schliesseEinheitAb)?
export function vorschauNaechstesMal(z: AppZustand, einheit: Einheit, position: Position, jetzt: string): NaechstesMal | undefined {
  const e = einstellungenVon(z);
  const ort = ortVon(z, einheit.ortId);
  const u = uebungVon(z, position.uebungId);
  if (!ort || !u || position.istMaxTest || position.ergebnisse.length === 0) return undefined;
  const nurDiese: Einheit = { ...einheit, bloecke: [{ typ: 'einzeln', positionen: [position], pauseSek: 0 }] };
  const z1 = legeHauptvariantenFest(z, nurDiese, ort, einheit.gestartetAm ?? jetzt);
  const vorher = z1.muster.find((x) => x.muster === u.muster)?.hauptvarianten ?? [];
  const { variante, muster } = werteUebungAus(z1, position, jetzt, ort.id);
  const i = vorher.indexOf(u.id);
  if (i >= 0 && !muster.hauptvarianten.includes(u.id) && muster.hauptvarianten.length > 0) {
    const neuId = muster.hauptvarianten.find((id) => !vorher.includes(id))
      ?? muster.hauptvarianten[Math.min(i, muster.hauptvarianten.length - 1)]!;
    const neu = uebungVon(z1, neuId)!;
    const z2 = { ...z1, varianten: ersetze(z1.varianten, variante, (x) => x.uebungId === variante.uebungId) };
    const werte = startwerte(z2, e, ort, neu);
    const kalibrierung = neu.lasttyp === 'Last' && !z2.varianten.some((v) => v.uebungId === neu.id && v.last !== undefined);
    return { uebungId: neu.id, ...werte, ...(kalibrierung ? { zielWdh: bereichFuer(e, neu).von } : {}), neueVariante: true, kalibrierung };
  }
  return {
    uebungId: u.id, zielWdh: variante.zielWdh,
    ...(variante.last !== undefined ? { last: variante.last } : {}),
    ...(variante.bandStufe ? { bandStufe: variante.bandStufe } : {}),
    ...(variante.langsam ? { langsam: true } : {}),
    neueVariante: false, kalibrierung: false,
  };
}

// Schreibt eine beendete Einheit in den Trainingszustand: Progression je Übung, Hauptvarianten,
// Max-Tests, Muskeln (Erholung), Woche, Zirkel-Bestzeit und Zyklus.
export function schliesseEinheitAb(z: AppZustand, einheit: Einheit, jetzt: string): AppZustand {
  const e = einstellungenVon(z);
  const fertig: Einheit = {
    ...einheit,
    status: einheit.status === 'abgebrochen' ? 'abgebrochen' : 'abgeschlossen',
    gestartetAm: einheit.gestartetAm ?? jetzt,
    beendetAm: einheit.beendetAm ?? jetzt,
  };
  const start = fertig.gestartetAm!;
  const ort = ortVon(z, fertig.ortId);
  let neu: AppZustand = { ...z };
  const positionen = fertig.bloecke.filter((b) => b.typ !== 'zirkel').flatMap((b) => b.positionen)
    .filter((p) => p.ergebnisse.length > 0);

  // Stand vor dem Abschluss, damit Löschen ihn zurückholen kann (Entscheidung 29.10.2026).
  if (fertig.format !== 'test') fertig.vorher = vorstand(z, positionen);

  if (ort) neu = legeHauptvariantenFest(neu, fertig, ort, start);

  // Progression je Übung und Max-Tests
  for (const p of positionen) {
    const u = uebungVon(neu, p.uebungId);
    if (!u || !ort || p.istLasttest) continue;     // Gewichtstests wertet `schliesseTesttagAb` aus
    if (p.istMaxTest) {
      // Gespeichert wird in der Einheit der Übung; am Testtag hat der Klimmzug-Test bei 0 Wdh.
      // zusätzlich die Sekunden im Hängen (nur für die Startvariante).
      const s = p.ergebnisse[0]!;
      const inSek = u.bereich.einheit === 'Sek.';
      const test: MaxTest = {
        id: `maxtest-${start}-${u.muster}`, datum: start, muster: u.muster, uebungId: u.id,
        ergebnis: (inSek ? s.sek ?? s.wdh : s.wdh ?? s.sek) ?? 0, einheit: u.bereich.einheit,
      };
      neu = { ...neu, maxTests: ersetze(neu.maxTests, test, (x) => x.id === test.id) };
      if (fertig.format === 'test') continue;
    }
    const { variante, muster } = werteUebungAus(neu, p, jetzt, ort.id);
    if (!p.istMaxTest) neu = { ...neu, varianten: ersetze(neu.varianten, variante, (x) => x.uebungId === variante.uebungId) };
    neu = { ...neu, muster: ersetze(neu.muster, muster, (x) => x.muster === muster.muster) };
  }

  // Muskeln: letzte Belastung für das Erholungsfenster; „zu schwer“ zählt für die Primärmuskeln.
  const dosis = dosisProMuskel(z, fertig);
  const zuSchwer = new Set<Muskel>(positionen.filter((p) => !p.istMaxTest && feedbackVon(p) === 'schwer')
    .flatMap((p) => uebungVon(z, p.uebungId)?.primaer ?? []));
  const muskeln: MuskelZustand[] = MUSKELN.map((m) => {
    const alt = neu.muskeln.find((x) => x.muskel === m) ?? {
      muskel: m, letzteDosis: 0, letzteSchwer: false, persoenlicheGrenze: persoenlicheGrenze(z, e, m), gleichWochen: 0, leistung: [],
    };
    // Der Testtag sperrt keine Muskeln (Entscheidung 21.10.2026).
    if (dosis[m] <= 0 || fertig.format === 'test') return alt;
    return { ...alt, letzteBelastung: start, letzteDosis: dosis[m], letzteSchwer: zuSchwer.has(m) };
  });

  // Woche
  const wocheId = fertig.woche;
  const altWoche = z.wochen.find((w) => w.id === wocheId);
  const einheiten = (altWoche?.einheiten ?? 0) + 1;
  const prognose = Math.min(6, Math.max(altWoche?.prognose ?? e.ueblicheEinheiten, einheiten));
  const leer = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;
  const erledigt = { ...(altWoche?.erledigt ?? leer()) };
  for (const m of MUSKELN) erledigt[m] += dosis[m];
  const woche: Woche = {
    id: wocheId, prognose, einheiten, erledigt,
    ziele: ort ? wochenziele(z, prognose, ort.id, start, altWoche?.erholungswoche) : (altWoche?.ziele ?? leer()),
    erholungswoche: altWoche?.erholungswoche ?? false, laengerAngenommen: altWoche?.laengerAngenommen ?? false,
    ...(altWoche?.tage ? { tage: altWoche.tage } : {}),
  };

  // Zirkel-Bestzeit je Zirkel, Ort und Variantensatz
  const zirkel = fertig.bloecke.find((b) => b.typ === 'zirkel');
  if (zirkel?.zirkelId && fertig.status === 'abgeschlossen') {
    neu = {
      ...neu,
      zirkelErgebnisse: [...neu.zirkelErgebnisse, {
        zirkelId: zirkel.zirkelId, ortId: fertig.ortId, datum: start,
        zeitSek: Math.round(stundenZwischen(start, fertig.beendetAm!) * 3600), varianten: zirkel.positionen.map((p) => p.uebungId),
      }],
    };
  }

  const zyklen: Zyklus[] = neu.zyklen.length > 0 ? neu.zyklen : [{ nr: 1, start }];
  return {
    ...neu, muskeln, zyklen,
    // Der Testtag zählt nicht als Einheit der Woche (Entscheidung 20.10.2026).
    wochen: fertig.format === 'test' ? neu.wochen : ersetze(neu.wochen, woche, (w) => w.id === wocheId),
    einheiten: ersetze(neu.einheiten, fertig, (x) => x.id === fertig.id),
  };
}

function vorstand(z: AppZustand, positionen: Position[]): Vorstand {
  const ids = [...new Set(positionen.filter((p) => !p.istMaxTest).map((p) => p.uebungId))];
  const muster = [...new Set(positionen.map((p) => uebungVon(z, p.uebungId)?.muster).filter((m) => m !== undefined))];
  const mit = <T,>(zustand: T | undefined) => (zustand ? { zustand } : {});
  return {
    varianten: ids.map((uebungId) => ({ uebungId, ...mit(z.varianten.find((v) => v.uebungId === uebungId)) })),
    muster: muster.map((m) => ({ muster: m, ...mit(z.muster.find((x) => x.muster === m)) })),
  };
}

// ---------- Wochenabschluss ----------

// Mittlere Gesamtanstrengung der Woche (nur bewertete Einheiten).
function anstrengung(z: AppZustand, wocheId: string): number | undefined {
  return mittel(fertigeEinheiten(z).filter((x) => x.woche === wocheId && x.gesamtbewertung !== undefined)
    .map((x) => x.gesamtbewertung!));
}

function wochenwert(e: Einstellungen, u: Uebung, liste: Sitzung[], wocheId: string): number | undefined {
  return mittel(liste.filter((s) => s.einheit.woche === wocheId)
    .map((s) => leistungswert(e, u, s.position)).filter((w): w is number => w !== undefined));
}

// Leistung eines Muskels: mittlere relative Veränderung seiner Hauptvarianten (Muskel primär)
// gegenüber dem 2-Wochen-Mittel davor. Varianten ohne Vergleich (z. B. in der Woche gewechselt) zählen nicht.
export function muskelLeistung(z: AppZustand, m: Muskel, wocheId: string): number | undefined {
  const e = einstellungenVon(z);
  const ids = new Set(z.muster.flatMap((x) => x.hauptvarianten));
  const davor = [1, 2].map((d) => wocheVerschoben(wocheId, -d));
  const aenderungen: number[] = [];
  for (const id of ids) {
    const u = uebungVon(z, id);
    if (!u || !u.primaer.includes(m)) continue;
    const liste = sitzungen(z, id);
    const jetzt = liste.filter((s) => s.einheit.woche === wocheId);
    // Band: nur vergleichbar, wenn dieselbe Stufe genutzt wurde.
    const stufe = jetzt[0]?.position.bandStufe;
    const vergleichbar = u.lasttyp === 'Band' ? liste.filter((s) => s.position.bandStufe === stufe) : liste;
    const aktuell = wochenwert(e, u, vergleichbar, wocheId);
    const vorher = mittel(davor.map((w) => wochenwert(e, u, vergleichbar, w)).filter((w): w is number => w !== undefined));
    if (aktuell !== undefined && vorher) aenderungen.push(aktuell / vorher - 1);
  }
  return mittel(aenderungen);
}

// Ein „zu schwer“ in der Woche, das nicht in eine Eingewöhnung fällt (die ersten 2 Einheiten einer
// Variante oder nach einer Steigerung von Last bzw. Band).
function schwerAusserhalbEingewoehnung(z: AppZustand, m: Muskel, wocheId: string): boolean {
  for (const u of alleUebungen(z).filter((x) => x.primaer.includes(m))) {
    const liste = sitzungen(z, u.id);
    const stufe = (s: Sitzung) => s.position.last ?? (s.position.bandStufe ? BAND_STUFEN.indexOf(s.position.bandStufe) : 0);
    const gesteigert = (j: number) => j >= 1 && stufe(liste[j]!) !== stufe(liste[j - 1]!);
    for (let j = 0; j < liste.length; j++) {
      const s = liste[j]!;
      if (s.einheit.woche !== wocheId || feedbackVon(s.position) !== 'schwer') continue;
      if (j < PROGRESSION.eingewoehnungEinheiten || gesteigert(j) || gesteigert(j - 1)) continue;
      return true;
    }
  }
  return false;
}

// Höchstes erledigtes Wochenvolumen des Muskels in dieser und den 3 Wochen davor.
function bestesVolumen(z: AppZustand, m: Muskel, wocheId: string): number {
  const ids = Array.from({ length: VOLUMENGRENZE.bestesAusWochen }, (_, i) => wocheVerschoben(wocheId, -i));
  return Math.max(0, ...ids.map((id) => z.wochen.find((w) => w.id === id)?.erledigt[m] ?? 0));
}

// Neue Hauptvarianten der Nebenübungen (Isolation, Bauch, Waden) zu Beginn eines Zyklus: bevorzugt
// eine andere Variante gleicher Stufe. Favoriten bleiben; Varianten ab 4 Sternen bleiben auch, außer sie
// wurden in den letzten 2 Zyklen jeweils trainiert: Dann setzen sie einen Zyklus aus und stehen in diesem
// Zyklus auch nicht als Ersatz zur Wahl (Entscheidung 29.10.2026). Getauscht wird nur gegen eine Variante
// mit mindestens 3 Sternen (bei 1 oder 2 Sternen genügen 2), mehr Sterne zuerst. Ein Tausch je Zyklus
// nimmt eine noch nie trainierte Variante, falls möglich und keine Variante ab 4 Sternen an der Reihe ist;
// welcher Tausch, wechselt mit der Zyklusnummer.
function tauscheNebenuebungen(z: AppZustand, laufend: Zyklus, jetzt: string): MusterZustand[] {
  const e = einstellungenVon(z);
  const ort = ortVon(z, '');
  if (!ort) return z.muster;
  const sterne = (id: string) => sterneVon(e, id);
  const letzte = [laufend, ...z.zyklen.filter((x) => x.nr < laufend.nr).sort((a, b) => b.nr - a.nr)]
    .slice(0, BEWERTUNG.pauseNachZyklen);
  const trainiertIn = (id: string, zy: Zyklus) => sitzungen(z, id).some((x) => x.zeit >= zy.start && x.zeit < (zy.ende ?? jetzt));
  const pausiert = (id: string) => !e.favoriten.includes(id) && sterne(id) >= BEWERTUNG.bleibtAbSterne
    && letzte.length === BEWERTUNG.pauseNachZyklen && letzte.every((zy) => trainiertIn(id, zy));
  const nebenmuster = z.muster.filter((mz) => MUSTER_ART[mz.muster] === 'isolation' || MUSTER_ART[mz.muster] === 'zusatz');
  const pause = new Set(nebenmuster.flatMap((mz) => mz.hauptvarianten).filter(pausiert));

  // Plätze, die getauscht werden, je mit ihren Kandidaten (mehr Sterne zuerst)
  const plaetze = nebenmuster.flatMap((mz) => mz.hauptvarianten.flatMap((id) => {
    const u = uebungVon(z, id);
    if (!u || e.favoriten.includes(id) || (sterne(id) >= BEWERTUNG.bleibtAbSterne && !pause.has(id))) return [];
    const mindestens = sterne(id) < BEWERTUNG.neutral ? BEWERTUNG.ersatzMinSterne : BEWERTUNG.tauschMinSterne;
    const kandidaten = alleUebungen(z).filter((v) => v.muster === u.muster && v.stufe === u.stufe
      && !mz.hauptvarianten.includes(v.id) && !pause.has(v.id) && sterne(v.id) >= mindestens && uebungErlaubt(e, ort, v, jetzt))
      .sort((a, b) => sterne(b.id) - sterne(a.id)).map((v) => v.id);
    return [{ muster: mz.muster, id, kandidaten }];
  }));
  const nieTrainiert = (id: string) => sitzungen(z, id).length === 0;
  // Eine zurückkehrende Variante ab 4 Sternen geht der neuen vor.
  const mitNeuer = plaetze.filter((p) => p.kandidaten.some(nieTrainiert) && sterne(p.kandidaten[0]!) < BEWERTUNG.bleibtAbSterne);
  const neue = new Set(Array.from({ length: Math.min(BEWERTUNG.neueProZyklus, mitNeuer.length) },
    (_, i) => mitNeuer[(laufend.nr + 1 + i) % mitNeuer.length]!));

  return z.muster.map((mz) => {
    const neu = mz.hauptvarianten.map((id) => {
      const platz = plaetze.find((p) => p.muster === mz.muster && p.id === id);
      if (!platz) return id;
      return (neue.has(platz) ? platz.kandidaten.find(nieTrainiert) : undefined) ?? platz.kandidaten[0] ?? id;
    });
    return { ...mz, hauptvarianten: [...new Set(neu)] };
  });
}

// Wochen vor der aktuellen, deren Abschluss noch fehlt (älteste zuerst).
export function offeneWochenabschluesse(z: AppZustand, jetzt: string): string[] {
  const aktuell = isoWoche(jetzt);
  return z.wochen.filter((w) => w.id < aktuell && !w.ausgewertet).map((w) => w.id).sort();
}

// Wochenabschluss: Leistung je Muskel, Anpassung der persönlichen Volumengrenze, Zyklusende.
export function wochenabschluss(z: AppZustand, wocheId: string): AppZustand {
  const woche = z.wochen.find((w) => w.id === wocheId);
  if (!woche || woche.ausgewertet) return z;
  const e = einstellungenVon(z);
  const g = VOLUMENGRENZE;
  const schnitt = anstrengung(z, wocheId);

  const muskeln: MuskelZustand[] = MUSKELN.map((m) => {
    const alt = z.muskeln.find((x) => x.muskel === m) ?? {
      muskel: m, letzteDosis: 0, letzteSchwer: false, persoenlicheGrenze: persoenlicheGrenze(z, e, m), gleichWochen: 0, leistung: [],
    };
    const mz: MuskelZustand = { ...alt, leistung: [...alt.leistung] };
    const leistung = muskelLeistung(z, m, wocheId);
    if (leistung !== undefined) mz.leistung = ersetze(mz.leistung, { woche: wocheId, wert: leistung }, (x) => x.woche === wocheId);
    // Bewertet werden nur Muskeln mit mindestens 80 % ihres Ziels; Erholungswochen verändern nichts.
    const ziel = woche.ziele[m];
    if (woche.erholungswoche || ziel <= 0 || woche.erledigt[m] < g.bewertenAbAnteilZiel * ziel) return mz;
    const p = WOCHENZIEL.prioritaet[e.prioritaeten[m]];
    if ((leistung !== undefined && leistung < -g.gefallenUeber) || (schnitt !== undefined && schnitt >= g.anstrengungAb)) {
      mz.persoenlicheGrenze = Math.min(mz.persoenlicheGrenze, Math.max(p.untergrenze + g.minUeberUntergrenze, mz.persoenlicheGrenze - g.schritt));
      mz.gleichWochen = 0;
    } else if (leistung !== undefined && Math.abs(leistung) <= g.gleichInnerhalb) {
      mz.gleichWochen += 1;
      if (mz.gleichWochen >= g.gleichWochen && !schwerAusserhalbEingewoehnung(z, m, wocheId)
        && (schnitt === undefined || schnitt <= g.anstrengungHoechstens)) {
        // Deckel: höchstens 4 Sätze über dem besten Wochenvolumen der letzten 4 Wochen.
        const hoeher = Math.min(mz.persoenlicheGrenze + g.schritt, p.obergrenze, bestesVolumen(z, m, wocheId) + g.maxUeberBestem);
        if (hoeher > mz.persoenlicheGrenze) {
          mz.persoenlicheGrenze = hoeher;
          mz.gleichWochen = 0;
        }
      }
    } else mz.gleichWochen = 0;
    return mz;
  });

  // Zyklus: endet nach 6 Wochen oder mit einer Erholungswoche; danach neue Nebenübungen.
  const naechsterMontag = wocheStart(wocheVerschoben(wocheId, 1));
  let zyklen = [...z.zyklen];
  let muster = z.muster;
  const laufend = zyklen.find((x) => !x.ende);
  const grund: Zyklus['grund'] | undefined = woche.erholungswoche ? 'erholungswoche'
    : laufend && stundenZwischen(laufend.start, naechsterMontag) >= EINHEIT.zyklusWochen * 7 * 24 ? 'zeitablauf' : undefined;
  if (laufend && grund) {
    zyklen = [...zyklen.filter((x) => x !== laufend), { ...laufend, ende: plusTage(naechsterMontag, 0), grund },
      { nr: laufend.nr + 1, start: naechsterMontag }];
    muster = tauscheNebenuebungen(z, { ...laufend, ende: naechsterMontag }, naechsterMontag);
  }

  return {
    ...z, muskeln, zyklen, muster,
    wochen: z.wochen.map((w) => (w.id === wocheId ? { ...w, ausgewertet: true } : w)),
  };
}

// ---------- Erholungswoche ----------

export type ErholungswocheGrund = 'leistung' | 'anstrengung' | 'zehnWochen';

// Sinkt die Leistung einer Variante in ihren letzten 2 Einheiten? Last: weniger Wdh. bei gleicher
// Last als in der Einheit davor; KG und Band: erster Satz 2 Wdh. unter dem Mittel der beiden davor.
function leistungSinkt(u: Uebung, liste: Sitzung[]): boolean {
  const erster = (s: Sitzung) => ersterSatz(s.position) ?? 0;
  const sinkt = (j: number) => {
    const s = liste[j];
    if (!s || j < 1) return false;
    if (u.lasttyp === 'Last') {
      const davor = liste[j - 1]!;
      return s.position.last === davor.position.last && erster(s) < erster(davor);
    }
    if (j < 2) return false;
    const vor = [liste[j - 1]!, liste[j - 2]!];
    if (u.lasttyp === 'Band' && vor.some((x) => x.position.bandStufe !== s.position.bandStufe)) return false;
    return erster(s) <= (erster(vor[0]!) + erster(vor[1]!)) / 2 - ERHOLUNGSWOCHE.abfallWdh;
  };
  const n = liste.length;
  return Array.from({ length: ERHOLUNGSWOCHE.einheitenInFolge }, (_, i) => n - 1 - i).every(sinkt);
}

// Angebot einer Erholungswoche bei der ersten Einheit der Woche (Entscheidung 20.10.2026: alle
// Auslöser nur als Angebot). Ausgewertet werden nur Daten vor dieser Woche.
export function erholungswocheAngebot(z: AppZustand, jetzt: string): ErholungswocheGrund | null {
  const wocheId = isoWoche(jetzt);
  if (z.wochen.some((w) => w.id === wocheId)) return null;
  if (z.wochen.find((w) => w.id === wocheVerschoben(wocheId, -1))?.erholungswoche) return null;
  const bis = wocheStart(wocheId);

  let muster = 0;
  for (const mId of new Set(alleUebungen(z).map((u) => u.muster))) {
    if (MUSTER_ART[mId] === 'kondition') continue;
    const sinkt = alleUebungen(z).filter((u) => u.muster === mId).some((u) => leistungSinkt(u, sitzungen(z, u.id, bis)));
    if (sinkt) muster += 1;
  }
  if (muster >= ERHOLUNGSWOCHE.musterMitAbfall) return 'leistung';

  const bewertungen = fertigeEinheiten(z).filter((x) => einheitZeit(x) < bis && x.gesamtbewertung !== undefined)
    .slice(-ERHOLUNGSWOCHE.anstrengungWorkouts).map((x) => x.gesamtbewertung!);
  if (bewertungen.length === ERHOLUNGSWOCHE.anstrengungWorkouts && mittel(bewertungen)! >= ERHOLUNGSWOCHE.anstrengungAb) return 'anstrengung';

  // 10 Wochen ohne eine Woche unter 60 % des üblichen Volumens
  const erste = z.wochen.map((w) => w.id).sort()[0];
  const anzahl = ERHOLUNGSWOCHE.wochenOhneEntlastung;
  if (!erste || erste > wocheVerschoben(wocheId, -anzahl)) return null;
  const ohneEntlastung = Array.from({ length: anzahl }, (_, i) => wocheVerschoben(wocheId, -1 - i)).every((id) => !istEntlastung(z, id));
  return ohneEntlastung ? 'zehnWochen' : null;
}

// Erledigte Wochensätze aller Muskeln; fehlende Wochen zählen 0.
export function wochenSaetze(z: AppZustand, wocheId: string): number {
  const w = z.wochen.find((x) => x.id === wocheId);
  return w ? MUSKELN.reduce((s, m) => s + w.erledigt[m], 0) : 0;
}

// Zählt die Woche als Entlastung? Erholungswoche oder unter 60 % des üblichen Volumens (Mittel der
// erledigten Wochensätze der 4 Wochen davor).
export function istEntlastung(z: AppZustand, wocheId: string): boolean {
  if (z.wochen.find((w) => w.id === wocheId)?.erholungswoche) return true;
  const ueblich = mittel(Array.from({ length: ERHOLUNGSWOCHE.ueblichesVolumenWochen }, (_, i) => wochenSaetze(z, wocheVerschoben(wocheId, -1 - i))))!;
  return wochenSaetze(z, wocheId) < ERHOLUNGSWOCHE.entlastungUnterAnteil * ueblich;
}

// ---------- Max-Tests ----------

export function maxTestFaellig(z: AppZustand, jetzt: string, ortId: string): { muster: MusterId; uebungId: string } | null {
  const ort = ortVon(z, ortId);
  if (!ort) return null;
  const prognose = z.wochen.find((w) => w.id === isoWoche(jetzt))?.prognose ?? einstellungenVon(z).ueblicheEinheiten;
  return faelligerMaxTest(z, jetzt, ort, prognose, istErholungswoche(z, jetzt));
}

// ---------- Rekorde ----------

export interface Rekord {
  art: 'kraft' | 'wiederholungen' | 'sekunden' | 'maxTest' | 'zirkel';
  uebungId?: string; zirkelId?: string; wert: number; bisher: number;
}

// Neue Bestwerte einer beendeten Einheit gegenüber dem Zustand vor ihrem Abschluss.
export function neueRekorde(z: AppZustand, einheit: Einheit): Rekord[] {
  const e = einstellungenVon(z);
  const rekorde: Rekord[] = [];
  for (const b of einheit.bloecke) {
    if (b.typ === 'zirkel') continue;
    for (const p of b.positionen) {
      const u = uebungVon(z, p.uebungId);
      const erster = ersterSatz(p);
      if (!u || erster === undefined) continue;
      if (p.istMaxTest) {
        const bisher = z.maxTests.filter((t) => t.muster === u.muster && t.uebungId === u.id).map((t) => t.ergebnis);
        if (bisher.length > 0 && erster > Math.max(...bisher)) rekorde.push({ art: 'maxTest', uebungId: u.id, wert: erster, bisher: Math.max(...bisher) });
        continue;
      }
      const wert = leistungswert(e, u, p);
      const frueher = sitzungen(z, u.id).filter((s) => s.einheit.id !== einheit.id
        && (u.lasttyp !== 'Band' || s.position.bandStufe === p.bandStufe));
      const bisher = frueher.map((s) => leistungswert(e, u, s.position)).filter((w): w is number => w !== undefined);
      if (wert === undefined || bisher.length === 0 || wert <= Math.max(...bisher) + 1e-9) continue;
      const art = u.lasttyp === 'Last' ? 'kraft' : u.lasttyp === 'Zeit' ? 'sekunden' : 'wiederholungen';
      rekorde.push({ art, uebungId: u.id, wert, bisher: Math.max(...bisher) });
    }
  }
  const zirkel = einheit.bloecke.find((b) => b.typ === 'zirkel');
  if (zirkel?.zirkelId && einheit.gestartetAm && einheit.beendetAm) {
    const zeit = Math.round(stundenZwischen(einheit.gestartetAm, einheit.beendetAm) * 3600);
    const varianten = zirkel.positionen.map((p) => p.uebungId).join();
    const bisher = z.zirkelErgebnisse.filter((r) => r.zirkelId === zirkel.zirkelId && r.ortId === einheit.ortId
      && r.varianten.join() === varianten).map((r) => r.zeitSek);
    if (bisher.length > 0 && zeit < Math.min(...bisher)) rekorde.push({ art: 'zirkel', zirkelId: zirkel.zirkelId, wert: zeit, bisher: Math.min(...bisher) });
  }
  return rekorde;
}
