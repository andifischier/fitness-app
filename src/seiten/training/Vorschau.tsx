// Vorschau (Mockup 3): Aufwärmen, Blöcke mit Übungen, Sätzen, Zielen und Last; „Tauschen“ zeigt nur
// Alternativen desselben Musters, die am Ort möglich sind. Zurück behält die Einheit (Entscheidung
// 21.10.2026); „Los geht's“ öffnet das Training.
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { speichereTausch } from '../../daten/speichern';
import { zirkelVorgaben } from '../../logik/heute';
import { alternativen, tausche } from '../../logik/planung';
import type { AppZustand, Einheit, Position, Uebung } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { Hinweis, Knopf, Laedt } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { FOKUS_NAMEN, lastText } from '../../ui/texte';
import { useZustand } from '../../ui/useZustand';

export function VorschauSeite() {
  const { id } = useParams();
  const z = useZustand();
  if (!z) return <Laedt />;
  const einheit = z.einheiten.find((e) => e.id === id);
  if (!einheit || einheit.status !== 'geplant') return <Navigate to="/" replace />;
  return <Ansicht z={z} einheit={einheit} />;
}

// „3 × Ziel 10 · 16 kg je Hand“; Halteübungen in Sekunden, Max-Test ohne Ziel.
function detailText(u: Uebung, p: Position): string {
  if (p.istMaxTest) return u.bereich.einheit === 'Sek.' ? 'Max-Test · so lange wie möglich' : 'Max-Test · so viele wie möglich';
  const ziel = u.bereich.einheit === 'Sek.' ? `Ziel ${p.zielWdh} Sek.` : `Ziel ${p.zielWdh}`;
  return [`${p.saetze} × ${ziel}`, lastText(u, p)].filter(Boolean).join(' · ');
}

const satzZahl = (e: Einheit) => e.bloecke.reduce((s, b) => s + b.positionen.reduce((t, p) => t + p.saetze, 0), 0);

function Ansicht({ z, einheit }: { z: AppZustand; einheit: Einheit }) {
  const navigate = useNavigate();
  const [tausch, setTausch] = useState<{ block: number; position: number }>();
  const [aufwaermenOffen, setAufwaermenOffen] = useState(false);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  const zirkelBlock = einheit.bloecke.find((b) => b.typ === 'zirkel');
  const zirkel = z.katalog.zirkel.find((x) => x.id === zirkelBlock?.zirkelId);
  const titel = zirkel ? zirkel.name : FOKUS_NAMEN[einheit.fokus];
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-8 pb-8">
      <header className="flex items-center gap-3">
        <Link to="/" aria-label="Zurück" className="-ml-3 flex size-touch items-center justify-center text-text">
          <Icon name="zurueck" />
        </Link>
        <h1 className="text-screen font-extrabold">{titel}</h1>
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

        {einheit.bloecke.length === 0 && <Hinweis>Für heute passt keine Übung. Ändere den Ort oder deine Einschränkungen.</Hinweis>}

        {einheit.bloecke.map((b, bi) => {
          const label = b.typ === 'supersatz' ? `Supersatz ${String.fromCharCode(65 + supersatz++)}`
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
                    : detailText(u, p);
                  const merkmale = [
                    p.istErsatz && 'Ersatz', p.getauschtVon && 'Getauscht', p.langsam && '3 Sek. absenken',
                  ].filter(Boolean);
                  return (
                    <li key={pi} className="flex items-center gap-3 py-2">
                      <span className="flex-1">
                        <span className="block text-gross font-semibold">{u.name}</span>
                        <span className="block text-basis text-gedaempft">
                          {detail}
                        </span>
                        {merkmale.length > 0 && <span className="block text-hinweis font-semibold text-akzent">{merkmale.join(' · ')}</span>}
                      </span>
                      {!p.istMaxTest && (
                        <button type="button" aria-label={`${u.name} tauschen`} onClick={() => setTausch({ block: bi, position: pi })}
                          className="flex size-touch shrink-0 items-center justify-center text-gedaempft">
                          <Icon name="tauschen" groesse={24} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <Knopf onClick={() => navigate(`/training/${einheit.id}`)} deaktiviert={einheit.bloecke.length === 0}>Los geht's</Knopf>
      </div>

      {tausch && <TauschBlatt z={z} einheit={einheit} {...tausch} onWahl={(id) => void waehle(id)} onSchliessen={() => setTausch(undefined)} />}
    </main>
  );
}

// Zirkel-Vorgabe aus dem Katalog; reine Zahlen bekommen die Einheit der Übung.
function vorgabeText(u: Uebung, vorgabe: string | undefined): string {
  if (!vorgabe) return '';
  return /^\d+$/.test(vorgabe) ? `${vorgabe} ${u.bereich.einheit}` : vorgabe;
}

function TauschBlatt({ z, einheit, block, position, onWahl, onSchliessen }: {
  z: AppZustand; einheit: Einheit; block: number; position: number; onWahl: (uebungId: string) => void; onSchliessen: () => void;
}) {
  const p = einheit.bloecke[block]!.positionen[position]!;
  const aktuell = uebungVon(z, p.uebungId);
  const liste = alternativen(z, einheit, block, position);
  return (
    <div className="fixed inset-0 z-10 flex items-end bg-text/40" onClick={onSchliessen}>
      <section role="dialog" aria-modal="true" aria-label="Übung tauschen" onClick={(ev) => ev.stopPropagation()}
        className="mx-auto max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-t-karte bg-flaeche px-seite pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-screen font-extrabold">Tauschen</h2>
          <button type="button" aria-label="Schließen" onClick={onSchliessen} className="flex size-touch items-center justify-center">
            <Icon name="kreuz" />
          </button>
        </div>
        <Hinweis>Statt {aktuell?.name}. Nur Übungen derselben Art, die hier möglich sind.</Hinweis>
        {liste.length === 0 && <p className="mt-4 text-basis">Hier gibt es keine Alternative.</p>}
        <ul className="mt-3">
          {liste.map((a) => {
            const u = uebungVon(z, a.uebungId);
            if (!u) return null;
            const ziel = u.bereich.einheit === 'Sek.' ? `Ziel ${a.zielWdh} Sek.` : `Ziel ${a.zielWdh}`;
            return (
              <li key={a.uebungId} className="border-b border-linie last:border-b-0">
                <button type="button" onClick={() => onWahl(a.uebungId)} className="flex min-h-[60px] w-full flex-col justify-center py-3 text-left">
                  <span className="text-gross font-semibold">{u.name}</span>
                  <span className="text-basis text-gedaempft">{[ziel, lastText(u, a)].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
