import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { getColors, radius, spacing } from '../../../src/theme';
import { useApp } from '../../../src/context/AppContext';
import { usePro } from '../../../src/context/ProContext';
import { useToast } from '../../../src/context/ToastContext';
import { ProGate } from '../../../src/components/ProGate';
import { loadAdvances, saveAdvances, Advance } from '../../../src/storage/finance';

export default function AdvancesScreen() {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const toast = useToast();
  const router = useRouter();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [items, setItems] = useState<Advance[]>([]);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [editItem, setEditItem] = useState<Advance | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const reload = useCallback(async () => setItems(await loadAdvances()), []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const totals = useMemo(() => {
    let open = 0, repaid = 0;
    items.forEach(i => { if (i.repaid) repaid += i.amount; else open += i.amount; });
    return { open, repaid };
  }, [items]);

  const add = async () => {
    const n = parseFloat(amount.replace(',', '.'));
    if (!label.trim() || !isFinite(n) || n <= 0) {
      toast.warning(isTr ? 'Geçerli tutar girin' : 'Enter a valid amount');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const next: Advance = {
      id: `a_${Date.now()}`, label: label.trim(), amount: n, date: today, repaid: false, createdAt: new Date().toISOString(),
    };
    const list = [next, ...items];
    setItems(list); await saveAdvances(list);
    setLabel(''); setAmount('');
    toast.success(isTr ? 'Avans eklendi' : 'Advance added');
  };

  const toggle = async (id: string) => {
    const list = items.map(i => i.id === id ? { ...i, repaid: !i.repaid } : i);
    setItems(list); await saveAdvances(list);
  };

  const remove = (id: string) => {
    Alert.alert(isTr ? 'Sil?' : 'Delete?', isTr ? 'Silinsin mi?' : 'Delete?', [
      { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
        const list = items.filter(i => i.id !== id);
        setItems(list); await saveAdvances(list);
        toast.info(isTr ? 'Silindi' : 'Deleted');
      }},
    ]);
  };

  const openEdit = (item: Advance) => {
    setEditItem(item);
    setEditLabel(item.label);
    setEditAmount(String(item.amount));
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const n = parseFloat(editAmount.replace(',', '.'));
    if (!editLabel.trim() || !isFinite(n) || n <= 0) {
      toast.warning(isTr ? 'Geçerli tutar girin' : 'Enter valid data');
      return;
    }
    const list = items.map(i => i.id === editItem.id ? { ...i, label: editLabel.trim(), amount: n } : i);
    setItems(list); await saveAdvances(list);
    setEditItem(null);
    toast.success(isTr ? 'Güncellendi' : 'Updated');
  };

  if (!isPro) {
    return <ProGate icon="card-outline"
      title={isTr ? '💳 Avans Takibi' : '💳 Advance Tracking'}
      subtitle={isTr ? 'Aldığınız avansları ve kalan bakiyeleri kolayca takip edin.' : 'Track your advances and remaining balances easily.'}
      features={[
        isTr ? '✅ Sınırsız avans kaydı' : '✅ Unlimited advances',
        isTr ? '✅ Açık / kapalı bakiye' : '✅ Open / closed balance',
        isTr ? '✅ Toplam borç görüntüsü' : '✅ Total debt view',
      ]}
    />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg2]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isTr ? 'Avans Takibi' : 'Advances'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <LinearGradient colors={['#F97316', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={heroStyles.hero}>
          <Text style={heroStyles.heroLabel}>{isTr ? 'Açık Avans Bakiyesi' : 'Open Advance Balance'}</Text>
          <Text style={heroStyles.heroAmount}>₺{totals.open.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={heroStyles.heroSub}>{isTr ? `Kapatılan: ₺${totals.repaid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : `Closed: ₺${totals.repaid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Yeni Avans' : 'New Advance'}</Text>
          <TextInput value={label} onChangeText={setLabel} placeholder={isTr ? 'Açıklama' : 'Label'} placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
          <TextInput value={amount} onChangeText={setAmount} placeholder={isTr ? 'Tutar (₺)' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
          <Pressable onPress={add}>
            <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addBtnText}>{isTr ? 'Ekle' : 'Add'}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="card-outline" size={44} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 12 }}>{isTr ? 'Henüz avans yok' : 'No advances yet'}</Text>
          </View>
        ) : items.map(item => (
          <View key={item.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, opacity: item.repaid ? 0.55 : 1 }]}>
            <Pressable onPress={() => toggle(item.id)} style={[styles.check, { borderColor: item.repaid ? colors.primary : colors.border, backgroundColor: item.repaid ? colors.primary : 'transparent' }]}>
              {item.repaid && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </Pressable>
            <Pressable onPress={() => openEdit(item)} style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600', textDecorationLine: item.repaid ? 'line-through' : 'none' }}>{item.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.date}</Text>
            </Pressable>
            <Text style={{ color: item.repaid ? colors.textMuted : '#F97316', fontWeight: '700', fontSize: 16 }}>₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Pressable onPress={() => remove(item.id)} style={{ marginLeft: 8, padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditItem(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.bg2 }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Avans Düzenle' : 'Edit Advance'}</Text>
            <TextInput value={editLabel} onChangeText={setEditLabel}
              placeholder={isTr ? 'Açıklama' : 'Label'} placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <TextInput value={editAmount} onChangeText={setEditAmount}
              placeholder={isTr ? 'Tutar' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable onPress={() => setEditItem(null)} style={[styles.modalBtn, { backgroundColor: colors.surface, flex: 1 }]}>
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={{ flex: 1 }}>
                <LinearGradient colors={[colors.primary, colors.accent]} style={styles.modalBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{isTr ? 'Kaydet' : 'Save'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const heroStyles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: 32, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
});
const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, marginTop: 4 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8, gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  modalBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
});
