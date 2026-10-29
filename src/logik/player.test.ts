import { describe, expect, it } from 'vitest';
import {
  aktuellerBlock, aktuellerSchritt, balkenAbschnitte, beende, blockwechselNach, erledigteSaetze, feedbackVorschlag, fortschrittshinweis, istKalibrierung, kalibriere, letztesMal, offeneFeedbacks, pauseNach,
  korrigiereSatz, lastWaehlbar, messSatz, satzVorgabe, schritte, setzeFeedback, starte, trageSatzEin,
} from './player';
import { bereichFuer } from './planung';
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

  it('Kombi-Runde mit 3 Übungen: je ein Satz jeder Übung, Pause nach der Runde', () => {
    const kombi = einheit([{ typ: 'supersatz', pauseSek: 75, positionen: [
      pos('kh_bankdruecken', 2, { last: 16 }), pos('kh_rudern_einarmig', 2, { last: 18 }), pos('haengendes_knieheben', 1),
    ] }]);
    expect(schritte(kombi).map((s) => `${s.position}.${s.satz}`)).toEqual(['0.1', '1.1', '2.1', '0.2', '1.2']);
    expect(schritte(kombi).map((_, i) => pauseNach(kombi, i))).toEqual([0, 0, 75, 0, 0]);
    let e = kombi;
    const z = zustand();
    for (const s of schritte(kombi).slice(0, 3)) e = trageSatzEin(z, e, s, 10, '2026-10-20T18:10:00');
    expect(offeneFeedbacks(e)).toEqual([{ block: 0, position: 2 }]);   // Knieheben ist fertig
    for (const s of schritte(kombi).slice(3)) e = trageSatzEin(z, e, s, 10, '2026-10-20T18:12:00');
    expect(offeneFeedbacks(e)).toHaveLength(3);
  });

  it('läuft im Zirkel Runde für Runde ohne Pausen', () => {
    const zirkel = einheit([{ typ: 'zirkel', pauseSek: 0, runden: 2, zirkelId: 'z', positionen: [pos('a', 2), pos('b', 2)] }], { format: 'zirkel' });
    expect(schritte(zirkel).map((s) => `${s.position}.${s.satz}`)).toEqual(['0.1', '1.1', '0.2', '1.2']);
    expect(schritte(zirkel).map((_, i) => pauseNach(zirkel, i))).toEqual([0, 0, 0, 0]);
  });
});

describe('Fortschrittsbalken und Blockwechsel (Entscheidungen 29.10.2026)', () => {
  it('zeigt nur den aktuellen Block: Kombi je Runde, einzelne Übungen je Übung', () => {
    const z = zustand();
    const e = trageSatzEin(z, trageSatzEin(z, MIX, schritte(MIX)[0]!, 8, '2026-10-20T18:10:00'), schritte(MIX)[1]!, 10, '2026-10-20T18:12:00');
    expect(aktuellerBlock(e)).toBe(1);
    expect(balkenAbschnitte(e)).toEqual([['erledigt', 'aktuell'], ['offen', 'offen'], ['offen']]);
    expect(balkenAbschnitte(e, 0)).toEqual([['erledigt']]);
    expect(balkenAbschnitte(e, 2)).toEqual([['offen', 'offen']]);
  });

  it('bleibt nach dem letzten Satz beim letzten Block', () => {
    const z = mitVarianten(zustand());
    const e = schritte(MIX).reduce((x, s) => trageSatzEin(z, x, s, 10, '2026-10-20T18:10:00'), MIX);
    expect(aktuellerBlock(e)).toBe(2);
    expect(balkenAbschnitte(e)).toEqual([['erledigt', 'erledigt']]);
  });

  it('teilt den Zirkel je Runde ab', () => {
    const zirkel = einheit([{ typ: 'zirkel', pauseSek: 0, runden: 2, zirkelId: 'z', positionen: [pos('a', 2), pos('b', 2)] }], { format: 'zirkel' });
    expect(balkenAbschnitte(zirkel)).toEqual([['aktuell', 'offen'], ['offen', 'offen']]);
  });

  it('erkennt den Wechsel zum nächsten Block, nicht im Zirkel und nicht nach dem letzten Satz', () => {
    expect(schritte(MIX).map((_, i) => blockwechselNach(MIX, i))).toEqual([true, false, false, false, false, true, false, false]);
    const zirkel = einheit([
      { typ: 'zirkel', pauseSek: 0, runden: 1, zirkelId: 'z', positionen: [pos('a', 1)] },
      { typ: 'zirkel', pauseSek: 0, runden: 1, zirkelId: 'y', positionen: [pos('b', 1)] },
    ], { format: 'zirkel' });
    expect(blockwechselNach(zirkel, 0)).toBe(false);
  });
});

