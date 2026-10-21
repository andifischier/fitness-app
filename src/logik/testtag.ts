// Testtag beim Onboarding laut Spezifikation, Abschnitt „Nutzerprofil und Onboarding“: Max-Tests
// der Grundmuster, daraus Musterstufe, Startvariante und Startziel. Rein und deterministisch.
import { MAXTEST, PROGRESSION, TESTTAG, ZEITBUDGET } from '../konfiguration';
import { isoWoche } from './datum';
import { lastraster, uebungErlaubt, uebungMoeglich } from './equipment';
import { aufwaermenFuer, bereichFuer, hauptvarianten } from './planung';
import { schliesseEinheitAb } from './progression';
import type { AppZustand, Block, Einheit, Einstellungen, MusterId, Ort, Position, Uebung, VarianteZustand } from './typen';
import { e1rm, einstellungenVon, uebungVon, wdhBei, zielReserve } from './verlauf';

export type TestMuster = 'hDruck' | 'vZug' | 'Knie' | 'Rumpf';

const begrenze = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

function ortVon(z: AppZustand, ortId: string): Ort | undefined {
  return z.orte.find((o) => o.id === ortId);
}

// Tests des Testtags am Ort; ein Test, dessen Übung dort nicht geht oder gesperrt ist, entfällt.
export function testtagTests(z: AppZustand, ortId: string, jetzt: string): { muster: TestMuster; uebung: Uebung }[] {
  const e = einstellungenVon(z);
  const ort = ortVon(z, ortId);
  if (!ort) return [];
  return (MAXTEST.rotation as readonly TestMuster[]).flatMap((muster) => {
    const id = MAXTEST.uebungen[muster];
    const u = id ? uebungVon(z, id) : undefined;
    return u && uebungErlaubt(e, ort, u, jetzt) ? [{ muster, uebung: u }] : [];
  });
}

// Max-Tests, die am Ort ausfallen, mit Grund (Entscheidung 21.10.2026: Hinweis vor dem Testtag).
export function testtagAusfaelle(z: AppZustand, ortId: string, jetzt: string):
  { muster: TestMuster; uebung: Uebung; grund: 'ausstattung' | 'gesperrt' }[] {
  const e = einstellungenVon(z);
  const ort = ortVon(z, ortId);
  if (!ort) return [];
  return (MAXTEST.rotation as readonly TestMuster[]).flatMap((muster) => {
    const id = MAXTEST.uebungen[muster];
    const u = id ? uebungVon(z, id) : undefined;
    if (!u || uebungErlaubt(e, ort, u, jetzt)) return [];
    return [{ muster, uebung: u, grund: uebungMoeglich(ort, u) ? 'gesperrt' as const : 'ausstattung' as const }];
  });
}

// Gewichtstests am Ort (Entscheidung 21.10.2026): je Muster die erste Übung aus `TESTTAG.lasttests`,
// die dort geht.
export function testtagLasttests(z: AppZustand, ortId: string, jetzt: string): Uebung[] {
  const e = einstellungenVon(z);
  const ort = ortVon(z, ortId);
  if (!ort) return [];
  return Object.values(TESTTAG.lasttests).flatMap((ids) => {
    const u = ids.map((id) => uebungVon(z, id)).find((x): x is Uebung => !!x && uebungErlaubt(e, ort, x, jetzt) && lastraster(ort, x).length > 0);
    return u ? [u] : [];
  });
}

// Einheit mit `format: 'test'`: Aufwärmen, danach je Max-Test ein Satz ohne Ziel, zum Schluss die
// Gewichtstests (Gewicht wählen, so viele saubere Wiederholungen wie möglich).
export function testtagEinheit(z: AppZustand, ortId: string, jetzt: string): Einheit {
  const e = einstellungenVon(z);
  const ort = ortVon(z, ortId);
  const tests = testtagTests(z, ortId, jetzt);
  const lasttests = testtagLasttests(z, ortId, jetzt);
  const bloecke: Block[] = [
    ...tests.map((t): Block => ({
      typ: 'einzeln', pauseSek: e.pausenSek.grund,
      positionen: [{ uebungId: t.uebung.id, saetze: 1, zielWdh: 0, istMaxTest: true, ergebnisse: [] }],
    })),
    ...lasttests.map((u): Block => {
      const raster = ort ? lastraster(ort, u) : [];
      const last = raster[Math.floor((raster.length - 1) * TESTTAG.lasttestVorschlagAnteil)];
      return {
        typ: 'einzeln', pauseSek: e.pausenSek.grund,
        positionen: [{ uebungId: u.id, saetze: 1, zielWdh: 0, istLasttest: true, ...(last !== undefined ? { last } : {}), ergebnisse: [] }],
      };
    }),
  ];
  return {
    id: `einheit-${jetzt}`, woche: isoWoche(jetzt), erstelltAm: jetzt, status: 'geplant',
    ortId, fokus: 'ganz', format: 'test',
    geschaetzteDauerMin: ZEITBUDGET.aufwaermenMin + bloecke.length * TESTTAG.minutenProTest,
    aufwaermen: ort ? aufwaermenFuer(z, ort, bloecke) : [],
    bloecke,
  };
}

