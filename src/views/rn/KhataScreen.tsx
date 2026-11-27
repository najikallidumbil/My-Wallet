import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  UserPlus,
  Search,
  MessageCircle,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  ArrowUpDown,
  History,
  Sparkles,
  Archive,
  Check,
  ArrowRight,
  Download,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { MetricCard } from '../../components/rn/MetricCard';
import {
  PersonSummary,
  KhataFilterType,
  KhataSortType,
} from '../../types';
import { useResponsive } from '../../lib/useResponsive';
import { KhataDashboardCharts } from '../../components/rn/charts/KhataDashboardCharts';
import { SmartMessageModal } from '../../components/rn/SmartMessageModal';
import { BulkReminderModal } from '../../components/rn/BulkReminderModal';
import { MessageHistoryModal } from '../../components/rn/MessageHistoryModal';
import { PdfReportModal } from '../../components/rn/reports/PdfReportModal';

interface KhataScreenProps {
  onLendMoney: () => void;
  onReceiveMoney: () => void;
  onBorrowMoney: () => void;
  onRepayMoney: () => void;
  onAddPerson: () => void;
  onSelectPerson: (personSummary: PersonSummary) => void;
}

export const KhataScreen: React.FC<KhataScreenProps> = ({
  onLendMoney,
  onReceiveMoney,
  onBorrowMoney,
  onRepayMoney,
  onAddPerson,
  onSelectPerson,
}) => {
  const {
    personSummaries,
    khataSummary,
    creditDebtRecords,
  } = useWallet();

  const { isNarrowMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<KhataFilterType>('all');
  const [sortType, setSortType] = useState<KhataSortType>('amount_desc');
  const [showArchived, setShowArchived] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modals State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPersonForMessage, setSelectedPersonForMessage] = useState<PersonSummary | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const {
    totalReceivable,
    totalPayable,
    overdueCount,
    overdueReceivable,
    overduePayable,
  } = khataSummary;

  const totalOutstanding = totalReceivable + totalPayable;
  const activePeopleCount = personSummaries.filter((p) => !p.isArchived).length;

  // Processed (Filtered & Sorted) People
  const processedPeople = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

    return personSummaries
      .filter((p) => {
        // Archive filter
        if (!showArchived && p.isArchived) return false;
        if (showArchived && !p.isArchived) return false;

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesPhone = p.phone ? p.phone.includes(q) : false;
          if (!matchesName && !matchesPhone) return false;
        }

        // Category filter
        switch (filterType) {
          case 'credit':
            return p.outstandingReceivable > 0;
          case 'debt':
            return p.outstandingPayable > 0;
          case 'pending':
            return p.outstandingReceivable > 0 || p.outstandingPayable > 0;
          case 'settled':
            return p.outstandingReceivable === 0 && p.outstandingPayable === 0;
          case 'overdue':
            return p.hasOverdue || p.paymentStatus === 'overdue';
          case 'upcoming':
            return Boolean(
              p.nextDueDate && p.nextDueDate >= todayStr && p.nextDueDate <= nextWeekStr
            );
          case 'all':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        switch (sortType) {
          case 'name_asc':
            return a.name.localeCompare(b.name);
          case 'name_desc':
            return b.name.localeCompare(a.name);
          case 'amount_desc':
            return Math.abs(b.netBalance) - Math.abs(a.netBalance);
          case 'amount_asc':
            return Math.abs(a.netBalance) - Math.abs(b.netBalance);
          case 'recent_tx':
            return (b.lastTransactionDate || '').localeCompare(a.lastTransactionDate || '');
          case 'oldest_tx':
            return (a.lastTransactionDate || '').localeCompare(b.lastTransactionDate || '');
          case 'due_date_asc':
            return (a.nextDueDate || '9999').localeCompare(b.nextDueDate || '9999');
          case 'due_date_desc':
            return (b.nextDueDate || '').localeCompare(a.nextDueDate || '');
          default:
            return 0;
        }
      });
  }, [personSummaries, filterType, sortType, searchQuery, showArchived]);

  // Total outstanding of currently filtered people
  const filteredTotalPending = useMemo(() => {
    return processedPeople.reduce(
      (sum, p) => sum + p.outstandingReceivable + p.outstandingPayable,
      0
    );
  }, [processedPeople]);

  const handleOpenRemindModal = (p: PersonSummary) => {
    setSelectedPersonForMessage(p);
    setIsMessageModalOpen(true);
  };

  const getSortLabel = () => {
    switch (sortType) {
      case 'amount_desc':
        return 'Highest Balance';
      case 'amount_asc':
        return 'Lowest Balance';
      case 'name_asc':
        return 'Name (A to Z)';
      case 'name_desc':
        return 'Name (Z to A)';
      case 'recent_tx':
        return 'Recent Activity';
      case 'oldest_tx':
        return 'Oldest Activity';
      case 'due_date_asc':
        return 'Earliest Due Date';
      case 'due_date_desc':
        return 'Latest Due Date';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { padding: isNarrowMobile ? 12 : 16 },
        isWide && styles.contentWide,
      ]}
    >
      <View style={isWide ? styles.innerWide : styles.inner}>
        {/* 1. Executive Summary Cards (Top of Khata Dashboard - 2x2 Grid on Mobile) */}
        <View style={isWide ? styles.summaryGridWide : styles.summaryGridMobile}>
          {/* Card 1: Total Receivable */}
          <View style={isWide ? styles.summaryColWide : styles.summaryColMobile}>
            <MetricCard
              title="Total Receivable"
              amount={totalReceivable}
              variant="receivable"
              subtitle="Money others owe me"
              icon={<HandCoins size={15} color={colors.receivable.text} />}
            />
          </View>

          {/* Card 2: Total Payable */}
          <View style={isWide ? styles.summaryColWide : styles.summaryColMobile}>
            <MetricCard
              title="Total Payable"
              amount={totalPayable}
              variant="payable"
              subtitle="Money I owe others"
              icon={<ArrowUpRight size={15} color={colors.payable.text} />}
            />
          </View>

          {/* Card 3: Total Outstanding */}
          <View style={isWide ? styles.summaryColWide : styles.summaryColMobile}>
            <MetricCard
              title="Total Outstanding"
              amount={totalOutstanding}
              variant="overview"
              subtitle="Combined pending volume"
              icon={<Sparkles size={15} color={colors.overview.text} />}
            />
          </View>

          {/* Card 4: Overdue Payments */}
          <View style={isWide ? styles.summaryColWide : styles.summaryColMobile}>
            {overdueCount === 0 ? (
              <MetricCard
                title="Overdue Payments"
                variant="neutral"
                icon={<AlertTriangle size={15} color={colors.slate[400]} />}
                customValue={
                  <View style={styles.noOverdueRow}>
                    <CheckCircle2 size={15} color={colors.income.text} />
                    <Text style={styles.noOverdueText} numberOfLines={1}>
                      No overdue payments
                    </Text>
                  </View>
                }
                subtitle="All collections on track"
              />
            ) : (
              <MetricCard
                title="Overdue Payments"
                variant="overdue"
                icon={<AlertTriangle size={15} color={colors.expense.solid} />}
                customValue={
                  <Text style={styles.amountOverdueText} numberOfLines={1}>
                    {overdueCount} Overdue
                  </Text>
                }
                subtitle={`${formatRupees(overdueReceivable + overduePayable)} past due`}
                action={
                  <TouchableOpacity
                    onPress={() => setFilterType('overdue')}
                    style={styles.viewDetailsBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ArrowRight size={11} color={colors.expense.text} />
                  </TouchableOpacity>
                }
              />
            )}
          </View>
        </View>

        {/* 2. Primary Action Buttons (2-Column Grid Below Summary Cards) */}
        <View style={styles.primaryActionGrid}>
          {/* Row 1: Give (Lend) & Receive Money */}
          <View style={styles.primaryActionRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.lendBtn]}
              onPress={onLendMoney}
              activeOpacity={0.85}
            >
              <View style={styles.primaryActionIconCircle}>
                <ArrowUpRight size={17} color={colors.white} strokeWidth={2.5} />
              </View>
              <Text
                style={styles.primaryActionBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Give (Lend)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.receiveBtn]}
              onPress={onReceiveMoney}
              activeOpacity={0.85}
            >
              <View style={styles.primaryActionIconCircle}>
                <ArrowDownLeft size={17} color={colors.white} strokeWidth={2.5} />
              </View>
              <Text
                style={styles.primaryActionBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Receive Money
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Borrow & Repay Money */}
          <View style={styles.primaryActionRow}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.borrowBtn]}
              onPress={onBorrowMoney}
              activeOpacity={0.85}
            >
              <View style={styles.primaryActionIconCircle}>
                <ArrowDownLeft size={17} color={colors.white} strokeWidth={2.5} />
              </View>
              <Text
                style={styles.primaryActionBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Borrow
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.repayBtn]}
              onPress={onRepayMoney}
              activeOpacity={0.85}
            >
              <View style={styles.primaryActionIconCircle}>
                <ArrowUpRight size={17} color={colors.white} strokeWidth={2.5} />
              </View>
              <Text
                style={styles.primaryActionBtnText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Repay Money
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Secondary Actions Strip */}
        <View style={isWide ? styles.utilRowWide : styles.utilGridMobile}>
          <TouchableOpacity
            style={[styles.utilBtn, !isWide && styles.utilBtnMobile, styles.addPersonBtn]}
            onPress={onAddPerson}
            activeOpacity={0.8}
          >
            <UserPlus size={15} color={colors.brand[700]} />
            <Text style={styles.addPersonBtnText} numberOfLines={1} adjustsFontSizeToFit>+ Add Person</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilBtn, !isWide && styles.utilBtnMobile, styles.bulkRemindBtn]}
            onPress={() => setIsBulkModalOpen(true)}
            activeOpacity={0.8}
          >
            <MessageCircle size={15} color="#15803d" />
            <Text style={styles.bulkRemindBtnText} numberOfLines={1} adjustsFontSizeToFit>Bulk Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilBtn, !isWide && styles.utilBtnMobile, styles.historyBtn]}
            onPress={() => setIsHistoryModalOpen(true)}
            activeOpacity={0.8}
          >
            <History size={15} color={colors.slate[700]} />
            <Text style={styles.historyBtnText} numberOfLines={1} adjustsFontSizeToFit>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilBtn, !isWide && styles.utilBtnMobile, styles.pdfBtn]}
            onPress={() => setIsPdfModalOpen(true)}
            activeOpacity={0.8}
          >
            <Download size={14} color="#0369a1" />
            <Text style={styles.pdfBtnText} numberOfLines={1} adjustsFontSizeToFit>Khata PDF</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 4 Dynamic Financial Charts */}
        <KhataDashboardCharts
          creditDebtRecords={creditDebtRecords}
          totalReceivable={totalReceivable}
          totalPayable={totalPayable}
        />

        {/* 4. Advanced Search, Filter and Sort Section */}
        <View style={styles.filterSection}>
          {/* Search Bar + Sort Action */}
          <View style={styles.searchSortRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.slate[400]} />
              <TextInput
                placeholder="Search by contact name or phone..."
                placeholderTextColor={colors.slate[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>

            <TouchableOpacity
              style={styles.sortToggleBtn}
              onPress={() => setShowSortDropdown((v) => !v)}
              activeOpacity={0.7}
            >
              <ArrowUpDown size={14} color={colors.slate[700]} />
              <Text style={styles.sortToggleText}>{getSortLabel()}</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Dropdown Options */}
          {showSortDropdown && (
            <View style={styles.sortDropdown}>
              <Text style={styles.sortDropdownTitle}>SORT CONTACTS BY</Text>
              <View style={styles.sortOptionsGrid}>
                {[
                  { id: 'amount_desc' as const, label: 'Highest Balance' },
                  { id: 'amount_asc' as const, label: 'Lowest Balance' },
                  { id: 'name_asc' as const, label: 'Name (A to Z)' },
                  { id: 'name_desc' as const, label: 'Name (Z to A)' },
                  { id: 'recent_tx' as const, label: 'Recent Activity' },
                  { id: 'oldest_tx' as const, label: 'Oldest Activity' },
                  { id: 'due_date_asc' as const, label: 'Earliest Due Date' },
                  { id: 'due_date_desc' as const, label: 'Latest Due Date' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.sortOptionItem,
                      sortType === opt.id && styles.sortOptionItemActive,
                    ]}
                    onPress={() => {
                      setSortType(opt.id);
                      setShowSortDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortType === opt.id && styles.sortOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {sortType === opt.id && <Check size={12} color={colors.brand[600]} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Filter Tabs (Horizontal Scroll on Mobile) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterPillsScroll}
          >
            <TouchableOpacity
              style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterPillText, filterType === 'all' && styles.filterPillTextActive]}>
                All ({activePeopleCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterType === 'credit' && styles.filterPillActiveCredit]}
              onPress={() => setFilterType('credit')}
            >
              <Text style={[styles.filterPillText, filterType === 'credit' && styles.filterPillTextActive]}>
                Owe Me (Credit)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterType === 'debt' && styles.filterPillActiveDebt]}
              onPress={() => setFilterType('debt')}
            >
              <Text style={[styles.filterPillText, filterType === 'debt' && styles.filterPillTextActive]}>
                I Owe (Debt)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterType === 'pending' && styles.filterPillActive]}
              onPress={() => setFilterType('pending')}
            >
              <Text style={[styles.filterPillText, filterType === 'pending' && styles.filterPillTextActive]}>
                Pending
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterType === 'overdue' && styles.filterPillActiveDanger]}
              onPress={() => setFilterType('overdue')}
            >
              <AlertTriangle size={12} color={filterType === 'overdue' ? colors.white : colors.expense.solid} />
              <Text style={[styles.filterPillText, filterType === 'overdue' && styles.filterPillTextActive]}>
                Overdue ({overdueCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterType === 'upcoming' && styles.filterPillActive]}
              onPress={() => setFilterType('upcoming')}
            >
              <Clock size={12} color={filterType === 'upcoming' ? colors.white : colors.slate[600]} />
              <Text style={[styles.filterPillText, filterType === 'upcoming' && styles.filterPillTextActive]}>
                Upcoming Dues
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterType === 'settled' && styles.filterPillActiveSuccess]}
              onPress={() => setFilterType('settled')}
            >
              <CheckCircle2 size={12} color={filterType === 'settled' ? colors.white : colors.income.solid} />
              <Text style={[styles.filterPillText, filterType === 'settled' && styles.filterPillTextActive]}>
                Fully Settled
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, showArchived && styles.filterPillActive]}
              onPress={() => setShowArchived((v) => !v)}
            >
              <Archive size={12} color={showArchived ? colors.white : colors.slate[500]} />
              <Text style={[styles.filterPillText, showArchived && styles.filterPillTextActive]}>
                {showArchived ? 'Showing Archived' : 'Archived'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Results Count & Volume Info Strip */}
          <View style={styles.resultsInfoRow}>
            <Text style={styles.resultsCountText}>
              Showing {processedPeople.length} contact{processedPeople.length === 1 ? '' : 's'}
            </Text>
            <Text style={styles.resultsTotalText}>
              Total Pending: {formatRupees(filteredTotalPending)}
            </Text>
          </View>
        </View>

        {/* 5. Modern People Cards List */}
        <View style={styles.peopleList}>
          {processedPeople.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={36} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No matching contacts found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query, sorting, or filter criteria.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={onAddPerson}
                activeOpacity={0.8}
              >
                <UserPlus size={15} color={colors.white} />
                <Text style={styles.emptyAddBtnText}>Add New Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            processedPeople.map((person) => {
              const isRec = person.netBalance > 0;
              const isPay = person.netBalance < 0;
              const isSettled = person.outstandingReceivable === 0 && person.outstandingPayable === 0;
              const isOverdue = person.paymentStatus === 'overdue' || person.hasOverdue;

              return (
                <TouchableOpacity
                  key={person.id}
                  style={[styles.personCard, isOverdue && styles.personCardOverdue]}
                  onPress={() => onSelectPerson(person)}
                  activeOpacity={0.7}
                >
                  <View style={styles.personCardLeft}>
                    {/* Avatar Initials Box */}
                    <View
                      style={[
                        styles.avatarBox,
                        isOverdue
                          ? styles.avatarOverdue
                          : isRec
                          ? styles.avatarReceivable
                          : isPay
                          ? styles.avatarPayable
                          : styles.avatarSettled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          isOverdue
                            ? styles.avatarTextOverdue
                            : isRec
                            ? styles.avatarTextReceivable
                            : isPay
                            ? styles.avatarTextPayable
                            : styles.avatarTextSettled,
                        ]}
                      >
                        {person.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>

                    {/* Person Information */}
                    <View style={styles.personDetails}>
                      <View style={styles.nameHeaderRow}>
                        <Text style={styles.personName} numberOfLines={1}>
                          {person.name}
                        </Text>
                        {isOverdue && (
                          <View style={styles.statusBadgeDanger}>
                            <AlertTriangle size={10} color={colors.expense.text} />
                            <Text style={styles.statusBadgeTextDanger}>Overdue</Text>
                          </View>
                        )}
                        {isSettled && (
                          <View style={styles.statusBadgeSuccess}>
                            <CheckCircle2 size={10} color={colors.income.text} />
                            <Text style={styles.statusBadgeTextSuccess}>Settled</Text>
                          </View>
                        )}
                      </View>

                      {/* Phone & Date Meta */}
                      <View style={styles.metaRow}>
                        <Text style={styles.personPhone}>{person.phone || 'No phone'}</Text>
                        {person.lastTransactionDate && (
                          <>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaDate}>
                              Last: {formatDate(person.lastTransactionDate)}
                            </Text>
                          </>
                        )}
                        {person.nextDueDate && !isSettled && (
                          <>
                            <Text style={styles.metaDot}>•</Text>
                            <Text
                              style={[
                                styles.metaDue,
                                isOverdue && styles.metaDueOverdue,
                              ]}
                            >
                              Due: {formatDate(person.nextDueDate)}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Balance & Actions on Right */}
                  <View style={styles.personCardRight}>
                    <Text
                      style={[
                        styles.personAmount,
                        isRec
                          ? styles.textReceivable
                          : isPay
                          ? styles.textPayable
                          : styles.textSettled,
                      ]}
                      numberOfLines={1}
                    >
                      {formatRupees(Math.abs(person.netBalance))}
                    </Text>
                    <Text style={styles.personAmountLabel}>
                      {isRec ? "You'll Get" : isPay ? "You'll Pay" : 'Settled'}
                    </Text>

                    {/* Quick Smart Reminder Button */}
                    <TouchableOpacity
                      style={styles.remindBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenRemindModal(person);
                      }}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={13} color="#15803d" />
                      <Text style={styles.remindBtnText}>Remind</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 6. Smart Message Modal Instance */}
        <SmartMessageModal
          visible={isMessageModalOpen}
          person={selectedPersonForMessage}
          onClose={() => {
            setIsMessageModalOpen(false);
            setSelectedPersonForMessage(null);
          }}
        />

        {/* 7. Bulk Reminders Modal Instance */}
        <BulkReminderModal
          visible={isBulkModalOpen}
          people={personSummaries}
          onClose={() => setIsBulkModalOpen(false)}
        />

        {/* 8. Message History Modal Instance */}
        <MessageHistoryModal
          visible={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />

        {/* 9. Khata Book PDF Report Modal */}
        <PdfReportModal
          visible={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          initialReportType="khata"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    paddingBottom: 90,
  },
  contentWide: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    gap: 14,
  },
  innerWide: {
    width: '100%',
    maxWidth: 1100,
    gap: 16,
  },
  actionGrid: {
    gap: 10,
  },
  primaryActionGrid: {
    gap: 10,
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryActionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  lendBtn: {
    backgroundColor: colors.receivable.solid,
  },
  receiveBtn: {
    backgroundColor: colors.income.solid,
  },
  borrowBtn: {
    backgroundColor: colors.payable.solid,
  },
  repayBtn: {
    backgroundColor: '#7c3aed',
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  utilRowWide: {
    flexDirection: 'row',
    gap: 10,
  },
  utilGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  utilBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minHeight: 42,
  },
  utilBtnMobile: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
  addPersonBtn: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[200],
  },
  addPersonBtnText: {
    color: colors.brand[800],
    fontSize: 12,
    fontWeight: '800',
  },
  bulkRemindBtn: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  bulkRemindBtnText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '800',
  },
  historyBtn: {
    backgroundColor: colors.slate[100],
    borderColor: colors.slate[300],
  },
  historyBtnText: {
    color: colors.slate[800],
    fontSize: 12,
    fontWeight: '800',
  },
  pdfBtn: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  pdfBtnText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'stretch',
  },
  summaryColMobile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignSelf: 'stretch',
  },
  summaryGridWide: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  summaryColWide: {
    flex: 1,
    minWidth: 150,
    alignSelf: 'stretch',
  },
  noOverdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 1,
  },
  noOverdueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[800],
    flex: 1,
  },
  amountOverdueText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.expense.text,
    letterSpacing: -0.5,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.expense.text,
  },
  filterSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 12,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.slate[900],
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  sortToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[700],
  },
  sortDropdown: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  sortDropdownTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sortOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  sortOptionItemActive: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[50],
  },
  sortOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  sortOptionTextActive: {
    fontWeight: '800',
    color: colors.brand[700],
  },
  filterPillsScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    gap: 5,
  },
  filterPillActive: {
    backgroundColor: colors.slate[800],
  },
  filterPillActiveCredit: {
    backgroundColor: colors.receivable.solid,
  },
  filterPillActiveDebt: {
    backgroundColor: colors.payable.solid,
  },
  filterPillActiveDanger: {
    backgroundColor: colors.expense.solid,
  },
  filterPillActiveSuccess: {
    backgroundColor: colors.income.solid,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[600],
  },
  filterPillTextActive: {
    color: colors.white,
  },
  resultsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  resultsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[500],
  },
  resultsTotalText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate[800],
  },
  peopleList: {
    gap: 10,
  },
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate[800],
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: colors.slate[400],
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  personCardOverdue: {
    borderColor: colors.expense.border,
    backgroundColor: '#fffafa',
  },
  personCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarReceivable: {
    backgroundColor: colors.receivable.bg,
  },
  avatarPayable: {
    backgroundColor: colors.payable.bg,
  },
  avatarOverdue: {
    backgroundColor: colors.expense.bg,
  },
  avatarSettled: {
    backgroundColor: colors.slate[100],
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  avatarTextReceivable: {
    color: colors.receivable.text,
  },
  avatarTextPayable: {
    color: colors.payable.text,
  },
  avatarTextOverdue: {
    color: colors.expense.text,
  },
  avatarTextSettled: {
    color: colors.slate[600],
  },
  personDetails: {
    flex: 1,
    minWidth: 0,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  personName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
    flexShrink: 1,
  },
  statusBadgeDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.expense.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  statusBadgeTextDanger: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.expense.text,
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.income.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  statusBadgeTextSuccess: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.income.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  personPhone: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: colors.slate[400],
  },
  metaDate: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '500',
  },
  metaDue: {
    fontSize: 10,
    color: colors.slate[600],
    fontWeight: '600',
  },
  metaDueOverdue: {
    color: colors.expense.text,
    fontWeight: '700',
  },
  personCardRight: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  personAmount: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  personAmountLabel: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '600',
    marginBottom: 4,
  },
  remindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  remindBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  textReceivable: {
    color: colors.receivable.text,
  },
  textPayable: {
    color: colors.payable.text,
  },
  textSettled: {
    color: colors.slate[400],
  },
});
