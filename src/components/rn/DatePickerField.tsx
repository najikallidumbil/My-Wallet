import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Calendar, ChevronDown, X, Check } from 'lucide-react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors } from '../../theme/colors';
import { getDueStatus } from '../../lib/date';

interface DatePickerFieldProps {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

function parseLocalDateOnly(dateStr?: string): Date {
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
  return d;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = parseLocalDateOnly(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  label = 'EXPECTED REPAYMENT DUE DATE (OPTIONAL)',
  placeholder = 'Select due date (optional)',
  disabled = false,
}) => {
  const [iosModalVisible, setIosModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => parseLocalDateOnly(value));

  const hasValue = Boolean(value && value.trim());
  const dueStatus = hasValue ? getDueStatus(value) : null;

  const handleOpenPicker = () => {
    if (disabled) return;

    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      DateTimePickerAndroid.open({
        value: parseLocalDateOnly(value),
        mode: 'date',
        is24Hour: false,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            onChange(formatDateStr(selectedDate));
          }
        },
      });
    } else {
      setTempDate(parseLocalDateOnly(value));
      setIosModalVisible(true);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleIosConfirm = () => {
    onChange(formatDateStr(tempDate));
    setIosModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* ONE Single-Line Date Container */}
      <View style={[styles.fieldRow, disabled && styles.fieldDisabled]}>
        <TouchableOpacity
          style={styles.touchArea}
          onPress={handleOpenPicker}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Calendar
            size={14}
            color={hasValue ? colors.payable.text : colors.slate[400]}
            style={styles.calendarIcon}
          />

          <Text
            style={[styles.dateText, !hasValue && styles.placeholderText]}
            numberOfLines={1}
          >
            {hasValue ? formatDisplayDate(value) : placeholder}
          </Text>

          {/* Optional Compact Due Status Badge */}
          {dueStatus && hasValue && (
            <View
              style={[
                styles.dueBadge,
                dueStatus.isOverdue ? styles.overdueBadge : styles.upcomingBadge,
              ]}
            >
              <Text
                style={[
                  styles.dueBadgeText,
                  dueStatus.isOverdue
                    ? styles.overdueBadgeText
                    : styles.upcomingBadgeText,
                ]}
                numberOfLines={1}
              >
                {dueStatus.label}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Clear Button (if value is set) */}
        {hasValue && !disabled && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <X size={14} color={colors.slate[400]} />
          </TouchableOpacity>
        )}

        {/* Subtle Dropdown Indicator */}
        <TouchableOpacity
          style={styles.chevronBox}
          onPress={handleOpenPicker}
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
                <Text style={styles.modalTitle}>Select Due Date</Text>
                <TouchableOpacity
                  onPress={() => setIosModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} color={colors.slate[600]} />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
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
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIcon: {
    flexShrink: 0,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
    flexShrink: 1,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[400],
  },
  dueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
    flexShrink: 0,
  },
  upcomingBadge: {
    backgroundColor: colors.brand[50],
  },
  overdueBadge: {
    backgroundColor: colors.expense.bg,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  upcomingBadgeText: {
    color: colors.brand[700],
  },
  overdueBadgeText: {
    color: colors.expense.text,
  },
  clearBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBox: {
    paddingLeft: 4,
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
