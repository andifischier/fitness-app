// Orte und Equipment (Mockup 9). Änderungen gelten erst nach „Speichern“; ohne Pflichtangaben
// lässt sich der Ort nicht speichern.
import { useState, type ReactNode } from 'react';
import {
  loescheEigenesUtensil, loescheOrt, speichereEigenesUtensil, speichereOrt,
} from '../../daten/speichern';
import {
  equipmentVon, fehlendeMuster, hantelbank, hatDetails, leseZahl, leseZahlen, mitDetails, mitHantelbank, mitUtensil,
  moeglicheUebungen, neuerOrt, neuesUtensil, ortGenutzt, pruefeOrt, pruefeUtensilName, utensilGenutzt, zahlenText,
  zahlText, type Hantelbank,
} from '../../logik/einstellungen';
import { BAND_STUFEN, type AppZustand, type Ort, type OrtEquipment, type Utensil } from '../../logik/typen';
import {
  Auswahl, Chip, Fehler, Haekchen, Hinweis, Karte, Knopf, Laedt, Mehrfachauswahl, Schalter, Seite, Textfeld, Zahlenfeld,
} from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { BAND_NAMEN, MUSTER_FEHLT, utensilName } from '../../ui/texte';
import { useZustand } from '../../ui/useZustand';

// Die Zeile „Hantelbank“ steht für BANK und SCHRAEG.
const BANKZEILE = 'BANKZEILE';
const NEU = 'neu';

const txt = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? zahlText(n) : '');
const kg = (text: string) => leseZahl(text) ?? Number.NaN;

function zeilen(z: AppZustand): (Utensil | typeof BANKZEILE)[] {
  const liste: (Utensil | typeof BANKZEILE)[] = [];
  for (const u of [...z.katalog.utensilien, ...z.eigeneUtensilien]) {
    if (u.id === 'BANK') liste.push(BANKZEILE);
    else if (u.id !== 'SCHRAEG') liste.push(u);
  }
  return liste;
}

function untertitel(ort: Ort, u: Utensil, fehlt: boolean): string {
  const e = equipmentVon(ort, u.id);
  if (e && fehlt) return 'Angaben fehlen';
  if (u.id === 'KH') {
    const k = e?.kurzhanteln;
    if (!k) return 'Verstellbar oder feste Paare';
    return k.modus === 'verstellbar'
      ? `Verstellbar · ${txt(k.minKg)} bis ${txt(k.maxKg)} kg · Schritt ${txt(k.schrittKg)}`
      : `Feste Paare · ${zahlenText(k.gewichteKg)} kg`;
  }
  if (u.id === 'BAND' || u.id === 'MINI') {
    return e?.bandStufen?.length ? `Stufen: ${BAND_STUFEN.filter((s) => e.bandStufen!.includes(s)).map((s) => BAND_NAMEN[s]).join(', ')}` : 'Stufen angeben';
  }
  if (u.id === 'KB') return e?.gewichteKg?.length ? `${zahlenText(e.gewichteKg)} kg` : 'Gewichte angeben';
  if (u.id === 'LH') {
    const l = e?.langhantel;
    if (!l) return 'Stange und Scheiben angeben';
    return `Stange ${txt(l.stangeKg)} kg · Scheiben ${l.scheiben.map((s) => `${txt(s.kg)} kg (${s.paare} Paar)`).join(', ')}`;
  }
  if (u.immerVorhanden) return 'Meist vorhanden · keine Angaben nötig';
  return u.eigenes ? 'Eigenes Utensil · keine Angaben nötig' : 'Keine Angaben nötig';
}

const BANK_TEXT: Record<Hantelbank, string> = {
  keine: 'Flach oder verstellbar', flach: 'Flach', verstellbar: 'Verstellbar (flach und schräg)',
};

export function OrteSeite() {
  const z = useZustand();
  if (!z) return <Laedt />;
  return <OrteBearbeiten z={z} />;
}

