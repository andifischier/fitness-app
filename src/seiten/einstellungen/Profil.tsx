import { PROFIL, STANDARD_PRIORITAETEN, ZEITBUDGET } from '../../konfiguration';
import { aendereEinstellungen, speicherePrioritaeten } from '../../daten/speichern';
import { MUSKELN, PRIORITAETEN, type Einstellungen, type Muskel, type Prioritaet } from '../../logik/typen';
import { Auswahl, Hinweis, Karte, Knopf, Laedt, Mehrfachauswahl, Schalter, Seite, Stepper } from '../../ui/bausteine';
import {
  LEVEL_NAMEN, MUSKEL_NAMEN, PRIORITAET_NAMEN, RESERVE_NAMEN, ZIEL_NAMEN, ZIRKEL_ANTEIL_NAMEN,
} from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

const optionen = <K extends string>(namen: Record<K, string>) =>
  (Object.keys(namen) as K[]).map((wert) => ({ wert, text: namen[wert] }));

const setze = (teil: Partial<Einstellungen>) => aendereEinstellungen((e) => ({ ...e, ...teil }));

export function ProfilSeite() {
  const z = useZustand();
  if (!z) return <Laedt />;
  const e = einstellungenAus(z);
  const { min, max } = PROFIL.einheitenProWoche;
  return (
    <Seite titel="Profil" zurueck="/einstellungen">
      <Karte titel="Ziele" hinweis={`Mehrfachauswahl. Kraft nutzt für Grundübungen mit Gewicht ${PROFIL.kraftBereich.von} bis ${PROFIL.kraftBereich.bis} Wiederholungen.`}>
        <Mehrfachauswahl
          optionen={optionen(ZIEL_NAMEN)} werte={e.ziele}
          onChange={(ziele) => { if (ziele.length > 0) void setze({ ziele }); }}
        />
      </Karte>
      <Karte titel="Trainingslevel" hinweis="Bestimmt Startwerte, solange es keinen Testtag gibt.">
        <Auswahl optionen={optionen(LEVEL_NAMEN)} wert={e.level} onChange={(level) => void setze({ level })} />
      </Karte>
      <Karte titel="Übliche Einheiten pro Woche"
        hinweis="Nur der Vorschlag, wie viele Trainingstage die App zu Wochenbeginn vorauswählt.">
        <Auswahl
          spalten={6} wert={e.ueblicheEinheiten} onChange={(n) => void setze({ ueblicheEinheiten: n })}
          optionen={Array.from({ length: max - min + 1 }, (_, i) => ({ wert: min + i, text: String(min + i) }))}
        />
      </Karte>
      <Karte titel="Ziel-Reserve" hinweis="So viele Wiederholungen sollten am Ende eines Satzes noch gehen.">
        <Auswahl optionen={optionen(RESERVE_NAMEN)} wert={e.zielReserve} onChange={(zielReserve) => void setze({ zielReserve })} />
      </Karte>
      <PlatzKarte e={e} />
    </Seite>
  );
}

// Platz zum Gehen (Entscheidung 29.10.2026, Standard aus); auch im Onboarding genutzt.
export function PlatzKarte({ e }: { e: Einstellungen }) {
  return (
    <Karte>
      <Schalter titel="Platz zum Gehen" an={e.platzZumGehen === true}
        hinweis="Etwa 10 Schritte am Stück, z. B. für Ausfallschritte gehend. Ohne Platz plant die App solche Übungen nicht ein."
        onChange={(an) => void setze({ platzZumGehen: an })} />
    </Karte>
  );
}

export function PrioritaetenSeite() {
  const z = useZustand();
  if (!z) return <Laedt />;
  return (
    <Seite titel="Muskelprioritäten" zurueck="/einstellungen">
      <Hinweis>Höhere Priorität bekommt mehr Sätze pro Woche. Standard: alle normal.</Hinweis>
      <PrioritaetenListe e={einstellungenAus(z)} />
    </Seite>
  );
}

// Prioritäten je Muskel; auch im Onboarding genutzt.
export function PrioritaetenListe({ e }: { e: Einstellungen }) {
  const setzePrio = (m: Muskel, p: Prioritaet) => void speicherePrioritaeten({ ...e.prioritaeten, [m]: p });
  const standard = MUSKELN.every((m) => e.prioritaeten[m] === STANDARD_PRIORITAETEN[m]);
  return (
    <>
      <Karte>
        <div className="flex flex-col gap-5">
          {MUSKELN.map((m) => (
            <div key={m}>
              <p className="mb-2 text-basis font-semibold">{MUSKEL_NAMEN[m]}</p>
              <Auswahl
                spalten={4} wert={e.prioritaeten[m]} onChange={(p) => setzePrio(m, p)}
                optionen={PRIORITAETEN.map((p) => ({ wert: p, text: PRIORITAET_NAMEN[p] }))}
              />
            </div>
          ))}
        </div>
      </Karte>
      {!standard && (
        <Knopf art="sekundaer" onClick={() => void speicherePrioritaeten(STANDARD_PRIORITAETEN)}>
          Zurück zu „alle normal“
        </Knopf>
      )}
    </>
  );
}

export function TrainingSeite() {
  const z = useZustand();
  if (!z) return <Laedt />;
  const e = einstellungenAus(z);
  const dauer = PROFIL.dauerMin;
  const pause = PROFIL.pausenSek;
  const setzePause = (art: keyof Einstellungen['pausenSek'], sek: number) =>
    void setze({ pausenSek: { ...e.pausenSek, [art]: sek } });
  return (
    <Seite titel="Dauer, Zirkel und Pausen" zurueck="/einstellungen">
      <Karte titel="Standard-Trainingsdauer" hinweis="Bauch und Waden kommen zusätzlich dazu.">
        <Stepper label="Dauer" wert={e.standardDauerMin} min={dauer.min} max={dauer.max} schritt={dauer.schritt}
          einheit="Min" onChange={(standardDauerMin) => void setze({ standardDauerMin })} />
        <div className="mt-4">
          <Schalter
            titel="Längere Einheiten anbieten" an={e.laengerAnbieten}
            hinweis={`In Wochen mit 1 bis ${ZEITBUDGET.laengerBisPrognose} Einheiten fragt die App „${ZEITBUDGET.laengerMin} Min länger?“.`}
            onChange={(laengerAnbieten) => void setze({ laengerAnbieten })}
          />
        </div>
      </Karte>
      <Karte titel="Anteil Zirkel-Workouts">
        <Auswahl spalten={2} optionen={optionen(ZIRKEL_ANTEIL_NAMEN)} wert={e.zirkelAnteil}
          onChange={(zirkelAnteil) => void setze({ zirkelAnteil })} />
      </Karte>
      <Karte titel="Pausen" hinweis={`Zwischen den Sätzen, ${pause.min} bis ${pause.max} Sek.`}>
        <div className="flex flex-col gap-4">
          {([['grund', 'Grundübung'], ['isolation', 'Isolation'], ['supersatz', 'Kombi (nach jeder Runde)']] as const)
            .map(([art, titel]) => (
              <div key={art} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-basis font-semibold">{titel}</span>
                <Stepper label={`Pause ${titel}`} wert={e.pausenSek[art]} min={pause.min} max={pause.max}
                  schritt={pause.schritt} einheit="Sek." onChange={(s) => setzePause(art, s)} />
              </div>
            ))}
        </div>
      </Karte>
    </Seite>
  );
}
