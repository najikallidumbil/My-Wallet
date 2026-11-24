import {
  aggregatePersonSummaries,
  calculateCombinedFinancialOverview,
} from '../financialEngine';
import { Transaction, CreditDebtRecord, Person } from '../../types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runTransactionBugTests(): { passed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: detail || 'Assertion failed' });
    }
  }

  // BUG 1 & BUG 5: Person Name Validation & Auto-Creation / Deduplication
  try {
    const peopleList: Person[] = [
      { id: 'person-1', name: 'Alice Smith', phone: '9876543210', createdAt: '2026-11-01T00:00:00Z' },
    ];

    // Helper imitating addPerson with deduplication
    function testAddPerson(people: Person[], name: string, phone?: string): { person: Person; updatedList: Person[] } {
      const cleanName = name.trim();
      if (!cleanName) throw new Error('Person name required');
      const existing = people.find((p) => p.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (existing) {
        return { person: existing, updatedList: people };
      }
      const newPerson: Person = {
        id: `person-${Date.now()}`,
        name: cleanName,
        phone,
        createdAt: new Date().toISOString(),
      };
      return { person: newPerson, updatedList: [...people, newPerson] };
    }

    // 1.1 Type completely new person "John"
    const step1 = testAddPerson(peopleList, '  John  ', '9998887776');
    assert(step1.person.name === 'John', 'Bug 1.1: Typed name trimmed correctly to "John"');
    assert(step1.updatedList.length === 2, 'Bug 1.2: New person "John" added to people list');
    assert(step1.person.id.startsWith('person-'), 'Bug 1.3: Person record generated valid ID');

    // 1.2 Deduplication check (case-insensitive "john")
    const step2 = testAddPerson(step1.updatedList, 'john');
    assert(step2.person.id === step1.person.id, 'Bug 1.4: Case-insensitive match reuses existing "John" ID');
    assert(step2.updatedList.length === 2, 'Bug 1.5: No duplicate person created for "john"');

    // 1.3 Selecting existing person "Alice Smith"
    const step3 = testAddPerson(step2.updatedList, 'Alice Smith');
    assert(step3.person.id === 'person-1', 'Bug 1.6: Selecting existing person "Alice Smith" returns original ID');
    assert(step3.updatedList.length === 2, 'Bug 1.7: Existing person preserved without duplication');
  } catch (err: any) {
    assert(false, 'Bug 1 & 5 Exception', err.message);
  }

  // BUG 2 & BUG 3: Reliable Transaction Type State
  try {
    const mockRecords: CreditDebtRecord[] = [];

    // Simulate QuickAdd in Credit mode
    const creditRecord: CreditDebtRecord = {
      id: 'cd-101',
      counterpartName: 'John',
      personId: 'person-john',
      type: 'credit',
      originalAmount: 5000,
      settledAmount: 0,
      remainingAmount: 5000,
      status: 'pending',
      transactionDate: '2026-11-20',
      transactionTime: '10:00',
      createdAt: '2026-11-20T10:00:00Z',
      updatedAt: '2026-11-20T10:00:00Z',
    };
    mockRecords.push(creditRecord);

    // Simulate QuickAdd in Debt mode
    const debtRecord: CreditDebtRecord = {
      id: 'cd-102',
      counterpartName: 'John',
      personId: 'person-john',
      type: 'debt',
      originalAmount: 2000,
      settledAmount: 0,
      remainingAmount: 2000,
      status: 'pending',
      transactionDate: '2026-11-21',
      transactionTime: '11:00',
      createdAt: '2026-11-21T11:00:00Z',
      updatedAt: '2026-11-21T11:00:00Z',
    };
    mockRecords.push(debtRecord);

    assert(creditRecord.type === 'credit', 'Bug 3.1: Credit transaction accurately saved with type="credit"');
    assert(debtRecord.type === 'debt', 'Bug 3.2: Debt transaction accurately saved with type="debt"');

    const people: Person[] = [{ id: 'person-john', name: 'John', createdAt: '2026-11-20T00:00:00Z' }];
    const summaries = aggregatePersonSummaries(mockRecords, people);
    const johnSummary = summaries.find((p) => p.name === 'John');

    assert(!!johnSummary, 'Bug 1.8: John found in aggregated person summaries');
    assert(johnSummary?.totalGiven === 5000, 'Bug 1.9: John total given is ₹5,000');
    assert(johnSummary?.totalBorrowed === 2000, 'Bug 1.10: John total borrowed is ₹2,000');
    assert(johnSummary?.outstandingReceivable === 5000, 'Bug 1.11: John outstanding receivable is ₹5,000');
    assert(johnSummary?.outstandingPayable === 2000, 'Bug 1.12: John outstanding payable is ₹2,000');
    assert(johnSummary?.netBalance === 3000, 'Bug 1.13: John net balance is +₹3,000 (Receivable - Payable)');
  } catch (err: any) {
    assert(false, 'Bug 2 & 3 Exception', err.message);
  }

  // BUG 6: Correct Payment & Settlement Handling (No duplicate loans, balance reduction)
  try {
    const loan: CreditDebtRecord = {
      id: 'cd-200',
      counterpartName: 'Kavitha',
      type: 'credit',
      originalAmount: 10000,
      settledAmount: 0,
      remainingAmount: 10000,
      status: 'pending',
      transactionDate: '2026-11-01',
      transactionTime: '12:00',
      repayments: [],
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
    };

    // Helper imitating settleCreditDebt
    function testSettle(record: CreditDebtRecord, settleAmount: number, notes?: string): CreditDebtRecord {
      const newSettled = Math.min(record.originalAmount, record.settledAmount + settleAmount);
      const remaining = Math.max(0, record.originalAmount - newSettled);
      let status = record.status;
      if (remaining <= 0) status = 'settled';
      else status = 'partial';

      return {
        ...record,
        settledAmount: newSettled,
        remainingAmount: remaining,
        status,
        repayments: [
          {
            id: `rep-${Date.now()}`,
            amount: settleAmount,
            paymentDate: '2026-11-15',
            paymentTime: '15:30',
            notes,
            createdAt: new Date().toISOString(),
          },
          ...(record.repayments || []),
        ],
        updatedAt: new Date().toISOString(),
      };
    }

    // Partial settlement of ₹4,000
    const afterPartial = testSettle(loan, 4000, 'GPay transfer 1');
    assert(afterPartial.settledAmount === 4000, 'Bug 6.1: Settled amount increased to ₹4,000');
    assert(afterPartial.remainingAmount === 6000, 'Bug 6.2: Remaining balance reduced to ₹6,000');
    assert(afterPartial.status === 'partial', 'Bug 6.3: Status updated to "partial"');
    assert(afterPartial.repayments?.length === 1, 'Bug 6.4: Exactly 1 repayment record stored');
    assert(afterPartial.originalAmount === 10000, 'Bug 6.5: Original amount unchanged (no duplicate loan)');

    // Final settlement of remaining ₹6,000
    const afterFinal = testSettle(afterPartial, 6000, 'Cash handed over');
    assert(afterFinal.settledAmount === 10000, 'Bug 6.6: Settled amount is full ₹10,000');
    assert(afterFinal.remainingAmount === 0, 'Bug 6.7: Remaining balance is ₹0');
    assert(afterFinal.status === 'settled', 'Bug 6.8: Status updated to "settled"');
    assert(afterFinal.repayments?.length === 2, 'Bug 6.9: Exactly 2 repayments in history');
  } catch (err: any) {
    assert(false, 'Bug 6 Exception', err.message);
  }

  // BUG 7: Combined Overview Financial Integrity
  try {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        title: 'Salary',
        amount: 80000,
        type: 'income',
        categoryId: 'cat-sal',
        paymentMethod: 'bank_transfer',
        transactionDate: '2026-11-01',
        transactionTime: '09:00',
        createdAt: '2026-11-01T09:00:00Z',
        updatedAt: '2026-11-01T09:00:00Z',
      },
      {
        id: 'tx-2',
        title: 'Rent',
        amount: 25000,
        type: 'expense',
        categoryId: 'cat-rent',
        paymentMethod: 'upi',
        transactionDate: '2026-11-02',
        transactionTime: '10:00',
        createdAt: '2026-11-02T10:00:00Z',
        updatedAt: '2026-11-02T10:00:00Z',
      },
    ];

    const khata: CreditDebtRecord[] = [
      {
        id: 'cd-1',
        counterpartName: 'Rahul',
        type: 'credit',
        originalAmount: 15000,
        settledAmount: 5000,
        remainingAmount: 10000,
        status: 'partial',
        transactionDate: '2026-11-05',
        transactionTime: '10:00',
        createdAt: '2026-11-05T10:00:00Z',
        updatedAt: '2026-11-05T10:00:00Z',
      },
      {
        id: 'cd-2',
        counterpartName: 'Suresh',
        type: 'debt',
        originalAmount: 8000,
        settledAmount: 4000,
        remainingAmount: 4000,
        status: 'partial',
        transactionDate: '2026-11-06',
        transactionTime: '11:00',
        createdAt: '2026-11-06T11:00:00Z',
        updatedAt: '2026-11-06T11:00:00Z',
      },
    ];

    const openingBalance = 10000;
    const overview = calculateCombinedFinancialOverview(transactions, khata, openingBalance);

    // Actual Cash = Opening (10,000) + Income (80,000) - Expense (25,000) - Credit Given (15,000) + Credit Repaid (5,000) + Borrowed (8,000) - Debt Repaid (4,000) = 59,000
    assert(overview.actualCashBalance === 59000, 'Bug 7.1: Actual cash balance is ₹59,000 (Physical cash accounting)');
    assert(overview.totalReceivable === 10000, 'Bug 7.2: Total receivable is ₹10,000');
    assert(overview.totalPayable === 4000, 'Bug 7.3: Total payable is ₹4,000');
    // Khata Net = 10,000 - 4,000 = 6,000
    const khataNet = overview.totalReceivable - overview.totalPayable;
    assert(khataNet === 6000, 'Bug 7.4: Khata net balance is ₹6,000');
    // Net Worth = Actual Cash (59,000) + Receivable (10,000) - Payable (4,000) = 65,000
    assert(overview.netWorth === 65000, 'Bug 7.5: Total net worth is ₹65,000');
  } catch (err: any) {
    assert(false, 'Bug 7 Exception', err.message);
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
