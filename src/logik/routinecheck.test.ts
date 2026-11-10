// Entscheidungen 10.11.2026 nach dem Routine-Check: Abwechslung mit Körpergewicht zuerst mit demselben
// Hauptmuskel, Shrugs nur als Favorit, gerade Startziele, Beincurls bei 1 bis 2 Einheiten zusätzlich,
// abnehmender Nutzen vieler Sätze in einem Training und Erhaltungssätze.
import { describe, expect, it } from 'vitest';
import { EINHEIT, NUR_ALS_FAVORIT, STANDARD_EINSTELLUNGEN, WOCHENZIEL } from '../konfiguration';
import { isoWoche } from './datum';
import { wocheMitPrognose } from './heute';
import { dosisProMuskel, erstelleEinheit, hauptvarianten, kgVariante, startfragen, startwerte, wochenDosis } from './planung';
import { offeneWochenabschluesse, schliesseEinheitAb, wochenabschluss } from './progression';
import { startziel } from './testtag';
import { eingespielt, ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import { MUSKELN, type AppZustand, type Einheit, type Einstellungen, type Muskel, type Ort } from './typen';
import { einstellungenVon, uebungVon } from './verlauf';

const MO = zeitpunkt(0, 18);
const voll = (orte: Ort[] = [ort()], einstellungen: Partial<Einstellungen> = {}): AppZustand =>
  zustand({ katalog: 'voll', orte, einstellungen: { ...STANDARD_EINSTELLUNGEN, ...einstellungen }, maxTests: [] });
const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));

// Alle geplanten Sätze mit dem Ziel geschafft, Messsatz „Noch 1 bis 2“.
function absolviert(z: AppZustand, e: Einheit, jetzt: string): Einheit {
  return {
    ...e, status: 'abgeschlossen', gestartetAm: jetzt, beendetAm: jetzt,
    bloecke: e.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => {
        const sek = uebungVon(z, p.uebungId)!.bereich.einheit === 'Sek.';
        const n = b.typ === 'zirkel' ? b.runden ?? 1 : p.istMaxTest ? 1 : p.saetze;
        return {
          ...p, ...(sek || p.istMaxTest || b.typ === 'zirkel' ? { feedback: 'passend' as const } : { reserve: 1.5 }),
          ergebnisse: Array.from({ length: n }, (_, i) => ({
            nr: i + 1, ...(sek ? { sek: p.zielWdh } : { wdh: p.zielWdh }),
            ...(p.last !== undefined ? { last: p.last } : {}), ...(p.bandStufe ? { bandStufe: p.bandStufe } : {}), zeit: jetzt,
          })),
        };
      }),
    })),
  };
}

// Spielt Wochen mit festen Trainingstagen wie die App durch und liefert alle geplanten Einheiten.
function simuliere(z0: AppZustand, wochen: number, tage: number[], dauerMin?: number): Einheit[] {
  let z = z0;
  const geplant: Einheit[] = [];
  for (let w = 0; w < wochen; w++) {
    for (const tag of tage) {
      const jetzt = zeitpunkt(w * 7 + tag, 18);
      for (const id of offeneWochenabschluesse(z, jetzt)) z = wochenabschluss(z, id);
      const fragen = startfragen(z, jetzt);
      const woche = wocheMitPrognose(z, jetzt, tage.length, fragen.ortId);
      z = { ...z, wochen: [...z.wochen.filter((x) => x.id !== woche.id), woche] };
      const e = erstelleEinheit(z, {
        jetzt, ortId: fragen.ortId, prognose: woche.prognose, morgenWieder: fragen.morgenWiederVorschlag, laenger: false,
        ...(dauerMin ? { dauerMin } : {}),
      });
      if (e.format === 'zirkel' || e.bloecke.length === 0) continue;
      geplant.push(e);
      z = schliesseEinheitAb(z, absolviert(z, e, jetzt), jetzt);
    }
  }
  return geplant;
}

