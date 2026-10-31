// Muskeln und Wunschdauer vor dem Start (Entscheidung 31.10.2026): Vorschlag der Muskeln, Auswahl und
// Abwahl, nicht erholte Muskeln, Wunschdauer und Sätze obendrauf, die spätere Einheiten nicht kürzen.
import { describe, expect, it } from 'vitest';
import { EINHEIT, FOKUS_GRUPPEN, MUSTER_ART } from '../konfiguration';
import { loescheEinheit } from './loeschen';
import { dosisProMuskel, erledigtFuerPlanung, erstelleEinheit, muskelVorschlag, obendraufVon, type EinheitEingabe } from './planung';
import { schliesseEinheitAb } from './progression';
import { absolviere, eingespielt, ort, setzePrognose, zeitpunkt, zustand } from './testhilfe';
import { MUSKELN, type AppZustand, type Einheit, type Muskel } from './typen';
import { uebungVon } from './verlauf';

const jetzt = zeitpunkt(2, 18);
const eingabe = (z: AppZustand, extra: Partial<EinheitEingabe> = {}): EinheitEingabe => ({
  jetzt, ortId: 'zuhause', prognose: z.wochen[0]?.prognose ?? 3, morgenWieder: false, laenger: false, ...extra,
});
const saetze = (e: Einheit) => e.bloecke.reduce((s, b) => s + b.positionen.reduce((t, p) => t + p.saetze, 0), 0);
const hauptmuskeln = (z: AppZustand, e: Einheit) =>
  new Set(e.bloecke.flatMap((b) => b.positionen).map((p) => uebungVon(z, p.uebungId)!.primaer[0]!));
const primaer = (z: AppZustand, e: Einheit) =>
  new Set(e.bloecke.flatMap((b) => b.positionen).flatMap((p) => uebungVon(z, p.uebungId)!.primaer));

// Eingespielte Woche mit Prognose 5 und zwei erledigten Ganzkörper-Einheiten: Der Bedarf heute ist klein.
function kleineWoche(): AppZustand {
  let z = setzePrognose(eingespielt(zustand({ orte: [ort()] })), zeitpunkt(0, 18), 5);
  for (const tag of [0, 1]) {
    const t = zeitpunkt(tag, 8);
    z = absolviere(z, erstelleEinheit(z, { jetzt: t, ortId: 'zuhause', prognose: 5, morgenWieder: false, laenger: false }), t);
  }
  return z;
}

describe('Muskeln vor dem Start', () => {
  it('Vorschlag: Ganzkörper alle erholten Muskeln, Fokus nur die Gruppe und Bauch', () => {
    const z = eingespielt(zustand({ orte: [ort()] }));
    expect(muskelVorschlag(z, eingabe(z)).gewaehlt).toEqual([...MUSKELN]);
    const fokus = muskelVorschlag(z, eingabe(z, { morgenWieder: true })).gewaehlt;
    const gruppe = FOKUS_GRUPPEN.oben.every((m) => fokus.includes(m)) ? FOKUS_GRUPPEN.oben : FOKUS_GRUPPEN.unten;
    expect([...fokus].sort()).toEqual([...gruppe, 'Bauch'].sort());
  });

  it('der Vorschlag als Auswahl ergibt dieselbe Einheit wie ohne Auswahl', () => {
    const z = kleineWoche();
    for (const morgenWieder of [false, true]) {
      const ohne = erstelleEinheit(z, eingabe(z, { morgenWieder }));
      const mit = erstelleEinheit(z, eingabe(z, { morgenWieder, muskeln: muskelVorschlag(z, eingabe(z, { morgenWieder })).gewaehlt }));
      expect(mit).toEqual(ohne);
    }
  });

  it('abgewählte Muskeln (z. B. Muskelkater) bekommen keine Übung, die sie als Hauptmuskel trainiert', () => {
    const z = eingespielt(zustand({ orte: [ort()] }));
    const ohneBeine = MUSKELN.filter((m) => !FOKUS_GRUPPEN.unten.includes(m));
    const e = erstelleEinheit(z, eingabe(z, { muskeln: ohneBeine }));
    for (const m of primaer(z, e)) expect(ohneBeine).toContain(m);
    expect(saetze(e)).toBeGreaterThan(0);
  });

  it('nur gewählte Muskeln bekommen eigene Übungen', () => {
    const z = eingespielt(zustand({ orte: [ort()] }));
    const wahl: Muskel[] = ['Brust', 'Trizeps'];
    const e = erstelleEinheit(z, eingabe(z, { muskeln: wahl }));
    expect([...hauptmuskeln(z, e)].every((m) => wahl.includes(m))).toBe(true);
    expect(hauptmuskeln(z, e).has('Brust')).toBe(true);
  });

  it('ein nicht erholter Muskel ist markiert und wird trainiert, wenn er gewählt ist', () => {
    let z = eingespielt(zustand({ orte: [ort()] }));
    z = { ...z, muskeln: [{ muskel: 'Brust', letzteBelastung: zeitpunkt(2, 8), letzteDosis: 8, letzteSchwer: false, persoenlicheGrenze: 12, gleichWochen: 0, leistung: [] }] };
    const v = muskelVorschlag(z, eingabe(z));
    expect(v.nichtErholt).toEqual(['Brust']);
    expect(v.gewaehlt).not.toContain('Brust');
    expect(hauptmuskeln(z, erstelleEinheit(z, eingabe(z))).has('Brust')).toBe(false);
    expect(hauptmuskeln(z, erstelleEinheit(z, eingabe(z, { muskeln: [...v.gewaehlt, 'Brust'] }))).has('Brust')).toBe(true);
  });
});

