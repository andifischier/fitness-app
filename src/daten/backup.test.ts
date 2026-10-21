import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import type { Muskel, Tabellen } from '../logik/typen';
import { backupDateiname, exportiere, importiere, MELDUNG, merkeBackup, pruefeBackup } from './backup';
import { ersetzeTabellen, FitnessDb, leseTabellen } from './db';

let nr = 0;
const offen: FitnessDb[] = [];
function neueDb(): FitnessDb {
  const d = new FitnessDb(`test-${++nr}`);
  offen.push(d);
  return d;
}
afterEach(async () => {
  for (const d of offen.splice(0)) await d.delete();
});

const jeMuskel = (wert: number) =>
  Object.fromEntries(
    ['Brust', 'Ruecken', 'Schultern', 'Bizeps', 'Trizeps', 'Quadrizeps', 'Gesaess', 'HintereOS', 'Bauch', 'Waden']
      .map((m) => [m, wert]),
  ) as Record<Muskel, number>;

// Beispieldaten für alle 12 Tabellen, mit optionalen Feldern und Dezimalzahlen.
function beispielDaten(): Tabellen {
  return {
    einstellungen: [{ ...STANDARD_EINSTELLUNGEN, favoriten: ['klimmzug'], onboardingAbgeschlossen: true,
      einschraenkungen: [{ id: 'e1', typ: 'region', wert: 'Schulter', bis: '2026-11-30' }],
      workouts: [{ id: 'workout_kurz', name: 'Kurz', art: 'zirkel', runden: 3,
        uebungen: [{ uebungId: 'burpees', saetze: 3, vorgabe: 12 }, { uebungId: 'plank', saetze: 2, vorgabe: 40 }] }] }],
    orte: [
      { id: 'zuhause', name: 'Zuhause', standard: true, equipment: [
        { utensilId: 'KH', kurzhanteln: { modus: 'verstellbar', minKg: 2.5, maxKg: 24, schrittKg: 2.5 } },
        { utensilId: 'BAND', bandStufen: ['leicht', 'schwer'] },
        { utensilId: 'LH', langhantel: { stangeKg: 10, scheiben: [{ kg: 5, paare: 2 }, { kg: 1.25, paare: 1 }] } },
        { utensilId: 'SCHRAEG' },
      ] },
      { id: 'park', name: 'Park', standard: false, equipment: [
        { utensilId: 'KH', kurzhanteln: { modus: 'paare', gewichteKg: [8, 12, 16] } },
        { utensilId: 'KB', gewichteKg: [12, 16] },
      ] },
    ],
    eigeneUebungen: [{ id: 'eigen_1', name: 'Eigene Übung', muster: 'hZug', primaer: ['Ruecken'], sekundaer: [],
      stufe: 4, equipment: [['eigen_seil']], lasttyp: 'KG', bereich: { von: 8, bis: 15, einheit: 'Wdh.' },
      unterstuetzend: false, zirkelGeeignet: false, youtubeUrl: 'https://www.youtube.com/results?search_query=x',
      eigenerVideoLink: 'https://youtu.be/abc', herkunft: 'eigene' }],
    eigeneUtensilien: [{ id: 'eigen_seil', name: 'Seil am Baum', details: 'keine', immerVorhanden: false, eigenes: true }],
    varianten: [
      { uebungId: 'kh_bankdruecken', last: 16, zielWdh: 10, e1rm: 21.87, seitSteigerung: 1, schwerSerie: 0, zuletzt: '2026-10-19T18:00:00' },
      { uebungId: 'klimmzug_band', bandStufe: 'mittel', zielWdh: 8, bestErsterSatz: 9, seitSteigerung: 0, schwerSerie: 1 },
    ],
    muster: [{ muster: 'hDruck', stufe: 5, hauptvarianten: ['kh_bankdruecken', 'kh_schraegbank'] }],
    muskeln: [{ muskel: 'Brust', letzteBelastung: '2026-10-19T18:40:00', letzteDosis: 4.5, letzteSchwer: false,
      persoenlicheGrenze: 12, gleichWochen: 1, leistung: [{ woche: '2026-W42', wert: 0.012 }] }],
    wochen: [{ id: '2026-W43', prognose: 3, einheiten: 1, ziele: jeMuskel(12), erledigt: jeMuskel(4.5),
      erholungswoche: false, laengerAngenommen: false }],
    zyklen: [{ nr: 1, start: '2026-10-19', ende: '2026-11-30', grund: 'zeitablauf' }, { nr: 2, start: '2026-11-30' }],
    einheiten: [
      { id: 'u2', woche: '2026-W43', erstelltAm: '2026-10-21T17:00:00', status: 'geplant', ortId: 'park',
        fokus: 'oben', format: 'zirkel', geschaetzteDauerMin: 15, aufwaermen: [], name: 'Kurz',
        bloecke: [{ typ: 'zirkel', positionen: [], pauseSek: 0, zirkelId: 'workout_kurz', runden: 3 }] },
      { id: 'u1', woche: '2026-W43', erstelltAm: '2026-10-19T17:55:00', gestartetAm: '2026-10-19T18:00:00',
        beendetAm: '2026-10-19T18:42:00', status: 'abgeschlossen', ortId: 'zuhause', fokus: 'ganz', format: 'mix',
        geschaetzteDauerMin: 44, aufwaermen: [{ uebungId: 'kh_bankdruecken', vorgabe: '8 Wdh. mit 8 kg' }],
        bloecke: [{ typ: 'supersatz', pauseSek: 75, positionen: [
          { uebungId: 'kh_bankdruecken', saetze: 3, zielWdh: 10, last: 16, feedback: 'passend',
            ergebnisse: [{ nr: 1, wdh: 10, last: 16, zeit: '2026-10-19T18:06:00' }] },
          { uebungId: 'klimmzug_band', saetze: 3, zielWdh: 8, bandStufe: 'mittel', istErsatz: true, getauschtVon: 'klimmzug',
            ergebnisse: [{ nr: 1, wdh: 8, bandStufe: 'mittel', zeit: '2026-10-19T18:07:00' }] },
        ] }], gesamtbewertung: 3, notiz: 'Gut' },
    ],
    zirkelErgebnisse: [{ zirkelId: 'sprint', ortId: 'zuhause', datum: '2026-10-12T18:00:00', zeitSek: 612.5, varianten: ['burpees'] }],
    maxTests: [{ id: 't1', datum: '2026-10-12T18:10:00', muster: 'Rumpf', uebungId: 'plank', ergebnis: 75, einheit: 'Sek.' }],
  };
}

