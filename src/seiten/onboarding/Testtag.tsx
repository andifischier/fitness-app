// Testtag als Vollbild: Aufwärmen als Checkliste, dann je Test ein Bildschirm mit Zähler bzw.
// Stoppuhr (Mockup 4). Beim Klimmzug mit 0 Wdh. folgen die Sekunden im Hängen.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { speichereTesttag } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { videoLinkVon } from '../../logik/einstellungen';
import { testtagEinheit } from '../../logik/testtag';
import type { AppZustand, Einheit, SatzErgebnis } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { Haekchen, Hinweis, Knopf, Laedt } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

export function TesttagSeite() {
  const z = useZustand();
  const [einheit, setEinheit] = useState<Einheit>();
  useEffect(() => {
    if (!z || einheit) return;
    const ort = z.orte.find((o) => o.standard) ?? z.orte[0];
    if (ort) setEinheit(testtagEinheit(z, ort.id, lokaleZeit()));
  }, [z, einheit]);
  if (!z) return <Laedt />;
  if (z.orte.length === 0) return <Laedt />;
  if (!einheit) return <Laedt />;
  return <Ablauf z={z} start={einheit} />;
}

type Ergebnis = Omit<SatzErgebnis, 'nr' | 'zeit'>;

function Ablauf({ z, start }: { z: AppZustand; start: Einheit }) {
  const navigate = useNavigate();
  const [schritt, setSchritt] = useState(-1);          // −1 = Aufwärmen
  const [gestartetAm] = useState(lokaleZeit);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [fehler, setFehler] = useState(false);
  const positionen = start.bloecke.map((b) => b.positionen[0]!);

  const fertig = async (alle: Ergebnis[]) => {
    const jetzt = lokaleZeit();
    const einheit: Einheit = {
      ...start, status: 'abgeschlossen', gestartetAm, beendetAm: jetzt,
      bloecke: start.bloecke.map((b, i) => ({
        ...b, positionen: b.positionen.map((p) => ({ ...p, ergebnisse: alle[i] ? [{ nr: 1, ...alle[i], zeit: jetzt }] : [] })),
      })),
    };
    try {
      await speichereTesttag(einheit, jetzt);
      navigate('/', { replace: true });
    } catch {
      setFehler(true);
    }
  };
  const erledigt = (r: Ergebnis) => {
    const alle = [...ergebnisse, r];
    setErgebnisse(alle);
    if (alle.length < positionen.length) setSchritt(alle.length);
    else void fertig(alle);
  };

  const p = schritt >= 0 ? positionen[schritt] : undefined;
  const u = p ? uebungVon(z, p.uebungId) : undefined;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-4 pb-8">
      <header className="flex items-center gap-3">
        <Link to="/onboarding/5" aria-label="Testtag abbrechen" className="-ml-3 flex size-touch items-center justify-center"
          onClick={(ev) => { if (!window.confirm('Testtag abbrechen? Die Ergebnisse gehen verloren.')) ev.preventDefault(); }}>
          <Icon name="kreuz" />
        </Link>
        <p className="flex-1 text-center text-basis text-gedaempft">
          {schritt < 0 ? 'Aufwärmen' : `Test ${schritt + 1} von ${positionen.length}`}
        </p>
        <span className="size-touch" />
      </header>
      <div className="mt-3 h-1 rounded-full bg-linie">
        <div className="h-1 rounded-full bg-akzent" style={{ width: `${((schritt + 1) / (positionen.length + 1)) * 100}%` }} />
      </div>
      {fehler && <p role="alert" className="mt-4 font-semibold">Speichern hat nicht geklappt. Bitte versuche es noch einmal.</p>}
      {schritt < 0 && <Aufwaermen zeilen={start.aufwaermen} weiter={() => setSchritt(0)} />}
      {p && u && (
        <Test key={schritt} name={u.name} video={videoLinkVon(einstellungenAus(z), u)}
          inSek={u.bereich.einheit === 'Sek.'} mitHaengen={u.muster === 'vZug'} onErledigt={erledigt} />
      )}
    </main>
  );
}

