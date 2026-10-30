// Bewertung der Übungen (Paket 8): Rangfolge der Hauptvarianten, Ersatz bei 1 Stern, Zu- und
// Abschläge in der Übungswahl, Zyklusbeginn sowie „Nächstes Mal“ im Übungsfeedback.
import { describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { plusTage, isoWoche } from './datum';
import { mitBewertungen, mitSternen } from './einstellungen';
import { erstelleEinheit, hauptvarianten } from './planung';
import { beende, offeneFeedbacks, satzVorgabe, schritte, setzeFeedback, starte, sternFragen, trageSatzEin } from './player';
import { schliesseEinheitAb, uebernimmBewertungen, vorschauNaechstesMal, wochenabschluss, type NaechstesMal } from './progression';
import { MONTAG, ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import { MUSKELN, type AppZustand, type Einheit, type Muskel, type MusterZustand, type Sterne } from './typen';

const JETZT = zeitpunkt(0, 18);
const voll = (bewertungen: Record<string, Sterne> = {}, extra: Partial<AppZustand> = {}): AppZustand => ({
  ...zustand({ katalog: 'voll', einstellungen: { bewertungen } }), ...extra,
});
const ids = (z: AppZustand, muster: MusterZustand['muster'] = 'hDruck', o = ort()) =>
  hauptvarianten(z, muster, o, JETZT).map((k) => k.uebung.id);
const gespeichert = (hDruck: string[]): Partial<AppZustand> => ({ muster: [{ muster: 'hDruck', stufe: 5, hauptvarianten: hDruck }] });

describe('Rangfolge der Hauptvarianten mit Sternen', () => {
  it('wählt ohne Bewertung nach Abstand, Lasttyp und Katalog', () => {
    expect(ids(voll())).toEqual(['kh_bankdruecken', 'kh_schraegbank']);
  });

  it('plant die Floor Press nur ohne Bank (Entscheidung 30.10.2026)', () => {
    const nurKh = ort(['KH']);
    expect(ids(voll({}, { orte: [nurKh] }), 'hDruck', nurKh)).toEqual(['kh_bodendruecken', 'liegestuetz']);
    expect(ids(voll())).not.toContain('kh_bodendruecken');
    expect(ids(voll({}, { orte: [ort(['KH', 'BANK'])] }), 'hDruck', ort(['KH', 'BANK']))[0]).toBe('kh_bankdruecken');
    // Auch eine gespeicherte Floor Press weicht am Ort mit Bank dem Bankdrücken.
    expect(ids(voll({}, gespeichert(['kh_bodendruecken', 'kh_schraegbank'])))).toEqual(['kh_bankdruecken', 'kh_schraegbank']);
  });

  it('stellt Varianten mit 1 Stern ans Ende', () => {
    expect(ids(voll({ kh_bankdruecken: 1 }))).toEqual(['kh_schraegbank', 'liegestuetz_fuesse_erhoeht']);
  });

  it('bevorzugt bei gleichem Abstand zur Musterstufe mehr Sterne', () => {
    expect(ids(voll({ kh_schraegbank: 5 }))[0]).toBe('kh_schraegbank');
    // Der Abstand zur Musterstufe geht vor: 5 Sterne für Knieliegestütz (Stufe 1) ändern nichts.
    expect(ids(voll({ knieliegestuetz: 5 }))[0]).toBe('kh_bankdruecken');
  });

  it('der Favorit bleibt vor allem anderen', () => {
    const z = voll({ kh_schraegbank: 1 });
    const fav: AppZustand = { ...z, einstellungen: [{ ...z.einstellungen[0]!, favoriten: ['kh_schraegbank'] }] };
    expect(ids(fav)[0]).toBe('kh_schraegbank');
  });
});

describe('1 Stern ersetzt die Hauptvariante', () => {
  it('ab der nächsten Einheit durch die beste Alternative mit höchstens 1 Stufe Abstand', () => {
    const z = voll({ kh_bankdruecken: 1 }, gespeichert(['kh_bankdruecken', 'kh_schraegbank']));
    expect(ids(z)).toEqual(['liegestuetz_fuesse_erhoeht', 'kh_schraegbank']);
    // Die nächste Einheit nutzt das Bankdrücken nicht mehr.
    const einheit = erstelleEinheit(z, { jetzt: JETZT, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
    const uebungen = einheit.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
    expect(uebungen).not.toContain('kh_bankdruecken');
    expect(uebungen.some((id) => id === 'kh_schraegbank' || id === 'liegestuetz_fuesse_erhoeht')).toBe(true);
  });

  it('übernimmt den Ersatz in die gespeicherten Hauptvarianten', () => {
    const z = voll({ kh_bankdruecken: 1 }, gespeichert(['kh_bankdruecken', 'kh_schraegbank']));
    expect(uebernimmBewertungen(z, 'zuhause', JETZT).muster.find((m) => m.muster === 'hDruck')!.hauptvarianten)
      .toEqual(['liegestuetz_fuesse_erhoeht', 'kh_schraegbank']);
  });

  it('bleibt, wenn es keine Alternative mit mindestens 2 Sternen in der Nähe gibt', () => {
    const nurKh = ort(['KH']);
    const basis = { orte: [nurKh], ...gespeichert(['kh_bodendruecken', 'liegestuetz']) };
    // Am Ort mit nur Kurzhanteln liegen Knieliegestütz (Stufe 1) und Archer (Stufe 8) zu weit weg.
    expect(ids(voll({ kh_bodendruecken: 1 }, basis), 'hDruck', nurKh)).toEqual(['kh_bodendruecken', 'liegestuetz']);
    const z = voll({ kh_bankdruecken: 1 }, gespeichert(['kh_bankdruecken', 'kh_schraegbank']));
    const alleSchlecht = mitBewertungen(z.einstellungen[0]!, {
      liegestuetz_fuesse_erhoeht: 1, liegestuetz: 1, band_brustpresse: 1, liegestuetz_band: 1,
    });
    expect(ids({ ...z, einstellungen: [alleSchlecht] })).toEqual(['kh_bankdruecken', 'kh_schraegbank']);
    expect(uebernimmBewertungen({ ...z, einstellungen: [alleSchlecht] }, 'zuhause', JETZT).muster)
      .toEqual(z.muster);
  });

  it('lässt gespeicherte Hauptvarianten an einem anderen Ort unberührt', () => {
    const z = voll({ kh_bodendruecken: 1 }, { ...gespeichert(['kh_bodendruecken', 'kh_bankdruecken']), orte: [ort(), ort(['BAND'], 'hotel')] });
    expect(uebernimmBewertungen(z, 'hotel', JETZT).muster).toEqual(z.muster);
  });
});

describe('Sterne in der Übungswahl (Schritt 6)', () => {
  const erstesDruecken = (bewertungen: Record<string, Sterne>) => {
    const z = voll(bewertungen, gespeichert(['kh_bankdruecken', 'kh_schraegbank']));
    const einheit = erstelleEinheit(z, { jetzt: JETZT, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
    return einheit.bloecke.flatMap((b) => b.positionen).find((p) => ['kh_bankdruecken', 'kh_schraegbank'].includes(p.uebungId))?.uebungId;
  };

  it('ohne Bewertung gewinnt bei Gleichstand die Reihenfolge der Kandidaten', () => {
    expect(erstesDruecken({})).toBe('kh_bankdruecken');
  });

  it('4 und 5 Sterne geben einen Zuschlag, 2 Sterne einen Abschlag', () => {
    expect(erstesDruecken({ kh_schraegbank: 4 })).toBe('kh_schraegbank');
    expect(erstesDruecken({ kh_schraegbank: 5 })).toBe('kh_schraegbank');
    expect(erstesDruecken({ kh_bankdruecken: 2 })).toBe('kh_schraegbank');
  });

  it('ändert das Volumen pro Muskel nicht', () => {
    const saetze = (bewertungen: Record<string, Sterne>) => {
      const z = voll(bewertungen, gespeichert(['kh_bankdruecken', 'kh_schraegbank']));
      const e = erstelleEinheit(z, { jetzt: JETZT, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
      return e.bloecke.flatMap((b) => b.positionen).reduce((s, p) => s + p.saetze, 0);
    };
    expect(saetze({ kh_schraegbank: 5 })).toBe(saetze({}));
    expect(saetze({ kh_bankdruecken: 2 })).toBe(saetze({}));
  });
});

describe('Zyklusbeginn mit Sternen', () => {
  const null10 = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;
  const bizeps = (bewertungen: Record<string, Sterne>) => {
    const z = voll(bewertungen, {
      zyklen: [{ nr: 1, start: plusTage(MONTAG, -35) }],
      muster: [{ muster: 'Bizeps', stufe: 3, hauptvarianten: ['kh_curls'] }],
      wochen: [{ id: '2026-W43', prognose: 3, einheiten: 0, ziele: null10(), erledigt: null10(), erholungswoche: false, laengerAngenommen: false }],
    });
    return wochenabschluss(z, '2026-W43').muster.find((m) => m.muster === 'Bizeps')!.hauptvarianten;
  };

  it('tauscht ohne Bewertung gegen eine Variante gleicher Stufe', () => {
    expect(bizeps({})).toEqual(['hammer_curls']);
  });

  it('behält Varianten mit 4 oder 5 Sternen', () => {
    expect(bizeps({ kh_curls: 4 })).toEqual(['kh_curls']);
    expect(bizeps({ kh_curls: 5 })).toEqual(['kh_curls']);
  });

  it('tauscht nicht gegen schlechter bewertete und wählt mehr Sterne zuerst', () => {
    expect(bizeps({ hammer_curls: 2, konzentrationscurl: 1 })).toEqual(['kh_curls']);
    expect(bizeps({ hammer_curls: 3, konzentrationscurl: 5 })).toEqual(['konzentrationscurl']);
    // Mit 2 Sternen genügt eine Alternative mit 2 Sternen.
    expect(bizeps({ kh_curls: 2, hammer_curls: 2, konzentrationscurl: 1 })).toEqual(['hammer_curls']);
  });
});

// Fertige Einheit mit je einem erledigten Satz der Übungen (Zirkel: als Zirkelblock, Max-Test markiert).
const fertig = (zeit: string, uebungen: string[], art: { zirkel?: string[]; maxTest?: string[] } = {}): Einheit => {
  const position = (uebungId: string) => ({ uebungId, saetze: 1, zielWdh: 10, ergebnisse: [{ nr: 1, wdh: 10, zeit }],
    ...(art.maxTest?.includes(uebungId) ? { istMaxTest: true } : {}) });
  return {
    id: zeit, woche: isoWoche(zeit), erstelltAm: zeit, gestartetAm: zeit, status: 'abgeschlossen', ortId: 'zuhause',
    fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 0, aufwaermen: [],
    bloecke: [{ typ: 'einzeln', pauseSek: 0, positionen: uebungen.map(position) },
      ...(art.zirkel ? [{ typ: 'zirkel' as const, pauseSek: 0, positionen: art.zirkel.map(position) }] : [])],
  };
};

describe('Sterne auf der Abschlussseite (Entscheidung 29.10.2026)', () => {
  const mit = (e: Partial<AppZustand['einstellungen'][number]>) => {
    const z = voll();
    return { ...z, einstellungen: [{ ...z.einstellungen[0]!, ...e }] };
  };

  it('fragt alle unbewerteten Übungen, ohne Max-Test und Zirkel (Entscheidung 30.10.2026)', () => {
    const einheit = fertig(JETZT, ['kh_curls', 'hammer_curls', 'kh_seitheben', 'kh_bankdruecken'],
      { maxTest: ['kh_bankdruecken'], zirkel: ['plank'] });
    expect(sternFragen(voll(), einheit, JETZT)).toEqual(['kh_curls', 'hammer_curls', 'kh_seitheben']);
    expect(sternFragen(voll(), fertig(JETZT, ['kh_bankdruecken'], { maxTest: ['kh_bankdruecken'], zirkel: ['plank'] }), JETZT)).toEqual([]);
  });

  it('fragt ohne Antwort nur noch ein zweites Mal', () => {
    const einheit = fertig(JETZT, ['kh_curls']);
    const e1 = mitSternen(voll().einstellungen[0]!, ['kh_curls'], {}, JETZT);
    expect(e1.sterneGefragt).toEqual({ kh_curls: { am: JETZT, ohneAntwort: 1 } });
    expect(sternFragen(mit(e1), einheit, JETZT)).toEqual(['kh_curls']);
    const e2 = mitSternen(e1, ['kh_curls'], {}, JETZT);
    expect(sternFragen(mit(e2), einheit, plusTage(JETZT, 100))).toEqual([]);
  });

  it('fragt bewertete Übungen nach 6 Wochen wieder, höchstens 2, unbewertete zuerst', () => {
    const einheit = fertig(JETZT, ['kh_curls', 'hammer_curls', 'kh_seitheben']);
    const e = mitSternen(voll().einstellungen[0]!, [], { kh_curls: 4, hammer_curls: 2 }, plusTage(JETZT, -41));
    expect(sternFragen(mit(e), einheit, JETZT)).toEqual(['kh_seitheben']);
    const alt = mitSternen(e, [], { hammer_curls: 2 }, plusTage(JETZT, -40));
    // Nach 42 Tagen: kh_curls ist fällig, hammer_curls (später bewertet) noch nicht.
    expect(sternFragen(mit(alt), einheit, plusTage(JETZT, 1))).toEqual(['kh_seitheben', 'kh_curls']);
    // Bewertungen ohne Zeitpunkt (aus der Zeit vor dieser Regel) gelten als fällig.
    expect(sternFragen(voll({ kh_curls: 4 }), fertig(JETZT, ['kh_curls']), JETZT)).toEqual(['kh_curls']);
    const drei = voll({ kh_curls: 4, hammer_curls: 2, kh_seitheben: 5 });
    expect(sternFragen(drei, einheit, JETZT)).toEqual(['kh_curls', 'hammer_curls']);
  });

  it('eine Antwort oder eine bestätigte Bewertung setzt die Frist neu, Entfernen setzt alles zurück', () => {
    const e1 = mitSternen(voll().einstellungen[0]!, ['kh_curls'], {}, JETZT);
    const e2 = mitSternen(e1, ['kh_curls'], { kh_curls: 5 }, plusTage(JETZT, 3));
    expect(e2.bewertungen).toEqual({ kh_curls: 5 });
    expect(e2.sterneGefragt).toEqual({ kh_curls: { am: plusTage(JETZT, 3), ohneAntwort: 0 } });
    const e3 = mitSternen(e2, ['kh_curls'], {}, plusTage(JETZT, 50));
    expect(e3.bewertungen).toEqual({ kh_curls: 5 });
    expect(e3.sterneGefragt).toEqual({ kh_curls: { am: plusTage(JETZT, 50), ohneAntwort: 0 } });
    const e4 = mitSternen(e3, [], { kh_curls: undefined }, plusTage(JETZT, 51));
    expect(e4.bewertungen).toBeUndefined();
    expect(e4.sterneGefragt).toBeUndefined();
  });
});

describe('Lieblinge mit Pause und eine neue Übung je Zyklus (Entscheidung 29.10.2026)', () => {
  const null10 = () => Object.fromEntries(MUSKELN.map((m) => [m, 0])) as Record<Muskel, number>;
  const zyklen = [{ nr: 1, start: plusTage(MONTAG, -77), ende: plusTage(MONTAG, -35) }, { nr: 2, start: plusTage(MONTAG, -35) }];
  const bizeps = (bewertungen: Record<string, Sterne>, haupt: string[], einheiten: Einheit[], favoriten: string[] = []) => {
    const z = voll(bewertungen, {
      zyklen, einheiten,
      muster: [{ muster: 'Bizeps', stufe: 3, hauptvarianten: haupt }],
      wochen: [{ id: '2026-W43', prognose: 3, einheiten: 0, ziele: null10(), erledigt: null10(), erholungswoche: false, laengerAngenommen: false }],
    });
    const mitFav = { ...z, einstellungen: [{ ...z.einstellungen[0]!, favoriten }] };
    return wochenabschluss(mitFav, '2026-W43').muster.find((m) => m.muster === 'Bizeps')!.hauptvarianten;
  };
  const beideZyklen = [fertig(plusTage(MONTAG, -50), ['kh_curls']), fertig(plusTage(MONTAG, -10), ['kh_curls'])];

  it('ein Liebling setzt nach 2 Zyklen am Stück einen Zyklus aus', () => {
    expect(bizeps({ kh_curls: 5 }, ['kh_curls'], beideZyklen)).toEqual(['hammer_curls']);
    // Nur im laufenden Zyklus trainiert: bleibt.
    expect(bizeps({ kh_curls: 5 }, ['kh_curls'], beideZyklen.slice(1))).toEqual(['kh_curls']);
    // Favoriten bleiben immer.
    expect(bizeps({ kh_curls: 5 }, ['kh_curls'], beideZyklen, ['kh_curls'])).toEqual(['kh_curls']);
    // Ohne Alternative mit mindestens 3 Sternen bleibt er.
    expect(bizeps({ kh_curls: 5, hammer_curls: 2, konzentrationscurl: 2 }, ['kh_curls'], beideZyklen)).toEqual(['kh_curls']);
  });

  it('nach der Pause kommt der Liebling zurück und geht der neuen Übung vor', () => {
    const pause = [fertig(plusTage(MONTAG, -50), ['kh_curls']), fertig(plusTage(MONTAG, -10), ['hammer_curls'])];
    expect(bizeps({ kh_curls: 5 }, ['hammer_curls'], pause)).toEqual(['kh_curls']);
  });

  it('nimmt beim Tausch eine noch nie trainierte Variante', () => {
    const vorher = [fertig(plusTage(MONTAG, -50), ['hammer_curls']), fertig(plusTage(MONTAG, -10), ['kh_curls'])];
    // Ohne die Regel wäre hammer_curls (Katalogreihenfolge) dran.
    expect(bizeps({}, ['kh_curls'], vorher)).toEqual(['konzentrationscurl']);
  });
});

// Spielt eine Einheit vollständig durch: Ziel bzw. Vorgabe geschafft, Feedback „passend“.
function spieleDurch(z: AppZustand, geplant: Einheit, jetzt: string): Einheit {
  let e = starte(geplant, jetzt);
  for (const s of schritte(e)) {
    const v = satzVorgabe(z, e, s);
    e = trageSatzEin(z, e, s, v.wert, jetzt, v.kalibrierung ? v.last : undefined);
    for (const stelle of offeneFeedbacks(e)) e = setzeFeedback(e, stelle, 'passend');
  }
  return e;
}

describe('Nächste Einheit nach dem Feedback', () => {
  it('zeigt die Ziele und Lasten, die das Übungsfeedback angekündigt hat', () => {
    let z = setzePrognose(zustand(), JETZT, 3);
    // Bekannte Varianten (ohne Kalibrierung), damit die Progression greift
    z = {
      ...z,
      varianten: [
        { uebungId: 'kh_bankdruecken', last: 16, zielWdh: 10, e1rm: 16 * (1 + 13 / 30), seitSteigerung: 3, schwerSerie: 0 },
        { uebungId: 'kh_schraegbank', last: 14, zielWdh: 11, e1rm: 14 * (1 + 14 / 30), seitSteigerung: 3, schwerSerie: 0 },
        { uebungId: 'klimmzug', zielWdh: 6, bestErsterSatz: 6, seitSteigerung: 3, schwerSerie: 0 },
      ],
    };
    const erste = erstelleEinheit(z, { jetzt: JETZT, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
    const gespielt = spieleDurch(z, erste, JETZT);
    const angekuendigt = new Map<string, NaechstesMal>();
    for (const p of gespielt.bloecke.flatMap((b) => b.positionen)) {
      const n = vorschauNaechstesMal(z, gespielt, p, JETZT);
      if (n && !n.neueVariante) angekuendigt.set(p.uebungId, n);
    }
    expect(angekuendigt.get('kh_bankdruecken') ?? angekuendigt.get('kh_schraegbank')).toBeDefined();
    z = schliesseEinheitAb(z, beende(gespielt, zeitpunkt(0, 19)), zeitpunkt(0, 19));

    // Zwei Einheiten später sind alle Übungen der ersten wieder dran (A und B wechseln sich ab).
    const geprueft = new Set<string>();
    for (const tag of [2, 4]) {
      const jetzt = zeitpunkt(tag, 18);
      const naechste = erstelleEinheit(z, { jetzt, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
      for (const p of naechste.bloecke.flatMap((b) => b.positionen)) {
        const n = angekuendigt.get(p.uebungId);
        if (!n || geprueft.has(p.uebungId)) continue;
        expect({ id: p.uebungId, ziel: p.zielWdh, last: p.last, band: p.bandStufe })
          .toEqual({ id: p.uebungId, ziel: n.zielWdh, last: n.last, band: n.bandStufe });
        geprueft.add(p.uebungId);
      }
      z = schliesseEinheitAb(z, beende(spieleDurch(z, naechste, jetzt), jetzt), jetzt);
    }
    expect(geprueft.has('kh_bankdruecken')).toBe(true);
    expect(geprueft.size).toBeGreaterThanOrEqual(5);
    expect(isoWoche(zeitpunkt(4, 18))).toBe(isoWoche(JETZT));
  });

  it('kündigt die Laststeigerung und den Variantenwechsel an', () => {
    const z: AppZustand = {
      ...zustand(),
      varianten: [
        { uebungId: 'kh_bankdruecken', last: 16, zielWdh: 12, e1rm: 16 * (1 + 17 / 30), seitSteigerung: 3, schwerSerie: 0 },
      ],
    };
    const einheit = (uebungId: string, wdh: number, extra = {}): Einheit => ({
      id: 'e', woche: isoWoche(JETZT), erstelltAm: JETZT, gestartetAm: JETZT, status: 'laufend', ortId: 'zuhause',
      fokus: 'ganz', format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [],
      bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{
        uebungId, saetze: 2, zielWdh: 12, ergebnisse: [{ nr: 1, wdh, zeit: JETZT, ...extra }, { nr: 2, wdh, zeit: JETZT, ...extra }],
      }] }],
    });
    const bank = einheit('kh_bankdruecken', 12, { last: 16 });
    const p = bank.bloecke[0]!.positionen[0]!;
    expect(vorschauNaechstesMal(z, bank, { ...p, last: 16, feedback: 'passend' }, JETZT)).toMatchObject({ uebungId: 'kh_bankdruecken', last: 18, neueVariante: false });
    expect(vorschauNaechstesMal(z, bank, { ...p, last: 16, feedback: 'schwer' }, JETZT)).toMatchObject({ last: 16, zielWdh: 12 });

    // Körpergewicht: erster Satz erreicht die Obergrenze, die nächste Variante folgt.
    const ohneHanteln = { ...voll({}, gespeichert(['liegestuetz', 'liegestuetz_erhoeht_haende'])), orte: [ort(['ERH'])] };
    const kg = einheit('liegestuetz', 25);
    const n = vorschauNaechstesMal(ohneHanteln, kg, { ...kg.bloecke[0]!.positionen[0]!, zielWdh: 15, feedback: 'passend' }, JETZT);
    expect(n).toMatchObject({ uebungId: 'liegestuetz_fuesse_erhoeht', neueVariante: true, kalibrierung: false });
    expect(STANDARD_EINSTELLUNGEN.bewertungen).toBeUndefined();
  });
});
