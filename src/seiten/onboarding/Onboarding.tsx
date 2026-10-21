// Onboarding in 5 Schritten (Spezifikation, Abschnitt „Ablauf Onboarding“). Alle Felder sind mit
// den Standardwerten vorausgefüllt und werden sofort gespeichert; „Weiter“ genügt.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { PROFIL, STANDARD_PRIORITAETEN } from '../../konfiguration';
import { aendereEinstellungen, beendeOnboarding } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import { zirkelAnteilFuerZiele } from '../../logik/einstellungen';
import { hatUtensil } from '../../logik/equipment';
import { testtagAusfaelle, testtagLasttests, testtagTests } from '../../logik/testtag';
import { MUSKELN, type AppZustand, type Einstellungen } from '../../logik/typen';
import { Auswahl, Hinweis, Karte, Knopf, Laedt, Mehrfachauswahl, Seite, Stepper } from '../../ui/bausteine';
import { LEVEL_NAMEN, MUSTER_NAMEN, ZIEL_NAMEN, equipmentText } from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';
import { EinschraenkungenInhalt } from '../einstellungen/Einschraenkungen';
import { OrteBearbeiten } from '../einstellungen/Orte';
import { PrioritaetenListe } from '../einstellungen/Profil';

export const SCHRITTE = 5;

const optionen = <K extends string>(namen: Record<K, string>) =>
  (Object.keys(namen) as K[]).map((wert) => ({ wert, text: namen[wert] }));

const setze = (teil: Partial<Einstellungen>) => aendereEinstellungen((e) => ({ ...e, ...teil }));

