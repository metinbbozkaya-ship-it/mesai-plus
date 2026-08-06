import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, TextInput, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getColors, radius, spacing } from '../theme';
import { useApp } from '../context/AppContext';

export interface MenuLeaf {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
}

export interface MenuGroup {
  id: string;
  label: string;
  subtitle?: string;
  icon: string;
  children: MenuLeaf[];
}

export type MenuNode = MenuLeaf | MenuGroup;

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  items: MenuNode[];
}

const DANGER_COLOR = '#FF3B30';

function isGroup(n: MenuNode): n is MenuGroup {
  return (n as MenuGroup).children !== undefined;
}

export function MenuDrawer({ visible, onClose, items }: MenuDrawerProps) {
  const { theme, language } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const isTr = language === 'tr';

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
      translateX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
      translateX.value = withTiming(-320, { duration: 220, easing: Easing.in(Easing.cubic) });
      setQuery('');
    }
  }, [visible, translateX, opacity]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const regular = useMemo(() => items.filter(i => !((i as MenuLeaf).danger === true && !isGroup(i))), [items]);
  const danger = useMemo(() => items.filter(i => !isGroup(i) && (i as MenuLeaf).danger) as MenuLeaf[], [items]);

  // Flatten leaves for search results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const results: MenuLeaf[] = [];
    for (const n of items) {
      if (isGroup(n)) {
        for (const c of n.children) if (c.label.toLowerCase().includes(q)) results.push(c);
      } else if ((n as MenuLeaf).label.toLowerCase().includes(q)) {
        results.push(n as MenuLeaf);
      }
    }
    return results;
  }, [query, items]);

  if (!visible) return null;

  const renderLeaf = (item: MenuLeaf, inGroup = false) => (
    <Pressable
      key={item.id}
      onPress={() => { item.onPress(); onClose(); }}
      style={({ pressed }) => [styles.menuItem, inGroup && styles.subItem, pressed && styles.menuItemPressed]}
    >
      <View style={[styles.iconContainer, inGroup && { width: 28, height: 28, borderRadius: 8 }]}>
        <Ionicons name={item.icon as any} size={inGroup ? 15 : 18} color={colors.accent} />
      </View>
      <Text style={[styles.menuLabel, inGroup && { fontSize: 14, fontWeight: '500' }]} numberOfLines={1}>{item.label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
      </Pressable>

      <Animated.View style={[styles.drawer, { backgroundColor: colors.bg }, drawerAnimatedStyle]}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.appName}>Mesai+</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={isTr ? 'Menüde ara…' : 'Search menu…'}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.menuList} contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
            {searchResults !== null ? (
              searchResults.length === 0 ? (
                <Text style={styles.emptySearch}>{isTr ? 'Sonuç bulunamadı' : 'No results'}</Text>
              ) : (
                searchResults.map(r => renderLeaf(r))
              )
            ) : (
              <>
                {regular.map((node) => {
                  if (!isGroup(node)) return renderLeaf(node as MenuLeaf);
                  const g = node as MenuGroup;
                  const open = openId === g.id;
                  return (
                    <View key={g.id}>
                      <Pressable
                        onPress={() => setOpenId(open ? null : g.id)}
                        style={({ pressed }) => [styles.groupHeader, open && styles.groupHeaderOpen, pressed && styles.menuItemPressed]}
                      >
                        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '1F' }]}>
                          <Ionicons name={g.icon as any} size={18} color={colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.menuLabel} numberOfLines={1}>{g.label}</Text>
                          {!!g.subtitle && (
                            <Text style={styles.groupSubtitle} numberOfLines={1}>{g.subtitle}</Text>
                          )}
                        </View>
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                      </Pressable>
                      {open && (
                        <View style={styles.groupChildren}>
                          {g.children.map(c => renderLeaf(c, true))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {danger.length > 0 && (
                  <>
                    <View style={styles.sectionDivider} />
                    {danger.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => item.onPress()}
                        style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                      >
                        <View style={[styles.iconContainer, { backgroundColor: DANGER_COLOR + '18' }]}>
                          <Ionicons name={item.icon as any} size={18} color={DANGER_COLOR} />
                        </View>
                        <Text style={[styles.menuLabel, { color: DANGER_COLOR }]}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </>
                )}
              </>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={styles.footerText}>Mesai+ v9.1.0</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function getStyles(colors: typeof import('../theme').darkColors) {
  return StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawer: {
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: Math.min(Math.max(Dimensions.get('window').width * 0.82, 260), 340),
      shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8,
      elevation: 16, zIndex: 1001,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    },
    appName: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
    closeButton: { padding: spacing.sm, marginRight: -spacing.sm },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: spacing.md, marginBottom: spacing.sm,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: radius.md, backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
    menuList: { flex: 1 },
    menuItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.md, paddingVertical: 10, gap: 12,
      marginHorizontal: spacing.sm, borderRadius: radius.md,
    },
    subItem: { paddingVertical: 8 },
    menuItemPressed: { backgroundColor: colors.surface },
    groupHeader: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.md, paddingVertical: 12, gap: 12,
      marginHorizontal: spacing.sm, marginTop: 2, borderRadius: radius.md,
    },
    groupHeaderOpen: { backgroundColor: colors.surface },
    iconContainer: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    menuLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
    groupSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    groupChildren: {
      marginLeft: spacing.md + 34 + 4,
      marginRight: spacing.sm,
      marginBottom: 4,
      borderLeftWidth: 1.5, borderLeftColor: colors.border,
      paddingLeft: 8,
    },
    sectionDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md, marginVertical: spacing.sm },
    emptySearch: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg, fontSize: 14 },
    footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, alignItems: 'center' },
    footerText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  });
}
