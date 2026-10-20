import { Navigate, Route, Routes } from 'react-router';
import { Rahmen } from './ui/Rahmen';
import { LeereSeite } from './seiten/LeereSeite';
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
      <Route element={<Rahmen />}>
        <Route path="/" element={<LeereSeite titel="Heute" />} />
        <Route path="/fortschritt" element={<LeereSeite titel="Fortschritt" />} />
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
