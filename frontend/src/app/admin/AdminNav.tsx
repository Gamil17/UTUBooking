'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href:  string;
}

interface NavSection {
  heading?: string;
  items:    NavItem[];
}

interface AdminNavProps {
  sections: NavSection[];
}

export function AdminNav({ sections }: AdminNavProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    // Exact match for /admin; prefix match for all sub-routes
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  }

  return (
    <ul className="space-y-1 text-sm">
      {sections.map((section, si) => (
        <li key={si}>
          {section.heading && (
            <p className="pt-3 pb-1 px-3 text-xs font-semibold uppercase tracking-wider text-utu-text-muted">
              {section.heading}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 font-medium transition-colors
                    ${isActive(item.href)
                      ? 'bg-emerald-600 text-white'
                      : 'text-utu-text-secondary hover:bg-utu-bg-muted'}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
