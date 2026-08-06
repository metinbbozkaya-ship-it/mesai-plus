import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadEntries,
  loadSettings,
  saveSettings as persistSettings,
  upsertEntry as persistUpsert,
  deleteEntry as persistDelete,
  loadLanguage,
  saveLanguage,
  loadTheme,
  saveTheme,
  clearAllData,
  backupUserData,
  WorkEntry,
  UserSettings,
} from '../storage/db';
import { Language } from '../utils/i18n';
import { syncMesaiWidget } from '../widgets/widgetSync';
import { setActivePalette, PaletteId, PALETTES } from '../theme';
import type { Workplace } from '../storage/db';

const PALETTE_KEY = 'mesai.palette.v1';

interface AppContextValue {
  ready: boolean;
  entries: Record<string, WorkEntry>;
  settings: UserSettings;
  language: Language;
  theme: 'dark' | 'light';
  palette: PaletteId;
  setPalette: (p: PaletteId) => Promise<void>;
  workplaces: Workplace[];
  activeWorkplaceId: string; // '' = all
  setActiveWorkplaceId: (id: string) => Promise<void>;
  addWorkplace: (w: Omit<Workplace, 'id' | 'createdAt'>) => Promise<Workplace | null>;
  updateWorkplace: (id: string, patch: Partial<Workplace>) => Promise<void>;
  deleteWorkplace: (id: string) => Promise<void>;
  allEntries: Record<string, WorkEntry>; // unfiltered
  upsertEntry: (date: string, hours: number, isAbsence: boolean, customMultiplier?: number) => Promise<WorkEntry | null>;
  deleteEntry: (date: string) => Promise<void>;
  updateSettings: (s: UserSettings) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<void>;
  refresh: () => Promise<void>;
  resetAll: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Record<string, WorkEntry>>({});
  const [settings, setSettings] = useState<UserSettings>({
    firstName: '',
    lastName: '',
    monthlySalaries: {
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
    },
    email: '',
    updatedAt: '',
    notificationsEnabled: true,
    notificationTime: '09:00',
  });
  const [language, setLanguageState] = useState<Language>('tr');
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<'dark' | 'light'>(systemScheme === 'light' ? 'light' : 'dark');
  const [themeOverridden, setThemeOverridden] = useState(false);
  const [palette, setPaletteStateVal] = useState<PaletteId>('neon');

