import { describe, expect, it } from 'vitest';
import { WORKOUT, ZEITBUDGET } from '../konfiguration';
import { zirkelBestzeit, zirkelVorgaben } from './heute';
import { workoutEinheit } from './planung';
import { schliesseEinheitAb } from './progression';
import { ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, EigenesWorkout, Einheit } from './typen';
import {
  ersetzeEintrag, fertigesWorkout, leeresWorkout, mitWorkout, neuerEintrag, ohneWorkout, pruefeWorkout, verschiebe,
  workoutAlternativen, workoutAmOrt, workoutBestzeit, zirkelName,
} from './workouts';

const MI = zeitpunkt(2, 18);
const u = (z: AppZustand, id: string) => z.katalog.uebungen.find((x) => x.id === id)!;
const eintrag = (uebungId: string, saetze = 3, vorgabe = 10) => ({ uebungId, saetze, vorgabe });
const liste: EigenesWorkout = {
  id: 'workout_oben', name: 'Oben', art: 'liste', runden: 3,
  uebungen: [eintrag('kh_bankdruecken', 4), eintrag('klimmzug', 3), eintrag('kh_curls', 2)],
};
const zirkel: EigenesWorkout = {
  id: 'workout_kurz', name: 'Kurz', art: 'zirkel', runden: 4,
  uebungen: [eintrag('burpees', 3, 12), eintrag('plank', 3, 40), eintrag('goblet_squat', 3, 15)],
};
const mitWorkouts = (z: AppZustand, ...w: EigenesWorkout[]): AppZustand =>
  ({ ...z, einstellungen: [{ ...z.einstellungen[0]!, workouts: w }] });
const eingabe = (extra: { klassisch?: boolean; ortId?: string } = {}) =>
  ({ jetzt: MI, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false, ...extra });

describe('Eigene Workouts bearbeiten', () => {
  it('neue Einträge: 3 Sätze, Vorgabe 10 Wdh. bzw. 30 Sek.', () => {
    const z = zustand({ katalog: 'voll' });
    expect(neuerEintrag(u(z, 'klimmzug'))).toEqual({ uebungId: 'klimmzug', saetze: WORKOUT.saetze.standard, vorgabe: WORKOUT.vorgabe.standardWdh });
    expect(neuerEintrag(u(z, 'plank')).vorgabe).toBe(WORKOUT.vorgabe.standardSek);
    expect(leeresWorkout('zirkel')).toMatchObject({ id: '', art: 'zirkel', runden: WORKOUT.runden.standard, uebungen: [] });
  });

  it('prüft Name, doppelten Namen und mindestens eine Übung', () => {
    const z = mitWorkouts(zustand({ katalog: 'voll' }), liste);
    expect(pruefeWorkout(z, leeresWorkout('liste'))).toEqual(['Gib dem Workout einen Namen.', 'Füge mindestens eine Übung hinzu.']);
    expect(pruefeWorkout(z, { ...zirkel, name: ' oben ' })).toEqual(['Ein Workout mit diesem Namen gibt es schon.']);
    expect(pruefeWorkout(z, { ...liste, name: 'Oben' })).toEqual([]);
    expect(pruefeWorkout(z, { ...zirkel, uebungen: [eintrag('gibt_es_nicht')] })).toEqual(['Eine Übung gibt es nicht mehr. Entferne sie.']);
  });

  it('speichert mit neuer ID, ersetzt beim Bearbeiten und löscht', () => {
    const z = mitWorkouts(zustand({ katalog: 'voll' }), liste);
    const neu = fertigesWorkout(z, { ...zirkel, id: '', name: '  Kurz ' });
    expect(neu).toMatchObject({ id: 'workout_kurz', name: 'Kurz' });
    const e = mitWorkout(z.einstellungen[0]!, neu);
    expect(e.workouts!.map((w) => w.id)).toEqual(['workout_oben', 'workout_kurz']);
    const geaendert = mitWorkout(e, { ...liste, runden: 5 });
    expect(geaendert.workouts!.map((w) => [w.id, w.runden])).toEqual([['workout_oben', 5], ['workout_kurz', 4]]);
    expect(ohneWorkout(ohneWorkout(geaendert, 'workout_oben'), 'workout_kurz').workouts).toBeUndefined();
  });

  it('verschiebt Einträge und ersetzt eine Übung; die Vorgabe passt zur Einheit', () => {
    const z = zustand({ katalog: 'voll' });
    expect(verschiebe(liste, 0, 1).uebungen.map((x) => x.uebungId)).toEqual(['klimmzug', 'kh_bankdruecken', 'kh_curls']);
    expect(verschiebe(liste, 0, -1)).toBe(liste);
    const z2 = ersetzeEintrag(z, zirkel, 0, 'mountain_climbers');
    expect(z2.uebungen[0]).toEqual({ uebungId: 'mountain_climbers', saetze: 3, vorgabe: 12 });
    const z3 = ersetzeEintrag(z, zirkel, 1, 'dead_bug');
    expect(z3.uebungen[1]).toEqual({ uebungId: 'dead_bug', saetze: 3, vorgabe: WORKOUT.vorgabe.standardWdh });
  });

  it('Vorschläge zum Ersetzen: dieselbe Art, ähnlich schwer zuerst, ohne Ausschlüsse', () => {
    const z = zustand({ katalog: 'voll', einstellungen: { ausgeschlossen: ['chinup'] } });
    const vorschlaege = workoutAlternativen(z, 'klimmzug');
    expect(vorschlaege.every((x) => x.muster === 'vZug' && x.id !== 'klimmzug')).toBe(true);
    expect(vorschlaege.some((x) => x.id === 'chinup')).toBe(false);
    const abstand = vorschlaege.map((x) => Math.abs(x.stufe - u(z, 'klimmzug').stufe));
    expect(abstand).toEqual([...abstand].sort((a, b) => a - b));
  });
});

