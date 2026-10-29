// Beendete Einheit löschen (Entscheidung 29.10.2026): Sie verschwindet aus Verlauf, Woche, Sätzen pro
// Woche, Max-Tests und Zirkel-Bestzeiten; Ziel, Gewicht und Variante jeder Übung gehen auf den Stand
// davor zurück, solange danach nicht schon wieder mit ihr (bzw. ihrem Muster) trainiert wurde.
import { MUSKELN, type AppZustand, type Einheit, type MuskelZustand, type Position, type VarianteZustand } from './typen';
import { dosisProMuskel } from './planung';
import { einheitZeit, feedbackVon, fertigeEinheiten, uebungVon } from './verlauf';

export function kannLoeschen(e: Einheit): boolean {
  return (e.status === 'abgeschlossen' || e.status === 'abgebrochen') && e.format !== 'test';
}

// Trainierte Positionen einer Einheit (ohne Zirkel), wie sie die Progression auswertet.
function trainiert(e: Einheit): Position[] {
  return e.bloecke.filter((b) => b.typ !== 'zirkel').flatMap((b) => b.positionen).filter((p) => p.ergebnisse.length > 0);
}

export function loescheEinheit(z: AppZustand, einheitId: string): AppZustand | undefined {
  const e = z.einheiten.find((x) => x.id === einheitId);
  if (!e || !kannLoeschen(e)) return undefined;
  const zeit = einheitZeit(e);
  const start = e.gestartetAm ?? zeit;
  const rest = fertigeEinheiten(z).filter((x) => x.id !== e.id);
  const spaeter = rest.filter((x) => einheitZeit(x) > zeit).flatMap(trainiert);
  const spaeterUebungen = new Set(spaeter.filter((p) => !p.istMaxTest).map((p) => p.uebungId));
  const spaeterMuster = new Set(spaeter.map((p) => uebungVon(z, p.uebungId)?.muster));

  // Varianten: gemerkter Stand, sonst (ältere Einheiten) Ziel und Gewicht aus der Einheit selbst.
  let varianten = z.varianten;
  const setze = (uebungId: string, zustand?: VarianteZustand) => {
    varianten = varianten.filter((v) => v.uebungId !== uebungId);
    if (zustand) varianten = [...varianten, zustand];
  };
  if (e.vorher) {
    for (const v of e.vorher.varianten) if (!spaeterUebungen.has(v.uebungId)) setze(v.uebungId, v.zustand);
  } else {
    for (const p of trainiert(e)) {
      const alt = varianten.find((v) => v.uebungId === p.uebungId);
      if (p.istMaxTest || !alt || spaeterUebungen.has(p.uebungId)) continue;
      const neu: VarianteZustand = { ...alt, zielWdh: p.zielWdh };
      delete neu.last;
      delete neu.bandStufe;
      delete neu.langsam;
      setze(p.uebungId, {
        ...neu, ...(p.last !== undefined ? { last: p.last } : {}), ...(p.bandStufe ? { bandStufe: p.bandStufe } : {}),
        ...(p.langsam ? { langsam: true } : {}),
      });
    }
  }

  let muster = z.muster;
  for (const m of e.vorher?.muster ?? []) {
    if (spaeterMuster.has(m.muster)) continue;
    muster = muster.filter((x) => x.muster !== m.muster);
    if (m.zustand) muster = [...muster, m.zustand];
  }

  // Woche: eine Einheit und ihre Sätze weniger.
  const dosis = dosisProMuskel(z, e);
  const wochen = z.wochen.map((w) => {
    if (w.id !== e.woche) return w;
    const erledigt = { ...w.erledigt };
    for (const m of MUSKELN) erledigt[m] = Math.max(0, erledigt[m] - dosis[m]);
    return { ...w, einheiten: Math.max(0, w.einheiten - 1), erledigt };
  });

  // Erholung: Muskeln, die zuletzt in dieser Einheit belastet wurden, zählen ab der letzten übrigen Einheit.
  const muskeln = z.muskeln.map((mz): MuskelZustand => {
    if (mz.letzteBelastung !== start) return mz;
    const letzte = rest.filter((x) => x.format !== 'test' && dosisProMuskel(z, x)[mz.muskel] > 0).at(-1);
    if (!letzte) {
      const ohne = { ...mz, letzteDosis: 0, letzteSchwer: false };
      delete ohne.letzteBelastung;
      return ohne;
    }
    const schwer = trainiert(letzte).some((p) => !p.istMaxTest && feedbackVon(p) === 'schwer'
      && (uebungVon(z, p.uebungId)?.primaer ?? []).includes(mz.muskel));
    return { ...mz, letzteBelastung: letzte.gestartetAm ?? einheitZeit(letzte), letzteDosis: dosisProMuskel(z, letzte)[mz.muskel], letzteSchwer: schwer };
  });

  return {
    ...z, varianten, muster, wochen, muskeln,
    einheiten: z.einheiten.filter((x) => x.id !== e.id),
    maxTests: z.maxTests.filter((t) => !t.id.startsWith(`maxtest-${start}-`)),
    zirkelErgebnisse: z.zirkelErgebnisse.filter((r) => !(r.datum === start && r.ortId === e.ortId)),
  };
}
