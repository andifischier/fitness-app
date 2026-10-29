// Ablauf einer Einheit im Trainings-Player (Paket 7): Reihenfolge der Sätze, Pausen, Vorgaben,
// Kalibrierungssatz und „Letztes Mal“. Rein und deterministisch: Die Zeit wird übergeben. Wo das
// Training steht, ergibt sich allein aus den gespeicherten Satzergebnissen; so setzt ein
// Neustart der App am richtigen Satz fort.
import { BEWERTUNG, MUSTER_ART, PLAYER, PROGRESSION } from '../konfiguration';
import { stundenZwischen } from './datum';
import { lastraster } from './equipment';
import { bereichFuer, lastAnzeige } from './planung';
import type { AppZustand, BandStufe, Block, Einheit, Feedback, Position, SatzErgebnis, Uebung } from './typen';
import { naechsteVariante } from './progression';
import {
  e1rm, einstellungenVon, ersterSatz, feedbackVon, fertigeEinheiten, leistungswert, sitzungen, uebungVon, wdhBei, zielReserve,
} from './verlauf';

// Ein Schritt ist ein Satz (bzw. eine Zirkel-Station in einer Runde).
export interface Schritt { block: number; position: number; satz: number }

const begrenze = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

// Alle Schritte in der Reihenfolge des Trainings. Supersatz: A1 Satz 1, A2 Satz 1, A1 Satz 2, …
// (hat eine Übung weniger Sätze, fehlt sie in den letzten Runden). Zirkel: Runde für Runde alle Stationen.
export function schritte(einheit: Einheit): Schritt[] {
  const liste: Schritt[] = [];
  einheit.bloecke.forEach((b, block) => {
    if (b.typ === 'einzeln') {
      b.positionen.forEach((p, position) => {
        for (let satz = 1; satz <= p.saetze; satz++) liste.push({ block, position, satz });
      });
      return;
    }
    const runden = b.typ === 'zirkel' ? b.runden ?? 1 : Math.max(0, ...b.positionen.map((p) => p.saetze));
    for (let satz = 1; satz <= runden; satz++) {
      b.positionen.forEach((p, position) => {
        if (b.typ === 'zirkel' || satz <= p.saetze) liste.push({ block, position, satz });
      });
    }
  });
  return liste;
}

// Block, in dem das Training gerade steht: der des nächsten offenen Schritts; ist alles erledigt, der letzte.
export function aktuellerBlock(einheit: Einheit): number {
  const liste = schritte(einheit);
  return (liste[aktuellerSchritt(einheit)] ?? liste.at(-1))?.block ?? 0;
}

// Abschnitte des Fortschrittsbalkens, seit 29.10.2026 nur für einen Block (Entscheidung): Kombi und
// Zirkel je Runde, einzelne Übungen je Übung; innerhalb eines Abschnitts steht jeder Schritt (Satz bzw.
// Station) einzeln.
export type Balkenschritt = 'erledigt' | 'aktuell' | 'offen';

export function balkenAbschnitte(einheit: Einheit, block = aktuellerBlock(einheit)): Balkenschritt[][] {
  const liste = schritte(einheit);
  const aktuell = aktuellerSchritt(einheit);
  const einzeln = einheit.bloecke[block]?.typ === 'einzeln';
  const abschnitte: Balkenschritt[][] = [];
  let vorherGruppe: number | undefined;
  liste.forEach((s, i) => {
    if (s.block !== block) return;
    const gruppe = einzeln ? s.position : s.satz;
    if (gruppe !== vorherGruppe) abschnitte.push([]);
    vorherGruppe = gruppe;
    abschnitte.at(-1)!.push(positionVon(einheit, s).ergebnisse.length >= s.satz ? 'erledigt' : i === aktuell ? 'aktuell' : 'offen');
  });
  return abschnitte;
}

// Beginnt nach Schritt i ein neuer Block? Dann zeigt die Pause den nächsten Block, und weiter geht es
// erst mit „Los“ (Entscheidung 29.10.2026). Im Zirkel und nach dem letzten Schritt nie.
export function blockwechselNach(einheit: Einheit, i: number): boolean {
  const liste = schritte(einheit);
  const s = liste[i];
  const naechster = liste[i + 1];
  return s !== undefined && naechster !== undefined && naechster.block !== s.block && einheit.format !== 'zirkel';
}

