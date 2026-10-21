import { describe, expect, it } from 'vitest';
import {
  aktuellerSchritt, beende, erledigteSaetze, istKalibrierung, kalibriere, letztesMal, pauseNach, satzVorgabe,
  schritte, starte, trageSatzEin, uebungNummer,
} from './player';
import { werteUebungAus } from './progression';
import { zustand } from './testhilfe';
import type { AppZustand, Einheit, Position } from './typen';
import { uebungVon } from './verlauf';

const pos = (uebungId: string, saetze: number, extra: Partial<Position> = {}): Position =>
  ({ uebungId, saetze, zielWdh: 10, ergebnisse: [], ...extra });

function einheit(bloecke: Einheit['bloecke'], extra: Partial<Einheit> = {}): Einheit {
  return {
    id: 'e1', woche: '2026-W43', erstelltAm: '2026-10-20T18:00:00', status: 'laufend', gestartetAm: '2026-10-20T18:05:00',
    ortId: 'zuhause', fokus: 'ganz', format: 'mix', geschaetzteDauerMin: 40, aufwaermen: [], bloecke, ...extra,
  };
}

// Max-Test, Supersatz mit ungleicher Satzzahl, Einzelübung
const MIX = einheit([
  { typ: 'einzeln', pauseSek: 90, positionen: [pos('klimmzug', 1, { istMaxTest: true, zielWdh: 0 })] },
  { typ: 'supersatz', pauseSek: 75, positionen: [pos('kh_bankdruecken', 3, { last: 16 }), pos('kh_rudern_einarmig', 2, { last: 18 })] },
  { typ: 'einzeln', pauseSek: 60, positionen: [pos('kh_curls', 2, { last: 10, zielWdh: 12 })] },
]);

const mitVarianten = (z: AppZustand): AppZustand => ({
  ...z,
  varianten: ['kh_bankdruecken', 'kh_rudern_einarmig', 'kh_curls'].map((uebungId) =>
    ({ uebungId, last: 16, zielWdh: 10, seitSteigerung: 3, schwerSerie: 0 })),
});

describe('Reihenfolge der Sätze', () => {
  it('wechselt im Supersatz A1, A2 je Runde und lässt fehlende Sätze aus', () => {
    expect(schritte(MIX).map((s) => `${s.block}.${s.position}.${s.satz}`)).toEqual([
      '0.0.1', '1.0.1', '1.1.1', '1.0.2', '1.1.2', '1.0.3', '2.0.1', '2.0.2',
    ]);
  });

  it('pausiert im Supersatz nur nach dem Paar und nach dem letzten Satz gar nicht', () => {
    expect(schritte(MIX).map((_, i) => pauseNach(MIX, i))).toEqual([90, 0, 75, 0, 75, 75, 60, 0]);
  });

  it('läuft im Zirkel Runde für Runde ohne Pausen', () => {
    const zirkel = einheit([{ typ: 'zirkel', pauseSek: 0, runden: 2, zirkelId: 'z', positionen: [pos('a', 2), pos('b', 2)] }], { format: 'zirkel' });
    expect(schritte(zirkel).map((s) => `${s.position}.${s.satz}`)).toEqual(['0.1', '1.1', '0.2', '1.2']);
    expect(schritte(zirkel).map((_, i) => pauseNach(zirkel, i))).toEqual([0, 0, 0, 0]);
  });

  it('zählt die Übungen für „Übung x von y“', () => {
    const liste = schritte(MIX);
    expect(uebungNummer(MIX, liste[2]!)).toEqual({ nr: 3, von: 4 });
  });
});

