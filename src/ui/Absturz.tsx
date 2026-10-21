// Fängt den Absturz eines Bildschirms ab, statt eine leere Seite zu zeigen (Entscheidungen 21.10.2026):
// zuerst still neu aufbauen, stürzt derselbe Bildschirm sofort wieder ab, die Seite neu laden, erst danach
// ein Hinweis mit Fehlertext und Knopf.
import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { absturzReaktion, type AbsturzReaktion, type LetzteReaktion } from '../logik/absturz';
import { Hinweis, Karte, Knopf, Seite } from './bausteine';

const LETZTE = 'fitness.absturz';

function lies(): LetzteReaktion | undefined {
  try {
    const wert = sessionStorage.getItem(LETZTE);
    return wert ? (JSON.parse(wert) as LetzteReaktion) : undefined;
  } catch {
    return undefined;
  }
}

function merke(reaktion: AbsturzReaktion) {
  try {
    sessionStorage.setItem(LETZTE, JSON.stringify({ ms: Date.now(), seite: location.hash, reaktion }));
  } catch {
    // Ohne Speicher bleibt es bei der ersten Stufe; das Neuaufbauen allein kann keine Schleife bilden.
  }
}

function text(fehler: Error): string {
  return `${fehler.name}: ${fehler.message || String(fehler)}`;
}

type Zustand = { fehler?: Error; reaktion?: AbsturzReaktion; runde: number };

export class Absturz extends Component<{ children: ReactNode }, Zustand> {
  state: Zustand = { runde: 0 };

  static getDerivedStateFromError(fehler: Error): Partial<Zustand> {
    return { fehler, reaktion: absturzReaktion(Date.now(), location.hash, lies()) };
  }

  componentDidCatch(fehler: Error, info: ErrorInfo) {
    console.error(fehler, info.componentStack);
    const { reaktion } = this.state;
    if (!reaktion) return;
    merke(reaktion);
    if (reaktion === 'neuAufbauen') this.setState((z) => ({ fehler: undefined, reaktion: undefined, runde: z.runde + 1 }));
    if (reaktion === 'neuLaden') window.location.reload();
  }

  render() {
    const { fehler, reaktion, runde } = this.state;
    if (!fehler) return <Fragment key={runde}>{this.props.children}</Fragment>;
    if (reaktion !== 'hinweis') return null;
    return (
      <Seite titel="Da ging etwas schief">
        <Karte titel="Bitte lade neu" hinweis="Deine Daten sind sicher gespeichert.">
          <Knopf onClick={() => window.location.reload()}>Neu laden</Knopf>
        </Karte>
        <Hinweis>Fehler: {text(fehler)}</Hinweis>
      </Seite>
    );
  }
}
