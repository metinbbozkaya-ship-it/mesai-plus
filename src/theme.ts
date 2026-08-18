import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// ═══════════════════════════════════════════════════════════════
// Mesai+ Corporate Design System — calm, banking-app-inspired
// Controlled blue/navy, high legibility, minimal neon/gradient.
// ═══════════════════════════════════════════════════════════════

export const darkColors = {
  bg: '#0B1220',           // deep navy-gray, never pure black
  bg2: '#0F1729',          // slightly elevated
  surface: '#141B2E',      // card surface
  surfaceAlt: '#1C2540',   // elevated/pressed card
  border: 'rgba(148,163,184,0.16)', // neutral cool-gray border
  primary: '#3B82F6',      // controlled corporate blue
  primaryDark: '#1E3A8A',  // navy — gradient end-tone / pressed state
  accent: '#60A5FA',       // lighter blue, sparing use
  danger: '#EF4444',       // controlled red
  success: '#22C55E',      // calm green
  warning: '#F59E0B',      // amber
  text: '#F1F5F9',         // off-white
  textMuted: '#94A3B8',    // slate muted
  textDim: '#7C8CA2',
  weekday: '#3B82F6',
  saturday: '#60A5FA',
  sunday: '#EF4444',
  holiday: '#F59E0B',
};

export const lightColors = {
  bg: '#F8FAFC',           // very light cool gray
  bg2: '#F1F5F9',          // slightly darker
  surface: '#FFFFFF',
  surfaceAlt: '#E2E8F0',
  border: 'rgba(100,116,139,0.20)', // neutral cool-gray border
  primary: '#1D4ED8',      // corporate dark blue
  primaryDark: '#1E3A8A',  // navy — gradient end-tone / pressed state
  accent: '#2563EB',       // lighter/more-blue tone of primary
  danger: '#DC2626',       // controlled red
  success: '#16A34A',      // calm green
  warning: '#D97706',      // amber
  text: '#0F172A',         // near-black navy
  textMuted: '#475569',
  textDim: '#64748B',
  weekday: '#1D4ED8',
  saturday: '#2563EB',
  sunday: '#DC2626',
  holiday: '#D97706',
};

// ═══════════════════════════════════════════════════════════════
// PREMIUM PALETTES (Pro-gated except 'neon')
// ═══════════════════════════════════════════════════════════════

export type PaletteId = 'neon' | 'sunset' | 'ocean' | 'forest' | 'rose' | 'midnight';

export const PALETTES: Record<PaletteId, { name: string; nameTr: string; primary: string; accent: string; free: boolean; emoji: string }> = {
  neon:     { name: 'Neon Fintech', nameTr: 'Neon Fintech',   primary: '#8B5CF6', accent: '#22D3EE', free: true,  emoji: '💜' },
  sunset:   { name: 'Sunset',       nameTr: 'Gün Batımı',     primary: '#F97316', accent: '#EF4444', free: false, emoji: '🌅' },
  ocean:    { name: 'Ocean',        nameTr: 'Okyanus',         primary: '#0EA5E9', accent: '#14B8A6', free: false, emoji: '🌊' },
  forest:   { name: 'Forest',       nameTr: 'Orman',           primary: '#10B981', accent: '#84CC16', free: false, emoji: '🌲' },
  rose:     { name: 'Rose Gold',    nameTr: 'Gül Kurusu',      primary: '#E11D48', accent: '#F59E0B', free: false, emoji: '🌹' },
  midnight: { name: 'Midnight',     nameTr: 'Gece Yarısı',     primary: '#4F46E5', accent: '#EC4899', free: false, emoji: '🌌' },
};

// Module-level active palette — retained only so AppContext's existing
// load/persist logic (reading a user's previously-saved palette choice) has
// somewhere harmless to write to. It is deliberately no longer read by
// getColors(): the app now always renders the single official Mesai+ design
// system below, regardless of what a user may have picked before this
// selector was removed from the UI. No storage migration/deletion needed.
let _activePalette: PaletteId = 'neon';
export const setActivePalette = (p: PaletteId) => { _activePalette = p; };
export const getActivePalette = (): PaletteId => _activePalette;

export const getColors = (theme: 'dark' | 'light') => {
  return theme === 'dark' ? darkColors : lightColors;
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    secondary: darkColors.accent,
    background: darkColors.bg,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceAlt,
    onSurface: darkColors.text,
    error: darkColors.danger,
  },
};

export const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    secondary: lightColors.accent,
    background: lightColors.bg,
    surface: lightColors.surface,
    surfaceVariant: lightColors.surfaceAlt,
    onSurface: lightColors.text,
    error: lightColors.danger,
  },
};

export const getPaperTheme = (theme: 'dark' | 'light') => theme === 'dark' ? darkPaperTheme : lightPaperTheme;

// Default export for backward compatibility
export const colors = darkColors;
export const paperTheme = darkPaperTheme;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
