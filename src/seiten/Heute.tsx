// Heute (Mockup 1): nächste Einheit als Vorschau mit allen Übungen, Wochenausblick mit den gewählten
// Trainingstagen (Entscheidung 21.10.2026) und nächster Max-Test. Der Wochenfortschritt pro Muskel
// steht im Tab Fortschritt. Beim ersten Start geht es direkt ins Onboarding.
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { aendereTage, speichereTausch, verwerfeEinheit } from '../daten/speichern';
import { lokaleZeit } from '../daten/zeit';
import { heuteFrei, maxOffeneTage, prognoseAusTagen, vorschlagTage, wochenausblick, type AusblickTag } from '../logik/ausblick';
import { isoWoche, wochentag } from '../logik/datum';
import { aktuelleEinheit, backupErinnerung, heuteErledigt, naechsterMaxTest } from '../logik/heute';
import { erstelleEinheit, istErholungswoche, startfragen, tausche } from '../logik/planung';
import type { AppZustand, Einheit } from '../logik/typen';
import { uebungVon } from '../logik/verlauf';
import { Hinweis, Knopf, TageWahl } from '../ui/bausteine';
import { TauschBlatt } from '../ui/blaetter';
import { Icon } from '../ui/Icon';
import { abText, datumLang, einheitName, einheitenText, muskelgruppenText, tagText } from '../ui/texte';
import { kannTeilen, sichereBackup } from '../ui/backupSichern';
import { UebungsListe } from '../ui/uebungsliste';
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
    return {
      fragen, aktuell, vorschau, woche,
      ausblick: woche?.tage ? wochenausblick(z, jetzt, woche.tage) : undefined,
      erholungswoche: istErholungswoche(z, jetzt),
      maxTest: naechsterMaxTest(z, jetzt, fragen.ortId),
      backup: backupErinnerung(z, jetzt),
      erledigt: heuteErledigt(z, jetzt),
    };
  }, [z, jetzt]);
  const { fragen, aktuell, vorschau, woche, ausblick, erholungswoche, maxTest, backup, erledigt } = daten;
  // Nach dem Training des Tages zeigt Heute „Heute erledigt“; „Trotzdem trainieren“ öffnet die
  // üblichen Möglichkeiten (Entscheidung 21.10.2026).
  const [nochmal, setNochmal] = useState(false);
  const fertig = !aktuell && !nochmal ? erledigt : undefined;
  const frei = !aktuell && !nochmal && !fertig && heuteFrei(jetzt, woche?.tage);
  const naechster = ausblick?.find((t) => (t.art === 'einheit' || t.art === 'zirkel') && t.datum > jetzt.slice(0, 10));
  const ort = z.orte.find((o) => o.id === (fertig?.einheit.ortId ?? vorschau?.ortId ?? fragen.ortId));
  const liste = !fertig && !frei && aktuell?.status !== 'laufend' && vorschau && vorschau.bloecke.length > 0 ? vorschau : undefined;
  // Tauschen auf Heute geht in der erstellten Einheit; die voraussichtliche wird erst vor dem Start erstellt.
  const [tausch, setTausch] = useState<{ block: number; position: number }>();
  const tauschbar = aktuell?.status === 'geplant' ? aktuell : undefined;

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
            {fertig || frei ? 'Dein Training heute' : aktuell?.status === 'laufend' ? 'Unterbrochene Einheit' : aktuell ? 'Erstellte Einheit' : 'Nächste Einheit'}
          </p>
          {ort && <span className="rounded-full bg-akzent-hell px-3 py-1 text-basis font-semibold text-akzent">{ort.name}</span>}
        </div>
        {fertig ? (
          <>
            <div className="mt-3 mb-5 flex items-start gap-3">
              <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-akzent text-flaeche">
                <Icon name="haken" groesse={20} />
              </span>
              <div>
                <h2 className="text-titel font-extrabold">Heute erledigt</h2>
                <p className="mt-1 text-gross text-gedaempft">
                  {[einheitName(z, fertig.einheit), fertig.dauerMin > 0 ? `${fertig.dauerMin} Min` : '', `${fertig.saetze} Sätze`].filter(Boolean).join(' · ')}
                </p>
                {naechster && <p className="mt-1 text-basis">Nächstes Training: {tagText(naechster.datum, naechster.tag)}</p>}
              </div>
            </div>
            <Knopf art="schlicht" onClick={() => setNochmal(true)}>Trotzdem trainieren</Knopf>
          </>
        ) : frei ? (
          <>
            <Titel titel="Heute frei"
              text={naechster ? `Nächstes Training: ${tagText(naechster.datum, naechster.tag)}` : 'Diese Woche ist kein Training mehr geplant.'} />
            <Knopf art="schlicht" onClick={() => setNochmal(true)}>Trotzdem trainieren</Knopf>
          </>
        ) : aktuell?.status === 'laufend' ? (
          <>
            <Titel titel={einheitName(z, aktuell)} text={`ca. ${aktuell.geschaetzteDauerMin} Min · ${gruppen(z, aktuell)}`} />
            <Knopf onClick={() => navigate(`/training/${aktuell.id}`)}>Fortsetzen</Knopf>
          </>
        ) : aktuell ? (
          <>
            <Titel titel={einheitName(z, aktuell)} text={`ca. ${aktuell.geschaetzteDauerMin} Min · ${gruppen(z, aktuell)}`} />
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
              ? <Titel titel={einheitName(z, vorschau)} text={`ca. ${vorschau.geschaetzteDauerMin} Min · ${gruppen(z, vorschau)}`} />
              : <Titel titel="Zirkel" text="Diese Woche ist ein Zirkel dran." />}
            <Knopf onClick={() => navigate('/start')}>Training starten</Knopf>
          </>
        )}
        {liste && (
          <div className="mt-5 border-t border-linie pt-4">
            <p className="mb-2 text-hinweis text-gedaempft">
              {aktuell ? 'Übungen' : 'Voraussichtlich, mit den Standardangaben vor dem Start'}
            </p>
            <UebungsListe z={z} einheit={liste} onTauschen={tauschbar ? (block, position) => setTausch({ block, position }) : undefined} />
          </div>
        )}
        {tausch && tauschbar && (
          <TauschBlatt z={z} einheit={tauschbar} {...tausch} onSchliessen={() => setTausch(undefined)}
            onWahl={(id) => { setTausch(undefined); void speichereTausch(tausche(z, tauschbar, tausch.block, tausch.position, id)); }} />
        )}
      </section>

      <Woche z={z} jetzt={jetzt} ortId={fragen.ortId} tage={woche?.tage} einheiten={woche?.einheiten ?? 0} ausblick={ausblick} />

      {maxTest && (
        <p className="flex items-center gap-3 text-basis text-gedaempft">
          <Icon name="fortschritt" groesse={22} />
          Nächster Max-Test: {uebungVon(z, maxTest.uebungId)?.name}, {abText(maxTest.ab, jetzt)}
        </p>
      )}

      {backup && <WochenBackup />}
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

