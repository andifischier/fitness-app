// Live-Daten für die Screens: lädt den App-Zustand und lädt neu, sobald sich die Datenbank ändert.
// Beim Öffnen einer Seite wird zusätzlich einmal direkt gelesen, damit sie nie leer bleibt, falls das
// Abo die erste Antwort verzögert; bricht das Abo mit einem Fehler ab, startet es neu.
import { liveQuery, type Subscription } from 'dexie';
import { useEffect, useState } from 'react';
import { ladeZustand } from '../daten/db';
import { einstellungenVon } from '../logik/verlauf';
import type { AppZustand, Einstellungen } from '../logik/typen';

const NEUSTART_MS = 500;

export function useZustand(): AppZustand | undefined {
  const [zustand, setZustand] = useState<AppZustand>();
  useEffect(() => {
    let aktiv = true;
    let live = false;                // hat das Abo schon geliefert, ist die direkte Antwort älter
    let abo: Subscription | undefined;
    let neustart: ReturnType<typeof setTimeout> | undefined;
    const abonniere = () => {
      abo = liveQuery(() => ladeZustand()).subscribe({
        next: (z) => { live = true; if (aktiv) setZustand(z); },
        error: (fehler: unknown) => {
          console.error(fehler);
          if (aktiv) neustart = setTimeout(abonniere, NEUSTART_MS);
        },
      });
    };
    abonniere();
    ladeZustand().then((z) => { if (aktiv && !live) setZustand(z); }, (fehler: unknown) => console.error(fehler));
    return () => {
      aktiv = false;
      clearTimeout(neustart);
      abo?.unsubscribe();
    };
  }, []);
  return zustand;
}

export function einstellungenAus(z: AppZustand): Einstellungen {
  return einstellungenVon(z);
}
