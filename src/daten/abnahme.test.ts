// Endabnahme (Paket 10): spielt 12 Wochen so durch, wie die App sie speichert (Testtag, Startfragen,
// Einheit erstellen, jeden Satz eintragen, Feedback, Abschluss, Wochenabschluss beim Öffnen), und
// prüft dabei die Punkte unter „Abnahmekriterien Version 1“. Der simulierte Nutzer schafft jedes Ziel,
// gibt „passend“ und bewertet die Anstrengung mit 3.
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { isoWoche, plusTage, stundenZwischen } from '../logik/datum';
import { uebungErlaubt } from '../logik/equipment';
import { alternativen, einstellungenVon, erstelleEinheit, istErholt, startfragen } from '../logik/planung';
import {
  aktuellerSchritt, offeneFeedbacks, satzVorgabe, schritte, setzeFeedback, trageSatzEin,
} from '../logik/player';
import { erholungswocheAngebot } from '../logik/progression';
import { ort } from '../logik/testhilfe';
import { testtagEinheit } from '../logik/testtag';
import { type AppZustand, type Einheit, type Sterne } from '../logik/typen';
import { uebungVon } from '../logik/verlauf';
import { MAXTEST } from '../konfiguration';
import { exportiere, importiere } from './backup';
import { FitnessDb, ladeZustand, leseTabellen } from './db';
import {
  beendeEinheit, fuehreWochenabschluesseAus, speichereAbschluss, speichereLaufendeEinheit, speichereNeueEinheit,
  speichereOrt, speichereTesttag, starteEinheit,
} from './speichern';

let nr = 0;
const offen: FitnessDb[] = [];
function neueDb(): FitnessDb {
  const d = new FitnessDb(`abnahme-${++nr}`);
  offen.push(d);
  return d;
}
afterEach(async () => {
  for (const d of offen.splice(0)) await d.delete();
});

const SONNTAG = '2026-10-25T10:00:00';     // Testtag; Montag danach beginnt KW 44 (gerade Woche)
const MONTAG = '2026-10-26T00:00:00';
const um = (tag: number, zeit: string) => `${plusTage(MONTAG, tag).slice(0, 10)}T${zeit}`;
// Trainingszeit: montags 8 Uhr, jeden Tag eine Stunde später (Tage am Stück liegen 25 Std. auseinander).
const trainingszeit = (tag: number) => um(tag, `${String(8 + (tag % 7)).padStart(2, '0')}:00:00`);

// Wochen mit Prognose und Trainingstagen (0 = Montag). Woche 6 ist schwach (1 Einheit), Woche 3
// trainiert einmal im Studio.
const PLAN: { prognose: number; tage: number[]; studio?: number }[] = [
  { prognose: 3, tage: [0, 2, 4] }, { prognose: 2, tage: [1, 4] }, { prognose: 4, tage: [0, 1, 3, 5], studio: 3 },
  { prognose: 3, tage: [0, 2, 5] }, { prognose: 5, tage: [0, 1, 2, 4, 5] }, { prognose: 1, tage: [3] },
  { prognose: 3, tage: [0, 2, 4] }, { prognose: 3, tage: [1, 3, 5] }, { prognose: 2, tage: [0, 3] },
  { prognose: 4, tage: [0, 2, 3, 5] }, { prognose: 3, tage: [0, 2, 4] }, { prognose: 3, tage: [1, 3, 6] },
];

const ZUHAUSE = ort(['KH', 'BANK', 'STANGE', 'BAND', 'ANKER', 'TISCH', 'ERH']);
const STUDIO = { ...ort(['KH', 'BANK', 'SCHRAEG', 'STANGE', 'DIP', 'ERH'], 'studio'), name: 'Studio' };

async function testtag(d: FitnessDb) {
  const geplant = testtagEinheit(await ladeZustand(d), ZUHAUSE.id, SONNTAG);
  const werte: Record<string, number> = { liegestuetz: 18, klimmzug: 6, kniebeuge: 25, plank: 50 };
  const e: Einheit = {
    ...geplant,
    bloecke: geplant.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => {
        const wert = werte[p.uebungId] ?? 10;
        return { ...p, ergebnisse: [p.uebungId === 'plank' ? { nr: 1, sek: wert, zeit: SONNTAG } : { nr: 1, wdh: wert, zeit: SONNTAG }] };
      }),
    })),
  };
  await speichereTesttag(e, SONNTAG, d);
}

interface Protokoll {
  zustandVorher: AppZustand; einheit: Einheit; jetzt: string; woche: number;
  prognoseAbgefragt: boolean; angebot: string | null; erholungswoche: boolean;
}

