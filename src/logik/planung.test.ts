import { describe, expect, it } from 'vitest';
import { isoWoche, plusTage, wochentag } from './datum';
import {
  alternativen, dosisProMuskel, erholungsfenster, erstelleEinheit, hauptvarianten, istErholt, startfragen,
  startwerte, tausche, wochenziele, zirkelVorschlagen,
} from './planung';
import { absolviere, ort, setzePrognose, simuliereWoche, zeitpunkt, zustand } from './testhilfe';
import { MUSKELN, type AppZustand, type Einheit, type MuskelZustand, type Muskel } from './typen';

const ids = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
const uebung = (z: AppZustand, id: string) => z.katalog.uebungen.find((u) => u.id === id)!;
const MO = zeitpunkt(0, 18);
const plane = (z: AppZustand, jetzt = MO, extra: Partial<Parameters<typeof erstelleEinheit>[1]> = {}) =>
  erstelleEinheit(z, { jetzt, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, ...extra });
const belastet = (muskel: Muskel, vor: string, dosis: number, schwer = false): MuskelZustand => ({
  muskel, letzteBelastung: vor, letzteDosis: dosis, letzteSchwer: schwer, persoenlicheGrenze: 12, gleichWochen: 0, leistung: [],
});

describe('Datum', () => {
  it('ISO-Woche und Wochentag', () => {
    expect(isoWoche('2026-10-19T08:00:00')).toBe('2026-W43');
    expect(isoWoche('2026-10-25T23:00:00')).toBe('2026-W43');
    expect(isoWoche('2027-01-01T08:00:00')).toBe('2026-W53');
    expect(wochentag('2026-10-19T08:00:00')).toBe(0);
    expect(plusTage('2026-10-31T10:00:00', 1)).toBe('2026-11-01T10:00:00');
  });
});

describe('Erholungsfenster', () => {
  it('Fenster nach fraktionellen Sätzen der letzten Einheit', () => {
    expect(erholungsfenster(2, false)).toBe(24);
    expect(erholungsfenster(3, false)).toBe(24);
    expect(erholungsfenster(5, false)).toBe(36);
    expect(erholungsfenster(8, false)).toBe(48);
    expect(erholungsfenster(10, false)).toBe(72);
  });

  it('„zu schwer“ verlängert das Fenster um 24 Std.', () => {
    expect(erholungsfenster(5, true)).toBe(60);
    const jetzt = zeitpunkt(2, 10);
    expect(istErholt(belastet('Brust', zeitpunkt(0, 18), 5), jetzt)).toBe(true);
    expect(istErholt(belastet('Brust', zeitpunkt(0, 18), 5, true), jetzt)).toBe(false);
    expect(istErholt(belastet('Brust', zeitpunkt(0, 18), 5, true), zeitpunkt(3, 6))).toBe(true);
  });

  it('kein Muskel wird vor Ablauf seines Fensters belastet', () => {
    const z = { ...zustand(), muskeln: [belastet('Brust', zeitpunkt(0, 0), 8, true)] };
    const jetzt = zeitpunkt(2, 0); // 48 Std. später, Fenster 48 + 24
    const dosis = dosisProMuskel(z, plane(z, jetzt));
    expect(dosis.Brust).toBe(0);
    expect(dosis.Ruecken).toBeGreaterThan(0);
  });
});

describe('Wochenziel und Prioritäten', () => {
  it('höhere Priorität hebt das Ziel, niedrigere senkt es', () => {
    const standard = wochenziele(zustand(), 3, 'zuhause', MO);
    const z = zustand({ einstellungen: { prioritaeten: { ...zustand().einstellungen[0]!.prioritaeten, Waden: 'hoch', Brust: 'sehrNiedrig' } } });
    const geaendert = wochenziele(z, 3, 'zuhause', MO);
    expect(standard.Waden).toBe(4);
    expect(geaendert.Waden).toBe(12);
    expect(standard.Brust).toBe(12);
    expect(geaendert.Brust).toBeLessThanOrEqual(4);
  });

  it('Level verschiebt die persönliche Grenze (Start)', () => {
    expect(wochenziele(zustand({ einstellungen: { level: 'einsteiger' } }), 3, 'zuhause', MO).Brust).toBe(10);
  });

  it('gespeicherte persönliche Grenze hat Vorrang', () => {
    const z = { ...zustand(), muskeln: [{ ...belastet('Brust', MO, 0), letzteBelastung: undefined, persoenlicheGrenze: 14 }] };
    expect(wochenziele(z, 3, 'zuhause', MO).Brust).toBe(12); // Zeitbudget begrenzt
    expect(wochenziele(z, 5, 'zuhause', MO).Brust).toBe(14);
  });
});

