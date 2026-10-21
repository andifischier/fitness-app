// Ablauf einer Einheit im Trainings-Player (Paket 7): Reihenfolge der Sätze, Pausen, Vorgaben,
// Kalibrierungssatz und „Letztes Mal“. Rein und deterministisch: Die Zeit wird übergeben. Wo das
// Training steht, ergibt sich allein aus den gespeicherten Satzergebnissen; so setzt ein
// Neustart der App am richtigen Satz fort.
import { MUSTER_ART, PLAYER, PROGRESSION } from '../konfiguration';
import { lastraster } from './equipment';
import { bereichFuer } from './planung';
import type { AppZustand, BandStufe, Block, Einheit, Feedback, Position, SatzErgebnis, Uebung } from './typen';
import { e1rm, einstellungenVon, feedbackVon, fertigeEinheiten, uebungVon, wdhBei, zielReserve } from './verlauf';

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
  art: 'ziel' | 'vorgabe' | 'maxTest' | 'station';
  wert: number;                       // Wiederholungen bzw. Sekunden; beim Max-Test 0
  inSek: boolean;
  bereich?: { von: number; bis: number };
  last?: number; bandStufe?: BandStufe;
  reserve: string;                    // Hinweistext zur Reserve
  kalibrierung: boolean;
  langsam: boolean;
}

// Was ein Satz anzeigt: Ziel (erster Satz, nach einer Kalibrierung der zweite) bzw. Vorgabe =
// geschaffte Wiederholungen des vorherigen Satzes, Last und Hinweis zur Reserve. Das Feld für Geschafftes ist mit `wert` vorausgefüllt.
export function satzVorgabe(z: AppZustand, einheit: Einheit, s: Schritt): SatzVorgabe {
  const e = einstellungenVon(z);
  const b = einheit.bloecke[s.block]!;
  const p = positionVon(einheit, s);
  const u = uebungVon(z, p.uebungId);
  const inSek = u?.bereich.einheit === 'Sek.';
  const bereich = u ? bereichFuer(e, u) : undefined;
  const werte = { last: satzLast(z, einheit, s), bandStufe: p.bandStufe };
  const basis = { inSek, ...werte, kalibrierung: false, langsam: p.langsam === true };
  if (p.istMaxTest) {
    return { ...basis, art: 'maxTest', wert: 0, reserve: inSek ? 'Nur so lange, wie die Haltung sauber bleibt.' : 'Ohne Pause, nur saubere Wiederholungen.' };
  }
  if (b.typ === 'zirkel') return { ...basis, art: 'station', wert: p.zielWdh, reserve: '' };
  const kalibrierung = istKalibrierung(z, einheit, s);
  const reserve = kalibrierung
    ? `Wähle ein Gewicht für etwa ${bereich!.von} Wiederholungen. Aufhören, wenn noch ${PROGRESSION.neueVarianteReserve} gingen.`
    : reserveText(e.zielReserve, inSek, letzterIsolationssatz(u, p, s));
  if (s.satz === 1 || nachKalibrierung(z, einheit, s)) {
    return { ...basis, art: 'ziel', wert: kalibrierung ? bereich!.von : p.zielWdh, bereich, reserve, kalibrierung };
  }
  const vorher = p.ergebnisse[s.satz - 2];
  const wert = (inSek ? vorher?.sek : vorher?.wdh) ?? p.zielWdh;
  return { ...basis, art: 'vorgabe', wert, bereich, reserve };
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

// Übungen, deren Feedback noch fehlt: alle Sätze erledigt, kein Max-Test, kein Zirkel. Im Supersatz
// erst, wenn das ganze Paar fertig ist (Entscheidung 21.10.2026), dann beide nacheinander.
export function offeneFeedbacks(einheit: Einheit): Stelle[] {
  const liste: Stelle[] = [];
  einheit.bloecke.forEach((b, block) => {
    if (b.typ === 'zirkel' || !b.positionen.every(fertig)) return;
    b.positionen.forEach((p, position) => {
      if (!p.istMaxTest && p.feedback === undefined && p.ergebnisse.length > 0) liste.push({ block, position });
    });
  });
  return liste;
}

// Vorausgewähltes Feedback: „zu schwer“, wenn der erste Satz das Ziel verfehlt, sonst „passend“. Nach
// einem Kalibrierungssatz zählt der erste Satz danach (wie in der Progression).
export function feedbackVorschlag(z: AppZustand, einheit: Einheit, s: Stelle): Feedback {
  const p = einheit.bloecke[s.block]!.positionen[s.position]!;
  if (p.ergebnisse.length > 1 && istKalibrierung(z, einheit, { ...s, satz: 1 }) && p.ergebnisse[0]?.last !== undefined) {
    return feedbackVon({ ...p, ergebnisse: p.ergebnisse.slice(1) });
  }
  return feedbackVon(p);
}

// Korrigiert die Wiederholungen bzw. Sekunden eines erledigten Satzes (Entscheidung 21.10.2026:
// Zahlen auf „Wie war die Übung?“ antippen). Last und Ziel der Position bleiben.
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
