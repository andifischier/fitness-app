import { NavLink, Outlet } from 'react-router';
import { Icon } from './Icon';
import { TABS } from './tabs';

// App-Rahmen mit Inhalt und Tab-Leiste unten.
export function Rahmen() {
  return (
    <div className="min-h-dvh pb-[calc(76px+env(safe-area-inset-bottom))]">
      <Outlet />
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 border-t border-rand bg-flaeche pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-xl">
          {TABS.map((tab) => (
            <li key={tab.pfad} className="flex-1">
              <NavLink
                to={tab.pfad}
                end={tab.pfad === '/'}
                className={({ isActive }) =>
                  `flex min-h-touch flex-col items-center gap-1 py-2 text-hinweis font-semibold ${
                    isActive ? 'text-akzent' : 'text-gedaempft'
                  }`
                }
              >
                <Icon name={tab.icon} />
                {tab.titel}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
