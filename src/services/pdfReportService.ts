/**
 * MY WALLET - Professional PDF Report Generation Service
 * Generates publication-grade financial statements and reports
 * using real Supabase transaction data, expo-print, and expo-sharing.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Transaction, CreditDebtRecord, Category, Account, PersonSummary } from '../types';
import { formatRupees } from '../lib/currency';
import { formatFullDate } from '../lib/date';

export type ReportType =
  | 'complete'        // Complete Financial Report (Income + Expense + Khata)
  | 'income'          // Income Report
  | 'expense'         // Expense Report
  | 'khata'           // Khata Report (Credit & Debit)
  | 'category'        // Category-wise Report
  | 'subcategory'     // Subcategory-wise Report
  | 'monthly'         // Monthly Report
  | 'yearly'          // Yearly Report
  | 'custom';         // Custom Date Range Report

export interface PdfReportFilterOptions {
  reportType: ReportType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  title?: string;
  transactionTypeFilter?: 'all' | 'income' | 'expense';
  selectedCategoryId?: string;
  selectedSubcategoryName?: string;
  selectedPersonId?: string;
  selectedAccountId?: string;
  userName?: string;
  userEmail?: string;
  openingBalance?: number;
}

export interface GeneratedPdfResult {
  uri: string;
  filename: string;
  title: string;
  recordCount: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  htmlContent: string;
}

export interface CategorySummaryItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  total: number;
  count: number;
  percentage: number;
  subcategories: { name: string; total: number; count: number }[];
}

/**
 * Filter & aggregate transactions for PDF report
 */
