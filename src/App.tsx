import { Navigate, Route, Routes } from 'react-router';
import { Rahmen } from './ui/Rahmen';
import { HeuteSeite } from './seiten/Heute';
import { EinheitSeite, FortschrittSeite, VerlaufSeite } from './seiten/fortschritt/Fortschritt';
import { OnboardingSeite } from './seiten/onboarding/Onboarding';
import { TesttagSeite } from './seiten/onboarding/Testtag';
import { MobilitySeite } from './seiten/training/Mobility';
import { StartSeite } from './seiten/training/Start';
import { TrainingSeite as PlayerSeite } from './seiten/training/Training';
import { VorschauSeite } from './seiten/training/Vorschau';
import { BackupSeite } from './seiten/einstellungen/Backup';
import { EinschraenkungenSeite } from './seiten/einstellungen/Einschraenkungen';
import { OrteSeite } from './seiten/einstellungen/Orte';
import { PrioritaetenSeite, ProfilSeite, TrainingSeite } from './seiten/einstellungen/Profil';
import { EinstellungenSeite } from './seiten/einstellungen/Uebersicht';
import { UebungSeite } from './seiten/uebungen/Detail';
import { BearbeitenSeite, NeueUebungSeite, VorlageSeite } from './seiten/uebungen/Formular';
import { UebungenSeite } from './seiten/uebungen/Liste';

export function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Navigate to="/onboarding/1" replace />} />
      <Route path="/onboarding/:schritt" element={<OnboardingSeite />} />
      <Route path="/testtag" element={<TesttagSeite />} />
      <Route path="/start" element={<StartSeite />} />
      <Route path="/vorschau/:id" element={<VorschauSeite />} />
      <Route path="/training/:id" element={<PlayerSeite />} />
      <Route path="/mobility" element={<MobilitySeite />} />
      <Route element={<Rahmen />}>
        <Route path="/" element={<HeuteSeite />} />
        <Route path="/fortschritt" element={<FortschrittSeite />} />
        <Route path="/fortschritt/verlauf" element={<VerlaufSeite />} />
        <Route path="/fortschritt/einheit/:id" element={<EinheitSeite />} />
        <Route path="/uebungen" element={<UebungenSeite />} />
        <Route path="/uebungen/neu" element={<VorlageSeite />} />
        <Route path="/uebungen/neu/:vorlageId" element={<NeueUebungSeite />} />
        <Route path="/uebungen/:id" element={<UebungSeite />} />
        <Route path="/uebungen/:id/bearbeiten" element={<BearbeitenSeite />} />
        <Route path="/einstellungen" element={<EinstellungenSeite />} />
        <Route path="/einstellungen/orte" element={<OrteSeite />} />
        <Route path="/einstellungen/profil" element={<ProfilSeite />} />
        <Route path="/einstellungen/prioritaeten" element={<PrioritaetenSeite />} />
        <Route path="/einstellungen/training" element={<TrainingSeite />} />
        <Route path="/einstellungen/einschraenkungen" element={<EinschraenkungenSeite />} />
        <Route path="/einstellungen/backup" element={<BackupSeite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
