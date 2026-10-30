// Aufwärmen Schritt für Schritt (Entscheidung 29.10.2026), im Training und am Testtag: je Übung ein
// Bildschirm mit Vorgabe, weiter mit „Weiter“; Halteübungen mit Countdown. Den Schritt hält die Seite.
// Wie bei den Übungen gibt es zu jedem Schritt „So geht's“ mit Anleitung und Video (Entscheidung 30.10.2026).
import { aufwaermSchritt, aufwaermTechnik } from '../logik/aufwaermen';
import type { AppZustand, Einheit } from '../logik/typen';
import { Hinweis, Knopf } from './bausteine';
import { Technik } from './technik';
import { einstellungenAus } from './useZustand';
import { Countdown } from './zaehler';

export function AufwaermSchritte({ z, zeilen, nr, onNr, onFertig, hinweisEnde }: {
  z: AppZustand; zeilen: Einheit['aufwaermen']; nr: number; onNr: (nr: number) => void; onFertig: () => void; hinweisEnde?: string;
}) {
  const zeile = zeilen[nr];
  if (!zeile) return <div className="mt-auto pt-8"><Knopf onClick={onFertig}>Los geht's</Knopf></div>;
  const s = aufwaermSchritt(zeile.vorgabe);
  const letzte = nr >= zeilen.length - 1;
  const ziel = s.sek !== undefined
    ? { gross: String(s.sek), klein: 'Sekunden halten' }
    : { gross: s.wdh !== undefined ? String(s.wdh) : '–', klein: 'Wiederholungen' };
  return (
    <div className="flex flex-1 flex-col">
      <p className="mt-6 text-hinweis font-bold tracking-wide text-akzent uppercase">
        {zeile.uebungId ? 'Aufwärmsatz' : 'Aufwärmen'} · {nr + 1} von {zeilen.length}
      </p>
      <h1 className="mt-1 text-titel leading-tight font-extrabold">{s.name}</h1>
      <Technik key={nr} e={einstellungenAus(z)} u={aufwaermTechnik(z, zeile)} />
      <section className="mt-5 rounded-karte border-2 border-akzent bg-flaeche p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-basis text-gedaempft">Ziel</p>
            <p className="text-titel leading-tight font-extrabold">{ziel.gross}</p>
            <p className="text-basis text-gedaempft">{s.je ? `${ziel.klein} ${s.je}` : ziel.klein}</p>
          </div>
          {s.last && (
            <div>
              <p className="text-basis text-gedaempft">{s.last.endsWith('Variante') ? 'Ausführung' : 'Gewicht'}</p>
              <p className="text-gross leading-tight font-extrabold">{s.last}</p>
            </div>
          )}
        </div>
      </section>
      {s.sek !== undefined && <Countdown key={nr} ziel={s.sek} />}
      {letzte && hinweisEnde && <div className="mt-4"><Hinweis>{hinweisEnde}</Hinweis></div>}
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Knopf onClick={() => (letzte ? onFertig() : onNr(nr + 1))}>{letzte ? 'Fertig' : 'Weiter'}</Knopf>
        <Knopf art="sekundaer" onClick={onFertig}>Aufwärmen überspringen</Knopf>
      </div>
    </div>
  );
}
