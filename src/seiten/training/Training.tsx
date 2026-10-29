// Trainings-Player (Mockups 4 bis 7): Aufwärmen Schritt für Schritt, Max-Test, Satz, Pause, Blockwechsel, Supersatz,
// Zirkel-Modus und die Abschlussseite mit Übungsfeedback. Jeder erledigte Satz wird sofort gespeichert;
// ein Neustart setzt am nächsten offenen Satz bzw. auf der Abschlussseite fort.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { beendeEinheit, speichereAbschluss, speichereLaufendeEinheit, starteEinheit } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { PLAYER, PROGRESSION } from '../../konfiguration';
import { lastraster } from '../../logik/equipment';
import { zirkelBestzeit, zirkelVorgaben } from '../../logik/heute';
import { kannTauschen, lastAnzeige, mobilityZeilen, musterNachSaetzen, tausche } from '../../logik/planung';
import {
  aktuellerBlock, aktuellerSchritt, balkenAbschnitte, beende, bewerteAlle, blockwechselNach, erledigteSaetze, fortschrittshinweis, letzterSatzAm, letztesMal, messSatz,
  offeneFeedbacks, pauseNach, positionVon, satzVorgabe, schritte, feedbackVorschlag, korrigiereSatz, lastWaehlbar, starte, sternFragen, trageSatzEin,
  type Balkenschritt, type SatzVorgabe, type Schritt, type Stelle,
} from '../../logik/player';
import { neueRekorde, vorschauNaechstesMal } from '../../logik/progression';
import type { AppZustand, Einheit, Feedback, Sterne, Uebung } from '../../logik/typen';
import { uebungVon } from '../../logik/verlauf';
import { Ablaufliste, Hinweis, Knopf, Laedt, Sternwahl } from '../../ui/bausteine';
import { AufwaermSchritte } from '../../ui/aufwaermen';
import { TauschBlatt } from '../../ui/blaetter';
import { Icon } from '../../ui/Icon';
import { bereiteTonVor, pausenEnde, useBildschirmAn } from '../../ui/signal';
import {
  BAND_NAMEN, detailText, feedbackOptionen, fortschrittZeilen, lastTeile, lastText, naechstesMalText, rekordZeile, saetzeMitLast, zeitText,
} from '../../ui/texte';
import { Technik } from '../../ui/technik';
import { Uebergang, useUebergang } from '../../ui/uebergang';
import { einstellungenAus, useZustand } from '../../ui/useZustand';
import { Countdown, Stoppuhr, Zaehler } from '../../ui/zaehler';

// Angaben der Abschlussseite (Gesamtanstrengung freiwillig, nichts vorausgewählt; Sterne der gefragten Übungen).
interface Angaben { gesamtbewertung?: Sterne; notiz?: string; bewertungen?: Record<string, Sterne>; gefragt?: string[] }

export function TrainingSeite() {
  const { id } = useParams();
  const z = useZustand();
  const navigate = useNavigate();
  const [schluss, setSchluss] = useState<'speichert' | 'fehler'>();
  const beendet = useRef(false);
  useBildschirmAn();

  if (schluss === 'fehler') return <Speicherfehlerseite />;
  if (schluss || !z) return <Laedt />;
  const einheit = z.einheiten.find((e) => e.id === id);
  if (!einheit || (einheit.status !== 'geplant' && einheit.status !== 'laufend')) return <Navigate to="/" replace />;

  // Beendet die Einheit zum Zeitpunkt des letzten Satzes und speichert die Angaben der Abschlussseite;
  // ohne erledigten Satz ist sie wieder geplant. Danach geht es zu Heute.
  const beenden = async (e: Einheit, angaben: Angaben = {}) => {
    if (beendet.current) return;
    beendet.current = true;
    setSchluss('speichert');
    try {
      await beendeEinheit(e, letzterSatzAm(e) ?? lokaleZeit());
      await speichereAbschluss(e.id, { ...angaben, bewertungen: angaben.bewertungen ?? {} }, lokaleZeit());
      navigate('/', { replace: true });
    } catch {
      setSchluss('fehler');
    }
  };
  return <Player key={einheit.id} z={z} start={einheit} onBeenden={(e, angaben) => void beenden(e, angaben)} />;
}

type Pausenzeit = { ende: number; dauer: number };
// Blockwechsel: Pause mit Übersicht des nächsten Blocks, weiter mit „Los“. Abschluss: eine Seite mit
// Übungsfeedback, Gesamtanstrengung und Notiz, am Ende oder beim vorzeitigen Beenden (`vorzeitig`).
type Phase = { art: 'aufwaermen' } | { art: 'satz' } | ({ art: 'pause' } & Pausenzeit) | ({ art: 'blockwechsel' } & Pausenzeit)
  | { art: 'abschluss'; vorzeitig?: boolean };

