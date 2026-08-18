import React from 'react';
import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { getColors } from '../../src/theme';
import { t } from '../../src/utils/i18n';
import { MenuDrawer } from '../../src/components/MenuDrawer';
import { MenuProvider, useMenu } from '../../src/context/MenuContext';
import { CustomTabBar } from '../../src/components/CustomTabBar';

function TabsInner() {
  const { theme, language } = useApp();
  const router = useRouter();
  const colors = getColors(theme);
  const { visible, close } = useMenu();

  const isTr = language === 'tr';

  const menuItems: any[] = [
    // ── ÇALIŞMA (kompakt, accordion yok — kolay erişim) ─
    // NOT: Profil artık Profil sekmesinden erişiliyor, burada tekrarlanmıyor.
    {
      id: 'grp_work',
      label: isTr ? 'Çalışma' : 'Work',
      icon: 'briefcase-outline',
      collapsible: false,
      children: [
        { id: 'workplaces', label: isTr ? 'İş Yerleri' : 'Workplaces', icon: 'business-outline',
          onPress: () => router.push('/(tabs)/menu/workplaces') },
        { id: 'stats', label: isTr ? 'İstatistikler' : 'Statistics', icon: 'stats-chart-outline',
          onPress: () => router.push('/(tabs)/menu/stats') },
        { id: 'achievements', label: isTr ? 'Rozetler' : 'Achievements', icon: 'trophy-outline',
          onPress: () => router.push('/(tabs)/menu/achievements') },
      ],
    },

    // ── ARAÇLAR (grup başlığı/accordion kaldırıldı — 4 araç doğrudan üst
    // düzey leaf item olarak listeleniyor, ÇALIŞMA'nın hemen altında) ─
    // NOT: Alacak/Avans/Yol-Yemek zaten Hesapla ekranında var, burada tekrarlanmıyor.
    // NOT: Drawer'daki görsel PRO/kilit etiketi kaldırıldı — erişim kontrolü hâlâ
    // her ekranın kendi ProGate/isProFeature mantığıyla yapılıyor, değişmedi.
    { id: 'sgk_premium', label: isTr ? 'SGK Prim Hesaplayıcı' : 'SGK Premium', icon: 'shield-checkmark-outline',
      onPress: () => router.push('/(tabs)/menu/sgk_premium') },
    { id: 'minimum_wage', label: isTr ? 'Asgari Ücret Karşılaştırma' : 'Minimum Wage', icon: 'trending-up-outline',
      onPress: () => router.push('/(tabs)/menu/minimum_wage') },
    { id: 'tax_advisor', label: isTr ? 'AI Vergi Danışmanı' : 'AI Tax Advisor', icon: 'chatbubbles-outline',
      onPress: () => router.push('/(tabs)/menu/tax_advisor') },
    { id: 'labor_law', label: isTr ? 'İş Kanunu Rehberi' : 'Labor Law Guide', icon: 'library-outline',
      onPress: () => router.push('/(tabs)/menu/labor_law') },

    // ── UYGULAMA (kompakt, accordion yok) ──────
    {
      id: 'grp_app',
      label: isTr ? 'Uygulama' : 'App',
      icon: 'apps-outline',
      collapsible: false,
      children: [
        { id: 'options', label: isTr ? 'Ayarlar' : 'Settings', icon: 'settings-outline',
          onPress: () => router.push('/(tabs)/options') },
      ],
    },
    // NOT: "Tüm Verileri Sıfırla" artık Profil → Veri & Yedekleme altında —
    // aynı resetAll() mantığı, drawer'da tekrarlanmıyor.
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
          name="wallet"
          options={{
            title: language === 'tr' ? 'Cüzdan' : 'Wallet',
            tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t(language, 'tab_profile'),
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />

        <Tabs.Screen name="menu/salary" options={{ href: null }} />
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
