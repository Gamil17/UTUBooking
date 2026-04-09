import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type AvatarColorScheme =
  | 'navy'
  | 'green'
  | 'amber'
  | 'red'
  | 'sky'
  | 'slate'
  | 'icon';

export interface AvatarProps {
  /** Two-character initials displayed when no src image */
  initials?: string;
  /** Image URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  size?: 28 | 36 | 44 | 56;
  colorScheme?: AvatarColorScheme;
  /** Icon element shown instead of initials */
  icon?: React.ReactNode;
  className?: string;
}

const colorSchemeClasses: Record<AvatarColorScheme, string> = {
  navy:  'bg-utu-navy text-white',
  green: 'bg-utu-blue text-white',
  amber: 'bg-amber-400 text-amber-900',
  red:   'bg-red-500 text-white',
  sky:   'bg-sky-500 text-white',
  slate: 'bg-utu-bg-muted text-utu-text-secondary border border-utu-border-default',
  icon:  'bg-utu-blue-pale text-utu-blue',
};

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  28: 'w-7 h-7 text-[11px]',
  36: 'w-9 h-9 text-xs',
  44: 'w-11 h-11 text-sm',
  56: 'w-14 h-14 text-base',
};

export function Avatar({
  initials,
  src,
  alt = '',
  size = 36,
  colorScheme = 'navy',
  icon,
  className,
}: AvatarProps) {
  const px = size;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-utu-pill overflow-hidden font-semibold select-none',
        sizeClasses[size],
        !src && colorSchemeClasses[colorScheme],
        className,
      )}
      aria-label={alt || initials}
    >
      {src ? (
        <Image src={src} alt={alt} width={px} height={px} className="object-cover w-full h-full" />
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : (
        <span aria-hidden="true">{initials?.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}

// ── AvatarGroup ──────────────────────────────────────────────────────────────

export interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 36, className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className={cn('flex items-center', className)} aria-label={`${avatars.length} members`}>
      {visible.map((av, i) => (
        <span key={i} className="-me-2 ring-2 ring-white rounded-utu-pill inline-flex">
          <Avatar {...av} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-utu-pill bg-utu-bg-muted border border-utu-border-default text-utu-text-secondary font-semibold -me-2 ring-2 ring-white',
            sizeClasses[size],
          )}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
