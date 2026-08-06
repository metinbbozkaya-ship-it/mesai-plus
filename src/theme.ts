import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// ═══════════════════════════════════════════════════════════════
// Neon Fintech Theme — Modern SaaS with vibrant neon gradients
// Inspired by Revolut, Linear, Cash App aesthetics
// ═══════════════════════════════════════════════════════════════

export const darkColors = {
  bg: '#0B0B14',           // deep neon black
  bg2: '#12121F',          // slightly elevated
  surface: '#1A1A2E',      // card surface
  surfaceAlt: '#24243D',   // elevated card
  border: 'rgba(139,92,246,0.18)', // subtle violet border
  primary: '#8B5CF6',      // vibrant violet
  accent: '#22D3EE',       // neon cyan
  danger: '#F43F5E',       // hot pink-red
  success: '#22C55E',      // neon green
  text: '#F1F5F9',         // crisp white
  textMuted: '#94A3B8',    // slate muted
  textDim: '#64748B',
  weekday: '#8B5CF6',      // violet weekday
  saturday: '#22D3EE',     // cyan saturday
  sunday: '#F43F5E',       // hot pink sunday
  holiday: '#F59E0B',      // amber holiday
};

export const lightColors = {
  bg: '#F8FAFC',           // crisp light
  bg2: '#F1F5F9',          // slightly darker
  surface: '#FFFFFF',
  surfaceAlt: '#E2E8F0',
  border: 'rgba(139,92,246,0.20)', // violet-tinted border
  primary: '#7C3AED',      // deeper violet
  accent: '#0891B2',       // deeper cyan
  danger: '#E11D48',
  success: '#16A34A',
  text: '#0F172A',         // slate near-black
  textMuted: '#475569',
  textDim: '#94A3B8',
  weekday: '#7C3AED',
  saturday: '#0891B2',
  sunday: '#E11D48',
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

// Module-level active palette (updated by AppContext at runtime)
let _activePalette: PaletteId = 'neon';
export const setActivePalette = (p: PaletteId) => { _activePalette = p; };
export const getActivePalette = (): PaletteId => _activePalette;

function withPalette(base: typeof darkColors, palId: PaletteId): typeof darkColors {
  const pal = PALETTES[palId];
  if (!pal) return base;
  return {
    ...base,
    primary: pal.primary,
    accent: pal.accent,
    weekday: pal.primary,
    saturday: pal.accent,
    border: base.border,
  };
}

export const getColors = (theme: 'dark' | 'light') => {
  const base = theme === 'dark' ? darkColors : lightColors;
  return withPalette(base, _activePalette);
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
