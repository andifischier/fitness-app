import { useRef, useState } from 'react';
import { backupDateiname, exportiere, importiere, pruefeBackup, type BackupZusammenfassung } from '../../daten/backup';
import { lokaleZeit } from '../../daten/zeit';
import { Fehler, Hinweis, Karte, Knopf, Laedt, Seite } from '../../ui/bausteine';
import { datumText } from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

function speichereDatei(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const einheitenText = (n: number) => (n === 1 ? '1 Einheit' : `${n} Einheiten`);

export function BackupSeite() {
  const z = useZustand();
  const eingabe = useRef<HTMLInputElement>(null);
  const [datei, setDatei] = useState<File>();
  const [vorschau, setVorschau] = useState<BackupZusammenfassung>();
  const [fehler, setFehler] = useState<string>();
  const [meldung, setMeldung] = useState<string>();
  if (!z) return <Laedt />;
  const e = einstellungenAus(z);

  const exportieren = async () => {
    const jetzt = lokaleZeit();
    speichereDatei(await exportiere(jetzt), backupDateiname(jetzt));
    setMeldung('Backup gespeichert. Bewahre die Datei außerhalb des Handys auf, z. B. in deiner Cloud.');
  };

  const gewaehlt = async (f: File | undefined) => {
    setFehler(undefined);
    setMeldung(undefined);
    setVorschau(undefined);
    if (!f) return;
    const pruefung = await pruefeBackup(f);
    if (!pruefung.ok) {
      setFehler(pruefung.fehler);
      return;
    }
    setDatei(f);
    setVorschau(pruefung.zusammenfassung);
  };

  const ersetzen = async () => {
    if (!datei) return;
    const ergebnis = await importiere(datei);
    setVorschau(undefined);
    setDatei(undefined);
    if (ergebnis.ok) setMeldung('Backup eingelesen. Alle Daten sind wiederhergestellt.');
    else setFehler(ergebnis.fehler);
  };

  return (
    <Seite titel="Backup" zurueck="/einstellungen">
      <Karte titel="Backup speichern"
        hinweis={e.letztesBackup ? `Letztes Backup: ${datumText(e.letztesBackup)}` : 'Noch kein Backup gespeichert.'}>
        <div className="flex flex-col gap-3">
          <Hinweis>Speichert alle deine Daten als Datei auf dem Handy.</Hinweis>
          <Knopf onClick={() => void exportieren()}>Backup speichern</Knopf>
        </div>
      </Karte>
      <Karte titel="Backup einlesen" hinweis="Ersetzt alle Daten in der App durch die Daten aus der Datei.">
        <input ref={eingabe} type="file" accept="application/json,.json" className="hidden"
          onChange={(ev) => { void gewaehlt(ev.target.files?.[0]); ev.target.value = ''; }} />
        {!vorschau && <Knopf art="sekundaer" onClick={() => eingabe.current?.click()}>Datei auswählen</Knopf>}
        {vorschau && (
          <div className="flex flex-col gap-3">
            <p className="text-basis">
              Backup vom {datumText(vorschau.exportiertAm)} mit {einheitenText(vorschau.einheiten)}
              {vorschau.von && vorschau.bis && ` (${datumText(vorschau.von)} bis ${datumText(vorschau.bis)})`}.
            </p>
            <p className="text-basis font-semibold">Alle aktuellen Daten werden ersetzt.</p>
            <Knopf onClick={() => void ersetzen()}>Daten ersetzen</Knopf>
            <Knopf art="sekundaer" onClick={() => { setVorschau(undefined); setDatei(undefined); }}>Abbrechen</Knopf>
          </div>
        )}
      </Karte>
      {fehler && <Fehler meldungen={[fehler]} />}
      {meldung && <p role="status" className="text-basis font-semibold text-akzent">{meldung}</p>}
    </Seite>
  );
}
