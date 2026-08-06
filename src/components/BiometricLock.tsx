import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, AppState, AppStateStatus } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { getColors, radius, spacing } from '../theme';
import { authenticate, isBiometricAvailable, isBiometricEnabled, getBiometricTypeLabel } from '../utils/biometric';

interface Props {
  children: React.ReactNode;
}

export function BiometricLock({ children }: Props) {
  const { theme, language, ready } = useApp();
  const colors = getColors(theme);

  const [checked, setChecked] = useState(false);
  const [locked, setLocked] = useState(false);
  const [typeLabel, setTypeLabel] = useState('');
  const [prompting, setPrompting] = useState(false);

  const tryUnlock = useCallback(async () => {
    if (prompting) return;
    setPrompting(true);
    const ok = await authenticate(
      language === 'tr' ? 'Uygulamayı açmak için kimliğinizi doğrulayın' : 'Authenticate to open the app'
    );
    setPrompting(false);
    if (ok) setLocked(false);
  }, [prompting, language]);

  // Initial check on mount
  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (Platform.OS === 'web') {
        setChecked(true);
        return;
      }
      const enabled = await isBiometricEnabled();
      const available = await isBiometricAvailable();
      if (enabled && available) {
        setLocked(true);
        const lbl = await getBiometricTypeLabel(language);
        setTypeLabel(lbl);
      }
      setChecked(true);
    })();
  }, [ready, language]);

  // Auto-prompt on becoming locked
  useEffect(() => {
    if (locked && checked) {
      tryUnlock();
    }
  }, [locked, checked, tryUnlock]);

  // Re-lock when app comes back from background
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        const enabled = await isBiometricEnabled();
        const available = await isBiometricAvailable();
        if (enabled && available && !locked) {
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [locked]);

  if (!checked) return null;
  if (!locked) return <>{children}</>;

  const iconName =
    typeLabel === 'Face ID' || typeLabel.includes('Yüz') || typeLabel.includes('Face')
      ? 'scan-outline'
      : 'finger-print';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.bg, colors.bg2]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.center}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={iconName as any} size={56} color="#FFFFFF" />
        </LinearGradient>

        <Text style={[styles.title, { color: colors.text }]}>
          {language === 'tr' ? 'Mesai+ Kilitli' : 'Mesai+ Locked'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {language === 'tr'
            ? `Devam etmek için ${typeLabel || 'biyometrik doğrulama'} kullanın`
            : `Use ${typeLabel || 'biometric authentication'} to continue`}
        </Text>

        <Pressable onPress={tryUnlock}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.unlockBtn}
          >
            <Ionicons name="lock-open" size={18} color="#FFFFFF" />
            <Text style={styles.unlockText}>
              {language === 'tr' ? 'Kilidi Aç' : 'Unlock'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
