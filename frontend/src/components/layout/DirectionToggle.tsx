'use client';

import * as React from 'react';
import { useDirection } from './RTLProvider';
import { cn } from '@/lib/utils';

export interface DirectionToggleProps {
  className?: string;
  /** Show full label ('English / العربية') or just flag icons */
  compact?: boolean;
}

/**
 * DirectionToggle — switches the app between LTR (English) and RTL (Arabic).
 * Reads and writes from RTLProvider via useDirection().
 */
export function DirectionToggle({ className, compact = false }: DirectionToggleProps) {
  const { dir, setDir } = useDirection();
  const isRtl = dir === 'rtl';

  const handleToggle = () => setDir(isRtl ? 'ltr' : 'rtl');

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isRtl ? 'Switch to English (LTR)' : 'التبديل إلى العربية (RTL)'}
      className={cn(
        'inline-flex items-center gap-2 rounded-utu-input border border-utu-border-default',
        'bg-utu-bg-card px-3 py-1.5 text-sm font-medium text-utu-text-secondary',
        'hover:border-utu-blue hover:text-utu-blue transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-utu-blue',
        className,
      )}
    >
      {compact ? (
        <span aria-hidden="true">{isRtl ? 'EN' : 'ع'}</span>
      ) : (
        <>
          <span className={cn('transition-opacity', isRtl ? 'opacity-50' : 'opacity-100')}>English</span>
          <span className="text-utu-text-muted" aria-hidden="true">/</span>
          <span className={cn('font-arabic transition-opacity', isRtl ? 'opacity-100' : 'opacity-50')}>العربية</span>
        </>
      )}
    </button>
  );
}