describe('Abwechslung mit Körpergewicht: zuerst derselbe Hauptmuskel', () => {
  const z = voll();
  const e = einstellungenVon(z);
  const o = z.orte[0]!;

  it('Rumänisches Kreuzheben bekommt einen direkten Ersatz für die hinteren Oberschenkel, Hip Thrusts einen fürs Gesäß', () => {
    expect(uebungVon(z, 'kh_rdl')!.primaer[0]).toBe('HintereOS');
    expect(kgVariante(z, e, o, 'Huefte', 'HintereOS', MO)!.primaer[0]).toBe('HintereOS');
    expect(kgVariante(z, e, o, 'Huefte', 'Gesaess', MO)!.primaer[0]).toBe('Gesaess');
  });

  it('ohne direkten Ersatz am Ort eine andere Körpergewichtsvariante derselben Bewegung', () => {
    const ohne = voll([ort()], { ausgeschlossen: ['rdl_einbeinig'] });
    const u = kgVariante(ohne, einstellungenVon(ohne), o, 'Huefte', 'HintereOS', MO)!;
    expect(u).toMatchObject({ muster: 'Huefte', lasttyp: 'KG' });
    expect(u.primaer[0]).toBe('Gesaess');
  });

  it('gemerkt wird je Hauptmuskel; eine ältere Angabe je Muster wird nur bei passendem Muskel genutzt', () => {
    const alt = { ...z, muster: [{ muster: 'Huefte' as const, stufe: 3, hauptvarianten: ['kh_rdl', 'kh_hip_thrust'], kgVariante: 'hip_thrust_einbeinig' }] };
    expect(kgVariante(alt, e, o, 'Huefte', 'Gesaess', MO)!.id).toBe('hip_thrust_einbeinig');
    expect(kgVariante(alt, e, o, 'Huefte', 'HintereOS', MO)!.primaer[0]).toBe('HintereOS');
    const neu = { ...z, muster: [{ muster: 'Huefte' as const, stufe: 3, hauptvarianten: ['kh_rdl'], kgVarianten: { HintereOS: 'rdl_einbeinig', Gesaess: 'glute_bridge' } }] };
    expect(kgVariante(neu, e, o, 'Huefte', 'HintereOS', MO)!.id).toBe('rdl_einbeinig');
    expect(kgVariante(neu, e, o, 'Huefte', 'Gesaess', MO)!.id).toBe('glute_bridge');
  });

  it('in 12 Wochen ersetzt die Abwechslung jede Hantelübung durch eine mit demselben Hauptmuskel', () => {
    const start = voll([ort(['KH', 'BANK', 'SCHRAEG', 'STANGE', 'BAND', 'ANKER', 'TISCH', 'ERH'])], { level: 'fortgeschritten' });
    const paare = simuliere(start, 12, [0, 2, 4]).flatMap((x) => x.bloecke.flatMap((b) => b.positionen))
      .filter((p) => p.abwechslungFuer).map((p) => [uebungVon(start, p.uebungId)!, uebungVon(start, p.abwechslungFuer!)!] as const);
    expect(paare.some(([, h]) => h.id === 'kh_rdl')).toBe(true);
    for (const [kg, hantel] of paare) expect(kg.primaer[0], `${kg.id} für ${hantel.id}`).toBe(hantel.primaer[0]);
  });
});

describe('Shrugs nur als Favorit (Entscheidung 10.11.2026)', () => {
  it('auch bei Zyklusbeginn nicht als neue Übung; die Schulter-Übungen bleiben', () => {
    expect(NUR_ALS_FAVORIT).toContain('kh_shrugs');
    // Mit Hanteln und Bank, 3 lange Einheiten je Woche: Hier kamen die Shrugs vorher ab Woche 8.
    const z = voll([ort(['KH', 'BANK', 'TISCH', 'ERH'])]);
    const alle = simuliere(z, 12, [0, 2, 4], 75).flatMap(ids);
    expect(alle).not.toContain('kh_shrugs');
  });

  it('als Favorit weiter möglich', () => {
    const z = voll([ort()], { favoriten: ['kh_shrugs'] });
    expect(hauptvarianten(z, 'Schulter', ort(), MO).map((k) => k.uebung.id)).toContain('kh_shrugs');
  });
});

