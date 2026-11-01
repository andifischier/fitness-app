// Bereinigung gespeicherter Daten nach Katalogänderungen. Rein und deterministisch.
import type { MusterZustand, Uebung } from './typen';

// Hauptvarianten, deren Übung inzwischen zu einem anderen Muster gehört (01.11.2026: Sliding Leg Curls und
// Nordic Curls von „Hüftdominant“ in die neue Bewegung „Beinbeuger“), werden aus dem alten Muster entfernt;
// die Planung legt dafür neue fest. Unbekannte Übungen bleiben unverändert, nichts sonst wird gelöscht
// (Verlauf und Werte der Varianten hängen an der Übung, nicht am Muster).
export function bereinigeHauptvarianten(muster: MusterZustand[], uebungen: Uebung[]): MusterZustand[] {
  const musterVon = new Map(uebungen.map((u) => [u.id, u.muster]));
  return muster.map((mz) => {
    const bleibt = mz.hauptvarianten.filter((id) => (musterVon.get(id) ?? mz.muster) === mz.muster);
    return bleibt.length === mz.hauptvarianten.length ? mz : { ...mz, hauptvarianten: bleibt };
  });
}