describe('Favoriten-Bonus', () => {
  it('+0,2 entscheidet zwischen gleichwertigen Übungen', () => {
    // Goblet Squat und Bulgarian Split Squat bringen gleich viel; ohne Favorit gewinnt die höhere Stufe.
    expect(ids(plane(zustand()))).toContain('bss_kh');
    expect(ids(plane(zustand()))).not.toContain('goblet_squat');
    const mitFavorit = plane(zustand({ einstellungen: { favoriten: ['goblet_squat'] } }));
    expect(ids(mitFavorit)).toContain('goblet_squat');
    expect(ids(mitFavorit)).not.toContain('bss_kh');
  });
});

describe('Startfragen, Fokus und Pacing', () => {
  it('erste Einheit der Woche fragt die Prognose ab, Vorschlag aus den letzten Wochen', () => {
    expect(startfragen(zustand(), MO)).toMatchObject({ prognoseAbfragen: true, prognoseVorschlag: 3, ortId: 'zuhause' });
    let z = zustand();
    for (const [woche, anzahl] of [[1, 4], [2, 5], [3, 4], [4, 5]] as const) {
      const jetzt = plusTage(MO, -7 * woche);
      z = setzePrognose(z, jetzt, anzahl);
      z = { ...z, wochen: z.wochen.map((w) => (w.id === isoWoche(jetzt) ? { ...w, einheiten: anzahl } : w)) };
    }
    expect(startfragen(z, MO).prognoseVorschlag).toBe(5);
    expect(startfragen(setzePrognose(z, MO, 2), MO)).toMatchObject({ prognoseAbfragen: false, prognoseVorschlag: 2 });
  });

  it('„Morgen wieder?“ ja bei dichter Prognose, dann Fokus Ober- und Unterkörper', () => {
    const z = setzePrognose(zustand(), MO, 5);
    expect(startfragen(z, MO).morgenWiederVorschlag).toBe(true);
    const { einheiten } = simuliereWoche(zustand(), 5, [{ tag: 0, stunde: 18 }, { tag: 1, stunde: 18 }]);
    expect(einheiten.map((e) => e.fokus)).toEqual(['oben', 'unten']);
    const dosisUnten = dosisProMuskel(zustand(), einheiten[1]!);
    for (const m of ['Brust', 'Ruecken', 'Schultern', 'Bizeps', 'Trizeps'] as const) expect(dosisUnten[m]).toBe(0);
  });

  it('nach 72 Std. Pause: „Morgen wieder?“ nein und korrigierte Prognose zur Bestätigung', () => {
    const { z } = simuliereWoche(zustand(), 4, [{ tag: 0, stunde: 18 }]);
    const fragen = startfragen(z, zeitpunkt(3, 18));
    expect(fragen.morgenWiederVorschlag).toBe(false);
    expect(fragen).toMatchObject({ prognoseAbfragen: true, prognoseVorschlag: 3 });
  });

  it('mehr Einheiten als prognostiziert: Prognose steigt automatisch', () => {
    const { z } = simuliereWoche(zustand(), 1, [{ tag: 0, stunde: 18 }]);
    expect(startfragen(z, zeitpunkt(2, 18)).prognoseVorschlag).toBe(2);
  });

  it('Ruhetag empfohlen, wenn kaum ein Muskel erholt ist', () => {
    const vorhin = zeitpunkt(0, 17);
    const muskeln = MUSKELN.filter((m) => m !== 'Bauch' && m !== 'Waden').map((m) => belastet(m, vorhin, 5));
    const z = { ...setzePrognose(zustand(), MO, 3), muskeln };
    expect(startfragen(z, MO).ruhetagEmpfohlen).toBe(true);
    expect(startfragen(setzePrognose(zustand(), MO, 3), MO).ruhetagEmpfohlen).toBe(false);
  });

  it('„15 Min länger?“ nur bei Prognose 1 bis 2, Einstellung an und offenem Bedarf', () => {
    const di = zeitpunkt(1, 18);
    expect(startfragen(setzePrognose(zustand(), di, 2), di).laengerAnbieten).toBe(true);
    expect(startfragen(setzePrognose(zustand(), di, 3), di).laengerAnbieten).toBe(false);
    expect(startfragen(setzePrognose(zustand({ einstellungen: { laengerAnbieten: false } }), di, 2), di).laengerAnbieten).toBe(false);
    const laenger = erstelleEinheit(zustand(), { jetzt: di, ortId: 'zuhause', prognose: 2, morgenWieder: false, laenger: true });
    const normal = erstelleEinheit(zustand(), { jetzt: di, ortId: 'zuhause', prognose: 2, morgenWieder: false, laenger: false });
    const saetze = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen).reduce((s, p) => s + p.saetze, 0);
    expect(saetze(laenger)).toBeGreaterThan(saetze(normal));
  });
});

