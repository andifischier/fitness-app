import { Navigate } from 'react-router';
import { einstellungenAus, useZustand } from '../ui/useZustand';
import { LeereSeite } from './LeereSeite';

// Heute; beim ersten Start geht es direkt ins Onboarding. Inhalt folgt mit Paket 6.
export function HeuteSeite() {
  const z = useZustand();
  if (z && !einstellungenAus(z).onboardingAbgeschlossen) return <Navigate to="/onboarding/1" replace />;
  return <LeereSeite titel="Heute" />;
}
