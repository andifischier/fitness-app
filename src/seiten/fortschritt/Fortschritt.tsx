// Fortschritt (Mockup 8) mit Unterreitern Übersicht und Verlauf: Max-Test-Verlauf je Muster, Sätze
// pro Woche für alle Muskeln mit Entlastungswochen, Zirkel-Bestzeiten; Verlauf aller Einheiten mit
// Detailansicht.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { lokaleZeit } from '../../daten/zeit';
import {
  achse, dauerSek, maxTestReihen, saetzeVon, verlauf, verlaufUebungen, wochenvolumen, zirkelBestzeiten,
  type MaxTestReihe, type Wochenvolumen,
} from '../../logik/fortschritt';
import type { AppZustand, Einheit } from '../../logik/typen';
import { einheitZeit, uebungVon } from '../../logik/verlauf';
import { Chip, Hinweis, Karte, Laedt, Seite } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import {
  datumLang, datumText, einheitName, entlastungText, FEEDBACK_NAMEN, kwText, monatKurz, MUSKEL_NAMEN, saetzeText,
  saetzeZeile, seitStartText, zeitText,
} from '../../ui/texte';
import { useZustand } from '../../ui/useZustand';

const LEER = 'Nach deiner ersten Einheit siehst du hier deinen Fortschritt.';

function Unterreiter({ aktiv }: { aktiv: 'uebersicht' | 'verlauf' }) {
  const reiter = (id: 'uebersicht' | 'verlauf', zu: string, text: string) => (
    <Link to={zu} replace aria-current={aktiv === id ? 'true' : undefined}
      className={`flex min-h-touch flex-1 items-center justify-center rounded-xl text-gross ${
        aktiv === id ? 'bg-flaeche font-bold text-text shadow-sm' : 'font-semibold text-gedaempft'}`}>
      {text}
    </Link>
  );
  return (
    <nav aria-label="Unterreiter" className="flex gap-1 rounded-karte bg-linie p-1">
      {reiter('uebersicht', '/fortschritt', 'Übersicht')}
      {reiter('verlauf', '/fortschritt/verlauf', 'Verlauf')}
    </nav>
  );
}

// ---------- Übersicht ----------

export function FortschrittSeite() {
  const z = useZustand();
  const [jetzt] = useState(lokaleZeit);
  return (
    <Seite titel="Fortschritt">
      <Unterreiter aktiv="uebersicht" />
      {!z ? <Hinweis>Lädt …</Hinweis> : <Uebersicht z={z} jetzt={jetzt} />}
    </Seite>
  );
}

