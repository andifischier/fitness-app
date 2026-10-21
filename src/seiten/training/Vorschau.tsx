// Vorschau (Mockup 3): Aufwärmen, Blöcke mit Übungen, Sätzen, Zielen und Last; „Tauschen“ zeigt nur
// Alternativen desselben Musters, die am Ort möglich sind. „Anpassen“ ändert Sätze, entfernt und fügt
// Übungen hinzu (nicht im Zirkel). Zurück behält die Einheit (Entscheidungen 21.10.2026); „Los geht's“
// öffnet das Training.
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { speichereTausch } from '../../daten/speichern';
import { WORKOUT } from '../../konfiguration';
import { entferneUebung, fuegeUebungHinzu, hinzufuegbar, kannAnpassen, setzeSaetze } from '../../logik/anpassen';
import { keinMuskelErholt, zirkelVorgaben } from '../../logik/heute';
import { lastAnzeige, tausche } from '../../logik/planung';
import type { AppZustand, Einheit } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { Hinweis, Knopf, Laedt, Stepper } from '../../ui/bausteine';
import { TauschBlatt, UebungWahl } from '../../ui/blaetter';
import { Icon } from '../../ui/Icon';
import { detailText, einheitName, lastText, vorgabeText } from '../../ui/texte';
import { useZustand } from '../../ui/useZustand';

export function VorschauSeite() {
  const { id } = useParams();
  const z = useZustand();
  if (!z) return <Laedt />;
  const einheit = z.einheiten.find((e) => e.id === id);
  if (!einheit || einheit.status !== 'geplant') return <Navigate to="/" replace />;
  return <Ansicht z={z} einheit={einheit} />;
}

const satzZahl = (e: Einheit) => e.bloecke.reduce((s, b) => s + b.positionen.reduce((t, p) => t + p.saetze, 0), 0);

