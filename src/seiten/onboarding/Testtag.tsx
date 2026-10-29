// Testtag als Vollbild: Aufwärmen Schritt für Schritt, dann je Test ein Bildschirm mit Zähler bzw.
// Stoppuhr (Mockup 4). Beim Klimmzug mit 0 Wdh. folgen die Sekunden im Hängen. Danach die
// Gewichtstests: Gewicht wählen, so viele saubere Wiederholungen wie möglich. Am Ende zeigt ein
// Ergebnisbildschirm Startübung und Startziel je Test (Entscheidungen 21.10.2026).
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { speichereTesttag } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { lastraster } from '../../logik/equipment';
import { bereichFuer, lastAnzeige } from '../../logik/planung';
import { lasttestErgebnisse, testtagEinheit, testtagErgebnisse, type TestErgebnis } from '../../logik/testtag';
import type { AppZustand, Einheit, Einstellungen, Position, SatzErgebnis, Uebung } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { AufwaermSchritte } from '../../ui/aufwaermen';
import { Hinweis, Knopf, Laedt } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { Technik } from '../../ui/technik';
import { lastTeile } from '../../ui/texte';
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
  const [aufwaermNr, setAufwaermNr] = useState(0);
  const [gestartetAm] = useState(lokaleZeit);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);
  const [fehler, setFehler] = useState(false);
  const [gespeichert, setGespeichert] = useState<Einheit>();
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
      setGespeichert(einheit);
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

  if (gespeichert) return <Ergebnis z={z} einheit={gespeichert} onWeiter={() => navigate('/', { replace: true })} />;
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
      {schritt < 0 && (
        <AufwaermSchritte key={aufwaermNr} zeilen={start.aufwaermen} nr={aufwaermNr} onNr={setAufwaermNr}
          onFertig={() => setSchritt(0)} hinweisEnde="Danach geht es mit den Tests los." />
      )}
      {p && u && !p.istLasttest && (
        <Test key={schritt} u={u} e={einstellungenAus(z)}
          inSek={u.bereich.einheit === 'Sek.'} mitHaengen={u.muster === 'vZug'} onErledigt={erledigt} />
      )}
      {p && u && p.istLasttest && (
        <Lasttest key={schritt} z={z} ortId={start.ortId} p={p} u={u} onErledigt={erledigt} />
      )}
    </main>
  );
}