function Uebersicht({ z, jetzt }: { z: AppZustand; jetzt: string }) {
  const daten = useMemo(() => ({
    reihen: maxTestReihen(z), volumen: wochenvolumen(z, jetzt), zirkel: zirkelBestzeiten(z), einheiten: verlauf(z).length,
  }), [z, jetzt]);
  const { reihen, volumen, zirkel, einheiten } = daten;
  if (einheiten === 0 && reihen.length === 0) return <p className="text-basis text-gedaempft">{LEER}</p>;
  return (
    <>
      {reihen.length > 0 && <MaxTests z={z} reihen={reihen} />}
      {volumen && <SaetzeProWoche volumen={volumen} />}
      {zirkel.length > 0 && (
        <Karte titel="Zirkel-Bestzeiten">
          <ul>
            {zirkel.map((b) => (
              <li key={`${b.zirkelId}|${b.ortId}|${b.varianten.join()}`}
                className="flex items-center justify-between gap-4 border-b border-linie py-3 first:pt-0 last:border-b-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-basis font-semibold">{z.katalog.zirkel.find((x) => x.id === b.zirkelId)?.name ?? 'Zirkel'}</span>
                  <span className="block text-hinweis text-gedaempft">
                    {z.orte.find((o) => o.id === b.ortId)?.name ?? 'Gelöschter Ort'} · {datumText(b.datum)}
                  </span>
                  {b.abweichend.length > 0 && (
                    <span className="block text-hinweis text-gedaempft">
                      mit {b.abweichend.map((id) => uebungVon(z, id)?.name ?? id).join(', ')}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-gross font-bold">{zeitText(b.zeitSek)}</span>
              </li>
            ))}
          </ul>
        </Karte>
      )}
    </>
  );
}

function MaxTests({ z, reihen }: { z: AppZustand; reihen: MaxTestReihe[] }) {
  const [wahl, setWahl] = useState(0);
  const reihe = reihen[Math.min(wahl, reihen.length - 1)]!;
  const name = (r: MaxTestReihe) => uebungVon(z, r.uebungId)?.name ?? r.uebungId;
  return (
    <section className="rounded-karte border border-rand bg-flaeche p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-gross font-bold">Max-Test {name(reihe)}</h2>
        {reihe.punkte.length > 1 && (
          <span className={`shrink-0 text-basis font-bold ${reihe.seitStart >= 0 ? 'text-akzent' : 'text-gedaempft'}`}>
            {seitStartText(reihe.seitStart, reihe.einheit)}
          </span>
        )}
      </div>
      {reihen.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {reihen.map((r, i) => (
            <Chip key={`${r.muster}|${r.uebungId}`} aktiv={r === reihe} onClick={() => setWahl(i)}>{name(r)}</Chip>
          ))}
        </div>
      )}
      <Verlaufslinie reihe={reihe} />
    </section>
  );
}

// Liniendiagramm als Inline-SVG: Punkte gleichmäßig verteilt, Monate darunter, letzter Wert beschriftet.
function Verlaufslinie({ reihe }: { reihe: MaxTestReihe }) {
  const B = 320, H = 190, links = 34, rechts = 14, oben = 26, unten = 30;
  const werte = reihe.punkte.map((p) => p.wert);
  const { min, max, linien } = achse(werte);
  const n = reihe.punkte.length;
  const x = (i: number) => (n === 1 ? (links + B - rechts) / 2 : links + 14 + (i * (B - rechts - links - 28)) / (n - 1));
  const y = (w: number) => oben + ((max - w) * (H - oben - unten)) / (max - min);
  const einheit = reihe.einheit === 'Sek.' ? ' Sek.' : ' Wdh.';
  const beschreibung = reihe.punkte.map((p) => `${datumText(p.datum)}: ${p.wert}${einheit}`).join(', ');
  const letzter = reihe.punkte.at(-1)!;
  return (
    <svg viewBox={`0 0 ${B} ${H}`} className="mt-4 w-full" role="img" aria-label={beschreibung}>
      {linien.map((w) => (
        <g key={w}>
          <line x1={links} x2={B - rechts / 2} y1={y(w)} y2={y(w)} stroke="var(--color-linie)" strokeWidth="1.5" />
          <text x={links - 8} y={y(w) + 4} textAnchor="end" fontSize="12" fill="var(--color-gedaempft)">{w}</text>
        </g>
      ))}
      {n > 1 && (
        <polyline fill="none" stroke="var(--color-akzent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
          points={reihe.punkte.map((p, i) => `${x(i)},${y(p.wert)}`).join(' ')} />
      )}
      {reihe.punkte.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.wert)} r={i === n - 1 ? 6 : 4.5} fill="var(--color-akzent)" />
      ))}
      <text x={x(n - 1)} y={y(letzter.wert) - 12} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--color-text)">
        {letzter.wert}
      </text>
      {reihe.punkte.map((p, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--color-gedaempft)">{monatKurz(p.datum)}</text>
      ))}
    </svg>
  );
}

