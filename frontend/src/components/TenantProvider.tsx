'use client';

import { useEffect } from 'react';
import TenantContext from '@/contexts/TenantContext';
import { TenantConfig, getLocaleAttrs } from '@/lib/tenant';

interface Props {
  config: TenantConfig;
  children: React.ReactNode;
}

/**
 * Injects tenant CSS variables and html lang/dir at runtime.
 * Must be a Client Component so it can access document.
 * Rendered server-side with the tenant config from RSC layout.tsx.
 */
export default function TenantProvider({ config, children }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    // Guard against redundant DOM writes — SSR already sets lang/dir in layout.tsx
    root.style.setProperty('--brand-primary', config.primaryColor);
    root.style.setProperty('--brand-secondary', config.secondaryColor);

    const { lang, dir } = getLocaleAttrs(config.locale);
    if (root.getAttribute('lang') !== lang) root.setAttribute('lang', lang);
    if (root.getAttribute('dir') !== dir) root.setAttribute('dir', dir);
  }, [config.primaryColor, config.secondaryColor, config.locale]);

  return (
    <TenantContext.Provider value={config}>
      {children}
    </TenantContext.Provider>
  );
}