export function positionVon(einheit: Einheit, s: Schritt): Position {
  return einheit.bloecke[s.block]!.positionen[s.position]!;
}

// Index des nächsten offenen Schritts; gleich der Länge der Liste, wenn alles erledigt ist.
export function aktuellerSchritt(einheit: Einheit): number {
  const liste = schritte(einheit);
  const i = liste.findIndex((s) => positionVon(einheit, s).ergebnisse.length < s.satz);
  return i < 0 ? liste.length : i;
}

export function erledigteSaetze(einheit: Einheit): number {
  return einheit.bloecke.reduce((n, b) => n + b.positionen.reduce((m, p) => m + p.ergebnisse.length, 0), 0);
}

// Pause nach einem Schritt in Sekunden: im Supersatz nur nach dem Paar, im Zirkel nie, nach dem
// letzten Schritt der Einheit keine.
export function pauseNach(einheit: Einheit, i: number): number {
  const liste = schritte(einheit);
  const s = liste[i];
  const naechster = liste[i + 1];
  if (!s || !naechster) return 0;
  const b: Block = einheit.bloecke[s.block]!;
  if (b.typ === 'zirkel') return 0;
  if (b.typ === 'supersatz' && naechster.block === s.block && naechster.satz === s.satz) return 0;
  return b.pauseSek;
}

// Erster Satz einer Last-Übung, für die es noch keine Last gibt: Der Nutzer wählt das Gewicht,
// Ziel ist die Untergrenze des Bereichs mit Reserve 3 (Kalibrierungssatz).
export function istKalibrierung(z: AppZustand, einheit: Einheit, s: Schritt): boolean {
  return s.satz === 1 && ohneLast(z, einheit, s);
}

// Erster Satz nach dem Kalibrierungssatz: Er zeigt das daraus berechnete Ziel (die Progression misst an ihm).
function nachKalibrierung(z: AppZustand, einheit: Einheit, s: Schritt): boolean {
  return s.satz === 2 && ohneLast(z, einheit, s) && positionVon(einheit, s).ergebnisse[0]?.last !== undefined;
}

function ohneLast(z: AppZustand, einheit: Einheit, s: Schritt): boolean {
  const b = einheit.bloecke[s.block]!;
  const p = positionVon(einheit, s);
  const u = uebungVon(z, p.uebungId);
  if (!u || b.typ === 'zirkel' || p.istMaxTest || u.lasttyp !== 'Last' || p.last === undefined) return false;
  return z.varianten.find((v) => v.uebungId === u.id)?.last === undefined;
}

export interface SatzVorgabe {
  art: 'ziel' | 'maxTest' | 'station';
  wert: number;                       // Wiederholungen bzw. Sekunden; beim Max-Test 0
  inSek: boolean;
  bereich?: { von: number; bis: number };
  last?: number; bandStufe?: BandStufe;
  reserve: string;                    // Hinweistext zur Reserve
  kalibrierung: boolean;
  langsam: boolean;
  zaehlen: boolean;                   // Geschafftes eingeben (nur Kalibrierungssatz und Max-Test)
}

