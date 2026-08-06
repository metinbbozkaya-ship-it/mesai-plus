import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme';

interface Props {
  size?: 'sm' | 'md';
  glow?: boolean;
}

/**
 * ProBadge — premium gradient badge for Pro users
 * Optional shimmer glow animation
 */
export function ProBadge({ size = 'md', glow = true }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!glow) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, glow]);

  const scale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  const isSmall = size === 'sm';
  const iconSize = isSmall ? 10 : 12;
  const fontSize = isSmall ? 10 : 12;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: glow ? opacity : 1 }}>
      <LinearGradient
        colors={['#FFD700', '#D4AF37', '#B8860B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, isSmall && styles.badgeSmall]}
      >
        <Ionicons name="star" size={iconSize} color="#1A1A24" />
        <Text style={[styles.text, { fontSize }]}>PRO</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: '#1A1A24',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
