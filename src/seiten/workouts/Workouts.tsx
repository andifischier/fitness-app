// Eigene Workouts (Entscheidung 21.10.2026): Liste und Editor. Ein Workout ist eine Übungsliste mit
// Sätzen oder ein Zirkel mit Runden und einer Vorgabe je Station. Starten lässt es sich auf „Vor dem
// Start“ unter „Eigenes Workout“.
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { aendereEinstellungen } from '../../daten/speichern';
import { WORKOUT } from '../../konfiguration';
import type { AppZustand, EigenesWorkout } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import {
  ersetzeEintrag, fertigesWorkout, leeresWorkout, mitWorkout, neuerEintrag, ohneWorkout, pruefeWorkout, verschiebe,
  waehlbareUebungen, workoutAlternativen, workoutsVon,
} from '../../logik/workouts';
import { Auswahl, Fehler, Hinweis, Karte, Knopf, Laedt, Seite, Stepper, Textfeld } from '../../ui/bausteine';
import { UebungWahl } from '../../ui/blaetter';
import { Icon } from '../../ui/Icon';
import { useZustand } from '../../ui/useZustand';

const ARTEN = [{ wert: 'liste', text: 'Übungsliste' }, { wert: 'zirkel', text: 'Zirkel' }] as const;

export function workoutText(w: EigenesWorkout): string {
  const n = w.uebungen.length;
  return w.art === 'zirkel'
    ? `Zirkel · ${w.runden} ${w.runden === 1 ? 'Runde' : 'Runden'} · ${n} ${n === 1 ? 'Station' : 'Stationen'}`
    : `Übungsliste · ${n} ${n === 1 ? 'Übung' : 'Übungen'}`;
}

