import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Phone, X, Check, Smartphone, Briefcase, Home } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ContactPhoneNumber } from '../../lib/contactPicker';

interface PhoneSelectorModalProps {
  visible: boolean;
  contactName: string;
  phones: ContactPhoneNumber[];
  onSelectPhone: (selectedNumber: string) => void;
  onClose: () => void;
}

export const PhoneSelectorModal: React.FC<PhoneSelectorModalProps> = ({
  visible,
  contactName,
  phones,
  onSelectPhone,
  onClose,
}) => {
  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('work')) return <Briefcase size={14} color={colors.brand[600]} />;
    if (l.includes('home')) return <Home size={14} color={colors.income.text} />;
    return <Smartphone size={14} color={colors.brand[600]} />;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Phone size={18} color={colors.brand[600]} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Select Phone Number</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {contactName ? `Numbers for ${contactName}` : 'Choose preferred number'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          {/* List of Numbers */}
          <ScrollView style={styles.scrollList} bounces={false}>
            {phones.map((p, index) => (
              <TouchableOpacity
                key={`${p.number}-${index}`}
                style={styles.phoneOption}
                activeOpacity={0.7}
                onPress={() => {
                  onSelectPhone(p.number);
                  onClose();
                }}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.typeBadge}>
                    {getLabelIcon(p.label)}
                    <Text style={styles.labelText}>{p.label}</Text>
                  </View>
                  <Text style={styles.phoneNumberText}>{p.number}</Text>
                  {p.rawNumber && p.rawNumber !== p.number ? (
                    <Text style={styles.rawNumberText}>Original: {p.rawNumber}</Text>
                  ) : null}
                </View>
                <View style={styles.selectCircle}>
                  <Check size={14} color={colors.brand[600]} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  scrollList: {
    maxHeight: 260,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  phoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 8,
  },
  optionLeft: {
    flex: 1,
    paddingRight: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[600],
    textTransform: 'uppercase',
  },
  phoneNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate[900],
    letterSpacing: 0.3,
  },
  rawNumberText: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 2,
  },
  selectCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    alignItems: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[600],
  },
});
