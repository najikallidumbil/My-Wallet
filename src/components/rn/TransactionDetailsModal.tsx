import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {
  X,
  Trash2,
  Calendar,
  Tag,
  Building2,
  FileText,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { CategoryIcon } from './CategoryIcon';
import { Transaction } from '../../types';

interface TransactionDetailsModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  if (!transaction) return null;

  const { categories, accounts, deleteTransaction } = useWallet();

  const isInc = transaction.type === 'income';
  const cat = categories.find((c) => c.id === transaction.categoryId);
  const subName = transaction.subcategoryName || cat?.subcategories?.find((s) => s.id === transaction.subcategoryId)?.name;
  const acc = accounts.find((a) => a.id === transaction.accountId);

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${transaction.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Could not delete transaction from database.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Transaction Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount Banner */}
            <View
              style={[
                styles.amountBanner,
                isInc ? styles.bannerInc : styles.bannerExp,
              ]}
            >
              <Text
                style={[
                  styles.amountText,
                  isInc ? styles.textInc : styles.textExp,
                ]}
              >
                {isInc ? '+' : '-'} {formatRupees(transaction.amount)}
              </Text>
              <Text style={styles.txTitleText}>{transaction.title}</Text>
            </View>

            {/* Info Items */}
            <View style={styles.infoList}>
              {/* Category */}
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Tag size={16} color={colors.slate[600]} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Category & Subcategory</Text>
                  <View style={styles.catBadge}>
                    <CategoryIcon
                      name={cat?.icon}
                      size={14}
                      color={cat?.color || colors.slate[600]}
                    />
                    <Text style={styles.infoValue}>{cat?.name || 'Uncategorized'}</Text>
                    {!!subName && (
                      <View style={styles.subBadge}>
                        <Text style={styles.subBadgeText}>{subName}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Account */}
              {acc && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Building2 size={16} color={colors.slate[600]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Account / Wallet</Text>
                    <Text style={styles.infoValue}>{acc.name}</Text>
                  </View>
                </View>
              )}

              {/* Date & Time */}
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Calendar size={16} color={colors.slate[600]} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date & Time</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(transaction.transactionDate)}
                    {transaction.transactionTime ? ` at ${transaction.transactionTime}` : ''}
                  </Text>
                </View>
              </View>

              {/* Notes */}
              {transaction.description ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <FileText size={16} color={colors.slate[600]} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Notes</Text>
                    <Text style={styles.infoValue}>{transaction.description}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Attachments Section */}
            {transaction.attachments && transaction.attachments.length > 0 && (
              <View style={styles.attachSection}>
                <Text style={styles.attachTitle}>
                  Attachments & Receipts ({transaction.attachments.length})
                </Text>
                <View style={styles.attachGrid}>
                  {transaction.attachments.map((att) => {
                    const fileUri = att.dataUrl || att.storagePath;
                    const isImg =
                      att.fileType?.startsWith('image/') ||
                      fileUri?.match(/\.(jpg|jpeg|png|webp)/i);
                    return (
                      <View key={att.id} style={styles.attachItem}>
                        {isImg && fileUri ? (
                          <Image source={{ uri: fileUri }} style={styles.attachImg} />
                        ) : (
                          <View style={styles.attachPdf}>
                            <FileText size={24} color={colors.slate[600]} />
                            <Text style={styles.attachPdfName} numberOfLines={2}>
                              {att.fileName}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Delete Button */}
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Trash2 size={16} color={colors.expense.solid} />
              <Text style={styles.deleteBtnText}>Delete Transaction</Text>
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
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate[900],
  },
  closeBtn: {
    padding: 6,
  },
  amountBanner: {
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerInc: {
    backgroundColor: colors.income.bg,
  },
  bannerExp: {
    backgroundColor: colors.expense.bg,
  },
  amountText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  textInc: {
    color: colors.income.text,
  },
  textExp: {
    color: colors.expense.text,
  },
  txTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate[700],
    marginTop: 4,
  },
  infoList: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[400],
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
    marginTop: 1,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  subBadge: {
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand[700],
  },
  attachSection: {
    marginBottom: 16,
  },
  attachTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate[700],
    marginBottom: 10,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attachItem: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  attachImg: {
    width: '100%',
    height: '100%',
  },
  attachPdf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  attachPdfName: {
    fontSize: 9,
    color: colors.slate[600],
    textAlign: 'center',
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.expense.border,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  deleteBtnText: {
    color: colors.expense.solid,
    fontSize: 13,
    fontWeight: '800',
  },
});