const alsDatei = (inhalt: unknown) =>
  new Blob([typeof inhalt === 'string' ? inhalt : JSON.stringify(inhalt)], { type: 'application/json' });

async function gueltigesBackup(): Promise<Record<string, unknown>> {
  const d = neueDb();
  await ersetzeTabellen(beispielDaten(), d);
  return JSON.parse(await (await exportiere('2026-10-20T19:00:00', d)).text());
}

describe('Backup', () => {
  it('merkt sich das Backup beim Teilen erst nach Erfolg', async () => {
    const d = neueDb();
    await ersetzeTabellen(beispielDaten(), d);
    const vorher = (await leseTabellen(d)).einstellungen[0]!.letztesBackup;
    await exportiere('2026-10-21T19:00:00', d, false);
    expect((await leseTabellen(d)).einstellungen[0]!.letztesBackup).toBe(vorher);
    await merkeBackup('2026-10-21T19:01:00', d);
    expect((await leseTabellen(d)).einstellungen[0]!.letztesBackup).toBe('2026-10-21T19:01:00');
  });

  it('Export und anschließender Import ergeben identische Daten', async () => {
    const quelle = neueDb();
    await ersetzeTabellen(beispielDaten(), quelle);
    const datei = await exportiere('2026-10-20T19:00:00', quelle);

    const ziel = neueDb();
    await ersetzeTabellen({ ...beispielDaten(), orte: [], maxTests: [] }, ziel); // vorhandene Daten werden ersetzt
    expect(await importiere(datei, ziel)).toEqual({ ok: true });

    const vorher = await leseTabellen(quelle);
    const nachher = await leseTabellen(ziel);
    expect(nachher).toEqual(vorher);
    expect(nachher.einstellungen[0]?.letztesBackup).toBe('2026-10-20T19:00:00');

    // Zweiter Export aus dem Ziel ist inhaltlich gleich dem ersten.
    const erneut = await exportiere('2026-10-20T19:00:00', ziel);
    expect(JSON.parse(await erneut.text())).toEqual(JSON.parse(await datei.text()));
  });

  it('enthält alle Tabellen im festgelegten Format', async () => {
    const backup = await gueltigesBackup();
    expect(backup).toMatchObject({ format: 'fitness-app-backup', schemaVersion: 1, exportiertAm: '2026-10-20T19:00:00' });
    expect(Object.keys(backup.daten as object).sort()).toEqual(Object.keys(beispielDaten()).sort());
  });

  it('fasst Anzahl und Zeitraum der Einheiten zusammen', async () => {
    const ergebnis = await pruefeBackup(alsDatei(await gueltigesBackup()));
    expect(ergebnis.ok && ergebnis.zusammenfassung).toEqual({
      exportiertAm: '2026-10-20T19:00:00', einheiten: 2, von: '2026-10-19T17:55:00', bis: '2026-10-21T17:00:00',
    });
  });

  it('übersteht eine leere Datenbank', async () => {
    const quelle = neueDb();
    const ziel = neueDb();
    expect(await importiere(await exportiere('2026-10-20T19:00:00', quelle), ziel)).toEqual({ ok: true });
    expect(await leseTabellen(ziel)).toEqual(await leseTabellen(quelle));
  });

  it('benennt die Datei nach dem Datum', () => {
    expect(backupDateiname('2026-10-20T19:00:00')).toBe('fitness-backup-2026-10-20.json');
  });

  describe('lehnt beschädigte Dateien ab und lässt die Daten unverändert', () => {
    const faelle: [string, () => Promise<Blob>, string][] = [
      ['kein JSON', async () => alsDatei('{"format": "fitness-app-backup", '), MELDUNG.unlesbar],
      ['leere Datei', async () => alsDatei(''), MELDUNG.unlesbar],
      ['fremdes Format', async () => alsDatei({ format: 'anderes', daten: {} }), MELDUNG.falschesFormat],
      ['neuere Version', async () => alsDatei({ ...(await gueltigesBackup()), schemaVersion: 2 }), MELDUNG.neuereVersion],
      ['fehlende Tabelle', async () => {
        const b = await gueltigesBackup();
        delete (b.daten as Record<string, unknown>).maxTests;
        return alsDatei(b);
      }, MELDUNG.beschaedigt('Max-Tests fehlt')],
      ['fehlendes Feld', async () => {
        const b = await gueltigesBackup();
        delete (b.daten as { einheiten: Record<string, unknown>[] }).einheiten[1]!.status;
        return alsDatei(b);
      }, MELDUNG.beschaedigt('Einheiten, Eintrag 2')],
      ['falscher Typ', async () => {
        const b = await gueltigesBackup();
        (b.daten as { orte: Record<string, unknown>[] }).orte[0]!.standard = 'ja';
        return alsDatei(b);
      }, MELDUNG.beschaedigt('Orte, Eintrag 1')],
      ['unbekannter Muskel', async () => {
        const b = await gueltigesBackup();
        (b.daten as { muskeln: Record<string, unknown>[] }).muskeln[0]!.muskel = 'Nacken';
        return alsDatei(b);
      }, MELDUNG.beschaedigt('Muskeln, Eintrag 1')],
      ['doppelter Eintrag', async () => {
        const b = await gueltigesBackup();
        const tests = (b.daten as { maxTests: unknown[] }).maxTests;
        tests.push(tests[0]);
        return alsDatei(b);
      }, MELDUNG.beschaedigt('Max-Tests, Eintrag 2')],
    ];

    it.each(faelle)('%s', async (_name, datei, meldung) => {
      const d = neueDb();
      await ersetzeTabellen(beispielDaten(), d);
      const vorher = await leseTabellen(d);
      expect(await importiere(await datei(), d)).toEqual({ ok: false, fehler: meldung });
      expect(await leseTabellen(d)).toEqual(vorher);
    });
  });
});
