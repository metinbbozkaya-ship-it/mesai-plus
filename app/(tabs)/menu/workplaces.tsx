import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../src/context/AppContext';
import { useToast } from '../../../src/context/ToastContext';
import { usePro } from '../../../src/context/ProContext';
import { getColors, radius, spacing } from '../../../src/theme';
import type { Workplace } from '../../../src/storage/db';

const EMOJI_OPTIONS = ['🏢', '🏬', '💼', '🏭', '🛠️', '💻', '🏥', '🏫', '🍽️', '🚚', '✈️', '🛩️', '🏪', '🔧', '🎨'];
const COLOR_OPTIONS = ['#8B5CF6', '#22D3EE', '#F97316', '#EF4444', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#84CC16', '#6366F1'];

export default function WorkplacesScreen() {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const { workplaces, addWorkplace, updateWorkplace, deleteWorkplace, activeWorkplaceId, setActiveWorkplaceId, theme, language } = useApp();
  const { isPro } = usePro();
  const toast = useToast();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isTr ? 'İş Yerleri' : 'Workplaces',
      headerTintColor: colors.text,
    });
  }, [language, navigation, colors, isTr]);

  const openAdd = () => {
    if (!isPro && workplaces.length >= 1) {
      Alert.alert(
        isTr ? 'Pro Gerekli' : 'Pro Required',
        isTr
          ? 'Çoklu iş yeri eklemek için Mesai+ Pro’ya yükseltin.'
          : 'Upgrade to Mesai+ Pro to add multiple workplaces.',
        [
          { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
          { text: isTr ? 'Pro’ya Yükselt' : 'Upgrade', onPress: () => router.push('/upgrade') },
        ]
      );
      return;
    }
    setEditing(null);
    setName('');
    setEmoji(EMOJI_OPTIONS[0]);
    setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
    setModalVisible(true);
  };

  const openEdit = (w: Workplace) => {
    setEditing(w);
    setName(w.name);
    setEmoji(w.emoji);
    setColor(w.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(isTr ? 'İsim boş olamaz' : 'Name required');
      return;
    }
    if (editing) {
      await updateWorkplace(editing.id, { name: trimmed, emoji, color });
      toast.success(isTr ? 'Güncellendi' : 'Updated');
    } else {
      const nw = await addWorkplace({ name: trimmed, emoji, color });
      if (nw) {
        toast.success(isTr ? 'İş yeri eklendi' : 'Workplace added');
        // Auto-activate if it's the first
        if (workplaces.length === 0) {
          await setActiveWorkplaceId(nw.id);
        }
      }
    }
    setModalVisible(false);
  };

  const handleDelete = (w: Workplace) => {
    Alert.alert(
      isTr ? 'İş Yerini Sil' : 'Delete Workplace',
      isTr
        ? `"${w.name}" silinsin mi? Bu iş yerine bağlı girişler silinmez, sadece etiketleri kalkar.`
        : `Delete "${w.name}"? Entries tagged with it will remain but lose the tag.`,
      [
        { text: isTr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWorkplace(w.id);
            toast.info(isTr ? 'Silindi' : 'Deleted');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.bg, colors.bg2]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{isTr ? '🏢 İş Yerleri' : '🏢 Workplaces'}</Text>
            <Text style={styles.subtitle}>
              {isTr
                ? 'Birden fazla iş yerinde çalışıyorsan girişlerini ayrı takip et'
                : 'Track entries separately if you work at multiple places'}
            </Text>
          </View>
        </View>

        {/* All entries option */}
        <Pressable
          onPress={() => setActiveWorkplaceId('')}
          style={[
            styles.card,
            { flexDirection: 'row', alignItems: 'center', gap: 12 },
            activeWorkplaceId === '' && { borderColor: colors.accent, borderWidth: 2 },
          ]}
        >
          <View style={[styles.wpIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="grid" size={22} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.wpName}>{isTr ? 'Tümü' : 'All'}</Text>
            <Text style={styles.wpMeta}>
              {isTr ? 'Tüm iş yerlerini birlikte gör' : 'Show all workplaces together'}
            </Text>
          </View>
          {activeWorkplaceId === '' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
          )}
        </Pressable>

        {workplaces.map((w) => (
          <View
            key={w.id}
            style={[
              styles.card,
              activeWorkplaceId === w.id && { borderColor: w.color, borderWidth: 2 },
            ]}
          >
            <Pressable
              onPress={() => setActiveWorkplaceId(w.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={[styles.wpIcon, { backgroundColor: w.color + '22' }]}>
                <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wpName}>{w.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: w.color }} />
                  <Text style={styles.wpMeta}>
                    {activeWorkplaceId === w.id
                      ? (isTr ? 'Aktif' : 'Active')
                      : (isTr ? 'Seçmek için dokun' : 'Tap to activate')}
                  </Text>
                </View>
              </View>
              {activeWorkplaceId === w.id && (
                <Ionicons name="checkmark-circle" size={22} color={w.color} />
              )}
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
              <Pressable
                onPress={() => openEdit(w)}
                style={[styles.smallBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="pencil" size={14} color={colors.text} />
                <Text style={[styles.smallBtnText, { color: colors.text }]}>
                  {isTr ? 'Düzenle' : 'Edit'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(w)}
                style={[styles.smallBtn, { backgroundColor: colors.danger + '22' }]}
              >
                <Ionicons name="trash" size={14} color={colors.danger} />
                <Text style={[styles.smallBtnText, { color: colors.danger }]}>
                  {isTr ? 'Sil' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable onPress={openAdd}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {isTr ? 'İş Yeri Ekle' : 'Add Workplace'}
            </Text>
            {!isPro && workplaces.length >= 1 && (
              <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
            )}
          </LinearGradient>
        </Pressable>

        {!isPro && (
          <View style={[styles.card, { borderColor: colors.accent + '55', borderWidth: 1 }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
              ✨ {isTr ? 'Pro Avantajı' : 'Pro Benefit'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {isTr
                ? 'Ücretsiz sürümde 1 iş yeri kullanabilirsin. Mesai+ Pro ile sınırsız iş yeri, ayrı raporlar ve daha fazlası.'
                : 'Free version allows 1 workplace. Mesai+ Pro unlocks unlimited workplaces, separate reports, and more.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={styles.modalTitle}>
                {editing ? (isTr ? 'İş Yerini Düzenle' : 'Edit Workplace') : (isTr ? 'Yeni İş Yeri' : 'New Workplace')}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>{isTr ? 'İsim' : 'Name'}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={isTr ? 'Ör: Ana İş, Freelance' : 'e.g. Main Job, Freelance'}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              maxLength={30}
            />

            <Text style={styles.fieldLabel}>{isTr ? 'Emoji' : 'Emoji'}</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[
                    styles.emojiOpt,
                    emoji === e && { borderColor: color, borderWidth: 2, backgroundColor: color + '22' },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{isTr ? 'Renk' : 'Color'}</Text>
            <View style={styles.emojiGrid}>
              {COLOR_OPTIONS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorOpt,
                    { backgroundColor: c },
                    color === c && { borderColor: '#FFFFFF', borderWidth: 3 },
                  ]}
                />
              ))}
            </View>

            <Pressable onPress={handleSave} style={{ marginTop: spacing.md }}>
              <LinearGradient
                colors={[color, color + 'AA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>
                  {editing ? (isTr ? 'Güncelle' : 'Update') : (isTr ? 'Ekle' : 'Add')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: colors.text, fontSize: 22, fontWeight: '800' },
    subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4, maxWidth: 300 },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    wpIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wpName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    wpMeta: { color: colors.textMuted, fontSize: 12 },
    smallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.md,
    },
    smallBtnText: { fontSize: 12, fontWeight: '600' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: radius.md,
    },
    addBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.bg2,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
    fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: spacing.md, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    emojiOpt: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    colorOpt: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: radius.md,
    },
    saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  });
