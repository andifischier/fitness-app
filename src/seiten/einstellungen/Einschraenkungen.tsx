import { useState } from 'react';
import { SPERREN_NACH_REGION } from '../../konfiguration';
import { aendereEinstellungen } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { mitEinschraenkung, ohneEinschraenkung, sperreAktiv, type Einschraenkung } from '../../logik/einstellungen';
import { MUSTER_IDS } from '../../logik/typen';
import { Auswahl, Hinweis, Karte, Knopf, Laedt, Seite, Textfeld } from '../../ui/bausteine';
import { datumText, MUSTER_NAMEN, REGION_NAMEN } from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

const REGIONEN = Object.keys(SPERREN_NACH_REGION).map((wert) => ({ wert, text: REGION_NAMEN[wert] ?? wert }));
// Kondition läuft nur in Zirkeln und im Aufwärmen; sperrbar sind die Trainingsmuster.
const MUSTER = MUSTER_IDS.filter((m) => m !== 'Kondition').map((wert) => ({ wert: wert as string, text: MUSTER_NAMEN[wert] }));

function name(s: Einschraenkung): string {
  return s.typ === 'region' ? REGION_NAMEN[s.wert] ?? s.wert : MUSTER_NAMEN[s.wert as keyof typeof MUSTER_NAMEN] ?? s.wert;
}

export function EinschraenkungenSeite() {
  const z = useZustand();
  const [typ, setTyp] = useState<Einschraenkung['typ']>('region');
  const [wert, setWert] = useState<string>(REGIONEN[0]!.wert);
  const [bis, setBis] = useState('');
  if (!z) return <Laedt />;
  const e = einstellungenAus(z);
  const jetzt = lokaleZeit();

  const waehleTyp = (t: Einschraenkung['typ']) => {
    setTyp(t);
    setWert((t === 'region' ? REGIONEN : MUSTER)[0]!.wert);
  };
  const hinzufuegen = () => {
    void aendereEinstellungen((alt) => mitEinschraenkung(alt, { typ, wert, ...(bis ? { bis } : {}) }));
    setBis('');
  };

  return (
    <Seite titel="Einschränkungen" zurueck="/einstellungen">
      <Hinweis>
        Gesperrte Übungen tauchen weder im Plan noch beim Tauschen auf. Das ausfallende Volumen wird nicht auf andere
        Muskeln verteilt.
      </Hinweis>
      {e.einschraenkungen.length > 0 && (
        <Karte titel="Deine Sperren">
          <ul>
            {e.einschraenkungen.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-linie py-3 last:border-b-0">
                <span className="flex-1">
                  <span className="block text-basis font-semibold">{name(s)}</span>
                  <span className="block text-hinweis text-gedaempft">
                    {s.typ === 'region' ? 'Körperregion' : 'Bewegungsmuster'}
                    {' · '}
                    {s.bis ? `bis ${datumText(s.bis)}` : 'ohne Enddatum'}
                    {!sperreAktiv(s, jetzt) && ' · abgelaufen'}
                  </span>
                </span>
                <Knopf art="schlicht" onClick={() => void aendereEinstellungen((alt) => ohneEinschraenkung(alt, s.id))}>
                  Entfernen
                </Knopf>
              </li>
            ))}
          </ul>
        </Karte>
      )}
      <Karte titel="Neue Sperre">
        <div className="flex flex-col gap-4">
          <Auswahl spalten={2} wert={typ} onChange={waehleTyp}
            optionen={[{ wert: 'region', text: 'Körperregion' }, { wert: 'muster', text: 'Bewegungsmuster' }]} />
          <Auswahl wert={wert} onChange={setWert} optionen={typ === 'region' ? REGIONEN : MUSTER} />
          <Textfeld typ="date" label="Enddatum (optional, gilt einschließlich)" wert={bis} onChange={setBis} />
          <Knopf onClick={hinzufuegen}>Sperre hinzufügen</Knopf>
        </div>
      </Karte>
    </Seite>
  );
}
