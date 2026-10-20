import { Navigate, Route, Routes } from 'react-router';
import { Rahmen } from './ui/Rahmen';
import { LeereSeite } from './seiten/LeereSeite';
import { TABS } from './ui/tabs';

export function App() {
  return (
    <Routes>
      <Route element={<Rahmen />}>
        {TABS.map((tab) => (
          <Route key={tab.pfad} path={tab.pfad} element={<LeereSeite titel={tab.titel} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
