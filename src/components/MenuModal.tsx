import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, radius, spacing } from '../theme';
import { t } from '../utils/i18n';
import { useApp } from '../context/AppContext';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
}

export function MenuModal({ visible, onClose, items }: MenuModalProps) {
  const { theme } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);

  const renderItem = ({ item }: { item: MenuItem }) => (
    <Pressable
      onPress={() => {
        item.onPress();
        onClose();
      }}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    >
      <Ionicons name={item.icon as any} size={20} color={colors.accent} style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.menuContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Mesai+</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

function getStyles(colors: typeof import('../theme').darkColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-start',
    },
    menuContainer: {
      marginTop: Platform.OS === 'web' ? 56 : 56,
      marginLeft: 16,
      marginRight: 'auto',
      borderRadius: radius.lg,
      width: 280,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    menuHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    menuItemPressed: {
      backgroundColor: colors.surface,
    },
    menuIcon: {
      width: 24,
      textAlign: 'center',
    },
    menuLabel: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
  });
}