// Startvariante laut Tabelle; vZug bei 0 Wdh. nach den Sekunden im Hängen.
export function startvarianteLautTabelle(muster: TestMuster, ergebnis: number, haengenSek = 0): string {
  const stufe = (grenzen: readonly number[]) => {
    const i = grenzen.findIndex((g) => ergebnis <= g);
    return i < 0 ? grenzen.length : i;
  };
  if (muster === 'vZug') {
    const t = TESTTAG.vZug;
    if (ergebnis <= 0) return t.varianten[haengenSek >= t.haengenSek ? 1 : 0];
    return t.varianten[2 + stufe(t.grenzen)]!;
  }
  const t = TESTTAG[muster];
  return t.varianten[stufe(t.grenzen)]!;
}

// Am Ort mögliche Startvariante: die laut Tabelle, sonst die nächstleichtere aus der Tabelle.
// Bei Knie über 30 steht bss_kg gleichrangig hinter goblet_squat.
export function startvariante(z: AppZustand, ort: Ort, muster: TestMuster, ergebnis: number, haengenSek: number,
  jetzt: string): { tabelle: Uebung; uebung: Uebung } | undefined {
  const e = einstellungenVon(z);
  const tabelleId = startvarianteLautTabelle(muster, ergebnis, haengenSek);
  const tabelle = uebungVon(z, tabelleId);
  if (!tabelle) return undefined;
  const reihe: readonly string[] = TESTTAG[muster].varianten;
  const kandidaten = [...reihe.slice(0, reihe.indexOf(tabelleId) + 1)].reverse();
  if (muster === 'Knie' && tabelleId === TESTTAG.Knie.varianten.at(-1)) kandidaten.splice(1, 0, TESTTAG.Knie.ersatzOhneLast);
  const uebung = kandidaten.map((id) => uebungVon(z, id))
    .find((u): u is Uebung => !!u && uebungErlaubt(e, ort, u, jetzt));
  return uebung ? { tabelle, uebung } : undefined;
}

export function startziel(e: Einstellungen, u: Uebung, ergebnis: number): number {
  const { von, bis } = bereichFuer(e, u);
  return begrenze(Math.round(ergebnis * TESTTAG.startzielAnteil + 1e-9), von, bis);
}

// Schreibt den Testtag fort: Max-Tests und Erholung wie jede Einheit (ohne Woche), dazu je
// getestetem Muster Musterstufe = Stufe der Startvariante laut Tabelle, Startvariante als
// Hauptvariante A (Entscheidung 20.10.2026) und ihr Startziel (70 % des Ergebnisses im Bereich).
export function schliesseTesttagAb(z: AppZustand, einheit: Einheit, jetzt: string): AppZustand {
  let neu = schliesseEinheitAb(z, { ...einheit, format: 'test' }, jetzt);
  const e = einstellungenVon(neu);
  const ort = ortVon(neu, einheit.ortId);
  if (!ort) return neu;
  for (const p of einheit.bloecke.flatMap((b) => b.positionen)) {
    if (p.istLasttest) {
      const variante = lasttestVariante(neu, e, ort, p);
      if (variante) neu = { ...neu, varianten: [...neu.varianten.filter((v) => v.uebungId !== variante.uebungId), variante] };
      continue;
    }
    const s = p.ergebnisse[0];
    const getestet = uebungVon(neu, p.uebungId);
    if (!s || !getestet || !p.istMaxTest || !(MAXTEST.rotation as readonly MusterId[]).includes(getestet.muster)) continue;
    const muster = getestet.muster as TestMuster;
    const inSek = getestet.bereich.einheit === 'Sek.';
    const ergebnis = (inSek ? s.sek ?? s.wdh : s.wdh ?? s.sek) ?? 0;
    const haengen = !inSek && ergebnis <= 0 ? s.sek ?? 0 : 0;
    const start = startvariante(neu, ort, muster, ergebnis, haengen, jetzt);
    if (!start) continue;
    const ohne = { ...neu, muster: [...neu.muster.filter((x) => x.muster !== muster), { muster, stufe: start.tabelle.stufe, hauptvarianten: [] }] };
    const b = hauptvarianten(ohne, muster, ort, jetzt, e).find((k) => !k.istErsatz && k.uebung.id !== start.uebung.id);
    const ids = [start.uebung.id, ...(b ? [b.uebung.id] : [])];
    const variante: VarianteZustand = {
      ...(neu.varianten.find((v) => v.uebungId === start.uebung.id) ?? { seitSteigerung: PROGRESSION.startSeitSteigerung, schwerSerie: 0 }),
      uebungId: start.uebung.id, zielWdh: startziel(e, start.uebung, ergebnis),
    };
    neu = {
      ...neu,
      muster: [...neu.muster.filter((x) => x.muster !== muster), { muster, stufe: start.tabelle.stufe, hauptvarianten: ids }],
      varianten: [...neu.varianten.filter((v) => v.uebungId !== variante.uebungId), variante],
    };
  }
  return neu;
}

