// Trainings-Player (Mockups 4 bis 7): Aufwärmen, Max-Test, Satz, Pause, Supersatz, Zirkel-Modus,
// Übungsfeedback und Abschluss. Jeder erledigte Satz und jedes Feedback wird sofort gespeichert; ein
// Neustart setzt am nächsten offenen Satz bzw. beim offenen Feedback fort.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { beendeEinheit, speichereAbschluss, speichereLaufendeEinheit, starteEinheit } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { PLAYER, PROGRESSION } from '../../konfiguration';
import { lastraster } from '../../logik/equipment';
import { zirkelBestzeit, zirkelVorgaben } from '../../logik/heute';
import { kannTauschen, mobilityZeilen, tausche } from '../../logik/planung';
import {
  aktuellerSchritt, erledigteSaetze, letztesMal, offeneFeedbacks, pauseNach, positionVon, satzVorgabe, schritte,
  feedbackVorschlag, setzeFeedback, starte, trageSatzEin, uebungNummer, type SatzVorgabe, type Schritt, type Stelle,
} from '../../logik/player';
import { vorschauNaechstesMal, type Rekord } from '../../logik/progression';
import type { AppZustand, Einheit, Feedback, Sterne, Uebung } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { Checkliste, Hinweis, Knopf, Laedt, Sternwahl } from '../../ui/bausteine';
import { TauschBlatt } from '../../ui/blaetter';
import { Icon } from '../../ui/Icon';
import { bereiteTonVor, pausenEnde, useBildschirmAn } from '../../ui/signal';
import {
  BAND_NAMEN, feedbackOptionen, lastTeile, lastText, naechstesMalText, rekordZeile, zeitText,
} from '../../ui/texte';
import { Technik } from '../../ui/technik';
import { einstellungenAus, useZustand } from '../../ui/useZustand';
import { Stoppuhr, Zaehler } from '../../ui/zaehler';

interface Schluss { einheit?: Einheit; rekorde?: Rekord[]; bestzeit?: number; fehler?: boolean }

export function TrainingSeite() {
  const { id } = useParams();
  const z = useZustand();
  const navigate = useNavigate();
  const [schluss, setSchluss] = useState<Schluss>();
  const beendet = useRef(false);
  useBildschirmAn();

  if (schluss) return z ? <Abschluss z={z} schluss={schluss} /> : <Laedt />;
  if (!z) return <Laedt />;
  const einheit = z.einheiten.find((e) => e.id === id);
  if (!einheit || (einheit.status !== 'geplant' && einheit.status !== 'laufend')) return <Navigate to="/" replace />;

  const beenden = async (e: Einheit) => {
    if (beendet.current) return;
    beendet.current = true;
    setSchluss({});
    const jetzt = lokaleZeit();
    const zirkel = e.bloecke.find((b) => b.typ === 'zirkel');
    const bestzeit = zirkel?.zirkelId ? zirkelBestzeit(z, zirkel.zirkelId, e.ortId, jetzt) : undefined;
    try {
      const fertig = await beendeEinheit(e, jetzt);
      if (fertig) setSchluss({ ...fertig, bestzeit });
      else navigate('/', { replace: true });
    } catch {
      setSchluss({ fehler: true });
    }
  };
  return <Player key={einheit.id} z={z} start={einheit} onBeenden={(e) => void beenden(e)} />;
}

type Pausenzeit = { ende: number; dauer: number };
type Phase = { art: 'aufwaermen' } | { art: 'satz' } | ({ art: 'pause' } & Pausenzeit)
  | { art: 'feedback'; pause?: Pausenzeit };

// Nach dem Feedback geht es mit der restlichen Pause weiter (sie läuft ab dem Satzende).
const nachFeedback = (pause?: Pausenzeit): Phase =>
  pause && pause.ende > Date.now() ? { art: 'pause', ...pause } : { art: 'satz' };

