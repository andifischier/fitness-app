// Absturz eines Bildschirms: zuerst still neu aufbauen, dann die Seite neu laden, erst dann ein Hinweis.
// Eine höhere Stufe gibt es nur, wenn derselbe Bildschirm kurz nach der letzten Reaktion wieder abstürzt;
// ein Absturz beim nächsten Seitenwechsel beginnt wieder bei der ersten Stufe.
import { ABSTURZ } from '../konfiguration';

export type AbsturzReaktion = 'neuAufbauen' | 'neuLaden' | 'hinweis';
export type LetzteReaktion = { ms: number; seite: string; reaktion: AbsturzReaktion };

const NAECHSTE: Record<AbsturzReaktion, AbsturzReaktion> = {
  neuAufbauen: 'neuLaden', neuLaden: 'hinweis', hinweis: 'hinweis',
};

export function absturzReaktion(jetztMs: number, seite: string, letzte: LetzteReaktion | undefined): AbsturzReaktion {
  const kurzDanach = letzte !== undefined && letzte.seite === seite
    && jetztMs >= letzte.ms && jetztMs - letzte.ms < ABSTURZ.sperreMs;
  return kurzDanach ? NAECHSTE[letzte.reaktion] : 'neuAufbauen';
}
