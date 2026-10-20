// Live-Daten für die Screens: lädt den App-Zustand und lädt neu, sobald sich die Datenbank ändert.
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { ladeZustand } from '../daten/db';
import { einstellungenVon } from '../logik/verlauf';
import type { AppZustand, Einstellungen } from '../logik/typen';

export function useZustand(): AppZustand | undefined {
  const [zustand, setZustand] = useState<AppZustand>();
  useEffect(() => {
    const abo = liveQuery(() => ladeZustand()).subscribe({
      next: setZustand,
      error: (fehler: unknown) => console.error(fehler),
    });
    return () => abo.unsubscribe();
  }, []);
  return zustand;
}

export function einstellungenAus(z: AppZustand): Einstellungen {
  return einstellungenVon(z);
}