// Eine Einheit wie in der App: Startfragen, erstellen, Aufwärmen, alle Sätze, Feedback, Abschluss.
async function trainiere(d: FitnessDb, jetzt: string, woche: number, prognose: number, ortId: string,
  anstrengung: Sterne, erholungAnnehmen: boolean): Promise<Protokoll> {
  await fuehreWochenabschluesseAus(jetzt, d);
  const z = await ladeZustand(d);
  const fragen = startfragen(z, jetzt);
  const angebot = erholungswocheAngebot(z, jetzt);
  const extra = angebot !== null ? { erholungswoche: erholungAnnehmen } : {};
  const erholungswoche = z.wochen.find((w) => w.id === isoWoche(jetzt))?.erholungswoche ?? (angebot !== null && erholungAnnehmen);
  const zirkelId = fragen.zirkelVorschlag && !erholungswoche ? z.katalog.zirkel[0]!.id : undefined;
  const p = fragen.prognoseAbfragen ? prognose : z.wochen.find((w) => w.id === isoWoche(jetzt))!.prognose;
  const geplant = erstelleEinheit(z, {
    jetzt, ortId, prognose: p, morgenWieder: zirkelId === undefined && fragen.morgenWiederVorschlag, laenger: false, zirkelId, ...extra,
  });
  await speichereNeueEinheit(geplant, p, jetzt, extra, d);
  const start = plusMinuten(jetzt, 5);
  await starteEinheit(geplant.id, start, d);
  let e = (await d.einheiten.get(geplant.id))!;
  const zLauf = await ladeZustand(d);
  for (let i = 0; i < schritte(e).length; i++) {
    const s = schritte(e)[aktuellerSchritt(e)]!;
    const v = satzVorgabe(zLauf, e, s);
    const wert = v.art === 'maxTest' ? (uebungVon(zLauf, e.bloecke[s.block]!.positionen[s.position]!.uebungId)?.bereich.einheit === 'Sek.' ? 55 : 14) : v.wert;
    e = trageSatzEin(zLauf, e, s, wert, plusMinuten(start, 2 + i), v.kalibrierung ? v.last : undefined);
    for (const stelle of offeneFeedbacks(e)) e = setzeFeedback(e, stelle, 'passend');
    expect(await speichereLaufendeEinheit(e, d)).toBe(true);
  }
  const ende = plusMinuten(start, 40);
  const fertig = await beendeEinheit(e, ende, d);
  expect(fertig?.einheit.status).toBe('abgeschlossen');
  await speichereAbschluss(e.id, { gesamtbewertung: anstrengung, bewertungen: {} }, ende, d);
  return { zustandVorher: z, einheit: geplant, jetzt, woche, prognoseAbgefragt: fragen.prognoseAbfragen, angebot, erholungswoche };
}

function plusMinuten(zeit: string, minuten: number): string {
  const [datum, uhr] = zeit.split('T') as [string, string];
  const [h, m] = uhr.split(':').map(Number) as [number, number];
  const gesamt = h * 60 + m + minuten;
  return `${datum}T${String(Math.floor(gesamt / 60)).padStart(2, '0')}:${String(gesamt % 60).padStart(2, '0')}:00`;
}

async function zwoelfWochen(d: FitnessDb): Promise<Protokoll[]> {
  await speichereOrt(ZUHAUSE, d);
  await speichereOrt(STUDIO, d);
  await testtag(d);
  const protokoll: Protokoll[] = [];
  for (const [w, woche] of PLAN.entries()) {
    for (const tag of woche.tage) {
      const ortId = woche.studio === tag ? STUDIO.id : ZUHAUSE.id;
      protokoll.push(await trainiere(d, trainingszeit(w * 7 + tag), w, woche.prognose, ortId, 3, true));
    }
  }
  return protokoll;
}

const maxTestPositionen = (e: Einheit) => e.bloecke.flatMap((b, bi) => b.positionen.map((p, pi) => ({ p, bi, pi }))).filter((x) => x.p.istMaxTest);

