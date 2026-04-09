'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  dir?: 'ltr' | 'rtl';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      dir,
      id,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;

    return (
      <div dir={dir} className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-utu-text-primary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="absolute start-3 flex items-center text-utu-text-muted pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId ?? helperId}
            className={cn(
              'w-full rounded-utu-input border bg-utu-bg-card px-3 py-2.5 text-sm text-utu-text-primary',
              'placeholder:text-utu-text-muted',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-utu-blue focus-visible:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-utu-error-border bg-utu-error-bg focus-visible:ring-utu-error-text'
                : 'border-utu-border-strong hover:border-utu-blue',
              leftIcon && 'ps-9',
              rightIcon && 'pe-9',
              className,
            )}
            {...props}
          />

          {rightIcon && (
            <span
              className="absolute end-3 flex items-center text-utu-text-muted pointer-events-none"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs text-utu-error-text" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-utu-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
