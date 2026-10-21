// Übungen einer Einheit zum Lesen (Heute und Wochenausblick): Blöcke mit Kombi-Kennzeichnung,
// je Übung Sätze, Ziel und Last wie in der Vorschau.
import { zirkelVorgaben } from '../logik/heute';
import type { AppZustand, Einheit } from '../logik/typen';
import { uebungVon } from '../logik/verlauf';
import { detailText, lastText, vorgabeText } from './texte';

export function UebungsListe({ z, einheit }: { z: AppZustand; einheit: Einheit }) {
  const vorgaben = zirkelVorgaben(z, einheit);
  let kombi = 0;
  return (
    <ul className="flex flex-col">
      {einheit.bloecke.map((b, bi) => {
        const label = b.typ === 'supersatz' ? `Kombi ${String.fromCharCode(65 + kombi++)}` : undefined;
        return (
          <li key={bi} className="border-b border-linie py-2 first:pt-0 last:border-b-0 last:pb-0">
            {label && <p className="text-hinweis font-bold tracking-wide text-akzent uppercase">{label}</p>}
            <ul>
              {b.positionen.map((p, pi) => {
                const u = uebungVon(z, p.uebungId);
                if (!u) return null;
                const detail = b.typ === 'zirkel'
                  ? [vorgabeText(u, vorgaben[pi]), lastText(u, p)].filter(Boolean).join(' · ')
                  : detailText(u, p);
                return (
                  <li key={pi} className="py-1">
                    <span className="block text-basis font-semibold">{u.name}</span>
                    <span className="block text-hinweis text-gedaempft">{detail}{p.langsam ? ' · 3 Sek. absenken' : ''}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
