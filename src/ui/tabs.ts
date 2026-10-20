export type TabIcon = 'heute' | 'fortschritt' | 'uebungen' | 'einstellungen';

export interface Tab {
  pfad: string;
  titel: string;
  icon: TabIcon;
}

export const TABS: readonly Tab[] = [
  { pfad: '/', titel: 'Heute', icon: 'heute' },
  { pfad: '/fortschritt', titel: 'Fortschritt', icon: 'fortschritt' },
  { pfad: '/uebungen', titel: 'Übungen', icon: 'uebungen' },
  { pfad: '/einstellungen', titel: 'Einstellungen', icon: 'einstellungen' },
];
