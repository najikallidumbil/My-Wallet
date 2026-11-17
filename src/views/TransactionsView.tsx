import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatRupees } from '../lib/currency';
import { formatDate } from '../lib/date';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { PaymentBadge } from '../components/common/PaymentBadge';
import { Search, Plus, Filter, Trash2, Paperclip, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions, categories, deleteTransaction, openQuickAdd } = useWallet();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.title.toLowerCase().includes(search.toLowerCase()) ||
        (tx.description && tx.description.toLowerCase().includes(search.toLowerCase()));

      const matchesType = typeFilter === 'all' || tx.type === typeFilter;
      const matchesCat = selectedCategory === 'all' || tx.categoryId === selectedCategory;

      return matchesSearch && matchesType && matchesCat;
    });
  }, [transactions, search, typeFilter, selectedCategory]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const getCategory = (catId: string) => {
    return categories.find((c) => c.id === catId);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            All Transactions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredTransactions.length} of {transactions.length} recorded entries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openQuickAdd('expense')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter Stats Card */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Total Income</span>
          <span className="text-sm md:text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatRupees(summary.income)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Total Expense</span>
          <span className="text-sm md:text-lg font-bold text-rose-600 dark:text-rose-400">
            {formatRupees(summary.expense)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Net Flow</span>
          <span
            className={`text-sm md:text-lg font-bold ${
              summary.net >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupees(summary.net, { showSign: true })}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, description, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>

        {/* Type Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs self-start">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              typeFilter === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              typeFilter === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>Income</span>
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              typeFilter === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-3 h-3" />
            <span>Expense</span>
          </button>
        </div>

        {/* Category Dropdown Filter */}
        <div className="relative self-start sm:w-48">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs appearance-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
            No transactions match your search or filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTransactions.map((tx) => {
              const category = getCategory(tx.categoryId);
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `${category?.color || '#6366f1'}18`,
                      }}
                    >
                      <CategoryIcon
                        name={category?.icon}
                        className="w-5 h-5"
                        color={category?.color || '#6366f1'}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </span>
                        {tx.attachments && tx.attachments.length > 0 && (
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>
                      {tx.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                          {tx.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <PaymentBadge method={tx.paymentMethod} />
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {formatDate(tx.transactionDate)}
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {category?.name || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm md:text-base font-bold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatRupees(tx.amount, { showSign: true })}
                    </span>

                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
