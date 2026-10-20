// Eigene Übung anlegen (aus einer Vorlage, Entscheidung 20.10.2026) oder bearbeiten.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { speichereEigeneUebung } from '../../daten/speichern';
import {
  alleUtensilien, entwurfAusVorlage, fertigeUebung, leseZahl, normalisiereUebung, pruefeEigeneUebung, uebungGenutzt,
} from '../../logik/einstellungen';
import { alleUebungen } from '../../logik/equipment';
import { uebungVon } from '../../logik/verlauf';
import { MUSKELN, MUSTER_IDS, type AppZustand, type Uebung } from '../../logik/typen';
import {
  Auswahl, Chip, Fehler, Hinweis, Karte, Knopf, Laedt, Mehrfachauswahl, Schalter, Seite, Stepper, Textfeld, Zahlenfeld,
} from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { LASTTYP_NAMEN, MUSKEL_NAMEN, MUSTER_NAMEN, utensilName } from '../../ui/texte';
import { useZustand } from '../../ui/useZustand';
import { nachMuster, suche } from './Liste';

// Schritt 1: Vorlage wählen
export function VorlageSeite() {
  const z = useZustand();
  const [text, setText] = useState('');
  if (!z) return <Laedt />;
  return (
    <Seite titel="Eigene Übung" zurueck="/uebungen">
      <Hinweis>Wähle eine ähnliche Übung als Vorlage. Alle Angaben werden übernommen und lassen sich ändern.</Hinweis>
      <Textfeld typ="search" label="Vorlage suchen" wert={text} onChange={setText} platzhalter="z. B. Rudern" />
      {nachMuster(suche(alleUebungen(z), text)).map(([m, liste]) => (
        <section key={m}>
          <h2 className="mb-2 text-gross font-bold">{MUSTER_NAMEN[m]}</h2>
          <ul className="rounded-karte border border-rand bg-flaeche px-5">
            {liste.map((u) => (
              <li key={u.id} className="border-b border-linie last:border-b-0">
                <Link to={`/uebungen/neu/${encodeURIComponent(u.id)}`} className="flex min-h-[52px] items-center py-3 text-basis font-semibold">
                  {u.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Seite>
  );
}

// Schritt 2: Formular, vorausgefüllt aus der Vorlage
export function NeueUebungSeite() {
  const z = useZustand();
  const { vorlageId = '' } = useParams();
  if (!z) return <Laedt />;
  const vorlage = uebungVon(z, vorlageId);
  if (!vorlage) return <Seite titel="Neue Übung" zurueck="/uebungen/neu"><Hinweis>Die Vorlage gibt es nicht.</Hinweis></Seite>;
  return (
    <Formular z={z} start={entwurfAusVorlage(vorlage)} titel="Neue Übung" zurueck="/uebungen/neu"
      hinweis={`Vorlage: ${vorlage.name}`} gesperrt={false} />
  );
}

export function BearbeitenSeite() {
  const z = useZustand();
  const { id = '' } = useParams();
  if (!z) return <Laedt />;
  const u = z.eigeneUebungen.find((x) => x.id === id);
  if (!u) return <Seite titel="Übung bearbeiten" zurueck="/uebungen"><Hinweis>Nur eigene Übungen lassen sich bearbeiten.</Hinweis></Seite>;
  return (
    <Formular z={z} start={u} titel="Übung bearbeiten" zurueck={`/uebungen/${encodeURIComponent(u.id)}`}
      gesperrt={uebungGenutzt(z, u.id)} />
  );
}

const LASTTYPEN = (['KG', 'Band', 'Last', 'Zeit'] as const).map((wert) => ({ wert, text: LASTTYP_NAMEN[wert] }));

// gesperrt: Mit der Übung wurde schon trainiert; Muster und Belastung tragen die Progression und bleiben.
function Formular({ z, start, titel, zurueck, hinweis, gesperrt }: {
  z: AppZustand; start: Uebung; titel: string; zurueck: string; hinweis?: string; gesperrt: boolean;
}) {
  const navigate = useNavigate();
  const [u, setU] = useState<Uebung>(start);
  const [versuch, setVersuch] = useState(false);
  const aendere = (teil: Partial<Uebung>) => setU((alt) => ({ ...alt, ...teil }));
  const fehler = pruefeEigeneUebung(z, u);
  const n = normalisiereUebung(u);
  const mitHantel = u.equipment.some((g) => g.includes('KH') || g.includes('KB'));

  const speichern = async () => {
    setVersuch(true);
    if (fehler.length > 0) return;
    const fertig = fertigeUebung(z, u);
    await speichereEigeneUebung(fertig);
    navigate(`/uebungen/${encodeURIComponent(fertig.id)}`, { replace: true });
  };

  return (
    <Seite titel={titel} zurueck={zurueck}>
      {hinweis && <Hinweis>{hinweis}</Hinweis>}
      <Karte>
        <div className="flex flex-col gap-4">
          <Textfeld label="Name" wert={u.name} platzhalter="z. B. Hammercurls" onChange={(name) => aendere({ name })} />
          <label className="block">
            <span className="mb-1 block text-hinweis text-gedaempft">Muster</span>
            <select value={u.muster} disabled={gesperrt} onChange={(e) => aendere({ muster: e.target.value as Uebung['muster'] })}
              className="min-h-touch w-full rounded-xl border border-rand bg-flaeche px-3 text-gross disabled:text-gedaempft">
              {MUSTER_IDS.map((m) => <option key={m} value={m}>{MUSTER_NAMEN[m]}</option>)}
            </select>
          </label>
          {gesperrt && <Hinweis>Du hast mit dieser Übung schon trainiert. Muster und Belastung bleiben deshalb gleich.</Hinweis>}
        </div>
      </Karte>

      <Karte titel="Muskeln" hinweis="Hauptmuskeln zählen voll, mitbeteiligte halb.">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-basis font-semibold">Hauptmuskeln</p>
            <Mehrfachauswahl werte={u.primaer} onChange={(primaer) => aendere({ primaer })}
              optionen={MUSKELN.map((m) => ({ wert: m, text: MUSKEL_NAMEN[m] }))} />
          </div>
          <div>
            <p className="mb-2 text-basis font-semibold">Mitbeteiligt</p>
            <Mehrfachauswahl werte={n.sekundaer} onChange={(sekundaer) => aendere({ sekundaer })}
              optionen={MUSKELN.filter((m) => !u.primaer.includes(m)).map((m) => ({ wert: m, text: MUSKEL_NAMEN[m] }))} />
          </div>
        </div>
      </Karte>

      <Karte titel="Schwierigkeit" hinweis="Stufe innerhalb des Musters, 1 = leicht, 10 = schwer. Bestimmt die Reihenfolge beim Wechsel zur nächsten Übung.">
        <Stepper label="Schwierigkeit" wert={u.stufe} min={1} max={10} onChange={(stufe) => aendere({ stufe })} />
      </Karte>

      <EquipmentAuswahl z={z} gruppen={u.equipment} onChange={(equipment) => aendere({ equipment })} />

      <Karte titel="Belastung">
        <div className="flex flex-col gap-4">
          {gesperrt
            ? <p className="text-basis">{LASTTYP_NAMEN[u.lasttyp]}</p>
            : <Auswahl spalten={2} optionen={LASTTYPEN} wert={u.lasttyp} onChange={(lasttyp) => aendere({ lasttyp })} />}
          <div className="grid grid-cols-2 gap-3">
            <Zahlenfeld label={`Bereich von (${n.bereich.einheit})`} start={String(start.bereich.von)}
              onText={(t) => aendere({ bereich: { ...u.bereich, von: leseZahl(t) ?? Number.NaN } })} />
            <Zahlenfeld label={`bis (${n.bereich.einheit})`} start={String(start.bereich.bis)}
              onText={(t) => aendere({ bereich: { ...u.bereich, bis: leseZahl(t) ?? Number.NaN } })} />
          </div>
          {u.lasttyp === 'Band' && (
            <Schalter titel="Band unterstützt" hinweis="Fortschritt ist das nächstleichtere Band, z. B. Klimmzug mit Band."
              an={u.unterstuetzend} onChange={(unterstuetzend) => aendere({ unterstuetzend })} />
          )}
          {u.lasttyp === 'Last' && mitHantel && (
            <div>
              <p className="mb-2 text-basis font-semibold">Hanteln</p>
              <Auswahl spalten={2} wert={n.anzahlGewichte ?? 2} onChange={(anzahlGewichte) => aendere({ anzahlGewichte })}
                optionen={[{ wert: 1 as const, text: 'Eine' }, { wert: 2 as const, text: 'Zwei (je Hand)' }]} />
            </div>
          )}
          <Schalter titel="Für Zirkel geeignet" hinweis="Kann als Station in Zirkel-Workouts vorkommen."
            an={u.zirkelGeeignet} onChange={(zirkelGeeignet) => aendere({ zirkelGeeignet })} />
        </div>
      </Karte>

      {versuch && <Fehler meldungen={fehler} />}
      <Knopf onClick={() => void speichern()}>Speichern</Knopf>
    </Seite>
  );
}

// Equipment als Gruppen: Aus jeder Gruppe muss am Ort mindestens ein Utensil vorhanden sein.
function EquipmentAuswahl({ z, gruppen, onChange }: { z: AppZustand; gruppen: string[][]; onChange: (g: string[][]) => void }) {
  const utensilien = alleUtensilien(z);
  const setzeGruppe = (i: number, g: string[]) => onChange(gruppen.map((x, j) => (j === i ? g : x)));
  return (
    <Karte titel="Equipment"
      hinweis={gruppen.length === 0 ? 'Kein Equipment nötig.' : 'Jede Zeile wird gebraucht; innerhalb einer Zeile reicht eines der markierten Utensilien.'}>
      <div className="flex flex-col gap-4">
        {gruppen.map((g, i) => (
          <div key={i} className="rounded-xl border border-linie p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-basis font-semibold">{i === 0 ? 'Braucht' : 'Und außerdem'}</p>
              <button type="button" aria-label="Zeile entfernen" onClick={() => onChange(gruppen.filter((_, j) => j !== i))}
                className="flex size-touch items-center justify-center text-gedaempft">
                <Icon name="kreuz" groesse={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {utensilien.map((x) => (
                <Chip key={x.id} aktiv={g.includes(x.id)}
                  onClick={() => setzeGruppe(i, g.includes(x.id) ? g.filter((id) => id !== x.id) : [...g, x.id])}>
                  {utensilName(x)}
                </Chip>
              ))}
            </div>
          </div>
        ))}
        <Knopf art="schlicht" onClick={() => onChange([...gruppen, []])}>+ Utensil verlangen</Knopf>
      </div>
    </Karte>
  );
}
