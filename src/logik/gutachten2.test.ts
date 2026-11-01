// Gutachten, Schritt 2 (Entscheidungen 01.11.2026): Beinbeuger, Anteile je Übung, Vorrang, einseitige
// Übungen, Arme bei 1 bis 2 Einheiten, Ziel „Kraft“ (A, A, B) und Anstrengung im Vergleich zum eigenen Schnitt.
import { describe, expect, it } from 'vitest';
import { isoWoche, plusTage } from './datum';
import { bereinigeHauptvarianten } from './migration';
import { beitrag, dosisProMuskel, erstelleEinheit, geschaetzteDauer, hauptvarianten } from './planung';
import { erholungswocheAngebot } from './progression';
import { MONTAG, eingespielt, ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit } from './typen';
import { uebungVon } from './verlauf';

const MO = zeitpunkt(0, 18);
const voll = () => eingespielt(zustand({ katalog: 'voll' }));
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
const plane = (z: AppZustand, prognose = 3, extra = {}) =>
  erstelleEinheit(setzePrognose(z, MO, prognose), { jetzt: MO, ortId: 'zuhause', prognose, morgenWieder: false, laenger: false, ...extra });

describe('Beinbeuger und Anteile je Übung', () => {
  it('eigene Bewegung „Beinbeuger“ mit Sliding Leg Curls, Nordic Curls und Band-Beincurls', () => {
    const z = voll();
    const beinbeuger = z.katalog.uebungen.filter((u) => u.muster === 'Beinbeuger').map((u) => u.id).sort();
    expect(beinbeuger).toEqual(['band_beincurl', 'nordic_curl', 'sliding_leg_curl']);
    expect(hauptvarianten(z, 'Beinbeuger', ort(), MO).length).toBeGreaterThan(0);
    // Eine Ganzkörper-Einheit mit offenem Bedarf plant eine Übung für die Kniebeugung ein.
    const e = plane(z);
    expect(ids(e).some((id) => uebungVon(z, id)?.muster === 'Beinbeuger' || id === 'kh_rdl')).toBe(true);
  });

  it('Hip Thrust und Brücken zählen für die hinteren Oberschenkel 0,25 statt 0,5', () => {
    const z = voll();
    expect(beitrag(uebungVon(z, 'kh_hip_thrust')!)).toEqual([['Gesaess', 1], ['HintereOS', 0.25]]);
    expect(beitrag(uebungVon(z, 'kh_rdl')!)).toEqual([['HintereOS', 1], ['Gesaess', 0.5]]);
  });

  it('bereinigt gespeicherte Hauptvarianten, deren Übung zu einem anderen Muster gehört', () => {
    const z = voll();
    const vorher = [{ muster: 'Huefte' as const, stufe: 5, hauptvarianten: ['kh_rdl', 'nordic_curl'] }, { muster: 'Bizeps' as const, stufe: 3, hauptvarianten: ['eigene_x'] }];
    expect(bereinigeHauptvarianten(vorher, z.katalog.uebungen)).toEqual([
      { muster: 'Huefte', stufe: 5, hauptvarianten: ['kh_rdl'] }, vorher[1],
    ]);
  });
});

describe('Vorrang für Übungen mit Last in der Dehnung und Seitheben', () => {
  it('wählt Überkopf-Trizeps, Schrägbank-Curls und Seitheben als Hauptvariante A', () => {
    const z = voll();
    expect(hauptvarianten(z, 'Trizeps', ort(), MO)[0]!.uebung.id).toBe('kh_trizeps_ueberkopf');
    expect(hauptvarianten(z, 'Bizeps', ort(), MO)[0]!.uebung.id).toBe('schraegbank_curls');
    expect(hauptvarianten(z, 'Schulter', ort(), MO)[0]!.uebung.id).toBe('kh_seitheben');
    // Favoriten gehen weiter vor.
    const fav = { ...z, einstellungen: [{ ...z.einstellungen[0]!, favoriten: ['hammer_curls'] }] };
    expect(hauptvarianten(fav, 'Bizeps', ort(), MO)[0]!.uebung.id).toBe('hammer_curls');
  });
});

describe('Einseitige Übungen', () => {
  it('kosten Zeit: geschätzte Dauer je Satz 45 Sek. Arbeit mehr', () => {
    const z = voll();
    const einheit = (uebungId: string): Einheit => ({
      id: 'x', woche: isoWoche(MO), erstelltAm: MO, status: 'geplant', ortId: 'zuhause', fokus: 'ganz', format: 'klassisch',
      geschaetzteDauerMin: 0, aufwaermen: [], bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId, saetze: 4, zielWdh: 10, ergebnisse: [] }] }],
    });
    expect(geschaetzteDauer(z, einheit('bss_kh')) - geschaetzteDauer(z, einheit('goblet_squat'))).toBe(3);
  });

  it('passen seltener ins Zeitbudget: weniger Sätze bei gleicher Dauer', () => {
    const z = voll();
    const zaehle = (zz: AppZustand) => plane(zz, 3, { klassisch: true }).bloecke.flatMap((b) => b.positionen)
      .filter((p) => !['Rumpf', 'Waden'].includes(uebungVon(zz, p.uebungId)!.muster)).reduce((s, p) => s + p.saetze, 0);
    const ohneEinseitig = { ...z, katalog: { ...z.katalog, uebungen: z.katalog.uebungen.map((u) => ({ ...u, einseitig: false })) } };
    expect(zaehle(z)).toBeLessThanOrEqual(zaehle(ohneEinseitig));
  });
});