// Was ein Satz anzeigt: Ziel, Last und Hinweis zur Reserve. Seit 29.10.2026 (Entscheidung) ist das Ziel
// in jedem Satz der Richtwert und wird mit „Satz erledigt“ als geschafft gespeichert; gezählt wird nur
// im Kalibrierungssatz (Gewicht finden) und im Max-Test.
export function satzVorgabe(z: AppZustand, einheit: Einheit, s: Schritt): SatzVorgabe {
  const e = einstellungenVon(z);
  const b = einheit.bloecke[s.block]!;
  const p = positionVon(einheit, s);
  const u = uebungVon(z, p.uebungId);
  const inSek = u?.bereich.einheit === 'Sek.';
  const bereich = u ? bereichFuer(e, u) : undefined;
  const werte = { last: satzLast(z, einheit, s), bandStufe: p.bandStufe };
  const basis = { inSek, ...werte, kalibrierung: false, langsam: p.langsam === true, zaehlen: false };
  if (p.istMaxTest) {
    return { ...basis, zaehlen: true, art: 'maxTest', wert: 0, reserve: inSek ? 'Nur so lange, wie die Haltung sauber bleibt.' : 'Ohne Pause, nur saubere Wiederholungen.' };
  }
  if (b.typ === 'zirkel') return { ...basis, art: 'station', wert: p.zielWdh, reserve: '' };
  const kalibrierung = istKalibrierung(z, einheit, s);
  const reserve = kalibrierung
    ? `${u && lastAnzeige(z, u) === 'vorschlag'
      ? `Vorschlag aus deinem Testtag für etwa ${bereich!.von} Wiederholungen; passt es nicht, ändere es.`
      : `Wähle ein Gewicht für etwa ${bereich!.von} Wiederholungen.`} Aufhören, wenn noch ${PROGRESSION.neueVarianteReserve} gingen.`
    : reserveText(e.zielReserve, inSek, letzterIsolationssatz(u, p, s));
  return { ...basis, art: 'ziel', wert: kalibrierung ? bereich!.von : p.zielWdh, bereich, reserve, kalibrierung, zaehlen: kalibrierung };
}

const letzterIsolationssatz = (u: Uebung | undefined, p: Position, s: Schritt) =>
  u !== undefined && MUSTER_ART[u.muster] === 'isolation' && s.satz === p.saetze;

function reserveText(zielReserve: '1-3' | '2-3', inSek: boolean, letzterIsolation: boolean): string {
  const { reserveHaltenSek: h, reserveLetzterIsolationssatz: l } = PLAYER;
  if (inSek) return `Aufhören, wenn noch ${h.von} bis ${h.bis} Sekunden gingen.`;
  const text = `Aufhören, wenn noch ${zielReserve === '2-3' ? '2 bis 3' : '1 bis 3'} Wiederholungen gingen.`;
  return letzterIsolation ? `${text} Im letzten Satz genügen ${l.von} bis ${l.bis}.` : text;
}

// Last und Ziel der restlichen Sätze nach dem Kalibrierungssatz: schwerste Last am Ort, bei der die
// Kraftschätzung (Reserve 3 im Kalibrierungssatz) noch die Untergrenze mit Ziel-Reserve zulässt;
// Ziel = geschätzte Wiederholungen dort, begrenzt auf U − 1 bis O.
export function kalibriere(z: AppZustand, ortId: string, u: Uebung, last: number, wdh: number): { last: number; zielWdh: number } {
  const e = einstellungenVon(z);
  const ort = z.orte.find((o) => o.id === ortId);
  const { von: U, bis: O } = bereichFuer(e, u);
  const raster = ort ? lastraster(ort, u) : [];
  const schaetzung = e1rm(last, wdh, PROGRESSION.neueVarianteReserve);
  const r = zielReserve(e);
  const neu = [...raster].reverse().find((kg) => wdhBei(schaetzung, kg, r) >= U) ?? raster[0] ?? last;
  return { last: neu, zielWdh: begrenze(wdhBei(schaetzung, neu, r), U - 1, O) };
}

// Last eines Satzes: die des vorherigen Satzes, wenn der Nutzer sie geändert hat (Entscheidung
// 21.10.2026: in jedem Satz änderbar), sonst die geplante. Nach dem Kalibrierungssatz gilt die
// kalibrierte Last der Position.
export function satzLast(z: AppZustand, einheit: Einheit, s: Schritt): number | undefined {
  const p = positionVon(einheit, s);
  const vorher = s.satz > 1 && !nachKalibrierung(z, einheit, s) ? p.ergebnisse[s.satz - 2]?.last : undefined;
  return vorher ?? p.last;
}

