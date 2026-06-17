import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';

import { storage } from './storage';
import { Palettes, type ColorTokens } from './theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

const MODE_KEY = 'taxilik.themeMode';

interface ThemeContextValue {
  mode: ThemeMode; // user preference
  scheme: Scheme; // resolved scheme actually in use
  colors: ColorTokens;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.get(MODE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    storage.set(MODE_KEY, m);
  };

  const scheme: Scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors: Palettes[scheme], setMode }),
    [mode, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Build themed StyleSheet styles, memoized per scheme.
 * Usage: const s = useThemedStyles((c) => ({ box: { backgroundColor: c.surface } }));
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ColorTokens, scheme: Scheme) => T
): T {
  const { colors, scheme } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors, scheme)), [colors, scheme]);
}
