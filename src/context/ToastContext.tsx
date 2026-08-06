import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors, radius, spacing } from '../theme';
import { useApp } from './AppContext';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions | string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastState extends ToastOptions {
  id: number;
  visible: boolean;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);
  const nextId = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const show = useCallback((opts: ToastOptions | string) => {
    const normalized: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;
    const t: ToastState = {
      id: nextId.current++,
      type: 'info',
      duration: 2600,
      visible: true,
      ...normalized,
    };
    setToast(t);

    if (Platform.OS !== 'web') {
      const fbType =
        t.type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : t.type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning;
      Haptics.notificationAsync(fbType).catch(() => {});
    }

    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => hide(), t.duration);
  }, [translateY, opacity, hide]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (m, d) => show({ message: m, type: 'success', duration: d }),
    error: (m, d) => show({ message: m, type: 'error', duration: d }),
    info: (m, d) => show({ message: m, type: 'info', duration: d }),
    warning: (m, d) => show({ message: m, type: 'warning', duration: d }),
  };

  const iconName =
    toast?.type === 'success' ? 'checkmark-circle' :
    toast?.type === 'error' ? 'alert-circle' :
    toast?.type === 'warning' ? 'warning' : 'information-circle';

  const accentColor =
    toast?.type === 'success' ? (colors.success || '#22C55E') :
    toast?.type === 'error' ? (colors.danger || '#F43F5E') :
    toast?.type === 'warning' ? '#F59E0B' : colors.accent;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.container,
            {
              top: insets.top + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Pressable onPress={hide} style={({ pressed }) => [
            styles.toast,
            {
              backgroundColor: theme === 'dark' ? 'rgba(20,20,32,0.96)' : 'rgba(255,255,255,0.98)',
              borderColor: accentColor + '55',
              shadowColor: accentColor,
              opacity: pressed ? 0.9 : 1,
            },
          ]}>
            <View style={[styles.iconBox, { backgroundColor: accentColor + '22' }]}>
              <Ionicons name={iconName as any} size={20} color={accentColor} />
            </View>
            <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
    paddingHorizontal: spacing.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: Math.min(280, SCREEN_W - 32),
    maxWidth: SCREEN_W - 32,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
});