describe('Wunschdauer und Sätze obendrauf', () => {
  it('ohne Wunschdauer bleibt die Einheit kurz, mit 45 Min wird sie länger und bleibt in der Zeit', () => {
    const z = kleineWoche();
    const kurz = erstelleEinheit(z, eingabe(z));
    const lang = erstelleEinheit(z, eingabe(z, { dauerMin: 45 }));
    expect(kurz.basisDosis).toBeUndefined();
    expect(saetze(lang)).toBeGreaterThan(saetze(kurz));
    expect(lang.geschaetzteDauerMin).toBeLessThanOrEqual(45);
    expect(lang.geschaetzteDauerMin).toBeGreaterThan(kurz.geschaetzteDauerMin);
    expect(lang.basisDosis).toBeDefined();
    // Höchstens 10 Sätze je Muskel (plus Nebenbeteiligung aus Bauch und Waden) und höchstens 10 Übungen im Zeitbudget
    const dosis = dosisProMuskel(z, lang);
    for (const m of MUSKELN) expect(dosis[m]).toBeLessThanOrEqual(EINHEIT.maxSaetzeProMuskel + 3);
    const imBudget = lang.bloecke.flatMap((b) => b.positionen).filter((p) => MUSTER_ART[uebungVon(z, p.uebungId)!.muster] !== 'zusatz');
    expect(imBudget.length).toBeLessThanOrEqual(EINHEIT.maxUebungenObendrauf);
  });

  it('eine kürzere Wunschdauer kürzt die Einheit', () => {
    const z = eingespielt(zustand({ orte: [ort()] }));
    const normal = erstelleEinheit(z, eingabe(z, { prognose: 3 }));
    const kurz = erstelleEinheit(z, eingabe(z, { prognose: 3, dauerMin: 20 }));
    expect(kurz.geschaetzteDauerMin).toBeLessThanOrEqual(20);
    expect(saetze(kurz)).toBeLessThan(saetze(normal));
    expect(kurz.basisDosis).toBeUndefined();
  });

  it('neue Übungen bleiben auch mit Sätzen obendrauf bei höchstens 3 Sätzen', () => {
    const z = setzePrognose(zustand({ orte: [ort()] }), zeitpunkt(0, 18), 3);
    const lang = erstelleEinheit(z, eingabe(z, { prognose: 3, dauerMin: 60 }));
    for (const p of lang.bloecke.flatMap((b) => b.positionen)) expect(p.saetze).toBeLessThanOrEqual(EINHEIT.maxSaetzeErstesMal);
  });

  it('Sätze obendrauf zählen für die Woche, kürzen aber die nächste Einheit nicht', () => {
    const z = kleineWoche();
    const lang = erstelleEinheit(z, eingabe(z, { dauerMin: 50 }));
    const normal = erstelleEinheit(z, eingabe(z));
    const nachLang = schliesseEinheitAb(z, alleSaetze(lang), zeitpunkt(2, 19));
    const nachNormal = schliesseEinheitAb(z, alleSaetze(normal), zeitpunkt(2, 19));
    const wLang = nachLang.wochen.find((w) => w.id === lang.woche)!;
    const wNormal = nachNormal.wochen.find((w) => w.id === normal.woche)!;
    // Die Woche zählt alle Sätze …
    const summe = (r: Record<Muskel, number>) => MUSKELN.reduce((s, m) => s + r[m], 0);
    expect(summe(wLang.erledigt)).toBeGreaterThan(summe(wNormal.erledigt));
    expect(wLang.obendrauf).toBeDefined();
    // … für die Planung zählt nur die Basis, also so viel wie nach der normalen Einheit.
    for (const m of MUSKELN) expect(erledigtFuerPlanung(wLang)[m]).toBeCloseTo(erledigtFuerPlanung(wNormal)[m], 5);
    // Löschen nimmt die Sätze obendrauf wieder heraus.
    const id = nachLang.einheiten.at(-1)!.id;
    const geloescht = loescheEinheit(nachLang, id)!.wochen.find((w) => w.id === lang.woche)!;
    for (const m of MUSKELN) expect(geloescht.obendrauf![m]).toBeCloseTo(0, 5);
  });

  it('bei Abbruch zählt nur, was über die Basis hinaus erledigt wurde', () => {
    const z = kleineWoche();
    const lang = erstelleEinheit(z, eingabe(z, { dauerMin: 50 }));
    const nichts = { ...lang, status: 'abgebrochen' as const };
    expect(MUSKELN.every((m) => obendraufVon(lang, dosisProMuskel(z, nichts))![m] === 0)).toBe(true);
  });
});

function alleSaetze(e: Einheit): Einheit {
  return {
    ...e, status: 'abgeschlossen', gestartetAm: zeitpunkt(2, 18),
    bloecke: e.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => ({
        ...p, feedback: 'passend' as const,
        ergebnisse: Array.from({ length: p.saetze }, (_, i) => ({ nr: i + 1, wdh: p.zielWdh, ...(p.last ? { last: p.last } : {}), zeit: zeitpunkt(2, 18) })),
      })),
    })),
  };
}
