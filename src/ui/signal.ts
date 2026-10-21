// Geräte-Funktionen des Trainings: Bildschirm anlassen (Screen Wake Lock), Ton (Web Audio) und
// Vibration am Pausenende. Fehlt eine Funktion im Browser, läuft das Training ohne sie weiter.
import { useEffect } from 'react';
import { PLAYER } from '../konfiguration';

// Hält den Bildschirm an, solange die Komponente sichtbar ist; nach dem Zurückkehren in die App
// wird die Sperre neu angefordert (der Browser gibt sie beim Verlassen frei).
export function useBildschirmAn(): void {
  useEffect(() => {
    let sperre: WakeLockSentinel | undefined;
    let aktiv = true;
    const anfordern = async () => {
      try {
        if (aktiv && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          sperre = await navigator.wakeLock.request('screen');
        }
      } catch {
        // z. B. Energiesparmodus: ohne Sperre weiter
      }
    };
    const sichtbar = () => void anfordern();
    void anfordern();
    document.addEventListener('visibilitychange', sichtbar);
    return () => {
      aktiv = false;
      document.removeEventListener('visibilitychange', sichtbar);
      void sperre?.release().catch(() => undefined);
    };
  }, []);
}

let audio: AudioContext | undefined;

// Browser erlauben Ton erst nach einer Berührung; deshalb bei „Satz erledigt“ vorbereiten.
export function bereiteTonVor(): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = undefined;
  }
}

// Drei kurze Töne und Vibration am Ende der Pause.
export function pausenEnde(): void {
  try {
    navigator.vibrate?.([...PLAYER.vibration]);
  } catch {
    // Vibration nicht verfügbar
  }
  if (!audio) return;
  const { frequenzHz, dauerMs, abstandMs, anzahl, lautstaerke } = PLAYER.ton;
  const start = audio.currentTime;
  for (let i = 0; i < anzahl; i++) {
    const beginn = start + (i * (dauerMs + abstandMs)) / 1000;
    const ende = beginn + dauerMs / 1000;
    const ton = audio.createOscillator();
    const laut = audio.createGain();
    ton.frequency.value = frequenzHz;
    laut.gain.setValueAtTime(lautstaerke, beginn);
    laut.gain.exponentialRampToValueAtTime(0.001, ende);
    ton.connect(laut).connect(audio.destination);
    ton.start(beginn);
    ton.stop(ende);
  }
}
