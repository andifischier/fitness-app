import { describe, expect, it } from 'vitest';
import { KATALOG } from '../daten/katalog';
import { STANDARD_EINSTELLUNGEN } from '../konfiguration';
import {
  entwurfAusVorlage, fehlendeMuster, fertigeUebung, hantelbank, leseZahl, leseZahlen, mitAusschluss, mitDetails,
  mitEinschraenkung, mitFavorit, mitHantelbank, mitStandard, mitUtensil, mitVideoLink, moeglicheUebungen, neueId,
  neuerOrt, neuesUtensil, normalisiereUebung, ohneEinschraenkung, ohneUebung, ortGenutzt, pruefeEigeneUebung,
  pruefeOrt, pruefeUtensilName, sperreAktiv, uebungGenutzt, utensilGenutzt, videoLinkVon, youtubeSuche, zahlText,
} from './einstellungen';
import { erstelleEinheit } from './planung';
import { ort, zeitpunkt, zustand } from './testhilfe';
import type { AppZustand, Einheit, Ort, Uebung } from './typen';

const katalogUebung = (id: string): Uebung => KATALOG.uebungen.find((u) => u.id === id)!;
const leer = (): AppZustand => zustand({ katalog: 'voll', orte: [] });

describe('Zahlen mit Dezimalkomma', () => {
  it('liest einzelne Zahlen mit Komma oder Punkt', () => {
    expect(leseZahl('2,5')).toBe(2.5);
    expect(leseZahl(' 24 ')).toBe(24);
    expect(leseZahl('2.5')).toBe(2.5);
    expect(leseZahl('')).toBeUndefined();
    expect(leseZahl('zwei')).toBeUndefined();
    expect(leseZahl('-3')).toBeUndefined();
  });

  it('liest Listen wie im Mockup „5, 10, 12,5, 20“', () => {
    expect(leseZahlen('5, 10, 12,5, 20')).toEqual([5, 10, 12.5, 20]);
    expect(leseZahlen('20;8 12,5 8')).toEqual([8, 12.5, 20]);
    expect(leseZahlen('')).toBeUndefined();
    expect(leseZahlen('5, x')).toBeUndefined();
    expect(leseZahlen('0, 5')).toBeUndefined();
  });

  it('schreibt Zahlen mit Dezimalkomma', () => {
    expect(zahlText(2.5)).toBe('2,5');
    expect(zahlText(24)).toBe('24');
    expect(zahlText(1.256)).toBe('1,26');
  });
});

describe('IDs', () => {
  it('bildet lesbare, eindeutige IDs', () => {
    expect(neueId('ort_', 'Büro Süd', [])).toBe('ort_buero_sued');
    expect(neueId('ort_', 'Park', ['ort_park', 'ort_park_2'])).toBe('ort_park_3');
    expect(neueId('ort_', '!!!', [])).toBe('ort_neu');
  });
});