export function WorkoutsSeite() {
  const z = useZustand();
  if (!z) return <Laedt />;
  const workouts = workoutsVon(z);
  return (
    <Seite titel="Meine Workouts" zurueck="/uebungen">
      <Hinweis>Starten kannst du ein Workout unter Heute, „Training starten“, „Eigenes Workout“.</Hinweis>
      {workouts.length === 0 && <p className="text-basis">Noch kein eigenes Workout.</p>}
      {workouts.length > 0 && (
        <ul className="rounded-karte border border-rand bg-flaeche px-5">
          {workouts.map((w) => (
            <li key={w.id} className="border-b border-linie last:border-b-0">
              <Link to={`/uebungen/workouts/${encodeURIComponent(w.id)}`} className="flex min-h-[60px] items-center gap-3 py-3">
                <span className="flex-1">
                  <span className="block text-gross font-semibold">{w.name}</span>
                  <span className="block text-hinweis text-gedaempft">{workoutText(w)}</span>
                </span>
                <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/uebungen/workouts/neu" className="flex min-h-primaer items-center justify-center rounded-karte bg-akzent px-5 text-gross font-bold text-flaeche">
        Neues Workout
      </Link>
    </Seite>
  );
}

export function WorkoutSeite() {
  const { id } = useParams();
  const z = useZustand();
  if (!z) return <Laedt />;
  if (!id) return <Editor z={z} start={leeresWorkout('liste')} />;
  const w = workoutsVon(z).find((x) => x.id === id);
  if (!w) return <Navigate to="/uebungen/workouts" replace />;
  return <Editor z={z} start={w} />;
}

type Wahl = { art: 'neu' } | { art: 'ersetzen'; index: number };

function Editor({ z, start }: { z: AppZustand; start: EigenesWorkout }) {
  const navigate = useNavigate();
  const [parameter] = useSearchParams();
  // Von „Vor dem Start“ aus angelegt: danach dorthin zurück, mit der Liste der Workouts.
  const ziel = parameter.get('zurueck') === 'start' ? '/start?workout=1' : '/uebungen/workouts';
  const [w, setW] = useState(start);
  const [fehler, setFehler] = useState<string[]>([]);
  const [wahl, setWahl] = useState<Wahl>();
  const [loeschen, setLoeschen] = useState(false);
  const neu = start.id === '';
  const zirkel = w.art === 'zirkel';

  const speichern = async () => {
    const probleme = pruefeWorkout(z, w);
    setFehler(probleme);
    if (probleme.length > 0) return;
    const fertig = fertigesWorkout(z, w);
    await aendereEinstellungen((e) => mitWorkout(e, fertig));
    navigate(ziel, { replace: true });
  };
  const entfernen = async () => {
    await aendereEinstellungen((e) => ohneWorkout(e, start.id));
    navigate(ziel, { replace: true });
  };
  const setzeEintrag = (i: number, teil: Partial<EigenesWorkout['uebungen'][number]>) =>
    setW({ ...w, uebungen: w.uebungen.map((x, j) => (j === i ? { ...x, ...teil } : x)) });
  const drin = new Set(w.uebungen.map((x) => x.uebungId));
  const waehlbar = waehlbareUebungen(z).filter((u) => !drin.has(u.id));
  const ersetzt = wahl?.art === 'ersetzen' ? w.uebungen[wahl.index] : undefined;

  return (
    <Seite titel={neu ? 'Neues Workout' : 'Workout bearbeiten'} zurueck={ziel}>
      <Fehler meldungen={fehler} />
      <Textfeld label="Name" wert={w.name} platzhalter="z. B. Oberkörper kurz"
        onChange={(name) => setW({ ...w, name: name.slice(0, WORKOUT.nameMaxZeichen) })} />
      <Karte titel="Art"
        hinweis={zirkel
          ? 'Zirkel: alle Stationen nacheinander, Runde für Runde, mit Stoppuhr und Bestzeit.'
          : 'Übungsliste: Sätze je Übung; Ziel und Gewicht rechnet die App wie gewohnt.'}>
        <Auswahl optionen={ARTEN} wert={w.art} spalten={2} onChange={(art) => setW({ ...w, art })} />
      </Karte>
      {zirkel && (
        <Karte titel="Runden">
          <Stepper label="Runden" wert={w.runden} min={WORKOUT.runden.min} max={WORKOUT.runden.max} onChange={(runden) => setW({ ...w, runden })} />
        </Karte>
      )}
      <Karte titel={zirkel ? 'Stationen' : 'Übungen'}>
        {w.uebungen.length === 0 && <Hinweis>Noch keine Übung.</Hinweis>}
        <ul>
          {w.uebungen.map((x, i) => {
            const u = uebungVon(z, x.uebungId);
            const inSek = u?.bereich.einheit === 'Sek.';
            return (
              <li key={`${x.uebungId}-${i}`} className="border-b border-linie py-3 first:pt-0 last:border-b-0">
                <div className="flex items-center gap-1">
                  <span className="flex-1 text-basis font-semibold">{u?.name ?? 'Unbekannte Übung'}</span>
                  <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => setW(verschiebe(w, i, -1))}
                    className="flex size-touch items-center justify-center text-gedaempft disabled:text-rand">
                    <Icon name="hoch" groesse={22} />
                  </button>
                  <button type="button" aria-label="Nach unten" disabled={i === w.uebungen.length - 1} onClick={() => setW(verschiebe(w, i, 1))}
                    className="flex size-touch items-center justify-center text-gedaempft disabled:text-rand">
                    <Icon name="runter" groesse={22} />
                  </button>
                  <button type="button" aria-label={`${u?.name ?? 'Übung'} ersetzen`} onClick={() => setWahl({ art: 'ersetzen', index: i })}
                    className="flex size-touch items-center justify-center text-gedaempft">
                    <Icon name="tauschen" groesse={22} />
                  </button>
                  <button type="button" aria-label={`${u?.name ?? 'Übung'} entfernen`}
                    onClick={() => setW({ ...w, uebungen: w.uebungen.filter((_, j) => j !== i) })}
                    className="flex size-touch items-center justify-center text-gedaempft">
                    <Icon name="kreuz" groesse={22} />
                  </button>
                </div>
                <div className="mt-2">
                  {zirkel ? (
                    <Stepper label={`Vorgabe ${u?.name ?? ''}`} wert={x.vorgabe} min={WORKOUT.vorgabe.min} max={WORKOUT.vorgabe.max}
                      schritt={inSek ? WORKOUT.vorgabe.schrittSek : 1} einheit={inSek ? 'Sek.' : 'Wdh.'}
                      onChange={(vorgabe) => setzeEintrag(i, { vorgabe })} />
                  ) : (
                    <Stepper label={`Sätze ${u?.name ?? ''}`} wert={x.saetze} min={WORKOUT.saetze.min} max={WORKOUT.saetze.max}
                      einheit={x.saetze === 1 ? 'Satz' : 'Sätze'} onChange={(saetze) => setzeEintrag(i, { saetze })} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {w.uebungen.length < WORKOUT.maxUebungen && (
          <div className="mt-3"><Knopf art="sekundaer" onClick={() => setWahl({ art: 'neu' })}>+ Übung hinzufügen</Knopf></div>
        )}
      </Karte>
      <Knopf onClick={() => void speichern()}>Speichern</Knopf>
      {!neu && (loeschen ? (
        <Karte titel="Workout löschen?" hinweis="Dein Verlauf bleibt erhalten.">
          <div className="grid grid-cols-2 gap-3">
            <Knopf art="sekundaer" onClick={() => setLoeschen(false)}>Abbrechen</Knopf>
            <Knopf onClick={() => void entfernen()}>Löschen</Knopf>
          </div>
        </Karte>
      ) : <Knopf art="schlicht" onClick={() => setLoeschen(true)}>Workout löschen</Knopf>)}

      {wahl?.art === 'neu' && (
        <UebungWahl titel="Übung hinzufügen" uebungen={waehlbar} onSchliessen={() => setWahl(undefined)}
          onWahl={(uebungId) => {
            const u = uebungVon(z, uebungId);
            if (u) setW({ ...w, uebungen: [...w.uebungen, neuerEintrag(u)] });
            setWahl(undefined);
          }} />
      )}
      {wahl?.art === 'ersetzen' && ersetzt && (
        <UebungWahl titel="Ersetzen" hinweis={`Statt ${uebungVon(z, ersetzt.uebungId)?.name ?? ''}. Oben Übungen derselben Art, ähnlich schwer.`}
          uebungen={waehlbar} vorschlaege={workoutAlternativen(z, ersetzt.uebungId).filter((u) => !drin.has(u.id)).slice(0, WORKOUT.vorschlaege)}
          onSchliessen={() => setWahl(undefined)}
          onWahl={(uebungId) => { setW(ersetzeEintrag(z, w, wahl.index, uebungId)); setWahl(undefined); }} />
      )}
    </Seite>
  );
}
