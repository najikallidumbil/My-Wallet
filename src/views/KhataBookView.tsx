import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { CreditDebtType, RecordStatus, CreditDebtRecord, Attachment } from '../types';
import { formatRupees } from '../lib/currency';
import { formatDate, getDueStatus } from '../lib/date';
import { StatusBadge } from '../components/common/StatusBadge';
import { AttachmentUploader } from '../components/common/AttachmentUploader';
import {
  HandCoins,
  Landmark,
  Plus,
  Search,
  X,
  UserPlus,
  Users,
  History,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Contact,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  pickContactFromDevice,
  isContactPickerSupported,
} from '../lib/contactPicker';

export const KhataBookView: React.FC = () => {
  const {
    creditDebtRecords,
    personSummaries,
    khataSummary,
    addPerson,
    settleCreditDebt,
    openQuickAdd,
    openRecordDetails,
    setSelectedPersonId,
  } = useWallet();

  // Navigation sub-tabs within Khata: 'people' | 'analytics' | 'transactions'
  const [activeSubTab, setActiveSubTab] = useState<'people' | 'analytics' | 'transactions'>('people');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | CreditDebtType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RecordStatus>('all');
  const [search, setSearch] = useState('');

  // Add Person Modal state
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');

  // Settle Modal state
  const [settleModalItem, setSettleModalItem] = useState<CreditDebtRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleAttachments, setSettleAttachments] = useState<Attachment[]>([]);
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleTime, setSettleTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [settleNotes, setSettleNotes] = useState<string>('');

  // Filtered People
  const filteredPeople = useMemo(() => {
    return personSummaries.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchPhone = p.phone ? p.phone.includes(q) : false;
      return matchName || matchPhone;
    });
  }, [personSummaries, search]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return creditDebtRecords.filter((record) => {
      const matchesType = transactionTypeFilter === 'all' || record.type === transactionTypeFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesSearch =
        !search.trim() ||
        record.counterpartName.toLowerCase().includes(search.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(search.toLowerCase())) ||
        (record.counterpartPhone && record.counterpartPhone.includes(search));

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [creditDebtRecords, transactionTypeFilter, statusFilter, search]);

  // =========================================================================
  // KHATA ANALYTICS CHARTS DATA
  // =========================================================================
  // 1. Monthly Lending vs Collections (Last 6 Months)
  const lendingMonthlyData = useMemo(() => {
    const today = new Date();
    const months: { key: string; label: string; lent: number; receivedBack: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        lent: 0,
        receivedBack: 0,
      });
    }

    creditDebtRecords.forEach((r) => {
      if (r.type === 'credit') {
        const m = r.transactionDate.slice(0, 7);
        const bucket = months.find((item) => item.key === m);
        if (bucket) bucket.lent += r.originalAmount;

        if (r.repayments) {
          r.repayments.forEach((rep) => {
            const repM = rep.paymentDate.slice(0, 7);
            const repBucket = months.find((item) => item.key === repM);
            if (repBucket) repBucket.receivedBack += rep.amount;
          });
        }
      }
    });

    const maxVal = Math.max(...months.map((m) => Math.max(m.lent, m.receivedBack)), 1000);
    return { months, maxVal };
  }, [creditDebtRecords]);

  // 2. Monthly Borrowing vs Repayments (Last 6 Months)
  const borrowingMonthlyData = useMemo(() => {
    const today = new Date();
    const months: { key: string; label: string; borrowed: number; repaid: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        borrowed: 0,
        repaid: 0,
      });
    }

    creditDebtRecords.forEach((r) => {
      if (r.type === 'debt') {
        const m = r.transactionDate.slice(0, 7);
        const bucket = months.find((item) => item.key === m);
        if (bucket) bucket.borrowed += r.originalAmount;

        if (r.repayments) {
          r.repayments.forEach((rep) => {
            const repM = rep.paymentDate.slice(0, 7);
            const repBucket = months.find((item) => item.key === repM);
            if (repBucket) repBucket.repaid += rep.amount;
          });
        }
      }
    });

    const maxVal = Math.max(...months.map((m) => Math.max(m.borrowed, m.repaid)), 1000);
    return { months, maxVal };
  }, [creditDebtRecords]);

  const handleImportContact = async () => {
    try {
      const result = await pickContactFromDevice();
      if (result.success && result.contact) {
        setNewPersonName(result.contact.name);
        if (result.contact.phone) {
          setNewPersonPhone(result.contact.phone);
        }
      } else if (!result.cancelled && result.error) {
        alert(result.error);
      }
    } catch (e) {
      console.warn('Failed to pick contact:', e);
    }
  };

  // Handlers
  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    addPerson({
      name: newPersonName.trim(),
      phone: newPersonPhone.trim() || undefined,
      notes: newPersonNotes.trim() || undefined,
    });

    setNewPersonName('');
    setNewPersonPhone('');
    setNewPersonNotes('');
    setIsAddPersonOpen(false);
  };

  const handleOpenSettle = (record: CreditDebtRecord) => {
    setSettleModalItem(record);
    setSettleAmount(record.remainingAmount.toString());
    setSettleAttachments([]);
    setSettleNotes('');
    setSettleDate(new Date().toISOString().split('T')[0]);
  };

  const handleExecuteSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalItem) return;

    const amount = parseFloat(settleAmount);
    if (!amount || amount <= 0) return;

    settleCreditDebt(
      settleModalItem.id,
      amount,
      settleAttachments,
      settleNotes.trim() || undefined,
      settleDate,
      settleTime
    );

    setSettleModalItem(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[11px] font-bold uppercase tracking-wider">
              Mode 2
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Khata Book (Credit & Debt)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personal lending and borrowing management with customer ledgers (zero income/expense mixing)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddPersonOpen(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Person</span>
          </button>

          <button
            onClick={() => openQuickAdd('credit')}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Give Money (Lend)</span>
          </button>

          <button
            onClick={() => openQuickAdd('debt')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Borrow Money</span>
          </button>
        </div>
      </div>

      {/* 2. Khata Dashboard: 4 Executive Summary Cards (Clean 2-col on Mobile, 4-col on Tablet/Desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-start auto-rows-min">
        {/* 1. Total Receivable */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 shadow-sm flex flex-col self-start h-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px] truncate">
              Total Receivable
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center shrink-0">
              <HandCoins className="w-4 h-4 text-sky-500" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 block truncate">
            {formatRupees(khataSummary.totalReceivable)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Money others owe me
          </span>
        </div>

        {/* 2. Total Payable */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col self-start h-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px] truncate">
              Total Payable
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 block truncate">
            {formatRupees(khataSummary.totalPayable)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Money I owe others
          </span>
        </div>

        {/* 3. Total Outstanding */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-sm flex flex-col self-start h-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[11px] truncate">
              Total Outstanding
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 block truncate">
            {formatRupees(khataSummary.totalReceivable + khataSummary.totalPayable)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block truncate">
            Combined pending volume
          </span>
        </div>

        {/* 4. Overdue Payments (Compact, content-based height with zero row stretching) */}
        <div
          className={cn(
            'p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col self-start h-auto transition-all',
            khataSummary.overdueCount > 0
              ? 'border border-rose-200 dark:border-rose-900/60 bg-rose-50/20'
              : 'border border-slate-200/80 dark:border-slate-800'
          )}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span
              className={cn(
                'font-semibold uppercase tracking-wider text-[11px] truncate',
                khataSummary.overdueCount > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              Overdue Payments
            </span>
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                khataSummary.overdueCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/50'
                  : 'bg-slate-100 dark:bg-slate-800'
              )}
            >
              <AlertTriangle
                className={cn(
                  'w-4 h-4',
                  khataSummary.overdueCount > 0 ? 'text-rose-500' : 'text-slate-400'
                )}
              />
            </div>
          </div>

          {khataSummary.overdueCount === 0 ? (
            <>
              <div className="flex items-center gap-1.5 py-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  No overdue payments
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block truncate">
                All collections on track
              </span>
            </>
          ) : (
            <>
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 block truncate">
                {khataSummary.overdueCount} Overdue
              </span>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                  {formatRupees(khataSummary.overdueReceivable)} past due
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab('transactions');
                    setStatusFilter('overdue');
                  }}
                  className="font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-0.5 hover:underline transition-colors shrink-0 ml-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Sub-Navigation Switcher: People Directory | Khata Analytics | All Transactions */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('people')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
              activeSubTab === 'people'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            <span>Customer Ledgers ({personSummaries.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
              activeSubTab === 'analytics'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Khata Analytics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('transactions')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
              activeSubTab === 'transactions'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <History className="w-4 h-4" />
            <span>All Entries ({creditDebtRecords.length})</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: CUSTOMER LEDGER DIRECTORY (PERSON-WISE ACCOUNTS)
          ===================================================================== */}
      {activeSubTab === 'people' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search person by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {filteredPeople.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              No people found. Click "Add Person" to start tracking a customer or friend ledger.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPeople.map((p) => {
                const isReceivable = p.netBalance > 0;
                const isPayable = p.netBalance < 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-all flex flex-col justify-between space-y-3.5 group"
                  >
                    {/* Person Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </h4>
                          {p.phone ? (
                            <span className="text-[11px] text-slate-400 block truncate">
                              {p.phone}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No phone</span>
                          )}
                        </div>
                      </div>

                      <span
                        className={cn(
                          'text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0',
                          isReceivable
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                            : isPayable
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        )}
                      >
                        {isReceivable ? 'You will get' : isPayable ? 'You will pay' : 'Settled'}
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Outstanding Balance</span>
                      <span
                        className={cn(
                          'text-base font-black',
                          isReceivable
                            ? 'text-sky-600 dark:text-sky-400'
                            : isPayable
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        )}
                      >
                        {formatRupees(Math.abs(p.netBalance))}
                      </span>
                    </div>

                    {/* 4 Metrics Strip */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                      <div>
                        <span>Given</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {formatRupees(p.totalGiven)}
                        </p>
                      </div>
                      <div>
                        <span>Received</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupees(p.totalReceivedBack)}
                        </p>
                      </div>
                      <div>
                        <span>Borrowed</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {formatRupees(p.totalBorrowed)}
                        </p>
                      </div>
                      <div>
                        <span>Repaid</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {formatRupees(p.totalRepaid)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: KHATA ANALYTICS
          ===================================================================== */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Monthly Money Lent vs Received Back */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <HandCoins className="w-4 h-4 text-sky-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Money Lent vs Received Back (Last 6 Months)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monthly credit extensions compared with collections received
                </p>
              </div>

              <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                {lendingMonthlyData.months.map((m, idx) => {
                  const lentH = Math.max(4, (m.lent / lendingMonthlyData.maxVal) * 140);
                  const recH = Math.max(4, (m.receivedBack / lendingMonthlyData.maxVal) * 140);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full flex items-end justify-center gap-1 max-w-[36px] h-36">
                        <div
                          className="w-1/2 bg-sky-500 rounded-t-md transition-all duration-300"
                          style={{ height: `${lentH}px` }}
                          title={`Lent: ${formatRupees(m.lent)}`}
                        />
                        <div
                          className="w-1/2 bg-emerald-500 rounded-t-md transition-all duration-300"
                          style={{ height: `${recH}px` }}
                          title={`Received: ${formatRupees(m.receivedBack)}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-2">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-sky-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
                    Money Lent
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Received Back
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Mode 2 Credit Ledger</span>
              </div>
            </div>

            {/* Chart 2: Monthly Borrowing vs Repayments */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Borrowing vs Repayments (Last 6 Months)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monthly debt incurred compared with repayments completed
                </p>
              </div>

              <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                {borrowingMonthlyData.months.map((m, idx) => {
                  const borH = Math.max(4, (m.borrowed / borrowingMonthlyData.maxVal) * 140);
                  const repH = Math.max(4, (m.repaid / borrowingMonthlyData.maxVal) * 140);

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="w-full flex items-end justify-center gap-1 max-w-[36px] h-36">
                        <div
                          className="w-1/2 bg-amber-500 rounded-t-md transition-all duration-300"
                          style={{ height: `${borH}px` }}
                          title={`Borrowed: ${formatRupees(m.borrowed)}`}
                        />
                        <div
                          className="w-1/2 bg-purple-500 rounded-t-md transition-all duration-300"
                          style={{ height: `${repH}px` }}
                          title={`Repaid: ${formatRupees(m.repaid)}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-2">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    Borrowed
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-purple-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                    Repaid
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Mode 2 Debt Ledger</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: ALL KHATA TRANSACTIONS LEDGER & DUE DATES
          ===================================================================== */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="all">All Types</option>
                <option value="credit">Credit (Money Given)</option>
                <option value="debt">Debt (Money Borrowed)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partially Paid</option>
                <option value="overdue">Overdue</option>
                <option value="settled">Settled</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No Khata records match your current filters.
              </div>
            ) : (
              filteredTransactions.map((rec) => {
                const isCredit = rec.type === 'credit';
                const dueStatus = getDueStatus(rec.dueDate);

                return (
                  <div
                    key={rec.id}
                    onClick={() => openRecordDetails(rec, 'credit-debt')}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs',
                          isCredit ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'
                        )}
                      >
                        {isCredit ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {rec.counterpartName}
                          </span>
                          <StatusBadge status={rec.status} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{formatDate(rec.transactionDate)}</span>
                          <span>·</span>
                          <span>{isCredit ? 'Money Given' : 'Money Borrowed'}</span>
                          {rec.dueDate && (
                            <>
                              <span>·</span>
                              <span
                                className={cn(
                                  dueStatus.isOverdue ? 'text-rose-500 font-semibold' : ''
                                )}
                              >
                                Due: {formatDate(rec.dueDate)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={cn(
                            'text-sm font-black block',
                            isCredit ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {formatRupees(rec.originalAmount)}
                        </span>
                        {rec.remainingAmount < rec.originalAmount && (
                          <span className="text-[10px] text-slate-400 block">
                            Bal: {formatRupees(rec.remainingAmount)}
                          </span>
                        )}
                      </div>

                      {rec.remainingAmount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSettle(rec);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Person */}
      {isAddPersonOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAddPersonOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add New Khata Customer / Contact
                </h3>
              </div>
              <button
                onClick={() => setIsAddPersonOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name *
                  </label>
                  {isContactPickerSupported() && (
                    <button
                      type="button"
                      onClick={handleImportContact}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800"
                    >
                      <Contact className="w-3 h-3" />
                      Import from Contacts
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number (for WhatsApp/SMS Reminders)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neighbor / Freelance client"
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPersonOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
                >
                  Save Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Partial / Full Settlement */}
      {settleModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSettleModalItem(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Record Payment Settlement
              </h3>
              <button
                onClick={() => setSettleModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Contact:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{settleModalItem.counterpartName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Original:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupees(settleModalItem.originalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Due:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{formatRupees(settleModalItem.remainingAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteSettle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={settleModalItem.remainingAmount}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={settleTime}
                    onChange={(e) => setSettleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Google Pay"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Photo / PDF
                </label>
                <AttachmentUploader
                  attachments={settleAttachments}
                  onChange={setSettleAttachments}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettleModalItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
                >
                  Save Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
