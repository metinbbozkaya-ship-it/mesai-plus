import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform, LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getColors } from '../theme';
import { useApp } from '../context/AppContext';

/**
 * Custom animated tab bar with a sliding pill indicator behind the active tab.
 * Blur backdrop on native, solid on web.
 */
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useApp();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  // Filter out hidden tabs. In expo-router, `href: null` results in
  // `tabBarButton: () => null` being injected — detect that, and also
  // fall back to "must have an icon" as a safety net.
  const visibleRoutes = state.routes.filter((r) => {
    const opts = descriptors[r.key]?.options as any;
    if (!opts) return false;
    if (opts.href === null) return false;
    if (typeof opts.tabBarButton === 'function') return false;
    if (!opts.tabBarIcon) return false;
    return true;
  });
  const activeIdx = visibleRoutes.findIndex((r) => r.key === state.routes[state.index]?.key);

  const [tabWidth, setTabWidth] = React.useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabWidth > 0 && activeIdx >= 0) {
      Animated.spring(translateX, {
        toValue: activeIdx * tabWidth,
        damping: 20,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIdx, tabWidth, translateX]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (visibleRoutes.length > 0) {
      setTabWidth(w / visibleRoutes.length);
    }
  };

  const barBg =
    Platform.OS === 'web'
      ? colors.bg2
      : theme === 'dark'
      ? 'rgba(11,11,20,0.85)'
      : 'rgba(248,250,252,0.85)';

  return (
    <View
      style={{
        paddingBottom: insets.bottom + 4,
        paddingTop: 6,
        height: 64 + insets.bottom,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
        backgroundColor: barBg,
        overflow: 'hidden',
      }}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          tint={theme === 'dark' ? 'dark' : 'light'}
          intensity={80}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.row} onLayout={onLayout}>
        {tabWidth > 0 && activeIdx >= 0 && (
          <Animated.View
            style={[
              styles.pillWrap,
              {
                width: tabWidth - 12,
                marginLeft: 6,
                transform: [{ translateX }],
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[colors.primary + '35', colors.accent + '35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pill}
            />
          </Animated.View>
        )}

        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const label =
            (options.tabBarLabel as string) ??
            options.title ??
            route.name;

          const onPress = () => {
            if (Platform.OS !== 'web') {
              Haptics.selectionAsync().catch(() => {});
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const isCenter = route.name === 'entry';

          if (isCenter) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={({ pressed }) => [styles.tab, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={focused ? { selected: true } : {}}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.centerBtn, { shadowColor: colors.primary }]}
                >
                  <Ionicons name="add" size={26} color="#fff" />
                </LinearGradient>
              </Pressable>
            );
          }

          const color = focused ? colors.accent : colors.textMuted;
          const icon = options.tabBarIcon?.({ focused, color, size: 22 });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
            >
              <TabIcon focused={focused}>{icon}</TabIcon>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color,
                    fontWeight: focused ? '800' : '600',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.12 : 1,
      damping: 12,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
  },
  pillWrap: {
    position: 'absolute',
    top: 4,
    bottom: 4,
  },
  pill: {
    flex: 1,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  centerBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
