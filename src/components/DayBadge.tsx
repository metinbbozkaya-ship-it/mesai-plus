import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getColors, radius } from '../theme';
import { DayType, getDayTypeLabel, getMultiplier } from '../utils/salary';
import { useApp } from '../context/AppContext';

export function DayBadge({ dayType, showMultiplier = true }: { dayType: DayType; showMultiplier?: boolean }) {
  const { theme } = useApp();
  const colors = getColors(theme);
  
  const bg = (() => {
    switch (dayType) {
      case 'weekday': return colors.weekday;
      case 'saturday': return colors.saturday;
      case 'sunday': return colors.sunday;
      case 'holiday': return colors.holiday;
      default: return colors.primary;
    }
  })();
  
  // Text color: white in dark mode, dark gray in light mode
  const textColor = theme === 'dark' ? '#fff' : '#1F2937';
  
  const m = getMultiplier(dayType);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: textColor }]}>
        {getDayTypeLabel(dayType)}{showMultiplier ? `  ×${m}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
