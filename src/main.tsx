import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App';
import { speicherSchutz } from './daten/db';
import { fuehreWochenabschluesseAus } from './daten/speichern';
import { lokaleZeit } from './daten/zeit';
import './index.css';

void speicherSchutz();
fuehreWochenabschluesseAus(lokaleZeit()).catch((fehler: unknown) => console.error(fehler));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