describe('Fortsetzen nach Neustart', () => {
  it('setzt am ersten offenen Satz fort', () => {
    const z = mitVarianten(zustand());
    let e = MIX;
    expect(aktuellerSchritt(e)).toBe(0);
    for (const [i, wert] of [[0, 7], [1, 10], [2, 10]] as const) e = trageSatzEin(z, e, schritte(e)[i]!, wert, '2026-10-20T18:10:00');
    // gespeichert und neu geladen: Der Stand ergibt sich nur aus den Ergebnissen
    const geladen = JSON.parse(JSON.stringify(e)) as Einheit;
    expect(aktuellerSchritt(geladen)).toBe(3);
    expect(erledigteSaetze(geladen)).toBe(3);
    expect(schritte(geladen)[3]).toEqual({ block: 1, position: 0, satz: 2 });
  });

  it('meldet das Ende, wenn alle Sätze erledigt sind', () => {
    const z = mitVarianten(zustand());
    let e = MIX;
    for (const s of schritte(MIX)) e = trageSatzEin(z, e, s, 10, '2026-10-20T18:30:00');
    expect(aktuellerSchritt(e)).toBe(schritte(e).length);
    expect(beende(e, '2026-10-20T18:45:00')).toMatchObject({ status: 'abgeschlossen', beendetAm: '2026-10-20T18:45:00' });
  });

  it('beendet vorzeitig als abgebrochen und behält die erledigten Sätze', () => {
    const z = mitVarianten(zustand());
    const e = trageSatzEin(z, MIX, schritte(MIX)[0]!, 7, '2026-10-20T18:10:00');
    const fertig = beende(e, '2026-10-20T18:20:00');
    expect(fertig.status).toBe('abgebrochen');
    expect(erledigteSaetze(fertig)).toBe(1);
  });

  it('startet nach dem Aufwärmen und behält den ersten Startzeitpunkt', () => {
    const geplant = einheit([], { status: 'geplant', gestartetAm: undefined });
    const gestartet = starte(geplant, '2026-10-20T18:06:00');
    expect(gestartet).toMatchObject({ status: 'laufend', gestartetAm: '2026-10-20T18:06:00' });
    expect(starte(gestartet, '2026-10-20T19:00:00').gestartetAm).toBe('2026-10-20T18:06:00');
  });
});

describe('Ziel und Vorgabe', () => {
  const z = mitVarianten(zustand());
  const liste = schritte(MIX);

  it('zeigt im ersten Satz das Ziel mit Bereich, danach die Vorgabe aus dem vorherigen Satz', () => {
    expect(satzVorgabe(z, MIX, liste[1]!)).toMatchObject({ art: 'ziel', wert: 10, bereich: { von: 8, bis: 12 }, last: 16 });
    const e = trageSatzEin(z, MIX, liste[1]!, 9, '2026-10-20T18:10:00');
    expect(satzVorgabe(z, e, liste[3]!)).toMatchObject({ art: 'vorgabe', wert: 9 });
  });

  it('zeigt beim Max-Test kein Ziel', () => {
    expect(satzVorgabe(z, MIX, liste[0]!)).toMatchObject({ art: 'maxTest', wert: 0 });
  });

  it('nennt die Reserve laut Einstellung und beim letzten Isolationssatz 0 bis 1', () => {
    expect(satzVorgabe(z, MIX, liste[1]!).reserve).toBe('Aufhören, wenn noch 1 bis 3 Wiederholungen gingen.');
    const schonend = { ...z, einstellungen: [{ ...z.einstellungen[0]!, zielReserve: '2-3' as const }] };
    expect(satzVorgabe(schonend, MIX, liste[1]!).reserve).toContain('2 bis 3');
    expect(satzVorgabe(z, MIX, liste[6]!).reserve).not.toContain('0 bis 1');
    expect(satzVorgabe(z, MIX, liste[7]!).reserve).toContain('Im letzten Satz genügen 0 bis 1.');
  });

  it('speichert Halteübungen in Sekunden', () => {
    const zv = zustand({ katalog: 'voll' });
    const e = einheit([{ typ: 'einzeln', pauseSek: 60, positionen: [pos('plank', 2, { zielWdh: 30 })] }]);
    const s = schritte(e)[0]!;
    expect(satzVorgabe(zv, e, s)).toMatchObject({ inSek: true, wert: 30 });
    expect(trageSatzEin(zv, e, s, 35, '2026-10-20T18:10:00').bloecke[0]!.positionen[0]!.ergebnisse[0]).toMatchObject({ nr: 1, sek: 35 });
  });
});