// Diese Woche: Trainingstage wählen und je Tag die voraussichtliche Einheit (Wochenausblick).
function Woche({ z, jetzt, ortId, tage, einheiten, ausblick }: {
  z: AppZustand; jetzt: string; ortId: string; tage?: number[]; einheiten: number; ausblick?: AusblickTag[];
}) {
  const [aendern, setAendern] = useState(false);
  const heute = wochentag(jetzt);
  const zeigeWahl = aendern || !tage;
  const tageText = tage && tage.length > 0 ? tage.map((t) => ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][t]).join(', ') : 'keine Tage';
  const kommend = ausblick?.filter((t) => t.art === 'erledigt' || t.tag !== heute) ?? [];
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-screen font-extrabold">Diese Woche</h2>
        {tage && (
          <p className="text-basis text-gedaempft">
            {einheitenText(einheiten, prognoseAusTagen(z, jetzt, tage))}
          </p>
        )}
      </div>
      {zeigeWahl ? (
        <TageKarte z={z} jetzt={jetzt} ortId={ortId} tage={tage} onFertig={() => setAendern(false)} />
      ) : (
        <p className="text-basis text-gedaempft">
          Trainingstage: {tageText} ·{' '}
          <button type="button" className="min-h-touch font-semibold text-akzent underline" onClick={() => setAendern(true)}>
            ändern
          </button>
        </p>
      )}
      {!zeigeWahl && kommend.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {kommend.map((t) => <AusblickZeile key={`${t.datum}-${t.art}-${t.einheit?.id ?? ''}`} z={z} t={t} />)}
        </ul>
      )}
      {!zeigeWahl && kommend.some((t) => t.art !== 'erledigt') && (
        <div className="mt-2"><Hinweis>Schätzung: Jede Einheit wird erst vor dem Start erstellt und passt sich an.</Hinweis></div>
      )}
    </section>
  );
}

