import { useState } from 'react';
import { useNavigate } from 'react-router';
import { STANDARD_PRIORITAETEN } from '../../konfiguration';
import { setzeZurueck } from '../../daten/speichern';
import { sperreAktiv } from '../../logik/einstellungen';
import { MUSKELN } from '../../logik/typen';
import { lokaleZeit } from '../../daten/zeit';
import { kannTeilen, sichereBackup } from '../../ui/backupSichern';
import { Hinweis, Karte, Knopf, Laedt, Seite, Zeile } from '../../ui/bausteine';
import { datumText, kleinerAnfang, LEVEL_NAMEN, ZIEL_NAMEN, ZIRKEL_ANTEIL_NAMEN } from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

export function EinstellungenSeite() {
  const z = useZustand();
  if (!z) return <Laedt />;
  const e = einstellungenAus(z);
  const jetzt = lokaleZeit();
  const orte = z.orte.length === 0
    ? 'Noch kein Ort'
    : [...z.orte].sort((a, b) => Number(b.standard) - Number(a.standard)).map((o) => o.name).join(', ');
  const standardPrio = MUSKELN.every((m) => e.prioritaeten[m] === STANDARD_PRIORITAETEN[m]);
  const aktiv = e.einschraenkungen.filter((s) => sperreAktiv(s, jetzt)).length;

  return (
    <Seite titel="Einstellungen">
      <Karte>
        <Zeile zu="/einstellungen/orte" titel="Orte und Equipment" wert={orte} />
        <Zeile zu="/einstellungen/profil" titel="Profil"
          wert={`${LEVEL_NAMEN[e.level]} · ${e.ziele.map((x) => ZIEL_NAMEN[x]).join(', ')}`} />
        <Zeile zu="/einstellungen/prioritaeten" titel="Muskelprioritäten"
          wert={standardPrio ? 'Alle normal' : 'Angepasst'} />
        <Zeile zu="/einstellungen/training" titel="Dauer, Zirkel und Pausen"
          wert={`${e.standardDauerMin} Min · Zirkel ${kleinerAnfang(ZIRKEL_ANTEIL_NAMEN[e.zirkelAnteil])}`} />
        <Zeile zu="/einstellungen/einschraenkungen" titel="Einschränkungen"
          wert={aktiv === 0 ? 'Keine aktiv' : aktiv === 1 ? '1 aktiv' : `${aktiv} aktiv`} />
        <Zeile zu="/einstellungen/backup" titel="Backup"
          wert={e.letztesBackup ? `Letztes Backup: ${datumText(e.letztesBackup)}` : 'Noch kein Backup'} />
      </Karte>
      <Zuruecksetzen />
    </Seite>
  );
}

// App zurücksetzen (Entscheidung 21.10.2026): zuerst Backup anbieten, dann noch einmal bestätigen;
// danach beginnt die App mit dem Onboarding.
function Zuruecksetzen() {
  const navigate = useNavigate();
  const [schritt, setSchritt] = useState<'zu' | 'backup' | 'bestaetigen'>('zu');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string>();
  const sichern = async (art: 'teilen' | 'speichern') => {
    setLaeuft(true);
    setFehler(undefined);
    try {
      if ((await sichereBackup(art)) !== 'abgebrochen') setSchritt('bestaetigen');
    } catch {
      setFehler('Das Backup hat nicht geklappt. Bitte versuche es noch einmal.');
    }
    setLaeuft(false);
  };
  const loeschen = async () => {
    setLaeuft(true);
    setFehler(undefined);
    try {
      await setzeZurueck();
      navigate('/onboarding/1', { replace: true });
    } catch {
      setFehler('Zurücksetzen hat nicht geklappt. Deine Daten sind unverändert.');
      setLaeuft(false);
    }
  };
  return (
    <Karte titel="Von vorn beginnen" hinweis="Löscht alle Daten: Orte, Profil, Trainings und Fortschritt. Danach startest du mit dem Onboarding.">
      {schritt === 'zu' && <Knopf art="sekundaer" onClick={() => setSchritt('backup')}>App zurücksetzen</Knopf>}
      {schritt === 'backup' && (
        <div className="flex flex-col gap-3">
          <p className="text-basis font-semibold">Vorher ein Backup sichern?</p>
          <Hinweis>Mit dem Backup kannst du alles später unter Backup wieder einlesen.</Hinweis>
          {kannTeilen() && <Knopf onClick={() => void sichern('teilen')} deaktiviert={laeuft}>In Drive sichern</Knopf>}
          <Knopf art={kannTeilen() ? 'sekundaer' : 'primaer'} onClick={() => void sichern('speichern')} deaktiviert={laeuft}>
            Auf dem Handy speichern
          </Knopf>
          <Knopf art="schlicht" onClick={() => setSchritt('bestaetigen')}>Ohne Backup weiter</Knopf>
          <Knopf art="schlicht" onClick={() => setSchritt('zu')}>Abbrechen</Knopf>
        </div>
      )}
      {schritt === 'bestaetigen' && (
        <div className="flex flex-col gap-3">
          <p className="text-basis font-semibold">Wirklich alle Daten löschen? Das lässt sich nur mit einem Backup rückgängig machen.</p>
          <Knopf onClick={() => void loeschen()} deaktiviert={laeuft}>Alles löschen</Knopf>
          <Knopf art="sekundaer" onClick={() => setSchritt('zu')}>Abbrechen</Knopf>
        </div>
      )}
      {fehler && <p role="alert" className="mt-3 text-hinweis font-semibold">{fehler}</p>}
    </Karte>
  );
}
