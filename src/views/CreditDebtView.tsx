import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { CreditDebtType, RecordStatus, CreditDebtRecord } from '../types';
import { formatRupees } from '../lib/currency';
import { getDueStatus } from '../lib/date';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  HandCoins,
  Landmark,
  Plus,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  Check,
  Trash2,
  X,
} from 'lucide-react';

export const CreditDebtView: React.FC = () => {
  const { creditDebtRecords, settleCreditDebt, deleteCreditDebt, openQuickAdd } = useWallet();

  const [activeTab, setActiveTab] = useState<CreditDebtType>('credit');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RecordStatus>('all');

  // Settle modal state
  const [settleModalItem, setSettleModalItem] = useState<CreditDebtRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');

  const filteredRecords = useMemo(() => {
    return creditDebtRecords.filter((record) => {
      const matchesType = record.type === activeTab;
      const matchesSearch =
        record.counterpartName.toLowerCase().includes(search.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(search.toLowerCase())) ||
        (record.counterpartPhone && record.counterpartPhone.includes(search));

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      return matchesType && matchesSearch && matchesStatus;
    });
  }, [creditDebtRecords, activeTab, search, statusFilter]);

  const stats = useMemo(() => {
    const list = creditDebtRecords.filter((r) => r.type === activeTab);
    const totalOriginal = list.reduce((sum, r) => sum + r.originalAmount, 0);
    const totalSettled = list.reduce((sum, r) => sum + r.settledAmount, 0);
    const totalPending = list.reduce((sum, r) => sum + r.remainingAmount, 0);
    const overdueCount = list.filter((r) => r.status === 'overdue').length;

    return { totalOriginal, totalSettled, totalPending, overdueCount };
  }, [creditDebtRecords, activeTab]);

  const handleOpenSettle = (record: CreditDebtRecord) => {
    setSettleModalItem(record);
    setSettleAmount(record.remainingAmount.toString());
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalItem) return;
    const amount = parseFloat(settleAmount);
    if (!amount || amount <= 0) return;

    settleCreditDebt(settleModalItem.id, amount);
    setSettleModalItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Credit & Debt (Khata)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep track of personal loans, shared group bills, and commitments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickAdd(activeTab)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record {activeTab === 'credit' ? 'Credit' : 'Debt'}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs: You will get vs You owe */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/60 dark:bg-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('credit')}
          className={`py-3 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'credit'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          <span>You Will Get (Credits)</span>
        </button>

        <button
          onClick={() => setActiveTab('debt')}
          className={`py-3 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'debt'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>You Owe (Debts)</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Total Pending</span>
          <span
            className={`text-base md:text-xl font-extrabold ${
              activeTab === 'credit'
                ? 'text-cyan-600 dark:text-cyan-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatRupees(stats.totalPending)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Settled to Date</span>
          <span className="text-base md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatRupees(stats.totalSettled)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Total Given/Taken</span>
          <span className="text-base md:text-xl font-bold text-slate-800 dark:text-slate-200">
            {formatRupees(stats.totalOriginal)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Overdue Count</span>
          <span
            className={`text-base md:text-xl font-bold ${
              stats.overdueCount > 0 ? 'text-rose-500' : 'text-slate-500'
            }`}
          >
            {stats.overdueCount} {stats.overdueCount === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search counterpart name, phone, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs self-start overflow-x-auto max-w-full">
          {(['all', 'pending', 'partial', 'overdue', 'settled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Record Cards Grid */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            No {activeTab === 'credit' ? 'credit' : 'debt'} records found.
          </p>
          <button
            onClick={() => openQuickAdd(activeTab)}
            className="mt-3 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
          >
            + Create New Record
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((item) => {
            const dueInfo = getDueStatus(item.dueDate);
            const isSettled = item.status === 'settled';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                  item.status === 'overdue'
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top: Counterpart name & Status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.counterpartName}
                    </h3>
                    {item.counterpartPhone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.counterpartPhone}</span>
                      </p>
                    )}
                  </div>

                  <StatusBadge status={item.status} />
                </div>

                {/* Middle: Amount numbers */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Pending Balance</span>
                    <span
                      className={`text-xl font-extrabold ${
                        isSettled
                          ? 'text-slate-400 line-through'
                          : activeTab === 'credit'
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {formatRupees(item.remainingAmount)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Original / Settled</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatRupees(item.originalAmount)} / {formatRupees(item.settledAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress bar if partially settled */}
                {item.settledAmount > 0 && !isSettled && (
                  <div className="mt-2.5">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (item.settledAmount / item.originalAmount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes and Due Date */}
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  {item.notes && (
                    <p className="italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg text-[11px]">
                      &quot;{item.notes}&quot;
                    </p>
                  )}

                  {item.dueDate && (
                    <div className="flex items-center gap-1.5 text-[11px] pt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span
                        className={
                          dueInfo.isOverdue
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {dueInfo.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Toolbar */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.counterpartPhone && (
                      <>
                        <a
                          href={`tel:${item.counterpartPhone}`}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Call counterpart"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${item.counterpartPhone.replace(/[^0-9]/g, '')}?text=Hi ${item.counterpartName}, regarding the wallet khata balance of ${formatRupees(item.remainingAmount)}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="WhatsApp reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSettled && (
                      <button
                        onClick={() => handleOpenSettle(item)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Settle</span>
                      </button>
                    )}

                    <button
                      onClick={() => deleteCreditDebt(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settle Record Modal */}
      {settleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Settlement
              </h3>
              <button
                onClick={() => setSettleModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Counterpart: <strong className="text-slate-800 dark:text-slate-200">{settleModalItem.counterpartName}</strong>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total Remaining: <strong className="text-cyan-600 dark:text-cyan-400">{formatRupees(settleModalItem.remainingAmount)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Settled Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={settleModalItem.remainingAmount}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
