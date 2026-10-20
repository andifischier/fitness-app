// Screen Übungen: Suche, Filter nach Muster und Ort, Favorit, eigene Übung anlegen.
// Der Filter steht in der Adresse, damit er nach dem Öffnen einer Übung erhalten bleibt.
import { Link, useSearchParams } from 'react-router';
import { aendereEinstellungen } from '../../daten/speichern';
import { alleUtensilien, mitFavorit } from '../../logik/einstellungen';
import { alleUebungen, uebungMoeglich } from '../../logik/equipment';
import { MUSTER_IDS, type AppZustand, type Uebung } from '../../logik/typen';
import { Hinweis, Laedt, Seite } from '../../ui/bausteine';
import { Icon } from '../../ui/Icon';
import { equipmentText, MUSTER_NAMEN } from '../../ui/texte';
import { einstellungenAus, useZustand } from '../../ui/useZustand';

const auswahlStil = 'min-h-touch w-full rounded-xl border border-rand bg-flaeche px-3 text-basis';

export function suche(liste: Uebung[], text: string): Uebung[] {
  const t = text.trim().toLowerCase();
  return t === '' ? liste : liste.filter((u) => u.name.toLowerCase().includes(t));
}

// Übungen je Muster in der Reihenfolge der Muster, innerhalb nach Stufe (Katalogreihenfolge bei Gleichstand).
export function nachMuster(liste: Uebung[]): [Uebung['muster'], Uebung[]][] {
  return MUSTER_IDS
    .map((m) => [m, liste.filter((u) => u.muster === m).sort((a, b) => a.stufe - b.stufe)] as [Uebung['muster'], Uebung[]])
    .filter(([, l]) => l.length > 0);
}

export function UebungenSeite() {
  const z = useZustand();
  const [parameter, setParameter] = useSearchParams();
  if (!z) return <Laedt />;
  const text = parameter.get('suche') ?? '';
  const muster = parameter.get('muster') ?? '';
  const ortId = parameter.get('ort') ?? '';
  const setze = (schluessel: string, wert: string) => {
    const neu = new URLSearchParams(parameter);
    if (wert) neu.set(schluessel, wert);
    else neu.delete(schluessel);
    setParameter(neu, { replace: true });
  };

  const ort = z.orte.find((o) => o.id === ortId);
  const treffer = suche(alleUebungen(z), text)
    .filter((u) => !muster || u.muster === muster)
    .filter((u) => !ort || uebungMoeglich(ort, u));
  const zurueck = parameter.toString();

  return (
    <Seite titel="Übungen">
      <label className="relative block">
        <span className="sr-only">Übung suchen</span>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gedaempft"><Icon name="suche" groesse={20} /></span>
        <input type="search" value={text} placeholder="Übung suchen" onChange={(e) => setze('suche', e.target.value)}
          className="min-h-touch w-full rounded-xl border border-rand bg-flaeche py-2 pl-10 pr-4 text-gross outline-none focus:border-akzent" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-hinweis text-gedaempft">Muster</span>
          <select className={auswahlStil} value={muster} onChange={(e) => setze('muster', e.target.value)}>
            <option value="">Alle Muster</option>
            {MUSTER_IDS.map((m) => <option key={m} value={m}>{MUSTER_NAMEN[m]}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-hinweis text-gedaempft">Ort</span>
          <select className={auswahlStil} value={ort ? ortId : ''} onChange={(e) => setze('ort', e.target.value)}>
            <option value="">Alle Orte</option>
            {z.orte.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between">
        <Hinweis>{treffer.length === 1 ? '1 Übung' : `${treffer.length} Übungen`}</Hinweis>
        <Link to="/uebungen/neu" className="flex min-h-touch items-center px-2 text-basis font-semibold text-akzent">
          + Eigene Übung
        </Link>
      </div>
      {treffer.length === 0 && <Hinweis>Keine Übung gefunden.</Hinweis>}
      {nachMuster(treffer).map(([m, liste]) => (
        <section key={m}>
          <h2 className="mb-2 text-gross font-bold">{MUSTER_NAMEN[m]}</h2>
          <ul className="rounded-karte border border-rand bg-flaeche px-5">
            {liste.map((u) => <UebungZeile key={u.id} z={z} u={u} zurueck={zurueck} />)}
          </ul>
        </section>
      ))}
    </Seite>
  );
}

function UebungZeile({ z, u, zurueck }: { z: AppZustand; u: Uebung; zurueck: string }) {
  const e = einstellungenAus(z);
  const favorit = e.favoriten.includes(u.id);
  const ausgeschlossen = e.ausgeschlossen.includes(u.id);
  const merkmale = [u.herkunft === 'eigene' && 'Eigene', ausgeschlossen && 'Ausgeschlossen'].filter(Boolean).join(' · ');
  const ziel = `/uebungen/${encodeURIComponent(u.id)}${zurueck ? `?zurueck=${encodeURIComponent(zurueck)}` : ''}`;
  return (
    <li className="flex items-center gap-2 border-b border-linie last:border-b-0">
      <Link to={ziel} className="min-h-[56px] flex-1 py-3">
        <span className={`block text-basis font-semibold ${ausgeschlossen ? 'text-gedaempft line-through' : ''}`}>{u.name}</span>
        <span className="block text-hinweis text-gedaempft">
          {equipmentText(u.equipment, alleUtensilien(z))}{merkmale && ` · ${merkmale}`}
        </span>
      </Link>
      <button type="button" aria-pressed={favorit} aria-label={`${u.name} als Favorit`}
        onClick={() => void aendereEinstellungen((alt) => mitFavorit(alt, u.id, !favorit))}
        className={`flex size-touch shrink-0 items-center justify-center ${favorit ? 'text-akzent' : 'text-gedaempft'}`}>
        <Icon name="stern" groesse={22} gefuellt={favorit} />
      </button>
    </li>
  );
}