// Gewichtstest: Kraftschätzung mit Reserve 1; daraus wie nach einem Kalibrierungssatz die schwerste
// Last am Ort, die die Untergrenze mit Ziel-Reserve zulässt, Ziel = geschätzte Wiederholungen dort.
function lasttestVariante(z: AppZustand, e: Einstellungen, ort: Ort, p: Position): VarianteZustand | undefined {
  const u = uebungVon(z, p.uebungId);
  const s = p.ergebnisse[0];
  const last = s?.last ?? p.last;
  if (!u || !s || last === undefined || !s.wdh) return undefined;
  const schaetzung = e1rm(last, s.wdh, TESTTAG.lasttestReserve);
  const { von: U, bis: O } = bereichFuer(e, u);
  const raster = lastraster(ort, u);
  const r = zielReserve(e);
  const neu = [...raster].reverse().find((kg) => wdhBei(schaetzung, kg, r) >= U) ?? raster[0] ?? last;
  return {
    ...(z.varianten.find((v) => v.uebungId === u.id) ?? { seitSteigerung: PROGRESSION.startSeitSteigerung, schwerSerie: 0 }),
    uebungId: u.id, last: neu, zielWdh: begrenze(wdhBei(schaetzung, neu, r), U - 1, O), e1rm: schaetzung,
  };
}

// Ergebnisse der Gewichtstests für den Ergebnisbildschirm: Test und Startwerte der Übung.
export function lasttestErgebnisse(z: AppZustand, einheit: Einheit):
  { uebung: Uebung; last: number; wdh: number; start?: { last: number; zielWdh: number } }[] {
  return einheit.bloecke.flatMap((b) => b.positionen).flatMap((p) => {
    const u = uebungVon(z, p.uebungId);
    const s = p.ergebnisse[0];
    const last = s?.last ?? p.last;
    if (!p.istLasttest || !u || !s || last === undefined) return [];
    const v = z.varianten.find((x) => x.uebungId === u.id);
    return [{ uebung: u, last, wdh: s.wdh ?? 0, ...(v?.last !== undefined ? { start: { last: v.last, zielWdh: v.zielWdh } } : {}) }];
  });
}

export interface TestErgebnis {
  muster: TestMuster; test: Uebung; ergebnis: number; inSek: boolean; haengenSek?: number;
  start?: { uebung: Uebung; zielWdh: number };
}

// Ergebnisbildschirm nach dem Testtag (Entscheidung 21.10.2026): je Test das Ergebnis und, aus dem
// fortgeschriebenen Zustand, Startübung (Hauptvariante A) und Startziel.
export function testtagErgebnisse(z: AppZustand, einheit: Einheit): TestErgebnis[] {
  return einheit.bloecke.flatMap((b) => b.positionen).flatMap((p): TestErgebnis[] => {
    const s = p.ergebnisse[0];
    const test = uebungVon(z, p.uebungId);
    if (!s || !test || !p.istMaxTest || !(MAXTEST.rotation as readonly MusterId[]).includes(test.muster)) return [];
    const muster = test.muster as TestMuster;
    const inSek = test.bereich.einheit === 'Sek.';
    const ergebnis = (inSek ? s.sek ?? s.wdh : s.wdh ?? s.sek) ?? 0;
    const haengenSek = !inSek && ergebnis <= 0 && s.sek !== undefined ? s.sek : undefined;
    const startId = z.muster.find((m) => m.muster === muster)?.hauptvarianten[0];
    const uebung = startId ? uebungVon(z, startId) : undefined;
    const zielWdh = z.varianten.find((v) => v.uebungId === startId)?.zielWdh;
    return [{
      muster, test, ergebnis, inSek, ...(haengenSek !== undefined ? { haengenSek } : {}),
      ...(uebung && zielWdh !== undefined ? { start: { uebung, zielWdh } } : {}),
    }];
  });
}
