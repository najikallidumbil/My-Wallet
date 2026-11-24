import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { RecurringTransaction, TransactionType } from '../types';
import { formatRupees } from '../lib/currency';
import { formatDate } from '../lib/date';
import { CategoryIcon } from '../components/common/CategoryIcon';
import {
  Repeat,
  Plus,
  Check,
  X,
  Trash2,
  Edit3,
  Play,
  Pause,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const RecurringView: React.FC = () => {
  const {
    recurringTransactions,
    categories,
    accounts,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    processDueRecurringTransactions,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null);

  // Form state
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleType, setRuleType] = useState<TransactionType>('expense');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleAccountId, setRuleAccountId] = useState('');
  const [ruleInterval, setRuleInterval] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [ruleStartDate, setRuleStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [ruleNotes, setRuleNotes] = useState('');
  const [processedMessage, setProcessedMessage] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setRuleTitle('');
    setRuleAmount('');
    setRuleType('expense');
    setRuleCategoryId(categories.find((c) => c.type === 'expense')?.id || '');
    setRuleAccountId(accounts[0]?.id || '');
    setRuleInterval('monthly');
    setRuleStartDate(new Date().toISOString().split('T')[0]);
    setRuleNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: RecurringTransaction) => {
    setEditingRule(rule);
    setRuleTitle(rule.title);
    setRuleAmount(rule.amount.toString());
    setRuleType(rule.type);
    setRuleCategoryId(rule.categoryId);
    setRuleAccountId(rule.accountId);
    setRuleInterval(rule.interval);
    setRuleStartDate(rule.startDate);
    setRuleNotes(rule.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(ruleAmount);
    if (!ruleTitle.trim() || !amount || amount <= 0) return;

    if (editingRule) {
      updateRecurringTransaction(editingRule.id, {
        title: ruleTitle.trim(),
        amount,
        type: ruleType,
        categoryId: ruleCategoryId || categories[0]?.id,
        accountId: ruleAccountId || accounts[0]?.id,
        interval: ruleInterval,
        startDate: ruleStartDate,
        notes: ruleNotes.trim() || undefined,
      });
    } else {
      addRecurringTransaction({
        title: ruleTitle.trim(),
        amount,
        type: ruleType,
        categoryId: ruleCategoryId || categories[0]?.id,
        accountId: ruleAccountId || accounts[0]?.id,
        interval: ruleInterval,
        startDate: ruleStartDate,
        nextDueDate: ruleStartDate,
        isActive: true,
        notes: ruleNotes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const handleRunProcessor = () => {
    const count = processDueRecurringTransactions();
    if (count > 0) {
      setProcessedMessage(`Successfully processed and recorded ${count} due recurring transaction(s)!`);
    } else {
      setProcessedMessage('All recurring rules are up-to-date. None are due today.');
    }
    setTimeout(() => setProcessedMessage(null), 4000);
  };

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);
  const getAccount = (accId?: string) => accounts.find((a) => a.id === accId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Recurring Transactions
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automate routine salary deposits, monthly rent, subscriptions, and utility bills
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunProcessor}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Process Due Now</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Recurring Rule</span>
          </button>
        </div>
      </div>

      {processedMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{processedMessage}</span>
        </div>
      )}

      {/* Rules Grid */}
      {recurringTransactions.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 space-y-3">
          <Repeat className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No recurring rules active
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Schedule recurring salary or bills (daily, weekly, monthly, yearly) to log automatically.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule First Rule</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringTransactions.map((rule) => {
            const cat = getCategory(rule.categoryId);
            const acc = getAccount(rule.accountId);
            const isIncome = rule.type === 'income';

            return (
              <div
                key={rule.id}
                className={cn(
                  'p-5 rounded-3xl bg-white dark:bg-slate-900 border shadow-sm flex flex-col justify-between space-y-4 transition-all',
                  rule.isActive
                    ? 'border-slate-200/80 dark:border-slate-800'
                    : 'border-slate-200/50 dark:border-slate-800/50 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: `${cat?.color || '#6366f1'}18` }}
                    >
                      <CategoryIcon name={cat?.icon} className="w-5 h-5" color={cat?.color || '#6366f1'} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {rule.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {rule.interval} · {cat?.name || 'General'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-sm font-black shrink-0',
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    )}
                  >
                    {formatRupees(rule.amount, { showSign: true })}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Next Due Date:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(rule.nextDueDate)}
                    </span>
                  </div>
                  {acc && (
                    <div className="flex justify-between text-slate-500">
                      <span>Account:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                    </div>
                  )}
                </div>

                {/* Footer Toolbar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      updateRecurringTransaction(rule.id, { isActive: !rule.isActive })
                    }
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-colors',
                      rule.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    )}
                  >
                    {rule.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{rule.isActive ? 'Active' : 'Paused'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg"
                      title="Edit rule"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this recurring rule?')) {
                          deleteRecurringTransaction(rule.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                      title="Delete rule"
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

      {/* Add / Edit Recurring Rule Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingRule ? 'Edit Recurring Rule' : 'Create Recurring Rule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix Subscription or Apartment Rent"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 1999"
                    value={ruleAmount}
                    onChange={(e) => setRuleAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recurring Frequency
                  </label>
                  <select
                    value={ruleInterval}
                    onChange={(e) => setRuleInterval(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account
                  </label>
                  <select
                    value={ruleAccountId}
                    onChange={(e) => setRuleAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={ruleCategoryId}
                    onChange={(e) => setRuleCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {categories
                      .filter((c) => c.type === ruleType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start / Next Date
                  </label>
                  <input
                    type="date"
                    required
                    value={ruleStartDate}
                    onChange={(e) => setRuleStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Account number, auto-debit note"
                  value={ruleNotes}
                  onChange={(e) => setRuleNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Recurring Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