describe('Endabnahme: 12 Wochen im Ablauf der App', () => {
  it('erfüllt die Abnahmekriterien über alle Einheiten', { timeout: 60_000 }, async () => {
    const d = neueDb();
    const protokoll = await zwoelfWochen(d);
    const z = await ladeZustand(d);
    expect(protokoll).toHaveLength(PLAN.reduce((s, w) => s + w.tage.length, 0));

    // Die Wochenprognose wird genau bei der ersten Einheit jeder Woche abgefragt.
    for (const p of protokoll) {
      const erste = protokoll.find((x) => x.woche === p.woche) === p;
      expect(p.prognoseAbgefragt, `Woche ${p.woche + 1}, ${p.jetzt}`).toBe(erste);
    }

    // Kein Muskel bekommt vor Ablauf seines Erholungsfensters Sätze: Die Hauptmuskeln jeder Übung
    // und beim Max-Test alle beteiligten Muskeln sind erholt (Mitbeteiligung zählt wie im Prototyp nicht).
    for (const p of protokoll) {
      const erholt = (m: string) => istErholt(p.zustandVorher.muskeln.find((x) => x.muskel === m), p.jetzt);
      for (const pos of p.einheit.bloecke.flatMap((b) => b.positionen)) {
        const u = uebungVon(z, pos.uebungId)!;
        for (const m of pos.istMaxTest ? [...u.primaer, ...u.sekundaer] : u.primaer) expect(erholt(m), `${m} (${u.id}) am ${p.jetzt}`).toBe(true);
      }
    }

    // Tage am Stück liefern dank Fokus-Einheiten trotzdem volle Einheiten (mindestens 6 Arbeitssätze).
    for (const [i, p] of protokoll.entries()) {
      const vorher = protokoll[i - 1];
      if (!vorher || p.einheit.format === 'zirkel' || stundenZwischen(vorher.jetzt, p.jetzt) > 24) continue;
      const saetze = p.einheit.bloecke.flatMap((b) => b.positionen).reduce((s, x) => s + x.saetze, 0);
      expect(saetze, p.jetzt).toBeGreaterThanOrEqual(6);
      expect(p.einheit.fokus, p.jetzt).not.toBe('ganz');
    }

    // Max-Tests: nur am Anfang, höchstens einer je Einheit, je Muster frühestens nach 21 Tagen
    // (in Wochen mit 1 bis 2 Einheiten nach 28 Tagen), nie in Erholungswochen.
    for (const p of protokoll) {
      const tests = maxTestPositionen(p.einheit);
      expect(tests.length).toBeLessThanOrEqual(1);
      for (const t of tests) {
        expect([t.bi, t.pi]).toEqual([0, 0]);
        expect(p.erholungswoche).toBe(false);
        const muster = uebungVon(z, t.p.uebungId)!.muster;
        const frueher = p.zustandVorher.maxTests.filter((x) => x.muster === muster).map((x) => x.datum).sort().at(-1)!;
        const prognose = PLAN[p.woche]!.prognose;
        const abstand = prognose <= MAXTEST.wenigeEinheitenBis ? MAXTEST.abstandTageWenigeEinheiten : MAXTEST.abstandTage;
        expect(stundenZwischen(frueher, p.jetzt) / 24, `${muster} am ${p.jetzt}`).toBeGreaterThanOrEqual(abstand);
      }
    }
    expect(protokoll.some((p) => maxTestPositionen(p.einheit).length > 0)).toBe(true);

    // Zirkel gemäß Einstellung (alle 2 Wochen = gerade ISO-Woche), nur bei Prognose ab 3; Bestzeit je Ort.
    for (const [w, woche] of PLAN.entries()) {
      const zirkel = protokoll.filter((p) => p.woche === w && p.einheit.format === 'zirkel');
      const kw = Number(isoWoche(um(w * 7, '12:00:00')).slice(-2));
      expect(zirkel.length, `Woche ${w + 1}`).toBe(kw % 2 === 0 && woche.prognose >= 3 ? 1 : 0);
    }
    expect(z.zirkelErgebnisse.length).toBeGreaterThan(0);
    expect(z.zirkelErgebnisse.every((r) => r.ortId === ZUHAUSE.id && r.zeitSek > 0)).toBe(true);

    // Ortswechsel: Im Studio kommen nur dort mögliche Übungen vor; die Werte der Varianten bleiben.
    const studio = protokoll.find((p) => p.einheit.ortId === STUDIO.id)!;
    const e = einstellungenVon(studio.zustandVorher);
    for (const pos of studio.einheit.bloecke.flatMap((b) => b.positionen)) {
      expect(uebungErlaubt(e, STUDIO, uebungVon(z, pos.uebungId)!, studio.jetzt)).toBe(true);
      const v = studio.zustandVorher.varianten.find((x) => x.uebungId === pos.uebungId);
      if (v && !pos.istMaxTest) expect(pos.zielWdh, pos.uebungId).toBe(v.zielWdh);
    }
    const danach = protokoll[protokoll.indexOf(studio) + 1]!.zustandVorher;
    for (const m of studio.zustandVorher.muster) {
      expect(danach.muster.find((x) => x.muster === m.muster)!.stufe, m.muster).toBeGreaterThanOrEqual(m.stufe);
    }

    // Tausch zeigt nur Alternativen desselben Musters, die am Ort möglich sind.
    for (const p of protokoll.slice(0, 6)) {
      p.einheit.bloecke.forEach((b, bi) => b.positionen.forEach((pos, pi) => {
        if (b.typ === 'zirkel' || pos.istMaxTest) return;
        const muster = uebungVon(z, pos.uebungId)!.muster;
        const ortX = p.einheit.ortId === STUDIO.id ? STUDIO : ZUHAUSE;
        for (const a of alternativen(p.zustandVorher, p.einheit, bi, pi)) {
          const u = uebungVon(z, a.uebungId)!;
          expect(u.muster).toBe(muster);
          expect(uebungErlaubt(einstellungenVon(p.zustandVorher), ortX, u, p.jetzt)).toBe(true);
        }
      }));
    }

    // Feedback verändert die nächste Einheit: Wer „passend“ gibt und das Ziel schafft, bekommt bei
    // Last-Übungen am selben Ort Ziel und Last aus dem gespeicherten Zustand der Variante.
    for (const p of protokoll.filter((x) => x.einheit.ortId === ZUHAUSE.id && !x.erholungswoche)) {
      for (const pos of p.einheit.bloecke.flatMap((b) => b.positionen)) {
        const v = p.zustandVorher.varianten.find((x) => x.uebungId === pos.uebungId);
        if (!v || pos.istMaxTest || p.einheit.format === 'zirkel' || v.last === undefined) continue;
        expect({ last: pos.last, ziel: pos.zielWdh }, `${pos.uebungId} am ${p.jetzt}`).toEqual({ last: v.last, ziel: v.zielWdh });
      }
    }
    // … und die Ziele steigen über die Wochen.
    const steigerungen = z.varianten.filter((v) => v.last !== undefined && protokoll.some((p) =>
      p.zustandVorher.varianten.some((x) => x.uebungId === v.uebungId && (x.zielWdh < v.zielWdh || (x.last ?? 0) < v.last!))));
    expect(steigerungen.length).toBeGreaterThan(0);

    // Erholungswochen nur bei den Auslösern: Bei passendem Feedback, geschafften Zielen und
    // Anstrengung 3 kommt in 12 Wochen mit einer schwachen Woche kein Angebot.
    expect(protokoll.map((p) => p.angebot).filter((a) => a !== null)).toEqual([]);

    // Export und Import stellen alle Daten vollständig wieder her.
    const datei = await exportiere(um(84, '20:00:00'), d);
    const ziel = neueDb();
    expect(await importiere(datei, ziel)).toEqual({ ok: true });
    expect(await leseTabellen(ziel)).toEqual(await leseTabellen(d));
  });

  it('eine schwache Woche verändert die persönliche Volumengrenze nicht', { timeout: 60_000 }, async () => {
    const d = neueDb();
    await speichereOrt(ZUHAUSE, d);
    await testtag(d);
    const grenzen = async () => Object.fromEntries((await ladeZustand(d)).muskeln.map((m) => [m.muskel, m.persoenlicheGrenze]));
    for (const tag of [0, 2, 4]) await trainiere(d, um(tag, '18:00:00'), 0, 3, ZUHAUSE.id, 3, true);
    await trainiere(d, um(8, '18:00:00'), 1, 1, ZUHAUSE.id, 3, true);   // schwache Woche: 1 Einheit
    await fuehreWochenabschluesseAus(um(14, '08:00:00'), d);
    const vorher = await grenzen();
    // Wochenabschluss der schwachen Woche ist gelaufen; nichts hat sich durch sie geändert.
    const z = await ladeZustand(d);
    expect(z.wochen.find((w) => w.id === isoWoche(um(8, '12:00:00')))?.ausgewertet).toBe(true);
    await fuehreWochenabschluesseAus(um(14, '09:00:00'), d);
    expect(await grenzen()).toEqual(vorher);
  });

  it('sehr hohe Anstrengung führt zum Angebot einer Erholungswoche; angenommen: halbes Volumen, kein Max-Test, kein Zirkel',
    { timeout: 60_000 }, async () => {
      const d = neueDb();
      await speichereOrt(ZUHAUSE, d);
      await testtag(d);
      const protokoll: Protokoll[] = [];
      for (const tag of [0, 2, 4, 5]) protokoll.push(await trainiere(d, um(tag, '18:00:00'), 0, 4, ZUHAUSE.id, 5, true));
      expect(protokoll.map((p) => p.angebot)).toEqual([null, null, null, null]);   // Angebot erst in der Folgewoche
      const naechste = await trainiere(d, um(7, '18:00:00'), 1, 3, ZUHAUSE.id, 3, true);
      expect(naechste.angebot).toBe('anstrengung');
      expect(naechste.erholungswoche).toBe(true);
      const woche = (await ladeZustand(d)).wochen.find((w) => w.id === isoWoche(um(7, '12:00:00')))!;
      expect(woche.erholungswoche).toBe(true);
      const normal = (await ladeZustand(d)).wochen.find((w) => w.id === isoWoche(um(0, '12:00:00')))!;
      expect(woche.ziele.Brust).toBeLessThanOrEqual(Math.ceil(normal.ziele.Brust / 2));
      expect(maxTestPositionen(naechste.einheit)).toEqual([]);
      expect(naechste.einheit.format).not.toBe('zirkel');
    });
});
