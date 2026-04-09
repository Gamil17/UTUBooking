'use client';

import * as React from 'react';

export type Direction = 'ltr' | 'rtl';

interface DirectionContextValue {
  dir: Direction;
  setDir: (dir: Direction) => void;
  isRtl: boolean;
}

const DirectionContext = React.createContext<DirectionContextValue>({
  dir: 'ltr',
  setDir: () => {},
  isRtl: false,
});

export interface RTLProviderProps {
  children: React.ReactNode;
  /** Initial direction — infer from locale if needed */
  defaultDir?: Direction;
}

/**
 * RTLProvider — manages LTR/RTL direction state for the app.
 * Wraps the root layout once. Children access via useDirection().
 *
 * Sets document.dir on the <html> element so Tailwind RTL variants work globally.
 */
export function RTLProvider({ children, defaultDir = 'ltr' }: RTLProviderProps) {
  const [dir, setDirState] = React.useState<Direction>(defaultDir);

  const setDir = React.useCallback((newDir: Direction) => {
    setDirState(newDir);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = newDir;
      // Load IBM Plex Sans Arabic when switching to RTL
      document.documentElement.setAttribute('data-font-arabic', newDir === 'rtl' ? '1' : '0');
    }
  }, []);

  // Sync on mount in case defaultDir differs from what's on the DOM
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = React.useMemo<DirectionContextValue>(
    () => ({ dir, setDir, isRtl: dir === 'rtl' }),
    [dir, setDir],
  );

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}

/**
 * useDirection — consume direction context from RTLProvider.
 * @example
 * const { dir, isRtl, setDir } = useDirection();
 */
export function useDirection(): DirectionContextValue {
  return React.useContext(DirectionContext);
}
