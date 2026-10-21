// Heute (Mockup 1): nächste Einheit als Vorschau, Wochenfortschritt pro Muskel, Wochenprognose mit
// „ändern“ und nächster Max-Test. Beim ersten Start geht es direkt ins Onboarding.
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { aenderePrognose, verwerfeEinheit } from '../daten/speichern';
import { lokaleZeit } from '../daten/zeit';
import { isoWoche } from '../logik/datum';
import { aktuelleEinheit, backupErinnerung, naechsterMaxTest } from '../logik/heute';
import { erstelleEinheit, istErholungswoche, startfragen, wochenziele } from '../logik/planung';
import { MUSKELN, type AppZustand, type Einheit } from '../logik/typen';
import { uebungVon } from '../logik/verlauf';
import { PROFIL } from '../konfiguration';
import { Auswahl, Knopf } from '../ui/bausteine';
import { Icon } from '../ui/Icon';
import { abText, datumLang, FOKUS_NAMEN, MUSKEL_NAMEN, muskelgruppenText, saetzeText } from '../ui/texte';
import { einstellungenAus, useZustand } from '../ui/useZustand';

export function HeuteSeite() {
  const z = useZustand();
  const [jetzt] = useState(lokaleZeit);
  if (z && !einstellungenAus(z).onboardingAbgeschlossen) return <Navigate to="/onboarding/1" replace />;
  return (
    <main className="mx-auto max-w-xl px-seite pt-8 pb-10">
      <p className="pt-4 text-basis text-gedaempft">{datumLang(jetzt)}</p>
      <h1 className="text-titel font-extrabold">Heute</h1>
      {!z ? <p className="mt-6 text-gedaempft">Lädt …</p> : z.orte.length === 0 ? <OhneOrt /> : <Inhalt z={z} jetzt={jetzt} />}
    </main>
  );
}

function OhneOrt() {
  return (
    <p className="mt-6 text-basis">
      Lege zuerst einen Ort mit deinem Equipment an: <Link to="/einstellungen/orte" className="font-semibold text-akzent underline">Orte</Link>
    </p>
  );
}

const kurzName = (z: AppZustand, e: Einheit) =>
  e.format === 'zirkel' ? z.katalog.zirkel.find((x) => x.id === e.bloecke[0]?.zirkelId)?.name ?? 'Zirkel' : FOKUS_NAMEN[e.fokus];

const gruppen = (z: AppZustand, e: Einheit) =>
  muskelgruppenText(e.bloecke.flatMap((b) => b.positionen).flatMap((p) => uebungVon(z, p.uebungId)?.primaer ?? []));

