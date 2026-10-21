// Eigene Workouts (Entscheidung 21.10.2026): Übungsliste mit Sätzen oder Zirkel mit Runden und einer
// Vorgabe je Station. Rein und deterministisch; gespeichert werden sie in `Einstellungen.workouts`.
import { WORKOUT } from '../konfiguration';
import { neueId } from './einstellungen';
import { alleUebungen, istGesperrt, uebungMoeglich } from './equipment';
import type { AppZustand, EigenesWorkout, Einstellungen, Uebung } from './typen';
import { einstellungenVon, uebungVon } from './verlauf';

export type WorkoutEintrag = EigenesWorkout['uebungen'][number];

export function workoutsVon(z: AppZustand): EigenesWorkout[] {
  return einstellungenVon(z).workouts ?? [];
}

export function leeresWorkout(art: EigenesWorkout['art']): EigenesWorkout {
  return { id: '', name: '', art, runden: WORKOUT.runden.standard, uebungen: [] };
}

// Neuer Eintrag mit Standardwerten: 3 Sätze, Vorgabe 10 Wdh. bzw. 30 Sek.
export function neuerEintrag(u: Uebung): WorkoutEintrag {
  const vorgabe = u.bereich.einheit === 'Sek.' ? WORKOUT.vorgabe.standardSek : WORKOUT.vorgabe.standardWdh;
  return { uebungId: u.id, saetze: WORKOUT.saetze.standard, vorgabe };
}

// Eintrag i um eine Stelle nach oben (-1) oder unten (+1) verschieben.
export function verschiebe(w: EigenesWorkout, i: number, richtung: -1 | 1): EigenesWorkout {
  const j = i + richtung;
  if (j < 0 || j >= w.uebungen.length) return w;
  const uebungen = [...w.uebungen];
  [uebungen[i], uebungen[j]] = [uebungen[j]!, uebungen[i]!];
  return { ...w, uebungen };
}

// Übung eines Eintrags ersetzen; Sätze bleiben, die Vorgabe passt sich an Wdh. bzw. Sek. an.
export function ersetzeEintrag(z: AppZustand, w: EigenesWorkout, i: number, uebungId: string): EigenesWorkout {
  const alt = w.uebungen[i];
  const neu = uebungVon(z, uebungId);
  if (!alt || !neu) return w;
  const gleicheEinheit = uebungVon(z, alt.uebungId)?.bereich.einheit === neu.bereich.einheit;
  const uebungen = [...w.uebungen];
  uebungen[i] = { ...neuerEintrag(neu), saetze: alt.saetze, ...(gleicheEinheit ? { vorgabe: alt.vorgabe } : {}) };
  return { ...w, uebungen };
}

// Vorschläge zum Ersetzen im Workout: andere Übungen derselben Art, die nicht ausgeschlossen sind,
// die mit der ähnlichsten Schwierigkeit zuerst.
export function workoutAlternativen(z: AppZustand, uebungId: string): Uebung[] {
  const u = uebungVon(z, uebungId);
  if (!u) return [];
  const e = einstellungenVon(z);
  return alleUebungen(z)
    .filter((v) => v.muster === u.muster && v.id !== u.id && !e.ausgeschlossen.includes(v.id))
    .sort((a, b) => Math.abs(a.stufe - u.stufe) - Math.abs(b.stufe - u.stufe) || a.stufe - b.stufe);
}

// Übungen, die sich zum Workout hinzufügen lassen: alle, die nicht ausgeschlossen sind.
export function waehlbareUebungen(z: AppZustand): Uebung[] {
  const e = einstellungenVon(z);
  return alleUebungen(z).filter((u) => !e.ausgeschlossen.includes(u.id));
}

export function pruefeWorkout(z: AppZustand, w: EigenesWorkout): string[] {
  const fehler: string[] = [];
  const name = w.name.trim();
  if (name === '') fehler.push('Gib dem Workout einen Namen.');
  else if (workoutsVon(z).some((x) => x.id !== w.id && x.name.trim().toLowerCase() === name.toLowerCase())) {
    fehler.push('Ein Workout mit diesem Namen gibt es schon.');
  }
  if (w.uebungen.length === 0) fehler.push('Füge mindestens eine Übung hinzu.');
  if (w.uebungen.some((x) => !uebungVon(z, x.uebungId))) fehler.push('Eine Übung gibt es nicht mehr. Entferne sie.');
  return fehler;
}

// Fertiges Workout zum Speichern: Name getrimmt, neue Workouts bekommen eine ID.
export function fertigesWorkout(z: AppZustand, w: EigenesWorkout): EigenesWorkout {
  const name = w.name.trim();
  const id = w.id || neueId('workout_', name, workoutsVon(z).map((x) => x.id));
  return { ...w, id, name };
}

// Workout speichern (ersetzt eines mit gleicher ID, sonst ans Ende) bzw. entfernen.
export function mitWorkout(e: Einstellungen, w: EigenesWorkout): Einstellungen {
  const liste = e.workouts ?? [];
  const workouts = liste.some((x) => x.id === w.id) ? liste.map((x) => (x.id === w.id ? w : x)) : [...liste, w];
  return { ...e, workouts };
}

export function ohneWorkout(e: Einstellungen, id: string): Einstellungen {
  const workouts = (e.workouts ?? []).filter((x) => x.id !== id);
  const neu: Einstellungen = { ...e, workouts };
  if (workouts.length === 0) delete neu.workouts;
  return neu;
}

// Einträge, die am Ort gehen (Equipment vorhanden, nicht gesperrt), und die Übungen, die fehlen.
export function workoutAmOrt(z: AppZustand, w: EigenesWorkout, ortId: string, jetzt: string):
  { eintraege: { eintrag: WorkoutEintrag; uebung: Uebung }[]; fehlen: Uebung[] } {
  const e = einstellungenVon(z);
  const ort = z.orte.find((o) => o.id === ortId);
  const eintraege: { eintrag: WorkoutEintrag; uebung: Uebung }[] = [];
  const fehlen: Uebung[] = [];
  for (const eintrag of w.uebungen) {
    const uebung = uebungVon(z, eintrag.uebungId);
    if (!uebung) continue;
    if (ort && uebungMoeglich(ort, uebung) && !istGesperrt(e, uebung, jetzt)) eintraege.push({ eintrag, uebung });
    else fehlen.push(uebung);
  }
  return { eintraege, fehlen };
}

// Bestzeit eines eigenen Zirkels am Ort für die Übungen, die dort gehen (Sekunden).
export function workoutBestzeit(z: AppZustand, w: EigenesWorkout, ortId: string, jetzt: string): number | undefined {
  if (w.art !== 'zirkel') return undefined;
  const varianten = workoutAmOrt(z, w, ortId, jetzt).eintraege.map((x) => x.uebung.id).join();
  const zeiten = z.zirkelErgebnisse.filter((r) => r.zirkelId === w.id && r.ortId === ortId && r.varianten.join() === varianten)
    .map((r) => r.zeitSek);
  return zeiten.length > 0 ? Math.min(...zeiten) : undefined;
}

// Name eines Zirkels: aus dem Katalog oder den eigenen Workouts.
export function zirkelName(z: AppZustand, zirkelId: string | undefined): string | undefined {
  return z.katalog.zirkel.find((x) => x.id === zirkelId)?.name ?? workoutsVon(z).find((x) => x.id === zirkelId)?.name;
}
