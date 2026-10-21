// Übungen einer Einheit (Heute und Wochenausblick): Blöcke mit Kombi-Kennzeichnung, je Übung Sätze,
// Ziel und Last wie in der Vorschau. Mit `onTauschen` bekommt jede Übung den Tausch-Knopf.
import { zirkelVorgaben } from '../logik/heute';
import { kannTauschen, lastBekannt } from '../logik/planung';
import type { AppZustand, Einheit } from '../logik/typen';
import { uebungVon } from '../logik/verlauf';
import { Icon } from './Icon';
import { detailText, lastText, vorgabeText } from './texte';

export function UebungsListe({ z, einheit, onTauschen }: {
  z: AppZustand; einheit: Einheit; onTauschen?: (block: number, position: number) => void;
}) {
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
                  : detailText(u, p, lastBekannt(z, u));
                return (
                  <li key={pi} className="flex items-center gap-3 py-1">
                    <span className="flex-1">
                      <span className="block text-basis font-semibold">{u.name}</span>
                      <span className="block text-hinweis text-gedaempft">{detail}{p.langsam ? ' · 3 Sek. absenken' : ''}</span>
                    </span>
                    {onTauschen && !p.istMaxTest && kannTauschen(einheit, bi, pi) && (
                      <button type="button" aria-label={`${u.name} tauschen`} onClick={() => onTauschen(bi, pi)}
                        className="flex size-touch shrink-0 items-center justify-center text-gedaempft">
                        <Icon name="tauschen" groesse={22} />
                      </button>
                    )}
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
