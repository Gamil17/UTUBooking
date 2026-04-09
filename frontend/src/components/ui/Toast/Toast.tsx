'use client';

import * as React from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { X, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  dir?: 'ltr' | 'rtl';
}

// ── Variant config ───────────────────────────────────────────────────────────

const variantConfig: Record<ToastVariant, {
  containerClass: string;
  iconClass: string;
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: 'true' }>;
}> = {
  success: {
    containerClass: 'bg-utu-success-bg border-utu-success-border text-utu-success-text',
    iconClass: 'text-utu-success-text',
    Icon: CheckCircle,
  },
  info: {
    containerClass: 'bg-utu-info-bg border-utu-info-border text-utu-info-text',
    iconClass: 'text-utu-info-text',
    Icon: Info,
  },
  warning: {
    containerClass: 'bg-utu-warning-bg border-utu-warning-border text-utu-warning-text',
    iconClass: 'text-utu-warning-text',
    Icon: AlertTriangle,
  },
  error: {
    containerClass: 'bg-utu-error-bg border-utu-error-border text-utu-error-text',
    iconClass: 'text-utu-error-text',
    Icon: XCircle,
  },
};

// ── Toast ────────────────────────────────────────────────────────────────────

export function Toast({
  open,
  onOpenChange,
  variant = 'info',
  title,
  description,
  duration = 5000,
  dir,
}: ToastProps) {
  const { containerClass, iconClass, Icon } = variantConfig[variant];

  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={duration}
      dir={dir}
      className={cn(
        'flex items-start gap-3 p-4 rounded-utu-card border shadow-md',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4',
        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full',
        'transition-all duration-200 max-w-sm w-full',
        containerClass,
      )}
    >
      <Icon size={18} aria-hidden="true" className={cn('shrink-0 mt-0.5', iconClass)} />

      <div className="flex-1 min-w-0">
        <RadixToast.Title className="text-sm font-semibold leading-tight">
          {title}
        </RadixToast.Title>
        {description && (
          <RadixToast.Description className="mt-1 text-xs opacity-80 leading-relaxed">
            {description}
          </RadixToast.Description>
        )}
      </div>

      <RadixToast.Close
        aria-label="Dismiss notification"
        className={cn(
          'shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
        )}
      >
        <X size={14} aria-hidden="true" />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

// ── ToastProvider + Viewport (wrap your app root once) ───────────────────────

export function ToastProvider({ children, dir }: { children: React.ReactNode; dir?: 'ltr' | 'rtl' }) {
  return (
    <RadixToast.Provider swipeDirection={dir === 'rtl' ? 'left' : 'right'}>
      {children}
      <RadixToast.Viewport
        dir={dir}
        className={cn(
          'fixed bottom-4 z-[100] flex flex-col gap-2 outline-none',
          dir === 'rtl' ? 'start-4' : 'end-4',
        )}
      />
    </RadixToast.Provider>
  );
}

// ── useToast hook ────────────────────────────────────────────────────────────

type ToastState = Omit<ToastProps, 'open' | 'onOpenChange'>;

export function useToast() {
  const [toasts, setToasts] = React.useState<(ToastState & { id: string; open: boolean })[]>([]);

  const toast = React.useCallback((props: ToastState) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...props, id, open: true }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  }, []);

  return { toasts, toast, dismiss };
}