describe('Arme bei 1 bis 2 Einheiten', () => {
  it('Bizeps und Trizeps kommen zusätzlich zum Zeitbudget, wenn ihr Bedarf offen ist', () => {
    const z = voll();
    const zwei = plane(z, 2);
    const arme = (e: Einheit) => ids(e).filter((id) => ['Bizeps', 'Trizeps'].includes(uebungVon(z, id)!.muster));
    expect(arme(zwei).length).toBeGreaterThanOrEqual(2);
    const dosis = dosisProMuskel(z, zwei);
    expect(dosis.Bizeps).toBeGreaterThanOrEqual(2);
    expect(dosis.Trizeps).toBeGreaterThanOrEqual(2);
    for (const p of zwei.bloecke.flatMap((b) => b.positionen).filter((x) => arme(zwei).includes(x.uebungId))) {
      expect(p.saetze).toBeLessThanOrEqual(5);
    }
  });
});

describe('Ziel „Kraft“: A, A, B', () => {
  it('Bei Grundbewegungen kommt die Hauptvariante A zweimal, bevor B einmal dran ist', () => {
    let z: AppZustand = voll();
    z = { ...z, einstellungen: [{ ...z.einstellungen[0]!, ziele: ['kraft'] }],
      muster: [{ muster: 'hDruck', stufe: 5, hauptvarianten: ['kh_bankdruecken', 'kh_schraegbank'] }] };
    const folge: string[] = [];
    for (let i = 0; i < 6; i++) {
      const t = plusTage(MONTAG, i * 3);
      const e = erstelleEinheit(setzePrognose(z, t, 2), { jetzt: t, ortId: 'zuhause', prognose: 2, morgenWieder: false, laenger: false });
      const drueck = e.bloecke.flatMap((b) => b.positionen).find((p) => p.uebungId === 'kh_bankdruecken' || p.uebungId === 'kh_schraegbank');
      if (!drueck) continue;
      folge.push(drueck.uebungId === 'kh_bankdruecken' ? 'A' : 'B');
      const fertig: Einheit = { ...e, status: 'abgeschlossen', gestartetAm: t, beendetAm: plusTage(t, 0.03),
        bloecke: e.bloecke.map((b) => ({ ...b, positionen: b.positionen.map((p) => ({ ...p, ergebnisse: [{ nr: 1, wdh: p.zielWdh, zeit: t }] })) })) };
      z = { ...z, einheiten: [...z.einheiten, fertig] };
    }
    expect(folge.join('')).toMatch(/^(AAB)+/);
  });
});

describe('Erholungswoche: Anstrengung im Vergleich zum eigenen Schnitt', () => {
  const mitBewertungen = (werte: number[]): AppZustand => {
    const z = zustand();
    const einheiten: Einheit[] = werte.map((w, i) => {
      const t = plusTage(MONTAG, -werte.length * 2 + i * 2);
      return { id: `b${i}`, woche: isoWoche(t), erstelltAm: t, gestartetAm: t, status: 'abgeschlossen', ortId: 'zuhause', fokus: 'ganz',
        format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [], gesamtbewertung: w as 1 | 2 | 3 | 4 | 5,
        bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId: 'kh_curls', saetze: 1, zielWdh: 10, last: 6, ergebnisse: [{ nr: 1, wdh: 10, last: 6, zeit: t }] }] }] };
    });
    return { ...z, einheiten };
  };

  it('wer sonst bei 2 liegt, bekommt bei 3,5 im Schnitt ein Angebot; wer sonst bei 4 liegt, bei 4,5 nicht', () => {
    expect(erholungswocheAngebot(mitBewertungen([2, 2, 2, 2, 2, 2, 3, 4, 3, 4]), MONTAG)).toBe('anstrengung');
    expect(erholungswocheAngebot(mitBewertungen([4, 4, 4, 4, 4, 4, 5, 4, 5, 4]), MONTAG)).toBeNull();
    // Ohne genug eigene Bewertungen gilt weiter fest 4,5.
    expect(erholungswocheAngebot(mitBewertungen([5, 4, 5, 4]), MONTAG)).toBe('anstrengung');
  });
});
