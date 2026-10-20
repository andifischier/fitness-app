// Datumswerte sind ISO-8601-Strings in Gerätezeit (ohne Zeitzonenangabe), z. B. 2026-10-20T18:30:00.
export function lokaleZeit(datum: Date = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${datum.getFullYear()}-${zwei(datum.getMonth() + 1)}-${zwei(datum.getDate())}`
    + `T${zwei(datum.getHours())}:${zwei(datum.getMinutes())}:${zwei(datum.getSeconds())}`;
}