function Aufwaermen({ zeilen, weiter }: { zeilen: Einheit['aufwaermen']; weiter: () => void }) {
  const [an, setAn] = useState<number[]>([]);
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <h1 className="text-titel font-extrabold">Aufwärmen</h1>
      <Hinweis>Etwa 5 Minuten. Danach geht es mit den Tests los.</Hinweis>
      <ul className="mt-6 rounded-karte border border-rand bg-flaeche px-5">
        {zeilen.map((zeile, i) => (
          <li key={i} className="border-b border-linie last:border-b-0">
            <button type="button" role="checkbox" aria-checked={an.includes(i)}
              onClick={() => setAn(an.includes(i) ? an.filter((x) => x !== i) : [...an, i])}
              className="flex min-h-[56px] w-full items-center gap-4 py-3 text-left text-basis">
              <Haekchen an={an.includes(i)} />
              {zeile.vorgabe}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Knopf onClick={weiter}>Fertig</Knopf>
        <Knopf art="sekundaer" onClick={weiter}>Überspringen</Knopf>
      </div>
    </div>
  );
}

function Test({ name, video, inSek, mitHaengen, onErledigt }: {
  name: string; video: string; inSek: boolean; mitHaengen: boolean; onErledigt: (r: Ergebnis) => void;
}) {
  const [wert, setWert] = useState(0);
  const [haengen, setHaengen] = useState<number>();     // gesetzt: Klimmzug mit 0 Wdh., jetzt Hängen
  const zeigeSek = inSek || haengen !== undefined;
  const erledigt = () => {
    if (haengen !== undefined) onErledigt({ wdh: 0, sek: haengen });
    else if (inSek) onErledigt({ sek: wert });
    else if (mitHaengen && wert === 0) setHaengen(0);
    else onErledigt({ wdh: wert });
  };
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <p className="text-hinweis font-bold tracking-wide text-akzent uppercase">Max-Test</p>
      <h1 className="mt-1 text-titel font-extrabold">{haengen !== undefined ? 'Hängen an der Stange' : name}</h1>
      <a href={video} target="_blank" rel="noreferrer" className="mt-3 flex min-h-touch items-center gap-2 text-gross font-semibold text-akzent">
        <Icon name="video" groesse={22} /> Technik auf YouTube
      </a>
      <div className="mt-4 rounded-karte border border-rand bg-flaeche p-5 text-basis">
        {haengen !== undefined
          ? 'Kein Klimmzug geschafft. Häng dich mit gestreckten Armen an die Stange und halte so lange wie möglich.'
          : inSek
            ? 'So lange halten, wie es sauber geht.'
            : 'So viele saubere Wiederholungen wie möglich, ohne Pause.'}
      </div>
      {zeigeSek
        ? <Stoppuhr key={haengen !== undefined ? 'haengen' : 'halten'} wert={haengen ?? wert}
            onChange={(s) => (haengen !== undefined ? setHaengen(s) : setWert(s))} />
        : <Zaehler wert={wert} onChange={setWert} />}
      <div className="mt-auto pt-8">
        <Knopf onClick={erledigt}>Test erledigt</Knopf>
      </div>
    </div>
  );
}

const rund = 'flex size-[72px] items-center justify-center rounded-full border border-rand bg-flaeche text-text disabled:text-rand';

function Zaehler({ wert, onChange, einheit = 'Wiederholungen' }: { wert: number; onChange: (w: number) => void; einheit?: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="text-basis text-gedaempft">Geschafft</p>
      <div className="flex items-center gap-8">
        <button type="button" className={rund} disabled={wert <= 0} onClick={() => onChange(wert - 1)} aria-label="Weniger">
          <span aria-hidden="true" className="text-screen">−</span>
        </button>
        <span className="min-w-24 text-center text-zahl font-extrabold" aria-live="polite">{wert}</span>
        <button type="button" className={rund} onClick={() => onChange(wert + 1)} aria-label="Mehr">
          <Icon name="plus" />
        </button>
      </div>
      <p className="text-hinweis text-gedaempft">{einheit}</p>
    </div>
  );
}

// Stoppuhr in ganzen Sekunden; der Wert lässt sich danach mit −/+ korrigieren.
function Stoppuhr({ wert, onChange }: { wert: number; onChange: (s: number) => void }) {
  const [startMs, setStartMs] = useState<number>();
  useEffect(() => {
    if (startMs === undefined) return;
    const t = window.setInterval(() => onChange(Math.floor((Date.now() - startMs) / 1000)), 250);
    return () => window.clearInterval(t);
  }, [startMs, onChange]);
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <Zaehler wert={wert} onChange={(s) => { setStartMs(undefined); onChange(s); }} einheit="Sekunden" />
      <div className="w-full">
        {startMs === undefined
          ? <Knopf art="sekundaer" onClick={() => { onChange(0); setStartMs(Date.now()); }}>{wert > 0 ? 'Neu starten' : 'Stoppuhr starten'}</Knopf>
          : <Knopf art="sekundaer" onClick={() => setStartMs(undefined)}>Stopp</Knopf>}
      </div>
    </div>
  );
}