describe('Gerade Startziele (Entscheidung 10.11.2026)', () => {
  const z = voll();
  const e = einstellungenVon(z);
  const o = z.orte[0]!;
  const start = (id: string) => startwerte(z, e, o, uebungVon(z, id)!).zielWdh;

  it('neue Übung: Untergrenze, auf die gerade Zahl darunter', () => {
    expect(uebungVon(z, 'klimmzug')!.bereich.von).toBe(5);
    expect(start('klimmzug')).toBe(4);
    expect(start('nordic_curl')).toBe(2);
    expect(start('wadenheben')).toBe(14);
    expect(start('liegestuetz')).toBe(8);     // gerade Untergrenze bleibt
    expect(start('plank')).toBe(uebungVon(z, 'plank')!.bereich.von);   // Halteübung unverändert
  });

  it('eine schon trainierte Übung behält ihr Ziel', () => {
    const mit = { ...z, varianten: [{ uebungId: 'klimmzug', zielWdh: 7, seitSteigerung: 0, schwerSerie: 0 }] };
    expect(startwerte(mit, e, o, uebungVon(z, 'klimmzug')!).zielWdh).toBe(7);
  });

  it('Testtag: 70 % des Ergebnisses, mit Wiederholungen gerade; Halteübungen wie bisher', () => {
    expect(startziel(e, uebungVon(z, 'liegestuetz')!, 15)).toBe(10);   // 10,5 ⇒ 11 ⇒ 10
    expect(startziel(e, uebungVon(z, 'liegestuetz')!, 20)).toBe(14);
    expect(startziel(e, uebungVon(z, 'plank')!, 45)).toBe(32);
  });
});

describe('Beincurls bei 1 bis 2 Einheiten zusätzlich (Entscheidung 10.11.2026)', () => {
  // Ort ohne Hanteln für die Hüfte bis auf Hip Thrusts: Die Hüftübungen zielen aufs Gesäß.
  const z0 = voll([ort(['KH', 'BANK', 'SCHRAEG', 'STANGE', 'BAND', 'ANKER', 'TISCH', 'ERH'])], {
    level: 'einsteiger', ausgeschlossen: ['kh_rdl', 'kh_rdl_einbeinig', 'rdl_einbeinig'],
  });
  const z = setzePrognose(eingespielt(z0), MO, 2);
  const plane = (prognose: number) => erstelleEinheit(setzePrognose(z, MO, prognose), {
    jetzt: MO, ortId: 'zuhause', prognose, morgenWieder: false, laenger: false,
  });
  const hintereOS = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen)
    .filter((p) => !p.istMaxTest && uebungVon(z, p.uebungId)!.primaer[0] === 'HintereOS');

  it('ohne eigene Übung für die hinteren Oberschenkel kommt eine Beincurl-Übung mit 2 bis 3 Sätzen dazu', () => {
    expect(EINHEIT.armeZusatzMuster).toContain('Beinbeuger');
    const e = plane(2);
    const p = hintereOS(e);
    expect(p).toHaveLength(1);
    expect(uebungVon(z, p[0]!.uebungId)!.muster).toBe('Beinbeuger');
    expect(p[0]!.saetze).toBeGreaterThanOrEqual(2);
    expect(p[0]!.saetze).toBeLessThanOrEqual(3);
  });

  it('in 12 Wochen mit 2 Einheiten erreichen die hinteren Oberschenkel mindestens 75 % ihres Ziels', () => {
    const start = voll([ort()], { level: 'einsteiger' });
    let s = start;
    const tage = [1, 5];
    for (let w = 0; w < 12; w++) {
      for (const tag of tage) {
        const jetzt = zeitpunkt(w * 7 + tag, 18);
        for (const id of offeneWochenabschluesse(s, jetzt)) s = wochenabschluss(s, id);
        const fragen = startfragen(s, jetzt);
        const woche = wocheMitPrognose(s, jetzt, 2, fragen.ortId);
        s = { ...s, wochen: [...s.wochen.filter((x) => x.id !== woche.id), woche] };
        const e = erstelleEinheit(s, { jetzt, ortId: fragen.ortId, prognose: 2, morgenWieder: false, laenger: false });
        s = schliesseEinheitAb(s, absolviert(s, e, jetzt), jetzt);
      }
      if (w < 2) continue;   // Eingewöhnung: neue Übungen höchstens 3 Sätze
      const woche = s.wochen.find((x) => x.id === isoWoche(zeitpunkt(w * 7, 12)))!;
      expect(woche.erledigt.HintereOS, `Woche ${w + 1}`).toBeGreaterThanOrEqual(0.75 * woche.ziele.HintereOS);
    }
  });
});