describe('Kalibrierungssatz', () => {
  const z = zustand();                 // keine Varianten: alles wird zum ersten Mal genutzt
  const e = einheit([{ typ: 'einzeln', pauseSek: 90, positionen: [pos('kh_bankdruecken', 3, { last: 2, zielWdh: 8 })] }]);
  const [s1, s2] = schritte(e);

  it('gilt nur für den ersten Satz einer Last-Variante ohne bisherige Last', () => {
    expect(istKalibrierung(z, e, s1!)).toBe(true);
    expect(istKalibrierung(z, e, s2!)).toBe(false);
    expect(istKalibrierung(mitVarianten(z), e, s1!)).toBe(false);
    expect(satzVorgabe(z, e, s1!)).toMatchObject({ kalibrierung: true, wert: 8 });
  });

  it('legt nach dem ersten Satz Last und Ziel der restlichen Sätze fest', () => {
    // 12 kg × 10 mit Reserve 3: Schätzung 17,2 kg; bei 14 kg gehen mit Reserve 1 noch 5, bei 12 kg 12
    const u = uebungVon(z, 'kh_bankdruecken')!;
    expect(kalibriere(z, 'zuhause', u, 12, 10)).toEqual({ last: 12, zielWdh: 12 });
    // 10 kg × 15: Schätzung 16 kg; 12 kg erlaubt 9 Wdh.
    expect(kalibriere(z, 'zuhause', u, 10, 15)).toEqual({ last: 12, zielWdh: 9 });
    const nach = trageSatzEin(z, e, s1!, 15, '2026-10-20T18:10:00', 10);
    const p = nach.bloecke[0]!.positionen[0]!;
    expect(p).toMatchObject({ last: 12, zielWdh: 9 });
    expect(p.ergebnisse[0]).toMatchObject({ wdh: 15, last: 10 });
    expect(satzVorgabe(z, nach, s2!)).toMatchObject({ art: 'ziel', wert: 9, last: 12, kalibrierung: false });
    const weiter = trageSatzEin(z, nach, s2!, 8, '2026-10-20T18:12:00');
    expect(satzVorgabe(z, weiter, schritte(weiter)[2]!)).toMatchObject({ art: 'vorgabe', wert: 8 });
  });

  it('wertet die Progression ab dem ersten Satz nach der Kalibrierung aus', () => {
    let nach = trageSatzEin(z, e, s1!, 15, '2026-10-20T18:10:00', 10);
    const jetzt = '2026-10-20T18:20:00';
    const nurKalibrierung = werteUebungAus(z, nach.bloecke[0]!.positionen[0]!, jetzt, 'zuhause').variante;
    expect(nurKalibrierung).toMatchObject({ last: 12, zielWdh: 9 });
    nach = trageSatzEin(z, nach, s2!, 10, jetzt);
    nach = trageSatzEin(z, nach, schritte(nach)[2]!, 9, jetzt);
    const { variante } = werteUebungAus(z, nach.bloecke[0]!.positionen[0]!, jetzt, 'zuhause');
    // erster Satz nach der Kalibrierung: 12 kg × 10 bei Ziel 9 → passend, Ziel +1
    expect(variante).toMatchObject({ last: 12, zielWdh: 10, bestErsterSatz: 10 });
  });
});

describe('Letztes Mal', () => {
  it('liest die letzte abgeschlossene Position derselben Übung', () => {
    const z = mitVarianten(zustand());
    let alt = einheit([{ typ: 'einzeln', pauseSek: 90, positionen: [pos('kh_bankdruecken', 3, { last: 16 })] }], { id: 'alt' });
    for (const [s, w] of schritte(alt).map((s, i) => [s, [9, 9, 8][i]!] as const)) alt = trageSatzEin(z, alt, s, w, '2026-10-19T18:10:00');
    const mitAlt = { ...z, einheiten: [{ ...alt, status: 'abgeschlossen' as const }, MIX] };
    expect(letztesMal(mitAlt, 'kh_bankdruecken', MIX.id)).toEqual({ last: 16, bandStufe: undefined, werte: [9, 9, 8], inSek: false });
    expect(letztesMal(mitAlt, 'kh_curls', MIX.id)).toBeUndefined();
  });
});
