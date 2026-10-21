// Eine Übung: Angaben, Video, „Dein Verlauf“ (Entscheidung 21.10.2026), eigener Video-Link, Favorit
// und Ausschluss; eigene Übungen bearbeiten oder löschen (nur, solange sie nie trainiert wurden).
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { aendereEinstellungen, loescheEigeneUebung, speichereBewertung, speichereEigeneUebung } from '../../daten/speichern';
import { lokaleZeit } from '../../daten/zeit';
import {
  alleUtensilien, eigenerLinkVon, istVideoLink, mitAusschluss, mitFavorit, mitVideoLink, uebungGenutzt, videoLinkVon,
} from '../../logik/einstellungen';
import { uebungVerlauf } from '../../logik/fortschritt';
import { uebungVon } from '../../logik/verlauf';
import type { AppZustand, Uebung } from '../../logik/typen';
import { Fehler, Hinweis, Karte, Knopf, Laedt, Schalter, Seite, Sternwahl, Textfeld } from '../../ui/bausteine';
import { Technik } from '../../ui/technik';
import { datumText, equipmentText, LASTTYP_NAMEN, lastText, MUSKEL_NAMEN, MUSTER_NAMEN, saetzeMitLast } from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

export function UebungSeite() {
  const z = useZustand();
  const { id = '' } = useParams();
  const [parameter] = useSearchParams();
  if (!z) return <Laedt />;
  const zurueck = `/uebungen${parameter.get('zurueck') ? `?${parameter.get('zurueck')}` : ''}`;
  const u = uebungVon(z, id);
  if (!u) {
    return <Seite titel="Übung" zurueck={zurueck}><Hinweis>Diese Übung gibt es nicht mehr.</Hinweis></Seite>;
  }
  return <UebungAnsicht key={u.id} z={z} u={u} zurueck={zurueck} />;
}

function Angabe({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-linie py-2 last:border-b-0">
      <span className="text-hinweis text-gedaempft">{titel}</span>
      <span className="text-right text-basis">{wert}</span>
    </div>
  );
}

