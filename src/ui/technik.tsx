// „So geht's“: Kurzanleitung in Stichpunkten und, wo vorhanden, das eingebettete YouTube-Video
// (Entscheidung 21.10.2026). Das Video lädt erst auf Tipp und braucht Internet; der Link öffnet
// YouTube (festes Video, eigener Link oder Suche).
import { useState } from 'react';
import { videoIdVon, videoLinkVon } from '../logik/einstellungen';
import type { Einstellungen, Uebung } from '../logik/typen';
import { Icon } from './Icon';

export function Technik({ e, u, offen: start = false }: { e: Einstellungen; u: Uebung; offen?: boolean }) {
  const [offen, setOffen] = useState(start);
  const [video, setVideo] = useState(false);
  const id = videoIdVon(e, u);
  const link = (
    <a href={videoLinkVon(e, u)} target="_blank" rel="noreferrer"
      className="flex min-h-touch items-center gap-2 text-basis font-semibold text-akzent">
      <Icon name="video" groesse={22} /> Auf YouTube öffnen
    </a>
  );
  return (
    <div className={start ? '' : 'mt-2'}>
      {!start && (
        <button type="button" aria-expanded={offen} onClick={() => setOffen(!offen)}
          className="flex min-h-touch items-center gap-2 text-gross font-semibold text-akzent">
          <Icon name="video" groesse={22} /> So geht's
        </button>
      )}
      {offen && (
        <div className={`flex flex-col gap-3 ${start ? '' : 'mt-1 rounded-karte border border-rand bg-flaeche p-4'}`}>
          {u.anleitung && u.anleitung.length > 0 && (
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-basis">
              {u.anleitung.map((zeile) => <li key={zeile}>{zeile}</li>)}
            </ol>
          )}
          {id && (video ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-linie">
              <iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
                title={`Video: ${u.name}`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          ) : (
            <button type="button" onClick={() => setVideo(true)}
              className="flex min-h-touch items-center gap-2 text-left text-basis font-semibold text-akzent">
              <Icon name="video" groesse={22} /> Video hier abspielen (braucht Internet)
            </button>
          ))}
          {link}
        </div>
      )}
    </div>
  );
}