// Lässt sich das Gewicht in diesem Satz wählen? Bei Last-Übungen außerhalb von Zirkel und Max-Test.
export function lastWaehlbar(z: AppZustand, einheit: Einheit, s: Schritt): boolean {
  const p = positionVon(einheit, s);
  return einheit.bloecke[s.block]!.typ !== 'zirkel' && !p.istMaxTest && p.last !== undefined
    && uebungVon(z, p.uebungId)?.lasttyp === 'Last';
}

// Trägt einen erledigten Satz ein (Zirkel-Station: Vorgabe), mit der gewählten Last. Nach dem
// Kalibrierungssatz bekommen die restlichen Sätze Last und Ziel aus `kalibriere`.
export function trageSatzEin(z: AppZustand, einheit: Einheit, s: Schritt, wert: number, jetzt: string, last?: number): Einheit {
  const neu = structuredClone(einheit);
  const p = positionVon(neu, s);
  const u = uebungVon(z, p.uebungId);
  const inSek = u?.bereich.einheit === 'Sek.';
  const kalibrierung = istKalibrierung(z, einheit, s);
  const gewicht = last !== undefined && lastWaehlbar(z, einheit, s) ? last : satzLast(z, einheit, s);
  const ergebnis: SatzErgebnis = {
    nr: p.ergebnisse.length + 1,
    ...(inSek ? { sek: wert } : { wdh: wert }),
    ...(gewicht !== undefined ? { last: gewicht } : {}),
    ...(p.bandStufe ? { bandStufe: p.bandStufe } : {}),
    zeit: jetzt,
  };
  p.ergebnisse.push(ergebnis);
  if (kalibrierung && u && gewicht !== undefined) Object.assign(p, kalibriere(z, neu.ortId, u, gewicht, wert));
  return neu;
}

// „Letztes Mal“: Sätze der letzten abgeschlossenen bzw. abgebrochenen Position derselben Übung
// (ohne Max-Tests und Zirkel).
export function letztesMal(z: AppZustand, uebungId: string, ausserEinheit?: string):
  { last?: number; bandStufe?: BandStufe; werte: number[]; inSek: boolean } | undefined {
  const inSek = uebungVon(z, uebungId)?.bereich.einheit === 'Sek.';
  for (const einheit of fertigeEinheiten(z).reverse()) {
    if (einheit.id === ausserEinheit) continue;
    for (const b of [...einheit.bloecke].reverse()) {
      if (b.typ === 'zirkel') continue;
      const p = [...b.positionen].reverse().find((x) => x.uebungId === uebungId && !x.istMaxTest && x.ergebnisse.length > 0);
      if (!p) continue;
      const lasten = p.ergebnisse.map((r) => r.last ?? p.last);
      return {
        last: lasten.at(-1), bandStufe: p.ergebnisse.at(-1)?.bandStufe ?? p.bandStufe,
        werte: p.ergebnisse.map((r) => (inSek ? r.sek : r.wdh) ?? 0), inSek,
      };
    }
  }
  return undefined;
}

// ---------- Übungsfeedback (Paket 8) ----------

export interface Stelle { block: number; position: number }

const fertig = (p: Position) => p.ergebnisse.length >= p.saetze;

// Übungen, deren Feedback noch fehlt: alle Sätze erledigt, kein Max-Test, kein Zirkel. Gefragt wird seit
// 29.10.2026 einmal am Ende des Trainings bzw. beim Beenden (Entscheidung), alle auf einer Seite.
export function offeneFeedbacks(einheit: Einheit): Stelle[] {
  const liste: Stelle[] = [];
  einheit.bloecke.forEach((b, block) => {
    if (b.typ === 'zirkel') return;
    b.positionen.forEach((p, position) => {
      if (fertig(p) && !p.istMaxTest && p.feedback === undefined && p.ergebnisse.length > 0) liste.push({ block, position });
    });
  });
  return liste;
}