describe('Viele Sätze an einem Tag: abnehmender Nutzen und Erhaltung (Entscheidung 10.11.2026)', () => {
  const null10 = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;
  // Mit Testtag vom Vortag, damit am Montag kein Max-Test fällig ist
  const z0 = eingespielt(zustand({ katalog: 'voll', orte: [ort(['KH', 'BANK', 'SCHRAEG', 'STANGE', 'BAND', 'ANKER', 'TISCH', 'ERH'])],
    einstellungen: { ...STANDARD_EINSTELLUNGEN } }));
  const brust = (e: Einheit, z: AppZustand) => e.bloecke.flatMap((b) => b.positionen)
    .filter((p) => !p.istMaxTest && uebungVon(z, p.uebungId)!.primaer[0] === 'Brust').reduce((s, p) => s + p.saetze, 0);
  // Montag: langes Training nur für die Brust (Bankdrücken, Schrägbank, Flys)
  const montag = () => {
    const jetzt = zeitpunkt(0, 18);
    const woche = wocheMitPrognose(z0, jetzt, 3, 'zuhause');
    const z = { ...z0, wochen: [woche] };
    const e = erstelleEinheit(z, { jetzt, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, muskeln: ['Brust'], dauerMin: 60 });
    return { z: schliesseEinheitAb(z, absolviert(z, e, jetzt), jetzt), e, zVorher: z };
  };
  const plane = (z: AppZustand, tag: number, extra: Partial<Parameters<typeof erstelleEinheit>[1]> = {}) =>
    erstelleEinheit(z, { jetzt: zeitpunkt(tag, 18), ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, ...extra });

  it('ab dem 7. Satz eines Muskels zählt jeder weitere nur halb für die Woche', () => {
    const d = { ...null10(), Brust: 12, Trizeps: 6, Schultern: 3 };
    expect(wochenDosis(d)).toMatchObject({ Brust: 9, Trizeps: 6, Schultern: 3 });
    const { z, e, zVorher } = montag();
    const echt = dosisProMuskel(zVorher, { ...e, status: 'abgeschlossen', bloecke: absolviert(zVorher, e, MO).bloecke });
    expect(echt.Brust).toBeGreaterThanOrEqual(12);
    expect(z.wochen[0]!.erledigt.Brust).toBeCloseTo(wochenDosis(echt).Brust);
    expect(z.wochen[0]!.erledigt.Brust).toBeLessThan(echt.Brust);
    // Die Erholung rechnet mit allen Sätzen.
    expect(z.muskeln.find((m) => m.muskel === 'Brust')!.letzteDosis).toBe(echt.Brust);
  });

  it('nach dem vollen Montag bekommt die erholte Brust am Donnerstag 2 bis 3 Sätze statt einer Woche Pause', () => {
    const { z, e } = montag();
    expect(brust(e, z)).toBeGreaterThanOrEqual(z.wochen[0]!.ziele.Brust);   // mehr Sätze als das Wochenziel an einem Tag
    expect(brust(plane(z, 2), z)).toBe(0);                     // Mittwoch: noch nicht erholt
    const s = brust(plane(z, 3), z);                            // Donnerstag
    expect(s).toBeGreaterThanOrEqual(WOCHENZIEL.erhaltungSaetze.min);
    expect(s).toBeLessThanOrEqual(WOCHENZIEL.erhaltungSaetze.max + 1);   // gerundet je Übung, höchstens 1 mehr durch Mitarbeit
  });

  it('keine Erhaltung über der Obergrenze, in der Erholungswoche oder nach dem zweiten Trainingstag', () => {
    const { z } = montag();
    const voll16 = { ...z, wochen: z.wochen.map((w) => ({ ...w, erledigt: { ...w.erledigt, Brust: 15 } })) };
    expect(brust(plane(voll16, 3), voll16)).toBe(0);
    const erholung = { ...z, wochen: z.wochen.map((w) => ({ ...w, erholungswoche: true })) };
    expect(brust(plane(erholung, 3), erholung)).toBe(0);
    // Donnerstag mit Erhaltung trainiert: am Samstag nichts mehr für die Brust
    const jetzt = zeitpunkt(3, 18);
    const e = plane(z, 3);
    const z2 = schliesseEinheitAb(z, absolviert(z, e, jetzt), jetzt);
    expect(brust(plane(z2, 5), z2)).toBe(0);
  });
});