// Im Onboarding: eigener Titel und Vorspann; „weiter“ folgt auf das Speichern (oder ohne Änderung).
export function OrteBearbeiten({ z, titel = 'Orte und Equipment', zurueck = '/einstellungen', vorspann, weiter }: {
  z: AppZustand; titel?: string; zurueck?: string; vorspann?: ReactNode; weiter?: () => void;
}) {
  const startOrt = z.orte.find((o) => o.standard) ?? z.orte[0];
  const [auswahl, setAuswahl] = useState<string>(startOrt?.id ?? NEU);
  const [entwurf, setEntwurf] = useState<Ort>(startOrt ?? neuerOrt(z, 'Zuhause'));
  const [geaendert, setGeaendert] = useState(false);
  // Offene Detailfenster; mehrere gleichzeitig, z. B. Kurzhanteln und Band.
  const [details, setDetails] = useState<string[]>([]);
  const [versuch, setVersuch] = useState(false);
  const [meldung, setMeldung] = useState<string>();
  const [version, setVersion] = useState(0);         // setzt Eingabefelder beim Ortswechsel zurück
  const [utensilName_, setUtensilName] = useState<string>();
  const [utensilFehler, setUtensilFehler] = useState<string>();

  const gespeichert = z.orte.find((o) => o.id === entwurf.id);
  const fehler = pruefeOrt(entwurf, z.orte);
  const fehltBei = new Set(fehler.map((f) => f.utensilId).filter(Boolean));
  const anzahl = moeglicheUebungen(z, entwurf).length;
  const fehlend = fehlendeMuster(z, entwurf);

  const aendere = (o: Ort) => { setEntwurf(o); setGeaendert(true); setMeldung(undefined); };
  const wechsle = (id: string) => {
    if (id === auswahl) return;
    if (geaendert && !window.confirm('Änderungen an diesem Ort verwerfen?')) return;
    const o = id === NEU ? neuerOrt(z, '') : z.orte.find((x) => x.id === id)!;
    setAuswahl(id);
    setEntwurf(o);
    setGeaendert(false);
    setDetails([]);
    setVersuch(false);
    setMeldung(undefined);
    setVersion((v) => v + 1);
  };
  const zeigeDetailsVon = (id: string, offen: boolean) =>
    setDetails((d) => (offen ? (d.includes(id) ? d : [...d, id]) : d.filter((x) => x !== id)));
  const umschalten = (u: Utensil | typeof BANKZEILE) => {
    if (u === BANKZEILE) {
      const an = hantelbank(entwurf) !== 'keine';
      aendere(mitHantelbank(entwurf, an ? 'keine' : 'flach'));
      zeigeDetailsVon(BANKZEILE, !an);
      return;
    }
    const an = !!equipmentVon(entwurf, u.id);
    aendere(mitUtensil(entwurf, u.id, !an));
    zeigeDetailsVon(u.id, !an && hatDetails(u.id));
  };
  const speichern = async () => {
    if (weiter && !geaendert && gespeichert) { weiter(); return; }
    setVersuch(true);
    if (fehler.length > 0) return;
    const o = { ...entwurf, name: entwurf.name.trim() };
    await speichereOrt(o);
    setEntwurf(o);
    setAuswahl(o.id);
    setGeaendert(false);
    setVersuch(false);
    setMeldung('Gespeichert.');
    weiter?.();
  };
  const loeschen = async () => {
    if (!gespeichert || !window.confirm(`Ort „${gespeichert.name}“ löschen?`)) return;
    if (await loescheOrt(gespeichert.id)) {
      const rest = z.orte.filter((o) => o.id !== gespeichert.id);
      const naechster = rest.find((o) => o.standard) ?? rest[0];
      setGeaendert(false);
      setAuswahl(naechster?.id ?? NEU);
      setEntwurf(naechster ?? neuerOrt({ ...z, orte: [] }, ''));
      setDetails([]);
      setVersion((v) => v + 1);
    }
  };
  const utensilAnlegen = async () => {
    const name = utensilName_ ?? '';
    const problem = pruefeUtensilName(z, name);
    if (problem) { setUtensilFehler(problem); return; }
    const u = neuesUtensil(z, name);
    await speichereEigenesUtensil(u);
    aendere(mitUtensil(entwurf, u.id, true));
    setUtensilName(undefined);
    setUtensilFehler(undefined);
  };

  const ortChips = [...z.orte].sort((a, b) => Number(b.standard) - Number(a.standard));
  // Detailfenster in der Reihenfolge der Liste, nicht des Anklickens.
  const detailUtensilien = z.katalog.utensilien.filter((u) => details.includes(u.id) && equipmentVon(entwurf, u.id));

  return (
    <Seite titel={titel} zurueck={zurueck}>
      {vorspann}
      <div className="flex flex-wrap gap-2">
        {ortChips.map((o) => (
          <Chip key={o.id} aktiv={auswahl === o.id} onClick={() => wechsle(o.id)}>
            {o.name}{o.standard ? ' · Standard' : ''}
          </Chip>
        ))}
        {auswahl === NEU ? (
          <Chip aktiv onClick={() => undefined}>Neuer Ort</Chip>
        ) : (
          <button type="button" onClick={() => wechsle(NEU)}
            className="flex min-h-touch items-center gap-1 rounded-xl border border-dashed border-gedaempft px-3 text-basis text-akzent">
            <Icon name="plus" groesse={18} /> Ort
          </button>
        )}
      </div>

      <Karte>
        <div className="flex flex-col gap-3">
          <Textfeld label="Name des Orts" wert={entwurf.name} platzhalter="z. B. Zuhause, Unterwegs, Park"
            onChange={(name) => aendere({ ...entwurf, name })} />
          {gespeichert?.standard ? (
            <Hinweis>Das ist dein Standardort. Er ist vor jedem Training vorausgewählt.</Hinweis>
          ) : (
            <Schalter titel="Als Standardort verwenden" hinweis="Vor jedem Training vorausgewählt."
              an={entwurf.standard} onChange={(standard) => aendere({ ...entwurf, standard })} />
          )}
        </div>
      </Karte>

      <section className="rounded-karte border border-rand bg-flaeche px-5">
        <ul>
          {zeilen(z).map((u) => {
            const id = u === BANKZEILE ? BANKZEILE : u.id;
            const an = u === BANKZEILE ? hantelbank(entwurf) !== 'keine' : !!equipmentVon(entwurf, u.id);
            const titel = u === BANKZEILE ? 'Hantelbank' : utensilName(u);
            const fehlt = u !== BANKZEILE && fehltBei.has(u.id);
            const unter = u === BANKZEILE ? BANK_TEXT[hantelbank(entwurf)] : untertitel(entwurf, u, fehlt);
            const zeigeDetails = an && (u === BANKZEILE || hatDetails(u.id));
            const loeschbar = u !== BANKZEILE && u.eigenes && !an && !utensilGenutzt(z, u.id);
            return (
              <li key={id} className="flex items-center gap-4 border-b border-linie py-4 last:border-b-0">
                <button type="button" role="checkbox" aria-checked={an} onClick={() => umschalten(u)}
                  className="flex min-h-touch flex-1 items-center gap-4 text-left">
                  <Haekchen an={an} />
                  <span>
                    <span className="block text-gross font-semibold">{titel}</span>
                    <span className={`block text-hinweis ${fehlt && versuch ? 'font-bold text-text' : 'text-gedaempft'}`}>{unter}</span>
                  </span>
                </button>
                {zeigeDetails && (
                  <Knopf art="schlicht" onClick={() => zeigeDetailsVon(id, !details.includes(id))}>Details</Knopf>
                )}
                {loeschbar && (
                  <Knopf art="schlicht" onClick={() => void loescheEigenesUtensil(u.id)}>Löschen</Knopf>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {details.includes(BANKZEILE) && hantelbank(entwurf) !== 'keine' && (
        <Karte titel="Hantelbank, Details" hinweis="Eine verstellbare Bank kann auch flach genutzt werden.">
          <Auswahl spalten={2} wert={hantelbank(entwurf)} onChange={(w) => aendere(mitHantelbank(entwurf, w))}
            optionen={[{ wert: 'flach', text: 'Flach' }, { wert: 'verstellbar', text: 'Verstellbar' }]} />
        </Karte>
      )}
      {detailUtensilien.map((u) => (
        <Karte key={`${version}-${u.id}`} titel={`${utensilName(u)}, Details`}>
          <Details e={equipmentVon(entwurf, u.id)!}
            onChange={(teil) => aendere(mitDetails(entwurf, u.id, teil))} />
        </Karte>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <Hinweis>{anzahl === 1 ? '1 Übung' : `${anzahl} Übungen`} an diesem Ort möglich</Hinweis>
        {utensilName_ === undefined && (
          <Knopf art="schlicht" onClick={() => setUtensilName('')}>+ Eigenes Utensil</Knopf>
        )}
      </div>
      {utensilName_ !== undefined && (
        <Karte titel="Eigenes Utensil" hinweis="Danach kannst du es eigenen Übungen zuordnen.">
          <div className="flex flex-col gap-3">
            <Textfeld label="Name" wert={utensilName_} platzhalter="z. B. Sandsack" onChange={setUtensilName} />
            {utensilFehler && <Fehler meldungen={[utensilFehler]} />}
            <div className="flex gap-3">
              <Knopf onClick={() => void utensilAnlegen()}>Hinzufügen</Knopf>
              <Knopf art="sekundaer" onClick={() => { setUtensilName(undefined); setUtensilFehler(undefined); }}>Abbrechen</Knopf>
            </div>
          </div>
        </Karte>
      )}
      {fehlend.length > 0 && (
        <div className="flex flex-col gap-1">
          {fehlend.map((m) => <Hinweis key={m}>Für {MUSTER_FEHLT[m]} fehlt Equipment.</Hinweis>)}
        </div>
      )}

      {versuch && <Fehler meldungen={fehler.map((f) => f.text)} />}
      {meldung && <p role="status" className="text-basis font-semibold text-akzent">{meldung}</p>}
      <Knopf onClick={() => void speichern()} deaktiviert={!geaendert && !!gespeichert && !weiter}>
        {weiter ? (geaendert || !gespeichert ? 'Speichern und weiter' : 'Weiter') : gespeichert ? 'Speichern' : 'Ort anlegen'}
      </Knopf>
      {gespeichert && <OrtLoeschen z={z} ort={gespeichert} onLoeschen={() => void loeschen()} />}
    </Seite>
  );
}

function OrtLoeschen({ z, ort, onLoeschen }: { z: AppZustand; ort: Ort; onLoeschen: () => void }) {
  if (ort.standard) return <Hinweis>Den Standardort kannst du nicht löschen. Mache vorher einen anderen Ort zum Standard.</Hinweis>;
  if (ortGenutzt(z, ort.id)) return <Hinweis>Hier hast du schon trainiert, daher bleibt der Ort im Verlauf. Du kannst ihn umbenennen.</Hinweis>;
  return <Knopf art="sekundaer" onClick={onLoeschen}>Ort löschen</Knopf>;
}

// Detailangaben je Utensil; Eingaben bleiben als Text stehen, bis sie gültig sind.
function Details({ e, onChange }: { e: OrtEquipment; onChange: (teil: Omit<Partial<OrtEquipment>, 'utensilId'>) => void }) {
  if (e.utensilId === 'KH') return <KurzhantelDetails e={e} onChange={onChange} />;
  if (e.utensilId === 'BAND' || e.utensilId === 'MINI') {
    return (
      <div className="flex flex-col gap-3">
        <Hinweis>Welche Stufen hast du?</Hinweis>
        <Mehrfachauswahl werte={e.bandStufen ?? []}
          onChange={(w) => onChange({ bandStufen: BAND_STUFEN.filter((s) => w.includes(s)) })}
          optionen={BAND_STUFEN.map((s) => ({ wert: s, text: BAND_NAMEN[s] }))} />
      </div>
    );
  }
  if (e.utensilId === 'KB') {
    return (
      <ListenFeld label="Gewichte in kg" start={zahlenText(e.gewichteKg ?? [])}
        hinweis="Als Liste, z. B. 8, 12, 16." onWerte={(gewichteKg) => onChange({ gewichteKg })} />
    );
  }
  if (e.utensilId === 'LH') return <LanghantelDetails e={e} onChange={onChange} />;
  return null;
}

function ListenFeld({ label, start, hinweis, onWerte }: {
  label: string; start: string; hinweis: string; onWerte: (werte: number[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Zahlenfeld label={label} start={start}
        onText={(t) => onWerte(t.trim() === '' ? [] : leseZahlen(t) ?? [Number.NaN])} />
      <Hinweis>{hinweis}</Hinweis>
    </div>
  );
}

function KurzhantelDetails({ e, onChange }: { e: OrtEquipment; onChange: (teil: Partial<OrtEquipment>) => void }) {
  const k = e.kurzhanteln;
  const modus = k?.modus ?? 'verstellbar';
  const setzeModus = (m: 'verstellbar' | 'paare') => {
    if (m === modus && k) return;
    onChange({
      kurzhanteln: m === 'verstellbar'
        ? { modus: 'verstellbar', minKg: Number.NaN, maxKg: Number.NaN, schrittKg: Number.NaN }
        : { modus: 'paare', gewichteKg: [] },
    });
  };
  const v = k?.modus === 'verstellbar' ? k : { modus: 'verstellbar' as const, minKg: Number.NaN, maxKg: Number.NaN, schrittKg: Number.NaN };
  return (
    <div className="flex flex-col gap-4">
      <Auswahl spalten={2} wert={modus} onChange={setzeModus}
        optionen={[{ wert: 'verstellbar', text: 'Verstellbar' }, { wert: 'paare', text: 'Feste Paare' }]} />
      {modus === 'verstellbar' ? (
        <div key="verstellbar" className="grid grid-cols-3 gap-3">
          <Zahlenfeld label="Min. kg" start={txt(v.minKg)} onText={(t) => onChange({ kurzhanteln: { ...v, minKg: kg(t) } })} />
          <Zahlenfeld label="Max. kg" start={txt(v.maxKg)} onText={(t) => onChange({ kurzhanteln: { ...v, maxKg: kg(t) } })} />
          <Zahlenfeld label="Schritt kg" start={txt(v.schrittKg)} onText={(t) => onChange({ kurzhanteln: { ...v, schrittKg: kg(t) } })} />
        </div>
      ) : (
        <ListenFeld key="paare" label="Gewichte je Paar in kg"
          start={k?.modus === 'paare' ? zahlenText(k.gewichteKg) : ''}
          hinweis="Als Liste, z. B. 5, 10, 12,5, 20."
          onWerte={(gewichteKg) => onChange({ kurzhanteln: { modus: 'paare', gewichteKg } })} />
      )}
    </div>
  );
}

interface ScheibenZeile { nr: number; kg: string; paare: string }

function LanghantelDetails({ e, onChange }: { e: OrtEquipment; onChange: (teil: Partial<OrtEquipment>) => void }) {
  const l = e.langhantel;
  const [stange, setStange] = useState(txt(l?.stangeKg));
  const [scheiben, setScheiben] = useState<ScheibenZeile[]>(
    l && l.scheiben.length > 0
      ? l.scheiben.map((s, i) => ({ nr: i, kg: txt(s.kg), paare: String(s.paare) }))
      : [{ nr: 0, kg: '', paare: '' }],
  );
  const melde = (st: string, sch: ScheibenZeile[]) => onChange({
    langhantel: {
      stangeKg: kg(st),
      scheiben: sch.filter((s) => s.kg.trim() !== '' || s.paare.trim() !== '')
        .map((s) => ({ kg: kg(s.kg), paare: leseZahl(s.paare) ?? Number.NaN })),
    },
  });
  const setzeZeile = (nr: number, teil: Partial<ScheibenZeile>) => {
    const neu = scheiben.map((s) => (s.nr === nr ? { ...s, ...teil } : s));
    setScheiben(neu);
    melde(stange, neu);
  };
  const entferne = (nr: number) => {
    const neu = scheiben.filter((s) => s.nr !== nr);
    setScheiben(neu);
    melde(stange, neu);
  };
  return (
    <div className="flex flex-col gap-4">
      <Zahlenfeld label="Stange kg" start={stange} onText={(t) => { setStange(t); melde(t, scheiben); }} />
      <Hinweis>Scheiben: Gewicht einer Scheibe und Anzahl Paare.</Hinweis>
      {scheiben.map((s) => (
        <div key={s.nr} className="flex items-end gap-3">
          <Zahlenfeld label="Scheibe kg" start={s.kg} onText={(t) => setzeZeile(s.nr, { kg: t })} />
          <Zahlenfeld label="Paare" start={s.paare} onText={(t) => setzeZeile(s.nr, { paare: t })} />
          <button type="button" aria-label="Scheibe entfernen" onClick={() => entferne(s.nr)}
            className="flex size-touch shrink-0 items-center justify-center text-gedaempft">
            <Icon name="kreuz" groesse={20} />
          </button>
        </div>
      ))}
      <Knopf art="schlicht"
        onClick={() => setScheiben([...scheiben, { nr: Math.max(-1, ...scheiben.map((s) => s.nr)) + 1, kg: '', paare: '' }])}>
        + Scheibe
      </Knopf>
    </div>
  );
}
