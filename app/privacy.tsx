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

export default function PrivacyScreen() {
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
          title: 'Saklanan Veriler',
          body: 'Uygulama; ad, soyad ve e-posta adresiniz, aylık maaş bilgileriniz, çalışma/mesai kayıtlarınız ve hesaplanan kazançlarınız, cüzdan bölümündeki finansal kayıtlarınız (alacaklar, avanslar, faturalar, harcamalar, birikim hedefleri), dil/tema tercihleriniz ve Pro üyelik durumunuz gibi bilgileri saklar.',
        },
        {
          title: 'Verilerin Saklanması',
          body: 'Yukarıdaki veriler uygulama tarafından cihazınızda saklanır. Uygulamanın bu verileri topladığı kendi bir sunucusu yoktur.',
        },
        {
          title: 'Fiş Tarama',
          body: 'Fiş tarama isteğe bağlı bir özelliktir. Bu özelliği kullandığınızda, taranan fiş görseli metne dönüştürülmek üzere üçüncü taraf bir OCR servisine gönderilebilir. Bu aktarım, kamera veya galeri seçimini yapmadan önce size bildirilir.',
        },
        {
          title: 'Yedekleme ve Dışa Aktarma',
          body: 'Verilerinizi isteğe bağlı olarak bir dosyaya yedekleyebilirsiniz. Yedek dosyası cihazınızda oluşturulur; paylaşmayı seçerseniz seçtiğiniz uygulama veya hizmete gönderilebilir.',
        },
        {
          title: 'Android Sistem Yedeklemesi',
          body: 'Uygulamada Android sistem otomatik yedekleme (Auto Backup) özelliği kapalıdır. Maaş, mesai ve diğer uygulama verileriniz Android sistem yedeklemesine dahil edilmez.',
        },
        {
          title: 'Uygulama İçi Satın Almalar',
          body: 'Pro üyelik satın alma işlemleri Google Play veya App Store mağaza altyapısı üzerinden yürütülür.',
        },
        {
          title: 'Veri Paylaşımı',
          body: 'Uygulamanın kendi bir arka uç (backend) sunucusu yoktur. Fiş tarama gibi isteğe bağlı özellikleri kullandığınızda, ilgili üçüncü taraf servis (OCR servisi) yalnızca o işlem için gönderilen veriyi işleyebilir.',
        },
        {
          title: 'İletişim',
          body: 'Sorularınız için: support@mesaiplus.app',
        },
      ]
    : [
        {
          title: 'Data Stored',
          body: 'The app stores information such as your first and last name, email address, monthly salary information, work records and calculated earnings, financial records in the wallet section (receivables, advances, bills, expenses, savings goals), your language/theme preferences, and your Pro membership status.',
        },
        {
          title: 'Data Storage',
          body: 'The data above is stored on your device by the app. The app does not have its own server that collects this data.',
        },
        {
          title: 'Receipt Scanning',
          body: 'Receipt scanning is an optional feature. When you use it, the scanned receipt image may be sent to a third-party OCR service to be converted into text. You are notified of this before you choose the camera or gallery.',
        },
        {
          title: 'Backup and Export',
          body: 'You can optionally back up your data to a file. The backup file is created on your device; if you choose to share it, it may be sent to the app or service you select.',
        },
        {
          title: 'Android System Backup',
          body: 'Android system Auto Backup is disabled for this app. Your salary, work records, and other app data are not included in Android system backups.',
        },
        {
          title: 'In-App Purchases',
          body: 'Pro membership purchases are processed through the Google Play or App Store store infrastructure.',
        },
        {
          title: 'Data Sharing',
          body: 'The app does not have its own backend server. When you use optional features such as receipt scanning, the relevant third-party service (the OCR service) may process only the data sent for that operation.',
        },
        {
          title: 'Contact',
          body: 'For questions: support@mesaiplus.app',
        },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
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
