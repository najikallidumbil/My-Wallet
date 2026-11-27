import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  FileText,
  Download,
  Share2,
  Printer,
  Calendar,
  X,
  Check,
  Filter,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  BookOpen,
  PieChart,
} from 'lucide-react-native';
import { useWallet } from '../../../context/WalletContext';
import { useAuth } from '../../../context/AuthContext';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { useResponsive } from '../../../lib/useResponsive';
import {
  ReportType,
  PdfReportFilterOptions,
  filterReportData,
  generatePdfReport,
  sharePdfReport,
  savePdfToDevice,
  printPdfReport,
  getReportTitle,
} from '../../../services/pdfReportService';

interface PdfReportModalProps {
  visible: boolean;
  onClose: () => void;
  initialReportType?: ReportType;
  initialStartDate?: string;
  initialEndDate?: string;
  initialPersonId?: string;
}

const REPORT_TYPE_CONFIG: {
  key: ReportType;
  label: string;
  desc: string;
  icon: any;
  color: string;
}[] = [
  {
    key: 'complete',
    label: 'Complete Statement',
    desc: 'Income, Expenses, Khata summaries & detailed itemized ledger',
    icon: FileText,
    color: colors.brand[600],
  },
  {
    key: 'monthly',
    label: 'Monthly Report',
    desc: 'Single month financial cashflow, top categories & day-by-day',
    icon: Calendar,
    color: '#0284c7',
  },
  {
    key: 'income',
    label: 'Income Report',
    desc: 'Itemized earnings, salary, project receivables & income sources',
    icon: TrendingUp,
    color: '#10b981',
  },
  {
    key: 'expense',
    label: 'Expense Report',
    desc: 'Spending analysis, category breakdowns & expense ledger',
    icon: TrendingDown,
    color: '#f43f5e',
  },
  {
    key: 'khata',
    label: 'Khata Book Report',
    desc: 'Lent (Credit) vs Borrowed (Debt), pending, settled & due dates',
    icon: BookOpen,
    color: '#8b5cf6',
  },
  {
    key: 'category',
    label: 'Category-wise Report',
    desc: 'Detailed breakdown grouped by main categories and subcategories',
    icon: PieChart,
    color: '#6366f1',
  },
  {
    key: 'subcategory',
    label: 'Subcategory Report',
    desc: 'Subcategory-level spending volume and item counts',
    icon: Layers,
    color: '#0d9488',
  },
  {
    key: 'yearly',
    label: 'Yearly Overview',
    desc: 'Annual financial performance, monthly deltas and totals',
    icon: Calendar,
    color: '#eab308',
  },
  {
    key: 'custom',
    label: 'Custom Date Range',
    desc: 'Custom start and end dates with granular filters',
    icon: Filter,
    color: colors.slate[700],
  },
];

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  visible,
  onClose,
  initialReportType = 'complete',
  initialStartDate,
  initialEndDate,
  initialPersonId,
}) => {
  const { transactions, creditDebtRecords, categories, accounts, personSummaries } = useWallet();
  const { user, profile } = useAuth();
  const { isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  // Initial Date Computations
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const firstDayOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Form Filter State
  const [reportType, setReportType] = useState<ReportType>(initialReportType);
  const [datePreset, setDatePreset] = useState<'this_month' | 'last_month' | 'last_3m' | 'this_year' | 'all' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>(initialStartDate || firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(initialEndDate || todayStr);
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<string>(initialPersonId || '');
  const [reportTitleInput, setReportTitleInput] = useState<string>('');

  // Processing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationAction, setGenerationAction] = useState<string | null>(null);

  // Apply Quick Date Presets
  const applyPreset = (preset: 'this_month' | 'last_month' | 'last_3m' | 'this_year' | 'all' | 'custom') => {
    setDatePreset(preset);
    const d = new Date();
    d.setHours(0, 0, 0, 0);

    if (preset === 'this_month') {
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(start);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(d.getFullYear(), d.getMonth(), 0);
      setStartDate(prevMonth.toISOString().slice(0, 10));
      setEndDate(lastDayPrevMonth.toISOString().slice(0, 10));
    } else if (preset === 'last_3m') {
      const past3m = new Date(d.getFullYear(), d.getMonth() - 3, 1);
      setStartDate(past3m.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'this_year') {
      const startOfYear = `${d.getFullYear()}-01-01`;
      setStartDate(startOfYear);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Preview Data Summary
  const filterOptions: PdfReportFilterOptions = useMemo(() => {
    return {
      reportType,
      startDate,
      endDate,
      title: reportTitleInput.trim() || undefined,
      transactionTypeFilter: txTypeFilter,
      selectedCategoryId: selectedCategory || undefined,
      selectedSubcategoryName: selectedSubcategory || undefined,
      selectedPersonId: selectedPerson || undefined,
      userName: profile?.fullName || user?.email?.split('@')[0] || 'Account Holder',
      userEmail: user?.email || undefined,
    };
  }, [reportType, startDate, endDate, reportTitleInput, txTypeFilter, selectedCategory, selectedSubcategory, selectedPerson, profile, user]);

  const previewData = useMemo(() => {
    return filterReportData(
      transactions,
      creditDebtRecords,
      categories,
      accounts,
      personSummaries,
      filterOptions
    );
  }, [transactions, creditDebtRecords, categories, accounts, personSummaries, filterOptions]);

  // Available Subcategories for chosen Category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.subcategories || [];
  }, [selectedCategory, categories]);

  // Actions: Download, Share, Print
  const handleGenerateAction = async (action: 'download' | 'share' | 'print') => {
    setIsGenerating(true);
    setGenerationAction(action);

    try {
      if (action === 'print') {
        const { htmlContent } = await generatePdfReport(
          transactions,
          creditDebtRecords,
          categories,
          accounts,
          personSummaries,
          filterOptions
        );
        await printPdfReport(htmlContent);
      } else if (action === 'share') {
        const pdfResult = await generatePdfReport(
          transactions,
          creditDebtRecords,
          categories,
          accounts,
          personSummaries,
          filterOptions
        );
        await sharePdfReport(pdfResult.uri, pdfResult.filename);
      } else {
        // Download / Save to device
        const pdfResult = await generatePdfReport(
          transactions,
          creditDebtRecords,
          categories,
          accounts,
          personSummaries,
          filterOptions
        );
        const res = await savePdfToDevice(pdfResult.uri, pdfResult.filename);
        Alert.alert(
          res.success ? 'Report Ready' : 'Save Notice',
          res.message,
          [{ text: 'OK', onPress: () => onClose() }]
        );
      }
    } catch (err: any) {
      console.error('[PDF Generation Error]', err);
      Alert.alert(
        'PDF Generation Failed',
        err.message || 'Could not generate PDF statement. Please try again.'
      );
    } finally {
      setIsGenerating(false);
      setGenerationAction(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, isWide && styles.modalCardWide]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBox}>
                <FileText size={20} color={colors.brand[600]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>Generate Financial Report</Text>
                <Text style={styles.headerSubtitle}>
                  Professional, print-ready PDF statement with real records
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Report Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>1. SELECT REPORT TYPE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reportTypesStrip}
              >
                {REPORT_TYPE_CONFIG.map((item) => {
                  const isSelected = reportType === item.key;
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.reportTypeCard,
                        isSelected && {
                          borderColor: item.color,
                          backgroundColor: `${item.color}10`,
                        },
                      ]}
                      onPress={() => setReportType(item.key)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.reportTypeIconBox,
                          { backgroundColor: `${item.color}20` },
                        ]}
                      >
                        <Icon size={18} color={item.color} />
                      </View>
                      <Text
                        style={[
                          styles.reportTypeTitle,
                          isSelected && { color: item.color, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <View style={[styles.typeActiveBadge, { backgroundColor: item.color }]}>
                          <Check size={10} color={colors.white} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Date Range & Quick Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>2. STATEMENT DATE RANGE</Text>
              <View style={styles.presetChipsRow}>
                {(['this_month', 'last_month', 'last_3m', 'this_year', 'all', 'custom'] as const).map(
                  (p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.presetChip,
                        datePreset === p && styles.presetChipActive,
                      ]}
                      onPress={() => applyPreset(p)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          datePreset === p && styles.presetChipTextActive,
                        ]}
                      >
                        {p === 'this_month'
                          ? 'This Month'
                          : p === 'last_month'
                          ? 'Last Month'
                          : p === 'last_3m'
                          ? 'Last 3M'
                          : p === 'this_year'
                          ? 'This Year'
                          : p === 'all'
                          ? 'All Time'
                          : 'Custom'}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Start & End Date Inputs */}
              <View style={styles.dateInputsRow}>
                <View style={styles.dateInputCol}>
                  <Text style={styles.inputSubLabel}>FROM DATE (YYYY-MM-DD)</Text>
                  <View style={styles.inputWithIcon}>
                    <Calendar size={14} color={colors.slate[400]} />
                    <TextInput
                      style={styles.textInput}
                      value={startDate}
                      onChangeText={(val) => {
                        setStartDate(val);
                        setDatePreset('custom');
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.slate[400]}
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={styles.dateInputCol}>
                  <Text style={styles.inputSubLabel}>TO DATE (YYYY-MM-DD)</Text>
                  <View style={styles.inputWithIcon}>
                    <Calendar size={14} color={colors.slate[400]} />
                    <TextInput
                      style={styles.textInput}
                      value={endDate}
                      onChangeText={(val) => {
                        setEndDate(val);
                        setDatePreset('custom');
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.slate[400]}
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 3. Custom Filters (Category, Subcategory, Type) */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>3. CUSTOM FILTERS (OPTIONAL)</Text>

              {/* Scope: Both / Income / Expense */}
              {reportType !== 'income' && reportType !== 'expense' && reportType !== 'khata' && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputSubLabel}>RECORD TYPE</Text>
                  <View style={styles.filterPillsRow}>
                    {(['all', 'income', 'expense'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeFilterPill,
                          txTypeFilter === t && styles.typeFilterPillActive,
                        ]}
                        onPress={() => setTxTypeFilter(t)}
                      >
                        <Text
                          style={[
                            styles.typeFilterPillText,
                            txTypeFilter === t && styles.typeFilterPillTextActive,
                          ]}
                        >
                          {t === 'all' ? 'All (Both)' : t === 'income' ? 'Income Only' : 'Expense Only'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Category Filter */}
              {reportType !== 'khata' && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputSubLabel}>CATEGORY FILTER</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.catFilterChip,
                        !selectedCategory && styles.catFilterChipActive,
                      ]}
                      onPress={() => {
                        setSelectedCategory('');
                        setSelectedSubcategory('');
                      }}
                    >
                      <Text style={[styles.catFilterChipText, !selectedCategory && styles.catFilterChipTextActive]}>
                        All Categories
                      </Text>
                    </TouchableOpacity>
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.catFilterChip,
                          selectedCategory === c.id && styles.catFilterChipActive,
                        ]}
                        onPress={() => {
                          setSelectedCategory(c.id);
                          setSelectedSubcategory('');
                        }}
                      >
                        <Text
                          style={[
                            styles.catFilterChipText,
                            selectedCategory === c.id && styles.catFilterChipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Subcategory Filter (If category is selected) */}
              {selectedCategory && availableSubcategories.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputSubLabel}>SUBCATEGORY FILTER</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.catFilterChip,
                        !selectedSubcategory && styles.catFilterChipActive,
                      ]}
                      onPress={() => setSelectedSubcategory('')}
                    >
                      <Text style={[styles.catFilterChipText, !selectedSubcategory && styles.catFilterChipTextActive]}>
                        All Subcategories
                      </Text>
                    </TouchableOpacity>
                    {availableSubcategories.map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.catFilterChip,
                          selectedSubcategory === sub.name && styles.catFilterChipActive,
                        ]}
                        onPress={() => setSelectedSubcategory(sub.name)}
                      >
                        <Text
                          style={[
                            styles.catFilterChipText,
                            selectedSubcategory === sub.name && styles.catFilterChipTextActive,
                          ]}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Khata Person Filter */}
              {(reportType === 'khata' || reportType === 'complete') && personSummaries.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputSubLabel}>KHATA PERSON FILTER</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    <TouchableOpacity
                      style={[
                        styles.catFilterChip,
                        !selectedPerson && styles.catFilterChipActive,
                      ]}
                      onPress={() => setSelectedPerson('')}
                    >
                      <Text style={[styles.catFilterChipText, !selectedPerson && styles.catFilterChipTextActive]}>
                        All People
                      </Text>
                    </TouchableOpacity>
                    {personSummaries.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.catFilterChip,
                          selectedPerson === p.id && styles.catFilterChipActive,
                        ]}
                        onPress={() => setSelectedPerson(p.id)}
                      >
                        <Text
                          style={[
                            styles.catFilterChipText,
                            selectedPerson === p.id && styles.catFilterChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Custom Statement Title */}
              <View>
                <Text style={styles.inputSubLabel}>STATEMENT TITLE (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInputFull}
                  value={reportTitleInput}
                  onChangeText={setReportTitleInput}
                  placeholder={`e.g. ${getReportTitle(reportType)}`}
                  placeholderTextColor={colors.slate[400]}
                />
              </View>
            </View>

            {/* 4. Live Data Match Preview Card */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color={colors.brand[600]} />
                  <Text style={styles.previewTitle}>Live Report Preview</Text>
                </View>
                <Text style={styles.previewCount}>
                  {previewData.totalRecords} record{previewData.totalRecords !== 1 ? 's' : ''} found
                </Text>
              </View>

              <View style={styles.previewKpiGrid}>
                <View style={styles.previewKpiBox}>
                  <Text style={styles.previewKpiLabel}>Income</Text>
                  <Text style={[styles.previewKpiVal, { color: '#059669' }]}>
                    +{formatRupees(previewData.totalIncome)}
                  </Text>
                </View>

                <View style={styles.previewKpiBox}>
                  <Text style={styles.previewKpiLabel}>Expenses</Text>
                  <Text style={[styles.previewKpiVal, { color: '#e11d48' }]}>
                    -{formatRupees(previewData.totalExpense)}
                  </Text>
                </View>

                <View style={styles.previewKpiBox}>
                  <Text style={styles.previewKpiLabel}>Net Balance</Text>
                  <Text
                    style={[
                      styles.previewKpiVal,
                      { color: previewData.netSavings >= 0 ? colors.brand[600] : '#e11d48' },
                    ]}
                  >
                    {previewData.netSavings >= 0 ? '+' : ''}{formatRupees(previewData.netSavings)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            {isGenerating ? (
              <View style={styles.generatingBox}>
                <ActivityIndicator color={colors.brand[600]} size="small" />
                <Text style={styles.generatingText}>
                  {generationAction === 'print'
                    ? 'Opening Print Preview...'
                    : generationAction === 'share'
                    ? 'Preparing Native Share Sheet...'
                    : 'Generating & Saving PDF Statement...'}
                </Text>
              </View>
            ) : (
              <View style={styles.actionButtonsRow}>
                {/* 1. Download PDF (Primary) */}
                <TouchableOpacity
                  style={styles.primaryDownloadBtn}
                  onPress={() => handleGenerateAction('download')}
                  activeOpacity={0.8}
                >
                  <Download size={16} color={colors.white} strokeWidth={2.2} />
                  <Text style={styles.primaryDownloadBtnText}>Download PDF</Text>
                </TouchableOpacity>

                {/* 2. Share PDF */}
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => handleGenerateAction('share')}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color={colors.slate[700]} strokeWidth={2} />
                  <Text style={styles.secondaryActionBtnText}>Share</Text>
                </TouchableOpacity>

                {/* 3. Print / View Spooler */}
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={() => handleGenerateAction('print')}
                  activeOpacity={0.8}
                >
                  <Printer size={16} color={colors.slate[700]} strokeWidth={2} />
                  <Text style={styles.secondaryActionBtnText}>Print</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  modalCardWide: {
    maxWidth: 620,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
    backgroundColor: colors.slate[50],
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand[100],
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    flexShrink: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
  },
  section: {
    backgroundColor: colors.white,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.slate[400],
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  reportTypesStrip: {
    gap: 10,
    paddingVertical: 4,
  },
  reportTypeCard: {
    width: 140,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[50],
    alignItems: 'center',
    position: 'relative',
  },
  reportTypeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  reportTypeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[700],
    textAlign: 'center',
  },
  typeActiveBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  presetChipActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  presetChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInputCol: {
    flex: 1,
  },
  inputSubLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.slate[500],
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[800],
    padding: 0,
  },
  textInputFull: {
    height: 40,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[800],
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  typeFilterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  typeFilterPillActive: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[600],
  },
  typeFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[600],
  },
  typeFilterPillTextActive: {
    color: colors.brand[700],
    fontWeight: '700',
  },
  catFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginRight: 6,
  },
  catFilterChipActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[600],
  },
  catFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  catFilterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[800],
  },
  previewCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
  },
  previewKpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  previewKpiBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  previewKpiLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.slate[500],
    textTransform: 'uppercase',
  },
  previewKpiVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    backgroundColor: colors.white,
  },
  generatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  generatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand[700],
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryDownloadBtn: {
    flex: 2,
    height: 44,
    backgroundColor: colors.brand[600],
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryDownloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[700],
  },
});
