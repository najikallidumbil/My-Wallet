/**
 * FINANCIAL CALCULATION ENGINE - MY WALLET
 *
 * Implements strict financial formulas across the three modes:
 *
 * MODE 1: Income & Expense
 *   Available Balance = Opening Balance + Total Income - Total Expense
 *   (Credit & Debt strictly excluded)
 *
 * MODE 2: Khata Book (Credit & Debt)
 *   Total Receivable = Total Given - Total Received Back
 *   Total Payable    = Total Borrowed - Total Repaid
 *   Person Net       = Person Receivable - Person Payable
 *
 * MODE 3: Combined Financial Overview
 *   Actual Cash = Opening Cash + Income - Expenses
 *               + Borrowed Money Received - Debt Repaid
 *               + Credit Repaid - Credit Given
 *   Net Worth   = Actual Cash + Receivable - Payable
 *
 * All functions use two-decimal rounding (INR precision) and prevent double counting.
 */

import {
  Transaction,
  CreditDebtRecord,
  Account,
  AccountTransfer,
  Person,
  PersonSummary,
  Category,
  Budget,
  BudgetSummary,
  CategoryBudgetProgress,
  IncomeExpenseSummary,
  KhataSummary,
  CombinedFinancialSummary,
} from '../types';

/**
 * Standard rounding to 2 decimal places for INR currency precision.
 */
export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * MODE 1: Calculate Income & Expense Summary
 * Strictly excludes Credit & Debt transactions.
 */
export function calculateIncomeExpenseSummary(
  transactions: Transaction[],
  openingBalance: number = 0,
  currentMonthStr?: string
): IncomeExpenseSummary {
  const currentMonth = currentMonthStr || new Date().toISOString().slice(0, 7);

  let totalIncome = 0;
  let totalExpense = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  for (const tx of transactions) {
    const isCurrentMonth = tx.transactionDate.startsWith(currentMonth);

    if (tx.type === 'income') {
      totalIncome += tx.amount;
      if (isCurrentMonth) monthlyIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      if (isCurrentMonth) monthlyExpense += tx.amount;
    }
  }

  totalIncome = roundToTwoDecimals(totalIncome);
  totalExpense = roundToTwoDecimals(totalExpense);
  monthlyIncome = roundToTwoDecimals(monthlyIncome);
  monthlyExpense = roundToTwoDecimals(monthlyExpense);

  const availableCashBalance = roundToTwoDecimals(openingBalance + totalIncome - totalExpense);
  const netSavings = roundToTwoDecimals(monthlyIncome - monthlyExpense);
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / monthlyIncome) * 100))) : 0;

  return {
    openingBalance: roundToTwoDecimals(openingBalance),
    totalIncome,
    totalExpense,
    availableCashBalance,
    monthlyIncome,
    monthlyExpense,
    netSavings,
    savingsRate,
  };
}

/**
 * MODE 2: Calculate Khata Summary (Credit & Debt)
 */