describe('Gewicht in jedem Satz (Entscheidung 21.10.2026)', () => {
  const z = mitVarianten(zustand());
  const e = einheit([{ typ: 'einzeln', pauseSek: 90, positionen: [pos('kh_bankdruecken', 3, { last: 16 })] }]);
  const [s1, s2, s3] = schritte(e);
  const jetzt = '2026-10-20T18:20:00';

  it('ist bei Last-Übungen wählbar, nicht im Max-Test oder Zirkel', () => {
    expect(lastWaehlbar(z, e, s1!)).toBe(true);
    expect(lastWaehlbar(z, MIX, schritte(MIX)[0]!)).toBe(false);
    const zirkel = einheit([{ typ: 'zirkel', pauseSek: 0, runden: 1, zirkelId: 'z', positionen: [pos('kh_curls', 1, { last: 8 })] }], { format: 'zirkel' });
    expect(lastWaehlbar(z, zirkel, schritte(zirkel)[0]!)).toBe(false);
  });

  it('speichert das gewählte Gewicht und übernimmt es für die folgenden Sätze', () => {
    let x = trageSatzEin(z, e, s1!, 10, jetzt);
    expect(x.bloecke[0]!.positionen[0]!.ergebnisse[0]).toMatchObject({ last: 16 });
    x = trageSatzEin(z, x, s2!, 9, jetzt, 14);
    expect(x.bloecke[0]!.positionen[0]!.ergebnisse[1]).toMatchObject({ last: 14 });
    expect(satzVorgabe(z, x, s3!)).toMatchObject({ last: 14 });
    expect(x.bloecke[0]!.positionen[0]!.last).toBe(16);           // geplante Last bleibt
  });

  it('rechnet nach einem anderen Gewicht im ersten Satz das Ziel wie nach der Kalibrierung', () => {
    let x = trageSatzEin(z, e, s1!, 12, jetzt, 14);
    x = trageSatzEin(z, x, s2!, 11, jetzt);
    x = trageSatzEin(z, x, s3!, 10, jetzt);
    const { variante } = werteUebungAus(z, x.bloecke[0]!.positionen[0]!, jetzt, 'zuhause');
    // 14 kg × 12, passend (Reserve 2): Schätzung 20,5 kg; bei 14 kg gehen mit Reserve 1 noch 13
    const { bis } = bereichFuer(z.einstellungen[0]!, uebungVon(z, 'kh_bankdruecken')!);
    expect(variante).toMatchObject({ last: 14, zielWdh: Math.min(bis, 13) });
  });

  it('ändert die Progression nicht, wenn erst ein späterer Satz leichter war', () => {
    const ohne = schritte(e).reduce((x, s) => trageSatzEin(z, x, s, 10, jetzt), e);
    let mit = trageSatzEin(z, e, s1!, 10, jetzt);
    mit = trageSatzEin(z, mit, s2!, 10, jetzt, 14);
    mit = trageSatzEin(z, mit, s3!, 10, jetzt);
    const a = werteUebungAus(z, ohne.bloecke[0]!.positionen[0]!, jetzt, 'zuhause').variante;
    const b = werteUebungAus(z, mit.bloecke[0]!.positionen[0]!, jetzt, 'zuhause').variante;
    expect(b.last).toBe(16);
    expect(b.zielWdh).toBe(a.zielWdh);
  });

  it('korrigiert die Wiederholungen eines erledigten Satzes', () => {
    const x = schritte(e).reduce((y, s) => trageSatzEin(z, y, s, 10, jetzt), e);
    const k = korrigiereSatz(z, x, { block: 0, position: 0 }, 2, 7);
    expect(k.bloecke[0]!.positionen[0]!.ergebnisse.map((r) => r.wdh)).toEqual([10, 7, 10]);
    expect(x.bloecke[0]!.positionen[0]!.ergebnisse[1]!.wdh).toBe(10);
    expect(korrigiereSatz(z, x, { block: 0, position: 0 }, 9, 7)).toBe(x);
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

  it('zeigt in jedem Satz das Ziel mit Bereich, ohne Zähler (Entscheidung 29.10.2026)', () => {
    expect(satzVorgabe(z, MIX, liste[1]!)).toMatchObject({ art: 'ziel', wert: 10, bereich: { von: 8, bis: 12 }, last: 16, zaehlen: false });
    const e = trageSatzEin(z, MIX, liste[1]!, 9, '2026-10-20T18:10:00');
    expect(satzVorgabe(z, e, liste[3]!)).toMatchObject({ art: 'ziel', wert: 10, zaehlen: false });
  });

  it('zeigt beim Max-Test kein Ziel und zählt', () => {
    expect(satzVorgabe(z, MIX, liste[0]!)).toMatchObject({ art: 'maxTest', wert: 0, zaehlen: true });
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
    expect(satzVorgabe(z, e, s1!)).toMatchObject({ kalibrierung: true, wert: 8, zaehlen: true });
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
    expect(satzVorgabe(z, nach, s2!)).toMatchObject({ art: 'ziel', wert: 9, last: 12, kalibrierung: false, zaehlen: false });
    const weiter = trageSatzEin(z, nach, s2!, 9, '2026-10-20T18:12:00');
    expect(satzVorgabe(z, weiter, schritte(weiter)[2]!)).toMatchObject({ art: 'ziel', wert: 9, zaehlen: false });
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

describe('Übungsfeedback', () => {
  const erledige = (z: AppZustand, e: Einheit, bis: number) => schritte(e).slice(0, bis)
    .reduce((x, s) => trageSatzEin(z, x, s, 10, '2026-10-20T18:10:00'), e);

  it('zählt eine Übung, wenn alle ihre Sätze erledigt sind; nie den Max-Test', () => {
    const z = mitVarianten(zustand());
    expect(offeneFeedbacks(erledige(z, MIX, 1))).toEqual([]);
    // Supersatz: Rudern ist nach Runde 2 fertig, auch wenn das Paar noch läuft (für das Beenden vor dem Ende).
    expect(offeneFeedbacks(erledige(z, MIX, 4))).toEqual([]);
    expect(offeneFeedbacks(erledige(z, MIX, 5))).toEqual([{ block: 1, position: 1 }]);
    expect(offeneFeedbacks(erledige(z, MIX, 6))).toEqual([{ block: 1, position: 0 }, { block: 1, position: 1 }]);
    expect(offeneFeedbacks(erledige(z, MIX, 8))).toEqual([{ block: 1, position: 0 }, { block: 1, position: 1 }, { block: 2, position: 0 }]);
  });

  it('speichert das Feedback in der Position; danach ist es erledigt', () => {
    const z = mitVarianten(zustand());
    let e = erledige(z, MIX, 6);
    e = setzeFeedback(e, { block: 1, position: 0 }, 'leicht');
    expect(e.bloecke[1]!.positionen[0]!.feedback).toBe('leicht');
    expect(MIX.bloecke[1]!.positionen[0]!.feedback).toBeUndefined();
    expect(offeneFeedbacks(e)).toEqual([{ block: 1, position: 1 }]);
  });

  it('schlägt „zu schwer“ vor, wenn der erste Satz das Ziel verfehlt; nach der Kalibrierung zählt Satz 2', () => {
    const z = mitVarianten(zustand());
    const s = { block: 2, position: 0 };
    const mit = (wdh: number[]) => wdh.reduce((e, w, i) => trageSatzEin(z, e, { ...s, satz: i + 1 }, w, '2026-10-20T18:10:00'), MIX);
    expect(feedbackVorschlag(z, mit([12, 9]), s)).toBe('passend');
    expect(feedbackVorschlag(z, mit([11, 12]), s)).toBe('schwer');
    // Neue Last-Variante: Satz 1 kalibriert, Satz 2 misst am berechneten Ziel.
    const neu = zustand();
    const curls = einheit([{ typ: 'einzeln', pauseSek: 60, positionen: [pos('kh_curls', 3, { last: 2, zielWdh: 10 })] }]);
    let e = trageSatzEin(neu, curls, { block: 0, position: 0, satz: 1 }, 10, '2026-10-20T18:10:00', 8);
    const ziel = e.bloecke[0]!.positionen[0]!.zielWdh;
    e = trageSatzEin(neu, e, { block: 0, position: 0, satz: 2 }, ziel, '2026-10-20T18:12:00');
    expect(feedbackVorschlag(neu, e, { block: 0, position: 0 })).toBe('passend');
    e = trageSatzEin(neu, curls, { block: 0, position: 0, satz: 1 }, 10, '2026-10-20T18:10:00', 8);
    e = trageSatzEin(neu, e, { block: 0, position: 0, satz: 2 }, ziel - 1, '2026-10-20T18:12:00');
    expect(feedbackVorschlag(neu, e, { block: 0, position: 0 })).toBe('schwer');
    expect(messSatz(neu, e, { block: 0, position: 0 })).toBe(2);
    expect(messSatz(neu, curls, { block: 0, position: 0 })).toBe(1);
  });

  it('fragt im Zirkel nicht', () => {
    const z = zustand();
    const zirkel = einheit([{ typ: 'zirkel', pauseSek: 0, runden: 1, zirkelId: 'z', positionen: [pos('kh_curls', 1)] }], { format: 'zirkel' });
    expect(offeneFeedbacks(erledige(z, zirkel, 1))).toEqual([]);
  });
});

describe('Fortschritt im Training', () => {
  const frueher = (id: string, wdh: number[], last: number | undefined, tag: string): Einheit => einheit(
    [{ typ: 'einzeln', pauseSek: 90, positionen: [pos(id, wdh.length, {
      ...(last !== undefined ? { last } : {}), ergebnisse: wdh.map((w, i) => ({ nr: i + 1, wdh: w, ...(last !== undefined ? { last } : {}), zeit: tag })),
    })] }],
    { id: `alt-${tag}`, status: 'abgeschlossen', gestartetAm: tag, beendetAm: tag },
  );

  it('zeigt im ersten Satz letztes Mal, Ziel heute und ab wann mehr Gewicht kommt', () => {
    const z = { ...mitVarianten(zustand()), einheiten: [
      frueher('kh_bankdruecken', [9, 8, 8], 16, '2026-10-16T18:00:00'), frueher('kh_bankdruecken', [10, 9, 8], 16, '2026-10-18T18:00:00'),
    ] };
    const e = einheit([{ typ: 'einzeln', pauseSek: 90, positionen: [pos('kh_bankdruecken', 3, { last: 16, zielWdh: 11 })] }]);
    const h = fortschrittshinweis(z, e, { block: 0, position: 0, satz: 1 }, '2026-10-20T18:10:00')!;
    expect(h).toMatchObject({ letztesMal: 10, heute: 11, ab: 12, schritt: 'gewicht', inSek: false });
    expect(h.verlauf).toHaveLength(2);
    expect(h.verlauf[1]!).toBeGreaterThan(h.verlauf[0]!);
    // Ab dem zweiten Satz kein Hinweis
    expect(fortschrittshinweis(z, e, { block: 0, position: 0, satz: 2 }, '2026-10-20T18:10:00')).toBeUndefined();
  });

  it('nennt bei Körpergewicht die nächste Variante', () => {
    const z = zustand({ katalog: 'voll' });
    const e = einheit([{ typ: 'einzeln', pauseSek: 90, positionen: [pos('liegestuetz', 3, { zielWdh: 12 })] }]);
    const h = fortschrittshinweis(z, e, { block: 0, position: 0, satz: 1 }, '2026-10-20T18:10:00')!;
    expect(h).toMatchObject({ heute: 12, ab: 15, schritt: 'variante', naechste: 'Liegestütz, Füße erhöht' });
    expect(h.letztesMal).toBeUndefined();
  });

  it('kein Hinweis beim Kalibrierungssatz und beim Max-Test', () => {
    const z = zustand();
    const e = einheit([{ typ: 'einzeln', pauseSek: 90, positionen: [pos('kh_bankdruecken', 3, { last: 2 }), pos('klimmzug', 1, { istMaxTest: true })] }]);
    expect(fortschrittshinweis(z, e, { block: 0, position: 0, satz: 1 }, '2026-10-20T18:10:00')).toBeUndefined();
    expect(fortschrittshinweis(z, e, { block: 0, position: 1, satz: 1 }, '2026-10-20T18:10:00')).toBeUndefined();
  });
});