function Player({ z, start, onBeenden }: { z: AppZustand; start: Einheit; onBeenden: (e: Einheit, angaben?: Angaben) => void }) {
  const navigate = useNavigate();
  const [einheit, setEinheit] = useState(start);
  const [phase, setPhase] = useState<Phase>({
    art: start.status === 'geplant' ? 'aufwaermen' : aktuellerSchritt(start) >= schritte(start).length ? 'abschluss' : 'satz',
  });
  const [aufwaermNr, setAufwaermNr] = useState(0);
  const [menue, setMenue] = useState(false);
  const [tauschen, setTauschen] = useState(false);
  const [fehler, setFehler] = useState(false);
  const [vorher, setVorher] = useState<Einheit>();      // Stand vor dem letzten Satz, für „Rückgängig“ in der Pause
  const liste = useMemo(() => schritte(einheit), [einheit]);
  const index = aktuellerSchritt(einheit);
  const schritt = liste[index];
  const zirkel = einheit.format === 'zirkel';

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
    setVorher(einheit);
    setEinheit(neu);
    if (aktuellerSchritt(neu) >= liste.length) {
      setPhase({ art: 'abschluss' });
      return;
    }
    const pause = pauseNach(neu, index);
    const zeit = { ende: Date.now() + pause * 1000, dauer: pause };
    if (blockwechselNach(neu, index)) setPhase({ art: 'blockwechsel', ...zeit });
    else setPhase(pause > 0 ? { art: 'pause', ...zeit } : { art: 'satz' });
  };

  // „Training beenden“ vor dem Ende: Abschlussseite mit den fertigen Übungen; ohne erledigten Satz gleich zu Heute.
  const beendenGewaehlt = () => {
    setMenue(false);
    if (erledigteSaetze(einheit) > 0) setPhase({ art: 'abschluss', vorzeitig: true });
    else onBeenden(einheit);
  };

  // „Rückgängig“ in der Pause und beim Blockwechsel (Entscheidung 21.10.2026): Der letzte Satz ist wieder offen.
  const rueckgaengig = async () => {
    if (!vorher) return;
    try {
      if (!(await speichereLaufendeEinheit(vorher))) throw new Error('nicht gespeichert');
    } catch {
      setFehler(true);
      return;
    }
    setFehler(false);
    setEinheit(vorher);
    setVorher(undefined);
    setPhase({ art: 'satz' });
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

  // Abschlussseite gespeichert (Entscheidung 29.10.2026): erst die bewertete Einheit, dann beenden.
  const abschliessen = async (neu: Einheit, angaben: Angaben) => {
    try {
      if (!(await speichereLaufendeEinheit(neu))) throw new Error('nicht gespeichert');
    } catch {
      setFehler(true);
      return;
    }
    setFehler(false);
    setEinheit(neu);
    onBeenden(neu, angaben);
  };

  if (phase.art === 'aufwaermen') {
    return (
      <Rahmen titel="Aufwärmen" schritt={`aufwaermen-${aufwaermNr}`} onSchliessen={() => navigate(`/vorschau/${einheit.id}`)}
        abschnitte={[einheit.aufwaermen.map((_, i): Balkenschritt => (i < aufwaermNr ? 'erledigt' : i === aufwaermNr ? 'aktuell' : 'offen'))]}>
        {fehler && <Speicherfehler />}
        <AufwaermSchritte zeilen={einheit.aufwaermen} nr={aufwaermNr} onNr={setAufwaermNr} onFertig={() => void losgehen()}
          hinweisEnde={zirkel ? 'Mit „Fertig“ startet die Stoppuhr.' : undefined} />
      </Rahmen>
    );
  }
  if (phase.art === 'abschluss') {
    // Beim vorzeitigen Beenden führt „Weiter trainieren“ zurück zum offenen Satz; „Training beenden“
    // speichert ohne Angaben (Feedback dann automatisch).
    const fortsetzen = () => { setMenue(false); if (phase.vorzeitig) setPhase({ art: 'satz' }); };
    return (
      <Rahmen titel="" abschnitte={[]} schritt="abschluss" onSchliessen={() => setMenue(true)} ueber={menue && (
        <Menue onFortsetzen={fortsetzen} onSpaeter={() => navigate('/')}
          onBeenden={() => { setMenue(false); onBeenden(einheit); }} />
      )}>
        <Abschluss z={z} einheit={einheit} fehler={fehler} onSpeichern={(neu, angaben) => void abschliessen(neu, angaben)} />
      </Rahmen>
    );
  }
  if (!schritt) return <Laedt />;

  const u = uebungVon(z, positionVon(einheit, schritt).uebungId);
  const tauschbar = kannTauschen(einheit, schritt.block, schritt.position);
  const onTauschen = tauschbar ? () => setTauschen(true) : undefined;
  // Oben Zeit, Block und dessen Fortschritt; im Zirkel statt des Blocks die Runde (Entscheidungen
  // 21.10.2026 und 29.10.2026).
  const titel = zirkel ? `Runde ${schritt.satz} von ${einheit.bloecke[schritt.block]?.runden ?? 1}`
    : `Block ${aktuellerBlock(einheit) + 1} von ${einheit.bloecke.length}`;
  const farbe = blockFarbe(zirkel ? 0 : schritt.block);
  return (
    <Rahmen titel={titel} farbe={farbe} abschnitte={balkenAbschnitte(einheit)} schritt={`${phase.art}-${index}`} start={einheit.gestartetAm} onSchliessen={() => setMenue(true)}
      ueber={<>
        {tauschen && tauschbar && (
          <TauschBlatt z={z} einheit={einheit} block={schritt.block} position={schritt.position}
            onWahl={(id) => void getauscht(schritt, id)} onSchliessen={() => setTauschen(false)} />
        )}
        {menue && (
          <Menue onFortsetzen={() => setMenue(false)} onSpaeter={() => navigate('/')} onBeenden={beendenGewaehlt} />
        )}
      </>}>
      {fehler && <Speicherfehler />}
      {phase.art === 'pause' && (
        <Pause key={index} z={z} einheit={einheit} schritt={schritt} farbe={farbe} ende={phase.ende} dauer={phase.dauer}
          onAendern={(ende, dauer) => setPhase({ art: 'pause', ende, dauer })} onWeiter={() => setPhase({ art: 'satz' })}
          onRueckgaengig={vorher ? () => void rueckgaengig() : undefined} />
      )}
      {phase.art === 'blockwechsel' && (
        <Blockwechsel z={z} einheit={einheit} block={schritt.block} farbe={farbe} ende={phase.ende} dauer={phase.dauer}
          onAendern={(ende, dauer) => setPhase({ art: 'blockwechsel', ende, dauer })} onLos={() => setPhase({ art: 'satz' })}
          onRueckgaengig={vorher ? () => void rueckgaengig() : undefined} />
      )}
      {phase.art === 'satz' && u && (zirkel
        ? <Station key={`${index}-${u.id}`} z={z} einheit={einheit} schritt={schritt} u={u} letzte={index === liste.length - 1}
            onTauschen={onTauschen} onWeiter={() => void erledigt(positionVon(einheit, schritt).zielWdh)} />
        : <Satz key={`${index}-${u.id}`} z={z} einheit={einheit} schritt={schritt} u={u} farbe={farbe} onTauschen={onTauschen}
            onErledigt={(w, l) => void erledigt(w, l)} />)}
    </Rahmen>
  );
}

