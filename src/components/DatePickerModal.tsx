import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TR_MONTHS, EN_MONTHS } from '../utils/dates';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  language: 'tr' | 'en';
  colors: any;
}

export function DatePickerModal({
  visible,
  onClose,
  onDateSelect,
  selectedDate,
  language,
  colors,
}: DatePickerModalProps) {
  const currentYear = new Date().getFullYear();
  const months = language === 'tr' ? TR_MONTHS : EN_MONTHS;
  const monthNames = language === 'tr' ? 
    ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] :
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const [tempDay, setTempDay] = useState(selectedDate.getDate());
  const [tempMonth, setTempMonth] = useState(selectedDate.getMonth());
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear());

  // Calculate valid days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(tempYear, tempMonth + 1, 0).getDate();
  }, [tempYear, tempMonth]);

  const validDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const validYears = useMemo(() => {
    const years = [];
    for (let y = 2000; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Adjust day if selected day is invalid for the month
  const adjustedDay = Math.min(tempDay, daysInMonth);

  const handleConfirm = () => {
    const newDate = new Date(tempYear, tempMonth, adjustedDay);
    onDateSelect(newDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.container}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose}>
              <Text style={[styles.headerButton, { color: colors.accent }]}>
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {language === 'tr' ? 'Tarih Seç' : 'Select Date'}
            </Text>
            <Pressable onPress={handleConfirm}>
              <Text style={[styles.headerButton, { color: colors.accent, fontWeight: '700' }]}>
                {language === 'tr' ? 'Tamam' : 'Done'}
              </Text>
            </Pressable>
          </View>

          {/* Date Pickers */}
          <View style={styles.pickersContainer}>
          {/* Day Picker */}
          <View style={styles.pickerColumn}>
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
              {language === 'tr' ? 'Gün' : 'Day'}
            </Text>
            <ScrollView style={styles.pickerScroll} snapToAlignment="center" scrollEventThrottle={16}>
              {validDays.map((day) => (
                <Pressable
                  key={day}
                  onPress={() => setTempDay(day)}
                  style={[styles.pickerItem, adjustedDay === day && { backgroundColor: colors.accent }]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: adjustedDay === day ? '#fff' : colors.text },
                      adjustedDay === day && { fontWeight: '700' },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Month Picker */}
          <View style={styles.pickerColumn}>
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
              {language === 'tr' ? 'Ay' : 'Month'}
            </Text>
            <ScrollView style={styles.pickerScroll} snapToAlignment="center" scrollEventThrottle={16}>
              {monthNames.map((monthName, index) => (
                <Pressable
                  key={index}
                  onPress={() => setTempMonth(index)}
                  style={[styles.pickerItem, tempMonth === index && { backgroundColor: colors.accent }]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: tempMonth === index ? '#fff' : colors.text },
                      tempMonth === index && { fontWeight: '700' },
                    ]}
                  >
                    {monthName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Year Picker */}
          <View style={styles.pickerColumn}>
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
              {language === 'tr' ? 'Yıl' : 'Year'}
            </Text>
            <ScrollView style={styles.pickerScroll} snapToAlignment="center" scrollEventThrottle={16}>
              {validYears.map((year) => (
                <Pressable
                  key={year}
                  onPress={() => setTempYear(year)}
                  style={[styles.pickerItem, tempYear === year && { backgroundColor: colors.accent }]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: tempYear === year ? '#fff' : colors.text },
                      tempYear === year && { fontWeight: '700' },
                    ]}
                  >
                    {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 8,
    height: 280,
  },
  pickerColumn: {
    flex: 1,
    height: 280,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerScroll: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
    marginVertical: 4,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
