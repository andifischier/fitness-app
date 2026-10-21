// Mobility nach „Ruhetag empfohlen“: die Aufwärm-Mobility aller Muster als Checkliste, ca. 10 Min.
// Nur zum Mitmachen; nichts wird gespeichert (Entscheidung 20.10.2026).
import { useNavigate } from 'react-router';
import { EINHEIT } from '../../konfiguration';
import { mobilityAlle } from '../../logik/heute';
import { Checkliste, Hinweis, Knopf, Laedt, Seite } from '../../ui/bausteine';
import { useZustand } from '../../ui/useZustand';

export function MobilitySeite() {
  const navigate = useNavigate();
  const z = useZustand();
  if (!z) return <Laedt />;
  const ort = z.orte.find((o) => o.standard) ?? z.orte[0];
  return (
    <Seite titel="Mobility" zurueck="/">
      <Hinweis>Etwa {EINHEIT.mobilityMin} Minuten, in Ruhe und ohne Last.</Hinweis>
      <Checkliste zeilen={ort ? mobilityAlle(z, ort) : []} />
      <Knopf onClick={() => navigate('/')}>Fertig</Knopf>
    </Seite>
  );
}
