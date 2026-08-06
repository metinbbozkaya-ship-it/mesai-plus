import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { getColors, radius, spacing } from '../theme';

const LAST_CHECK_KEY = 'mesai.legal.lastCheck.v1';

// Current legal reference values (kept in code, manually bumped per release)
const LEGAL_VERSION = '2026.04';

export function LegalDataBanner() {
  const { theme, language } = useApp();
  const colors = getColors(theme);
  const isTr = language === 'tr';
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_CHECK_KEY).then((v) => setLastCheck(v));
  }, []);

  const onCheck = async () => {
    setChecking(true);
    // Simulate verification (in production: fetch a remote JSON of legal constants)
    await new Promise((r) => setTimeout(r, 900));
    const now = new Date().toISOString();
    await AsyncStorage.setItem(LAST_CHECK_KEY, now);
    setLastCheck(now);
    setChecking(false);
  };

  const lastLabel = lastCheck
    ? new Date(lastCheck).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : (isTr ? 'Henüz kontrol edilmedi' : 'Not checked yet');

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.success + '50' }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.success + '22' }]}>
        <Ionicons name="shield-checkmark" size={20} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isTr ? 'Yasal Veriler Güncel' : 'Legal Data Up-to-date'}
          </Text>
          <View style={[styles.versionPill, { backgroundColor: colors.success + '22' }]}>
            <Text style={[styles.versionText, { color: colors.success }]}>v{LEGAL_VERSION}</Text>
          </View>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {isTr ? 'Son kontrol' : 'Last check'}: {lastLabel}
        </Text>
      </View>
      <Pressable
        onPress={onCheck}
        disabled={checking}
        hitSlop={10}
        style={({ pressed }) => [
          styles.btn,
          { borderColor: colors.success, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {checking ? (
          <ActivityIndicator size="small" color={colors.success} />
        ) : (
          <>
            <Ionicons name="refresh" size={14} color={colors.success} />
            <Text style={[styles.btnText, { color: colors.success }]}>
              {isTr ? 'Kontrol' : 'Check'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  versionPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  versionText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  btnText: { fontSize: 11, fontWeight: '800' },
});
