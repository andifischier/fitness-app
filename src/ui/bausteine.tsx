// Wiederkehrende Bausteine im Stil der Mockups: Seitenkopf, Karten, Auswahl-Chips, Schalter,
// Eingabefelder und Buttons. Nur Tokens aus „Gestaltung“ (src/index.css).
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon';

export function Seite({ titel, zurueck, children }: { titel: string; zurueck?: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-seite pt-8 pb-10">
      <header className={`flex items-center gap-3 ${zurueck ? 'mb-6' : 'mb-6 pt-4'}`}>
        {zurueck && (
          <Link to={zurueck} aria-label="Zurück" className="-ml-3 flex size-touch items-center justify-center text-text">
            <Icon name="zurueck" />
          </Link>
        )}
        <h1 className={zurueck ? 'text-screen font-extrabold' : 'text-titel font-extrabold'}>{titel}</h1>
      </header>
      <div className="flex flex-col gap-5">{children}</div>
    </main>
  );
}

export function Karte({ titel, hinweis, children }: { titel?: string; hinweis?: ReactNode; children?: ReactNode }) {
  return (
    <section className="rounded-karte border border-rand bg-flaeche p-5">
      {titel && <h2 className="text-gross font-bold">{titel}</h2>}
      {hinweis && <p className="mt-1 text-hinweis text-gedaempft">{hinweis}</p>}
      {children && <div className={titel || hinweis ? 'mt-4' : ''}>{children}</div>}
    </section>
  );
}

export function Hinweis({ children }: { children: ReactNode }) {
  return <p className="text-hinweis text-gedaempft">{children}</p>;
}

// Fehlermeldungen; die Token-Palette hat keine Warnfarbe, daher fett und mit Rand.
export function Fehler({ meldungen }: { meldungen: string[] }) {
  if (meldungen.length === 0) return null;
  return (
    <div role="alert" className="rounded-karte border border-text bg-flaeche px-4 py-3 text-hinweis font-semibold">
      {meldungen.map((m) => <p key={m}>{m}</p>)}
    </div>
  );
}

const chip = (aktiv: boolean) =>
  `min-h-touch rounded-xl border px-3 py-2 text-basis ${
    aktiv ? 'border-akzent bg-akzent-hell font-bold text-akzent' : 'border-rand bg-flaeche text-text'
  }`;

export function Chip({ aktiv, onClick, children, label }: {
  aktiv: boolean; onClick: () => void; children: ReactNode; label?: string;
}) {
  return (
    <button type="button" aria-pressed={aktiv} aria-label={label} onClick={onClick} className={chip(aktiv)}>
      {children}
    </button>
  );
}

// Einfachauswahl als Chips; spalten = 0 lässt die Chips umbrechen.
export function Auswahl<T extends string | number>({ optionen, wert, onChange, spalten = 0 }: {
  optionen: readonly { wert: T; text: string }[]; wert: T; onChange: (w: T) => void; spalten?: number;
}) {
  return (
    <div
      role="radiogroup"
      className={spalten > 0 ? 'grid gap-2' : 'flex flex-wrap gap-2'}
      style={spalten > 0 ? { gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))` } : undefined}
    >
      {optionen.map((o) => (
        <button
          key={String(o.wert)} type="button" role="radio" aria-checked={o.wert === wert}
          onClick={() => onChange(o.wert)} className={chip(o.wert === wert)}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

export function Mehrfachauswahl<T extends string>({ optionen, werte, onChange }: {
  optionen: readonly { wert: T; text: string }[]; werte: readonly T[]; onChange: (w: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {optionen.map((o) => {
        const an = werte.includes(o.wert);
        return (
          <Chip key={o.wert} aktiv={an} onClick={() => onChange(an ? werte.filter((w) => w !== o.wert) : [...werte, o.wert])}>
            {o.text}
          </Chip>
        );
      })}
    </div>
  );
}

export function Haekchen({ an }: { an: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-[26px] shrink-0 items-center justify-center rounded-md border ${
        an ? 'border-akzent bg-akzent text-flaeche' : 'border-gedaempft bg-flaeche'
      }`}
    >
      {an && <Icon name="haken" groesse={18} />}
    </span>
  );
}

