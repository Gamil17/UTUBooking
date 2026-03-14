'use client';

import { useLocale } from 'next-intl';
import LocaleSwitcher from './LocaleSwitcher';

interface HeaderProps {
  brand: string;
  navLinks?: Array<{ label: string; href: string }>;
  onLanguageToggle?: () => void;
}

export default function Header({ brand, navLinks, onLanguageToggle }: HeaderProps) {
  const locale = useLocale();

  return (
    <header className="bg-emerald-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-emerald-900 font-black text-xs">U</span>
          </div>
          <span className="font-bold text-base tracking-tight">{brand}</span>
        </div>

        {/* Nav links — hidden on mobile */}
        {navLinks && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-emerald-100">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        {/* Language Switcher — supports all 9 locales */}
        <LocaleSwitcher />
      </div>
    </header>
  );
}
