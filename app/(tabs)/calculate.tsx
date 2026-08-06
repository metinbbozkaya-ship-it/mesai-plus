import React, { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Text, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getColors, spacing, radius } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { usePro, isProFeature } from '../../src/context/ProContext';
import { SeveranceCalculator } from '../../src/components/calculators/SeveranceCalculator';
import { NoticeCalculator } from '../../src/components/calculators/NoticeCalculator';
import { UnemploymentCalculator } from '../../src/components/calculators/UnemploymentCalculator';
import { AnnualLeaveCalculator } from '../../src/components/calculators/AnnualLeaveCalculator';
import { AnnualSalaryReport } from '../../src/components/calculators/AnnualSalaryReport';
import PayrollCalculator from '../../src/components/calculators/PayrollCalculator';
import { PageHeader } from '../../src/components/PageHeader';
import { LegalDataBanner } from '../../src/components/LegalDataBanner';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { FadeInView } from '../../src/components/FadeInView';

type CalculatorType = 'severance' | 'notice' | 'unemployment' | 'payroll' | 'leave' | 'salary' | 'receivables' | 'advances' | 'allowances';

interface MenuItem {
  id: CalculatorType;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  icon: string;
  color: string;
  route?: string; // if set, navigate instead of inline render
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'severance',
    titleTr: 'Kıdem Tazminatı',
    titleEn: 'Severance Pay',
    descTr: 'Kıdem tazminatınızı hesaplayın',
    descEn: 'Calculate your severance pay',
    icon: 'calculator',
    color: '#4F46E5',
  },
  {
    id: 'notice',
    titleTr: 'İhbar Tazminatı',
    titleEn: 'Notice Pay',
    descTr: 'İhbar tazminatınızı hesaplayın',
    descEn: 'Calculate your notice pay',
    icon: 'receipt',
    color: '#06B6D4',
  },
  {
    id: 'unemployment',
    titleTr: 'İşsizlik Maaşı',
    titleEn: 'Unemployment',
    descTr: 'İşsizlik maaşınızı hesaplayın',
    descEn: 'Calculate unemployment benefits',
    icon: 'briefcase',
    color: '#F59E0B',
  },
  {
    id: 'salary',
    titleTr: 'Yıllık Maaş Raporu',
    titleEn: 'Annual Salary Report',
    descTr: 'Yıllık maaş + mesai tablosu',
    descEn: 'Annual salary + overtime summary',
    icon: 'bar-chart',
    color: '#8B5CF6',
  },
  {
    id: 'payroll',
    titleTr: 'Bordro Hesapla',
    titleEn: 'Payroll Calc',
    descTr: 'Aylık bordro taslağınızı görün',
    descEn: 'View your monthly payroll draft',
    icon: 'document-text',
    color: '#10B981',
  },
  {
    id: 'leave',
    titleTr: 'Yıllık İzin Takibi',
    titleEn: 'Annual Leave',
    descTr: 'Kalan izin günlerinizi takip edin',
    descEn: 'Track your remaining leave days',
    icon: 'leaf',
    color: '#EC4899',
  },
  {
    id: 'receivables',
    titleTr: 'Alacak Takibi',
    titleEn: 'Receivables',
    descTr: 'Ödenmeyen mesai ve alacaklar',
    descEn: 'Unpaid overtime and receivables',
    icon: 'cash',
    color: '#22D3EE',
    route: '/menu/receivables',
  },
  {
    id: 'advances',
    titleTr: 'Avans Takibi',
    titleEn: 'Advances',
    descTr: 'Alınan avanslar ve bakiye',
    descEn: 'Received advances and balance',
    icon: 'card',
    color: '#F97316',
    route: '/menu/advances',
  },
  {
    id: 'allowances',
    titleTr: 'Yol / Yemek Ücreti',
    titleEn: 'Transport / Meal',
    descTr: 'Günlük ek ödemeler',
    descEn: 'Daily allowances',
    icon: 'car',
    color: '#14B8A6',
    route: '/menu/allowances',
  },
];

export default function CalculateScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { language, theme } = useApp();
  const { isPro } = usePro();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [activeScreen, setActiveScreen] = useState<CalculatorType | null>(null);

  const handleSelect = (id: CalculatorType) => {
    if (isProFeature(id) && !isPro) {
      router.push('/upgrade');
      return;
    }
    const item = MENU_ITEMS.find(m => m.id === id);
    if (item?.route) {
      router.push(item.route as any);
      return;
    }
    setActiveScreen(id);
  };

  useLayoutEffect(() => {
    if (activeScreen) {
      const item = MENU_ITEMS.find((m) => m.id === activeScreen);
      navigation.setOptions({
        headerLeft: () => (
          <Pressable onPress={() => setActiveScreen(null)} style={{ paddingLeft: 16 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: undefined,
      });
    }
  }, [language, navigation, colors, activeScreen]);

  if (activeScreen) {
    const item = MENU_ITEMS.find((m) => m.id === activeScreen);
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <Pressable onPress={() => setActiveScreen(null)} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }} numberOfLines={1}>
            {item ? (language === 'tr' ? item.titleTr : item.titleEn) : ''}
          </Text>
        </View>
        {activeScreen === 'severance' && <SeveranceCalculator />}
        {activeScreen === 'notice' && <NoticeCalculator />}
        {activeScreen === 'unemployment' && <UnemploymentCalculator />}
        {activeScreen === 'salary' && <AnnualSalaryReport />}
        {activeScreen === 'payroll' && <PayrollCalculator />}
        {activeScreen === 'leave' && <AnnualLeaveCalculator />}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <PageHeader title={language === 'tr' ? 'Hesapla' : 'Calculate'} />
      <ScrollView contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
        <LegalDataBanner />
        <Text style={styles.pageSubtitle}>
          {language === 'tr'
            ? 'İhtiyacınıza uygun hesaplama aracını seçin'
            : 'Choose the tool that fits your needs'}
        </Text>

        <View style={styles.grid}>
          {MENU_ITEMS.map((item, idx) => {
            const locked = isProFeature(item.id) && !isPro;
            return (
              <FadeInView key={item.id} delay={idx * 70}>
              <AnimatedPressable
                onPress={() => handleSelect(item.id)}
                style={[
                  styles.menuCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.menuCardTitle}>
                      {language === 'tr' ? item.titleTr : item.titleEn}
                    </Text>
                    {isProFeature(item.id) && (
                      <View style={[styles.proBadge, { backgroundColor: locked ? colors.accent + '22' : colors.accent }]}>
                        <Ionicons name={locked ? 'lock-closed' : 'diamond'} size={9} color={locked ? colors.accent : '#fff'} />
                        <Text style={[styles.proBadgeText, { color: locked ? colors.accent : '#fff' }]}>PRO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuCardDesc}>
                    {language === 'tr' ? item.descTr : item.descEn}
                  </Text>
                </View>
                <Ionicons name={locked ? 'lock-closed' : 'chevron-forward'} size={16} color={colors.textMuted} />
              </AnimatedPressable>
              </FadeInView>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    menuContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    pageTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 2,
    },
    pageSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: spacing.md,
    },
    grid: {
      gap: spacing.sm,
    },
    menuCard: {
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    menuIconContainer: {
      width: 42,
      height: 42,
      borderRadius: radius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuCardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    menuCardDesc: {
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    proBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    menuCardArrow: {
      position: 'absolute',
      right: spacing.md,
      top: '50%',
      marginTop: -8,
    },
  });
}
