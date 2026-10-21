// Absturz eines Bildschirms: Die App lädt selbst neu, außer sie hat das gerade erst getan.
import { ABSTURZ } from '../konfiguration';

export function neuLadenErlaubt(jetztMs: number, letztesNeuladenMs: number | undefined): boolean {
  return letztesNeuladenMs === undefined || jetztMs - letztesNeuladenMs >= ABSTURZ.sperreMs
    || jetztMs < letztesNeuladenMs;  // Uhr zurückgestellt
}