// Übungen, nach deren Sternen die Abschlussseite fragt (Entscheidung 29.10.2026): trainierte Übungen
// ohne Max-Test und Zirkel, die noch keine Bewertung haben und höchstens einmal ohne Antwort gefragt
// wurden, oder deren Bewertung bzw. letzte Frage mindestens 42 Tage zurückliegt. Unbewertete zuerst,
// dann die am längsten nicht gefragten; höchstens 2 je Training.
export function sternFragen(z: AppZustand, einheit: Einheit, jetzt: string): string[] {
  const e = einstellungenVon(z);
  const ids = [...new Set(einheit.bloecke.filter((b) => b.typ !== 'zirkel').flatMap((b) => b.positionen)
    .filter((p) => !p.istMaxTest && p.ergebnisse.length > 0 && uebungVon(z, p.uebungId)).map((p) => p.uebungId))];
  const kandidaten = ids.flatMap((id, i) => {
    const gefragt = e.sterneGefragt?.[id];
    if (e.bewertungen?.[id] === undefined) {
      return (gefragt?.ohneAntwort ?? 0) < BEWERTUNG.fragenOhneAntwort ? [{ id, i, neu: true, am: gefragt?.am ?? '' }] : [];
    }
    return !gefragt || stundenZwischen(gefragt.am, jetzt) >= BEWERTUNG.auffrischenTage * 24
      ? [{ id, i, neu: false, am: gefragt?.am ?? '' }] : [];
  });
  return kandidaten
    .sort((a, b) => Number(b.neu) - Number(a.neu) || (a.am < b.am ? -1 : a.am > b.am ? 1 : 0) || a.i - b.i)
    .slice(0, BEWERTUNG.fragenProTraining).map((k) => k.id);
}

// Satz, an dem die Progression misst: der erste, nach einem Kalibrierungssatz der zweite.
export function messSatz(z: AppZustand, einheit: Einheit, s: Stelle): number {
  const p = einheit.bloecke[s.block]!.positionen[s.position]!;
  return p.ergebnisse.length > 1 && istKalibrierung(z, einheit, { ...s, satz: 1 }) && p.ergebnisse[0]?.last !== undefined ? 2 : 1;
}

// Vorausgewähltes Feedback: „zu schwer“, wenn der Messsatz das Ziel verfehlt, sonst „passend“.
export function feedbackVorschlag(z: AppZustand, einheit: Einheit, s: Stelle): Feedback {
  const p = einheit.bloecke[s.block]!.positionen[s.position]!;
  return feedbackVon({ ...p, ergebnisse: p.ergebnisse.slice(messSatz(z, einheit, s) - 1) });
}

// Korrigiert die Wiederholungen bzw. Sekunden eines erledigten Satzes; seit 29.10.2026 nur noch den
// Messsatz nach „zu schwer“ („Wie viele im 1. Satz?“). Last und Ziel der Position bleiben.
export function korrigiereSatz(z: AppZustand, einheit: Einheit, s: Stelle, nr: number, wert: number): Einheit {
  const neu = structuredClone(einheit);
  const p = neu.bloecke[s.block]!.positionen[s.position]!;
  const r = p.ergebnisse.find((x) => x.nr === nr);
  if (!r) return einheit;
  const w = Math.max(0, Math.round(wert));
  if (uebungVon(z, p.uebungId)?.bereich.einheit === 'Sek.') r.sek = w;
  else r.wdh = w;
  return neu;
}

export function setzeFeedback(einheit: Einheit, s: Stelle, feedback: Feedback): Einheit {
  const neu = structuredClone(einheit);
  neu.bloecke[s.block]!.positionen[s.position]!.feedback = feedback;
  return neu;
}

// Feedback aller Übungen der Abschlussseite auf einmal (Entscheidung 29.10.2026); bei „zu schwer“ mit dem
// Geschafften im Messsatz (`messwerte`, undefined = unverändert).
export function bewerteAlle(z: AppZustand, einheit: Einheit, stellen: Stelle[], feedbacks: Feedback[], messwerte: (number | undefined)[]): Einheit {
  return stellen.reduce((e, s, i) => {
    const wert = messwerte[i];
    return setzeFeedback(wert === undefined ? e : korrigiereSatz(z, e, s, messSatz(z, e, s), wert), s, feedbacks[i]!);
  }, einheit);
}

// Beginn des Trainings nach dem Aufwärmen; im Zirkel startet damit die Stoppuhr.
export function starte(einheit: Einheit, jetzt: string): Einheit {
  return { ...einheit, status: 'laufend', gestartetAm: einheit.gestartetAm ?? jetzt };
}