describe('Aufbau der Einheit', () => {
  it('Grundübungen vor Isolation, Bauch und Waden zusätzlich, Bauch nie mit Oberkörper gepaart', () => {
    const { einheiten } = simuliereWoche(zustand(), 2, [{ tag: 1, stunde: 18 }, { tag: 5, stunde: 10 }]);
    const z = zustand();
    for (const e of einheiten) {
      for (const b of e.bloecke.filter((x) => x.typ === 'supersatz')) {
        const muster = b.positionen.map((p) => uebung(z, p.uebungId).muster);
        expect(b.positionen).toHaveLength(2);
        if (muster.includes('Rumpf')) expect(muster.some((m) => ['Knie', 'Einbein', 'Waden'].includes(m))).toBe(true);
      }
      expect(ids(e)).toContain('haengendes_knieheben');
      expect(e.format).not.toBe('klassisch');
    }
  });

  it('Supersatz-Anteil: bei Prognose 4 bis 6 weniger Paare als bei 1 bis 2', () => {
    const paarSaetze = (e: Einheit) => e.bloecke.filter((b) => b.typ === 'supersatz')
      .flatMap((b) => b.positionen).reduce((s, p) => s + p.saetze, 0);
    const alle = (e: Einheit) => e.bloecke.flatMap((b) => b.positionen).reduce((s, p) => s + p.saetze, 0);
    const viele = plane(zustand(), MO, { prognose: 5 });
    expect(paarSaetze(viele) / alle(viele)).toBeLessThan(0.7);
    expect(viele.format).toBe('mix');
  });

  it('geschätzte Dauer enthält Bauch- und Wadensätze', () => {
    const e = plane(zustand());
    const ohne = { ...zustand(), katalog: { ...zustand().katalog, uebungen: zustand().katalog.uebungen.filter((u) => u.muster !== 'Rumpf' && u.muster !== 'Waden') } };
    expect(e.geschaetzteDauerMin).toBeGreaterThan(plane(ohne).geschaetzteDauerMin);
    expect(e.geschaetzteDauerMin).toBeGreaterThanOrEqual(40);
  });

  it('Aufwärmen: allgemein, Mobility der Tagesmuster, Aufwärmsatz der ersten Grundübung', () => {
    const e = plane(zustand());
    const texte = e.aufwaermen.map((a) => a.vorgabe);
    expect(texte.slice(0, 3)).toEqual(zustand().katalog.aufwaermen.allgemein);
    expect(texte).toContain('10 Band-Pull-Aparts');
    expect(e.aufwaermen.at(-1)).toEqual({ uebungId: e.bloecke[0]!.positionen[0]!.uebungId, vorgabe: '8 Wdh. mit 2 kg' });
    const ohneBand = plane(zustand({ orte: [ort(['KH', 'SCHRAEG', 'STANGE', 'TISCH', 'ERH'])] }));
    expect(ohneBand.aufwaermen.map((a) => a.vorgabe).join()).not.toContain('Band');
  });

  it('Einheit ist geplant, gehört zur Woche und hat Ziel und Last je Position', () => {
    const e = plane(zustand());
    expect(e).toMatchObject({ status: 'geplant', woche: '2026-W43', ortId: 'zuhause', fokus: 'ganz' });
    for (const p of e.bloecke.flatMap((b) => b.positionen)) expect(p.zielWdh).toBeGreaterThan(0);
  });
});

