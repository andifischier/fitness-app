// Übergänge zwischen Bildschirmen (Entscheidung 29.10.2026). Animiert wird mit der Web Animations API
// ohne Neuaufbau der Seite: Zustand bleibt erhalten, und nach dem Ende bleibt kein `transform` stehen
// (sonst würden Blätter mit `position: fixed` am animierten Element hängen). Bei „Bewegung reduzieren“
// im System und in Browsern ohne `animate` erscheint die Seite einfach sofort.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';
import { UEBERGANG } from '../konfiguration';
import { TABS } from './tabs';

export type Art = 'vor' | 'zurueck' | 'einblenden' | 'blatt';

function bewegungAus(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function bilder(art: Art): Keyframe[] {
  const x = UEBERGANG.versatzPx;
  if (art === 'blatt') return [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }];
  if (art === 'einblenden') return [{ opacity: 0 }, { opacity: 1 }];
  return [{ opacity: 0, transform: `translateX(${art === 'vor' ? x : -x}px)` }, { opacity: 1, transform: 'translateX(0)' }];
}

// Spielt den Übergang, sobald sich `schluessel` ändert (beim ersten Anzeigen nur mit `auchAnfangs`).
export function useUebergang<T extends HTMLElement>(schluessel: string, art: Art, auchAnfangs = false) {
  const ref = useRef<T>(null);
  const erster = useRef(true);
  useLayoutEffect(() => {
    const anfang = erster.current;
    erster.current = false;
    if ((anfang && !auchAnfangs) || !ref.current?.animate || bewegungAus()) return;
    ref.current.animate(bilder(art), {
      duration: art === 'blatt' ? UEBERGANG.blattMs : UEBERGANG.dauerMs, easing: UEBERGANG.kurve,
    });
  }, [schluessel]);
  return ref;
}

export function Uebergang({ schluessel, art, className, children }: {
  schluessel: string; art: Art; className?: string; children: ReactNode;
}) {
  const ref = useUebergang<HTMLDivElement>(schluessel, art);
  return <div ref={ref} className={className}>{children}</div>;
}

const istTab = (pfad: string) => TABS.some((t) => t.pfad === pfad);

// Richtung eines Seitenwechsels: zurück von links (Zurück-Taste des Handys, Zurück-Pfeil mit
// `state.zurueck` oder eine Ebene höher, z. B. /uebungen/x → /uebungen), Tabwechsel blenden ein,
// sonst von rechts.
export function useSeitenArt(): { pfad: string; art: Art } {
  const { pathname, state } = useLocation();
  const typ = useNavigationType();
  const vorher = useRef(pathname);
  const hoch = vorher.current.startsWith(`${pathname}/`) || (state as { zurueck?: boolean } | null)?.zurueck === true;
  const art: Art = typ === 'POP' || hoch ? 'zurueck' : istTab(pathname) && istTab(vorher.current) ? 'einblenden' : 'vor';
  useLayoutEffect(() => { vorher.current = pathname; }, [pathname]);
  return { pfad: pathname, art };
}

// Layout-Route für Seiten ohne Tab-Leiste.
export function SeitenUebergang() {
  const { pfad, art } = useSeitenArt();
  return <Uebergang schluessel={pfad} art={art}><Outlet /></Uebergang>;
}
