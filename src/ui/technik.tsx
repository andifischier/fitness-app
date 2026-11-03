// „So geht's“: Kurzanleitung in Stichpunkten und, wo vorhanden, das eingebettete YouTube-Video
// (Entscheidung 21.10.2026). Das Video braucht Internet; der Link öffnet YouTube (festes Video,
// eigener Link oder Suche). Mit `autoVideo` erscheint das Video gleich unter dem Namen und läuft
// stumm in Schleife, damit man die Bewegung sofort sieht (Entscheidung 03.11.2026).
import { useState } from 'react';
import { videoIdVon, videoLinkVon, type TechnikInhalt } from '../logik/einstellungen';
import type { Einstellungen } from '../logik/typen';
import { Icon } from './Icon';

// Startet sofort und ohne Ton, damit Musik oder Podcast weiterlaufen; Ton über den Knopf im Video
// (Entscheidung 02.11.2026). In Schleife braucht YouTube die eigene ID als Playlist.
function Video({ id, name }: { id: string; name: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-linie">
      <iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}`}
        title={`Video: ${name}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
    </div>
  );
}

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function Technik({ e, u, offen: start = false, autoVideo = false }: {
  e: Einstellungen; u: TechnikInhalt; offen?: boolean; autoVideo?: boolean;
}) {
  const [offen, setOffen] = useState(start);
  const id = videoIdVon(e, u);
  // Ohne Netz bleibt das Video weg; der Knopf „Video hier abspielen“ steht dann wie bisher bereit.
  const sofort = autoVideo && id !== undefined && online();
  const [video, setVideo] = useState(false);
  const link = (
    <a href={videoLinkVon(e, u)} target="_blank" rel="noreferrer"
      className="flex min-h-touch items-center gap-2 text-basis font-semibold text-akzent">
      <Icon name="video" groesse={22} /> Auf YouTube öffnen
    </a>
  );
  return (
    <div className={start ? '' : 'mt-2'}>
      {sofort && <div className="mb-1"><Video id={id} name={u.name} /></div>}
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
          {id && !sofort && (video ? <Video id={id} name={u.name} /> : (
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
