// Schlichte Linien-Icons (Inline-SVG), Strichfarbe folgt der Textfarbe.
const PFADE = {
  heute: 'M4 10.5 12 4l8 6.5V20H4z M9.5 20v-5.5h5V20',
  fortschritt: 'M4 4v16h16 M7.5 15l4-4.5 3 3L20 7',
  uebungen: 'M6 3.5h12v17H6z M9 8h6 M9 12h6 M9 16h4',
  einstellungen:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
  zurueck: 'M15 5l-7 7 7 7',
  weiter: 'M9 5l7 7-7 7',
  hoch: 'M6 15l6-6 6 6',
  runter: 'M6 9l6 6 6-6',
  pfeil: 'M4 12h15 M13 6l6 6-6 6',
  haken: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14 M5 12h14',
  kreuz: 'M6 6l12 12 M18 6L6 18',
  stern: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z',
  suche: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5 20 20',
  video: 'M4 6.5h11v11H4z M15 10.5l5-3v9l-5-3',
  tauschen: 'M5 8h14 M15.5 4.5 19 8l-3.5 3.5 M19 16H5 M8.5 12.5 5 16l3.5 3.5',
  flamme: 'M12 3c.8 3.2 5 5.3 5 10a5 5 0 0 1-10 0c0-2.4 1.3-4 2.5-5 .3 1.6 1 2.6 2.3 3-.4-2.8-.4-5.3.2-8z',
} as const;

export type IconName = keyof typeof PFADE;

export function Icon({ name, groesse = 26, gefuellt = false }: { name: IconName; groesse?: number; gefuellt?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={groesse}
      height={groesse}
      fill={gefuellt ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PFADE[name]} />
    </svg>
  );
}
