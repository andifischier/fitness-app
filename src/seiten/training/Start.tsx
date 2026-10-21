// Vor dem Start (Mockup 2): Wochenprognose (nur erste Einheit der Woche, mit Angebot einer
// Erholungswoche), Ort, Kombi oder Klassisch (Standard Kombi), „Morgen wieder?“, „15 Min länger?“
// und „Einheit erstellen“; darunter „Stattdessen Zirkel“ mit der Liste der Zirkel. Alles ist vorausgefüllt.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { PROFIL } from '../../konfiguration';
import { speichereNeueEinheit } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { isoWoche } from '../../logik/datum';
import { zirkelBestzeit } from '../../logik/heute';
import { erstelleEinheit, startfragen } from '../../logik/planung';
import { erholungswocheAngebot, type ErholungswocheGrund } from '../../logik/progression';
import type { AppZustand } from '../../logik/typen';
import { Auswahl, Fehler, Hinweis, Karte, Knopf, Laedt } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { zeitText } from '../../ui/texte';
import { useZustand } from '../../ui/useZustand';

export function StartSeite() {
  const z = useZustand();
  const [jetzt] = useState(lokaleZeit);
  if (!z) return <Laedt />;
  return <Formular z={z} jetzt={jetzt} />;
}

const GRUND_TEXT: Record<ErholungswocheGrund, string> = {
  leistung: 'Deine Leistung ist zuletzt bei mehreren Übungen gesunken.',
  anstrengung: 'Deine letzten Einheiten waren sehr anstrengend.',
  zehnWochen: 'Du trainierst seit 10 Wochen ohne leichtere Woche.',
};

const JA_NEIN = [{ wert: 'ja', text: 'Ja' }, { wert: 'nein', text: 'Nein' }] as const;
const jaNein = (an: boolean) => (an ? 'ja' : 'nein');
const ARTEN = [{ wert: 'kombi', text: 'Kombi' }, { wert: 'klassisch', text: 'Klassisch' }] as const;