export function filterReportData(
  transactions: Transaction[],
  creditDebtRecords: CreditDebtRecord[],
  categories: Category[],
  _accounts: Account[],
  _people: PersonSummary[],
  options: PdfReportFilterOptions
) {
  const {
    reportType,
    startDate,
    endDate,
    transactionTypeFilter = 'all',
    selectedCategoryId,
    selectedSubcategoryName,
    selectedPersonId,
    selectedAccountId,
  } = options;

  // 1. Filter Transactions (Finance)
  const filteredTransactions = transactions.filter((tx) => {
    // Exclude if outside date range
    if (startDate && tx.transactionDate < startDate) return false;
    if (endDate && tx.transactionDate > endDate) return false;

    // Report Type specific filtering
    if (reportType === 'income' && tx.type !== 'income') return false;
    if (reportType === 'expense' && tx.type !== 'expense') return false;
    if (reportType === 'khata') return false; // Khata report only shows Khata records

    // User selected transaction type filter
    if (transactionTypeFilter !== 'all' && tx.type !== transactionTypeFilter) return false;

    // Category filter
    if (selectedCategoryId && tx.categoryId !== selectedCategoryId) return false;

    // Subcategory filter
    if (selectedSubcategoryName && tx.subcategoryName !== selectedSubcategoryName) return false;

    // Account filter
    if (selectedAccountId && tx.accountId !== selectedAccountId) return false;

    return true;
  });

  // Sort transactions chronologically (oldest to newest for statement ledger)
  filteredTransactions.sort((a, b) => {
    const cmp = a.transactionDate.localeCompare(b.transactionDate);
    if (cmp !== 0) return cmp;
    return (a.transactionTime || '00:00').localeCompare(b.transactionTime || '00:00');
  });

  // 2. Filter Khata Records
  const includeKhata = reportType === 'complete' || reportType === 'khata' || reportType === 'custom';
  const filteredKhata = includeKhata
    ? creditDebtRecords.filter((rec) => {
        const txDate = rec.transactionDate || rec.createdAt.slice(0, 10);
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
        if (selectedPersonId && rec.personId !== selectedPersonId) return false;
        return true;
      })
    : [];

  filteredKhata.sort((a, b) => {
    const da = a.transactionDate || a.createdAt.slice(0, 10);
    const db = b.transactionDate || b.createdAt.slice(0, 10);
    return da.localeCompare(db);
  });

  // 3. Compute Financial Totals
  let totalIncome = 0;
  let totalExpense = 0;

  filteredTransactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // 4. Compute Khata Totals
  let totalKhataGiven = 0;        // Money lent out (receivable)
  let totalKhataReceivedBack = 0; // Money returned to me
  let totalKhataBorrowed = 0;     // Money borrowed (payable)
  let totalKhataRepaid = 0;       // Money repaid by me

  filteredKhata.forEach((k) => {
    if (k.type === 'credit') {
      totalKhataGiven += k.originalAmount;
      totalKhataReceivedBack += k.settledAmount;
    } else {
      totalKhataBorrowed += k.originalAmount;
      totalKhataRepaid += k.settledAmount;
    }
  });

  const outstandingReceivable = Math.max(0, totalKhataGiven - totalKhataReceivedBack);
  const outstandingPayable = Math.max(0, totalKhataBorrowed - totalKhataRepaid);
  const netKhataBalance = outstandingReceivable - outstandingPayable;

  // 5. Category Breakdown Aggregation
  const categoryMap = new Map<string, {
    id: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
    total: number;
    count: number;
    subcategories: Map<string, { total: number; count: number }>;
  }>();

  filteredTransactions.forEach((tx) => {
    const cat = categories.find((c) => c.id === tx.categoryId);
    const catName = cat?.name || (tx.type === 'income' ? 'Other Income' : 'Other Expense');
    const catColor = cat?.color || (tx.type === 'income' ? '#10b981' : '#f43f5e');

    if (!categoryMap.has(tx.categoryId)) {
      categoryMap.set(tx.categoryId, {
        id: tx.categoryId,
        name: catName,
        type: tx.type,
        color: catColor,
        total: 0,
        count: 0,
        subcategories: new Map(),
      });
    }

    const entry = categoryMap.get(tx.categoryId)!;
    entry.total += tx.amount;
    entry.count += 1;

    const subName = tx.subcategoryName || 'General';
    const subEntry = entry.subcategories.get(subName) || { total: 0, count: 0 };
    subEntry.total += tx.amount;
    subEntry.count += 1;
    entry.subcategories.set(subName, subEntry);
  });

  const categoryBreakdown: CategorySummaryItem[] = Array.from(categoryMap.values()).map((c) => {
    const baseline = c.type === 'income' ? totalIncome : totalExpense;
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      color: c.color,
      total: c.total,
      count: c.count,
      percentage: baseline > 0 ? Math.round((c.total / baseline) * 100) : 0,
      subcategories: Array.from(c.subcategories.entries()).map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
      })).sort((a, b) => b.total - a.total),
    };
  }).sort((a, b) => b.total - a.total);

  return {
    transactions: filteredTransactions,
    khataRecords: filteredKhata,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    totalKhataGiven,
    totalKhataReceivedBack,
    totalKhataBorrowed,
    totalKhataRepaid,
    outstandingReceivable,
    outstandingPayable,
    netKhataBalance,
    categoryBreakdown,
    totalRecords: filteredTransactions.length + filteredKhata.length,
  };
}

/**
 * Get human-readable report title
 */
export function getReportTitle(reportType: ReportType, customTitle?: string): string {
  if (customTitle && customTitle.trim()) return customTitle.trim();
  switch (reportType) {
    case 'complete':
      return 'Complete Financial Statement';
    case 'income':
      return 'Income & Earnings Report';
    case 'expense':
      return 'Expense & Expenditure Report';
    case 'khata':
      return 'Khata Book Statement (Credit & Debit)';
    case 'category':
      return 'Category-wise Spending & Income Report';
    case 'subcategory':
      return 'Subcategory Breakdown Report';
    case 'monthly':
      return 'Monthly Financial Statement';
    case 'yearly':
      return 'Annual Financial Overview';
    case 'custom':
    default:
      return 'Custom Period Financial Statement';
  }
}

