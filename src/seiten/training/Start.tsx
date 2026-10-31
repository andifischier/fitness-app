// Vor dem Start (Mockup 2): Trainingstage der Woche (nur, solange keine gewählt sind, mit Angebot
// einer Erholungswoche; Entscheidung 21.10.2026), eine Zeile mit Ort, Kombi oder Klassisch (Standard
// Kombi) und „Morgen wieder?“, die „Ändern“ aufklappt (Entscheidung 21.10.2026), dazu die Muskeln für
// heute (Vorschlag vorausgewählt, nicht erholte markiert) und die Dauer mit −/+ (Entscheidung 31.10.2026,
// ersetzt „15 Min länger?“), und „Einheit erstellen“; darunter „Stattdessen Zirkel“ mit der Liste der Zirkel und „Eigenes Workout“
// mit der Liste der eigenen Workouts (Entscheidung 21.10.2026). Alles ist vorausgefüllt.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { speichereNeueEinheit } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { maxOffeneTage, vorschlagTage } from '../../logik/ausblick';
import { isoWoche, wochentag } from '../../logik/datum';
import { zirkelBestzeit } from '../../logik/heute';
import { erstelleEinheit, muskelVorschlag, startfragen, workoutEinheit, type EinheitEingabe } from '../../logik/planung';
import { erholungswocheAngebot, type ErholungswocheGrund } from '../../logik/progression';
import { PROFIL } from '../../konfiguration';
import { MUSKELN, type AppZustand, type EigenesWorkout, type Muskel } from '../../logik/typen';
import { workoutAmOrt, workoutBestzeit, workoutsVon } from '../../logik/workouts';
import { Auswahl, Chip, Fehler, Hinweis, Karte, Knopf, Laedt, Stepper, TageWahl } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { MUSKEL_NAMEN, zeitText } from '../../ui/texte';
import { workoutText } from '../workouts/Workouts';
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
  const heute = wochentag(jetzt);
  const erledigt = z.wochen.find((w) => w.id === isoWoche(jetzt))?.einheiten ?? 0;
  // Heute ist immer dabei; die Prognose folgt aus erledigten Einheiten, heute und den späteren Tagen.
  const [tage, setTage] = useState(() => [...new Set([heute, ...vorschlagTage(z, jetzt)])].sort((a, b) => a - b));
  const prognose = fragen.prognoseAbfragen ? erledigt + tage.filter((t) => t >= heute).length : fragen.prognoseVorschlag;
  const [erholung, setErholung] = useState(angebot !== null);
  const [ortId, setOrtId] = useState(fragen.ortId);
  const [morgenWieder, setMorgenWieder] = useState(fragen.prognoseAbfragen ? tage.includes(heute + 1) : fragen.morgenWiederVorschlag);
  // Muskeln und Dauer folgen dem Vorschlag, bis der Nutzer sie ändert (Entscheidung 31.10.2026).
  const [muskeln, setMuskeln] = useState<Muskel[] | null>(null);
  const [dauer, setDauer] = useState<number | null>(null);
  const [art, setArt] = useState<'kombi' | 'klassisch'>('kombi');   // Standard Kombi (Entscheidung 21.10.2026)
  const [modus, setModus] = useState<'kraft' | 'zirkel' | 'workout'>(() =>
    params.get('workout') === '1' ? 'workout'
      : (fragen.zirkelVorschlag || params.get('zirkel') === '1') && angebot === null ? 'zirkel' : 'kraft');
  const zirkelModus = modus === 'zirkel';
  const setZirkelModus = (an: boolean) => setModus(an ? 'zirkel' : 'kraft');
  const workouts = workoutsVon(z);
  const [fehler, setFehler] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [details, setDetails] = useState(false);
  const mitZirkel = !(angebot !== null && erholung);
  // Ist die Woche schon gespeichert, fragt die App nur wegen der Pacing-Korrektur erneut.
  const nachPause = z.wochen.some((w) => w.id === isoWoche(jetzt));

  const bestzeiten = useMemo(
    () => new Map(z.katalog.zirkel.map((x) => [x.id, zirkelBestzeit(z, x.id, ortId, jetzt)])),
    [z, ortId, jetzt],
  );
  // Dauer wie in der Vorschau, inklusive Aufwärmen (Entscheidung 30.10.2026)
  const zirkelDauer = useMemo(
    () => new Map(z.katalog.zirkel.map((x) => [x.id, erstelleEinheit(z, {
      jetzt, ortId, prognose: 1, morgenWieder: false, laenger: false, zirkelId: x.id,
    }).geschaetzteDauerMin])),
    [z, ortId, jetzt],
  );

  // Vorschlag der Muskeln und Dauer zu den aktuellen Angaben; die Planung ist rein und schnell genug,
  // um bei jeder Änderung neu zu rechnen.
  const basis: EinheitEingabe = {
    jetzt, ortId, prognose, morgenWieder, laenger: false, klassisch: art === 'klassisch',
    ...(angebot !== null ? { erholungswoche: erholung } : {}),
  };
  const vorschlag = useMemo(() => muskelVorschlag(z, basis),
    [z, jetzt, ortId, prognose, morgenWieder, art, erholung]);
  const gewaehlt = muskeln ?? vorschlag.gewaehlt;
  const mitMuskeln = muskeln !== null ? { muskeln } : {};
  const vorschlagDauer = useMemo(() => erstelleEinheit(z, { ...basis, ...mitMuskeln }).geschaetzteDauerMin,
    [z, jetzt, ortId, prognose, morgenWieder, art, erholung, muskeln]);
  const geplantDauer = useMemo(() => (dauer === null ? vorschlagDauer
    : erstelleEinheit(z, { ...basis, ...mitMuskeln, dauerMin: dauer }).geschaetzteDauerMin),
  [z, jetzt, ortId, prognose, morgenWieder, art, erholung, muskeln, dauer, vorschlagDauer]);
  const { min: dauerMin, max: dauerMax, schritt: dauerSchritt } = PROFIL.wunschdauerMin;
  const dauerWert = dauer ?? Math.min(dauerMax, Math.max(dauerMin, Math.round(vorschlagDauer / dauerSchritt) * dauerSchritt));

  const erstelle = async (zirkelId?: string, workout?: EigenesWorkout) => {
    if (laeuft) return;
    setLaeuft(true);
    const zeit = lokaleZeit();
    const kraft = zirkelId === undefined && workout === undefined;
    const extra = {
      ...(angebot !== null ? { erholungswoche: erholung } : {}), laenger: kraft && dauer !== null && dauer > vorschlagDauer,
      ...(fragen.prognoseAbfragen ? { tage } : {}),
    };
    const eingabe: EinheitEingabe = {
      jetzt: zeit, ortId, prognose, morgenWieder: kraft && morgenWieder, laenger: false, zirkelId,
      klassisch: art === 'klassisch',
      ...(angebot !== null ? { erholungswoche: erholung } : {}),
      ...(kraft ? mitMuskeln : {}),
      ...(kraft && dauer !== null ? { dauerMin: dauer } : {}),
    };
    const einheit = workout ? workoutEinheit(z, workout, eingabe) : erstelleEinheit(z, eingabe);
    try {
      await speichereNeueEinheit(einheit, prognose, zeit, extra);
      navigate(`/vorschau/${einheit.id}`, { replace: true });
    } catch {
      setFehler(true);
      setLaeuft(false);
    }
  };


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
          <Karte titel="An welchen Tagen trainierst du diese Woche?"
            hinweis={nachPause
              ? 'Du hast länger pausiert. Wähle die restlichen Tage neu; heute ist dabei.'
              : 'Nur bei der ersten Einheit der Woche; heute ist dabei. Auf Heute siehst du dann, was an jedem Tag geplant ist.'}>
            <TageWahl wert={tage} ab={heute} max={maxOffeneTage(z, jetzt)}
              onChange={(neu) => {
                const mitHeute = [...new Set([heute, ...neu])].sort((a, b) => a - b);
                setTage(mitHeute);
                setMorgenWieder(mitHeute.includes(heute + 1));
              }} />
          </Karte>
        )}
        {angebot !== null && (
          <Karte titel="Diese Woche als Erholungswoche?"
            hinweis={`${GRUND_TEXT[angebot]} Halbes Volumen hilft dir, dich zu erholen; die Gewichte bleiben gleich.`}>
            <Auswahl optionen={JA_NEIN} wert={jaNein(erholung)} spalten={2}
              onChange={(w) => { setErholung(w === 'ja'); if (w === 'ja' && zirkelModus) setZirkelModus(false); }} />
          </Karte>
        )}
        {(modus !== 'kraft' || details) && (
          <Karte titel="Wo trainierst du?">
            <Auswahl optionen={z.orte.map((o) => ({ wert: o.id, text: o.name }))} wert={ortId} onChange={setOrtId} />
          </Karte>
        )}
        {modus === 'workout' ? (
          <>
            <Karte titel="Welches Workout?">
              {workouts.length === 0 && <Hinweis>Du hast noch kein eigenes Workout.</Hinweis>}
              <ul>
                {workouts.map((w) => {
                  const fehlen = workoutAmOrt(z, w, ortId, jetzt).fehlen.length;
                  const best = workoutBestzeit(z, w, ortId, jetzt);
                  const zusatz = [
                    fehlen > 0 && `${fehlen} ${fehlen === 1 ? 'Übung geht' : 'Übungen gehen'} hier nicht`,
                    w.art === 'zirkel' && (best !== undefined ? `Bestzeit ${zeitText(best)}` : 'noch keine Bestzeit'),
                  ].filter(Boolean).join(' · ');
                  const leer = fehlen === w.uebungen.length;
                  return (
                    <li key={w.id} className="border-b border-linie last:border-b-0">
                      <button type="button" disabled={laeuft || leer} onClick={() => void erstelle(undefined, w)}
                        className="flex min-h-[60px] w-full items-center gap-3 py-3 text-left disabled:opacity-50">
                        <span className="flex-1">
                          <span className="block text-gross font-semibold">{w.name}</span>
                          <span className="block text-hinweis text-gedaempft">{workoutText(w)}{zusatz && ` · ${zusatz}`}</span>
                        </span>
                        <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-x-4">
                <Link to="/uebungen/workouts/neu?zurueck=start" className="flex min-h-touch items-center text-basis font-semibold text-akzent">+ Neues Workout</Link>
                {workouts.length > 0 && (
                  <Link to="/uebungen/workouts" className="flex min-h-touch items-center text-basis font-semibold text-akzent">Workouts bearbeiten</Link>
                )}
              </div>
            </Karte>
            {workouts.some((w) => w.art === 'liste') && (
              <Karte titel="Wie trainierst du heute?"
                hinweis={art === 'kombi'
                  ? 'Kombi: je ein Satz jeder Übung der Runde, dann Pause. Gilt für Übungslisten.'
                  : 'Klassisch: alle Sätze einer Übung, dann die nächste. Gilt für Übungslisten.'}>
                <Auswahl optionen={ARTEN} wert={art} spalten={2} onChange={setArt} />
              </Karte>
            )}
          </>
        ) : zirkelModus ? (
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
                          ca. {zirkelDauer.get(x.id)} Min · {best !== undefined ? `Bestzeit ${zeitText(best)}` : 'noch keine Bestzeit'}
                        </span>
                      </span>
                      <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Karte>
        ) : !details ? (
          <>
            {/* Eine Zeile statt drei Fragen (Entscheidung 21.10.2026); „Ändern“ zeigt die Auswahl. */}
            <section className="flex items-center gap-3 rounded-karte border border-rand bg-flaeche px-5 py-4">
              <p className="flex-1 text-gross font-semibold">
                {[
                  z.orte.find((o) => o.id === ortId)?.name,
                  art === 'kombi' ? 'Kombi' : 'Klassisch',
                  morgenWieder ? 'morgen wieder' : 'morgen frei',
                ].filter(Boolean).join(' · ')}
                <span className="block text-hinweis font-normal text-gedaempft">{muskelText(gewaehlt)}</span>
              </p>
              <button type="button" onClick={() => setDetails(true)}
                className="flex min-h-touch items-center text-basis font-semibold text-akzent">Ändern</button>
            </section>
            <Karte titel="Wie lange trainierst du?"
              hinweis={dauer === null
                ? fragen.laengerAnbieten
                  ? 'Diese Woche hast du wenige Einheiten. Mit mehr Zeit schaffst du mehr Sätze.'
                  : 'Vorschlag der App. Zusätzliche Sätze kürzen spätere Einheiten der Woche nicht.'
                : geplantDauer < dauer - 2
                  ? `Mehr passt heute nicht: ca. ${geplantDauer} Min.`
                  : `Geplant: ca. ${geplantDauer} Min. Zusätzliche Sätze kürzen spätere Einheiten der Woche nicht.`}>
              <Stepper wert={dauerWert} min={dauerMin} max={dauerMax} schritt={dauerSchritt} einheit="Min"
                label="Dauer" onChange={setDauer} />
            </Karte>
          </>
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
              <Auswahl optionen={JA_NEIN} wert={jaNein(morgenWieder)} spalten={2}
                onChange={(w) => { setMorgenWieder(w === 'ja'); setMuskeln(null); }} />
            </Karte>
            <Karte titel="Welche Muskeln heute?"
              hinweis={vorschlag.nichtErholt.length > 0
                ? 'Vorausgewählt ist der Vorschlag. Nicht erholte Muskeln kannst du trotzdem wählen; dann steigt das Risiko einer Überlastung.'
                : 'Vorausgewählt ist der Vorschlag. Tippe, um Muskeln dazuzunehmen oder wegzulassen, z. B. bei Muskelkater.'}>
              <div className="flex flex-wrap gap-2">
                {MUSKELN.map((m) => {
                  const an = gewaehlt.includes(m);
                  return (
                    <Chip key={m} aktiv={an}
                      onClick={() => setMuskeln(an ? gewaehlt.filter((x) => x !== m) : MUSKELN.filter((x) => x === m || gewaehlt.includes(x)))}>
                      {MUSKEL_NAMEN[m]}
                      {vorschlag.nichtErholt.includes(m) && <span className="block text-hinweis font-normal text-gedaempft">nicht erholt</span>}
                    </Chip>
                  );
                })}
              </div>
            </Karte>
            <Karte titel="Wie lange trainierst du?"
              hinweis={dauer === null
                ? fragen.laengerAnbieten
                  ? 'Diese Woche hast du wenige Einheiten. Mit mehr Zeit schaffst du mehr Sätze.'
                  : 'Vorschlag der App. Zusätzliche Sätze kürzen spätere Einheiten der Woche nicht.'
                : geplantDauer < dauer - 2
                  ? `Mehr passt heute nicht: ca. ${geplantDauer} Min.`
                  : `Geplant: ca. ${geplantDauer} Min. Zusätzliche Sätze kürzen spätere Einheiten der Woche nicht.`}>
              <Stepper wert={dauerWert} min={dauerMin} max={dauerMax} schritt={dauerSchritt} einheit="Min"
                label="Dauer" onChange={setDauer} />
            </Karte>
          </>
        )}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-8">
        {modus === 'workout' ? (
          <>
            <Hinweis>Tippe auf ein Workout, um es zu erstellen.</Hinweis>
            <Knopf art="schlicht" onClick={() => setModus('kraft')}>Doch Einheit der App</Knopf>
          </>
        ) : zirkelModus ? (
          <>
            <Hinweis>Tippe auf einen Zirkel, um ihn zu erstellen.</Hinweis>
            <Knopf art="schlicht" onClick={() => setZirkelModus(false)}>Doch Krafteinheit</Knopf>
          </>
        ) : (
          <>
            {gewaehlt.length === 0 && <Hinweis>Wähle unter „Ändern“ mindestens einen Muskel.</Hinweis>}
            <Knopf onClick={() => void erstelle()} deaktiviert={laeuft || gewaehlt.length === 0}>Einheit erstellen</Knopf>
            {mitZirkel && <Knopf art="schlicht" onClick={() => setZirkelModus(true)}>Stattdessen Zirkel</Knopf>}
            <Knopf art="schlicht" onClick={() => setModus('workout')}>Eigenes Workout</Knopf>
          </>
        )}
      </div>
    </main>
  );
}

// Kurzfassung der Muskeln für die Zeile oben: alle zehn heißen „Ganzkörper“.
function muskelText(muskeln: readonly Muskel[]): string {
  if (muskeln.length === MUSKELN.length) return 'Ganzkörper';
  if (muskeln.length === 0) return 'Keine Muskeln gewählt';
  return muskeln.map((m) => MUSKEL_NAMEN[m]).join(', ');
}