function Player({ z, start, onBeenden }: { z: AppZustand; start: Einheit; onBeenden: (e: Einheit) => void }) {
  const navigate = useNavigate();
  const [einheit, setEinheit] = useState(start);
  const [phase, setPhase] = useState<Phase>({
    art: start.status === 'geplant' ? 'aufwaermen' : offeneFeedbacks(start).length > 0 ? 'feedback' : 'satz',
  });
  const [menue, setMenue] = useState(false);
  const [tauschen, setTauschen] = useState(false);
  const [fehler, setFehler] = useState(false);
  const liste = useMemo(() => schritte(einheit), [einheit]);
  const index = aktuellerSchritt(einheit);
  const schritt = liste[index];
  const zirkel = einheit.format === 'zirkel';

  // Eine fortgesetzte Einheit, in der schon alles erledigt und bewertet ist, wird gleich abgeschlossen.
  useEffect(() => {
    if (einheit.status === 'laufend' && !schritt && offeneFeedbacks(einheit).length === 0) onBeenden(einheit);
  }, []);

  const losgehen = async () => {
    bereiteTonVor();
    try {
      const jetzt = lokaleZeit();
      await starteEinheit(einheit.id, jetzt);
      setEinheit(starte(einheit, jetzt));
      setPhase({ art: 'satz' });
    } catch {
      setFehler(true);
    }
  };

  const erledigt = async (wert: number, last?: number) => {
    if (!schritt) return;
    bereiteTonVor();
    const neu = trageSatzEin(z, einheit, schritt, wert, lokaleZeit(), last);
    try {
      if (!(await speichereLaufendeEinheit(neu))) throw new Error('nicht gespeichert');
    } catch {
      setFehler(true);
      return;
    }
    setFehler(false);
    setEinheit(neu);
    const ende = aktuellerSchritt(neu) >= liste.length;
    const pause = ende ? 0 : pauseNach(neu, index);
    const zeit = pause > 0 ? { ende: Date.now() + pause * 1000, dauer: pause } : undefined;
    if (offeneFeedbacks(neu).length > 0) setPhase({ art: 'feedback', pause: zeit });
    else if (ende) onBeenden(neu);
    else setPhase(zeit ? { art: 'pause', ...zeit } : { art: 'satz' });
  };

  // Tauschen vor dem ersten Satz einer Übung (Entscheidung 21.10.2026); Ziel und Last der neuen Übung.
  const getauscht = async (s: Schritt, uebungId: string) => {
    setTauschen(false);
    const neu = tausche(z, einheit, s.block, s.position, uebungId);
    try {
      if (!(await speichereLaufendeEinheit(neu))) throw new Error('nicht gespeichert');
    } catch {
      setFehler(true);
      return;
    }
    setFehler(false);
    setEinheit(neu);
  };

  const bewertet = async (stelle: Stelle, feedback: Feedback, pause?: Pausenzeit) => {
    const neu = setzeFeedback(einheit, stelle, feedback);
    try {
      if (!(await speichereLaufendeEinheit(neu))) throw new Error('nicht gespeichert');
    } catch {
      setFehler(true);
      return;
    }
    setFehler(false);
    setEinheit(neu);
    if (offeneFeedbacks(neu).length > 0) return;
    if (aktuellerSchritt(neu) >= liste.length) onBeenden(neu);
    else setPhase(nachFeedback(pause));
  };

  if (phase.art === 'aufwaermen') {
    return (
      <Rahmen titel="Aufwärmen" anteil={0} onSchliessen={() => navigate(`/vorschau/${einheit.id}`)}>
        {fehler && <Speicherfehler />}
        <Aufwaermen zeilen={einheit.aufwaermen.map((a) => a.vorgabe)} zirkel={zirkel} weiter={() => void losgehen()} />
      </Rahmen>
    );
  }
  const offen = offeneFeedbacks(einheit)[0];
  if (phase.art === 'feedback' && offen) {
    const n = uebungNummer(einheit, { ...offen, satz: 1 });
    return (
      <Rahmen titel={`Übung ${n.nr} von ${n.von}`} anteil={erledigteSaetze(einheit) / Math.max(1, liste.length)}
        start={einheit.gestartetAm} onSchliessen={() => setMenue(true)}>
        {fehler && <Speicherfehler />}
        <UebungsFeedback key={`${offen.block}.${offen.position}`} z={z} einheit={einheit} stelle={offen}
          onWeiter={(fb) => void bewertet(offen, fb, phase.pause)} />
        {menue && (
          <Menue onFortsetzen={() => setMenue(false)} onSpaeter={() => navigate('/')}
            onBeenden={() => { setMenue(false); onBeenden(einheit); }} />
        )}
      </Rahmen>
    );
  }
  if (!schritt) return <Laedt />;

  const anteil = erledigteSaetze(einheit) / Math.max(1, liste.length);
  const u = uebungVon(z, positionVon(einheit, schritt).uebungId);
  const tauschbar = kannTauschen(einheit, schritt.block, schritt.position);
  const onTauschen = tauschbar ? () => setTauschen(true) : undefined;
  const titel = zirkel
    ? `Runde ${schritt.satz} von ${einheit.bloecke[schritt.block]?.runden ?? 1}`
    : (() => { const n = uebungNummer(einheit, schritt); return `Übung ${n.nr} von ${n.von}`; })();
  return (
    <Rahmen titel={titel} anteil={anteil} start={einheit.gestartetAm} onSchliessen={() => setMenue(true)}>
      {fehler && <Speicherfehler />}
      {phase.art === 'pause' && (
        <Pause key={index} z={z} einheit={einheit} schritt={schritt} ende={phase.ende} dauer={phase.dauer}
          onAendern={(ende, dauer) => setPhase({ art: 'pause', ende, dauer })} onWeiter={() => setPhase({ art: 'satz' })} />
      )}
      {phase.art === 'satz' && u && (zirkel
        ? <Station key={`${index}-${u.id}`} z={z} einheit={einheit} schritt={schritt} u={u} letzte={index === liste.length - 1}
            onTauschen={onTauschen} onWeiter={() => void erledigt(positionVon(einheit, schritt).zielWdh)} />
        : <Satz key={`${index}-${u.id}`} z={z} einheit={einheit} schritt={schritt} u={u} onTauschen={onTauschen}
            onErledigt={(w, l) => void erledigt(w, l)} />)}
      {tauschen && tauschbar && (
        <TauschBlatt z={z} einheit={einheit} block={schritt.block} position={schritt.position}
          onWahl={(id) => void getauscht(schritt, id)} onSchliessen={() => setTauschen(false)} />
      )}
      {menue && (
        <Menue onFortsetzen={() => setMenue(false)} onSpaeter={() => navigate('/')}
          onBeenden={() => { setMenue(false); onBeenden(einheit); }} />
      )}
    </Rahmen>
  );
}

