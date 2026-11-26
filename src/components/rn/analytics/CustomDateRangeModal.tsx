import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Calendar, Check, Sparkles } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { DatePickerField } from '../DatePickerField';

interface CustomDateRangeModalProps {
  visible: boolean;
  onClose: () => void;
  initialStartDate: string;
  initialEndDate: string;
  onApply: (startDate: string, endDate: string) => void;
}

export const CustomDateRangeModal: React.FC<CustomDateRangeModalProps> = ({
  visible,
  onClose,
  initialStartDate,
  initialEndDate,
  onApply,
}) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Quick Presets
  const applyPreset = (daysAgo: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - daysAgo);
    setStartDate(toYMD(start));
    setEndDate(toYMD(now));
  };

  const applyQuarter = () => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
    setStartDate(toYMD(start));
    setEndDate(toYMD(end));
  };

  const handleConfirm = () => {
    if (startDate > endDate) {
      Alert.alert('Invalid Range', 'The start date cannot be after the end date.');
      return;
    }
    onApply(startDate, endDate);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Calendar size={18} color={colors.brand[600]} />
              </View>
              <View>
                <Text style={styles.title}>Custom Date Filter</Text>
                <Text style={styles.subtitle}>Select exact dates or quick presets</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset(7)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Last 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset(14)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Last 14 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset(30)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Last 30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset(90)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Last 90 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={applyQuarter}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>This Quarter</Text>
              </TouchableOpacity>
            </View>

            {/* Date Pickers */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>CUSTOM DATE RANGE</Text>
            <View style={styles.pickersContainer}>
              <View style={styles.pickerBox}>
                <DatePickerField
                  label="From Date"
                  value={startDate}
                  onChange={setStartDate}
                />
              </View>
              <View style={styles.pickerBox}>
                <DatePickerField
                  label="To Date"
                  value={endDate}
                  onChange={setEndDate}
                />
              </View>
            </View>

            {/* Active Range Preview */}
            <View style={styles.previewBox}>
              <Sparkles size={13} color={colors.brand[600]} />
              <Text style={styles.previewText}>
                Filter: <Text style={{ fontWeight: '800' }}>{startDate}</Text> to{' '}
                <Text style={{ fontWeight: '800' }}>{endDate}</Text>
              </Text>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Check size={16} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.brand[500]}16`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  pickersContainer: {
    gap: 10,
  },
  pickerBox: {
    marginBottom: 4,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.brand[500]}0d`,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 16,
  },
  previewText: {
    fontSize: 12,
    color: colors.brand[700],
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
