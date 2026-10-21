// Testtag als Vollbild: Aufwärmen als Checkliste, dann je Test ein Bildschirm mit Zähler bzw.
// Stoppuhr (Mockup 4). Beim Klimmzug mit 0 Wdh. folgen die Sekunden im Hängen.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { speichereTesttag } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { testtagEinheit } from '../../logik/testtag';
import type { AppZustand, Einheit, Einstellungen, SatzErgebnis, Uebung } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { Checkliste, Hinweis, Knopf, Laedt } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { Technik } from '../../ui/technik';
import { Stoppuhr, Zaehler } from '../../ui/zaehler';
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
        <Test key={schritt} u={u} e={einstellungenAus(z)}
          inSek={u.bereich.einheit === 'Sek.'} mitHaengen={u.muster === 'vZug'} onErledigt={erledigt} />
      )}
    </main>
  );
}

function Aufwaermen({ zeilen, weiter }: { zeilen: Einheit['aufwaermen']; weiter: () => void }) {
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <h1 className="text-titel font-extrabold">Aufwärmen</h1>
      <Hinweis>Etwa 5 Minuten. Danach geht es mit den Tests los.</Hinweis>
      <div className="mt-6"><Checkliste zeilen={zeilen.map((z) => z.vorgabe)} /></div>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Knopf onClick={weiter}>Fertig</Knopf>
        <Knopf art="sekundaer" onClick={weiter}>Überspringen</Knopf>
      </div>
    </div>
  );
}

function Test({ u, e, inSek, mitHaengen, onErledigt }: {
  u: Uebung; e: Einstellungen; inSek: boolean; mitHaengen: boolean; onErledigt: (r: Ergebnis) => void;
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
      <h1 className="mt-1 text-titel font-extrabold">{haengen !== undefined ? 'Hängen an der Stange' : u.name}</h1>
      {haengen === undefined && <Technik e={e} u={u} />}
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