  const setPalette = useCallback(async (p: PaletteId) => {
    if (!PALETTES[p]) return;
    setActivePalette(p);
    setPaletteStateVal(p);
    try { await AsyncStorage.setItem(PALETTE_KEY, p); } catch {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [e, s, lang, thm] = await Promise.all([loadEntries(), loadSettings(), loadLanguage(), loadTheme()]);
      setEntries(e ?? {});
      const defaultMonthly = {
        january: 0,
        february: 0,
        march: 0,
        april: 0,
        may: 0,
        june: 0,
        july: 0,
        august: 0,
        september: 0,
        october: 0,
        november: 0,
        december: 0,
      };
      const base: UserSettings = {
        firstName: '',
        lastName: '',
        monthlySalaries: defaultMonthly,
        email: '',
        updatedAt: '',
        notificationsEnabled: true,
        notificationTime: '09:00',
      };
      const merged: UserSettings = { ...base, ...(s ?? {}) };
      if (!merged.monthlySalaries) merged.monthlySalaries = defaultMonthly;
      setSettings(merged);
      setLanguageState(lang);
      try {
        const pal = await AsyncStorage.getItem(PALETTE_KEY);
        if (pal && PALETTES[pal as PaletteId]) {
          setActivePalette(pal as PaletteId);
          setPaletteStateVal(pal as PaletteId);
        }
      } catch {}
      if (thm === 'dark' || thm === 'light') {
        setThemeState(thm);
        setThemeOverridden(true);
      } else if (thm === 'system') {
        setThemeState(systemScheme === 'light' ? 'light' : 'dark');
        setThemeOverridden(false);
      } else {
        setThemeState(systemScheme === 'light' ? 'light' : 'dark');
        setThemeOverridden(false);
      }
    } catch (err) {
      console.warn('[AppContext] refresh failed', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  useEffect(() => {
    if (!themeOverridden && systemScheme) {
      setThemeState(systemScheme === 'light' ? 'light' : 'dark');
    }
  }, [systemScheme, themeOverridden]);

  useEffect(() => {
    if (!ready) return;
    syncMesaiWidget(entries, settings).catch(() => {});
  }, [ready, entries, settings]);

  const workplaces = useMemo<Workplace[]>(() => settings.workplaces ?? [], [settings.workplaces]);
  const activeWorkplaceId = settings.activeWorkplaceId ?? '';

  const filteredEntries = useMemo<Record<string, WorkEntry>>(() => {
    if (!activeWorkplaceId) return entries;
    const out: Record<string, WorkEntry> = {};
    for (const [k, v] of Object.entries(entries)) {
      // Untagged entries belong to the FIRST workplace (backwards compat)
      const wid = v.workplaceId ?? (workplaces[0]?.id ?? '');
      if (wid === activeWorkplaceId) out[k] = v;
    }
    return out;
  }, [entries, activeWorkplaceId, workplaces]);

  const upsertEntry = useCallback(
    async (date: string, hours: number, isAbsence: boolean, customMultiplier?: number) => {
      try {
        const { calculateHourlyRate } = await import('../utils/salary');
        const MONTH_KEYS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthIndex = parseInt(date.substring(5, 7), 10) - 1;
        const monthKey = MONTH_KEYS[monthIndex];
        const monthlySalary = settings.monthlySalaries[monthKey] || 0;
        const hourlyRate = calculateHourlyRate(monthlySalary);
        const wid = settings.activeWorkplaceId || (settings.workplaces?.[0]?.id ?? '');
        const entry = await persistUpsert(date, hours, isAbsence, hourlyRate, customMultiplier, wid || undefined);
        setEntries((prev) => ({ ...(prev ?? {}), [date]: entry }));
        return entry;
      } catch (e) {
        console.warn('[AppContext] upsert failed', e);
        return null;
      }
    },
    [settings.monthlySalaries, settings.activeWorkplaceId, settings.workplaces]
  );

  const persistSettingsHelper = useCallback(async (next: UserSettings) => {
    setSettings(next);
    try { await persistSettings(next); } catch (e) { console.warn('[AppContext] persist settings failed', e); }
  }, []);

  const setActiveWorkplaceId = useCallback(async (id: string) => {
    await persistSettingsHelper({ ...settings, activeWorkplaceId: id, updatedAt: new Date().toISOString() });
  }, [settings, persistSettingsHelper]);

  const addWorkplace = useCallback(async (w: Omit<Workplace, 'id' | 'createdAt'>): Promise<Workplace | null> => {
    const now = new Date().toISOString();
    const nw: Workplace = { id: `wp_${Date.now()}_${Math.floor(Math.random() * 1000)}`, createdAt: now, ...w };
    const list = [...(settings.workplaces ?? []), nw];
    await persistSettingsHelper({ ...settings, workplaces: list, updatedAt: now });
    return nw;
  }, [settings, persistSettingsHelper]);

  const updateWorkplace = useCallback(async (id: string, patch: Partial<Workplace>) => {
    const list = (settings.workplaces ?? []).map(w => w.id === id ? { ...w, ...patch } : w);
    await persistSettingsHelper({ ...settings, workplaces: list, updatedAt: new Date().toISOString() });
  }, [settings, persistSettingsHelper]);

  const deleteWorkplace = useCallback(async (id: string) => {
    const list = (settings.workplaces ?? []).filter(w => w.id !== id);
    const next: UserSettings = {
      ...settings,
      workplaces: list,
      activeWorkplaceId: settings.activeWorkplaceId === id ? '' : settings.activeWorkplaceId,
      updatedAt: new Date().toISOString(),
    };
    await persistSettingsHelper(next);
  }, [settings, persistSettingsHelper]);

  const deleteEntry = useCallback(async (date: string) => {
    try {
      await persistDelete(date);
      setEntries((prev) => {
        const next = { ...(prev ?? {}) };
        delete next[date];
        return next;
      });
    } catch (e) {
      console.warn('[AppContext] delete failed', e);
    }
  }, []);

  const updateSettings = useCallback(async (s: UserSettings) => {
    // Optimistically update state first to prevent UI flicker / race with focus refresh
    setSettings((prev) => ({ ...(prev ?? {} as UserSettings), ...(s ?? {}), updatedAt: new Date().toISOString() }));
    try {
      await persistSettings(s);
    } catch (e) {
      console.warn('[AppContext] settings save failed', e);
    }
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await saveLanguage(lang);
      setLanguageState(lang);
    } catch (e) {
      console.warn('[AppContext] language save failed', e);
    }
  }, []);

  const setTheme = useCallback(async (thm: 'dark' | 'light' | 'system') => {
    try {
      if (thm === 'system') {
        await saveTheme('system');
        setThemeOverridden(false);
        setThemeState(systemScheme === 'light' ? 'light' : 'dark');
      } else {
        await saveTheme(thm);
        setThemeState(thm);
        setThemeOverridden(true);
      }
    } catch (e) {
      console.warn('[AppContext] theme save failed', e);
    }
  }, [systemScheme]);

  const resetAll = useCallback(async () => {
    try {
      await clearAllData();
      setEntries({});
      setSettings({
        firstName: '',
        lastName: '',
        monthlySalaries: {
          january: 0,
          february: 0,
          march: 0,
          april: 0,
          may: 0,
          june: 0,
          july: 0,
          august: 0,
          september: 0,
          october: 0,
          november: 0,
          december: 0,
        },
        email: '',
        updatedAt: '',
        notificationsEnabled: true,
        notificationTime: '09:00',
      });
    } catch (e) {
      console.warn('[AppContext] resetAll failed', e);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Get current email
      const currentEmail = await AsyncStorage.getItem('mesai.user.email.v1');
      
      // Backup current user's data
      if (currentEmail) {
        await backupUserData(currentEmail);
      }
      
      // Remove email from storage (this will trigger root layout to show login)
      await AsyncStorage.removeItem('mesai.user.email.v1');
      
      // Clear Google token if exists
      await AsyncStorage.removeItem('mesai.google.idToken.v1');
      
      // Reset all app state
      await resetAll();
    } catch (e) {
      console.warn('[AppContext] logout failed', e);
    }
  }, [resetAll]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      entries: filteredEntries,
      allEntries: entries,
      settings,
      language,
      theme,
      palette,
      setPalette,
      workplaces,
      activeWorkplaceId,
      setActiveWorkplaceId,
      addWorkplace,
      updateWorkplace,
      deleteWorkplace,
      upsertEntry,
      deleteEntry,
      updateSettings,
      setLanguage,
      setTheme,
      refresh,
      resetAll,
      logout,
    }),
    [ready, filteredEntries, entries, settings, language, theme, palette, setPalette, workplaces, activeWorkplaceId, setActiveWorkplaceId, addWorkplace, updateWorkplace, deleteWorkplace, upsertEntry, deleteEntry, updateSettings, setLanguage, setTheme, refresh, resetAll, logout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return {
      ready: false,
      entries: {},
      settings: { 
        firstName: '', 
        lastName: '', 
        monthlySalaries: {
          january: 0, february: 0, march: 0, april: 0, may: 0, june: 0,
          july: 0, august: 0, september: 0, october: 0, november: 0, december: 0,
        }, 
        email: '', 
        updatedAt: '' 
      },
      language: 'tr',
      theme: 'dark',
      palette: 'neon',
      setPalette: async () => {},
      workplaces: [],
      activeWorkplaceId: '',
      setActiveWorkplaceId: async () => {},
      addWorkplace: async () => null,
      updateWorkplace: async () => {},
      deleteWorkplace: async () => {},
      allEntries: {},
      upsertEntry: async () => null,
      deleteEntry: async () => {},
      updateSettings: async () => {},
      setLanguage: async () => {},
      setTheme: async () => {},
      refresh: async () => {},
      resetAll: async () => {},
      logout: async () => {},
    };
  }
  return ctx;
}
