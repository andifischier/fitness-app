// Blätter von unten (wie „Tauschen“ in Mockup 3): Tauschen mit Vorschlägen und Übung wählen mit Suche.
// Genutzt in Vorschau, Heute, Training und im Workout-Editor.
import { useState, type ReactNode } from 'react';
import { alternativen } from '../logik/planung';
import { MUSTER_IDS, type AppZustand, type Einheit, type Uebung } from '../logik/typen';
import { uebungVon } from '../logik/verlauf';
import { Hinweis } from './bausteine';
import { Icon } from './Icon';
import { lastText, MUSTER_NAMEN } from './texte';

export function suche(liste: Uebung[], text: string): Uebung[] {
  const t = text.trim().toLowerCase();
  return t === '' ? liste : liste.filter((u) => u.name.toLowerCase().includes(t));
}

// Übungen je Muster in der Reihenfolge der Muster, innerhalb nach Stufe (Katalogreihenfolge bei Gleichstand).
export function nachMuster(liste: Uebung[]): [Uebung['muster'], Uebung[]][] {
  return MUSTER_IDS
    .map((m) => [m, liste.filter((u) => u.muster === m).sort((a, b) => a.stufe - b.stufe)] as [Uebung['muster'], Uebung[]])
    .filter(([, l]) => l.length > 0);
}

export function Blatt({ titel, onSchliessen, children }: { titel: string; onSchliessen: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-text/40" onClick={onSchliessen}>
      <section role="dialog" aria-modal="true" aria-label={titel} onClick={(ev) => ev.stopPropagation()}
        className="mx-auto max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-karte bg-flaeche px-seite pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-screen font-extrabold">{titel}</h2>
          <button type="button" aria-label="Schließen" onClick={onSchliessen} className="flex size-touch items-center justify-center">
            <Icon name="kreuz" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

// Tauschen in einer Einheit: Alternativen derselben Art, die am Ort möglich sind, mit Ziel und Last.
export function TauschBlatt({ z, einheit, block, position, onWahl, onSchliessen }: {
  z: AppZustand; einheit: Einheit; block: number; position: number; onWahl: (uebungId: string) => void; onSchliessen: () => void;
}) {
  const p = einheit.bloecke[block]?.positionen[position];
  const aktuell = p && uebungVon(z, p.uebungId);
  const zirkel = einheit.bloecke[block]?.typ === 'zirkel';
  const liste = alternativen(z, einheit, block, position);
  return (
    <Blatt titel="Tauschen" onSchliessen={onSchliessen}>
      <Hinweis>Statt {aktuell?.name}. Nur Übungen derselben Art, die hier möglich sind.</Hinweis>
      {liste.length === 0 && <p className="mt-4 text-basis">Hier gibt es keine Alternative.</p>}
      <ul className="mt-3">
        {liste.map((a) => {
          const u = uebungVon(z, a.uebungId);
          if (!u) return null;
          const ziel = zirkel ? undefined : u.bereich.einheit === 'Sek.' ? `Ziel ${a.zielWdh} Sek.` : `Ziel ${a.zielWdh}`;
          return (
            <li key={a.uebungId} className="border-b border-linie last:border-b-0">
              <button type="button" onClick={() => onWahl(a.uebungId)} className="flex min-h-[60px] w-full flex-col justify-center py-3 text-left">
                <span className="text-gross font-semibold">{u.name}</span>
                <span className="text-basis text-gedaempft">{[ziel, lastText(u, a)].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Blatt>
  );
}

// Übung wählen: Suche, Liste nach Muster; optional oben Vorschläge (z. B. zum Ersetzen im Workout).
export function UebungWahl({ titel, hinweis, uebungen, vorschlaege = [], onWahl, onSchliessen }: {
  titel: string; hinweis?: string; uebungen: Uebung[]; vorschlaege?: Uebung[];
  onWahl: (uebungId: string) => void; onSchliessen: () => void;
}) {
  const [text, setText] = useState('');
  const treffer = suche(uebungen, text);
  const zeile = (u: Uebung) => (
    <li key={u.id} className="border-b border-linie last:border-b-0">
      <button type="button" onClick={() => onWahl(u.id)} className="flex min-h-[56px] w-full items-center py-3 text-left text-basis font-semibold">
        {u.name}
      </button>
    </li>
  );
  return (
    <Blatt titel={titel} onSchliessen={onSchliessen}>
      {hinweis && <Hinweis>{hinweis}</Hinweis>}
      <label className="relative mt-3 block">
        <span className="sr-only">Übung suchen</span>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gedaempft"><Icon name="suche" groesse={20} /></span>
        <input type="search" value={text} placeholder="Übung suchen" onChange={(e) => setText(e.target.value)}
          className="min-h-touch w-full rounded-xl border border-rand bg-flaeche py-2 pl-10 pr-4 text-gross outline-none focus:border-akzent" />
      </label>
      {text.trim() === '' && vorschlaege.length > 0 && (
        <section className="mt-4">
          <h3 className="text-gross font-bold">Vorschläge</h3>
          <ul>{vorschlaege.map(zeile)}</ul>
        </section>
      )}
      {treffer.length === 0 && <p className="mt-4 text-basis">Keine Übung gefunden.</p>}
      {nachMuster(treffer).map(([m, liste]) => (
        <section key={m} className="mt-4">
          <h3 className="text-gross font-bold">{MUSTER_NAMEN[m]}</h3>
          <ul>{liste.map(zeile)}</ul>
        </section>
      ))}
    </Blatt>
  );
}