// Sätze pro Woche für alle Muskeln untereinander (Entscheidung 21.10.2026), je 6 Wochen; die laufende
// Woche dunkel, Wochenbeschriftung einmal unten.
function SaetzeProWoche({ volumen }: { volumen: Wochenvolumen }) {
  const { wochen, ziele, muskeln } = volumen;
  const spalten = { gridTemplateColumns: `repeat(${wochen.length}, minmax(0, 1fr))` };
  const entlastungen = wochen.filter((w) => w.entlastung);
  return (
    <section className="rounded-karte border border-rand bg-flaeche p-5">
      <h2 className="text-gross font-bold">Sätze pro Woche</h2>
      <div className="mt-1 flex flex-col">
        {muskeln.map((m) => {
          const groesster = Math.max(ziele[m], ...wochen.map((w) => w.erledigt[m]), 1);
          return (
            <div key={m} className="border-b border-linie py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-basis font-semibold">{MUSKEL_NAMEN[m]}</h3>
                <span className="text-hinweis text-gedaempft">Ziel {ziele[m]}</span>
              </div>
              <div className="mt-2 grid items-end gap-2" style={spalten}>
                {wochen.map((w) => {
                  const wert = w.erledigt[m];
                  return (
                    <div key={w.woche} className="flex flex-col items-center gap-1">
                      <div className="flex h-12 w-full items-end" aria-hidden="true">
                        <div className={`w-full rounded-md ${wert <= 0 ? 'bg-linie' : w.aktuell ? 'bg-akzent' : 'bg-akzent/55'}`}
                          style={{ height: wert <= 0 ? 3 : `${Math.max(8, (wert / groesster) * 100)}%` }} />
                      </div>
                      <span className={`text-klein ${w.aktuell ? 'font-bold text-text' : 'text-gedaempft'}`}
                        aria-label={`${kwText(w.woche)}: ${saetzeText(wert)} Sätze`}>
                        {saetzeText(wert)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid gap-2 border-t border-linie pt-2" style={spalten} aria-hidden="true">
        {wochen.map((w) => (
          <span key={w.woche} className={`text-center text-klein ${w.aktuell ? 'font-bold text-text' : 'text-gedaempft'}`}>
            {kwText(w.woche)}
          </span>
        ))}
      </div>
      {entlastungen.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {entlastungen.map((w) => (
            <p key={w.woche} className="text-basis text-gedaempft">{entlastungText(w.woche, w.einheiten, w.erholungswoche)}</p>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Verlauf ----------

const minutenText = (e: Einheit) => {
  const sek = dauerSek(e);
  return sek === undefined ? undefined : `${Math.max(1, Math.round(sek / 60))} Min`;
};

export function VerlaufSeite() {
  const z = useZustand();
  const liste = useMemo(() => (z ? verlauf(z) : []), [z]);
  return (
    <Seite titel="Fortschritt">
      <Unterreiter aktiv="verlauf" />
      {!z ? <Hinweis>Lädt …</Hinweis> : liste.length === 0 ? <p className="text-basis text-gedaempft">{LEER}</p> : (
        <ul className="rounded-karte border border-rand bg-flaeche px-5">
          {liste.map((e) => (
            <li key={e.id} className="border-b border-linie last:border-b-0">
              <Link to={`/fortschritt/einheit/${e.id}`} className="flex min-h-[64px] items-center gap-3 py-3">
                <span className="flex-1">
                  <span className="block text-gross font-semibold">{einheitName(z, e)}</span>
                  <span className="block text-hinweis text-gedaempft">
                    {[datumLang(einheitZeit(e)), minutenText(e), `${saetzeVon(e)} ${saetzeVon(e) === 1 ? 'Satz' : 'Sätze'}`,
                      e.status === 'abgebrochen' ? 'vorzeitig beendet' : undefined].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Seite>
  );
}

function Angabe({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-linie py-2 last:border-b-0">
      <span className="text-hinweis text-gedaempft">{titel}</span>
      <span className="text-right text-basis">{wert}</span>
    </div>
  );
}

// Eine Einheit: Datum, Ort, Dauer, alle Übungen mit Sätzen, Last und Feedback, Gesamtanstrengung, Notiz.
export function EinheitSeite() {
  const z = useZustand();
  const { id = '' } = useParams();
  if (!z) return <Laedt />;
  const e = verlauf(z).find((x) => x.id === id);
  if (!e) {
    return <Seite titel="Einheit" zurueck="/fortschritt/verlauf"><Hinweis>Diese Einheit gibt es nicht.</Hinweis></Seite>;
  }
  const ort = z.orte.find((o) => o.id === e.ortId);
  const dauer = minutenText(e);
  const uebungen = verlaufUebungen(e);
  return (
    <Seite titel={einheitName(z, e)} zurueck="/fortschritt/verlauf">
      <Karte>
        <Angabe titel="Datum" wert={`${datumLang(einheitZeit(e))} ${einheitZeit(e).slice(0, 4)}`} />
        <Angabe titel="Ort" wert={ort?.name ?? 'Gelöschter Ort'} />
        {e.format === 'zirkel' && dauerSek(e) !== undefined
          ? <Angabe titel="Zeit" wert={zeitText(dauerSek(e)!)} />
          : dauer && <Angabe titel="Dauer" wert={dauer} />}
        <Angabe titel="Sätze" wert={String(saetzeVon(e))} />
        {e.gesamtbewertung !== undefined && <Angabe titel="Gesamtanstrengung" wert={`${e.gesamtbewertung} von 5`} />}
        {e.status === 'abgebrochen' && <Angabe titel="Status" wert="vorzeitig beendet" />}
      </Karte>
      {uebungen.length > 0 && (
        <ul className="rounded-karte border border-rand bg-flaeche px-5">
          {uebungen.map(({ position: p, feedback }, i) => {
            const u = uebungVon(z, p.uebungId);
            return (
              <li key={i} className="border-b border-linie py-3 last:border-b-0">
                <span className="block text-basis font-semibold">{p.istMaxTest ? 'Max-Test: ' : ''}{u?.name ?? p.uebungId}</span>
                {u && <span className="block text-basis">{saetzeZeile(u, p)}</span>}
                {feedback && <span className="block text-hinweis text-gedaempft">Feedback: {FEEDBACK_NAMEN[feedback]}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {e.notiz && <Karte titel="Notiz"><p className="whitespace-pre-wrap text-basis">{e.notiz}</p></Karte>}
    </Seite>
  );
}
