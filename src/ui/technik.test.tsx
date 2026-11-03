import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { einstellungenVon } from '../logik/verlauf';
import { zustand } from '../logik/testhilfe';
import { Technik } from './technik';

describe('Video bei „So geht\'s“ (Entscheidung 03.11.2026)', () => {
  const z = zustand({ katalog: 'voll' });
  const e = einstellungenVon(z);
  const pushups = z.katalog.uebungen.find((u) => u.id === 'liegestuetz')!;

  it('läuft mit autoVideo sofort, stumm und in Schleife', () => {
    const html = renderToStaticMarkup(<Technik e={e} u={pushups} autoVideo />);
    expect(html).toContain(`embed/${pushups.videoId}?rel=0&amp;autoplay=1&amp;mute=1&amp;playsinline=1&amp;loop=1&amp;playlist=${pushups.videoId}`);
  });

  it('ohne autoVideo erst auf Tipp', () => {
    expect(renderToStaticMarkup(<Technik e={e} u={pushups} />)).not.toContain('<iframe');
  });

  it('ohne festes Video kein Fenster, nur der Link', () => {
    const { videoId: _, ...ohne } = pushups;
    expect(renderToStaticMarkup(<Technik e={e} u={ohne} autoVideo />)).not.toContain('<iframe');
  });
});