describe('Orte und Equipment', () => {
  it('legt einen neuen Ort mit Tisch und Erhöhung an; der erste wird Standard', () => {
    const z = leer();
    const o = neuerOrt(z, 'Zuhause');
    expect(o).toMatchObject({ id: 'ort_zuhause', name: 'Zuhause', standard: true });
    expect(o.equipment.map((e) => e.utensilId).sort()).toEqual(['ERH', 'TISCH']);
    expect(neuerOrt({ ...z, orte: [o] }, 'Park').standard).toBe(false);
  });

  it('übersetzt die Zeile „Hantelbank“ in BANK bzw. SCHRAEG', () => {
    let o = neuerOrt(leer(), 'Zuhause');
    expect(hantelbank(o)).toBe('keine');
    o = mitHantelbank(o, 'flach');
    expect(o.equipment.some((e) => e.utensilId === 'BANK')).toBe(true);
    expect(hantelbank(o)).toBe('flach');
    o = mitHantelbank(o, 'verstellbar');
    expect(o.equipment.map((e) => e.utensilId)).toContain('SCHRAEG');
    expect(o.equipment.map((e) => e.utensilId)).not.toContain('BANK');
    expect(hantelbank(mitHantelbank(o, 'keine'))).toBe('keine');
  });

  it('macht genau einen Ort zum Standard', () => {
    const orte = mitStandard([ort(undefined, 'zuhause'), ort(['BAND'], 'unterwegs')], 'unterwegs');
    expect(orte.map((o) => o.standard)).toEqual([false, true]);
  });

  it('verlangt Pflichtangaben für Gewichte und Stufen', () => {
    let o = neuerOrt(leer(), 'Zuhause');
    for (const id of ['KH', 'BAND', 'MINI', 'KB', 'LH', 'STANGE']) o = mitUtensil(o, id, true);
    expect(pruefeOrt(o, []).map((f) => f.utensilId)).toEqual(['KH', 'BAND', 'MINI', 'KB', 'LH']);

    const kaputt = mitDetails(o, 'KH', { kurzhanteln: { modus: 'verstellbar', minKg: 10, maxKg: 4, schrittKg: 2 } });
    expect(pruefeOrt(kaputt, []).find((f) => f.utensilId === 'KH')?.text).toContain('Min. größer als Max.');
    const ohneSchritt = mitDetails(o, 'KH', { kurzhanteln: { modus: 'verstellbar', minKg: 2, maxKg: 24, schrittKg: Number.NaN } });
    expect(pruefeOrt(ohneSchritt, []).some((f) => f.utensilId === 'KH')).toBe(true);
    const ohneScheiben = mitDetails(o, 'LH', { langhantel: { stangeKg: 20, scheiben: [] } });
    expect(pruefeOrt(ohneScheiben, []).some((f) => f.utensilId === 'LH')).toBe(true);
  });

  it('prüft den Namen des Orts', () => {
    const zuhause = neuerOrt(leer(), 'Zuhause');
    expect(pruefeOrt({ ...zuhause, name: '  ' }, [])[0]?.text).toBe('Gib dem Ort einen Namen.');
    const zweiter = { ...zuhause, id: 'ort_x', name: 'zuhause ' };
    expect(pruefeOrt(zweiter, [zuhause])[0]?.text).toContain('gibt es schon');
    expect(pruefeOrt(zuhause, [zuhause])).toEqual([]);
  });

  it('Abnahme: Ort mit Kurzhanteln (verstellbar und feste Paare), Bändern und Bank ist gültig', () => {
    let o = neuerOrt(leer(), 'Zuhause');
    o = mitHantelbank(mitUtensil(mitUtensil(o, 'KH', true), 'BAND', true), 'verstellbar');
    o = mitDetails(o, 'BAND', { bandStufen: ['leicht', 'mittel', 'schwer'] });
    const verstellbar = mitDetails(o, 'KH', { kurzhanteln: { modus: 'verstellbar', minKg: 2.5, maxKg: 24, schrittKg: 2.5 } });
    const paare = mitDetails(o, 'KH', { kurzhanteln: { modus: 'paare', gewichteKg: leseZahlen('5, 10, 12,5, 20')! } });
    expect(pruefeOrt(verstellbar, [])).toEqual([]);
    expect(pruefeOrt(paare, [])).toEqual([]);
    const kb = mitDetails(mitUtensil(paare, 'KB', true), 'KB', { gewichteKg: [8, 16] });
    const lh = mitDetails(mitUtensil(kb, 'LH', true), 'LH', { langhantel: { stangeKg: 20, scheiben: [{ kg: 5, paare: 2 }] } });
    expect(pruefeOrt(lh, [])).toEqual([]);
  });

  it('zählt die am Ort möglichen Übungen, ohne Ausschlüsse zu berücksichtigen', () => {
    const z = leer();
    const nurTischErh = neuerOrt(z, 'Park');
    const mitKh = mitDetails(mitUtensil(nurTischErh, 'KH', true), 'KH',
      { kurzhanteln: { modus: 'paare', gewichteKg: [10] } });
    const basis = moeglicheUebungen(z, nurTischErh).length;
    expect(basis).toBeGreaterThan(0);
    expect(moeglicheUebungen(z, mitKh).length).toBeGreaterThan(basis);
    const ausgeschlossen = { ...z, einstellungen: [{ ...STANDARD_EINSTELLUNGEN, ausgeschlossen: ['liegestuetz'] }] };
    expect(moeglicheUebungen(ausgeschlossen, nurTischErh).length).toBe(basis);
  });

  it('meldet Muster ohne Variante und ohne Ersatz', () => {
    const z = leer();
    const mitTisch = neuerOrt(z, 'Park');
    expect(fehlendeMuster(z, mitTisch)).not.toContain('hZug');
    expect(fehlendeMuster(z, mitTisch)).not.toContain('vZug');   // Ersatz: Rudern unter dem Tisch
    const ganzLeer: Ort = { ...mitTisch, equipment: [] };
    expect(fehlendeMuster(z, ganzLeer)).toEqual(expect.arrayContaining(['hZug', 'vZug']));
    expect(fehlendeMuster(z, ganzLeer)).not.toContain('hDruck');
    const zuhause = ort();
    expect(fehlendeMuster(z, zuhause)).toEqual([]);
  });
});

