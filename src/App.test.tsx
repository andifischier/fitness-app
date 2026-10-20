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
    ['/uebungen', 'Übungen'],
    ['/einstellungen', 'Einstellungen'],
  ])('zeigt unter %s die Seite %s mit aktivem Tab', (pfad, titel) => {
    const html = rendere(pfad);
    expect(html).toContain(`<h1 class="text-titel font-extrabold">${titel}</h1>`);
    expect(html).toMatch(new RegExp(`aria-current="page"[^>]*>.*?</svg>${titel}</a>`));
  });
});
