'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  'aria-label'?: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  dir?: 'ltr' | 'rtl';
  className?: string;
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  dir,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps) {
  return (
    <div
      dir={dir}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-utu-input bg-utu-bg-muted border border-utu-border-default p-1 gap-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option['aria-label']}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.value)}
            className={cn(
              'rounded-[6px] font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-utu-blue focus-visible:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              sizeClasses[size],
              isActive
                ? 'bg-utu-navy text-white shadow-sm'
                : 'text-utu-text-secondary hover:text-utu-text-primary hover:bg-utu-bg-card',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