function Formular({ z, jetzt }: { z: AppZustand; jetzt: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Startwerte einmal beim Öffnen; spätere Änderungen der Daten setzen die Auswahl nicht zurück.
  const [start] = useState(() => ({ fragen: startfragen(z, jetzt), angebot: erholungswocheAngebot(z, jetzt) }));
  const { fragen, angebot } = start;
  const [prognose, setPrognose] = useState(fragen.prognoseVorschlag);
  const [erholung, setErholung] = useState(angebot !== null);
  const [ortId, setOrtId] = useState(fragen.ortId);
  const [morgenWieder, setMorgenWieder] = useState(fragen.morgenWiederVorschlag);
  const [laenger, setLaenger] = useState(false);
  const [art, setArt] = useState<'kombi' | 'klassisch'>('kombi');   // Standard Kombi (Entscheidung 21.10.2026)
  const [zirkelModus, setZirkelModus] = useState((fragen.zirkelVorschlag || params.get('zirkel') === '1') && angebot === null);
  const [fehler, setFehler] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const mitZirkel = !(angebot !== null && erholung);
  // Ist die Woche schon gespeichert, fragt die App nur wegen der Pacing-Korrektur erneut.
  const nachPause = z.wochen.some((w) => w.id === isoWoche(jetzt));

  const bestzeiten = useMemo(
    () => new Map(z.katalog.zirkel.map((x) => [x.id, zirkelBestzeit(z, x.id, ortId, jetzt)])),
    [z, ortId, jetzt],
  );

  const erstelle = async (zirkelId?: string) => {
    if (laeuft) return;
    setLaeuft(true);
    const zeit = lokaleZeit();
    const ohneZirkel = zirkelId === undefined;
    const extra = { ...(angebot !== null ? { erholungswoche: erholung } : {}), laenger: ohneZirkel && laenger };
    const einheit = erstelleEinheit(z, {
      jetzt: zeit, ortId, prognose, morgenWieder: ohneZirkel && morgenWieder, laenger: extra.laenger, zirkelId,
      klassisch: art === 'klassisch',
      ...(angebot !== null ? { erholungswoche: erholung } : {}),
    });
    try {
      await speichereNeueEinheit(einheit, prognose, zeit, extra);
      navigate(`/vorschau/${einheit.id}`, { replace: true });
    } catch {
      setFehler(true);
      setLaeuft(false);
    }
  };

  const { min, max } = PROFIL.einheitenProWoche;
  const zahlen = Array.from({ length: max - min + 1 }, (_, i) => ({ wert: min + i, text: String(min + i) }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-8 pb-8">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="Zurück" className="-ml-3 flex size-touch items-center justify-center text-text">
          <Icon name="zurueck" />
        </Link>
        <h1 className="text-screen font-extrabold">Vor dem Start</h1>
      </header>
      <div className="flex flex-col gap-5">
        {fehler && <Fehler meldungen={['Speichern hat nicht geklappt. Bitte versuche es noch einmal.']} />}
        {fragen.prognoseAbfragen && (
          <Karte titel="Wie oft schaffst du es diese Woche?"
            hinweis={nachPause
              ? 'Du hast länger pausiert. Der Vorschlag ist angepasst.'
              : 'Nur bei der ersten Einheit der Woche. Vorschlag aus deinem Schnitt.'}>
            <Auswahl optionen={zahlen} wert={prognose} onChange={setPrognose} spalten={6} />
          </Karte>
        )}
        {angebot !== null && (
          <Karte titel="Diese Woche als Erholungswoche?"
            hinweis={`${GRUND_TEXT[angebot]} Halbes Volumen hilft dir, dich zu erholen; die Gewichte bleiben gleich.`}>
            <Auswahl optionen={JA_NEIN} wert={jaNein(erholung)} spalten={2}
              onChange={(w) => { setErholung(w === 'ja'); if (w === 'ja') setZirkelModus(false); }} />
          </Karte>
        )}
        <Karte titel="Wo trainierst du?">
          <Auswahl optionen={z.orte.map((o) => ({ wert: o.id, text: o.name }))} wert={ortId} onChange={setOrtId} />
        </Karte>
        {zirkelModus ? (
          <Karte titel="Welcher Zirkel?" hinweis={fragen.zirkelVorschlag ? 'Diese Woche ist ein Zirkel dran.' : undefined}>
            <ul>
              {z.katalog.zirkel.map((x) => {
                const best = bestzeiten.get(x.id);
                return (
                  <li key={x.id} className="border-b border-linie last:border-b-0">
                    <button type="button" disabled={laeuft} onClick={() => void erstelle(x.id)}
                      className="flex min-h-[60px] w-full items-center gap-3 py-3 text-left">
                      <span className="flex-1">
                        <span className="block text-gross font-semibold">{x.name}</span>
                        <span className="block text-hinweis text-gedaempft">
                          {x.dauerHinweis} · {best !== undefined ? `Bestzeit ${zeitText(best)}` : 'noch keine Bestzeit'}
                        </span>
                      </span>
                      <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Karte>
        ) : (
          <>
            <Karte titel="Wie trainierst du heute?"
              hinweis={art === 'kombi'
                ? 'Kombi: je ein Satz jeder Übung der Runde, dann Pause. Spart Zeit.'
                : 'Klassisch: alle Sätze einer Übung, dann die nächste.'}>
              <Auswahl optionen={ARTEN} wert={art} spalten={2} onChange={setArt} />
            </Karte>
            <Karte titel="Morgen wieder trainieren?"
              hinweis="Bei Ja trainierst du heute nur Ober- oder Unterkörper, damit morgen die andere Hälfte frisch ist.">
              <Auswahl optionen={JA_NEIN} wert={jaNein(morgenWieder)} spalten={2} onChange={(w) => setMorgenWieder(w === 'ja')} />
            </Karte>
            {fragen.laengerAnbieten && (
              <Karte titel="15 Min länger?" hinweis="Diese Woche hast du wenige Einheiten. Mit 15 Min mehr schaffst du mehr Sätze.">
                <Auswahl optionen={JA_NEIN} wert={jaNein(laenger)} spalten={2} onChange={(w) => setLaenger(w === 'ja')} />
              </Karte>
            )}
          </>
        )}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-8">
        {zirkelModus ? (
          <>
            <Hinweis>Tippe auf einen Zirkel, um ihn zu erstellen.</Hinweis>
            <Knopf art="schlicht" onClick={() => setZirkelModus(false)}>Doch Krafteinheit</Knopf>
          </>
        ) : (
          <>
            <Knopf onClick={() => void erstelle()} deaktiviert={laeuft}>Einheit erstellen</Knopf>
            {mitZirkel && <Knopf art="schlicht" onClick={() => setZirkelModus(true)}>Stattdessen Zirkel</Knopf>}
          </>
        )}
      </div>
    </main>
  );
}
