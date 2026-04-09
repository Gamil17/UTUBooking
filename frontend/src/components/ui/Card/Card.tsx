import * as React from 'react';
import { cn } from '@/lib/utils';

// ── Card.Root ────────────────────────────────────────────────────────────────

export interface CardRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove the default border and shadow */
  flat?: boolean;
}

function CardRoot({ flat = false, className, children, ...props }: CardRootProps) {
  return (
    <div
      className={cn(
        'bg-utu-bg-card rounded-utu-card overflow-hidden',
        !flat && 'border border-utu-border-default shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Card.Header ──────────────────────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional gradient or solid color class, e.g. 'bg-utu-navy' */
  colorClass?: string;
}

function CardHeader({ colorClass, className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-utu-md py-utu-sm border-b border-utu-border-default',
        colorClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Card.Body ────────────────────────────────────────────────────────────────

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('p-utu-md', className)} {...props}>
      {children}
    </div>
  );
}

// ── Card.Footer ──────────────────────────────────────────────────────────────

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'px-utu-md py-utu-sm border-t border-utu-border-default bg-utu-bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Composed export ──────────────────────────────────────────────────────────

export const Card = Object.assign(CardRoot, {
  Root:   CardRoot,
  Header: CardHeader,
  Body:   CardBody,
  Footer: CardFooter,
});
