import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Calendar, Clock, ChevronDown, Check, X } from 'lucide-react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors } from '../../theme/colors';
import { formatTime } from '../../lib/date';

interface DateTimePickerFieldProps {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  onChange: (date: string, time: string) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Parses YYYY-MM-DD and HH:MM into a local Date object without UTC drift.
 */
function parseLocalDate(dateStr: string, timeStr: string): Date {
  const d = new Date();
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        d.setFullYear(year, month, day);
      }
    }
  }
  if (timeStr) {
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        d.setHours(hours, minutes, 0, 0);
      }
    }
  }
  return d;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeStr(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = parseLocalDate(dateStr, '00:00');
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const DateTimePickerField: React.FC<DateTimePickerFieldProps> = ({
  date,
  time,
  onChange,
  label = 'TRANSACTION DATE & TIME',
  disabled = false,
}) => {
  // iOS & Web fallback modal state
  const [iosModalVisible, setIosModalVisible] = useState(false);
  const [iosMode, setIosMode] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(() => parseLocalDate(date, time));

  const currentDateObj = parseLocalDate(date, time);

  // Open native Date Picker
  const handleOpenDatePicker = () => {
    if (disabled) return;

    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      DateTimePickerAndroid.open({
        value: currentDateObj,
        mode: 'date',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            const newDateStr = formatDateStr(selectedDate);
            onChange(newDateStr, time);
          }
        },
      });
    } else {
      setTempDate(parseLocalDate(date, time));
      setIosMode('date');
      setIosModalVisible(true);
    }
  };

  // Open native Time Picker
  const handleOpenTimePicker = () => {
    if (disabled) return;

    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      DateTimePickerAndroid.open({
        value: currentDateObj,
        mode: 'time',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedTime?: Date) => {
          if (event.type === 'set' && selectedTime) {
            const newTimeStr = formatTimeStr(selectedTime);
            onChange(date, newTimeStr);
          }
        },
      });
    } else {
      setTempDate(parseLocalDate(date, time));
      setIosMode('time');
      setIosModalVisible(true);
    }
  };

  // Tapping the overall field opens Date Picker, followed by Time Picker on Android
  const handleOpenBoth = () => {
    if (disabled) return;

    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      DateTimePickerAndroid.open({
        value: currentDateObj,
        mode: 'date',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            const newDateStr = formatDateStr(selectedDate);
            onChange(newDateStr, time);

            // Follow-up immediately with time picker
            setTimeout(() => {
              const updatedDateObj = parseLocalDate(newDateStr, time);
              DateTimePickerAndroid.open({
                value: updatedDateObj,
                mode: 'time',
                is24Hour: false,
                onChange: (tEvent: DateTimePickerEvent, selectedTime?: Date) => {
                  if (tEvent.type === 'set' && selectedTime) {
                    const newTimeStr = formatTimeStr(selectedTime);
                    onChange(newDateStr, newTimeStr);
                  }
                },
              });
            }, 120);
          }
        },
      });
    } else {
      handleOpenDatePicker();
    }
  };

  const handleIosConfirm = () => {
    if (iosMode === 'date') {
      const newDateStr = formatDateStr(tempDate);
      onChange(newDateStr, time);
    } else {
      const newTimeStr = formatTimeStr(tempDate);
      onChange(date, newTimeStr);
    }
    setIosModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* ONE Single-Line Combined Field */}
      <View style={[styles.fieldRow, disabled && styles.fieldDisabled]}>
        {/* Date Segment */}
        <TouchableOpacity
          style={styles.segment}
          onPress={handleOpenDatePicker}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Calendar size={14} color={colors.brand[600]} style={styles.segmentIcon} />
          <Text style={styles.dateText} numberOfLines={1}>
            {formatDisplayDate(date)}
          </Text>
        </TouchableOpacity>

        {/* Small Vertical Divider */}
        <View style={styles.divider} />

        {/* Time Segment */}
        <TouchableOpacity
          style={styles.segment}
          onPress={handleOpenTimePicker}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Clock size={14} color={colors.brand[600]} style={styles.segmentIcon} />
          <Text style={styles.timeText} numberOfLines={1}>
            {formatTime(time) || '12:00 PM'}
          </Text>
        </TouchableOpacity>

        {/* Subtle Dropdown / Edit Indicator */}
        <TouchableOpacity
          style={styles.chevronBox}
          onPress={handleOpenBoth}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <ChevronDown size={14} color={colors.slate[400]} />
        </TouchableOpacity>
      </View>

      {/* iOS / Fallback Modal */}
      {Platform.OS !== 'android' && iosModalVisible && (
        <Modal visible={iosModalVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {iosMode === 'date' ? 'Select Date' : 'Select Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => setIosModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} color={colors.slate[600]} />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode={iosMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirmBtn]}
                  onPress={handleIosConfirm}
                >
                  <Check size={16} color={colors.white} />
                  <Text style={styles.modalConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[600],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 46,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  segmentIcon: {
    flexShrink: 0,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: colors.slate[300],
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
    flexShrink: 1,
  },
  chevronBox: {
    paddingLeft: 6,
    paddingRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate[900],
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  modalConfirmBtn: {
    backgroundColor: colors.brand[600],
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