describe('Eigene Utensilien', () => {
  it('legt ein eigenes Utensil an und prüft den Namen', () => {
    const z = leer();
    expect(neuesUtensil(z, ' Sandsack ')).toEqual({
      id: 'eigen_sandsack', name: 'Sandsack', details: 'keine', immerVorhanden: false, eigenes: true,
    });
    expect(pruefeUtensilName(z, '')).toBeDefined();
    expect(pruefeUtensilName(z, 'kurzhanteln')).toContain('gibt es schon');
    expect(pruefeUtensilName(z, 'Sandsack')).toBeUndefined();
  });

  it('gilt als genutzt, solange ein Ort oder eine eigene Übung es verwendet', () => {
    const sack = neuesUtensil(leer(), 'Sandsack');
    const z = { ...leer(), eigeneUtensilien: [sack] };
    expect(utensilGenutzt(z, sack.id)).toBe(false);
    expect(utensilGenutzt({ ...z, orte: [ort([sack.id])] }, sack.id)).toBe(true);
    const u = fertigeUebung(z, { ...entwurfAusVorlage(katalogUebung('kniebeuge')), name: 'Sandsack-Kniebeuge', equipment: [[sack.id]] });
    expect(utensilGenutzt({ ...z, eigeneUebungen: [u] }, sack.id)).toBe(true);
  });
});

