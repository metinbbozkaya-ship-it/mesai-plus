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

export default function TermsScreen() {
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
          title: '1. Giriş',
          body: 'Mesai+ uygulamasını kullanarak bu Kullanım Koşulları\'nı kabul etmiş olursunuz. Lütfen uygulamayı kullanmadan önce bu koşulları okuyun.',
        },
        {
          title: '2. Hizmetin Tanımı',
          body: 'Mesai+; çalışma ve mesai kayıtlarının tutulması, maaş ve bordro hesaplamaları, yıllık izin takibi, kıdem/ihbar/işsizlik gibi hesaplama araçları, raporlama ve ilgili yardımcı araçlar sunar. Bu özelliklerin bir kısmı Mesai+ Pro gerektirebilir.',
        },
        {
          title: '3. Hesaplamalar',
          body: 'Uygulama tarafından yapılan hesaplamalar yalnızca bilgilendirme amaçlıdır. Sonuçlar resmi bordro, hukuki, mali veya muhasebesel tavsiye niteliği taşımaz. Resmi işlemlerinizde ilgili uzmana, muhasebe biriminize veya yetkili kuruma danışmanızı öneririz.',
        },
        {
          title: '4. Kullanıcı Tarafından Girilen Veriler',
          body: 'Hesaplama sonuçları, uygulamaya girdiğiniz bilgilere dayanır. Eksik veya yanlış girilen bilgiler sonuçları etkileyebilir. Girdiğiniz bilgileri kontrol etmeniz önemlidir.',
        },
        {
          title: '5. Mesai+ Pro',
          body: 'Mesai+ Pro, tek seferlik bir uygulama içi satın almadır; abonelik değildir. Satın alma tamamlandığında Pro özellikleri uygulamada aktif hale gelir.',
        },
        {
          title: '6. Ödeme ve Faturalandırma',
          body: 'Ödemeler, Google Play veya App Store hesabınız üzerinden gerçekleştirilir. Mesai+ kart numaranızı, CVV bilginizi veya banka ödeme bilgilerinizi doğrudan almaz. Gösterilen fiyat, satın alma sırasında ilgili mağazada görüntülenen güncel fiyattır.',
        },
        {
          title: '7. Satın Alımları Geri Yükleme',
          body: 'Mesai+ Pro satın alımınız, uygun durumlarda aynı mağaza hesabıyla "Satın Alımları Geri Yükle" özelliği kullanılarak yeniden doğrulanabilir.',
        },
        {
          title: '8. İptal ve İade',
          body: 'Mesai+ Pro bir abonelik değildir. Satın alma iadeleri Mesai+ tarafından doğrudan işlenmez; iade talepleri, satın almanın yapıldığı Google Play veya App Store\'un geçerli politikalarına ve süreçlerine tabidir.',
        },
        {
          title: '9. Gizlilik',
          body: 'Kişisel verilerinizin nasıl işlendiği ve saklandığı, uygulamanın Gizlilik Politikası\'nda ayrıca açıklanmaktadır.',
        },
        {
          title: '10. Fikri Mülkiyet',
          body: 'Mesai+ uygulamasının adı, tasarımı, yazılımı ve özgün içerikleri ilgili fikri mülkiyet hakları kapsamında korunmaktadır.',
        },
        {
          title: '11. Hizmet ve Sorumluluk',
          body: 'Uygulamanın özellikleri zaman içinde güncellenebilir veya değiştirilebilir. Hizmetin kesintisiz veya hatasız çalışacağı garanti edilmez. Resmi, hukuki veya mali kararlarınızı yalnızca uygulamadaki hesaplama sonuçlarına dayandırmamanızı öneririz.',
        },
        {
          title: '12. Koşullardaki Değişiklikler',
          body: 'Bu koşullar, uygulamadaki özellikler veya gereksinimler değiştikçe güncellenebilir.',
        },
        {
          title: '13. İletişim',
          body: 'Sorularınız için: support@mesaiplus.app',
        },
      ]
    : [
        {
          title: '1. Introduction',
          body: 'By using the Mesai+ app, you agree to these Terms of Use. Please read them before using the app.',
        },
        {
          title: '2. Description of Service',
          body: 'Mesai+ offers tools for tracking work and overtime records, salary and payroll calculations, annual leave tracking, severance/notice/unemployment and similar calculators, reporting, and related utilities. Some of these features may require Mesai+ Pro.',
        },
        {
          title: '3. Calculations',
          body: 'Calculations made by the app are for informational purposes only. Results do not constitute official payroll, legal, financial, or accounting advice. We recommend consulting a relevant professional, your accounting department, or the appropriate authority for official matters.',
        },
        {
          title: '4. User-Provided Data',
          body: 'Calculation results are based on the information you enter into the app. Missing or incorrect information may affect the results. It is important to check the information you enter.',
        },
        {
          title: '5. Mesai+ Pro',
          body: 'Mesai+ Pro is a one-time in-app purchase; it is not a subscription. Once the purchase is completed, Pro features become active in the app.',
        },
        {
          title: '6. Payment and Billing',
          body: 'Payments are made through your Google Play or App Store account. Mesai+ does not directly collect your card number, CVV, or bank payment details. The price shown is the current price displayed by the respective store at the time of purchase.',
        },
        {
          title: '7. Restore Purchases',
          body: 'Your Mesai+ Pro purchase can, where applicable, be re-verified using the "Restore Purchases" feature with the same store account.',
        },
        {
          title: '8. Cancellation and Refunds',
          body: 'Mesai+ Pro is not a subscription. Purchase refunds are not processed directly by Mesai+; refund requests are subject to the applicable policies and processes of the Google Play or App Store where the purchase was made.',
        },
        {
          title: '9. Privacy',
          body: 'How your personal data is processed and stored is explained separately in the app\'s Privacy Policy.',
        },
        {
          title: '10. Intellectual Property',
          body: 'The name, design, software, and original content of the Mesai+ app are protected under applicable intellectual property rights.',
        },
        {
          title: '11. Service and Liability',
          body: 'The app\'s features may be updated or changed over time. We do not guarantee that the service will be uninterrupted or error-free. We recommend not basing official, legal, or financial decisions solely on the calculation results in the app.',
        },
        {
          title: '12. Changes to These Terms',
          body: 'These terms may be updated as the app\'s features or requirements change.',
        },
        {
          title: '13. Contact',
          body: 'For questions: support@mesaiplus.app',
        },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isTr ? 'Kullanım Koşulları' : 'Terms of Use'}
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
