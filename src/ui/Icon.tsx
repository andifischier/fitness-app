import type { TabIcon } from './tabs';

// Schlichte Linien-Icons (Inline-SVG), Strichfarbe folgt der Textfarbe.
const PFADE: Record<TabIcon, string> = {
  heute: 'M4 10.5 12 4l8 6.5V20H4z M9.5 20v-5.5h5V20',
  fortschritt: 'M4 4v16h16 M7.5 15l4-4.5 3 3L20 7',
  uebungen: 'M6 3.5h12v17H6z M9 8h6 M9 12h6 M9 16h4',
  einstellungen:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
};

export function Icon({ name }: { name: TabIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
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
