// Wochen-Backup (Entscheidung 21.10.2026): „In Drive sichern“ öffnet das Teilen-Menü des Handys mit
// der Backup-Datei (Ziel z. B. Google Drive), „Auf dem Handy speichern“ lädt sie in den Download-Ordner.
// Als gesichert gilt das Backup erst, wenn Teilen oder Speichern geklappt hat.
import { backupDateiname, exportiere, merkeBackup } from '../daten/backup';
import { db } from '../daten/db';
import { lokaleZeit } from '../daten/zeit';

export type Sicherung = 'geteilt' | 'gespeichert' | 'abgebrochen';

function ladeHerunter(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Chrome teilt keine .json-Dateien; geteilt wird deshalb derselbe Inhalt als .txt (Einlesen geht mit beiden).
const teilbar = (blob: Blob, jetzt: string) =>
  new File([blob], backupDateiname(jetzt).replace(/\.json$/, '.txt'), { type: 'text/plain' });

export function kannTeilen(): boolean {
  try {
    return typeof navigator.share === 'function'
      && navigator.canShare?.({ files: [new File(['{}'], 'probe.txt', { type: 'text/plain' })] }) === true;
  } catch {
    return false;
  }
}

export async function sichereBackup(art: 'teilen' | 'speichern'): Promise<Sicherung> {
  const jetzt = lokaleZeit();
  const blob = await exportiere(jetzt, db, false);
  if (art === 'teilen' && kannTeilen()) {
    try {
      await navigator.share({ files: [teilbar(blob, jetzt)], title: 'Fitness-Backup' });
      await merkeBackup(jetzt);
      return 'geteilt';
    } catch (fehler) {
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return 'abgebrochen';
      // anderer Fehler: als Datei speichern
    }
  }
  ladeHerunter(blob, backupDateiname(jetzt));
  await merkeBackup(jetzt);
  return 'gespeichert';
}
