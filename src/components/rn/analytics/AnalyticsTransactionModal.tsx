import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { X, Paperclip, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { formatDate } from '../../../lib/date';
import { Transaction, Category, Account } from '../../../types';
import { CategoryIcon } from '../CategoryIcon';

interface AnalyticsTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  categoryId: string | null;
  categoryName: string | null;
  subcategoryName?: string | null;
  startDate: string;
  endDate: string;
  onSelectTransaction?: (tx: Transaction) => void;
}

export const AnalyticsTransactionModal: React.FC<AnalyticsTransactionModalProps> = ({
  visible,
  onClose,
  transactions,
  categories,
  accounts,
  categoryId,
  categoryName,
  subcategoryName,
  startDate,
  endDate,
  onSelectTransaction,
}) => {
  // Filter matching transactions in range
  const matchingTxs = useMemo(() => {
    if (!categoryId && !categoryName) return [];

    return transactions
      .filter((t) => {
        // Date range match
        const inDate = t.transactionDate >= startDate && t.transactionDate <= endDate;
        if (!inDate) return false;

        // Category match
        const matchCat =
          t.categoryId === categoryId ||
          (categoryName && categories.find((c) => c.id === t.categoryId)?.name === categoryName);

        if (!matchCat) return false;

        // Subcategory match (if specified)
        if (subcategoryName) {
          return t.subcategoryName === subcategoryName;
        }

        return true;
      })
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [transactions, categoryId, categoryName, subcategoryName, startDate, endDate, categories]);

  const catObj = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || null;
  }, [categories, categoryId]);

  const totalSum = useMemo(() => {
    return matchingTxs.reduce((sum, t) => sum + t.amount, 0);
  }, [matchingTxs]);

  const getAccount = (accId?: string) => accounts.find((a) => a.id === accId);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: catObj?.color ? `${catObj.color}18` : `${colors.brand[500]}18` },
                ]}
              >
                <CategoryIcon
                  name={catObj?.icon || 'Tag'}
                  size={18}
                  color={catObj?.color || colors.brand[600]}
                />
              </View>
              <View style={styles.titleBox}>
                <Text style={styles.title} numberOfLines={1}>
                  {categoryName || 'Category Transactions'}
                </Text>
                {subcategoryName ? (
                  <View style={styles.subPill}>
                    <Text style={styles.subPillText}>Subcategory: {subcategoryName}</Text>
                  </View>
                ) : (
                  <Text style={styles.periodText}>
                    {startDate} to {endDate}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* Summary Banner */}
          <View style={styles.summaryBanner}>
            <View>
              <Text style={styles.summaryLabel}>Total in this Period</Text>
              <Text style={styles.summaryAmount}>{formatRupees(totalSum)}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {matchingTxs.length} {matchingTxs.length === 1 ? 'Transaction' : 'Transactions'}
              </Text>
            </View>
          </View>

          {/* Transactions List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {matchingTxs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptySub}>
                  There are no records in this category within the selected date range.
                </Text>
              </View>
            ) : (
              matchingTxs.map((tx) => {
                const isInc = tx.type === 'income';
                const acc = getAccount(tx.accountId);

                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.txRow}
                    onPress={() => {
                      onSelectTransaction?.(tx);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: isInc ? colors.income.bg : colors.expense.bg },
                        ]}
                      >
                        {isInc ? (
                          <ArrowDownLeft size={14} color={colors.income.text} />
                        ) : (
                          <ArrowUpRight size={14} color={colors.expense.text} />
                        )}
                      </View>
                      <View style={styles.txDetails}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {tx.title}
                        </Text>
                        <View style={styles.txMeta}>
                          <Text style={styles.txDate}>{formatDate(tx.transactionDate)}</Text>
                          {tx.subcategoryName && (
                            <Text style={styles.txMetaSub}>• {tx.subcategoryName}</Text>
                          )}
                          {acc && <Text style={styles.txMetaAcc}>• {acc.name}</Text>}
                          {tx.attachments && tx.attachments.length > 0 && (
                            <View style={styles.attachPill}>
                              <Paperclip size={10} color={colors.slate[500]} />
                              <Text style={styles.attachText}>{tx.attachments.length}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        isInc ? styles.txAmountInc : styles.txAmountExp,
                      ]}
                    >
                      {isInc ? '+' : '-'} {formatRupees(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
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
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
  },
  periodText: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  subPill: {
    backgroundColor: colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  subPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[700],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.slate[900],
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  listContent: {
    gap: 8,
    paddingBottom: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[900],
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  txDate: {
    fontSize: 10,
    color: colors.slate[400],
  },
  txMetaSub: {
    fontSize: 10,
    color: colors.slate[600],
    fontWeight: '600',
  },
  txMetaAcc: {
    fontSize: 10,
    color: colors.slate[400],
  },
  attachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.slate[100],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  attachText: {
    fontSize: 9,
    color: colors.slate[600],
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  txAmountInc: {
    color: colors.income.text,
  },
  txAmountExp: {
    color: colors.expense.text,
  },
  emptyBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate[700],
  },
  emptySub: {
    fontSize: 11,
    color: colors.slate[400],
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
