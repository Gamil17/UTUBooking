'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';

/**
 * Renders <Header> on every route EXCEPT the home page ('/').
 * The home page uses its own <HomeHeader> with scroll-aware tab bar.
 * Placing this in the root layout means Header is never unmounted when
 * navigating between inner pages — no remount, no flicker.
 */
export default function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <Header />;
}