function TageKarte({ z, jetzt, ortId, tage, onFertig }: {
  z: AppZustand; jetzt: string; ortId: string; tage?: number[]; onFertig: () => void;
}) {
  const heute = wochentag(jetzt);
  const [wahl, setWahl] = useState(() => tage?.filter((t) => t >= heute) ?? vorschlagTage(z, jetzt));
  const speichern = async () => {
    // Vergangene Tage bleiben gespeichert, damit der Ausblick die Woche vollständig kennt.
    await aendereTage([...(tage?.filter((t) => t < heute) ?? []), ...wahl], ortId, lokaleZeit());
    onFertig();
  };
  return (
    <div className="mt-2 rounded-karte border border-rand bg-flaeche p-5">
      <p className="text-basis font-semibold">An welchen Tagen trainierst du diese Woche?</p>
      <p className="mb-3 text-hinweis text-gedaempft">Danach siehst du für jeden Tag, was geplant ist.</p>
      <TageWahl wert={wahl} onChange={setWahl} ab={heute} max={maxOffeneTage(z, jetzt)} />
      <div className="mt-4 flex flex-col gap-2">
        <Knopf onClick={() => void speichern()}>Übernehmen</Knopf>
        {tage && <Knopf art="schlicht" onClick={onFertig}>Abbrechen</Knopf>}
      </div>
    </div>
  );
}

function AusblickZeile({ z, t }: { z: AppZustand; t: AusblickTag }) {
  const tag = tagText(t.datum, t.tag);
  if (t.art !== 'einheit' || !t.einheit) {
    const text = t.art === 'erledigt' && t.einheit ? `${einheitName(z, t.einheit)} · erledigt`
      : t.art === 'zirkel' ? 'Zirkel · Auswahl beim Start' : 'Ruhetag empfohlen';
    return (
      <li className="flex items-center gap-3 rounded-karte border border-rand bg-flaeche px-5 py-3 text-basis">
        <span className="w-24 shrink-0 font-semibold">{tag}</span>
        <span className="text-gedaempft">{text}</span>
      </li>
    );
  }
  const e = t.einheit;
  return (
    <li className="rounded-karte border border-rand bg-flaeche">
      <details>
        <summary className="flex min-h-touch cursor-pointer list-none items-center gap-3 px-5 py-3 text-basis">
          <span className="w-24 shrink-0 font-semibold">{tag}</span>
          <span className="flex-1">
            <span className="block font-semibold">{einheitName(z, e)}</span>
            <span className="block text-hinweis text-gedaempft">ca. {e.geschaetzteDauerMin} Min · {gruppen(z, e)}</span>
          </span>
          <span className="text-gedaempft"><Icon name="weiter" groesse={20} /></span>
        </summary>
        <div className="px-5 pb-4"><UebungsListe z={z} einheit={e} /></div>
      </details>
    </li>
  );
}

// Wochen-Backup: einmal pro Woche vorgeschlagen; ein Tipp sichert in Drive (Teilen) oder als Datei.
function WochenBackup() {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);
  const sichern = async (art: 'teilen' | 'speichern') => {
    setLaeuft(true);
    setFehler(false);
    try {
      await sichereBackup(art);
    } catch {
      setFehler(true);
    }
    setLaeuft(false);
  };
  return (
    <section className="rounded-karte border border-rand bg-flaeche p-5">
      <p className="text-gross font-semibold">Zeit für dein Wochen-Backup</p>
      <p className="mb-4 text-hinweis text-gedaempft">
        Sichere deine Daten außerhalb der App. Im Teilen-Menü wählst du z. B. Google Drive.
      </p>
      <div className="flex flex-col gap-2">
        {kannTeilen() && <Knopf onClick={() => void sichern('teilen')} deaktiviert={laeuft}>In Drive sichern</Knopf>}
        <Knopf art={kannTeilen() ? 'sekundaer' : 'primaer'} onClick={() => void sichern('speichern')} deaktiviert={laeuft}>
          Auf dem Handy speichern
        </Knopf>
      </div>
      {fehler && <p role="alert" className="mt-3 text-hinweis font-semibold">Das Backup hat nicht geklappt. Bitte versuche es noch einmal.</p>}
    </section>
  );
}
