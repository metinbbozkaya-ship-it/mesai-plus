import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getColors, radius, spacing } from '../theme';
import { formatTL } from '../utils/salary';

interface Props {
  current: number;
}

export function GoalCard({ current }: Props) {
  const { settings, updateSettings, theme, language } = useApp();
  const toast = useToast();
  const colors = getColors(theme);
  const isTr = language === 'tr';
  const goal = Number(settings?.monthlyGoal ?? 0) || 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(goal > 0 ? String(goal) : '');
  }, [goal, editing]);

  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const remaining = Math.max(0, goal - current);
  const reached = goal > 0 && current >= goal;

  const onSave = async () => {
    const num = parseFloat(draft.replace(',', '.')) || 0;
    if (num < 0) {
      toast.warning(isTr ? 'Hedef negatif olamaz' : 'Goal cannot be negative');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({ ...settings, monthlyGoal: num });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (goal <= 0) {
    return (
      <>
        <Pressable
          onPress={() => setEditing(true)}
          style={({ pressed }) => [
            styles.empty,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
            <Ionicons name="flag" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Aylık Hedef Belirle' : 'Set Monthly Goal'}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {isTr ? 'Mesai kazancınız için motivasyon hedefi' : 'Motivation goal for your overtime'}
            </Text>
          </View>
          <Ionicons name="add-circle" size={22} color={colors.accent} />
        </Pressable>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: (reached ? colors.success : colors.primary) + '22' }]}>
            <Ionicons name={reached ? 'trophy' : 'flag'} size={18} color={reached ? colors.success : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Aylık Mesai Hedefi' : 'Monthly Overtime Goal'}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {reached
                ? (isTr ? '🎉 Hedefe ulaştınız!' : '🎉 Goal reached!')
                : (isTr ? `${formatTL(remaining)} kaldı` : `${formatTL(remaining)} left`)}
            </Text>
          </View>
          <Pressable onPress={() => setEditing(true)} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.progressRow}>
          <Text style={[styles.amount, { color: colors.text }]}>{formatTL(current)}</Text>
          <Text style={[styles.amountTotal, { color: colors.textMuted }]}>/ {formatTL(goal)}</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.pct, { color: reached ? colors.success : colors.accent }]}>%{pct.toFixed(0)}</Text>
        </View>

        <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
          <LinearGradient
            colors={reached ? [colors.success, colors.success] : [colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${pct}%` }]}
          />
        </View>
      </View>
      {renderModal()}
    </>
  );

  function renderModal() {
    return (
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isTr ? 'Aylık Mesai Hedefi' : 'Monthly Overtime Goal'}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              {isTr ? 'Bu ay için hedeflediğiniz mesai kazancını (₺) girin.' : 'Enter your overtime earnings goal for this month (₺).'}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="5000"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              autoFocus
            />
            <View style={styles.modalRow}>
              <Pressable onPress={() => setEditing(false)} style={[styles.btn, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.btnText, { color: colors.text }]}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              {goal > 0 && (
                <Pressable
                  onPress={async () => { await updateSettings({ ...settings, monthlyGoal: 0 }); setEditing(false); }}
                  style={[styles.btn, { backgroundColor: colors.danger + '22' }]}
                >
                  <Text style={[styles.btnText, { color: colors.danger }]}>{isTr ? 'Sil' : 'Remove'}</Text>
                </Pressable>
              )}
              <Pressable onPress={onSave} disabled={saving} style={{ flex: 1 }}>
                <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  <Text style={[styles.btnText, { color: '#fff' }]}>{isTr ? 'Kaydet' : 'Save'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  card: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '900' },
  amountTotal: { fontSize: 12, fontWeight: '600' },
  pct: { fontSize: 14, fontWeight: '900' },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modal: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 18, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  btn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', flex: 1 },
  btnText: { fontSize: 13, fontWeight: '800' },
});
