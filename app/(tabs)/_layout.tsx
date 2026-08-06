import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { useToast } from '../../src/context/ToastContext';
import { getColors } from '../../src/theme';
import { t } from '../../src/utils/i18n';
import { MenuDrawer } from '../../src/components/MenuDrawer';
import { MenuProvider, useMenu } from '../../src/context/MenuContext';
import { CustomTabBar } from '../../src/components/CustomTabBar';

function TabsInner() {
  const { theme, language, resetAll } = useApp();
  const toast = useToast();
  const router = useRouter();
  const colors = getColors(theme);
  const { visible, close } = useMenu();

  const isTr = language === 'tr';
  const menuItems: any[] = [
    // ── 1. HESAP ──────────────────────────────
    {
      id: 'grp_account',
      label: isTr ? 'Hesap' : 'Account',
      subtitle: isTr ? 'Profil ve iş yerleri' : 'Profile and workplaces',
      icon: 'person-outline',
      children: [
        { id: 'profile', label: isTr ? 'Profilim' : 'My Profile', icon: 'person-circle-outline',
          onPress: () => router.push('/(tabs)/profile') },
        { id: 'workplaces', label: isTr ? 'İş Yerleri' : 'Workplaces', icon: 'business-outline',
          onPress: () => router.push('/(tabs)/menu/workplaces') },
      ],
    },
    // ── 2. ANALİZ ─────────────────────────────
    {
      id: 'grp_analysis',
      label: isTr ? 'Analiz & Raporlar' : 'Analysis & Reports',
      subtitle: isTr ? 'İstatistikler, rozetler' : 'Statistics, achievements',
      icon: 'bar-chart-outline',
      children: [
        { id: 'stats', label: isTr ? 'İstatistikler' : 'Statistics', icon: 'stats-chart-outline',
          onPress: () => router.push('/(tabs)/menu/stats') },
        { id: 'achievements', label: isTr ? 'Rozetler' : 'Achievements', icon: 'trophy-outline',
          onPress: () => router.push('/(tabs)/menu/achievements') },
      ],
    },
    // ── 3. HESAPLAYICILAR ─────────────────────
    {
      id: 'grp_calc',
      label: isTr ? 'Hesaplayıcılar' : 'Calculators',
      subtitle: isTr ? 'SGK primi, asgari ücret' : 'SGK premium, minimum wage',
      icon: 'calculator-outline',
      children: [
        { id: 'sgk_premium', label: isTr ? 'SGK Prim Hesaplayıcı' : 'SGK Premium', icon: 'shield-checkmark-outline',
          onPress: () => router.push('/(tabs)/menu/sgk_premium') },
        { id: 'minimum_wage', label: isTr ? 'Asgari Ücret Karşılaştırma' : 'Minimum Wage', icon: 'trending-up-outline',
          onPress: () => router.push('/(tabs)/menu/minimum_wage') },
      ],
    },
    // ── 4. REHBER ─────────────────────────────
    {
      id: 'grp_guide',
      label: isTr ? 'Rehber & Danışman' : 'Guide & Advisor',
      subtitle: isTr ? 'Vergi, iş kanunu' : 'Tax, labor law',
      icon: 'book-outline',
      children: [
        { id: 'tax_advisor', label: isTr ? 'AI Vergi Danışmanı' : 'AI Tax Advisor', icon: 'chatbubbles-outline',
          onPress: () => router.push('/(tabs)/menu/tax_advisor') },
        { id: 'labor_law', label: isTr ? 'İş Kanunu Rehberi' : 'Labor Law Guide', icon: 'library-outline',
          onPress: () => router.push('/(tabs)/menu/labor_law') },
      ],
    },
    // ── 5. AYARLAR ────────────────────────────
    {
      id: 'grp_settings',
      label: isTr ? 'Ayarlar' : 'Settings',
      subtitle: isTr ? 'Bildirimler, genel tercihler' : 'Notifications, preferences',
      icon: 'settings-outline',
      children: [
        { id: 'notifications', label: t(language, 'tab_notifications'), icon: 'notifications-outline',
          onPress: () => router.push('/(tabs)/menu/notifications') },
        { id: 'options', label: isTr ? 'Genel Ayarlar' : 'General Settings', icon: 'options-outline',
          onPress: () => router.push('/(tabs)/options') },
      ],
    },
    // ── 6. HAKKINDA ───────────────────────────
    {
      id: 'grp_about',
      label: isTr ? 'Hakkında' : 'About',
      subtitle: isTr ? 'Değerlendir, paylaş, geri bildirim' : 'Rate, share, feedback',
      icon: 'information-circle-outline',
      children: [
        { id: 'rate', label: isTr ? 'Uygulamayı Değerlendir' : 'Rate App', icon: 'star-outline',
          onPress: () => router.push('/(tabs)/menu/rate') },
        { id: 'share', label: isTr ? 'Uygulamayı Paylaş' : 'Share App', icon: 'share-social-outline',
          onPress: () => router.push('/(tabs)/menu/share') },
        { id: 'feedback', label: isTr ? 'Öneriler & Hatalar' : 'Suggestions & Bugs', icon: 'chatbubble-ellipses-outline',
          onPress: () => router.push('/(tabs)/menu/feedback') },
      ],
    },
    // ── 7. TEHLİKELİ ──────────────────────────
    {
      id: 'reset',
      label: language === 'tr' ? 'Sıfırla' : 'Reset',
      icon: 'trash-outline',
      danger: true,
      onPress: () => {
        close();
        setTimeout(() => {
          Alert.alert(
            language === 'tr' ? 'Tüm Verileri Sil' : 'Delete All Data',
            language === 'tr'
              ? 'Tüm uygulama verileriniz silinecek. Bu işlem geri alınamaz.'
              : 'All app data will be deleted. This cannot be undone.',
            [
              { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
              {
                text: language === 'tr' ? 'Evet, Sil' : 'Yes, Delete',
                onPress: async () => {
                  try {
                    await resetAll();
                    toast.success(language === 'tr' ? 'Tüm veriler silindi' : 'All data has been deleted');
                  } catch (e) {
                    toast.error(language === 'tr' ? 'Veri silme sırasında hata oluştu' : 'Error deleting data');
                  }
                },
                style: 'destructive',
              },
            ]
          );
        }, 100);
      },
    },
  ];

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t(language, 'tab_home'),
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="calculate"
          options={{
            title: language === 'tr' ? 'Hesapla' : 'Calculate',
            tabBarIcon: ({ color, size }) => <Ionicons name="calculator" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="entry"
          options={{
            title: t(language, 'tab_entry'),
            tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="menu/salary"
          options={{
            title: language === 'tr' ? 'Maaş' : 'Salary',
            tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: language === 'tr' ? 'Cüzdan' : 'Wallet',
            tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={size} />,
          }}
        />

        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="menu/settings" options={{ href: null }} />
        <Tabs.Screen name="menu/workplaces" options={{ href: null }} />
        <Tabs.Screen name="menu/tax_advisor" options={{ href: null }} />
        <Tabs.Screen name="menu/feedback" options={{ href: null }} />
        <Tabs.Screen name="menu/notifications" options={{ href: null }} />
        <Tabs.Screen name="options" options={{ href: null }} />
        <Tabs.Screen name="menu/severance" options={{ href: null }} />
        <Tabs.Screen name="menu/notice" options={{ href: null }} />
        <Tabs.Screen name="menu/unemployment" options={{ href: null }} />
        <Tabs.Screen name="menu/rate" options={{ href: null }} />
        <Tabs.Screen name="menu/share" options={{ href: null }} />
        <Tabs.Screen name="menu/stats" options={{ href: null }} />
        <Tabs.Screen name="menu/achievements" options={{ href: null }} />
        <Tabs.Screen name="menu/receivables" options={{ href: null }} />
        <Tabs.Screen name="menu/advances" options={{ href: null }} />
        <Tabs.Screen name="menu/allowances" options={{ href: null }} />
        <Tabs.Screen name="menu/labor_law" options={{ href: null }} />
        <Tabs.Screen name="menu/sgk_premium" options={{ href: null }} />
        <Tabs.Screen name="menu/minimum_wage" options={{ href: null }} />
      </Tabs>
      <MenuDrawer visible={visible} onClose={close} items={menuItems} />
    </>
  );
}

export default function TabsLayout() {
  return (
    <MenuProvider>
      <TabsInner />
    </MenuProvider>
  );
}