describe('Eigene Übungen', () => {
  it('übernimmt alle Angaben der Vorlage, ohne Name und Video-Link', () => {
    const vorlage = { ...katalogUebung('kh_bankdruecken'), eigenerVideoLink: 'https://example.org/v' };
    const e = entwurfAusVorlage(vorlage);
    expect(e).toMatchObject({
      id: '', name: '', herkunft: 'eigene', muster: 'hDruck', primaer: ['Brust'], stufe: 5, lasttyp: 'Last',
      equipment: [['KH'], ['BANK', 'SCHRAEG']], anzahlGewichte: 2,
    });
    expect(e.eigenerVideoLink).toBeUndefined();
    e.equipment[0]!.push('KB');
    expect(vorlage.equipment[0]).toEqual(['KH']);
  });

  it('macht abhängige Felder stimmig', () => {
    const basis = entwurfAusVorlage(katalogUebung('plank'));
    expect(normalisiereUebung({ ...basis, lasttyp: 'Zeit' }).bereich.einheit).toBe('Sek.');
    expect(normalisiereUebung({ ...basis, lasttyp: 'KG' }).bereich.einheit).toBe('Wdh.');
    expect(normalisiereUebung({ ...basis, lasttyp: 'KG', unterstuetzend: true }).unterstuetzend).toBe(false);
    const kh = entwurfAusVorlage(katalogUebung('kh_curls'));
    expect(normalisiereUebung({ ...kh, lasttyp: 'KG' }).anzahlGewichte).toBeUndefined();
    expect(normalisiereUebung({ ...kh, anzahlGewichte: undefined }).anzahlGewichte).toBe(2);
    expect(normalisiereUebung({ ...kh, primaer: ['Bizeps'], sekundaer: ['Bizeps', 'Ruecken'] }).sekundaer).toEqual(['Ruecken']);
    expect(normalisiereUebung({ ...kh, equipment: [['KH', 'KH'], []] }).equipment).toEqual([['KH']]);
    expect(normalisiereUebung({ ...kh, equipment: [['KH'], ['BANK']] }).equipment).toEqual([['KH'], ['BANK', 'SCHRAEG']]);
  });

  it('prüft Name, Muskeln, Schwierigkeit, Bereich und Video-Link', () => {
    const z = leer();
    const basis = { ...entwurfAusVorlage(katalogUebung('kh_curls')), name: 'Hammercurls' };
    expect(pruefeEigeneUebung(z, basis)).toEqual([]);
    expect(pruefeEigeneUebung(z, { ...basis, name: '' })).toContain('Gib der Übung einen Namen.');
    expect(pruefeEigeneUebung(z, { ...basis, name: 'kurzhantel-curls' })[0]).toContain('gibt es schon');
    expect(pruefeEigeneUebung(z, { ...basis, primaer: [] })).toContain('Wähle mindestens einen Hauptmuskel.');
    expect(pruefeEigeneUebung(z, { ...basis, stufe: 11 })).toHaveLength(1);
    expect(pruefeEigeneUebung(z, { ...basis, bereich: { von: 15, bis: 10, einheit: 'Wdh.' } })).toHaveLength(1);
    expect(pruefeEigeneUebung(z, { ...basis, bereich: { von: Number.NaN, bis: 10, einheit: 'Wdh.' } })).toHaveLength(1);
    expect(pruefeEigeneUebung(z, { ...basis, eigenerVideoLink: 'youtube' })).toHaveLength(1);
    expect(pruefeEigeneUebung(z, { ...basis, eigenerVideoLink: 'https://youtu.be/abc' })).toEqual([]);
  });

  it('vergibt beim Speichern eine ID und die YouTube-Suche zum Namen', () => {
    const z = leer();
    const u = fertigeUebung(z, { ...entwurfAusVorlage(katalogUebung('kh_curls')), name: ' Hammercurls ' });
    expect(u).toMatchObject({ id: 'eigen_hammercurls', name: 'Hammercurls', herkunft: 'eigene' });
    expect(u.youtubeUrl).toBe(youtubeSuche('Hammercurls'));
    expect(youtubeSuche('Knieliegestütz')).toBe(katalogUebung('knieliegestuetz').youtubeUrl);
    const z2 = { ...z, eigeneUebungen: [u] };
    expect(fertigeUebung(z2, { ...u, name: 'Hammer-Curls' }).id).toBe('eigen_hammercurls');
    expect(fertigeUebung(z2, { ...entwurfAusVorlage(u), name: 'Hammercurls 2' }).id).toBe('eigen_hammercurls_2');
  });

  it('Abnahme: eine eigene Übung wird im Plan genutzt', () => {
    const z0 = zustand();
    const eigene = fertigeUebung(z0, { ...entwurfAusVorlage(katalogUebung('kh_bankdruecken')), name: 'Bankdrücken eng' });
    const z: AppZustand = {
      ...z0,
      eigeneUebungen: [eigene],
      einstellungen: [mitFavorit(z0.einstellungen[0]!, eigene.id, true)],
    };
    const einheit = erstelleEinheit(z, { jetzt: zeitpunkt(0, 18), ortId: 'zuhause', prognose: 3, morgenWieder: false, laenger: false });
    const ids = einheit.bloecke.flatMap((b) => b.positionen.map((p) => p.uebungId));
    expect(ids).toContain(eigene.id);
  });
});