// Ende des Trainings: abgeschlossen, wenn alle Sätze erledigt sind, sonst abgebrochen
// (die erledigten Sätze bleiben gespeichert).
export function beende(einheit: Einheit, jetzt: string): Einheit {
  const fertig = aktuellerSchritt(einheit) >= schritte(einheit).length;
  return { ...einheit, status: fertig ? 'abgeschlossen' : 'abgebrochen', beendetAm: jetzt };
}

// Zeitpunkt des zuletzt erledigten Satzes; damit endet das Training, auch wenn die Abschlussseite
// länger offen bleibt (Entscheidung 29.10.2026: Bewertung und Abschluss auf einer Seite).
export function letzterSatzAm(einheit: Einheit): string | undefined {
  const zeiten = einheit.bloecke.flatMap((b) => b.positionen.flatMap((p) => p.ergebnisse.map((r) => r.zeit)));
  return zeiten.reduce<string | undefined>((a, b) => (a === undefined || new Date(b) > new Date(a) ? b : a), undefined);
}

// ---------- Fortschritt im Training (Entscheidung 21.10.2026) ----------

export interface Fortschrittshinweis {
  inSek: boolean;
  letztesMal?: number;                // erster Satz der letzten Einheit dieser Übung
  heute: number;                      // Ziel im ersten Satz
  ab: number;                         // so viel im ersten Satz, dann folgt der nächste Schritt
  schritt: 'gewicht' | 'variante' | 'langsam' | 'band' | 'bandLeichter';
  naechste?: string;                  // Name der nächsten Variante
  verlauf: number[];                  // Leistung der letzten Einheiten, älteste zuerst (höchstens 8)
}

// Für den ersten Satz einer Übung (nach einer Kalibrierung den zweiten): was beim letzten Mal ging,
// das Ziel heute und ab wann die nächste Stufe kommt (Obergrenze des Bereichs, wie in der Progression).
export function fortschrittshinweis(z: AppZustand, einheit: Einheit, s: Schritt, jetzt: string): Fortschrittshinweis | undefined {
  const b = einheit.bloecke[s.block]!;
  const p = positionVon(einheit, s);
  const u = uebungVon(z, p.uebungId);
  if (!u || b.typ === 'zirkel' || p.istMaxTest || istKalibrierung(z, einheit, s)) return undefined;
  if (s.satz !== 1 && !nachKalibrierung(z, einheit, s)) return undefined;
  const e = einstellungenVon(z);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  const bisher = sitzungen(z, u.id).filter((x) => x.einheit.id !== einheit.id);
  const letzte = bisher.at(-1);
  const letztesMal = letzte ? ersterSatz(letzte.position) : undefined;
  const verlauf = bisher.map((x) => leistungswert(e, u, x.position)).filter((w): w is number => w !== undefined)
    .slice(-PLAYER.verlaufPunkte);
  const { bis } = bereichFuer(e, u);
  const naechste = ort && (u.lasttyp === 'KG' || u.lasttyp === 'Zeit') ? naechsteVariante(z, ort, u, jetzt) : undefined;
  // Großer Sprung zur nächsten Variante: erst langsames Absenken (Zwischenstufe wie in der Progression).
  const zwischenstufe = naechste !== undefined && !p.langsam && naechste.stufe - u.stufe >= PROGRESSION.zwischenstufeAbStufen;
  const schritt: Fortschrittshinweis['schritt'] = u.lasttyp === 'Last' ? 'gewicht'
    : u.lasttyp === 'Band' ? (u.unterstuetzend ? 'bandLeichter' : 'band') : zwischenstufe ? 'langsam' : 'variante';
  return {
    inSek: u.bereich.einheit === 'Sek.', heute: p.zielWdh, ab: Math.max(bis, p.zielWdh), schritt, verlauf,
    ...(letztesMal !== undefined ? { letztesMal } : {}), ...(naechste && !zwischenstufe ? { naechste: naechste.name } : {}),
  };
}
