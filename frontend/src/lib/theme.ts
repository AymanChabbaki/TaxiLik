/**
 * TaxiLik.ma design tokens. Brand red comes from the logo (taxi + pin mark).
 * Colors are themeable (light/dark); spacing, radius, and type are shared.
 */

import { Platform } from 'react-native';

// Brand red is constant across themes (it's the logo identity).
const RED = '#E8412A';
const RED_DARK = '#C9341F';

export const lightColors = {
  primary: RED,
  primaryDark: RED_DARK,
  primaryContainer: '#FFF1EE',
  primaryBorder: '#FFD9D1',
  onPrimary: '#FFFFFF',

  text: '#16191F',
  textSecondary: '#5B6472',
  textMuted: '#9AA1AC',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F5F8',
  surfaceContainer: '#EAEEF4',
  border: '#E6E8EC',

  // Map placeholder gradient (light)
  mapTop: '#E9EEF6',
  mapBottom: '#DCE3EF',
  mapStreet: '#FFFFFF',

  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  errorContainer: '#FEE2E2',

  online: '#22C55E',
  offline: '#9CA3AF',

  scrim: 'rgba(15,17,21,0.45)',
} as const;

export type ColorTokens = { -readonly [K in keyof typeof lightColors]: string };

export const darkColors: ColorTokens = {
  primary: RED,
  primaryDark: RED_DARK,
  primaryContainer: '#2A1714',
  primaryBorder: '#5A2A22',
  onPrimary: '#FFFFFF',

  text: '#F2F4F7',
  textSecondary: '#A8B0BD',
  textMuted: '#6B7280',

  background: '#0F1115',
  surface: '#171A21',
  surfaceAlt: '#1F232B',
  surfaceContainer: '#262B34',
  border: '#2A2F39',

  mapTop: '#1A1E26',
  mapBottom: '#11141A',
  mapStreet: '#2A2F39',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  errorContainer: '#3A1A1A',

  online: '#22C55E',
  offline: '#6B7280',

  scrim: 'rgba(0,0,0,0.6)',
};

export const Palettes = { light: lightColors, dark: darkColors };

/** 4px baseline grid. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  margin: 20,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Type = {
  display: { fontSize: 40, fontWeight: '800', lineHeight: 46, letterSpacing: -1 },
  headlineXl: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.6 },
  headlineLg: { fontSize: 26, fontWeight: '700', lineHeight: 33, letterSpacing: -0.4 },
  headlineMd: { fontSize: 20, fontWeight: '700', lineHeight: 27 },
  bodyLg: { fontSize: 18, fontWeight: '400', lineHeight: 27 },
  bodyMd: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  labelLg: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  labelMd: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  labelSm: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.2 },
} as const;

// Elevation — boxShadow on web, shadow*/elevation on native. Tuned per scheme.
export function shadow(scheme: 'light' | 'dark', level: 'card' | 'sheet' = 'card') {
  if (scheme === 'dark') {
    // Shadows are nearly invisible on dark; rely on borders + subtle glow.
    return Platform.select({
      web: { boxShadow: level === 'sheet' ? '0px -8px 24px rgba(0,0,0,0.5)' : '0px 2px 10px rgba(0,0,0,0.4)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: level === 'sheet' ? -4 : 2 },
        shadowOpacity: 0.5,
        shadowRadius: level === 'sheet' ? 16 : 8,
        elevation: level === 'sheet' ? 12 : 4,
      },
    }) as object;
  }
  return Platform.select({
    web: { boxShadow: level === 'sheet' ? '0px -6px 24px rgba(16,24,40,0.1)' : '0px 4px 16px rgba(16,24,40,0.08)' },
    default: {
      shadowColor: '#101828',
      shadowOffset: { width: 0, height: level === 'sheet' ? -4 : 4 },
      shadowOpacity: level === 'sheet' ? 0.1 : 0.08,
      shadowRadius: level === 'sheet' ? 16 : 12,
      elevation: level === 'sheet' ? 12 : 4,
    },
  }) as object;
}