function UebungAnsicht({ z, u, zurueck }: { z: AppZustand; u: Uebung; zurueck: string }) {
  const navigate = useNavigate();
  const e = einstellungenAus(z);
  const eigenerLink = eigenerLinkVon(e, u);
  const [link, setLink] = useState(eigenerLink ?? '');
  const [linkFehler, setLinkFehler] = useState<string>();
  const [linkMeldung, setLinkMeldung] = useState<string>();
  const favorit = e.favoriten.includes(u.id);
  const ausgeschlossen = e.ausgeschlossen.includes(u.id);
  const eigene = u.herkunft === 'eigene';
  const genutzt = uebungGenutzt(z, u.id);
  const muskeln = (liste: Uebung['primaer']) => (liste.length === 0 ? 'keine' : liste.map((m) => MUSKEL_NAMEN[m]).join(', '));

  const speichereLink = async (neu: string | undefined) => {
    if (neu !== undefined && !istVideoLink(neu)) {
      setLinkFehler('Der Video-Link muss mit https:// beginnen.');
      return;
    }
    setLinkFehler(undefined);
    if (eigene) {
      const { eigenerVideoLink: _, ...rest } = u;
      await speichereEigeneUebung(neu ? { ...rest, eigenerVideoLink: neu.trim() } : rest);
    } else {
      await aendereEinstellungen((alt) => mitVideoLink(alt, u.id, neu));
    }
    if (neu === undefined) setLink('');
    setLinkMeldung(neu ? 'Video-Link gespeichert.' : 'Video-Link entfernt.');
  };
  const loeschen = async () => {
    if (!window.confirm(`Übung „${u.name}“ löschen?`)) return;
    if (await loescheEigeneUebung(u.id)) navigate(zurueck, { replace: true });
  };

  return (
    <Seite titel={u.name} zurueck={zurueck}>
      <Karte>
        <Angabe titel="Muster" wert={MUSTER_NAMEN[u.muster]} />
        <Angabe titel="Hauptmuskeln" wert={muskeln(u.primaer)} />
        <Angabe titel="Mitbeteiligt" wert={muskeln(u.sekundaer)} />
        <Angabe titel="Schwierigkeit" wert={`Stufe ${u.stufe} von 10`} />
        <Angabe titel="Equipment" wert={equipmentText(u.equipment, alleUtensilien(z))} />
        <Angabe titel="Belastung" wert={`${LASTTYP_NAMEN[u.lasttyp]}${u.unterstuetzend ? ', Band unterstützt' : ''}`} />
        <Angabe titel="Bereich" wert={`${u.bereich.von} bis ${u.bereich.bis} ${u.bereich.einheit}`} />
        <Angabe titel="Für Zirkel" wert={u.zirkelGeeignet ? 'geeignet' : 'nicht geeignet'} />
        {eigene && <Angabe titel="Herkunft" wert="Eigene Übung" />}
      </Karte>

      <Karte titel="So geht's">
        <Technik key={`${u.id}|${videoLinkVon(e, u)}`} e={e} u={u} offen />
      </Karte>

      <DeinVerlauf z={z} u={u} />

      <Karte titel="Eigenes Video">
        <div className="flex flex-col gap-3">
          <Textfeld typ="url" label="Eigener Video-Link" wert={link} platzhalter="https://…"
            onChange={(t) => { setLink(t); setLinkMeldung(undefined); }} />
          <Hinweis>Ein eigener YouTube-Link wird hier abgespielt. Ohne eigenen Link gilt das Video aus der App, sonst eine YouTube-Suche.</Hinweis>
          {linkFehler && <Fehler meldungen={[linkFehler]} />}
          {linkMeldung && <p role="status" className="text-hinweis font-semibold text-akzent">{linkMeldung}</p>}
          <div className="flex gap-3">
            <Knopf art="sekundaer" deaktiviert={link.trim() === '' || link.trim() === eigenerLink}
              onClick={() => void speichereLink(link)}>Link speichern</Knopf>
            {eigenerLink && <Knopf art="sekundaer" onClick={() => void speichereLink(undefined)}>Link entfernen</Knopf>}
          </div>
        </div>
      </Karte>

      <Karte titel="Bewertung" hinweis="Mehr Sterne: kommt öfter dran. 1 Stern: wird ersetzt, wenn es eine ähnlich schwere Alternative gibt.">
        <Sternwahl label={`Bewertung ${u.name}`} wert={e.bewertungen?.[u.id]}
          onChange={(n) => void speichereBewertung(u.id, n, lokaleZeit())} />
      </Karte>

      <Karte>
        <Schalter titel="Favorit" hinweis="Wird bei der Auswahl bevorzugt." an={favorit}
          onChange={(an) => void aendereEinstellungen((alt) => mitFavorit(alt, u.id, an))} />
        <div className="mt-3">
          <Schalter titel="Ausschließen" hinweis="Wird nie vorgeschlagen." an={ausgeschlossen}
            onChange={(an) => void aendereEinstellungen((alt) => mitAusschluss(alt, u.id, an))} />
        </div>
      </Karte>

      {eigene && (
        <Link to={`/uebungen/${encodeURIComponent(u.id)}/bearbeiten`}
          className="flex min-h-primaer items-center justify-center rounded-karte border border-rand bg-flaeche text-gross font-semibold">
          Bearbeiten
        </Link>
      )}
      <Link to={`/uebungen/neu/${encodeURIComponent(u.id)}`}
        className="flex min-h-touch items-center justify-center text-basis font-semibold text-akzent">
        Als Vorlage für eigene Übung
      </Link>
      {eigene && (genutzt
        ? <Hinweis>Mit dieser Übung hast du schon trainiert, daher bleibt sie im Verlauf. Du kannst sie ausschließen.</Hinweis>
        : <Knopf art="sekundaer" onClick={() => void loeschen()}>Übung löschen</Knopf>)}
    </Seite>
  );
}

// Die letzten Einheiten mit dieser Übung und das nächste Ziel; ohne Training damit nichts.
function DeinVerlauf({ z, u }: { z: AppZustand; u: Uebung }) {
  const { sitzungen, naechstes } = uebungVerlauf(z, u.id);
  if (sitzungen.length === 0) return null;
  const ziel = naechstes && [`Ziel ${naechstes.zielWdh}${u.bereich.einheit === 'Sek.' ? ' Sek.' : ''} im ersten Satz`, lastText(u, naechstes)]
    .filter(Boolean).join(' · ');
  return (
    <Karte titel="Dein Verlauf">
      <ul>
        {sitzungen.map((s, i) => (
          <li key={`${s.datum}-${i}`} className="flex justify-between gap-4 border-b border-linie py-2 last:border-b-0">
            <span className="shrink-0 text-hinweis text-gedaempft">{datumText(s.datum)}</span>
            <span className="text-right text-basis">{saetzeMitLast(u, s.saetze)}</span>
          </li>
        ))}
      </ul>
      {ziel && <p className="mt-3 text-basis font-semibold">Nächstes Mal: {ziel}</p>}
    </Karte>
  );
}