export function calculateKhataSummary(
  creditDebtRecords: CreditDebtRecord[],
  currentMonthStr?: string
): KhataSummary {
  const currentMonth = currentMonthStr || new Date().toISOString().slice(0, 7);

  let totalGivenOriginal = 0;
  let totalReceivedBack = 0;
  let totalBorrowedOriginal = 0;
  let totalRepaid = 0;
  let overdueReceivable = 0;
  let overduePayable = 0;
  let overdueCount = 0;

  let monthlyLent = 0;
  let monthlyReceivedBack = 0;
  let monthlyBorrowed = 0;
  let monthlyRepaid = 0;

  const peopleSet = new Set<string>();
  const peopleBalanceMap = new Map<string, number>(); // positive = they owe me, negative = I owe them

  for (const record of creditDebtRecords) {
    const personKey = (record.counterpartName || '').trim().toLowerCase();
    if (personKey) {
      peopleSet.add(personKey);
    }

    const remaining = Math.max(0, record.originalAmount - (record.settledAmount || 0));
    const isOverdue = record.status === 'overdue';
    if (isOverdue) overdueCount++;

    const isCurrentMonthRecord = record.transactionDate.startsWith(currentMonth);

    if (record.type === 'credit') {
      totalGivenOriginal += record.originalAmount;
      totalReceivedBack += record.settledAmount || 0;
      if (isOverdue) overdueReceivable += remaining;
      if (isCurrentMonthRecord) monthlyLent += record.originalAmount;

      if (personKey) {
        peopleBalanceMap.set(personKey, (peopleBalanceMap.get(personKey) || 0) + remaining);
      }
    } else if (record.type === 'debt') {
      totalBorrowedOriginal += record.originalAmount;
      totalRepaid += record.settledAmount || 0;
      if (isOverdue) overduePayable += remaining;
      if (isCurrentMonthRecord) monthlyBorrowed += record.originalAmount;

      if (personKey) {
        peopleBalanceMap.set(personKey, (peopleBalanceMap.get(personKey) || 0) - remaining);
      }
    }

    // Monthly repayments
    if (record.repayments) {
      for (const rep of record.repayments) {
        if (rep.paymentDate.startsWith(currentMonth)) {
          if (record.type === 'credit') {
            monthlyReceivedBack += rep.amount;
          } else {
            monthlyRepaid += rep.amount;
          }
        }
      }
    }
  }

  let peopleOweMeCount = 0;
  let peopleIOweCount = 0;
  for (const bal of peopleBalanceMap.values()) {
    if (bal > 0) peopleOweMeCount++;
    else if (bal < 0) peopleIOweCount++;
  }

  totalGivenOriginal = roundToTwoDecimals(totalGivenOriginal);
  totalReceivedBack = roundToTwoDecimals(totalReceivedBack);
  totalBorrowedOriginal = roundToTwoDecimals(totalBorrowedOriginal);
  totalRepaid = roundToTwoDecimals(totalRepaid);

  const totalReceivable = roundToTwoDecimals(Math.max(0, totalGivenOriginal - totalReceivedBack));
  const totalPayable = roundToTwoDecimals(Math.max(0, totalBorrowedOriginal - totalRepaid));
  const netKhataBalance = roundToTwoDecimals(totalReceivable - totalPayable);

  return {
    totalReceivable,
    totalPayable,
    netKhataBalance,
    overdueReceivable: roundToTwoDecimals(overdueReceivable),
    overduePayable: roundToTwoDecimals(overduePayable),
    totalGivenOriginal,
    totalReceivedBack,
    totalBorrowedOriginal,
    totalRepaid,
    totalPeopleCount: peopleSet.size,
    peopleOweMeCount,
    peopleIOweCount,
    monthlyLent: roundToTwoDecimals(monthlyLent),
    monthlyReceivedBack: roundToTwoDecimals(monthlyReceivedBack),
    monthlyBorrowed: roundToTwoDecimals(monthlyBorrowed),
    monthlyRepaid: roundToTwoDecimals(monthlyRepaid),
    overdueCount,
  };
}

/**
 * Calculate Monthly Budget Progress and threshold warnings (80%, 90%, 100%)
 */