// Kopf mit Schließen, Titel, laufender Zeit seit dem Start und Fortschrittsbalken.
function Rahmen({ titel, anteil, start, onSchliessen, children }: {
  titel: string; anteil: number; start?: string; onSchliessen: () => void; children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-4 pb-8">
      <header className="flex items-center gap-3">
        <button type="button" aria-label="Training unterbrechen oder beenden" onClick={onSchliessen}
          className="-ml-3 flex size-touch items-center justify-center">
          <Icon name="kreuz" />
        </button>
        <p className="flex-1 text-center text-basis text-gedaempft">{titel}</p>
        <span className="min-w-touch text-right text-basis text-gedaempft tabular-nums">{start ? <Uhr start={start} /> : null}</span>
      </header>
      <div className="mt-3 h-1 rounded-full bg-linie">
        <div className="h-1 rounded-full bg-akzent" style={{ width: `${Math.min(1, anteil) * 100}%` }} />
      </div>
      {children}
    </main>
  );
}

const msVon = (iso: string) => new Date(iso).getTime();

function useJetzt(intervallMs = 500): number {
  const [jetzt, setJetzt] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setJetzt(Date.now()), intervallMs);
    return () => window.clearInterval(t);
  }, [intervallMs]);
  return jetzt;
}

// Laufende Zeit seit dem Start der Einheit („06:12“, ab einer Stunde „1:02:05“).
function Uhr({ start }: { start: string }) {
  const sek = Math.max(0, Math.floor((useJetzt() - msVon(start)) / 1000));
  return <>{dauerText(sek)}</>;
}

function dauerText(sek: number): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(sek / 3600);
  const m = Math.floor((sek % 3600) / 60);
  return h > 0 ? `${h}:${zwei(m)}:${zwei(sek % 60)}` : `${zwei(m)}:${zwei(sek % 60)}`;
}

function Speicherfehler() {
  return <p role="alert" className="mt-4 font-semibold">Speichern hat nicht geklappt. Bitte versuche es noch einmal.</p>;
}

function Aufwaermen({ zeilen, zirkel, weiter }: { zeilen: string[]; zirkel: boolean; weiter: () => void }) {
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <h1 className="text-titel font-extrabold">Aufwärmen</h1>
      <Hinweis>{zirkel ? 'Etwa 5 Minuten. Mit „Fertig“ startet die Stoppuhr.' : 'Etwa 5 Minuten. Danach geht es los.'}</Hinweis>
      <div className="mt-6"><Checkliste zeilen={zeilen} /></div>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Knopf onClick={weiter}>Fertig</Knopf>
        <Knopf art="sekundaer" onClick={weiter}>Überspringen</Knopf>
      </div>
    </div>
  );
}