function Inhalt({ z, jetzt }: { z: AppZustand; jetzt: string }) {
  const navigate = useNavigate();
  const daten = useMemo(() => {
    const fragen = startfragen(z, jetzt);
    const aktuell = aktuelleEinheit(z, jetzt);
    const vorschau = aktuell ?? (fragen.zirkelVorschlag || fragen.ruhetagEmpfohlen ? undefined : erstelleEinheit(z, {
      jetzt, ortId: fragen.ortId, prognose: fragen.prognoseVorschlag, morgenWieder: fragen.morgenWiederVorschlag, laenger: false,
    }));
    const woche = z.wochen.find((w) => w.id === isoWoche(jetzt));
    const prognose = woche?.prognose ?? fragen.prognoseVorschlag;
    return {
      fragen, aktuell, vorschau, woche, prognose,
      ziele: wochenziele(z, prognose, fragen.ortId, jetzt),
      erholungswoche: istErholungswoche(z, jetzt),
      maxTest: naechsterMaxTest(z, jetzt, fragen.ortId),
      backup: backupErinnerung(z, jetzt),
    };
  }, [z, jetzt]);
  const { fragen, aktuell, vorschau, woche, prognose, ziele, erholungswoche, maxTest, backup } = daten;
  const ort = z.orte.find((o) => o.id === (vorschau?.ortId ?? fragen.ortId));

  const neuErstellen = async () => {
    if (aktuell) await verwerfeEinheit(aktuell.id);
    navigate('/start');
  };

  return (
    <div className="mt-6 flex flex-col gap-5">
      {erholungswoche && (
        <p className="rounded-karte bg-akzent-hell px-5 py-3 text-basis font-semibold text-akzent">
          Erholungswoche: halbes Volumen, Gewichte bleiben gleich.
        </p>
      )}

      <section className="rounded-karte border border-rand bg-flaeche p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-basis text-gedaempft">
            {aktuell?.status === 'laufend' ? 'Unterbrochene Einheit' : aktuell ? 'Erstellte Einheit' : 'Nächste Einheit'}
          </p>
          {ort && <span className="rounded-full bg-akzent-hell px-3 py-1 text-basis font-semibold text-akzent">{ort.name}</span>}
        </div>
        {aktuell?.status === 'laufend' ? (
          <>
            <Titel titel={kurzName(z, aktuell)} text={`ca. ${aktuell.geschaetzteDauerMin} Min · ${gruppen(z, aktuell)}`} />
            <Knopf onClick={() => navigate(`/training/${aktuell.id}`)}>Fortsetzen</Knopf>
          </>
        ) : aktuell ? (
          <>
            <Titel titel={kurzName(z, aktuell)} text={`ca. ${aktuell.geschaetzteDauerMin} Min · ${gruppen(z, aktuell)}`} />
            <div className="flex flex-col gap-2">
              <Knopf onClick={() => navigate(`/vorschau/${aktuell.id}`)}>Vorschau öffnen</Knopf>
              <Knopf art="schlicht" onClick={() => void neuErstellen()}>Neu erstellen</Knopf>
            </div>
          </>
        ) : fragen.ruhetagEmpfohlen ? (
          <>
            <Titel titel="Ruhetag empfohlen" text="Deine Muskeln brauchen noch etwas Erholung." />
            <div className="flex flex-col gap-2">
              <Knopf onClick={() => navigate('/start')}>Trotzdem trainieren</Knopf>
              {!erholungswoche && <Knopf art="sekundaer" onClick={() => navigate('/start?zirkel=1')}>Zirkel</Knopf>}
              <Knopf art="sekundaer" onClick={() => navigate('/mobility')}>Mobility</Knopf>
            </div>
          </>
        ) : (
          <>
            {vorschau
              ? <Titel titel={kurzName(z, vorschau)} text={`ca. ${vorschau.geschaetzteDauerMin} Min · ${gruppen(z, vorschau)}`} />
              : <Titel titel="Zirkel" text="Diese Woche ist ein Zirkel dran." />}
            <Knopf onClick={() => navigate('/start')}>Training starten</Knopf>
          </>
        )}
      </section>

      <Woche ortId={fragen.ortId} einheiten={woche?.einheiten ?? 0} prognose={prognose}
        ziele={ziele} erledigt={woche?.erledigt} />

      {maxTest && (
        <p className="flex items-center gap-3 text-basis text-gedaempft">
          <Icon name="fortschritt" groesse={22} />
          Nächster Max-Test: {uebungVon(z, maxTest.uebungId)?.name}, {abText(maxTest.ab, jetzt)}
        </p>
      )}

      {backup && (
        <Link to="/einstellungen/backup" className="flex items-center gap-3 rounded-karte border border-rand bg-flaeche p-5">
          <span className="flex-1">
            <span className="block text-gross font-semibold">Zeit für ein Backup</span>
            <span className="block text-hinweis text-gedaempft">Sichere deine Daten alle 4 Wochen in einer Datei.</span>
          </span>
          <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
        </Link>
      )}
    </div>
  );
}

function Titel({ titel, text }: { titel: string; text: string }) {
  return (
    <div className="mt-3 mb-5">
      <h2 className="text-titel font-extrabold">{titel}</h2>
      <p className="mt-1 text-gross text-gedaempft">{text}</p>
    </div>
  );
}

function Woche({ ortId, einheiten, prognose, ziele, erledigt }: {
  ortId: string; einheiten: number; prognose: number;
  ziele: Record<string, number>; erledigt?: Record<string, number>;
}) {
  const [aendern, setAendern] = useState(false);
  const { min, max } = PROFIL.einheitenProWoche;
  const optionen = Array.from({ length: max - min + 1 }, (_, i) => min + i)
    .filter((n) => n >= einheiten).map((n) => ({ wert: n, text: String(n) }));
  const muskeln = MUSKELN.filter((m) => ziele[m]! > 0 || (erledigt?.[m] ?? 0) > 0);
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-screen font-extrabold">Diese Woche</h2>
        <p className="text-basis text-gedaempft">
          {einheiten} von {prognose} Einheiten ·{' '}
          <button type="button" className="min-h-touch font-semibold text-akzent underline" onClick={() => setAendern(!aendern)}>
            ändern
          </button>
        </p>
      </div>
      {aendern && (
        <div className="mb-4 rounded-karte border border-rand bg-flaeche p-5">
          <p className="mb-3 text-basis font-semibold">Wie oft schaffst du es diese Woche?</p>
          <Auswahl optionen={optionen} wert={prognose} spalten={6}
            onChange={(n) => { void aenderePrognose(n, ortId, lokaleZeit()); setAendern(false); }} />
        </div>
      )}
      <ul className="mt-2 rounded-karte border border-rand bg-flaeche px-5 py-3">
        {muskeln.map((m) => {
          const ziel = ziele[m] ?? 0;
          const ist = erledigt?.[m] ?? 0;
          return (
            <li key={m} className="flex min-h-[40px] items-center gap-4">
              <span className="w-40 shrink-0 text-basis">{MUSKEL_NAMEN[m]}</span>
              <span className="h-2 flex-1 rounded-full bg-linie">
                <span className="block h-2 rounded-full bg-akzent" style={{ width: `${ziel > 0 ? Math.min(100, (ist / ziel) * 100) : 0}%` }} />
              </span>
              <span className="w-12 text-right text-basis text-gedaempft">{saetzeText(ist)}/{ziel}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
