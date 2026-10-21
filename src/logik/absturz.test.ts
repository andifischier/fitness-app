import { describe, expect, it } from 'vitest';
import { ABSTURZ } from '../konfiguration';
import { absturzReaktion } from './absturz';

const T = 1_000_000;

describe('absturzReaktion', () => {
  it('baut beim ersten Absturz still neu auf', () => {
    expect(absturzReaktion(T, '#/onboarding/2', undefined)).toBe('neuAufbauen');
  });
  it('steigert sich auf demselben Bildschirm: neu laden, dann Hinweis', () => {
    expect(absturzReaktion(T, '#/a', { ms: T - 100, seite: '#/a', reaktion: 'neuAufbauen' })).toBe('neuLaden');
    expect(absturzReaktion(T, '#/a', { ms: T - 100, seite: '#/a', reaktion: 'neuLaden' })).toBe('hinweis');
  });
  it('beginnt beim nächsten Seitenwechsel wieder bei der ersten Stufe', () => {
    expect(absturzReaktion(T, '#/onboarding/3', { ms: T - 100, seite: '#/onboarding/2', reaktion: 'neuLaden' })).toBe('neuAufbauen');
  });
  it('beginnt nach Ablauf der Sperre wieder bei der ersten Stufe', () => {
    expect(absturzReaktion(T, '#/a', { ms: T - ABSTURZ.sperreMs, seite: '#/a', reaktion: 'neuLaden' })).toBe('neuAufbauen');
  });
  it('beginnt neu, wenn die Uhr zurückgestellt wurde', () => {
    expect(absturzReaktion(T, '#/a', { ms: T + 100, seite: '#/a', reaktion: 'neuLaden' })).toBe('neuAufbauen');
  });
});
