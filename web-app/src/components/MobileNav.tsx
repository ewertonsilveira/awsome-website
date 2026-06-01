import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { type NavItem } from '~/data/nav';

type MobileNavProps = {
  navItems: NavItem[];
  open: boolean;
  onToggle: () => void;
};

const MENU_ID = 'mobile-nav-menu';

export function MobileNav({ navItems, open, onToggle }: MobileNavProps) {
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  // containerRef wraps the entire toggle + dropdown region for focus and
  // pointer containment checks.
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Esc closes the menu and returns focus to the toggle button (AC-10).
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onToggle();
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onToggle]);

  // Move focus into the first menu link when the menu opens (AC-10).
  React.useEffect(() => {
    if (open && menuRef.current) {
      const firstLink = menuRef.current.querySelector<HTMLElement>('a');
      firstLink?.focus();
    }
  }, [open]);

  // Critical 2 — deliberate disclosure: close the menu when focus leaves the
  // nav region (Tab past the last link → menu closes, focus continues naturally).
  function handleFocusOut(e: React.FocusEvent<HTMLDivElement>) {
    if (!open) return;
    // relatedTarget is the element receiving focus; null means focus left
    // the document entirely. Either way it's outside our region.
    const relatedTarget = e.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      containerRef.current?.contains(relatedTarget)
    ) {
      return; // focus stayed inside — do nothing
    }
    onToggle();
  }

  // Important — outside pointer dismissal: close the menu on a pointerdown
  // anywhere outside the nav region. This covers mouse and touch.
  React.useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        e.target instanceof Node &&
        containerRef.current?.contains(e.target)
      ) {
        return; // inside the region — ignore
      }
      onToggle();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onToggle]);

  return (
    <div ref={containerRef} className="md:hidden" onBlur={handleFocusOut}>
      {/* Hamburger toggle */}
      <button
        ref={toggleRef}
        type="button"
        aria-controls={MENU_ID}
        aria-expanded={open}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={onToggle}
        className="rounded-md p-2 text-gray-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {open ? (
          /* X icon */
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        ) : (
          /* Hamburger icon */
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {/* Dropdown menu — rendered in DOM always so aria-controls target exists;
          visibility controlled via Tailwind classes so the DOM node is stable. */}
      <ul
        id={MENU_ID}
        ref={menuRef}
        role="list"
        className={[
          'absolute left-0 right-0 top-full z-50 border-t border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900',
          open ? 'block' : 'hidden',
        ].join(' ')}
      >
        {navItems.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeProps={{
                className: 'font-semibold text-brand-700 dark:text-brand-300',
              }}
              activeOptions={item.to === '/' ? { exact: true } : undefined}
              onClick={onToggle}
              className="block px-4 py-3 text-base text-gray-700 hover:bg-brand-50 hover:text-brand-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-brand-300"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