/**
 * Generate publication-grade, responsive HTML for Expo Print
 */
export function generateReportHtml(
  data: ReturnType<typeof filterReportData>,
  options: PdfReportFilterOptions,
  categories: Category[],
  accounts: Account[]
): string {
  const title = getReportTitle(options.reportType, options.title);
  const generationDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const generationTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedStart = options.startDate
    ? formatFullDate(options.startDate)
    : 'All Past';
  const formattedEnd = options.endDate
    ? formatFullDate(options.endDate)
    : 'Today';

  const dateRangeDisplay = `${formattedStart} — ${formattedEnd}`;
  const userName = options.userName || 'Account Holder';
  const userEmail = options.userEmail || '';
  const refId = `MW-${Date.now().toString(36).toUpperCase()}`;

  const getAccountName = (accId?: string) => {
    if (!accId) return 'Cash / Default';
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Default Account';
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'General';
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'General';
  };

  // HTML CSS Stylesheet (Print-safe, pixel-perfect, A4 portrait optimized)
  const styles = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 24px;
    }
    @page {
      size: A4 portrait;
      margin: 14mm 10mm 16mm 10mm;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
      .kpi-grid, .breakdown-section, .statement-table-wrap {
        page-break-inside: avoid;
      }
    }

    /* Executive Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 14px;
    }
    .header-logo-title {
      vertical-align: top;
      text-align: left;
    }
    .brand-logo-badge {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 1.5px;
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .report-main-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin-top: 4px;
    }
    .report-meta-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .header-right-meta {
      vertical-align: top;
      text-align: right;
    }
    .period-badge {
      display: inline-block;
      background-color: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
    }
    .meta-line {
      font-size: 10.5px;
      color: #64748b;
      line-height: 1.5;
    }
    .meta-line strong {
      color: #334155;
    }

    /* Client Info Banner */
    .client-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .client-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .client-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .client-email {
      font-size: 10.5px;
      color: #64748b;
    }

    /* KPI Cards Grid */
    .kpi-container {
      display: table;
      width: 100%;
      margin-bottom: 20px;
      table-layout: fixed;
      border-spacing: 8px 0;
    }
    .kpi-cell {
      display: table-cell;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      vertical-align: top;
    }
    .kpi-income { border-top: 3px solid #10b981; }
    .kpi-expense { border-top: 3px solid #f43f5e; }
    .kpi-savings { border-top: 3px solid #0284c7; }
    .kpi-khata { border-top: 3px solid #8b5cf6; }

    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .kpi-value.income-val { color: #059669; }
    .kpi-value.expense-val { color: #e11d48; }
    .kpi-value.savings-pos { color: #0284c7; }
    .kpi-value.savings-neg { color: #e11d48; }
    .kpi-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Section Headers */
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-count {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: none;
    }

    /* Category Breakdown Table */
    .category-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
    }
    .category-table th {
      background-color: #f1f5f9;
      color: #475569;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    .category-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10.5px;
    }
    .progress-bar-bg {
      background-color: #f1f5f9;
      height: 6px;
      border-radius: 3px;
      width: 100%;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
    }

    /* Transactions Statement Table */
    .tx-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .tx-table th {
      background-color: #f8fafc;
      color: #334155;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 7px 8px;
      border-top: 1px solid #e2e8f0;
      border-bottom: 2px solid #cbd5e1;
      text-align: left;
    }
    .tx-table th.col-amount {
      text-align: right;
    }
    .tx-table td {
      padding: 7px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10px;
      vertical-align: middle;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .tx-table tr:nth-child(even) td {
      background-color: #fafbfd;
    }
    .tx-table td.col-amount {
      text-align: right;
      font-weight: 700;
      font-size: 10.5px;
      white-space: nowrap;
    }

    /* Badges & Tags */
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-income {
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-expense {
      background-color: #fff1f2;
      color: #be123c;
      border: 1px solid #fecdd3;
    }
    .badge-credit {
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .badge-debt {
      background-color: #fdf2f8;
      color: #be185d;
      border: 1px solid #fbcfe8;
    }

    .subcat-tag {
      font-size: 9.5px;
      color: #64748b;
      display: block;
      margin-top: 1px;
    }
    .account-tag {
      font-size: 9px;
      color: #64748b;
      background-color: #f1f5f9;
      padding: 1px 5px;
      border-radius: 3px;
      display: inline-block;
    }

    /* Grand Total Row */
    .total-row td {
      background-color: #f8fafc !important;
      border-top: 2px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
      padding: 9px 8px;
    }

    /* Empty state notice */
    .empty-box {
      text-align: center;
      padding: 36px 20px;
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .empty-title {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .empty-desc {
      font-size: 11px;
      color: #94a3b8;
    }

    /* Footer Note */
    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: table;
      width: 100%;
    }
    .footer-left {
      display: table-cell;
      font-size: 9.5px;
      color: #94a3b8;
      vertical-align: middle;
    }
    .footer-right {
      display: table-cell;
      font-size: 9.5px;
      color: #94a3b8;
      text-align: right;
      vertical-align: middle;
    }
  `;

  // Render Category Breakdown Rows
  const renderCategoryRows = () => {
    if (data.categoryBreakdown.length === 0) return '';
    return data.categoryBreakdown.map((c) => {
      const subcatText = c.subcategories.length > 0
        ? c.subcategories.map((s) => `${s.name}: ${formatRupees(s.total)}`).join(' • ')
        : 'General';

      return `
        <tr>
          <td style="font-weight: 700; color: #1e293b; width: 30%;">
            <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${c.color}; margin-right: 5px;"></span>
            ${c.name}
            <span style="display:block; font-size: 8.5px; color: #64748b; font-weight: normal; margin-top: 1px;">${subcatText}</span>
          </td>
          <td style="width: 12%; text-align: center;">
            <span class="badge ${c.type === 'income' ? 'badge-income' : 'badge-expense'}">${c.type}</span>
          </td>
          <td style="width: 15%; text-align: center; color: #475569;">${c.count} txn${c.count !== 1 ? 's' : ''}</td>
          <td style="width: 25%;">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${c.percentage}%; background-color: ${c.color};"></div>
            </div>
            <span style="font-size: 8.5px; color: #64748b; margin-top: 1px; display: inline-block;">${c.percentage}% of ${c.type}</span>
          </td>
          <td style="width: 18%; text-align: right; font-weight: 800; color: ${c.type === 'income' ? '#059669' : '#e11d48'};">
            ${c.type === 'income' ? '+ ' : '- '}${formatRupees(c.total, { showDecimals: true })}
          </td>
        </tr>
      `;
    }).join('');
  };

  // Render Transaction Table Rows
  const renderTransactionRows = () => {
    if (data.transactions.length === 0 && data.khataRecords.length === 0) {
      return '';
    }

    const rows: string[] = [];

    // 1. Finance Transactions
    data.transactions.forEach((tx) => {
      const isIncome = tx.type === 'income';
      const formattedDate = formatFullDate(tx.transactionDate);
      const timeStr = tx.transactionTime || '';

      rows.push(`
        <tr>
          <td style="width: 14%; color: #475569;">
            <strong>${formattedDate}</strong>
            ${timeStr ? `<span style="display:block; font-size: 8.5px; color: #94a3b8;">${timeStr}</span>` : ''}
          </td>
          <td style="width: 10%;">
            <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${tx.type}</span>
          </td>
          <td style="width: 32%;">
            <strong style="color: #0f172a;">${tx.title}</strong>
            ${tx.description ? `<span style="display:block; font-size: 8.5px; color: #64748b; margin-top: 1px;">${tx.description}</span>` : ''}
          </td>
          <td style="width: 18%;">
            <span style="font-weight: 600; color: #334155;">${getCategoryName(tx.categoryId)}</span>
            ${tx.subcategoryName ? `<span class="subcat-tag">${tx.subcategoryName}</span>` : ''}
          </td>
          <td style="width: 12%;">
            <span class="account-tag">${getAccountName(tx.accountId)}</span>
            <span style="display:block; font-size: 8.5px; color: #94a3b8; text-transform: uppercase; margin-top: 1px;">${tx.paymentMethod}</span>
          </td>
          <td class="col-amount" style="width: 14%; color: ${isIncome ? '#059669' : '#e11d48'};">
            ${isIncome ? '+' : '-'} ${formatRupees(tx.amount, { showDecimals: true })}
          </td>
        </tr>
      `);
    });

    // 2. Khata Records (Credit & Debt)
    data.khataRecords.forEach((k) => {
      const isCredit = k.type === 'credit';
      const kDate = k.transactionDate || k.createdAt.slice(0, 10);
      const formattedDate = formatFullDate(kDate);

      rows.push(`
        <tr>
          <td style="width: 14%; color: #475569;">
            <strong>${formattedDate}</strong>
            <span style="display:block; font-size: 8.5px; color: #94a3b8;">Khata Entry</span>
          </td>
          <td style="width: 10%;">
            <span class="badge ${isCredit ? 'badge-credit' : 'badge-debt'}">${isCredit ? 'Lent (Credit)' : 'Borrow (Debt)'}</span>
          </td>
          <td style="width: 32%;">
            <strong style="color: #0f172a;">${k.counterpartName}</strong>
            ${k.notes ? `<span style="display:block; font-size: 8.5px; color: #64748b; margin-top: 1px;">${k.notes}</span>` : ''}
          </td>
          <td style="width: 18%;">
            <span style="font-weight: 600; color: #334155;">${isCredit ? 'Khata Receivable' : 'Khata Payable'}</span>
            <span class="subcat-tag">Status: ${k.status}</span>
          </td>
          <td style="width: 12%;">
            <span class="account-tag">${k.counterpartPhone || 'Khata Book'}</span>
            ${k.dueDate ? `<span style="display:block; font-size: 8.5px; color: #e11d48; margin-top: 1px;">Due: ${k.dueDate}</span>` : ''}
          </td>
          <td class="col-amount" style="width: 14%; color: ${isCredit ? '#1d4ed8' : '#be185d'};">
            ${isCredit ? '+' : '-'} ${formatRupees(k.originalAmount, { showDecimals: true })}
          </td>
        </tr>
      `);
    });

    return rows.join('');
  };

  const isPositiveSavings = data.netSavings >= 0;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} - MY WALLET</title>
        <style>${styles}</style>
      </head>
      <body>
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td class="header-logo-title">
              <div class="brand-logo-badge">MY WALLET</div>
              <h1 class="report-main-title">${title}</h1>
              <p class="report-meta-sub">Official Personal Financial Ledger & Statement</p>
            </td>
            <td class="header-right-meta">
              <div class="period-badge">${dateRangeDisplay}</div>
              <p class="meta-line"><strong>Statement Ref:</strong> ${refId}</p>
              <p class="meta-line"><strong>Generated on:</strong> ${generationDate} at ${generationTime}</p>
              <p class="meta-line"><strong>Currency:</strong> Indian Rupee (INR ₹)</p>
            </td>
          </tr>
        </table>

        <!-- User Information Banner -->
        <div class="client-card">
          <div>
            <div class="client-title">Account Holder / Profile</div>
            <div class="client-name">${userName}</div>
            ${userEmail ? `<div class="client-email">${userEmail}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div class="client-title">Total Records Filtered</div>
            <div style="font-size: 13px; font-weight: 800; color: #0284c7;">${data.totalRecords} Entries</div>
          </div>
        </div>

        <!-- Executive Financial KPI Cards -->
        <div class="kpi-container">
          <div class="kpi-cell kpi-income">
            <div class="kpi-label">TOTAL INCOME</div>
            <div class="kpi-value income-val">+ ${formatRupees(data.totalIncome, { showDecimals: true })}</div>
            <div class="kpi-sub">${data.transactions.filter((t) => t.type === 'income').length} earnings records</div>
          </div>

          <div class="kpi-cell kpi-expense">
            <div class="kpi-label">TOTAL EXPENSES</div>
            <div class="kpi-value expense-val">- ${formatRupees(data.totalExpense, { showDecimals: true })}</div>
            <div class="kpi-sub">${data.transactions.filter((t) => t.type === 'expense').length} spending records</div>
          </div>

          <div class="kpi-cell kpi-savings">
            <div class="kpi-label">NET CASHFLOW / SAVINGS</div>
            <div class="kpi-value ${isPositiveSavings ? 'savings-pos' : 'savings-neg'}">
              ${isPositiveSavings ? '+' : '-'} ${formatRupees(Math.abs(data.netSavings), { showDecimals: true })}
            </div>
            <div class="kpi-sub">Savings Rate: ${data.savingsRate}%</div>
          </div>

          ${options.reportType === 'khata' || options.reportType === 'complete' ? `
            <div class="kpi-cell kpi-khata">
              <div class="kpi-label">KHATA NET POSITION</div>
              <div class="kpi-value" style="color: ${data.netKhataBalance >= 0 ? '#059669' : '#be185d'};">
                ${data.netKhataBalance >= 0 ? '+' : '-'} ${formatRupees(Math.abs(data.netKhataBalance), { showDecimals: true })}
              </div>
              <div class="kpi-sub">Receivable: ${formatRupees(data.outstandingReceivable)}</div>
            </div>
          ` : ''}
        </div>

        <!-- Category & Subcategory Breakdown Section -->
        ${data.categoryBreakdown.length > 0 ? `
          <div class="breakdown-section">
            <div class="section-title">
              <span>Category & Subcategory Breakdown</span>
              <span class="section-count">${data.categoryBreakdown.length} Categories</span>
            </div>
            <table class="category-table">
              <thead>
                <tr>
                  <th>Category & Subcategories</th>
                  <th style="text-align: center;">Type</th>
                  <th style="text-align: center;">Transactions</th>
                  <th>Share of Volume</th>
                  <th style="text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${renderCategoryRows()}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Itemized Transaction Ledger -->
        <div class="statement-table-wrap">
          <div class="section-title">
            <span>Detailed Transaction Statement</span>
            <span class="section-count">${data.totalRecords} Entries Listed</span>
          </div>

          ${data.totalRecords === 0 ? `
            <div class="empty-box">
              <div class="empty-title">No Transactions Recorded</div>
              <div class="empty-desc">No income, expense, or Khata entries match the selected filters and date range (${dateRangeDisplay}).</div>
            </div>
          ` : `
            <table class="tx-table">
              <thead>
                <tr>
                  <th style="width: 14%;">Date & Time</th>
                  <th style="width: 10%;">Type</th>
                  <th style="width: 32%;">Description / Reference</th>
                  <th style="width: 18%;">Category & Subcategory</th>
                  <th style="width: 12%;">Account / Mode</th>
                  <th class="col-amount" style="width: 14%;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${renderTransactionRows()}
                <tr class="total-row">
                  <td colspan="5" style="text-align: right; text-transform: uppercase;">
                    <strong>NET STATEMENT TOTAL (INCOME - EXPENSES):</strong>
                  </td>
                  <td class="col-amount" style="color: ${isPositiveSavings ? '#059669' : '#e11d48'}; font-size: 12px;">
                    ${isPositiveSavings ? '+' : '-'} ${formatRupees(Math.abs(data.netSavings), { showDecimals: true })}
                  </td>
                </tr>
              </tbody>
            </table>
          `}
        </div>

        <!-- Professional Footer -->
        <div class="report-footer">
          <div class="footer-left">
            MY WALLET • Confidential Personal Financial Statement • Document Ref: ${refId}
          </div>
          <div class="footer-right">
            Generated securely on device with real Supabase records
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate PDF file on device
 */
export async function generatePdfReport(
  transactions: Transaction[],
  creditDebtRecords: CreditDebtRecord[],
  categories: Category[],
  accounts: Account[],
  people: PersonSummary[],
  options: PdfReportFilterOptions
): Promise<GeneratedPdfResult> {
  const data = filterReportData(transactions, creditDebtRecords, categories, accounts, people, options);
  const html = generateReportHtml(data, options, categories, accounts);
  const title = getReportTitle(options.reportType, options.title);

  // Generate safe filename
  const cleanType = options.reportType.toUpperCase();
  const startSlug = options.startDate ? options.startDate.replace(/-/g, '') : 'START';
  const endSlug = options.endDate ? options.endDate.replace(/-/g, '') : 'TODAY';
  const filename = `MY_WALLET_${cleanType}_${startSlug}_${endSlug}.pdf`;

  // 1. Generate PDF via expo-print
  const printResult = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // 2. Copy/move to Document Directory with human-readable filename
  const destinationUri = `${FileSystem.documentDirectory}${filename}`;
  try {
    await FileSystem.copyAsync({
      from: printResult.uri,
      to: destinationUri,
    });
  } catch (copyErr) {
    console.warn('[PDF] Copy warning, using original print URI:', copyErr);
  }

  const finalUri = destinationUri;

  return {
    uri: finalUri,
    filename,
    title,
    recordCount: data.totalRecords,
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    netSavings: data.netSavings,
    htmlContent: html,
  };
}

/**
 * Share PDF via Android Native Share Sheet
 */
export async function sharePdfReport(uri: string, filename: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not supported on this device/platform.');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${filename}`,
      UTI: 'com.adobe.pdf',
    });
    return true;
  } catch (err: any) {
    console.error('[PDF Share Error]', err);
    throw err;
  }
}

/**
 * Save PDF to Device Files (using Android StorageAccessFramework when available, or fallback)
 */
export async function savePdfToDevice(uri: string, filename: string): Promise<{ success: boolean; message: string }> {
  try {
    if (Platform.OS === 'android') {
      try {
        // Request folder permission to save file in chosen location (e.g. Downloads / Documents)
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/pdf'
          );

          const base64Content = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await FileSystem.writeAsStringAsync(fileUri, base64Content, {
            encoding: FileSystem.EncodingType.Base64,
          });

          return {
            success: true,
            message: `Report successfully saved to your selected device folder as ${filename}.`,
          };
        } else {
          // If user cancels folder selection, fallback to native share
          await sharePdfReport(uri, filename);
          return {
            success: true,
            message: 'Opened share sheet to save or send report.',
          };
        }
      } catch (safErr) {
        // Fallback to sharing dialog which has "Save to device" / "Save to Drive" / "Save to Files"
        await sharePdfReport(uri, filename);
        return {
          success: true,
          message: 'Opened native file sheet to save or send report.',
        };
      }
    } else {
      // iOS / Web fallback
      await sharePdfReport(uri, filename);
      return {
        success: true,
        message: 'Opened share options for PDF report.',
      };
    }
  } catch (err: any) {
    console.error('[PDF Save Error]', err);
    return {
      success: false,
      message: err.message || 'Could not save PDF to device.',
    };
  }
}

/**
 * Open Native Print Preview / Save as PDF Spooler
 */
export async function printPdfReport(html: string): Promise<void> {
  await Print.printAsync({ html });
}