// Farbe je Block, der Reihe nach (Entscheidung 29.10.2026): Block 1 im Akzent, dann Blau, Orange, Pink.
// Die Klassen stehen ausgeschrieben, damit Tailwind sie findet.
const BLOCKFARBEN = [
  { text: 'text-akzent', voll: 'bg-akzent', aktuell: 'bg-akzent/40', hell: 'bg-akzent-hell', rand: 'border-akzent', links: 'border-l-akzent', strich: 'stroke-akzent' },
  { text: 'text-block2', voll: 'bg-block2', aktuell: 'bg-block2/40', hell: 'bg-block2-hell', rand: 'border-block2', links: 'border-l-block2', strich: 'stroke-block2' },
  { text: 'text-block3', voll: 'bg-block3', aktuell: 'bg-block3/40', hell: 'bg-block3-hell', rand: 'border-block3', links: 'border-l-block3', strich: 'stroke-block3' },
  { text: 'text-block4', voll: 'bg-block4', aktuell: 'bg-block4/40', hell: 'bg-block4-hell', rand: 'border-block4', links: 'border-l-block4', strich: 'stroke-block4' },
] as const;
type Blockfarbe = (typeof BLOCKFARBEN)[number];
const blockFarbe = (block: number): Blockfarbe => BLOCKFARBEN[block % BLOCKFARBEN.length]!;

// Kopf mit Schließen und Block (farbig), darunter groß die laufende Zeit seit dem Start (Entscheidung
// 29.10.2026) und der Fortschrittsbalken. Wechselt der Schritt, gleitet der Inhalt herein; Blätter
// (`ueber`) liegen außerhalb.
function Rahmen({ titel, farbe = BLOCKFARBEN[0], abschnitte, schritt, start, onSchliessen, ueber, children }: {
  titel: string; farbe?: Blockfarbe; abschnitte: Balkenschritt[][]; schritt: string; start?: string; onSchliessen: () => void;
  ueber?: ReactNode; children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-4 pb-8">
      <header className="flex items-center gap-3">
        <button type="button" aria-label="Training unterbrechen oder beenden" onClick={onSchliessen}
          className="-ml-3 flex size-touch items-center justify-center">
          <Icon name="kreuz" />
        </button>
        <p className="flex-1 text-center">
          {titel && <span className={`inline-block rounded-full px-4 py-1 text-basis font-bold ${farbe.hell} ${farbe.text}`}>{titel}</span>}
        </p>
        <span className="min-w-touch" aria-hidden="true" />
      </header>
      {start && (
        <p role="timer" aria-label="Trainingszeit" className="mt-1 text-center text-uhr font-extrabold tabular-nums">
          <Uhr start={start} />
        </p>
      )}
      {abschnitte.length > 0 && <Balken abschnitte={abschnitte} farbe={farbe} />}
      <Uebergang schluessel={schritt} art="vor" className="flex flex-1 flex-col">{children}</Uebergang>
      {ueber}
    </main>
  );
}

