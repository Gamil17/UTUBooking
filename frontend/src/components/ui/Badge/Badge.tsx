import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'info' | 'warning' | 'error' | 'neutral';
  shape?: 'tag' | 'pill';
  /** Show a colored status dot before the text */
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  success: 'bg-utu-success-bg border border-utu-success-border text-utu-success-text',
  info:    'bg-utu-info-bg border border-utu-info-border text-utu-info-text',
  warning: 'bg-utu-warning-bg border border-utu-warning-border text-utu-warning-text',
  error:   'bg-utu-error-bg border border-utu-error-border text-utu-error-text',
  neutral: 'bg-utu-bg-muted border border-utu-border-default text-utu-text-secondary',
};

const dotColorClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  success: 'bg-utu-success-text',
  info:    'bg-utu-info-text',
  warning: 'bg-utu-warning-text',
  error:   'bg-utu-error-text',
  neutral: 'bg-utu-text-muted',
};

const shapeClasses: Record<NonNullable<BadgeProps['shape']>, string> = {
  tag:  'rounded-utu-tag',
  pill: 'rounded-utu-pill',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export function Badge({
  variant = 'neutral',
  shape = 'tag',
  dot = false,
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium leading-none',
        variantClasses[variant],
        shapeClasses[shape],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('shrink-0 rounded-full', dotColorClasses[variant], size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')}
        />
      )}
      {children}
    </span>
  );
}
