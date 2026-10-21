import { describe, expect, it } from 'vitest';
import { ABSTURZ } from '../konfiguration';
import { neuLadenErlaubt } from './absturz';

describe('neuLadenErlaubt', () => {
  it('lädt beim ersten Absturz neu', () => {
    expect(neuLadenErlaubt(1_000_000, undefined)).toBe(true);
  });
  it('lädt nicht erneut, wenn gerade erst neu geladen wurde', () => {
    expect(neuLadenErlaubt(1_000_000, 1_000_000 - ABSTURZ.sperreMs + 1)).toBe(false);
  });
  it('lädt wieder neu, sobald die Sperre vorbei ist', () => {
    expect(neuLadenErlaubt(1_000_000, 1_000_000 - ABSTURZ.sperreMs)).toBe(true);
  });
  it('lädt neu, wenn die Uhr zurückgestellt wurde', () => {
    expect(neuLadenErlaubt(1_000_000, 2_000_000)).toBe(true);
  });
});