describe('Hauptvarianten, Ersatz und Sperren', () => {
  const voll = (utensilien?: string[], einstellungen = {}) =>
    zustand({ katalog: 'voll', orte: [ort(utensilien)], einstellungen });

  it('A und B nach Musterstufe, Lasttyp und Equipment', () => {
    const z = voll();
    const vZug = hauptvarianten(z, 'vZug', z.orte[0]!, MO).map((k) => k.uebung.id);
    expect(vZug).toEqual(['chinup', 'klimmzug_band']);
    const hDruck = hauptvarianten({ ...z, muster: [{ muster: 'hDruck', stufe: 6, hauptvarianten: [] }] }, 'hDruck', z.orte[0]!, MO);
    expect(hDruck.map((k) => k.uebung.lasttyp)).toEqual(['Last', 'Last']);
  });

  it('Favorit wird Hauptvariante', () => {
    const z = voll(undefined, { favoriten: ['arnold_press'] });
    expect(hauptvarianten(z, 'vDruck', z.orte[0]!, MO)[0]!.uebung.id).toBe('arnold_press');
  });

  it('gespeicherte Hauptvarianten bleiben, solange sie am Ort möglich sind', () => {
    const z = { ...voll(), muster: [{ muster: 'hZug' as const, stufe: 5, hauptvarianten: ['tischrudern', 'band_rudern'] }] };
    expect(hauptvarianten(z, 'hZug', z.orte[0]!, MO).map((k) => k.uebung.id)).toEqual(['tischrudern', 'band_rudern']);
    const unterwegs = ort(['TISCH', 'ERH'], 'unterwegs');
    expect(hauptvarianten(z, 'hZug', unterwegs, MO).map((k) => k.uebung.id)).toEqual(['tischrudern']);
  });

  it('vZug ohne Stange: Band-Latzug (selbst eine vZug-Variante), sonst Ersatz Tischrudern', () => {
    const z = voll(['KH', 'BAND', 'ANKER', 'TISCH', 'ERH']);
    expect(hauptvarianten(z, 'vZug', z.orte[0]!, MO)).toEqual([{ uebung: uebung(z, 'band_latzug'), istErsatz: false }]);
    const ohneBand = voll(['KH', 'TISCH', 'ERH']);
    expect(hauptvarianten(ohneBand, 'vZug', ohneBand.orte[0]!, MO)).toEqual([{ uebung: uebung(z, 'tischrudern'), istErsatz: true }]);
  });

  it('Ersatz wird in der Einheit markiert', () => {
    // Ohne Kurzhanteln und Bänder ersetzt Chin-up das Bizeps-Muster; vZug nutzt hier andere Varianten.
    const z = {
      ...voll(['STANGE', 'TISCH', 'ERH'], { favoriten: ['chinup'] }),
      muster: [{ muster: 'vZug' as const, stufe: 6, hauptvarianten: ['klimmzug', 'negative_klimmzuege'] }],
    };
    const positionen = plane(z).bloecke.flatMap((b) => b.positionen);
    expect(positionen.find((p) => p.uebungId === 'chinup')).toMatchObject({ istErsatz: true });
    expect(positionen.filter((p) => p.uebungId !== 'chinup').every((p) => !p.istErsatz)).toBe(true);
  });

  it('Ersatz für Bizeps ohne Kurzhanteln und Bänder: Chin-up', () => {
    const z = voll(['STANGE', 'TISCH', 'ERH']);
    expect(hauptvarianten(z, 'Bizeps', z.orte[0]!, MO)).toEqual([{ uebung: uebung(z, 'chinup'), istErsatz: true }]);
  });

  it('ohne Variante und Ersatz entfällt das Muster', () => {
    const z = voll([]);
    expect(hauptvarianten(z, 'hZug', z.orte[0]!, MO)).toEqual([]);
    expect(hauptvarianten(z, 'vZug', z.orte[0]!, MO)).toEqual([]);
    expect(plane(z).bloecke.length).toBeGreaterThan(0);
  });

  it('Sperre Schulter: Muster fallen weg, kein Ersatz, Ziel der Schultern 0, andere Ziele unverändert', () => {
    const sperre = { einschraenkungen: [{ id: 's', typ: 'region' as const, wert: 'schulter' }] };
    const z = voll(undefined, sperre);
    expect(hauptvarianten(z, 'Schulter', z.orte[0]!, MO)).toEqual([]);
    expect(hauptvarianten(z, 'vDruck', z.orte[0]!, MO)).toEqual([]);
    const ziele = wochenziele(z, 3, 'zuhause', MO);
    expect(ziele.Schultern).toBe(0);
    expect(ziele.Brust).toBe(wochenziele(voll(), 3, 'zuhause', MO).Brust);
    const muster = ids(plane(z)).map((id) => uebung(z, id).muster);
    expect(muster).not.toContain('vDruck');
    expect(muster).not.toContain('Schulter');
  });

  it('ausgeschlossene Übungen werden nie vorgeschlagen', () => {
    const z = zustand({ einstellungen: { ausgeschlossen: ['kh_bankdruecken'] } });
    expect(ids(plane(z))).not.toContain('kh_bankdruecken');
  });
});