export function Schalter({ an, onChange, titel, hinweis }: {
  an: boolean; onChange: (an: boolean) => void; titel: string; hinweis?: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={an} onClick={() => onChange(!an)}
      className="flex min-h-touch w-full items-center justify-between gap-4 text-left">
      <span>
        <span className="block text-basis font-semibold">{titel}</span>
        {hinweis && <span className="block text-hinweis text-gedaempft">{hinweis}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${an ? 'bg-akzent' : 'bg-rand'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-flaeche transition-all ${an ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

// Plus-Minus-Feld für ganze Zahlen in festen Schritten
export function Stepper({ wert, min, max, schritt = 1, einheit, onChange, label }: {
  wert: number; min: number; max: number; schritt?: number; einheit?: string; onChange: (w: number) => void; label: string;
}) {
  const knopf = 'flex size-touch items-center justify-center rounded-xl border border-rand bg-flaeche text-akzent disabled:text-rand';
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" className={knopf} disabled={wert - schritt < min} onClick={() => onChange(wert - schritt)}
        aria-label={`${label} verringern`}>
        <span aria-hidden="true" className="text-screen font-bold">−</span>
      </button>
      <span className="min-w-20 text-center text-gross font-bold">{wert}{einheit ? ` ${einheit}` : ''}</span>
      <button type="button" className={knopf} disabled={wert + schritt > max} onClick={() => onChange(wert + schritt)}
        aria-label={`${label} erhöhen`}>
        <Icon name="plus" groesse={20} />
      </button>
    </div>
  );
}

const feld = 'min-h-touch w-full rounded-xl border border-rand bg-flaeche px-4 py-2 text-gross outline-none focus:border-akzent';

export function Textfeld({ label, wert, onChange, platzhalter, typ = 'text' }: {
  label: string; wert: string; onChange: (w: string) => void; platzhalter?: string; typ?: 'text' | 'url' | 'search' | 'date';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-hinweis text-gedaempft">{label}</span>
      <input type={typ} className={feld} value={wert} placeholder={platzhalter} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Zahlenfeld mit Dezimalkomma: hält den getippten Text und meldet ihn bei jeder Änderung.
export function Zahlenfeld({ label, start, onText }: { label: string; start: string; onText: (text: string) => void }) {
  const [text, setText] = useState(start);
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-hinweis text-gedaempft">{label}</span>
      <input
        inputMode="decimal" className={feld} value={text}
        onChange={(e) => { setText(e.target.value); onText(e.target.value); }}
      />
    </label>
  );
}

export function Knopf({ art = 'primaer', onClick, children, deaktiviert = false, typ = 'button' }: {
  art?: 'primaer' | 'sekundaer' | 'schlicht'; onClick?: () => void; children: ReactNode; deaktiviert?: boolean; typ?: 'button' | 'submit';
}) {
  const stil = {
    primaer: 'min-h-primaer w-full rounded-karte bg-akzent px-5 text-gross font-bold text-flaeche',
    sekundaer: 'min-h-primaer w-full rounded-karte border border-rand bg-flaeche px-5 text-gross font-semibold text-text',
    schlicht: 'min-h-touch px-2 text-basis font-semibold text-akzent',
  }[art];
  return (
    <button type={typ} onClick={onClick} disabled={deaktiviert} className={`${stil} disabled:opacity-50`}>
      {children}
    </button>
  );
}

// Zeile einer Liste, die zu einer Unterseite führt
export function Zeile({ zu, titel, wert }: { zu: string; titel: string; wert?: string }) {
  return (
    <Link to={zu} className="flex min-h-[60px] items-center gap-3 border-b border-linie py-3 last:border-b-0">
      <span className="flex-1">
        <span className="block text-gross font-semibold">{titel}</span>
        {wert && <span className="block text-hinweis text-gedaempft">{wert}</span>}
      </span>
      <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
    </Link>
  );
}

// Abhakliste (Aufwärmen, Mobility); der Haken ist nur eine Hilfe und wird nicht gespeichert.
export function Checkliste({ zeilen }: { zeilen: string[] }) {
  const [an, setAn] = useState<number[]>([]);
  return (
    <ul className="rounded-karte border border-rand bg-flaeche px-5">
      {zeilen.map((zeile, i) => (
        <li key={i} className="border-b border-linie last:border-b-0">
          <button type="button" role="checkbox" aria-checked={an.includes(i)}
            onClick={() => setAn(an.includes(i) ? an.filter((x) => x !== i) : [...an, i])}
            className="flex min-h-[56px] w-full items-center gap-4 py-3 text-left text-basis">
            <Haekchen an={an.includes(i)} />
            {zeile}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Laedt() {
  return <main className="mx-auto max-w-xl px-seite pt-12 text-gedaempft">Lädt …</main>;
}

// Bewertung mit 1 bis 5 Sternen; ohne Wert ist kein Stern gefüllt.
export function Sternwahl({ wert, onChange, label }: { wert?: number; onChange: (sterne: 1 | 2 | 3 | 4 | 5) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={wert === n} aria-label={n === 1 ? '1 Stern' : `${n} Sterne`}
          onClick={() => onChange(n)}
          className={`flex size-touch items-center justify-center ${wert !== undefined && n <= wert ? 'text-akzent' : 'text-rand'}`}>
          <Icon name="stern" groesse={24} gefuellt={wert !== undefined && n <= wert} />
        </button>
      ))}
    </div>
  );
}
