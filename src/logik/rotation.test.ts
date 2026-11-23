// Wechselnde Auswahl für Bauch, Bizeps und Trizeps (Entscheidung 23.11.2026)
import { describe, expect, it } from 'vitest';
import { ROTATION, STANDARD_EINSTELLUNGEN } from '../konfiguration';
import { wocheMitPrognose } from './heute';
import { erstelleEinheit, hauptvarianten } from './planung';
import { offeneWochenabschluesse, schliesseEinheitAb, wochenabschluss } from './progression';
import { ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit } from './typen';
import { uebungVon } from './verlauf';
import { uebungMoeglich } from './equipment';
import { fehlendeMuster } from './einstellungen';

const ZUHAUSE = ort(['KH', 'BANK', 'STANGE', 'BAND', 'ERH']);
const start = (): AppZustand => zustand({ katalog: 'voll', orte: [ZUHAUSE], einstellungen: { ...STANDARD_EINSTELLUNGEN }, maxTests: [] });

function absolviert(z: AppZustand, e: Einheit, jetzt: string): Einheit {
  return {
    ...e, status: 'abgeschlossen', gestartetAm: jetzt, beendetAm: jetzt,
    bloecke: e.bloecke.map((b) => ({
      ...b,
      positionen: b.positionen.map((p) => {
        const sek = uebungVon(z, p.uebungId)!.bereich.einheit === 'Sek.';
        const n = b.typ === 'zirkel' ? b.runden ?? 1 : p.istMaxTest ? 1 : p.saetze;
        return {
          ...p, ...(sek || p.istMaxTest || b.typ === 'zirkel' ? { feedback: 'passend' as const } : { reserve: 1.5 }),
          ergebnisse: Array.from({ length: n }, (_, i) => ({
            nr: i + 1, ...(sek ? { sek: p.zielWdh } : { wdh: p.zielWdh }),
            ...(p.last !== undefined ? { last: p.last } : {}), ...(p.bandStufe ? { bandStufe: p.bandStufe } : {}), zeit: jetzt,
          })),
        };
      }),
    })),
  };
}

// 4 Wochen mit 3 Einheiten; liefert je Muster die Übungen in der Reihenfolge, in der sie kamen.
function vierWochen(): Map<string, string[]> {
  let s = start();
  const folge = new Map<string, string[]>();
  for (let w = 0; w < 4; w++) {
    for (const tag of [0, 2, 4]) {
      const jetzt = zeitpunkt(w * 7 + tag, 18);
      for (const id of offeneWochenabschluesse(s, jetzt)) s = wochenabschluss(s, id);
      const woche = wocheMitPrognose(s, jetzt, 3, 'zuhause');
      s = { ...s, wochen: [...s.wochen.filter((x) => x.id !== woche.id), woche] };
      const e = erstelleEinheit(s, { jetzt, ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
      for (const p of e.bloecke.flatMap((b) => b.positionen)) {
        const u = uebungVon(s, p.uebungId)!;
        if (ROTATION.muster.includes(u.muster) && !p.istMaxTest) folge.set(u.muster, [...(folge.get(u.muster) ?? []), u.id]);
      }
      s = schliesseEinheitAb(s, absolviert(s, e, jetzt), jetzt);
    }
  }
  return folge;
}

describe('Wechselnde Auswahl (Entscheidung 23.11.2026)', () => {
  it('Bauch, Bizeps und Trizeps haben bis zu 4 Übungen, keine zwei gleichnamigen', () => {
    const z = start();
    for (const m of ROTATION.muster) {
      const liste = hauptvarianten(z, m, ZUHAUSE, zeitpunkt(0, 18)).map((k) => k.uebung);
      expect(liste.length, m).toBeGreaterThanOrEqual(3);
      expect(liste.length, m).toBeLessThanOrEqual(ROTATION.anzahl);
      expect(new Set(liste.map((u) => u.name.replace(/^(Dumbbell|Weighted|Band) /, ''))).size, m).toBe(liste.length);
    }
  });

  it('andere Muster behalten höchstens A und B', () => {
    const z = start();
    expect(hauptvarianten(z, 'hDruck', ZUHAUSE, zeitpunkt(0, 18)).length).toBeLessThanOrEqual(2);
  });

  it('in 4 Wochen wechseln die Übungen: keine kommt zweimal hintereinander, jede der Auswahl kommt vor', () => {
    const folge = vierWochen();
    for (const m of ['Rumpf', 'Bizeps', 'Trizeps']) {
      const liste = folge.get(m) ?? [];
      expect(liste.length, m).toBeGreaterThanOrEqual(4);
      for (let i = 1; i < liste.length; i++) expect(liste[i], `${m}: ${liste.join(', ')}`).not.toBe(liste[i - 1]);
      expect(new Set(liste).size, `${m}: ${liste.join(', ')}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Band ohne Türanker und Beincurls (Entscheidung 23.11.2026)', () => {
  it('die Klimmzugstange zählt nicht als Befestigung fürs Band', () => {
    const z = start();
    expect(uebungMoeglich(ZUHAUSE, uebungVon(z, 'band_trizeps')!)).toBe(false);
    expect(uebungMoeglich(ZUHAUSE, uebungVon(z, 'band_beincurl')!)).toBe(false);
    expect(uebungMoeglich(ort(['BAND', 'ANKER']), uebungVon(z, 'band_beincurl')!)).toBe(true);
  });

  it('ohne Türanker keine eigenen Beincurls, auch kein Hinweis auf fehlendes Equipment', () => {
    const z = start();
    expect(hauptvarianten(z, 'Beinbeuger', ZUHAUSE, zeitpunkt(0, 18))).toEqual([]);
    expect(fehlendeMuster(z, ZUHAUSE)).not.toContain('Beinbeuger');
  });

  it('als Favorit kommen Rutsch-Beincurls weiter', () => {
    const z = zustand({ katalog: 'voll', orte: [ZUHAUSE], einstellungen: { ...STANDARD_EINSTELLUNGEN, favoriten: ['sliding_leg_curl'] }, maxTests: [] });
    expect(hauptvarianten(z, 'Beinbeuger', ZUHAUSE, zeitpunkt(0, 18)).map((k) => k.uebung.id)).toContain('sliding_leg_curl');
  });
});

describe('Hüfte ohne eigene Beincurls (Entscheidung 23.11.2026)', () => {
  it('Einsteiger: neben Hip Thrusts eine Übung für die hinteren Oberschenkel', () => {
    const z = zustand({ katalog: 'voll', orte: [ZUHAUSE], einstellungen: { ...STANDARD_EINSTELLUNGEN, level: 'einsteiger' }, maxTests: [] });
    const muskeln = hauptvarianten(z, 'Huefte', ZUHAUSE, zeitpunkt(0, 18)).map((k) => k.uebung.primaer[0]);
    expect(muskeln).toContain('Gesaess');
    expect(muskeln).toContain('HintereOS');
  });
});
