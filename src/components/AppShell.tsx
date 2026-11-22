'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Onboarding', href: '/onboarding' },
  { label: 'Customers', href: '/customers' },
  { label: 'Invoices', href: '/invoices' },
  { label: 'Generate Invoices', href: '/generate-invoices' },
  { label: 'Payments', href: '/payments' },
  { label: 'Quick Log', href: '/quick-log' },
  { label: 'Reminders', href: '/reminders' },
  { label: 'Cash Forecast', href: '/cash-forecast' },
  { label: 'What-If Scenarios', href: '/what-if' },
  { label: 'Alerts', href: '/alerts' },
  { label: 'Bad-Day Mode', href: '/bad-day' },
  { label: 'Bills', href: '/bills' },
  { label: 'Settings', href: '/settings' },
];

const PERSONA = 'Home Tutor';
const PRODUCT = 'TutorDesk';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <div className="ui-root ui-shell flex min-h-screen w-full flex-col overflow-x-hidden bg-[var(--ui-bg)] text-[var(--ui-text)] sm:flex-row">
      <aside className="ui-sidebar flex w-full shrink-0 flex-col border-b border-[var(--ui-border)] bg-[var(--ui-surface)] sm:w-60 sm:border-b-0 sm:border-r">
        <div className="ui-brand flex min-w-0 items-center justify-between gap-2 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/nexen-logo.svg" alt="" className="h-7 w-7 shrink-0" />
            <span className="truncate font-bold text-[var(--ui-text)]">{PRODUCT}</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="ui-nav"
            className="rounded-[var(--ui-radius)] border border-[var(--ui-border)] px-3 py-1.5 text-sm font-medium text-[var(--ui-text)] sm:hidden"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>

        <nav
          id="ui-nav"
          aria-label="Main navigation"
          className={`ui-nav ${menuOpen ? 'block' : 'hidden'} max-h-[70vh] overflow-y-auto px-2 pb-3 sm:block sm:max-h-none sm:flex-1 sm:pb-4`}
        >
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li data-nexen-component="nx_components_AppShell" key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`block min-w-0 truncate rounded-[var(--ui-radius)] px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[var(--ui-surface-2)] font-semibold text-[var(--ui-text)] shadow-[inset_3px_0_0_var(--ui-primary)]'
                        : 'font-medium text-[var(--ui-muted)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="ui-topbar flex min-w-0 items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-3 sm:px-6">
          <div className="ui-user flex min-w-0 items-center gap-2 text-sm text-[var(--ui-muted)]">
            <span className="truncate font-medium text-[var(--ui-text)]">{PERSONA}</span>
            {current ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{current.label}</span>
              </>
            ) : null}
          </div>
        </header>

        <main className="ui-content min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}