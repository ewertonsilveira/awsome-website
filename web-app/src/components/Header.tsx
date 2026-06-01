import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { type NavItem } from '~/data/nav';
import { BUSINESS } from '~/data/business';
import { MobileNav } from '~/components/MobileNav';

type HeaderProps = {
  navItems: NavItem[];
};

export function Header({ navItems }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleToggle = React.useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  // Critical 1 — breakpoint/state desync: when the viewport crosses the md
  // breakpoint (≥768 px) the mobile toggle becomes hidden, so any stale open
  // state must be cleared. matchMedia is browser-only — safe inside useEffect
  // because effects don't run during static prerender.
  React.useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setMobileOpen(false);
    }
    mql.addEventListener('change', handleChange);
    // Also close immediately if the component mounts already at md+ width.
    if (mql.matches) setMobileOpen(false);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return (
    <header className="relative border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Business name / logo */}
        <Link
          to="/"
          className="text-lg font-bold text-brand-700 hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
        >
          {BUSINESS.name}
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul role="list" className="flex items-center gap-6">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeProps={{
                    className:
                      'font-semibold text-brand-700 dark:text-brand-300',
                  }}
                  activeOptions={item.to === '/' ? { exact: true } : undefined}
                  className="text-sm text-gray-600 hover:text-brand-700 dark:text-gray-300 dark:hover:text-brand-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile nav — toggle + dropdown */}
        <MobileNav
          navItems={navItems}
          open={mobileOpen}
          onToggle={handleToggle}
        />
      </div>
    </header>
  );
}
