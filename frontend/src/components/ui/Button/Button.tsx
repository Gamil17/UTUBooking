'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  /** Render as child element (e.g. Next.js Link) using Radix Slot */
  asChild?: boolean;
  dir?: 'ltr' | 'rtl';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-utu-navy text-white hover:opacity-90 active:opacity-80 focus-visible:ring-utu-blue',
  secondary:
    'border border-utu-navy text-utu-navy bg-transparent hover:bg-utu-blue-pale active:bg-utu-blue-light focus-visible:ring-utu-blue',
  ghost:
    'text-utu-text-secondary bg-transparent hover:bg-utu-bg-muted active:bg-utu-border-default focus-visible:ring-utu-blue',
  danger:
    'bg-utu-error-text text-white hover:opacity-90 active:opacity-80 focus-visible:ring-utu-error-text',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs rounded-utu-input gap-1.5',
  md: 'h-10 px-4 text-sm rounded-utu-input gap-2',
  lg: 'h-12 px-6 text-base rounded-utu-input gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  asChild = false,
  dir,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const isDisabled = disabled || isLoading;

  return (
    <Comp
      dir={dir}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading && (
        <Loader2
          size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
          className="animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </Comp>
  );
}
