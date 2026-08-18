import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDaysInMonth, toDateKey, TR_MONTHS, EN_MONTHS } from '../utils/dates';
import { getDayType } from '../utils/salary';

interface CalendarPickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  language: 'tr' | 'en';
  colors: any;
  entries?: { [key: string]: any };
}

// Monday-first week order
const TR_DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const EN_DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPicker({
  selectedDate,
  onDateSelect,
  onMonthChange,
  language,
  colors,
  entries = {},
}: CalendarPickerProps) {
  const days = language === 'tr' ? TR_DAYS_SHORT : EN_DAYS_SHORT;
  const months = language === 'tr' ? TR_MONTHS : EN_MONTHS;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Monday-first calendar (0 = Monday, 6 = Sunday)
  const firstDayOfWeek = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sun(0) to 6, Mon(1) to 0, etc
  }, [year, month]);

  const calendarDays = useMemo(() => {
    const result = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      result.push(null);
    }
    for (const day of daysInMonth) {
      result.push(day);
    }
    return result;
  }, [daysInMonth, firstDayOfWeek]);

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    onMonthChange?.(newDate);
  };

  const getDayStatus = (day: Date | null) => {
    if (!day) return { hasEntry: false, isAbsence: false };
    const key = toDateKey(day);
    const entry = entries[key];
    return {
      hasEntry: !!entry,
      isAbsence: entry?.isAbsence || false,
    };
  };

  const getDayColor = (day: Date | null) => {
    if (!day) return { bg: 'transparent', text: colors.textMuted };
    
    const isSelected = day.getDate() === selectedDay && day.getMonth() === month;
    const { hasEntry, isAbsence } = getDayStatus(day);
    const dayType = getDayType(day);
    
    // Selected day takes priority
    if (isSelected) {
      return { bg: colors.accent, text: '#fff' };
    }
    
    // Entry colors
    if (hasEntry) {
      return {
        bg: isAbsence ? colors.error : colors.success,
        text: '#fff',
      };
    }
    
    // Holiday - turuncu/amber color
    if (dayType === 'holiday') {
      return { bg: 'transparent', text: colors.holiday };
    }
    
    // Sunday - kırmızı/red color
    if (dayType === 'sunday') {
      return { bg: 'transparent', text: colors.sunday };
    }
    
    // Saturday - cyan/accent color
    if (dayType === 'saturday') {
      return { bg: 'transparent', text: colors.saturday };
    }
    
    // Regular weekday
    return { bg: 'transparent', text: colors.text };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <Pressable onPress={handlePrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </Pressable>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {months[month]} {year}
        </Text>
        <Pressable onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.accent} />
        </Pressable>
      </View>

      {/* Day Headers */}
      <View style={styles.headerRow}>
        {days.map((day, index) => (
          <Text key={index} style={[styles.dayHeader, { color: colors.textMuted }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, index) => {
          const dayColors = getDayColor(day);
          const isSelected = day && day.getDate() === selectedDay && day.getMonth() === month;
          const { hasEntry, isAbsence } = day ? getDayStatus(day) : { hasEntry: false, isAbsence: false };

          return (
            <Pressable
              key={index}
              onPress={() => day && onDateSelect(day)}
              style={[
                styles.dayButton,
                {
                  backgroundColor: dayColors.bg,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: colors.accent,
                  borderRadius: 8,
                },
              ]}
              disabled={!day}
            >
              {day && (
                <>
                  <Text
                    style={[
                      styles.dayText,
                      { color: dayColors.text },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {hasEntry && (
                    <View
                      style={[
                        styles.indicator,
                        { backgroundColor: isSelected ? '#fff' : dayColors.bg },
                      ]}
                    />
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 6,
    marginTop: 6,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  navButton: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
});
