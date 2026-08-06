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
import { loadReceivables, saveReceivables, Receivable } from '../../../src/storage/finance';

export default function ReceivablesScreen() {
  const { theme, language } = useApp();
  const { isPro } = usePro();
  const toast = useToast();
  const router = useRouter();
  const colors = getColors(theme);
  const isTr = language === 'tr';

  const [items, setItems] = useState<Receivable[]>([]);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [editItem, setEditItem] = useState<Receivable | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const reload = useCallback(async () => setItems(await loadReceivables()), []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const totals = useMemo(() => {
    let unpaid = 0, paid = 0;
    items.forEach(i => { if (i.paid) paid += i.amount; else unpaid += i.amount; });
    return { unpaid, paid, count: items.filter(i => !i.paid).length };
  }, [items]);

  const add = async () => {
    const n = parseFloat(amount.replace(',', '.'));
    if (!label.trim() || !isFinite(n) || n <= 0) {
      toast.warning(isTr ? 'Geçerli tutar ve açıklama girin' : 'Enter a valid amount and label');
      return;
    }
    const next: Receivable = {
      id: `r_${Date.now()}`, label: label.trim(), amount: n, paid: false, createdAt: new Date().toISOString(),
    };
    const list = [next, ...items];
    setItems(list); await saveReceivables(list);
    setLabel(''); setAmount('');
    toast.success(isTr ? 'Alacak eklendi' : 'Receivable added');
  };

  const togglePaid = async (id: string) => {
    const list = items.map(i => i.id === id ? { ...i, paid: !i.paid } : i);
    setItems(list); await saveReceivables(list);
  };

  const remove = (id: string) => {
    Alert.alert(isTr ? 'Sil?' : 'Delete?', isTr ? 'Bu kayıt silinsin mi?' : 'Delete this item?', [
      { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
      { text: isTr ? 'Sil' : 'Delete', style: 'destructive', onPress: async () => {
        const list = items.filter(i => i.id !== id);
        setItems(list); await saveReceivables(list);
        toast.info(isTr ? 'Silindi' : 'Deleted');
      }},
    ]);
  };

  const openEdit = (item: Receivable) => {
    setEditItem(item);
    setEditLabel(item.label);
    setEditAmount(String(item.amount));
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const n = parseFloat(editAmount.replace(',', '.'));
    if (!editLabel.trim() || !isFinite(n) || n <= 0) {
      toast.warning(isTr ? 'Geçerli tutar ve açıklama girin' : 'Enter valid data');
      return;
    }
    const list = items.map(i => i.id === editItem.id ? { ...i, label: editLabel.trim(), amount: n } : i);
    setItems(list); await saveReceivables(list);
    setEditItem(null);
    toast.success(isTr ? 'Güncellendi' : 'Updated');
  };

  if (!isPro) {
    return <ProGate icon="cash-outline"
      title={isTr ? '💸 Alacak Takibi' : '💸 Receivables'}
      subtitle={isTr ? 'Ödenmeyen mesai, prim ve alacaklarınızı tek yerden takip edin.' : 'Track unpaid overtime, bonuses and receivables in one place.'}
      features={[
        isTr ? '✅ Sınırsız alacak kaydı' : '✅ Unlimited receivables',
        isTr ? '✅ Ödenen / ödenmeyen ayırımı' : '✅ Paid / unpaid tracking',
        isTr ? '✅ Toplam borcun canlı görüntüsü' : '✅ Live total debt view',
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isTr ? 'Alacak Takibi' : 'Receivables'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>{isTr ? 'Toplam Alacak' : 'Total Owed'}</Text>
          <Text style={styles.heroAmount}>₺{totals.unpaid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{totals.count}</Text>
              <Text style={styles.heroStatLabel}>{isTr ? 'Bekleyen' : 'Pending'}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>₺{totals.paid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Text>
              <Text style={styles.heroStatLabel}>{isTr ? 'Tahsil' : 'Collected'}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{isTr ? 'Yeni Alacak' : 'New Receivable'}</Text>
          <TextInput value={label} onChangeText={setLabel}
            placeholder={isTr ? 'Açıklama (örn. Nisan mesai)' : 'Label (e.g. April overtime)'}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
          />
          <TextInput value={amount} onChangeText={setAmount}
            placeholder={isTr ? 'Tutar (₺)' : 'Amount'} keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
          />
          <Pressable onPress={add}>
            <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addBtnText}>{isTr ? 'Ekle' : 'Add'}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="cash-outline" size={44} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 12 }}>{isTr ? 'Henüz alacak yok' : 'No receivables yet'}</Text>
          </View>
        ) : items.map(item => (
          <View key={item.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, opacity: item.paid ? 0.55 : 1 }]}>
            <Pressable onPress={() => togglePaid(item.id)} style={[styles.check, { borderColor: item.paid ? colors.primary : colors.border, backgroundColor: item.paid ? colors.primary : 'transparent' }]}>
              {item.paid && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </Pressable>
            <Pressable onPress={() => openEdit(item)} style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600', textDecorationLine: item.paid ? 'line-through' : 'none' }}>{item.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
            </Pressable>
            <Text style={{ color: item.paid ? colors.textMuted : colors.accent, fontWeight: '700', fontSize: 16 }}>₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{isTr ? 'Alacak Düzenle' : 'Edit Receivable'}</Text>
            <TextInput value={editLabel} onChangeText={setEditLabel}
              placeholder={isTr ? 'Açıklama' : 'Label'} placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
            <TextInput value={editAmount} onChangeText={setEditAmount}
              placeholder={isTr ? 'Tutar' : 'Amount'} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            />
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

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  hero: { padding: spacing.lg, borderRadius: 32, marginBottom: spacing.md },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 6 },
  heroRow: { flexDirection: 'row', marginTop: spacing.md, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: radius.md, paddingVertical: 10 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
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
