import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getColors, radius, spacing } from '../../../src/theme';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { ProGate } from '../../../src/components/ProGate';

interface QA { q: string; a: string; icon: keyof typeof Ionicons.glyphMap; }

const FAQ_TR: QA[] = [
  { icon: 'time-outline', q: 'Fazla mesai ücreti nasıl hesaplanır?', a: 'Haftalık 45 saati aşan çalışmalar fazla mesai sayılır. Fazla mesai ücreti, normal saat ücretinin %50 fazlasıyla ödenir (×1.5). Hafta tatili ve resmi tatillerde çalışılan saatler ise %100 zamlı (×2) ödenir.' },
  { icon: 'calendar-outline', q: 'Yıllık izin hakkım kaç gün?', a: '1-5 yıl arası hizmet: 14 gün.\n5-15 yıl arası: 20 gün.\n15 yıl ve üzeri: 26 gün.\n18 yaşın altı ve 50 yaşın üstünde olanlara en az 20 gün izin verilir.' },
  { icon: 'wallet-outline', q: 'Kıdem tazminatı nasıl hesaplanır?', a: 'Her tam çalışılan yıl için son aldığınız brut aylık ücret kadar kıdem tazminatına hak kazanırsınız. En az 1 yıl çalışmış olmak ve iş akdinin belirli sebeplerle sona ermiş olması gerekir.' },
  { icon: 'mail-outline', q: 'İhbar süresi nedir?', a: '6 aya kadar: 2 hafta.\n6 ay - 1.5 yıl: 4 hafta.\n1.5 - 3 yıl: 6 hafta.\n3 yıldan fazla: 8 hafta.\nİşveren bu süreleri veya karşılığını ödemek zorundadır.' },
  { icon: 'medkit-outline', q: 'Hastalık raporunda ücret alır mıyım?', a: 'İlk 2 gün için SGK ödeme yapmaz. 3. günden itibaren SGK geçici iş göremezlik ödeneği verir (günlük kazançınızın %50-66’sı). İşverenin farkı ödemesi zorunlu değildir ama bazı sözleşmelerde ödenebilir.' },
  { icon: 'moon-outline', q: 'Gece çalışması kuralları nedir?', a: 'Gece çalışması 20:00-06:00 arasıdır. Günde 7.5 saati aşamaz. Fazla çalışılan süre zamlı ücrete tabidir.' },
  { icon: 'people-outline', q: 'Deneme süresi kaç gundür?', a: 'Kanunen en fazla 2 aydır. Toplu iş sözleşmesiyle 4 aya kadar uzatılabilir. Deneme süresinde taraflar bildirimsiz ve tazminatsız iş akdini feshedebilir.' },
  { icon: 'business-outline', q: 'Asgari ücret 2026 ne kadar?', a: '2026 yılı net asgari ücret: 28.075,50 ₺.\nBrüt: 33.030,00 ₺.\nGünlük brüt asgari ücret: 1.101,00 ₺.\nAsgari ücret desteği: 1.270,00 ₺.' },
  { icon: 'ban-outline', q: 'Haklı fesih nedenleri nelerdir?', a: 'Ücret ödenmemesi, mobbing, sağlık tehlikesi, cinsel taciz, iş değişikliği kabul edilmemesi gibi durumlarda işçi sözleşmeyi haklı nedenle feshedebilir ve kıdem tazminatına hak kazanır.' },
  { icon: 'shield-checkmark-outline', q: 'İşsizlik maaşı koşulları nedir?', a: 'Son 3 yılda en az 600 gün SGK primi ödemiş olmak, son 120 günde kesintisiz çalışmış olmak ve iş akdinin kendi isteği dışında sona ermiş olması gerekir. 6-10 ay arası ödeme yapılır.' },
];

const FAQ_EN: QA[] = FAQ_TR.map((_, i) => ({
  icon: FAQ_TR[i].icon,
  q: ['How is overtime calculated?','How many annual leave days?','How is severance calculated?','What is notice period?','Do I get paid on sick leave?','Night work rules?','How long is probation?','2026 minimum wage?','What are just cause reasons?','Unemployment benefit conditions?'][i],
  a: FAQ_TR[i].a,
}));

export default function LaborLawScreen() {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const colors = getColors(theme);
  const isTr = language === 'tr';
  const faq = isTr ? FAQ_TR : FAQ_EN;
  const [open, setOpen] = useState<number | null>(0);

  if (!isPro) {
    return <ProGate icon="book-outline"
      title={isTr ? '⚖️ İş Kanunu Rehberi' : '⚖️ Labor Law Guide'}
      subtitle={isTr ? 'Mesai, izin, tazminat, ihbar ve daha fazlası hakkında hızlı cevaplar.' : 'Quick answers about overtime, leave, severance, notice and more.'}
      features={[
        isTr ? '✅ 10+ sık sorulan soru' : '✅ 10+ frequent questions',
        isTr ? '✅ Güncel 2026 rakamları' : '✅ Up-to-date 2026 figures',
        isTr ? '✅ Türk İş Kanunu odaklı' : '✅ Focused on Turkish Labor Law',
      ]}
    />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="book" size={28} color="#FFFFFF" />
          <Text style={styles.heroTitle}>{isTr ? 'İş Kanunu Rehberi' : 'Labor Law Guide'}</Text>
          <Text style={styles.heroSub}>{isTr ? 'Bilgi amaçlıdır. Yasal danışmanlık için uzmana başvurun.' : 'For information only. Consult a specialist for legal advice.'}</Text>
        </LinearGradient>

        {faq.map((item, idx) => (
          <Pressable key={idx} onPress={() => setOpen(open === idx ? null : idx)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.q, { color: colors.text }]}>{item.q}</Text>
              <Ionicons name={open === idx ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
            </View>
            {open === idx && (
              <Text style={[styles.a, { color: colors.textMuted }]}>{item.a}</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md, alignItems: 'flex-start' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  q: { flex: 1, fontSize: 14, fontWeight: '600' },
  a: { fontSize: 14, lineHeight: 21, marginTop: 12, paddingLeft: 44 },
});
