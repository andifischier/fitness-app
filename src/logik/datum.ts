// Reine Datumshilfen für ISO-Strings in Gerätezeit (z. B. 2026-10-20T18:30:00). Die aktuelle Zeit
// wird immer übergeben. Gerechnet wird über UTC, damit Zeitumstellungen keine Rolle spielen.

function zuMs(iso: string): number {
  const [datum = '', zeit = '00:00:00'] = iso.split('T');
  const [j = 0, mo = 1, t = 1] = datum.split('-').map(Number);
  const [h = 0, mi = 0, s = 0] = zeit.split(':').map((x) => Number.parseFloat(x));
  return Date.UTC(j, mo - 1, t, h, mi, s);
}

function ausMs(ms: number): string {
  const d = new Date(ms);
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`
    + `T${zwei(d.getUTCHours())}:${zwei(d.getUTCMinutes())}:${zwei(d.getUTCSeconds())}`;
}

export function stundenZwischen(von: string, bis: string): number {
  return (zuMs(bis) - zuMs(von)) / 3_600_000;
}

export function plusTage(iso: string, tage: number): string {
  return ausMs(zuMs(iso) + tage * 86_400_000);
}

// 0 = Montag … 6 = Sonntag
export function wochentag(iso: string): number {
  return (new Date(zuMs(iso)).getUTCDay() + 6) % 7;
}

// Verbleibende Tage der Woche inklusive heute (Montag = 7, Sonntag = 1).
export function verbleibendeTage(iso: string): number {
  return 7 - wochentag(iso);
}

// ISO-Woche, z. B. 2026-W43 (Woche beginnt Montag, Woche 1 enthält den ersten Donnerstag).
export function isoWoche(iso: string): string {
  const donnerstag = new Date(zuMs(plusTage(iso.slice(0, 10), 3 - wochentag(iso))));
  const jahr = donnerstag.getUTCFullYear();
  const nr = Math.floor((donnerstag.getTime() - Date.UTC(jahr, 0, 1)) / (7 * 86_400_000)) + 1;
  return `${jahr}-W${String(nr).padStart(2, '0')}`;
}

export function wochenNummer(wocheId: string): number {
  return Number(wocheId.split('-W')[1]);
}

// Montag 00:00 einer ISO-Woche.
export function wocheStart(wocheId: string): string {
  const [jahr = 0, nr = 1] = wocheId.split('-W').map(Number);
  const vierterJanuar = `${jahr}-01-04T00:00:00`;
  return plusTage(vierterJanuar, (nr - 1) * 7 - wochentag(vierterJanuar));
}

// ISO-Woche, um eine Zahl von Wochen verschoben.
export function wocheVerschoben(wocheId: string, wochen: number): string {
  return isoWoche(plusTage(wocheStart(wocheId), 7 * wochen));
}