function Schritt({ nr, hinweis }: { nr: number; hinweis?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: SCHRITTE }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < nr ? 'bg-akzent' : 'bg-linie'}`} />
        ))}
      </div>
      <Hinweis>Schritt {nr} von {SCHRITTE}{hinweis ? ` · ${hinweis}` : ''}</Hinweis>
    </div>
  );
}

export function OnboardingSeite() {
  const z = useZustand();
  const nr = Number(useParams().schritt ?? 1);
  useEffect(() => window.scrollTo(0, 0), [nr]);   // jeder Schritt beginnt oben
  if (!Number.isInteger(nr) || nr < 1 || nr > SCHRITTE) return <Navigate to="/onboarding/1" replace />;
  if (!z) return <Laedt />;
  return <Inhalt key={nr} z={z} nr={nr} />;
}

function Inhalt({ z, nr }: { z: AppZustand; nr: number }) {
  const navigate = useNavigate();
  const e = einstellungenAus(z);
  const weiter = () => navigate(`/onboarding/${nr + 1}`);
  const zurueck = nr > 1 ? `/onboarding/${nr - 1}` : undefined;

  if (nr === 1) {
    return (
      <Seite titel="Willkommen">
        <Schritt nr={1} hinweis="Alles lässt sich später in den Einstellungen ändern." />
        <Karte titel="Deine Ziele" hinweis="Mehrfachauswahl.">
          <Mehrfachauswahl
            optionen={optionen(ZIEL_NAMEN)} werte={e.ziele}
            onChange={(ziele) => { if (ziele.length > 0) void setze({ ziele, zirkelAnteil: zirkelAnteilFuerZiele(ziele) }); }}
          />
        </Karte>
        <Karte titel="Trainingslevel">
          <Auswahl optionen={optionen(LEVEL_NAMEN)} wert={e.level} onChange={(level) => void setze({ level })} />
        </Karte>
        <Knopf onClick={weiter}>Weiter</Knopf>
      </Seite>
    );
  }

  if (nr === 2) return <WocheUndDauer e={e} zurueck={zurueck!} weiter={weiter} />;

  if (nr === 3) {
    return (
      <OrteBearbeiten z={z} titel="Dein Ort" zurueck={zurueck} weiter={weiter}
        vorspann={<Schritt nr={3} hinweis="Hake ab, was du hast. Weitere Orte legst du später an." />} />
    );
  }

  if (nr === 4) {
    return (
      <Seite titel="Einschränkungen" zurueck={zurueck}>
        <Schritt nr={4} hinweis="Optional." />
        <EinschraenkungenInhalt e={e} />
        <Hinweis>Lieblingsübungen und Ausschlüsse setzt du jederzeit im Tab Übungen.</Hinweis>
        <Knopf onClick={weiter}>Weiter</Knopf>
      </Seite>
    );
  }

  return <TesttagStart z={z} zurueck={zurueck!} />;
}

function WocheUndDauer({ e, zurueck, weiter }: { e: Einstellungen; zurueck: string; weiter: () => void }) {
  const [prioritaeten, setPrioritaeten] = useState(false);
  const { min, max } = PROFIL.einheitenProWoche;
  const dauer = PROFIL.dauerMin;
  const standard = MUSKELN.every((m) => e.prioritaeten[m] === STANDARD_PRIORITAETEN[m]);
  return (
    <Seite titel="Deine Woche" zurueck={zurueck}>
      <Schritt nr={2} />
      <Karte titel="Übliche Einheiten pro Woche" hinweis="Jede Woche wählst du neu, an welchen Tagen du trainierst.">
        <Auswahl
          spalten={6} wert={e.ueblicheEinheiten} onChange={(n) => void setze({ ueblicheEinheiten: n })}
          optionen={Array.from({ length: max - min + 1 }, (_, i) => ({ wert: min + i, text: String(min + i) }))}
        />
      </Karte>
      <Karte titel="Standard-Trainingsdauer" hinweis="Bauch und Waden kommen zusätzlich dazu.">
        <Stepper label="Dauer" wert={e.standardDauerMin} min={dauer.min} max={dauer.max} schritt={dauer.schritt}
          einheit="Min" onChange={(standardDauerMin) => void setze({ standardDauerMin })} />
      </Karte>
      <Karte titel="Muskelprioritäten"
        hinweis={standard ? 'Oberkörper betont: mehr Sätze für Brust, Rücken, Schultern und Arme.' : 'Angepasst.'}>
        {!prioritaeten && <Knopf art="schlicht" onClick={() => setPrioritaeten(true)}>Anpassen</Knopf>}
      </Karte>
      {prioritaeten && <PrioritaetenListe e={e} />}
      <Knopf onClick={weiter}>Weiter</Knopf>
    </Seite>
  );
}

function TesttagStart({ z, zurueck }: { z: AppZustand; zurueck: string }) {
  const navigate = useNavigate();
  const ort = z.orte.find((o) => o.standard) ?? z.orte[0];
  const jetzt = lokaleZeit();
  const tests = ort ? testtagTests(z, ort.id, jetzt) : [];
  const lasttests = ort ? testtagLasttests(z, ort.id, jetzt) : [];
  const ausfaelle = ort ? testtagAusfaelle(z, ort.id, jetzt) : [];
  const utensilien = [...z.katalog.utensilien, ...z.eigeneUtensilien];
  const ueberspringen = async () => {
    await beendeOnboarding();
    navigate('/', { replace: true });
  };
  return (
    <Seite titel="Testtag" zurueck={zurueck}>
      <Schritt nr={5} />
      <Karte titel="So findet die App deinen Start"
        hinweis="Nach kurzem Aufwärmen machst du jeden Test einmal, so viel wie sauber möglich. Danach steht dein erster Plan.">
        {tests.length + lasttests.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {tests.map((t) => (
              <li key={t.muster} className="text-basis">
                <span className="font-semibold">{t.uebung.name}</span>
                <span className="text-gedaempft"> · {MUSTER_NAMEN[t.muster]}</span>
              </li>
            ))}
            {lasttests.map((u) => (
              <li key={u.id} className="text-basis">
                <span className="font-semibold">{u.name}</span>
                <span className="text-gedaempft"> · Gewichtstest</span>
              </li>
            ))}
          </ul>
        ) : (
          <Hinweis>{ort ? 'An diesem Ort ist kein Test möglich.' : 'Lege zuerst in Schritt 3 deinen Ort an.'}</Hinweis>
        )}
      </Karte>
      {ort && ausfaelle.length > 0 && (
        <Karte titel={ausfaelle.length === 1 ? 'Ein Test entfällt' : `${ausfaelle.length} Tests entfallen`}
          hinweis="Fehlende Tests holt die App später nach, sobald sie an deinem Ort möglich sind.">
          <ul className="flex flex-col gap-2">
            {ausfaelle.map((a) => (
              <li key={a.muster} className="text-basis">
                <span className="font-semibold">{a.uebung.name}</span>
                <span className="text-gedaempft">
                  {' · '}
                  {a.grund === 'gesperrt'
                    ? 'durch eine Einschränkung gesperrt'
                    : `fehlt: ${equipmentText(a.uebung.equipment.filter((g) => !g.some((id) => hatUtensil(ort, id))), utensilien)}`}
                </span>
              </li>
            ))}
          </ul>
          {ausfaelle.some((a) => a.grund === 'ausstattung') && (
            <Knopf art="schlicht" onClick={() => navigate('/onboarding/3')}>Ausstattung ändern</Knopf>
          )}
        </Karte>
      )}
      {tests.length + lasttests.length > 0 && <Knopf onClick={() => navigate('/testtag')}>Testtag starten</Knopf>}
      <Knopf art="sekundaer" onClick={() => void ueberspringen()}>Überspringen</Knopf>
      <Hinweis>Ohne Testtag schätzt die App deinen Start aus dem Level und passt ihn in den ersten zwei Wochen an.</Hinweis>
    </Seite>
  );
}