describe('Startwerte und Ortswechsel', () => {
  it('neue Variante: Untergrenze des Bereichs und kleinste Last; Ziel „Kraft“ nutzt 6 bis 10', () => {
    const z = zustand();
    const e = z.einstellungen[0]!;
    expect(startwerte(z, e, z.orte[0]!, uebung(z, 'kh_bankdruecken'))).toEqual({ zielWdh: 8, last: 2 });
    const kraft = { ...e, ziele: ['kraft' as const] };
    expect(startwerte(z, kraft, z.orte[0]!, uebung(z, 'kh_bankdruecken')).zielWdh).toBe(6);
    expect(startwerte(z, kraft, z.orte[0]!, uebung(z, 'kh_curls')).zielWdh).toBe(10);
  });

  it('Ortswechsel behält die Werte der Variante; fehlende Last wird nach unten angepasst', () => {
    const z: AppZustand = {
      ...zustand(),
      varianten: [{ uebungId: 'kh_bankdruecken', last: 22, zielWdh: 10, e1rm: 30, seitSteigerung: 0, schwerSerie: 0 }],
      orte: [ort(), { ...ort(['SCHRAEG']), id: 'studio', standard: false, equipment: [{ utensilId: 'SCHRAEG' }, { utensilId: 'KH', kurzhanteln: { modus: 'paare', gewichteKg: [10, 16, 20] } }] }],
    };
    const e = z.einstellungen[0]!;
    const u = uebung(z, 'kh_bankdruecken');
    expect(startwerte(z, e, z.orte[0]!, u)).toEqual({ zielWdh: 10, last: 22 });
    expect(startwerte(z, e, z.orte[1]!, u)).toEqual({ zielWdh: 12, last: 20 });
  });

  it('Band: gespeicherte Stufe, sonst die nächst leichtere vorhandene', () => {
    const z: AppZustand = {
      ...zustand({ katalog: 'voll' }),
      varianten: [{ uebungId: 'band_rudern', bandStufe: 'schwer', zielWdh: 12, seitSteigerung: 0, schwerSerie: 0 }],
    };
    const e = z.einstellungen[0]!;
    const u = uebung(z, 'band_rudern');
    expect(startwerte(z, e, z.orte[0]!, u).bandStufe).toBe('schwer');
    const reise: typeof z.orte[0] = { id: 'r', name: 'r', standard: false, equipment: [{ utensilId: 'BAND', bandStufen: ['leicht', 'mittel', 'extraSchwer'] }] };
    expect(startwerte(z, e, reise, u).bandStufe).toBe('mittel');
    expect(startwerte(z, e, reise, uebung(z, 'klimmzug_band')).bandStufe).toBe('extraSchwer');
  });
});