function Test({ u, e, inSek, mitHaengen, onErledigt }: {
  u: Uebung; e: Einstellungen; inSek: boolean; mitHaengen: boolean; onErledigt: (r: Ergebnis) => void;
}) {
  const [wert, setWert] = useState(0);
  const [haengen, setHaengen] = useState<number>();     // gesetzt: Pullups mit 0 Wdh., jetzt Hängen
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
          ? 'Keinen Pullup geschafft. Häng dich mit gestreckten Armen an die Stange und halte so lange wie möglich.'
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

// Gewichtstest: Gewicht mit −/+ wählen, dann so viele saubere Wiederholungen wie möglich.
function Lasttest({ z, ortId, p, u, onErledigt }: {
  z: AppZustand; ortId: string; p: Position; u: Uebung; onErledigt: (r: Ergebnis) => void;
}) {
  const ort = z.orte.find((o) => o.id === ortId);
  const raster = ort ? lastraster(ort, u) : [];
  const [last, setLast] = useState(p.last ?? raster[0] ?? 0);
  const [wert, setWert] = useState(0);
  const { von, bis } = bereichFuer(einstellungenAus(z), u);
  const pos = raster.indexOf(last);
  const teile = lastTeile(u, { last });
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <p className="text-hinweis font-bold tracking-wide text-akzent uppercase">Gewichtstest</p>
      <h1 className="mt-1 text-titel font-extrabold">{u.name}</h1>
      <Technik e={einstellungenAus(z)} u={u} />
      <div className="mt-4 rounded-karte border border-rand bg-flaeche p-5">
        <p className="text-basis text-gedaempft">Mit welchem Gewicht?</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <p className="text-titel leading-tight font-extrabold">{teile?.gross}</p>
            {teile?.klein && <p className="text-basis text-gedaempft">{teile.klein}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Leichter" disabled={pos <= 0} onClick={() => setLast(raster[pos - 1]!)}
              className="flex size-touch items-center justify-center rounded-xl border border-rand text-akzent disabled:text-rand">
              <span aria-hidden="true" className="text-screen font-bold">−</span>
            </button>
            <button type="button" aria-label="Schwerer" disabled={pos < 0 || pos >= raster.length - 1} onClick={() => setLast(raster[pos + 1]!)}
              className="flex size-touch items-center justify-center rounded-xl border border-rand text-akzent disabled:text-rand">
              <Icon name="plus" groesse={20} />
            </button>
          </div>
        </div>
        <p className="mt-4 border-t border-linie pt-4 text-basis">
          Wähle ein Gewicht, mit dem du etwa {von} bis {bis} Wiederholungen schaffst. Dann so viele saubere
          Wiederholungen wie möglich, aufhören, wenn höchstens noch eine ginge.
        </p>
      </div>
      <Zaehler wert={wert} onChange={setWert} />
      <div className="mt-auto pt-8">
        <Knopf onClick={() => onErledigt({ wdh: wert, last })}>Test erledigt</Knopf>
      </div>
    </div>
  );
}

function ergebnisText(t: TestErgebnis): string {
  if (t.haengenSek !== undefined) return `0 Wdh., ${t.haengenSek} Sek. hängen`;
  return `${t.ergebnis} ${t.inSek ? 'Sek.' : 'Wdh.'}`;
}

// Ergebnis des Testtags: je Test das Ergebnis, darunter Startübung und Startziel.
function Ergebnis({ z, einheit, onWeiter }: { z: AppZustand; einheit: Einheit; onWeiter: () => void }) {
  const liste = testtagErgebnisse(z, einheit);
  const lasten = lasttestErgebnisse(z, einheit);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-12 pb-8">
      <p className="text-basis font-semibold text-akzent">Testtag erledigt</p>
      <h1 className="text-titel font-extrabold">Dein Start steht</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {liste.map((t) => (
          <li key={t.muster} className="rounded-karte border border-rand bg-flaeche p-5">
            <p className="flex items-baseline justify-between gap-3 text-basis">
              <span className="font-semibold">{t.test.name}</span>
              <span className="shrink-0 text-gross font-extrabold">{ergebnisText(t)}</span>
            </p>
            {t.start && (
              <p className="mt-2 text-basis text-gedaempft">
                Start: {t.start.uebung.name} · Ziel {t.start.zielWdh}{t.start.uebung.bereich.einheit === 'Sek.' ? ' Sek.' : ''}
                {lastAnzeige(z, t.start.uebung) === 'waehlen' ? ' · Gewicht wählst du im 1. Satz' : ''}
              </p>
            )}
          </li>
        ))}
        {lasten.map((t) => (
          <li key={t.uebung.id} className="rounded-karte border border-rand bg-flaeche p-5">
            <p className="flex items-baseline justify-between gap-3 text-basis">
              <span className="font-semibold">{t.uebung.name}</span>
              <span className="shrink-0 text-gross font-extrabold">{lastTeile(t.uebung, { last: t.last })?.gross} × {t.wdh}</span>
            </p>
            {t.start && (
              <p className="mt-2 text-basis text-gedaempft">
                Start: {lastTeile(t.uebung, { last: t.start.last })?.gross} · Ziel {t.start.zielWdh}
              </p>
            )}
          </li>
        ))}
      </ul>
      {lasten.length > 0 && (
        <div className="mt-4"><Hinweis>Für andere Hantelübungen schlägt die App ein Startgewicht aus diesen Tests vor.</Hinweis></div>
      )}
      <div className="mt-4"><Hinweis>Erste Einheit ab morgen. Deine Woche planst du auf Heute.</Hinweis></div>
      <div className="mt-auto pt-8"><Knopf onClick={onWeiter}>Zu Heute</Knopf></div>
    </main>
  );
}
