// Was an einem Ort möglich ist: Equipment, Sperren, Ausschlüsse und Lasten.
import { SPERREN_NACH_REGION } from '../konfiguration';
import { BAND_STUFEN, type AppZustand, type BandStufe, type Einstellungen, type Ort, type Uebung } from './typen';

export function alleUebungen(z: AppZustand): Uebung[] {
  return [...z.katalog.uebungen, ...z.eigeneUebungen];
}

export function hatUtensil(ort: Ort, utensilId: string): boolean {
  return ort.equipment.some((e) => e.utensilId === utensilId);
}

// Aus jeder Equipment-Gruppe ist mindestens ein Utensil nötig.
export function uebungMoeglich(ort: Ort, u: Uebung): boolean {
  return u.equipment.every((gruppe) => gruppe.some((id) => hatUtensil(ort, id)));
}

export function istGesperrt(e: Einstellungen, u: Uebung, jetzt: string): boolean {
  const heute = jetzt.slice(0, 10);
  return e.einschraenkungen.some((s) => {
    if (s.bis && s.bis.slice(0, 10) < heute) return false;
    if (s.typ === 'muster') return s.wert === u.muster;
    const region = SPERREN_NACH_REGION[s.wert];
    if (!region || region.ausnahmen.includes(u.id)) return false;
    return region.muster.includes(u.muster) || region.uebungen.includes(u.id);
  });
}

export function hatAktiveSperre(e: Einstellungen, jetzt: string): boolean {
  const heute = jetzt.slice(0, 10);
  return e.einschraenkungen.some((s) => !s.bis || s.bis.slice(0, 10) >= heute);
}

// Übungen, die Platz zum Gehen brauchen, nur mit „Platz zum Gehen“ im Profil (Entscheidung 29.10.2026).
export function platzReicht(e: Einstellungen, u: Uebung): boolean {
  return !u.brauchtPlatz || e.platzZumGehen === true;
}

// Am Ort möglich, Platz reicht, nicht gesperrt und nicht ausgeschlossen.
export function uebungErlaubt(e: Einstellungen, ort: Ort, u: Uebung, jetzt: string): boolean {
  return uebungMoeglich(ort, u) && platzReicht(e, u) && !istGesperrt(e, u, jetzt) && !e.ausgeschlossen.includes(u.id);
}

const runde = (kg: number) => Math.round(kg * 100) / 100;

// Mögliche Lasten einer Last-Übung am Ort, aufsteigend (Lastraster laut Spezifikation).
export function lastraster(ort: Ort, u: Uebung): number[] {
  if (u.lasttyp !== 'Last') return [];
  const ids = new Set(u.equipment.flat());
  const lasten = new Set<number>();
  for (const e of ort.equipment) {
    if (!ids.has(e.utensilId)) continue;
    if (e.utensilId === 'KH' && e.kurzhanteln) {
      const k = e.kurzhanteln;
      if (k.modus === 'paare') k.gewichteKg.forEach((kg) => lasten.add(runde(kg)));
      else if (k.schrittKg > 0) {
        for (let kg = k.minKg; kg <= k.maxKg + 1e-9; kg += k.schrittKg) lasten.add(runde(kg));
        lasten.add(runde(k.maxKg));
      }
    }
    if (e.utensilId === 'KB') e.gewichteKg?.forEach((kg) => lasten.add(runde(kg)));
    if (e.utensilId === 'LH' && e.langhantel) {
      let summen = [e.langhantel.stangeKg];
      for (const s of e.langhantel.scheiben) {
        summen = summen.flatMap((basis) => Array.from({ length: s.paare + 1 }, (_, n) => basis + 2 * n * s.kg));
      }
      summen.forEach((kg) => lasten.add(runde(kg)));
    }
  }
  return [...lasten].sort((a, b) => a - b);
}

// Am Ort vorhandene Bandstufen für eine Band-Übung, von leicht nach schwer.
export function bandStufen(ort: Ort, u: Uebung): BandStufe[] {
  const ids = new Set(u.equipment.flat());
  const stufen = new Set(ort.equipment.filter((e) => ids.has(e.utensilId)).flatMap((e) => e.bandStufen ?? []));
  return BAND_STUFEN.filter((s) => stufen.has(s));
}
