// Zähler mit −/+ für geschaffte Wiederholungen, Stoppuhr für Halteübungen (Testtag, Max-Test) und
// Countdown für Halteübungen im Training.
import { useEffect, useState } from 'react';
import { Knopf } from './bausteine';
import { Icon } from './Icon';
import { bereiteTonVor, pausenEnde } from './signal';

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

// Stoppuhr in ganzen Sekunden; der Wert lässt sich danach mit −/+ korrigieren.
export function Stoppuhr({ wert, onChange }: { wert: number; onChange: (s: number) => void }) {
  const [startMs, setStartMs] = useState<number>();
  useEffect(() => {
    if (startMs === undefined) return;
    const t = window.setInterval(() => onChange(Math.floor((Date.now() - startMs) / 1000)), 250);
    return () => window.clearInterval(t);
  }, [startMs, onChange]);
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <Zaehler wert={wert} onChange={(s) => { setStartMs(undefined); onChange(s); }} einheit="Sekunden" />
      <div className="w-full">
        {startMs === undefined
          ? <Knopf art="sekundaer" onClick={() => { onChange(0); setStartMs(Date.now()); }}>{wert > 0 ? 'Neu starten' : 'Stoppuhr starten'}</Knopf>
          : <Knopf art="sekundaer" onClick={() => setStartMs(undefined)}>Stopp</Knopf>}
      </div>
    </div>
  );
}

// Countdown bis zum Ziel für Halteübungen (Entscheidung 29.10.2026): kein Zählen, am Ende Ton und
// Vibration wie am Pausenende. „Satz erledigt“ speichert das Ziel, auch ohne Countdown.
export function Countdown({ ziel }: { ziel: number }) {
  const [startMs, setStartMs] = useState<number>();
  const [jetzt, setJetzt] = useState(Date.now);
  const rest = startMs === undefined ? ziel : Math.max(0, ziel - Math.floor((jetzt - startMs) / 1000));
  const laeuft = startMs !== undefined && rest > 0;
  useEffect(() => {
    if (!laeuft) return;
    const t = window.setInterval(() => setJetzt(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [laeuft]);
  useEffect(() => {
    if (startMs !== undefined && rest === 0) pausenEnde();
  }, [startMs, rest]);
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-zahl font-extrabold tabular-nums" aria-live="off">{rest}</span>
        <p className="text-hinweis text-gedaempft">{rest === 0 ? 'Geschafft' : 'Sekunden'}</p>
      </div>
      <div className="w-full">
        {laeuft
          ? <Knopf art="sekundaer" onClick={() => setStartMs(undefined)}>Stopp</Knopf>
          : <Knopf art="sekundaer" onClick={() => { bereiteTonVor(); setJetzt(Date.now()); setStartMs(Date.now()); }}>
              {startMs === undefined ? 'Countdown starten' : 'Neu starten'}
            </Knopf>}
      </div>
    </div>
  );
}