describe('Tausch vor dem Start', () => {
  it('Alternativen nur aus demselben Muster und am Ort möglich', () => {
    const z = zustand({ katalog: 'voll', orte: [ort(['KH', 'TISCH', 'ERH'])] });
    const e = plane(z);
    e.bloecke.forEach((b, bi) => b.positionen.forEach((p, pi) => {
      const muster = uebung(z, p.uebungId).muster;
      for (const a of alternativen(z, e, bi, pi)) {
        const u = uebung(z, a.uebungId);
        expect(u.muster).toBe(muster);
        expect(u.equipment.every((g) => g.some((id) => ['KH', 'TISCH', 'ERH'].includes(id)))).toBe(true);
      }
    }));
  });

  it('Tausch ersetzt die Übung, merkt das Original und ist nach dem Start gesperrt', () => {
    const z = zustand({ katalog: 'voll' });
    const e = plane(z);
    const alt = e.bloecke[0]!.positionen[0]!;
    const ziel = alternativen(z, e, 0, 0)[0]!;
    const neu = tausche(z, e, 0, 0, ziel.uebungId);
    expect(neu.bloecke[0]!.positionen[0]).toMatchObject({ uebungId: ziel.uebungId, saetze: alt.saetze, getauschtVon: alt.uebungId });
    expect(e.bloecke[0]!.positionen[0]!.uebungId).toBe(alt.uebungId);
    const zurueck = tausche(z, neu, 0, 0, alt.uebungId);
    expect(zurueck.bloecke[0]!.positionen[0]!.getauschtVon).toBeUndefined();
    expect(() => tausche(z, { ...e, status: 'laufend' }, 0, 0, ziel.uebungId)).toThrow();
    expect(() => tausche(z, e, 0, 0, 'kh_curls')).toThrow();
  });
});

describe('Zirkel', () => {
  it('Zirkel-Einheit: Stationen nach Musterstufe − 2, Volumen 0,5 je Runde und Station', () => {
    const z = zustand({ katalog: 'voll' });
    const e = plane(z, MO, { zirkelId: 'fundament' });
    expect(e.format).toBe('zirkel');
    expect(e.bloecke).toHaveLength(1);
    expect(e.bloecke[0]).toMatchObject({ typ: 'zirkel', zirkelId: 'fundament', runden: 5 });
    const stationen = e.bloecke[0]!.positionen;
    expect(stationen.map((p) => uebung(z, p.uebungId).muster)).toEqual(['Knie', 'hDruck', 'hZug', 'Rumpf']);
    for (const p of stationen) expect(uebung(z, p.uebungId).stufe).toBeLessThanOrEqual(3);
    expect(stationen[3]!.zielWdh).toBe(30);
    expect(dosisProMuskel(z, e).Bauch).toBe(2.5);
    expect(dosisProMuskel(z, e).Quadrizeps).toBe(2.5);
  });

  it('Fälligkeit und Vorschlag', () => {
    const di = zeitpunkt(1, 18); // ISO-Woche 43 ist ungerade
    expect(zirkelVorschlagen(zustand(), di, 3, 'zuhause')).toBe(false);
    const woechentlich = zustand({ einstellungen: { zirkelAnteil: '1proWoche' } });
    expect(zirkelVorschlagen(woechentlich, di, 2, 'zuhause')).toBe(false);
    expect(zirkelVorschlagen(woechentlich, di, 3, 'zuhause')).toBe(false);
    const { z } = simuliereWoche(woechentlich, 3, [{ tag: 0, stunde: 18 }, { tag: 2, stunde: 18 }]);
    expect(zirkelVorschlagen(z, zeitpunkt(4, 18), 3, 'zuhause')).toBe(true);
    const zirkel = plane(z, zeitpunkt(4, 18), { zirkelId: 'sprint' });
    const danach = absolviere(z, zirkel, zeitpunkt(4, 18));
    expect(zirkelVorschlagen(danach, zeitpunkt(5, 18), 4, 'zuhause')).toBe(false);
  });
});