export function calculateBudgetProgress(
  categories: Category[],
  transactions: Transaction[],
  budgets: Budget[],
  currentMonthStr?: string
): BudgetSummary {
  const currentMonth = currentMonthStr || new Date().toISOString().slice(0, 7);
  const activeBudget = budgets.find((b) => b.month === currentMonth);

  // Map category spent for current month
  const spentMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.transactionDate.startsWith(currentMonth)) {
      spentMap.set(tx.categoryId, (spentMap.get(tx.categoryId) || 0) + tx.amount);
    }
  }

  const categoryProgresses: CategoryBudgetProgress[] = [];
  let totalBudget = activeBudget?.totalBudget || 0;
  let totalSpent = 0;
  let warningCount = 0;
  let exceededCount = 0;
  let calculatedCategoryBudgetSum = 0;

  for (const cat of categories) {
    if (cat.type !== 'expense') continue;

    const budgetLimit =
      activeBudget?.categoryBudgets?.[cat.id] ??
      (cat.budget && cat.budget > 0 ? cat.budget : 0);

    const spent = roundToTwoDecimals(spentMap.get(cat.id) || 0);
    totalSpent += spent;
    calculatedCategoryBudgetSum += budgetLimit;

    const remaining = roundToTwoDecimals(budgetLimit - spent);
    const percentage = budgetLimit > 0 ? roundToTwoDecimals((spent / budgetLimit) * 100) : 0;

    let status: 'normal' | 'warning' | 'urgent' | 'exceeded' = 'normal';
    if (percentage >= 100) {
      status = 'exceeded';
      exceededCount++;
    } else if (percentage >= 90) {
      status = 'urgent';
      warningCount++;
    } else if (percentage >= 80) {
      status = 'warning';
      warningCount++;
    }

    if (budgetLimit > 0 || spent > 0) {
      categoryProgresses.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        budget: budgetLimit,
        spent,
        remaining,
        percentage,
        status,
      });
    }
  }

  // If no explicit total budget set, fallback to sum of category budgets
  if (!totalBudget && calculatedCategoryBudgetSum > 0) {
    totalBudget = calculatedCategoryBudgetSum;
  }

  totalBudget = roundToTwoDecimals(totalBudget);
  totalSpent = roundToTwoDecimals(totalSpent);
  const remainingBudget = roundToTwoDecimals(totalBudget - totalSpent);
  const percentage = totalBudget > 0 ? roundToTwoDecimals((totalSpent / totalBudget) * 100) : 0;

  // Sort by highest percentage spent first
  categoryProgresses.sort((a, b) => b.percentage - a.percentage);

  return {
    totalBudget,
    totalSpent,
    remainingBudget,
    percentage,
    warningCount,
    exceededCount,
    categoryProgresses,
  };
}

/**
 * Aggregate Person-wise Ledger Accounts for Khata Book
 */
export function aggregatePersonSummaries(
  records: CreditDebtRecord[],
  people: Person[] = []
): PersonSummary[] {
  const map = new Map<string, PersonSummary>();

  // Seed with known people
  for (const p of people) {
    const key = p.name.trim().toLowerCase();
    map.set(key, {
      ...p,
      totalGiven: 0,
      totalReceivedBack: 0,
      totalBorrowed: 0,
      totalRepaid: 0,
      outstandingReceivable: 0,
      outstandingPayable: 0,
      netBalance: 0,
      recordsCount: 0,
    });
  }

  // Aggregate all records
  for (const record of records) {
    const cleanName = record.counterpartName.trim();
    const key = cleanName.toLowerCase();

    let entry = map.get(key);
    if (!entry) {
      entry = {
        id: `person-${key.replace(/\s+/g, '-')}`,
        name: cleanName,
        phone: record.counterpartPhone,
        email: record.counterpartEmail,
        createdAt: record.createdAt,
        totalGiven: 0,
        totalReceivedBack: 0,
        totalBorrowed: 0,
        totalRepaid: 0,
        outstandingReceivable: 0,
        outstandingPayable: 0,
        netBalance: 0,
        recordsCount: 0,
      };
      map.set(key, entry);
    } else {
      if (!entry.phone && record.counterpartPhone) entry.phone = record.counterpartPhone;
      if (!entry.email && record.counterpartEmail) entry.email = record.counterpartEmail;
    }

    entry.recordsCount += 1;
    const settled = record.settledAmount || 0;

    if (record.type === 'credit') {
      entry.totalGiven += record.originalAmount;
      entry.totalReceivedBack += settled;
    } else if (record.type === 'debt') {
      entry.totalBorrowed += record.originalAmount;
      entry.totalRepaid += settled;
    }
  }

  // Calculate final person balances
  const summaries: PersonSummary[] = [];
  for (const item of map.values()) {
    item.totalGiven = roundToTwoDecimals(item.totalGiven);
    item.totalReceivedBack = roundToTwoDecimals(item.totalReceivedBack);
    item.totalBorrowed = roundToTwoDecimals(item.totalBorrowed);
    item.totalRepaid = roundToTwoDecimals(item.totalRepaid);

    item.outstandingReceivable = roundToTwoDecimals(Math.max(0, item.totalGiven - item.totalReceivedBack));
    item.outstandingPayable = roundToTwoDecimals(Math.max(0, item.totalBorrowed - item.totalRepaid));
    item.netBalance = roundToTwoDecimals(item.outstandingReceivable - item.outstandingPayable);

    summaries.push(item);
  }

  // Sort by highest outstanding activity first
  return summaries.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
}