describe('Löschen nur, solange nie genutzt', () => {
  const einheit = (ortId: string, uebungId: string): Einheit => ({
    id: 'e1', woche: '2026-W43', erstelltAm: '2026-10-20T10:00:00', status: 'geplant', ortId, fokus: 'ganz',
    format: 'klassisch', geschaetzteDauerMin: 40, aufwaermen: [],
    bloecke: [{ typ: 'einzeln', pauseSek: 90, positionen: [{ uebungId, saetze: 3, zielWdh: 10, ergebnisse: [] }] }],
  });

  it('erkennt genutzte Orte und Übungen', () => {
    const z = leer();
    expect(ortGenutzt(z, 'zuhause')).toBe(false);
    expect(uebungGenutzt(z, 'eigen_x')).toBe(false);
    const mit = { ...z, einheiten: [einheit('zuhause', 'eigen_x')] };
    expect(ortGenutzt(mit, 'zuhause')).toBe(true);
    expect(uebungGenutzt(mit, 'eigen_x')).toBe(true);
    expect(ortGenutzt({ ...z, zirkelErgebnisse: [{ zirkelId: 'sprint', ortId: 'park', datum: 'x', zeitSek: 1, varianten: [] }] }, 'park')).toBe(true);
    expect(uebungGenutzt({ ...z, varianten: [{ uebungId: 'eigen_y', zielWdh: 8, seitSteigerung: 2, schwerSerie: 0 }] }, 'eigen_y')).toBe(true);
    expect(uebungGenutzt({ ...z, maxTests: [{ id: 't', datum: 'x', muster: 'Knie', uebungId: 'eigen_z', ergebnis: 5, einheit: 'Wdh.' }] }, 'eigen_z')).toBe(true);
  });
});

describe('Favoriten, Ausschlüsse und Video-Links', () => {
  const e = STANDARD_EINSTELLUNGEN;

  it('Favorit und Ausschluss schließen sich aus', () => {
    const fav = mitFavorit(e, 'klimmzug', true);
    expect(fav.favoriten).toEqual(['klimmzug']);
    const aus = mitAusschluss(fav, 'klimmzug', true);
    expect(aus).toMatchObject({ favoriten: [], ausgeschlossen: ['klimmzug'] });
    expect(mitFavorit(aus, 'klimmzug', true)).toMatchObject({ favoriten: ['klimmzug'], ausgeschlossen: [] });
    expect(mitFavorit(fav, 'klimmzug', false).favoriten).toEqual([]);
  });

  it('eigener Video-Link hat Vorrang vor der YouTube-Suche', () => {
    const u = katalogUebung('klimmzug');
    expect(videoLinkVon(e, u)).toBe(u.youtubeUrl);
    const mit = mitVideoLink(e, u.id, ' https://youtu.be/abc ');
    expect(videoLinkVon(mit, u)).toBe('https://youtu.be/abc');
    const ohne = mitVideoLink(mit, u.id, undefined);
    expect(ohne.videoLinks).toBeUndefined();
    const eigene = { ...entwurfAusVorlage(u), eigenerVideoLink: 'https://example.org/x' };
    expect(videoLinkVon(e, eigene)).toBe('https://example.org/x');
  });

  it('räumt Verweise auf eine gelöschte Übung auf', () => {
    const voll = mitVideoLink(mitFavorit(e, 'eigen_x', true), 'eigen_x', 'https://example.org');
    const sauber = ohneUebung(mitAusschluss(voll, 'eigen_y', true), 'eigen_x');
    expect(sauber).toMatchObject({ favoriten: [], ausgeschlossen: ['eigen_y'] });
    expect(sauber.videoLinks).toBeUndefined();
  });
});

describe('Einschränkungen', () => {
  it('legt Sperren an, entfernt sie und prüft das Enddatum einschließlich', () => {
    const e = mitEinschraenkung(mitEinschraenkung(STANDARD_EINSTELLUNGEN, { typ: 'region', wert: 'schulter', bis: '2026-11-30' }),
      { typ: 'muster', wert: 'Knie' });
    expect(e.einschraenkungen).toEqual([
      { id: 'sperre_schulter', typ: 'region', wert: 'schulter', bis: '2026-11-30' },
      { id: 'sperre_knie', typ: 'muster', wert: 'Knie' },
    ]);
    const s = e.einschraenkungen[0]!;
    expect(sperreAktiv(s, '2026-11-30T20:00:00')).toBe(true);
    expect(sperreAktiv(s, '2026-12-01T08:00:00')).toBe(false);
    expect(sperreAktiv(e.einschraenkungen[1]!, '2030-01-01T00:00:00')).toBe(true);
    expect(ohneEinschraenkung(e, 'sperre_knie').einschraenkungen).toHaveLength(1);
  });
});