// Kennzeichnung über dem Namen: „Kombi A · Übung 1 von 3“ bzw. „Max-Test“.
function kennzeichnung(einheit: Einheit, s: Schritt): string | undefined {
  const b = einheit.bloecke[s.block]!;
  if (positionVon(einheit, s).istMaxTest) return 'Max-Test';
  if (b.typ !== 'supersatz') return undefined;
  const buchstabe = String.fromCharCode(65 + einheit.bloecke.slice(0, s.block).filter((x) => x.typ === 'supersatz').length);
  return `Kombi ${buchstabe} · Übung ${s.position + 1} von ${b.positionen.length}`;
}

// Name, „So geht's“ und, solange der erste Satz der Übung offen ist, „Tauschen“.
function Kopf({ z, u, label, onTauschen }: { z: AppZustand; u: Uebung; label?: string; onTauschen?: () => void }) {
  return (
    <>
      {label && <p className="mt-6 text-hinweis font-bold tracking-wide text-akzent uppercase">{label}</p>}
      <h1 className={`${label ? 'mt-1' : 'mt-6'} text-titel leading-tight font-extrabold`}>{u.name}</h1>
      <Technik key={u.id} e={einstellungenAus(z)} u={u} />
      {onTauschen && (
        <button type="button" onClick={onTauschen} className="flex min-h-touch items-center gap-2 self-start text-gross font-semibold text-akzent">
          <Icon name="tauschen" groesse={22} /> Tauschen
        </button>
      )}
    </>
  );
}

function Satz({ z, einheit, schritt, u, onTauschen, onErledigt }: {
  z: AppZustand; einheit: Einheit; schritt: Schritt; u: Uebung; onTauschen?: () => void; onErledigt: (wert: number, last?: number) => void;
}) {
  const p = positionVon(einheit, schritt);
  const v = satzVorgabe(z, einheit, schritt);
  const [wert, setWert] = useState(v.wert);
  const [last, setLast] = useState(v.last);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  const letztes = letztesMal(z, u.id, einheit.id);
  return (
    <div className="flex flex-1 flex-col">
      <Kopf z={z} u={u} label={kennzeichnung(einheit, schritt)} onTauschen={onTauschen} />
      {!p.istMaxTest && <Satzpunkte satz={schritt.satz} von={p.saetze} />}
      <Vorgabekarte u={u} v={v} last={last} raster={v.kalibrierung && ort ? lastraster(ort, u) : []} onLast={setLast} />
      {v.inSek
        ? <Stoppuhr wert={wert} onChange={setWert} />
        : <Zaehler wert={wert} onChange={setWert} />}
      {letztes && !p.istMaxTest && <p className="mt-3 text-center text-basis text-gedaempft">Letztes Mal: {letztesText(u, letztes)}</p>}
      <div className="mt-auto pt-8">
        <Knopf onClick={() => onErledigt(wert, v.kalibrierung ? last : undefined)}>{p.istMaxTest ? 'Test erledigt' : 'Satz erledigt'}</Knopf>
      </div>
    </div>
  );
}

function Satzpunkte({ satz, von }: { satz: number; von: number }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <p className="text-gross text-gedaempft">Satz {satz} von {von}</p>
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: von }, (_, i) => (
          <span key={i} className={`h-1.5 w-7 rounded-full ${i < satz - 1 ? 'bg-akzent' : i === satz - 1 ? 'bg-akzent/40' : 'bg-linie'}`} />
        ))}
      </div>
    </div>
  );
}