function Ansicht({ z, einheit }: { z: AppZustand; einheit: Einheit }) {
  const navigate = useNavigate();
  const [tausch, setTausch] = useState<{ block: number; position: number }>();
  const [aufwaermenOffen, setAufwaermenOffen] = useState(false);
  const [anpassen, setAnpassen] = useState(false);
  const [waehlen, setWaehlen] = useState(false);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  const zirkelBlock = einheit.bloecke.find((b) => b.typ === 'zirkel');
  const titel = einheitName(z, einheit);
  const anpassbar = kannAnpassen(einheit);
  const kopf = zirkelBlock
    ? `ca. ${einheit.geschaetzteDauerMin} Min · ${zirkelBlock.runden ?? 1} Runden · ${zirkelBlock.positionen.length} Stationen`
    : `ca. ${einheit.geschaetzteDauerMin} Min · ${satzZahl(einheit)} Sätze`;
  const vorgaben = zirkelVorgaben(z, einheit);
  let supersatz = 0;

  const waehle = async (uebungId: string) => {
    if (!tausch) return;
    await speichereTausch(tausche(z, einheit, tausch.block, tausch.position, uebungId));
    setTausch(undefined);
  };
  const aendere = (neu: Einheit) => void speichereTausch(neu);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-8 pb-8">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="Zurück" className="-ml-3 flex size-touch items-center justify-center text-text">
          <Icon name="zurueck" />
        </Link>
        <h1 className="flex-1 text-screen font-extrabold">{titel}</h1>
        {anpassbar && (
          <button type="button" aria-pressed={anpassen} onClick={() => setAnpassen(!anpassen)}
            className="min-h-touch px-2 text-basis font-semibold text-akzent">
            {anpassen ? 'Fertig' : 'Anpassen'}
          </button>
        )}
      </header>
      <p className="mt-1 mb-5 text-basis text-gedaempft">{kopf}{ort ? ` · ${ort.name}` : ''}</p>

      <div className="flex flex-col gap-4">
        <section className="rounded-karte bg-linie">
          <button type="button" aria-expanded={aufwaermenOffen} onClick={() => setAufwaermenOffen(!aufwaermenOffen)}
            className="flex min-h-touch w-full items-center gap-4 px-5 py-3 text-left text-basis">
            <Icon name="flamme" groesse={22} />
            <span className="flex-1">Aufwärmen · 5 Min</span>
          </button>
          {aufwaermenOffen && (
            <ul className="px-5 pb-4 text-basis text-gedaempft">
              {einheit.aufwaermen.map((a, i) => <li key={i} className="py-1">{a.vorgabe}</li>)}
            </ul>
          )}
        </section>

        {einheit.bloecke.length === 0 && (
          <Hinweis>
            {keinMuskelErholt(z, einheit.erstelltAm)
              ? 'Heute ist noch kein Muskel erholt. Mach einen Zirkel oder Mobility, oder trainiere morgen.'
              : 'Für heute passt keine Übung. Ändere den Ort oder deine Einschränkungen.'}
          </Hinweis>
        )}

        {einheit.bloecke.map((b, bi) => {
          const label = b.typ === 'supersatz' ? `Kombi ${String.fromCharCode(65 + supersatz++)}`
            : b.typ === 'zirkel' ? `${b.runden ?? 1} Runden` : undefined;
          return (
            <section key={bi} className="rounded-karte border border-rand bg-flaeche px-5 py-4">
              {label && <p className="mb-1 text-hinweis font-bold tracking-wide text-akzent uppercase">{label}</p>}
              <ul>
                {b.positionen.map((p, pi) => {
                  const u = uebungVon(z, p.uebungId);
                  if (!u) return null;
                  const detail = b.typ === 'zirkel'
                    ? [vorgabeText(u, vorgaben[pi]), lastText(u, p)].filter(Boolean).join(' · ')
                    : detailText(u, p, lastAnzeige(z, u));
                  const merkmale = [
                    p.istErsatz && 'Ersatz', p.getauschtVon && 'Getauscht', p.langsam && '3 Sek. absenken',
                  ].filter(Boolean);
                  return (
                    <li key={pi} className="py-2">
                      <div className="flex items-center gap-3">
                        <span className="flex-1">
                          <span className="block text-gross font-semibold">{u.name}</span>
                          <span className="block text-basis text-gedaempft">
                            {detail}
                          </span>
                          {merkmale.length > 0 && <span className="block text-hinweis font-semibold text-akzent">{merkmale.join(' · ')}</span>}
                        </span>
                        {anpassen && anpassbar ? (
                          <button type="button" aria-label={`${u.name} entfernen`} onClick={() => aendere(entferneUebung(z, einheit, bi, pi))}
                            className="flex size-touch shrink-0 items-center justify-center text-gedaempft">
                            <Icon name="kreuz" groesse={22} />
                          </button>
                        ) : !p.istMaxTest && (
                          <button type="button" aria-label={`${u.name} tauschen`} onClick={() => setTausch({ block: bi, position: pi })}
                            className="flex size-touch shrink-0 items-center justify-center text-gedaempft">
                            <Icon name="tauschen" groesse={24} />
                          </button>
                        )}
                      </div>
                      {anpassen && anpassbar && !p.istMaxTest && (
                        <div className="mt-2">
                          <Stepper label={`Sätze ${u.name}`} wert={p.saetze} min={WORKOUT.saetze.min} max={WORKOUT.saetze.max}
                            einheit={p.saetze === 1 ? 'Satz' : 'Sätze'} onChange={(n) => aendere(setzeSaetze(z, einheit, bi, pi, n))} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {anpassen && anpassbar && (
          <Knopf art="sekundaer" onClick={() => setWaehlen(true)}>+ Übung hinzufügen</Knopf>
        )}
      </div>

      <div className="mt-auto pt-8">
        <Knopf onClick={() => navigate(`/training/${einheit.id}`)} deaktiviert={einheit.bloecke.length === 0}>Los geht's</Knopf>
      </div>

      {tausch && <TauschBlatt z={z} einheit={einheit} {...tausch} onWahl={(id) => void waehle(id)} onSchliessen={() => setTausch(undefined)} />}
      {waehlen && (
        <UebungWahl titel="Übung hinzufügen" hinweis="Nur Übungen, die hier möglich sind. Ziel und Last wie gewohnt."
          uebungen={hinzufuegbar(z, einheit)} onSchliessen={() => setWaehlen(false)}
          onWahl={(id) => { setWaehlen(false); aendere(fuegeUebungHinzu(z, einheit, id)); }} />
      )}
    </main>
  );
}
