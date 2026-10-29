// Zähler mit −/+ für geschaffte Wiederholungen, Stoppuhr für Halteübungen (Testtag, Max-Test) und
// Countdown für Halteübungen im Training; beide mit Vorlauf zum Bereitmachen.
import { useEffect, useState } from 'react';
import { Knopf } from './bausteine';
import { Icon } from './Icon';
import { PLAYER } from '../konfiguration';
import { bereiteTonVor, pausenEnde, vorlaufEnde } from './signal';

const rund = 'flex size-[72px] items-center justify-center rounded-full border border-rand bg-flaeche text-text disabled:text-rand';

export function Zaehler({ wert, onChange, einheit = 'Wiederholungen' }: { wert: number; onChange: (w: number) => void; einheit?: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="text-basis text-gedaempft">Geschafft</p>
      <div className="flex items-center gap-8">
        <button type="button" className={rund} disabled={wert <= 0} onClick={() => onChange(wert - 1)} aria-label="Weniger">
          <span aria-hidden="true" className="text-screen">−</span>
        </button>
        <span className="min-w-24 text-center text-zahl font-extrabold" aria-live="polite">{wert}</span>
        <button type="button" className={rund} onClick={() => onChange(wert + 1)} aria-label="Mehr">
          <Icon name="plus" />
        </button>
      </div>
      <p className="text-hinweis text-gedaempft">{einheit}</p>
    </div>
  );
}

// Vorlauf (Entscheidung 29.10.2026): Nach „Starten“ bleiben einige Sekunden zum Bereitmachen, dann
// ein Ton, und die Zeit läuft. `startMs` ist der Moment, ab dem gezählt wird (anfangs in der Zukunft).
function useVorlauf() {
  const [startMs, setStartMs] = useState<number>();
  const [jetzt, setJetzt] = useState(Date.now);
  const vorlauf = startMs === undefined ? 0 : Math.max(0, Math.ceil((startMs - jetzt) / 1000));
  useEffect(() => {
    if (startMs === undefined) return;
    const t = window.setInterval(() => setJetzt(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [startMs]);
  const laeuft = startMs !== undefined && vorlauf === 0;
  useEffect(() => {
    if (laeuft) vorlaufEnde();
  }, [laeuft]);
  const starten = () => {
    bereiteTonVor();
    setJetzt(Date.now());
    setStartMs(Date.now() + PLAYER.vorlaufSek * 1000);
  };
  return { startMs, jetzt, vorlauf, laeuft, starten, stoppen: () => setStartMs(undefined) };
}

function Vorlauf({ sek }: { sek: number }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="text-basis text-gedaempft">Bereit machen</p>
      <span className="text-zahl font-extrabold text-akzent tabular-nums" aria-live="polite">{sek}</span>
      <p className="text-hinweis text-gedaempft">Gleich geht es los</p>
    </div>
  );
}

// Stoppuhr in ganzen Sekunden; der Wert lässt sich danach mit −/+ korrigieren.
export function Stoppuhr({ wert, onChange }: { wert: number; onChange: (s: number) => void }) {
  const { startMs, jetzt, vorlauf, laeuft, starten, stoppen } = useVorlauf();
  useEffect(() => {
    if (laeuft && startMs !== undefined) onChange(Math.max(0, Math.floor((jetzt - startMs) / 1000)));
  }, [laeuft, startMs, jetzt, onChange]);
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {vorlauf > 0
        ? <Vorlauf sek={vorlauf} />
        : <Zaehler wert={wert} onChange={(s) => { stoppen(); onChange(s); }} einheit="Sekunden" />}
      <div className="w-full">
        {startMs === undefined
          ? <Knopf art="sekundaer" onClick={() => { onChange(0); starten(); }}>{wert > 0 ? 'Neu starten' : 'Stoppuhr starten'}</Knopf>
          : <Knopf art="sekundaer" onClick={stoppen}>{vorlauf > 0 ? 'Abbrechen' : 'Stopp'}</Knopf>}
      </div>
    </div>
  );
}

// Countdown bis zum Ziel für Halteübungen (Entscheidung 29.10.2026): kein Zählen, erst der Vorlauf, am
// Ende Ton und Vibration wie am Pausenende. „Satz erledigt“ speichert das Ziel, auch ohne Countdown.
export function Countdown({ ziel }: { ziel: number }) {
  const { startMs, jetzt, vorlauf, laeuft, starten, stoppen } = useVorlauf();
  const rest = !laeuft || startMs === undefined ? ziel : Math.max(0, ziel - Math.floor((jetzt - startMs) / 1000));
  const [fertig, setFertig] = useState(false);
  useEffect(() => {
    if (laeuft && rest === 0) {
      pausenEnde();
      setFertig(true);
      stoppen();
    }
  }, [laeuft, rest]);
  if (vorlauf > 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Vorlauf sek={vorlauf} />
        <div className="w-full"><Knopf art="sekundaer" onClick={stoppen}>Abbrechen</Knopf></div>
      </div>
    );
  }
  const zeigen = fertig && !laeuft ? 0 : rest;
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-zahl font-extrabold tabular-nums" aria-live="off">{zeigen}</span>
        <p className="text-hinweis text-gedaempft">{zeigen === 0 ? 'Geschafft' : 'Sekunden'}</p>
      </div>
      <div className="w-full">
        {laeuft
          ? <Knopf art="sekundaer" onClick={stoppen}>Stopp</Knopf>
          : <Knopf art="sekundaer" onClick={() => { setFertig(false); starten(); }}>
              {startMs === undefined && !fertig ? 'Countdown starten' : 'Neu starten'}
            </Knopf>}
      </div>
    </div>
  );
}