// Ziel bzw. Vorgabe, Last und Hinweis zur Reserve. Im Kalibrierungssatz lässt sich das Gewicht wählen.
function Vorgabekarte({ u, v, last, raster, onLast }: {
  u: Uebung; v: SatzVorgabe; last?: number; raster: number[]; onLast: (kg: number) => void;
}) {
  const einheit = v.inSek ? 'Sekunden' : 'Wiederholungen';
  const teile = lastTeile(u, { last, bandStufe: v.bandStufe });
  const links = v.art === 'maxTest'
    ? { titel: 'Max-Test', gross: v.inSek ? 'So lange' : 'So viele', klein: 'wie möglich' }
    : v.art === 'ziel'
      ? { titel: 'Ziel', gross: String(v.wert), klein: v.bereich ? `Bereich ${v.bereich.von} bis ${v.bereich.bis}${v.inSek ? ' Sek.' : ''}` : einheit }
      : { titel: 'Vorgabe', gross: String(v.wert), klein: einheit };
  const pos = last === undefined ? -1 : raster.indexOf(last);
  return (
    <section className="mt-5 rounded-karte border border-rand bg-flaeche p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-basis text-gedaempft">{links.titel}</p>
          <p className="text-titel leading-tight font-extrabold">{links.gross}</p>
          <p className="text-basis text-gedaempft">{links.klein}</p>
        </div>
        {teile && (
          <div>
            <p className="text-basis text-gedaempft">{v.kalibrierung ? 'Mit welchem Gewicht?' : teile.titel}</p>
            <p className="text-titel leading-tight font-extrabold">{teile.gross}</p>
            {teile.klein && <p className="text-basis text-gedaempft">{teile.klein}</p>}
            {raster.length > 1 && (
              <div className="mt-2 flex gap-2">
                <button type="button" aria-label="Leichter" disabled={pos <= 0} onClick={() => onLast(raster[pos - 1]!)}
                  className="flex size-touch items-center justify-center rounded-xl border border-rand text-akzent disabled:text-rand">
                  <span aria-hidden="true" className="text-screen font-bold">−</span>
                </button>
                <button type="button" aria-label="Schwerer" disabled={pos < 0 || pos >= raster.length - 1} onClick={() => onLast(raster[pos + 1]!)}
                  className="flex size-touch items-center justify-center rounded-xl border border-rand text-akzent disabled:text-rand">
                  <Icon name="plus" groesse={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {(v.reserve || v.langsam) && (
        <p className="mt-4 border-t border-linie pt-4 text-basis">
          {v.langsam && <span className="block font-semibold">{PROGRESSION.tempoAbsenkenSek} Sek. absenken.</span>}
          {v.reserve}
        </p>
      )}
    </section>
  );
}

function letztesText(u: Uebung, l: NonNullable<ReturnType<typeof letztesMal>>): string {
  const werte = l.werte.join(', ') + (l.inSek ? ' Sek.' : '');
  const last = l.bandStufe ? `Band ${BAND_NAMEN[l.bandStufe]}` : lastText(u, { last: l.last });
  return last ? `${last} × ${werte}` : werte;
}

// Pause mit Timer-Ring; am Ende Ton und Vibration, dann geht es mit dem nächsten Satz weiter.
function Pause({ z, einheit, schritt, ende, dauer, onAendern, onWeiter }: {
  z: AppZustand; einheit: Einheit; schritt: Schritt; ende: number; dauer: number;
  onAendern: (ende: number, dauer: number) => void; onWeiter: () => void;
}) {
  const jetzt = useJetzt(250);
  const rest = Math.max(0, Math.ceil((ende - jetzt) / 1000));
  useEffect(() => {
    if (rest > 0) return;
    pausenEnde();
    onWeiter();
  }, [rest]);
  const u = uebungVon(z, positionVon(einheit, schritt).uebungId);
  const v = satzVorgabe(z, einheit, schritt);
  const p = positionVon(einheit, schritt);
  const radius = 100;
  const umfang = 2 * Math.PI * radius;
  const naechstes = [
    p.istMaxTest ? 'Max-Test' : `Satz ${schritt.satz} von ${p.saetze}`,
    v.art === 'ziel' ? `Ziel ${v.wert}${v.inSek ? ' Sek.' : ''}` : v.art === 'vorgabe' ? `Vorgabe ${v.wert}${v.inSek ? ' Sek.' : ''}` : undefined,
    u ? lastText(u, p) : undefined,
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-1 flex-col items-center">
      <p className="mt-10 text-gross font-semibold text-gedaempft">Pause</p>
      <div className="relative mt-4 size-[230px]">
        <svg viewBox="0 0 230 230" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="115" cy="115" r={radius} fill="none" strokeWidth="12" className="stroke-linie" />
          <circle cx="115" cy="115" r={radius} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-akzent"
            strokeDasharray={umfang} strokeDashoffset={umfang * (1 - rest / Math.max(1, dauer))} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-zahl leading-none font-extrabold tabular-nums" aria-live="off">{zeitText(rest)}</span>
          <span className="mt-2 text-basis text-gedaempft">von {zeitText(dauer)}</span>
        </div>
      </div>
      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        <Knopf art="sekundaer" onClick={() => onAendern(ende + PLAYER.pauseVerlaengernSek * 1000, dauer + PLAYER.pauseVerlaengernSek)}>
          +{PLAYER.pauseVerlaengernSek} Sek.
        </Knopf>
        <Knopf art="sekundaer" onClick={onWeiter}>Überspringen</Knopf>
      </div>
      <div className="mt-auto w-full pt-8">
        {u && (
          <section className="rounded-karte border border-rand bg-flaeche p-5">
            <p className="text-hinweis font-bold tracking-wide text-gedaempft uppercase">Als Nächstes</p>
            <p className="mt-1 text-gross font-bold">{u.name}</p>
            <p className="text-basis text-gedaempft">{naechstes}</p>
          </section>
        )}
        <p className="mt-4 text-center text-hinweis text-gedaempft">Ton und Vibration am Ende der Pause. Der Bildschirm bleibt an.</p>
      </div>
    </div>
  );
}

// Zirkel-Station: Vorgabe aus dem Katalog, „Weiter“ ohne Pause; die Stoppuhr läuft im Kopf.
function Station({ z, einheit, schritt, u, letzte, onTauschen, onWeiter }: {
  z: AppZustand; einheit: Einheit; schritt: Schritt; u: Uebung; letzte: boolean; onTauschen?: () => void; onWeiter: () => void;
}) {
  const b = einheit.bloecke[schritt.block]!;
  const p = positionVon(einheit, schritt);
  const vorgabe = zirkelVorgaben(z, einheit)[schritt.position] ?? String(p.zielWdh);
  const text = /^\d+$/.test(vorgabe) ? `${vorgabe} ${u.bereich.einheit}` : vorgabe;
  const last = lastText(u, p);
  return (
    <div className="flex flex-1 flex-col">
      <Kopf z={z} u={u} label={`Station ${schritt.position + 1} von ${b.positionen.length}`} onTauschen={onTauschen} />
      <section className="mt-5 rounded-karte border border-rand bg-flaeche p-5">
        <p className="text-basis text-gedaempft">Vorgabe</p>
        <p className="text-titel leading-tight font-extrabold">{text}</p>
        {last && <p className="mt-2 text-basis text-gedaempft">{last}</p>}
      </section>
      <div className="mt-auto pt-8">
        <Knopf onClick={onWeiter}>{letzte ? 'Fertig' : 'Weiter'}</Knopf>
      </div>
    </div>
  );
}

// Unterbrechen oder beenden; beim Beenden bleiben alle erledigten Sätze gespeichert.
function Menue({ onFortsetzen, onSpaeter, onBeenden }: { onFortsetzen: () => void; onSpaeter: () => void; onBeenden: () => void }) {
  return (
    <div className="fixed inset-0 z-10 flex items-end bg-text/40" onClick={onFortsetzen}>
      <section role="dialog" aria-modal="true" aria-label="Training unterbrechen" onClick={(ev) => ev.stopPropagation()}
        className="mx-auto w-full max-w-xl rounded-t-karte bg-flaeche px-seite pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <h2 className="text-screen font-extrabold">Training unterbrechen?</h2>
        <Hinweis>Später fortsetzen: Du machst beim nächsten Satz weiter. Beenden: Erledigte Sätze werden gespeichert.</Hinweis>
        <div className="mt-5 flex flex-col gap-3">
          <Knopf onClick={onFortsetzen}>Weiter trainieren</Knopf>
          <Knopf art="sekundaer" onClick={onSpaeter}>Später fortsetzen</Knopf>
          <Knopf art="sekundaer" onClick={onBeenden}>Training beenden</Knopf>
        </div>
      </section>
    </div>
  );
}

// Übungsfeedback (Mockup 6): geschaffte Wiederholungen, drei Buttons mit Definition und die Folge
// für die nächste Einheit. Vorausgewählt ist „zu schwer“, wenn der erste Satz das Ziel verfehlt.
function UebungsFeedback({ z, einheit, stelle, onWeiter }: {
  z: AppZustand; einheit: Einheit; stelle: Stelle; onWeiter: (fb: Feedback) => void;
}) {
  const p = einheit.bloecke[stelle.block]!.positionen[stelle.position]!;
  const u = uebungVon(z, p.uebungId);
  const [wahl, setWahl] = useState<Feedback>(feedbackVorschlag(z, einheit, stelle));
  const vorschau = useMemo(() => vorschauNaechstesMal(z, einheit, { ...p, feedback: wahl }, lokaleZeit()), [z, einheit, p, wahl]);
  if (!u) return <Knopf onClick={() => onWeiter(wahl)}>Weiter</Knopf>;
  const inSek = u.bereich.einheit === 'Sek.';
  const last = lastText(u, { last: p.ergebnisse[0]?.last ?? p.last, bandStufe: p.ergebnisse[0]?.bandStufe ?? p.bandStufe });
  const naechste = vorschau && uebungVon(z, vorschau.uebungId);
  return (
    <div className="flex flex-1 flex-col">
      <p className="mt-6 text-basis font-semibold text-gedaempft">{[u.name, last].filter(Boolean).join(' · ')}</p>
      <h1 className="mt-1 text-titel leading-tight font-extrabold">Wie war die Übung?</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.ergebnisse.map((r) => (
          <span key={r.nr} className="flex min-h-touch min-w-touch items-center justify-center rounded-full border border-rand bg-flaeche px-3 text-gross font-semibold">
            {(inSek ? r.sek : r.wdh) ?? 0}
          </span>
        ))}
        <span className="text-basis text-gedaempft">{inSek ? 'Sekunden' : 'Wiederholungen'}</span>
      </div>
      <div role="radiogroup" aria-label="Wie war die Übung?" className="mt-6 flex flex-col gap-3">
        {feedbackOptionen(inSek).map((o) => (
          <button key={o.wert} type="button" role="radio" aria-checked={wahl === o.wert} onClick={() => setWahl(o.wert)}
            className={`rounded-karte bg-flaeche px-5 py-4 text-left ${wahl === o.wert ? 'border-2 border-akzent' : 'border border-rand'}`}>
            <span className="block text-gross font-bold">{o.titel}</span>
            <span className="block text-basis text-gedaempft">{o.text}</span>
          </button>
        ))}
      </div>
      {vorschau && naechste && (
        <p className="mt-6 flex items-start gap-3 rounded-karte bg-akzent-hell px-5 py-4 text-basis">
          <span className="text-akzent"><Icon name="pfeil" groesse={20} /></span>
          {naechstesMalText(naechste, vorschau)}
        </p>
      )}
      <div className="mt-auto pt-8">
        <Knopf onClick={() => onWeiter(wahl)}>Weiter</Knopf>
      </div>
    </div>
  );
}

// Abschluss (Mockup 7): Dauer, Sätze, Rekorde, Gesamtanstrengung (freiwillig, nichts vorausgewählt),
// Sterne je Übung (vorausgefüllt mit der letzten Bewertung), Notiz und optional Abkühlen.
function Abschluss({ z, schluss }: { z: AppZustand; schluss: Schluss }) {
  const navigate = useNavigate();
  const e = schluss.einheit;
  const [anstrengung, setAnstrengung] = useState<Sterne>();
  const [notiz, setNotiz] = useState('');
  const [sterne, setSterne] = useState<Record<string, Sterne>>({});
  const [abkuehlen, setAbkuehlen] = useState(false);
  const [fehler, setFehler] = useState(false);
  if (schluss.fehler) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-12 pb-8">
        <Speicherfehler />
        <div className="mt-auto pt-8"><Knopf onClick={() => navigate('/', { replace: true })}>Zu Heute</Knopf></div>
      </main>
    );
  }
  if (!e) return <Laedt />;
  const einst = einstellungenAus(z);
  const sek = e.gestartetAm && e.beendetAm ? Math.max(0, Math.round((msVon(e.beendetAm) - msVon(e.gestartetAm)) / 1000)) : 0;
  const zirkel = e.format === 'zirkel';
  const bisher = schluss.bestzeit;
  const neueBestzeit = zirkel && e.status === 'abgeschlossen' && (bisher === undefined || sek < bisher);
  const rekorde = (schluss.rekorde ?? []).filter((r) => r.art !== 'zirkel');
  const kacheln: [string, string][] = zirkel
    ? [[dauerText(sek), 'Zeit'], ...(bisher !== undefined ? [[dauerText(bisher), 'Bestzeit bisher'] as [string, string]] : [])]
    : [[String(Math.round(sek / 60)), 'Minuten'], [String(erledigteSaetze(e)), 'Sätze'], [String(rekorde.length), rekorde.length === 1 ? 'Rekord' : 'Rekorde']];
  const uebungen = [...new Set(e.bloecke.flatMap((b) => b.positionen)
    .filter((p) => !p.istMaxTest && p.ergebnisse.length > 0).map((p) => p.uebungId))]
    .map((id) => uebungVon(z, id)).filter((u): u is Uebung => u !== undefined);
  const sterneFuer = (id: string): Sterne | undefined => sterne[id] ?? einst.bewertungen?.[id];
  const ort = z.orte.find((o) => o.id === e.ortId);
  const mobility = ort
    ? mobilityZeilen(z, ort, new Set(uebungen.map((u) => u.muster))).slice(0, z.katalog.aufwaermen.maxMobilityZeilen)
    : [];

  const speichern = async () => {
    const bewertungen: Record<string, Sterne> = {};
    for (const u of uebungen) {
      const s = sterneFuer(u.id);
      if (s !== undefined && s !== einst.bewertungen?.[u.id]) bewertungen[u.id] = s;
    }
    try {
      await speichereAbschluss(e.id, { ...(anstrengung ? { gesamtbewertung: anstrengung } : {}), notiz, bewertungen }, lokaleZeit());
      navigate('/', { replace: true });
    } catch {
      setFehler(true);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-12 pb-8">
      <p className="text-basis font-semibold text-akzent">{e.status === 'abgeschlossen' ? 'Einheit abgeschlossen' : 'Training beendet'}</p>
      <h1 className="mt-1 text-titel font-extrabold">{e.status === 'abgeschlossen' ? 'Stark gemacht.' : 'Gut, dass du da warst.'}</h1>
      <div className={`mt-6 grid gap-3 ${kacheln.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {kacheln.map(([zahl, text]) => (
          <div key={text} className="rounded-karte border border-rand bg-flaeche p-4">
            <p className="text-screen font-extrabold">{zahl}</p>
            <p className="text-basis text-gedaempft">{text}</p>
          </div>
        ))}
      </div>
      {neueBestzeit && (
        <p className="mt-4 text-gross font-bold text-akzent">
          {bisher === undefined ? 'Deine erste Zeit hier, das ist deine Bestzeit.' : 'Neue Bestzeit an diesem Ort.'}
        </p>
      )}
      {e.status === 'abgebrochen' && <p className="mt-4 text-basis text-gedaempft">Deine erledigten Sätze sind gespeichert.</p>}
      {rekorde.length > 0 && (
        <ul className="mt-5 rounded-karte border border-rand bg-flaeche px-5">
          {rekorde.map((r, i) => {
            const zeile = rekordZeile(z, e, r);
            return (
              <li key={i} className="flex min-h-[56px] items-center justify-between gap-3 border-b border-linie py-3 last:border-b-0">
                <span className="text-basis font-semibold">{zeile.name}</span>
                <span className="shrink-0 text-basis font-bold text-akzent">{zeile.wert} · neu</span>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-7 text-gross font-bold">Wie anstrengend war es insgesamt?</h2>
      <div role="radiogroup" aria-label="Gesamtanstrengung" className="mt-3 grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={anstrengung === n}
            onClick={() => setAnstrengung(anstrengung === n ? undefined : n)}
            className={`min-h-primaer rounded-xl text-gross ${anstrengung === n
              ? 'border-2 border-akzent bg-akzent-hell font-extrabold text-akzent' : 'border border-rand bg-flaeche font-semibold'}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-hinweis text-gedaempft"><span>sehr leicht</span><span>am Limit</span></div>

      {uebungen.length > 0 && (
        <>
          <h2 className="mt-7 text-gross font-bold">Wie gefallen dir die Übungen?</h2>
          <Hinweis>Freiwillig. Mehr Sterne: kommt öfter dran. 1 Stern: wird ab der nächsten Einheit ersetzt, wenn es eine Alternative gibt.</Hinweis>
          <ul className="mt-3 rounded-karte border border-rand bg-flaeche px-5">
            {uebungen.map((u) => (
              <li key={u.id} className="border-b border-linie pt-3 pb-1 last:border-b-0">
                <p className="text-basis font-semibold">{u.name}</p>
                <div className="-ml-2.5">
                  <Sternwahl label={`Bewertung ${u.name}`} wert={sterneFuer(u.id)}
                    onChange={(n) => setSterne({ ...sterne, [u.id]: n })} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <label className="mt-7 block">
        <span className="mb-2 block text-basis font-semibold text-gedaempft">Notiz (optional)</span>
        <textarea value={notiz} onChange={(ev) => setNotiz(ev.target.value)} rows={3} placeholder="z. B. Schulter leicht gezwickt"
          className="w-full rounded-karte border border-rand bg-flaeche px-4 py-3 text-gross outline-none focus:border-akzent" />
      </label>

      {mobility.length > 0 && (
        <div className="mt-5">
          {abkuehlen
            ? <><h2 className="mb-3 text-gross font-bold">Abkühlen, ca. 3 Min.</h2><Checkliste zeilen={mobility} /></>
            : <Knopf art="schlicht" onClick={() => setAbkuehlen(true)}>Abkühlen (optional, ca. 3 Min.)</Knopf>}
        </div>
      )}
      {fehler && <Speicherfehler />}
      <div className="mt-auto pt-8">
        <Knopf onClick={() => void speichern()}>Speichern</Knopf>
      </div>
    </main>
  );
}
