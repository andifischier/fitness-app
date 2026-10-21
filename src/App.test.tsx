import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App';

function rendere(pfad: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pfad]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App-Rahmen', () => {
  it('zeigt die 4 Tabs in der richtigen Reihenfolge', () => {
    const html = rendere('/');
    const tabs = [...html.matchAll(/<a [^>]*>.*?<\/svg>([^<]+)<\/a>/g)].map((m) => m[1]);
    expect(tabs).toEqual(['Heute', 'Fortschritt', 'Übungen', 'Einstellungen']);
  });

  it.each([
    ['/', 'Heute'],
    ['/fortschritt', 'Fortschritt'],
  ])('zeigt unter %s die Seite %s mit aktivem Tab', (pfad, titel) => {
    const html = rendere(pfad);
    expect(html).toContain(`<h1 class="text-titel font-extrabold">${titel}</h1>`);
    expect(html).toMatch(new RegExp(`aria-current="page"[^>]*>.*?</svg>${titel}</a>`));
  });

  // Fortschritt, Übungen und Einstellungen laden ihre Daten erst im Browser; der Tab ist sofort aktiv.
  it.each([
    ['/fortschritt/verlauf', 'Fortschritt'],
    ['/fortschritt/einheit/x', 'Fortschritt'],
    ['/uebungen', 'Übungen'],
    ['/uebungen/neu', 'Übungen'],
    ['/einstellungen', 'Einstellungen'],
    ['/einstellungen/orte', 'Einstellungen'],
    ['/einstellungen/backup', 'Einstellungen'],
  ])('markiert unter %s den Tab %s', (pfad, titel) => {
    const html = rendere(pfad);
    const aktiv = [...html.matchAll(/aria-current="page"[^>]*>.*?<\/svg>([^<]+)<\/a>/g)].map((m) => m[1]);
    expect(aktiv).toEqual([titel]);
  });

  // Onboarding, Testtag und Training (ab Vor dem Start) laufen als Vollbild ohne Tab-Leiste.
  it.each(['/onboarding/1', '/testtag', '/start', '/vorschau/x', '/training/x', '/mobility'])('zeigt unter %s keine Tab-Leiste', (pfad) => {
    expect(rendere(pfad)).not.toContain('Hauptnavigation');
  });
});
