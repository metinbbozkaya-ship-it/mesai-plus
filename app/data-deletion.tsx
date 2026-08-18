import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { getColors, spacing, radius } from '../src/theme';

interface Section {
  title: string;
  body: string;
}

export default function DataDeletionScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { language, theme } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const sections: Section[] = isTr
    ? [
        {
          title: 'Kullanıcı Hesabı',
          body: 'Mesai+ bir kullanıcı hesabı oluşturmaz. Profil, maaş, mesai, ödeme, borç, harcama, birikim ve diğer kullanıcı kayıtlarınız cihazınızda yerel olarak saklanır; bu verileri toplayan bir Mesai+ sunucusu yoktur.',
        },
        {
          title: 'Verilerinizi Silme',
          body: 'Uygulama menüsünde yer alan "Tüm Verileri Sıfırla" seçeneğini kullanarak profil, maaş, mesai, izin, iş yerleri, cüzdan (ödemeler, borçlar, harcamalar, birikim hedefleri, varlık kayıtları, alacak ve avanslar) gibi yerel kullanıcı verilerinizi cihazınızdan silebilirsiniz.',
        },
        {
          title: 'Uygulamayı Kaldırma',
          body: 'Uygulamanın cihazınızdan kaldırılması da uygulamaya ait yerel verilerin cihazdan kaldırılmasına neden olabilir. Bu davranış cihazınızın işletim sistemine ve ayarlarına göre değişebilir.',
        },
        {
          title: 'Pro Üyelik',
          body: 'Pro üyelik satın alma hakkınız Apple App Store veya Google Play mağaza hesabınız üzerinden yönetilir. Cihazınızdaki yerel verileri silmek, mağazadaki satın alma geçmişinizi iptal etmez veya etkilemez.',
        },
        {
          title: 'Destek',
          body: 'Sorularınız için: metardtec@gmail.com',
        },
      ]
    : [
        {
          title: 'User Account',
          body: 'Mesai+ does not create a user account. Your profile, salary, work records, payments, debts, expenses, savings and other user records are stored locally on your device; there is no Mesai+ server that collects this data.',
        },
        {
          title: 'Deleting Your Data',
          body: 'You can delete your local user data — profile, salary, work records, leave, workplaces, and wallet data (bills, debts, expenses, savings goals, asset records, receivables and advances) — from your device using the "Reset All Data" option in the app menu.',
        },
        {
          title: 'Uninstalling the App',
          body: 'Uninstalling the app may also remove its local data from your device. This behavior can vary depending on your device\'s operating system and settings.',
        },
        {
          title: 'Pro Membership',
          body: 'Your Pro membership entitlement is managed by your Apple App Store or Google Play store account. Deleting local data on your device does not cancel or affect your purchase history in the store.',
        },
        {
          title: 'Support',
          body: 'For questions: metardtec@gmail.com',
        },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isTr ? 'Veri Silme Politikası' : 'Data Deletion Policy'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.closeButton,
            { opacity: pressed ? 0.6 : 1, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textMuted }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    closeButton: {
      padding: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.xs,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    sectionBody: {
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
