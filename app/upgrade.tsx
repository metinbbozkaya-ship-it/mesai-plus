import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { useToast } from '../src/context/ToastContext';
import { usePro } from '../src/context/ProContext';
import { getColors, spacing, radius } from '../src/theme';

export default function UpgradeScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { language, theme } = useApp();
  const toast = useToast();
  const {
    isPro,
    ready,
    purchasePro,
    restorePurchases,
    product,
    purchasing,
    purchaseSuccessTick,
    purchaseErrorTick,
  } = usePro();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(false);
  const isTr = language === 'tr';
  const displayPrice = product?.localizedPrice || '₺179,99';

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Real purchase success is only confirmed asynchronously (purchaseUpdatedListener
  // in ProContext, after finishTransaction + persistPro succeed) — react to that
  // signal instead of purchasePro()'s immediate return value.
  const prevSuccessTick = useRef(purchaseSuccessTick);
  useEffect(() => {
    if (purchaseSuccessTick === prevSuccessTick.current) return;
    prevSuccessTick.current = purchaseSuccessTick;
    Alert.alert(
      isTr ? '🎉 Tebrikler!' : '🎉 Success!',
      isTr ? 'Pro üyeliğiniz aktif edildi. Tüm özelliklere erişebilirsiniz.' : 'Your Pro membership is active. You can now access all features.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [purchaseSuccessTick, isTr, router]);

  const prevErrorTick = useRef(purchaseErrorTick);
  useEffect(() => {
    if (purchaseErrorTick === prevErrorTick.current) return;
    prevErrorTick.current = purchaseErrorTick;
    toast.error(
      isTr ? 'Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.' : 'An error occurred during the purchase. Please try again.'
    );
  }, [purchaseErrorTick, isTr, toast]);

  const features = [
    { icon: 'bar-chart', tr: 'Yıllık Maaş Raporu', en: 'Annual Salary Report' },
    { icon: 'document-text', tr: 'Bordro Hesaplama', en: 'Payroll Calculator' },
    { icon: 'leaf', tr: 'Yıllık İzin Takibi', en: 'Annual Leave Tracker' },
    { icon: 'cloud-download', tr: 'PDF Rapor İndirme', en: 'PDF Report Download' },
    { icon: 'sparkles', tr: 'Reklamsız Deneyim', en: 'Ad-free Experience' },
  ];

  const onPurchase = async () => {
    setLoading(true);
    try {
      const result = await purchasePro();
      if (result === 'unsupported') {
        toast.error(
          isTr ? 'Bu ortamda uygulama içi satın alma desteklenmiyor.' : 'In-app purchases are not supported in this environment.'
        );
      }
      // 'dispatched' -> wait for the purchaseSuccessTick/purchaseErrorTick effects above.
      // 'cancelled' -> user backed out deliberately, stay silent.
      // 'error' -> already surfaced via the purchaseErrorTick effect above.
    } finally {
      setLoading(false);
    }
  };

  const onRestore = async () => {
    setLoading(true);
    const result = await restorePurchases();
    setLoading(false);
    if (result === 'restored') {
      toast.success(isTr ? 'Pro üyeliğiniz geri yüklendi.' : 'Pro membership restored.');
    } else if (result === 'not_found') {
      toast.info(isTr ? 'Aktif bir satın alma bulunamadı.' : 'No active purchase found.');
    } else {
      toast.error(
        isTr ? 'Satın alma bilgileri alınamadı. Lütfen tekrar deneyin.' : 'Could not retrieve purchase information. Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: 'bold', letterSpacing: -0.5 }}>Mesai+ Pro</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="diamond" size={48} color="#fff" />
          <Text style={styles.heroTitle}>Mesai+ Pro</Text>
          <Text style={styles.heroSubtitle}>
            {isTr ? 'Tüm hesaplama araçlarına sınırsız erişim' : 'Unlimited access to all calculators'}
          </Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isTr ? 'Pro Özellikler' : 'Pro Features'}
          </Text>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: colors.accent + '18' }]}>
                <Ionicons name={f.icon as any} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                {isTr ? f.tr : f.en}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
            </View>
          ))}
        </View>

        <View style={[styles.priceCard, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
            {isTr ? 'Tek seferlik ödeme' : 'One-time payment'}
          </Text>
          <Text style={[styles.priceValue, { color: colors.text }]}>{displayPrice}</Text>
          <Text style={[styles.priceSub, { color: colors.textMuted }]}>
            {isTr ? 'Ömür boyu erişim' : 'Lifetime access'}
          </Text>
        </View>

        {isPro ? (
          <View style={[styles.activeBadge, { backgroundColor: colors.accent + '18', borderColor: colors.accent }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            <Text style={[styles.activeBadgeText, { color: colors.accent }]}>
              {isTr ? 'Pro üyeliğiniz aktif' : 'Pro membership active'}
            </Text>
          </View>
        ) : (
          <Pressable onPress={onPurchase} disabled={loading || purchasing || !ready}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.buyBtn, (loading || purchasing || !ready) && { opacity: 0.6 }]}
            >
              {(loading || purchasing) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="diamond" color="#fff" size={20} />
                  <Text style={styles.buyBtnText}>{isTr ? "Pro'ya Geç" : 'Upgrade to Pro'}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}

        <Pressable onPress={onRestore} disabled={loading} style={styles.restoreBtn}>
          <Text style={[styles.restoreText, { color: colors.textMuted }]}>
            {isTr ? 'Satın alımları geri yükle' : 'Restore purchases'}
          </Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.textDim }]}>
          {isTr
            ? 'Ödeme Google Play / App Store hesabınız üzerinden tahsil edilecektir. Satın alma sonrası tüm Pro özellikler aktif olur.'
            : 'Payment will be charged to your Google Play / App Store account. All Pro features unlock immediately after purchase.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
    hero: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center' },
    card: {
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      gap: spacing.sm,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    featureIcon: {
      width: 34, height: 34, borderRadius: radius.sm,
      justifyContent: 'center', alignItems: 'center',
    },
    featureText: { flex: 1, fontSize: 14, fontWeight: '600' },
    priceCard: {
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 2,
      alignItems: 'center',
      gap: spacing.xs,
    },
    priceLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    priceValue: { fontSize: 36, fontWeight: '900' },
    priceSub: { fontSize: 12, fontWeight: '600' },
    buyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    restoreBtn: { alignItems: 'center', paddingVertical: spacing.sm },
    restoreText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
    disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: spacing.sm },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 2,
    },
    activeBadgeText: { fontSize: 15, fontWeight: '800' },
  });
}