// Fortschrittsbalken des aktuellen Blocks (Entscheidungen 29.10.2026): große Lücke zwischen Runden bzw.
// Übungen, kleine zwischen den Sätzen darin; der aktuelle Satz ist heller markiert.
function Balken({ abschnitte, farbe: f }: { abschnitte: Balkenschritt[][]; farbe: Blockfarbe }) {
  const farbe = { erledigt: f.voll, aktuell: f.aktuell, offen: 'bg-linie' };
  const fertig = abschnitte.flat().filter((s) => s === 'erledigt').length;
  return (
    <div role="progressbar" aria-label="Fortschritt" aria-valuemin={0} aria-valuemax={abschnitte.flat().length} aria-valuenow={fertig}
      className="mt-4 flex gap-1.5">
      {abschnitte.map((a, i) => (
        <div key={i} className="flex flex-1 gap-0.5" style={{ flexGrow: a.length }}>
          {a.map((s, j) => (
            <span key={j} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none ${farbe[s]}`} />
          ))}
        </div>
      ))}
    </div>
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

// Name eines Blocks: „Kombi B“, „Max-Test“; einzelne Übungen haben keinen.
function blockName(einheit: Einheit, block: number): string | undefined {
  const b = einheit.bloecke[block]!;
  if (b.positionen.some((p) => p.istMaxTest)) return 'Max-Test';
  if (b.typ !== 'supersatz') return undefined;
  return `Kombi ${String.fromCharCode(65 + einheit.bloecke.slice(0, block).filter((x) => x.typ === 'supersatz').length)}`;
}

// Kennzeichnung über dem Namen: „Kombi A · Übung 1 von 3“ bzw. „Max-Test“.
function kennzeichnung(einheit: Einheit, s: Schritt): string | undefined {
  const b = einheit.bloecke[s.block]!;
  if (positionVon(einheit, s).istMaxTest) return 'Max-Test';
  if (b.typ !== 'supersatz') return undefined;
  return `${blockName(einheit, s.block)} · Übung ${s.position + 1} von ${b.positionen.length}`;
}

// Name, „So geht's“ und, solange der erste Satz der Übung offen ist, „Tauschen“.
function Kopf({ z, u, label, farbe = BLOCKFARBEN[0], onTauschen }: {
  z: AppZustand; u: Uebung; label?: string; farbe?: Blockfarbe; onTauschen?: () => void;
}) {
  return (
    <>
      {label && <p className={`mt-6 text-hinweis font-bold tracking-wide uppercase ${farbe.text}`}>{label}</p>}
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

function Satz({ z, einheit, schritt, u, farbe, onTauschen, onErledigt }: {
  z: AppZustand; einheit: Einheit; schritt: Schritt; u: Uebung; farbe: Blockfarbe; onTauschen?: () => void; onErledigt: (wert: number, last?: number) => void;
}) {
  const p = positionVon(einheit, schritt);
  const v = satzVorgabe(z, einheit, schritt);
  const [wert, setWert] = useState(v.wert);
  const [last, setLast] = useState(v.last);
  const ort = z.orte.find((o) => o.id === einheit.ortId);
  const letztes = letztesMal(z, u.id, einheit.id);
  const fortschritt = useMemo(() => fortschrittshinweis(z, einheit, schritt, lokaleZeit()), [z, einheit, schritt]);
  return (
    <div className="flex flex-1 flex-col">
      <Kopf z={z} u={u} label={kennzeichnung(einheit, schritt)} farbe={farbe} onTauschen={onTauschen} />
      {!p.istMaxTest && <Satzpunkte satz={schritt.satz} von={p.saetze} farbe={farbe} />}
      <Vorgabekarte u={u} v={v} farbe={farbe} last={last} raster={lastWaehlbar(z, einheit, schritt) && ort ? lastraster(ort, u) : []} onLast={setLast} />
      {/* Gezählt wird nur im Kalibrierungssatz und im Max-Test; sonst gilt das Ziel (Entscheidung 29.10.2026). */}
      {v.zaehlen
        ? v.inSek ? <Stoppuhr wert={wert} onChange={setWert} /> : <Zaehler wert={wert} onChange={setWert} />
        : v.inSek && <Countdown ziel={v.wert} />}
      {fortschritt
        ? <Fortschritt h={fortschritt} />
        : letztes && !p.istMaxTest && <p className="mt-3 text-center text-basis text-gedaempft">Letztes Mal: {letztesText(u, letztes)}</p>}
      <div className="mt-auto pt-8">
        <Knopf onClick={() => onErledigt(v.zaehlen ? wert : v.wert, last)}>{p.istMaxTest ? 'Test erledigt' : 'Satz erledigt'}</Knopf>
      </div>
    </div>
  );
}

function Satzpunkte({ satz, von, farbe }: { satz: number; von: number; farbe: Blockfarbe }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <p className="text-gross text-gedaempft">Satz {satz} von {von}</p>
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: von }, (_, i) => (
          <span key={i} className={`h-1.5 w-7 rounded-full ${i < satz - 1 ? farbe.voll : i === satz - 1 ? farbe.aktuell : 'bg-linie'}`} />
        ))}
      </div>
    </div>
  );
}

// Ziel, Last und Hinweis zur Reserve. Bei Übungen mit Last lässt sich das Gewicht in
// jedem Satz ändern (Entscheidung 21.10.2026); im Kalibrierungssatz wird es gewählt.
function Vorgabekarte({ u, v, farbe, last, raster, onLast }: {
  u: Uebung; v: SatzVorgabe; farbe: Blockfarbe; last?: number; raster: number[]; onLast: (kg: number) => void;
}) {
  const einheit = v.inSek ? 'Sekunden' : 'Wiederholungen';
  const teile = lastTeile(u, { last, bandStufe: v.bandStufe });
  const links = v.art === 'maxTest'
    ? { titel: 'Max-Test', gross: v.inSek ? 'So lange' : 'So viele', klein: 'wie möglich' }
    : { titel: 'Ziel', gross: String(v.wert), klein: v.bereich ? `Bereich ${v.bereich.von} bis ${v.bereich.bis}${v.inSek ? ' Sek.' : ''}` : einheit };
  const pos = last === undefined ? -1 : raster.indexOf(last);
  return (
    <section className={`mt-5 rounded-karte border-2 bg-flaeche p-5 ${farbe.rand}`}>
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

// Fortschritt im ersten Satz (Entscheidung 21.10.2026): letztes Mal, heute, nächster Schritt und eine
// kleine Kurve der letzten Einheiten (Wiederholungen bzw. Kraftschätzung, erst ab 2 Einheiten).
function Fortschritt({ h }: { h: NonNullable<ReturnType<typeof fortschrittshinweis>> }) {
  const { jetzt, danach } = fortschrittZeilen(h);
  return (
    <section className="mt-3 flex items-center gap-4 rounded-karte bg-akzent-hell px-5 py-3">
      <div className="flex-1">
        <p className="text-basis font-semibold">{jetzt}</p>
        <p className="text-basis text-gedaempft">{danach}</p>
      </div>
      {h.verlauf.length >= 2 && <Kurve werte={h.verlauf} />}
    </section>
  );
}

function Kurve({ werte }: { werte: number[] }) {
  const b = 72;
  const hoehe = 28;
  const min = Math.min(...werte);
  const spanne = Math.max(...werte) - min || 1;
  const punkte = werte.map((w, i) => [(i / (werte.length - 1)) * (b - 4) + 2, hoehe - 2 - ((w - min) / spanne) * (hoehe - 4)] as const);
  const letzter = punkte.at(-1)!;
  return (
    <svg width={b} height={hoehe} viewBox={`0 0 ${b} ${hoehe}`} aria-label="Verlauf der letzten Einheiten" role="img" className="shrink-0">
      <polyline points={punkte.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" strokeWidth="2" strokeLinejoin="round"
        strokeLinecap="round" className="stroke-akzent" />
      <circle cx={letzter[0]} cy={letzter[1]} r="3" className="fill-akzent" />
    </svg>
  );
}

function letztesText(u: Uebung, l: NonNullable<ReturnType<typeof letztesMal>>): string {
  const werte = l.werte.join(', ') + (l.inSek ? ' Sek.' : '');
  const last = l.bandStufe ? `Band ${BAND_NAMEN[l.bandStufe]}` : lastText(u, { last: l.last });
  return last ? `${last} × ${werte}` : werte;
}

// Pause mit Timer-Ring; am Ende Ton und Vibration, dann geht es mit dem nächsten Satz weiter.
function Pause({ z, einheit, schritt, farbe, ende, dauer, onAendern, onWeiter, onRueckgaengig }: {
  z: AppZustand; einheit: Einheit; schritt: Schritt; farbe: Blockfarbe; ende: number; dauer: number;
  onAendern: (ende: number, dauer: number) => void; onWeiter: () => void; onRueckgaengig?: () => void;
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
    v.art === 'ziel' ? `Ziel ${v.wert}${v.inSek ? ' Sek.' : ''}` : undefined,
    u ? lastText(u, { last: v.last, bandStufe: p.bandStufe }) : undefined,
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-1 flex-col items-center">
      <p className="mt-6 text-gross font-semibold text-gedaempft">Pause</p>
      <div className="relative mt-4 size-[230px]">
        <svg viewBox="0 0 230 230" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="115" cy="115" r={radius} fill="none" strokeWidth="12" className="stroke-linie" />
          <circle cx="115" cy="115" r={radius} fill="none" strokeWidth="12" strokeLinecap="round" className={farbe.strich}
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
      {onRueckgaengig && (
        <div className="mt-2">
          <Knopf art="schlicht" onClick={onRueckgaengig}>Letzten Satz rückgängig</Knopf>
        </div>
      )}
      <div className="mt-auto w-full pt-8">
        {u && (
          <section className={`rounded-karte border-2 bg-flaeche p-5 ${farbe.rand}`}>
            <p className={`text-hinweis font-bold tracking-wide uppercase ${farbe.text}`}>Als Nächstes</p>
            <p className="mt-1 text-gross font-bold">{u.name}</p>
            <p className="text-basis text-gedaempft">{naechstes}</p>
          </section>
        )}
        <p className="mt-4 text-center text-hinweis text-gedaempft">Ton und Vibration am Ende der Pause. Der Bildschirm bleibt an.</p>
      </div>
    </div>
  );
}

// Pause vor dem nächsten Block (Entscheidung 29.10.2026): Restzeit, darunter groß der nächste Block mit
// allen Übungen, Sätzen, Ziel und Last zum Aufbauen. Am Ende der Pause Ton und Vibration; weiter geht
// es erst mit „Los“.
function Blockwechsel({ z, einheit, block, farbe, ende, dauer, onAendern, onLos, onRueckgaengig }: {
  z: AppZustand; einheit: Einheit; block: number; farbe: Blockfarbe; ende: number; dauer: number;
  onAendern: (ende: number, dauer: number) => void; onLos: () => void; onRueckgaengig?: () => void;
}) {
  const jetzt = useJetzt(250);
  const rest = Math.max(0, Math.ceil((ende - jetzt) / 1000));
  const signal = useRef(dauer <= 0);
  useEffect(() => {
    if (rest > 0) {
      signal.current = false;
      return;
    }
    if (signal.current) return;
    signal.current = true;
    pausenEnde();
  }, [rest]);
  const name = blockName(einheit, block);
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-gross font-semibold text-gedaempft">{rest > 0 ? 'Pause' : 'Pause vorbei'}</p>
          <p className="text-zahl leading-none font-extrabold tabular-nums" aria-live="off">{zeitText(rest)}</p>
        </div>
        {dauer > 0 && (
          <div className="w-36">
            <Knopf art="sekundaer" onClick={() => onAendern(Math.max(ende, Date.now()) + PLAYER.pauseVerlaengernSek * 1000, dauer + PLAYER.pauseVerlaengernSek)}>
              +{PLAYER.pauseVerlaengernSek} Sek.
            </Knopf>
          </div>
        )}
      </div>
      <section className={`mt-6 rounded-karte border-2 p-5 ${farbe.rand} ${farbe.hell}`}>
        <p className={`text-hinweis font-bold tracking-wide uppercase ${farbe.text}`}>Als Nächstes{name ? ` · ${name}` : ''}</p>
        <ul className="mt-2">
          {einheit.bloecke[block]!.positionen.map((p, i) => {
            const u = uebungVon(z, p.uebungId);
            if (!u) return null;
            return (
              <li key={i} className="border-b border-linie py-3 last:border-b-0">
                <p className="text-gross font-bold">{u.name}</p>
                <p className="text-basis text-gedaempft">{p.istMaxTest ? 'So viele wie möglich' : detailText(u, p, lastAnzeige(z, u))}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="mt-4 text-center text-hinweis text-gedaempft">Bau alles auf. Weiter geht es mit „Los“.</p>
      {onRueckgaengig && (
        <div className="mt-2">
          <Knopf art="schlicht" onClick={onRueckgaengig}>Letzten Satz rückgängig</Knopf>
        </div>
      )}
      <div className="mt-auto pt-8">
        <Knopf onClick={onLos}>Los</Knopf>
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
  const grund = useUebergang<HTMLDivElement>('menue', 'einblenden', true);
  const blatt = useUebergang<HTMLElement>('menue', 'blatt', true);
  return (
    <div ref={grund} className="fixed inset-0 z-10 flex items-end bg-text/40" onClick={onFortsetzen}>
      <section ref={blatt} role="dialog" aria-modal="true" aria-label="Training unterbrechen" onClick={(ev) => ev.stopPropagation()}
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

// Gespeicherter Wert des Messsatzes (Wiederholungen bzw. Sekunden).
function geschafft(z: AppZustand, einheit: Einheit, s: Stelle): number {
  const p = einheit.bloecke[s.block]!.positionen[s.position]!;
  const r = p.ergebnisse[messSatz(z, einheit, s) - 1];
  return (r?.wdh ?? r?.sek) ?? p.zielWdh;
}

function FeedbackKarte({ z, einheit, stelle, wahl, messwert, farbe, onWahl, onMesswert }: {
  z: AppZustand; einheit: Einheit; stelle: Stelle; wahl: Feedback; messwert?: number; farbe: Blockfarbe;
  onWahl: (fb: Feedback) => void; onMesswert: (wert: number) => void;
}) {
  const p = einheit.bloecke[stelle.block]!.positionen[stelle.position]!;
  const u = uebungVon(z, p.uebungId);
  const nr = messSatz(z, einheit, stelle);
  // Die Folge rechnet schon mit dem eingegebenen Messwert.
  const vorschau = useMemo(() => {
    const e = messwert === undefined ? einheit : korrigiereSatz(z, einheit, stelle, nr, messwert);
    return vorschauNaechstesMal(z, e, { ...e.bloecke[stelle.block]!.positionen[stelle.position]!, feedback: wahl }, lokaleZeit());
  }, [z, einheit, stelle, nr, messwert, wahl]);
  if (!u) return null;
  const inSek = u.bereich.einheit === 'Sek.';
  // Mit wechselndem Gewicht steht darunter, welches Gewicht in welchem Satz galt.
  const lasten = new Set(p.ergebnisse.map((r) => lastText(u, { last: r.last ?? p.last, bandStufe: r.bandStufe ?? p.bandStufe })));
  const last = lasten.size <= 1 ? [...lasten][0] : undefined;
  const zahlen = p.ergebnisse.map((r) => (inSek ? r.sek : r.wdh) ?? 0);
  const jeSatz = lasten.size > 1
    ? saetzeMitLast(u, p.ergebnisse.map((r, i) => ({ wert: zahlen[i]!, last: r.last ?? p.last, bandStufe: r.bandStufe ?? p.bandStufe })))
    : undefined;
  const naechste = vorschau && uebungVon(z, vorschau.uebungId);
  return (
    <section className={`rounded-karte border border-l-[6px] border-rand bg-flaeche p-4 ${farbe.links}`}>
      <p className="text-gross font-bold">{u.name}</p>
      <p className="text-basis text-gedaempft">
        {[last, `${zahlen.length} ${zahlen.length === 1 ? 'Satz' : 'Sätze'}: ${zahlen.join(' · ')} ${inSek ? 'Sek.' : 'Wdh.'}`].filter(Boolean).join(' · ')}
      </p>
      {jeSatz && <p className="mt-1 text-basis text-gedaempft">{jeSatz}</p>}
      <div role="radiogroup" aria-label={`Wie war ${u.name}?`} className="mt-3 grid grid-cols-3 gap-2">
        {feedbackOptionen(inSek).map((o) => (
          <button key={o.wert} type="button" role="radio" aria-checked={wahl === o.wert} onClick={() => onWahl(o.wert)}
            className={`min-h-touch rounded-xl px-2 text-basis ${wahl === o.wert
              ? 'border-2 border-akzent bg-akzent-hell font-bold text-akzent' : 'border border-rand bg-flaeche font-semibold'}`}>
            {o.titel}
          </button>
        ))}
      </div>
      {messwert !== undefined && (
        <div className="mt-3">
          <p className="text-basis font-semibold">Wie {inSek ? 'lange hast du' : 'viele hast du'} im {nr}. Satz geschafft?</p>
          <Zaehler wert={messwert} onChange={onMesswert} einheit={inSek ? 'Sekunden' : 'Wiederholungen'} />
        </div>
      )}
      {vorschau && naechste && (
        <p className="mt-3 flex items-start gap-2 text-basis text-gedaempft">
          <span className="text-akzent"><Icon name="pfeil" groesse={18} /></span>
          {naechstesMalText(naechste, vorschau)}
        </p>
      )}
    </section>
  );
}

// Abschluss (Mockups 6 und 7), seit 29.10.2026 eine einzige Seite am Ende (Entscheidung): Dauer, Sätze,
// Rekorde, darunter alle fertigen Übungen mit zu leicht / passend / zu schwer (vorausgewählt; bei „zu schwer“
// die Nachfrage zum Messsatz), Gesamtanstrengung (freiwillig, nichts vorausgewählt), Notiz und optional
// Abkühlen. Ein „Speichern“ für alles. Das Training endet mit dem letzten Satz; die Seite zeigt den Stand,
// den das Speichern ergibt. Sterne nur für höchstens 2 Übungen, die neu sind oder deren Bewertung 6 Wochen
// alt ist (freiwillig, vorausgefüllt mit der letzten Bewertung; Entscheidung 29.10.2026).
function Abschluss({ z, einheit, fehler, onSpeichern }: {
  z: AppZustand; einheit: Einheit; fehler: boolean; onSpeichern: (neu: Einheit, angaben: Angaben) => void;
}) {
  const stellen = useMemo(() => offeneFeedbacks(einheit), [einheit]);
  const [gewaehlt, setGewaehlt] = useState<Record<string, Feedback>>({});
  const [werte, setWerte] = useState<Record<string, number>>({});
  const [anstrengung, setAnstrengung] = useState<Sterne>();
  const [notiz, setNotiz] = useState('');
  const [abkuehlen, setAbkuehlen] = useState(false);
  const [jetzt] = useState(lokaleZeit);
  const [fragen] = useState(() => sternFragen(z, einheit, jetzt));
  const [sterne, setSterne] = useState<Record<string, Sterne>>({});
  const bisherSterne = einstellungenAus(z).bewertungen ?? {};
  const schluessel = (s: Stelle) => `${s.block}.${s.position}`;
  const wahl = (s: Stelle) => gewaehlt[schluessel(s)] ?? feedbackVorschlag(z, einheit, s);
  const messwert = (s: Stelle) => (wahl(s) === 'schwer' ? werte[schluessel(s)] ?? geschafft(z, einheit, s) : undefined);
  const bewertet = bewerteAlle(z, einheit, stellen, stellen.map(wahl), stellen.map(messwert));
  const ende = letzterSatzAm(einheit) ?? jetzt;
  const e = beende(bewertet, ende);
  const sek = e.gestartetAm ? Math.max(0, Math.round((msVon(ende) - msVon(e.gestartetAm)) / 1000)) : 0;
  const zirkel = e.format === 'zirkel';
  const zirkelId = e.bloecke.find((b) => b.typ === 'zirkel')?.zirkelId;
  const bisher = zirkelId ? zirkelBestzeit(z, zirkelId, e.ortId, ende) : undefined;
  const neueBestzeit = zirkel && e.status === 'abgeschlossen' && (bisher === undefined || sek < bisher);
  const rekorde = neueRekorde(z, e).filter((r) => r.art !== 'zirkel');
  const kacheln: [string, string][] = zirkel
    ? [[dauerText(sek), 'Zeit'], ...(bisher !== undefined ? [[dauerText(bisher), 'Bestzeit bisher'] as [string, string]] : [])]
    : [[String(Math.round(sek / 60)), 'Minuten'], [String(erledigteSaetze(e)), 'Sätze'], [String(rekorde.length), rekorde.length === 1 ? 'Rekord' : 'Rekorde']];
  const trainiert = e.bloecke.flatMap((b) => b.positionen).filter((p) => !p.istMaxTest && p.ergebnisse.length > 0);
  const ort = z.orte.find((o) => o.id === e.ortId);
  const mobility = ort
    ? mobilityZeilen(z, ort, musterNachSaetzen(z, trainiert)).slice(0, z.katalog.aufwaermen.maxMobilityZeilen)
    : [];
  const inSek = stellen.every((s) => uebungVon(z, positionVon(einheit, { ...s, satz: 1 }).uebungId)?.bereich.einheit === 'Sek.');
  const speichern = () => {
    const text = notiz.trim();
    onSpeichern(bewertet, {
      ...(anstrengung ? { gesamtbewertung: anstrengung } : {}), ...(text ? { notiz: text } : {}), bewertungen: sterne, gefragt: fragen,
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <p className="mt-4 text-basis font-semibold text-akzent">{e.status === 'abgeschlossen' ? 'Einheit abgeschlossen' : 'Training beendet'}</p>
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
      {e.status === 'abgebrochen' && <p className="mt-4 text-basis text-gedaempft">Deine erledigten Sätze werden gespeichert.</p>}
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

      {stellen.length > 0 && (
        <>
          <h2 className="mt-7 text-gross font-bold">{stellen.length > 1 ? 'Wie waren die Übungen?' : 'Wie war die Übung?'}</h2>
          <ul className="mt-1 text-hinweis text-gedaempft">
            {feedbackOptionen(inSek).map((o) => <li key={o.wert}><span className="font-semibold">{o.titel}:</span> {o.text}</li>)}
          </ul>
          <div className="mt-3 flex flex-col gap-3">
            {stellen.map((s) => (
              <FeedbackKarte key={schluessel(s)} z={z} einheit={einheit} stelle={s} wahl={wahl(s)} messwert={messwert(s)}
                farbe={blockFarbe(s.block)}
                onWahl={(fb) => setGewaehlt({ ...gewaehlt, [schluessel(s)]: fb })}
                onMesswert={(w) => setWerte({ ...werte, [schluessel(s)]: w })} />
            ))}
          </div>
        </>
      )}

      {fragen.length > 0 && (
        <>
          <h2 className="mt-7 text-gross font-bold">{fragen.length > 1 ? 'Wie gefallen dir die Übungen?' : 'Wie gefällt dir die Übung?'}</h2>
          <Hinweis>Freiwillig. Mehr Sterne: kommt öfter dran. 1 Stern: wird ab der nächsten Einheit ersetzt, wenn es eine Alternative gibt.</Hinweis>
          <ul className="mt-3 rounded-karte border border-rand bg-flaeche px-5">
            {fragen.map((id) => {
              const name = uebungVon(z, id)?.name ?? id;
              return (
                <li key={id} className="border-b border-linie pt-3 pb-1 last:border-b-0">
                  <p className="text-basis font-semibold">{name}</p>
                  <div className="-ml-2.5">
                    <Sternwahl label={`Bewertung ${name}`} wert={sterne[id] ?? bisherSterne[id]}
                      onChange={(n) => setSterne({ ...sterne, [id]: n })} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
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

      <label className="mt-7 block">
        <span className="mb-2 block text-basis font-semibold text-gedaempft">Notiz (optional)</span>
        <textarea value={notiz} onChange={(ev) => setNotiz(ev.target.value)} rows={3} placeholder="z. B. Schulter leicht gezwickt"
          className="w-full rounded-karte border border-rand bg-flaeche px-4 py-3 text-gross outline-none focus:border-akzent" />
      </label>

      {mobility.length > 0 && (
        <div className="mt-5">
          {abkuehlen
            ? <><h2 className="mb-3 text-gross font-bold">Abkühlen, ca. 3 Min.</h2><Ablaufliste zeilen={mobility} /></>
            : <Knopf art="schlicht" onClick={() => setAbkuehlen(true)}>Abkühlen (optional, ca. 3 Min.)</Knopf>}
        </div>
      )}
      {fehler && <Speicherfehler />}
      <div className="mt-auto pt-8">
        <Knopf onClick={speichern}>Speichern</Knopf>
      </div>
    </div>
  );
}

// Speichern beim Beenden fehlgeschlagen: Hinweis und zurück zu Heute.
function Speicherfehlerseite() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-seite pt-12 pb-8">
      <Speicherfehler />
      <div className="mt-auto pt-8"><Knopf onClick={() => navigate('/', { replace: true })}>Zu Heute</Knopf></div>
    </main>
  );
}
