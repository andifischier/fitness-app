import { STANDARD_PRIORITAETEN } from '../../konfiguration';
import { sperreAktiv } from '../../logik/einstellungen';
import { MUSKELN } from '../../logik/typen';
import { lokaleZeit } from '../../daten/zeit';
import { Karte, Laedt, Seite, Zeile } from '../../ui/bausteine';
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
          wert={standardPrio ? 'Oberkörper betont' : 'Angepasst'} />
        <Zeile zu="/einstellungen/training" titel="Dauer, Zirkel und Pausen"
          wert={`${e.standardDauerMin} Min · Zirkel ${kleinerAnfang(ZIRKEL_ANTEIL_NAMEN[e.zirkelAnteil])}`} />
        <Zeile zu="/einstellungen/einschraenkungen" titel="Einschränkungen"
          wert={aktiv === 0 ? 'Keine aktiv' : aktiv === 1 ? '1 aktiv' : `${aktiv} aktiv`} />
        <Zeile zu="/einstellungen/backup" titel="Backup"
          wert={e.letztesBackup ? `Letztes Backup: ${datumText(e.letztesBackup)}` : 'Noch kein Backup'} />
      </Karte>
    </Seite>
  );
}