/**
 * MODE 3: Combined Financial Overview & Net Worth Calculation
 *
 * Formula:
 * Actual Cash = Opening Cash + Income - Expenses
 *             + Borrowed Money Received - Debt Repaid
 *             + Credit Repaid - Credit Given
 *
 * Net Worth = Actual Cash + Total Receivable - Total Payable
 */
export function calculateCombinedFinancialOverview(
  transactions: Transaction[],
  creditDebtRecords: CreditDebtRecord[],
  openingCash: number = 0,
  currentMonthStr?: string
): CombinedFinancialSummary {
  const currentMonth = currentMonthStr || new Date().toISOString().slice(0, 7);

  let totalIncome = 0;
  let totalExpense = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  for (const tx of transactions) {
    const isCurrentMonth = tx.transactionDate.startsWith(currentMonth);

    if (tx.type === 'income') {
      totalIncome += tx.amount;
      if (isCurrentMonth) monthlyIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      if (isCurrentMonth) monthlyExpense += tx.amount;
    }
  }

  let creditGiven = 0;
  let creditRepaid = 0;
  let borrowedMoneyReceived = 0;
  let debtRepaid = 0;

  for (const record of creditDebtRecords) {
    const settled = record.settledAmount || 0;
    if (record.type === 'credit') {
      creditGiven += record.originalAmount;
      creditRepaid += settled;
    } else if (record.type === 'debt') {
      borrowedMoneyReceived += record.originalAmount;
      debtRepaid += settled;
    }
  }

  totalIncome = roundToTwoDecimals(totalIncome);
  totalExpense = roundToTwoDecimals(totalExpense);
  creditGiven = roundToTwoDecimals(creditGiven);
  creditRepaid = roundToTwoDecimals(creditRepaid);
  borrowedMoneyReceived = roundToTwoDecimals(borrowedMoneyReceived);
  debtRepaid = roundToTwoDecimals(debtRepaid);

  // Actual Cash
  const actualCashBalance = roundToTwoDecimals(
    openingCash +
      totalIncome -
      totalExpense +
      borrowedMoneyReceived -
      debtRepaid +
      creditRepaid -
      creditGiven
  );

  const totalReceivable = roundToTwoDecimals(Math.max(0, creditGiven - creditRepaid));
  const totalPayable = roundToTwoDecimals(Math.max(0, borrowedMoneyReceived - debtRepaid));

  // Net Worth
  const netWorth = roundToTwoDecimals(actualCashBalance + totalReceivable - totalPayable);
  const monthlyCashFlow = roundToTwoDecimals(monthlyIncome - monthlyExpense);

  return {
    openingCash: roundToTwoDecimals(openingCash),
    totalIncome,
    totalExpense,
    borrowedMoneyReceived,
    debtRepaid,
    creditRepaid,
    creditGiven,
    actualCashBalance,
    totalReceivable,
    totalPayable,
    netWorth,
    monthlyCashFlow,
  };
}

/**
 * Calculate Account Balances taking into account:
 * - Opening Balance
 * - Income deposited into account
 * - Expenses paid from account
 * - Transfers from account (outgoing)
 * - Transfers to account (incoming)
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: AccountTransfer[]
): Account[] {
  const accountMap = new Map<string, number>();

  // Initialize with opening balances
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.openingBalance || 0);
  }

  // Apply income and expense transactions
  for (const tx of transactions) {
    const accId = tx.accountId || accounts.find((a) => a.isDefault)?.id || accounts[0]?.id;
    if (!accId) continue;

    const current = accountMap.get(accId) || 0;
    if (tx.type === 'income') {
      accountMap.set(accId, current + tx.amount);
    } else if (tx.type === 'expense') {
      accountMap.set(accId, current - tx.amount);
    }
  }

  // Apply internal transfers
  for (const t of transfers) {
    const fromBal = accountMap.get(t.fromAccountId);
    if (fromBal !== undefined) {
      accountMap.set(t.fromAccountId, fromBal - t.amount);
    }

    const toBal = accountMap.get(t.toAccountId);
    if (toBal !== undefined) {
      accountMap.set(t.toAccountId, toBal + t.amount);
    }
  }

  return accounts.map((acc) => ({
    ...acc,
    currentBalance: roundToTwoDecimals(accountMap.get(acc.id) || 0),
  }));
}