describe('Eigene Workouts starten', () => {
  it('Übungen ohne Equipment oder mit Sperre entfallen am Ort', () => {
    const z = { ...zustand({ katalog: 'voll', einstellungen: { einschraenkungen: [{ id: 's', typ: 'muster', wert: 'Bizeps' }] } }), orte: [ort(['STANGE'])] };
    const amOrt = workoutAmOrt(z, liste, 'zuhause', MI);
    expect(amOrt.eintraege.map((x) => x.uebung.id)).toEqual(['klimmzug']);
    expect(amOrt.fehlen.map((x) => x.id)).toEqual(['kh_bankdruecken', 'kh_curls']);
  });

  it('Übungsliste klassisch: Reihenfolge und Sätze wie im Workout, Ziel und Last wie gewohnt, Name', () => {
    const z = zustand({ katalog: 'voll' });
    const e = workoutEinheit(z, liste, eingabe({ klassisch: true }));
    expect(e).toMatchObject({ name: 'Oben', format: 'klassisch', status: 'geplant' });
    expect(e.bloecke.map((b) => [b.typ, b.positionen[0]!.uebungId, b.positionen[0]!.saetze]))
      .toEqual([['einzeln', 'kh_bankdruecken', 4], ['einzeln', 'klimmzug', 3], ['einzeln', 'kh_curls', 2]]);
    expect(e.bloecke[0]!.positionen[0]).toMatchObject({ zielWdh: u(z, 'kh_bankdruecken').bereich.von, last: 2 });
    expect(e.aufwaermen.length).toBeGreaterThan(0);
    expect(e.geschaetzteDauerMin).toBeGreaterThan(ZEITBUDGET.aufwaermenMin);
  });

  it('Übungsliste Kombi: Runden aus Übungen ohne gemeinsamen Hauptmuskel', () => {
    const z = zustand({ katalog: 'voll' });
    const e = workoutEinheit(z, { ...liste, uebungen: [eintrag('kh_bankdruecken'), eintrag('goblet_squat')] }, eingabe());
    expect(e.format).toBe('supersatz');
    expect(e.bloecke).toHaveLength(1);
    expect(e.bloecke[0]!.positionen.map((p) => p.uebungId)).toEqual(['kh_bankdruecken', 'goblet_squat']);
  });

  it('Zirkel: Runden, Vorgabe je Station, Name und Bestzeit am Ort', () => {
    const z = mitWorkouts(zustand({ katalog: 'voll' }), zirkel);
    const e = workoutEinheit(z, zirkel, eingabe());
    expect(e).toMatchObject({ name: 'Kurz', format: 'zirkel' });
    const b = e.bloecke[0]!;
    expect(b).toMatchObject({ typ: 'zirkel', zirkelId: 'workout_kurz', runden: 4, pauseSek: 0 });
    expect(b.positionen.map((p) => [p.uebungId, p.saetze, p.zielWdh])).toEqual([['burpees', 4, 12], ['plank', 4, 40], ['goblet_squat', 4, 15]]);
    expect(e.geschaetzteDauerMin).toBe(ZEITBUDGET.aufwaermenMin + Math.round((4 * 3 * WORKOUT.stationSek) / 60));
    expect(zirkelVorgaben(z, e)).toEqual(['12', '40', '15']);
    expect(zirkelName(z, 'workout_kurz')).toBe('Kurz');

    const fertig: Einheit = {
      ...e, status: 'laufend', gestartetAm: MI,
      bloecke: [{ ...b, positionen: b.positionen.map((p) => ({ ...p, ergebnisse: [1, 2, 3, 4].map((nr) => ({ nr, wdh: p.zielWdh, zeit: MI })) })) }],
    };
    const nachher = schliesseEinheitAb(z, { ...fertig, beendetAm: zeitpunkt(2, 19) }, zeitpunkt(2, 19));
    expect(nachher.zirkelErgebnisse).toEqual([{ zirkelId: 'workout_kurz', ortId: 'zuhause', datum: MI, zeitSek: 3600, varianten: ['burpees', 'plank', 'goblet_squat'] }]);
    expect(workoutBestzeit(nachher, zirkel, 'zuhause', MI)).toBe(3600);
    expect(zirkelBestzeit(nachher, 'workout_kurz', 'zuhause', MI)).toBe(3600);
    expect(nachher.wochen[0]!.einheiten).toBe(1);
  });

  it('ohne mögliche Übung bleibt die Einheit leer', () => {
    const z = { ...zustand({ katalog: 'voll' }), orte: [ort([])] };
    const e = workoutEinheit(z, { ...liste, uebungen: [eintrag('kh_bankdruecken')] }, eingabe());
    expect(e.bloecke).toEqual([]);
    expect(workoutEinheit(z, { ...zirkel, uebungen: [eintrag('kh_thruster')] }, eingabe()).geschaetzteDauerMin).toBe(0);
  });
});
