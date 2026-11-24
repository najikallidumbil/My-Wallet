/**
 * Automated Financial Engine Tests
 *
 * Verifies:
 * 1. Mode 1: Income & Expense calculations & Available Cash Balance.
 * 2. Mode 2: Khata Book calculations, person aggregation, and partial repayments.
 * 3. Mode 3: Combined Financial Overview, Actual Cash, and Net Worth.
 * 4. Zero double-counting verification.
 * 5. Multi-account transfers with zero net effect on Net Worth.
 * 6. Decimal precision and edge cases (zero balances, full payoffs).
 */

import {
  calculateIncomeExpenseSummary,
  calculateKhataSummary,
  aggregatePersonSummaries,
  calculateCombinedFinancialOverview,
  calculateAccountBalances,
  calculateBudgetProgress,
  roundToTwoDecimals,
} from '../financialEngine';
import { Transaction, CreditDebtRecord, Account, AccountTransfer, Category, Budget } from '../../types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runAllFinancialTests(): { passed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: detail || 'Assertion failed' });
    }
  }

  // TEST 1: Mode 1 - Income, Expense & Available Cash
  try {
    const mockTx: Transaction[] = [
      {
        id: 'tx-1',
        title: 'Salary',
        amount: 50000,
        type: 'income',
        categoryId: 'cat-sal',
        paymentMethod: 'bank_transfer',
        transactionDate: '2026-11-01',
        transactionTime: '10:00',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
      },
      {
        id: 'tx-2',
        title: 'Grocery',
        amount: 4500,
        type: 'expense',
        categoryId: 'cat-groc',
        paymentMethod: 'upi',
        transactionDate: '2026-11-02',
        transactionTime: '11:00',
        createdAt: '2026-11-02T11:00:00Z',
        updatedAt: '2026-11-02T11:00:00Z',
      },
    ];

    const openingBalance = 10000;
    const summary = calculateIncomeExpenseSummary(mockTx, openingBalance, '2026-11');

    assert(summary.totalIncome === 50000, 'Test 1.1: Total Income is 50,000');
    assert(summary.totalExpense === 4500, 'Test 1.2: Total Expense is 4,500');
    // Available Balance = 10,000 + 50,000 - 4,500 = 55,500
    assert(summary.availableCashBalance === 55500, 'Test 1.3: Available Cash Balance is 55,500');
  } catch (err: any) {
    assert(false, 'Test 1 Exception', err.message);
  }

  // TEST 2: Mode 2 - Partial Payments & Outstanding Balances in Khata
  try {
    const mockKhata: CreditDebtRecord[] = [
      // Lend Rahman ₹10,000; Rahman returned ₹3,000 -> Remaining ₹7,000
      {
        id: 'cd-1',
        counterpartName: 'Rahman',
        counterpartPhone: '9876543210',
        originalAmount: 10000,
        settledAmount: 3000,
        remainingAmount: 7000,
        type: 'credit',
        status: 'partial',
        transactionDate: '2026-11-05',
        transactionTime: '14:00',
        dueDate: '2026-11-25',
        repayments: [
          {
            id: 'rep-1',
            amount: 3000,
            paymentDate: '2026-11-10',
            paymentTime: '12:00',
            createdAt: '2026-11-10T12:00:00Z',
          },
        ],
        createdAt: '2026-11-05T14:00:00Z',
        updatedAt: '2026-11-10T12:00:00Z',
      },
      // Borrow ₹5,000 from Amit; Repaid ₹2,000 -> Remaining ₹3,000
      {
        id: 'cd-2',
        counterpartName: 'Amit',
        counterpartPhone: '9876543211',
        originalAmount: 5000,
        settledAmount: 2000,
        remainingAmount: 3000,
        type: 'debt',
        status: 'partial',
        transactionDate: '2026-11-06',
        transactionTime: '15:00',
        createdAt: '2026-11-06T15:00:00Z',
        updatedAt: '2026-11-12T15:00:00Z',
      },
    ];

    const khata = calculateKhataSummary(mockKhata);
    assert(khata.totalReceivable === 7000, 'Test 2.1: Total Receivable is 7,000');
    assert(khata.totalPayable === 3000, 'Test 2.2: Total Payable is 3,000');
    assert(khata.netKhataBalance === 4000, 'Test 2.3: Net Khata Balance is 4,000');

    // Person Ledger Aggregation
    const personSummaries = aggregatePersonSummaries(mockKhata);
    const rahman = personSummaries.find((p) => p.name.toLowerCase() === 'rahman');
    assert(rahman !== undefined, 'Test 2.4: Rahman found in ledger');
    assert(rahman?.totalGiven === 10000, 'Test 2.5: Rahman total given is 10,000');
    assert(rahman?.totalReceivedBack === 3000, 'Test 2.6: Rahman received back is 3,000');
    assert(rahman?.outstandingReceivable === 7000, 'Test 2.7: Rahman outstanding receivable is 7,000');
    assert(rahman?.netBalance === 7000, 'Test 2.8: Rahman net balance is +7,000');
  } catch (err: any) {
    assert(false, 'Test 2 Exception', err.message);
  }

  // TEST 3: Mode 3 - Actual Cash, Net Worth & Zero Double-Counting
  try {
    // Opening Cash: 20,000
    // Income: 50,000
    // Expense: 15,000
    // Lent out to others (Credit Given): 10,000 (Cash leaves)
    // Credit repayment received back: 3,000 (Cash enters)
    // Borrowed money received (Debt): 5,000 (Cash enters)
    // Debt repaid: 2,000 (Cash leaves)
    //
    // Actual Cash Calculation:
    // 20,000 + 50,000 - 15,000 + 5,000 - 2,000 + 3,000 - 10,000
    // = 70,000 - 15,000 = 55,000 + 3,000 - 7,000 = 51,000
    //
    // Receivable: 10,000 - 3,000 = 7,000
    // Payable: 5,000 - 2,000 = 3,000
    //
    // Net Worth = Actual Cash + Receivable - Payable
    // = 51,000 + 7,000 - 3,000 = 55,000
    //
    // Note that Net Worth ALSO strictly equals:
    // Opening Cash (20,000) + Total Income (50,000) - Total Expense (15,000) = 55,000!
    // This mathematically confirms zero double-counting!
    const mockTx: Transaction[] = [
      {
        id: 'tx-inc',
        title: 'Income',
        amount: 50000,
        type: 'income',
        categoryId: 'c1',
        paymentMethod: 'upi',
        transactionDate: '2026-11-01',
        transactionTime: '09:00',
        createdAt: '2026-11-01T09:00:00Z',
        updatedAt: '2026-11-01T09:00:00Z',
      },
      {
        id: 'tx-exp',
        title: 'Expense',
        amount: 15000,
        type: 'expense',
        categoryId: 'c2',
        paymentMethod: 'upi',
        transactionDate: '2026-11-02',
        transactionTime: '10:00',
        createdAt: '2026-11-02T10:00:00Z',
        updatedAt: '2026-11-02T10:00:00Z',
      },
    ];

    const mockKhata: CreditDebtRecord[] = [
      {
        id: 'k-1',
        counterpartName: 'Rahman',
        originalAmount: 10000,
        settledAmount: 3000,
        remainingAmount: 7000,
        type: 'credit',
        status: 'partial',
        transactionDate: '2026-11-03',
        transactionTime: '11:00',
        createdAt: '2026-11-03T11:00:00Z',
        updatedAt: '2026-11-03T11:00:00Z',
      },
      {
        id: 'k-2',
        counterpartName: 'Amit',
        originalAmount: 5000,
        settledAmount: 2000,
        remainingAmount: 3000,
        type: 'debt',
        status: 'partial',
        transactionDate: '2026-11-04',
        transactionTime: '12:00',
        createdAt: '2026-11-04T12:00:00Z',
        updatedAt: '2026-11-04T12:00:00Z',
      },
    ];

    const openingCash = 20000;
    const overview = calculateCombinedFinancialOverview(mockTx, mockKhata, openingCash, '2026-11');

    assert(overview.actualCashBalance === 51000, 'Test 3.1: Actual Cash Balance is 51,000');
    assert(overview.totalReceivable === 7000, 'Test 3.2: Total Receivable is 7,000');
    assert(overview.totalPayable === 3000, 'Test 3.3: Total Payable is 3,000');
    assert(overview.netWorth === 55000, 'Test 3.4: Net Worth is 55,000');
    assert(
      overview.netWorth === openingCash + overview.totalIncome - overview.totalExpense,
      'Test 3.5: Balance Sheet Identity Holds (Zero Double-Counting Verified)'
    );
  } catch (err: any) {
    assert(false, 'Test 3 Exception', err.message);
  }

  // TEST 4: Multiple Accounts and Internal Transfers
  try {
    const mockAccounts: Account[] = [
      {
        id: 'acc-cash',
        name: 'Cash in Hand',
        type: 'cash',
        openingBalance: 5000,
        currentBalance: 5000,
        createdAt: '2026-11-01T00:00:00Z',
        isDefault: true,
      },
      {
        id: 'acc-bank',
        name: 'HDFC Bank',
        type: 'bank',
        openingBalance: 20000,
        currentBalance: 20000,
        createdAt: '2026-11-01T00:00:00Z',
      },
    ];

    const transfers: AccountTransfer[] = [
      {
        id: 'tr-1',
        fromAccountId: 'acc-bank',
        toAccountId: 'acc-cash',
        amount: 3000, // Withdraw 3,000 from ATM
        date: '2026-11-03',
        time: '12:00',
        createdAt: '2026-11-03T12:00:00Z',
      },
    ];

    const updatedAccounts = calculateAccountBalances(mockAccounts, [], transfers);
    const cashAcc = updatedAccounts.find((a) => a.id === 'acc-cash');
    const bankAcc = updatedAccounts.find((a) => a.id === 'acc-bank');

    assert(cashAcc?.currentBalance === 8000, 'Test 4.1: Cash increased to 8,000 (+3,000)');
    assert(bankAcc?.currentBalance === 17000, 'Test 4.2: Bank decreased to 17,000 (-3,000)');
    const totalAcrossAccounts = (cashAcc?.currentBalance || 0) + (bankAcc?.currentBalance || 0);
    assert(totalAcrossAccounts === 25000, 'Test 4.3: Total across accounts unchanged at 25,000');
  } catch (err: any) {
    assert(false, 'Test 4 Exception', err.message);
  }

  // TEST 5: Decimal Precision
  try {
    const p1 = roundToTwoDecimals(10.105);
    const p2 = roundToTwoDecimals(10.104);
    assert(p1 === 10.11, 'Test 5.1: Proper rounding up (10.105 -> 10.11)');
    assert(p2 === 10.10, 'Test 5.2: Proper rounding down (10.104 -> 10.10)');
  } catch (err: any) {
    assert(false, 'Test 5 Exception', err.message);
  }

  // TEST 6: Budget Tracking & Threshold Warnings (80%, 90%, 100%)
  try {
    const mockCategories: Category[] = [
      {
        id: 'cat-groceries',
        name: 'Groceries',
        icon: 'ShoppingBag',
        color: '#10b981',
        type: 'expense',
        budget: 10000,
        isDefault: true,
      },
      {
        id: 'cat-dining',
        name: 'Dining & Food',
        icon: 'Utensils',
        color: '#f59e0b',
        type: 'expense',
        budget: 10000,
        isDefault: true,
      },
      {
        id: 'cat-utilities',
        name: 'Utilities',
        icon: 'Zap',
        color: '#3b82f6',
        type: 'expense',
        budget: 10000,
        isDefault: true,
      },
      {
        id: 'cat-shopping',
        name: 'Shopping',
        icon: 'Tag',
        color: '#ec4899',
        type: 'expense',
        budget: 10000,
        isDefault: true,
      },
    ];

    const mockTransactions: Transaction[] = [
      // Groceries: 5,000 / 10,000 = 50% (normal)
      {
        id: 't-g1',
        title: 'Supermarket',
        amount: 5000,
        type: 'expense',
        categoryId: 'cat-groceries',
        paymentMethod: 'upi',
        transactionDate: '2026-11-05',
        transactionTime: '10:00',
        createdAt: '2026-11-05T10:00:00Z',
        updatedAt: '2026-11-05T10:00:00Z',
      },
      // Dining: 8,500 / 10,000 = 85% (warning: >= 80% & < 90%)
      {
        id: 't-d1',
        title: 'Restaurant dinner',
        amount: 8500,
        type: 'expense',
        categoryId: 'cat-dining',
        paymentMethod: 'cash',
        transactionDate: '2026-11-10',
        transactionTime: '19:00',
        createdAt: '2026-11-10T19:00:00Z',
        updatedAt: '2026-11-10T19:00:00Z',
      },
      // Utilities: 9,200 / 10,000 = 92% (urgent: >= 90% & < 100%)
      {
        id: 't-u1',
        title: 'Electricity bill',
        amount: 9200,
        type: 'expense',
        categoryId: 'cat-utilities',
        paymentMethod: 'bank_transfer',
        transactionDate: '2026-11-12',
        transactionTime: '11:00',
        createdAt: '2026-11-12T11:00:00Z',
        updatedAt: '2026-11-12T11:00:00Z',
      },
      // Shopping: 11,000 / 10,000 = 110% (exceeded: >= 100%)
      {
        id: 't-s1',
        title: 'Winter clothes',
        amount: 11000,
        type: 'expense',
        categoryId: 'cat-shopping',
        paymentMethod: 'upi',
        transactionDate: '2026-11-15',
        transactionTime: '16:00',
        createdAt: '2026-11-15T16:00:00Z',
        updatedAt: '2026-11-15T16:00:00Z',
      },
    ];

    const mockBudgets: Budget[] = [
      {
        id: 'b-2026-11',
        month: '2026-11',
        totalBudget: 40000,
        categoryBudgets: {
          'cat-groceries': 10000,
          'cat-dining': 10000,
          'cat-utilities': 10000,
          'cat-shopping': 10000,
        },
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    const budgetSummary = calculateBudgetProgress(
      mockCategories,
      mockTransactions,
      mockBudgets,
      '2026-11'
    );

    assert(budgetSummary.totalBudget === 40000, 'Test 6.1: Total Budget is 40,000');
    assert(budgetSummary.totalSpent === 33700, 'Test 6.2: Total Spent is 33,700');
    assert(budgetSummary.remainingBudget === 6300, 'Test 6.3: Remaining Budget is 6,300');

    const grocProgress = budgetSummary.categoryProgresses.find((c) => c.categoryId === 'cat-groceries');
    assert(grocProgress?.status === 'normal', 'Test 6.4: Groceries status is normal (50%)');
    assert(grocProgress?.remaining === 5000, 'Test 6.5: Groceries remaining is 5,000');

    const diningProgress = budgetSummary.categoryProgresses.find((c) => c.categoryId === 'cat-dining');
    assert(diningProgress?.status === 'warning', 'Test 6.6: Dining status is warning (85% >= 80%)');

    const utilProgress = budgetSummary.categoryProgresses.find((c) => c.categoryId === 'cat-utilities');
    assert(utilProgress?.status === 'urgent', 'Test 6.7: Utilities status is urgent (92% >= 90%)');

    const shopProgress = budgetSummary.categoryProgresses.find((c) => c.categoryId === 'cat-shopping');
    assert(shopProgress?.status === 'exceeded', 'Test 6.8: Shopping status is exceeded (110% >= 100%)');
    assert(shopProgress?.remaining === -1000, 'Test 6.9: Shopping remaining is -1,000');

    assert(budgetSummary.warningCount === 2, 'Test 6.10: Warning count is 2 (warning + urgent)');
    assert(budgetSummary.exceededCount === 1, 'Test 6.11: Exceeded count is 1');
  } catch (err: any) {
    assert(false, 'Test 6 Exception', err.message);
  }

  // TEST 7: Enriched Khata Book Analytics & Counterpart Counts
  try {
    const mockKhata: CreditDebtRecord[] = [
      // Credit to Person A: 10,000, 4,000 settled -> 6,000 remaining (unsettled)
      {
        id: 'cd-a',
        counterpartName: 'Rahul',
        originalAmount: 10000,
        settledAmount: 4000,
        remainingAmount: 6000,
        type: 'credit',
        status: 'partial',
        transactionDate: '2026-11-02',
        transactionTime: '10:00',
        dueDate: '2026-11-15',
        repayments: [
          {
            id: 'rep-a1',
            amount: 4000,
            paymentDate: '2026-11-05',
            paymentTime: '12:00',
            createdAt: '2026-11-05T00:00:00Z',
          },
        ],
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-05T00:00:00Z',
      },
      // Credit to Person B: 5,000, 5,000 settled -> 0 remaining (fully settled, not owing)
      {
        id: 'cd-b',
        counterpartName: 'Sanjay',
        originalAmount: 5000,
        settledAmount: 5000,
        remainingAmount: 0,
        type: 'credit',
        status: 'settled',
        transactionDate: '2026-11-03',
        transactionTime: '11:00',
        repayments: [
          {
            id: 'rep-b1',
            amount: 5000,
            paymentDate: '2026-11-08',
            paymentTime: '14:00',
            createdAt: '2026-11-08T00:00:00Z',
          },
        ],
        createdAt: '2026-11-03T00:00:00Z',
        updatedAt: '2026-11-08T00:00:00Z',
      },
      // Debt from Person C: 8,000, 2,000 settled -> 6,000 remaining (I owe him)
      {
        id: 'cd-c',
        counterpartName: 'Mohan',
        originalAmount: 8000,
        settledAmount: 2000,
        remainingAmount: 6000,
        type: 'debt',
        status: 'partial',
        transactionDate: '2026-11-04',
        transactionTime: '15:00',
        repayments: [
          {
            id: 'rep-c1',
            amount: 2000,
            paymentDate: '2026-11-09',
            paymentTime: '16:00',
            createdAt: '2026-11-09T00:00:00Z',
          },
        ],
        createdAt: '2026-11-04T00:00:00Z',
        updatedAt: '2026-11-09T00:00:00Z',
      },
    ];

    const khataSummary = calculateKhataSummary(mockKhata, '2026-11');

    assert(khataSummary.totalReceivable === 6000, 'Test 7.1: Total Receivable is 6,000');
    assert(khataSummary.totalPayable === 6000, 'Test 7.2: Total Payable is 6,000');
    assert(khataSummary.peopleOweMeCount === 1, 'Test 7.3: Exactly 1 person owes me (Rahul)');
    assert(khataSummary.peopleIOweCount === 1, 'Test 7.4: Exactly 1 person I owe (Mohan)');
    assert(khataSummary.monthlyLent === 15000, 'Test 7.5: Monthly Lent is 15,000 (10,000 + 5,000)');
    assert(khataSummary.monthlyReceivedBack === 9000, 'Test 7.6: Monthly Received Back is 9,000 (4,000 + 5,000)');
    assert(khataSummary.monthlyBorrowed === 8000, 'Test 7.7: Monthly Borrowed is 8,000');
    assert(khataSummary.monthlyRepaid === 2000, 'Test 7.8: Monthly Repaid is 2,000');
  } catch (err: any) {
    assert(false, 'Test 7 Exception', err.message);
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
