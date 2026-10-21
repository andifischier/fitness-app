// Fängt den Absturz eines Bildschirms ab, statt eine leere Seite zu zeigen (Entscheidung 21.10.2026):
// zuerst selbst neu laden, beim zweiten Absturz kurz danach ein Hinweis mit Fehlertext und Knopf.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { neuLadenErlaubt } from '../logik/absturz';
import { Hinweis, Karte, Knopf, Seite } from './bausteine';

const SCHLUESSEL = 'fitness.letztesNeuladen';

function lies(): number | undefined {
  try {
    const wert = Number(sessionStorage.getItem(SCHLUESSEL));
    return wert > 0 ? wert : undefined;
  } catch {
    return undefined;
  }
}

function merke(ms: number) {
  try {
    sessionStorage.setItem(SCHLUESSEL, String(ms));
  } catch {
    // Ohne Speicher lädt die App einmal neu und zeigt beim nächsten Absturz den Hinweis.
  }
}

export class Absturz extends Component<{ children: ReactNode }, { fehler?: Error; neuLaden: boolean }> {
  state: { fehler?: Error; neuLaden: boolean } = { neuLaden: false };

  static getDerivedStateFromError(fehler: Error) {
    return { fehler, neuLaden: neuLadenErlaubt(Date.now(), lies()) };
  }

  componentDidCatch(fehler: Error, info: ErrorInfo) {
    console.error(fehler, info.componentStack);
    if (this.state.neuLaden) {
      merke(Date.now());
      window.location.reload();
    }
  }

  render() {
    const { fehler, neuLaden } = this.state;
    if (!fehler) return this.props.children;
    if (neuLaden) return null;
    return (
      <Seite titel="Da ging etwas schief">
        <Karte titel="Bitte lade neu" hinweis="Deine Daten sind sicher gespeichert.">
          <Knopf onClick={() => { merke(Date.now()); window.location.reload(); }}>Neu laden</Knopf>
        </Karte>
        <Hinweis>Fehler: {fehler.message || String(fehler)}</Hinweis>
      </Seite>
    );
  }
}
