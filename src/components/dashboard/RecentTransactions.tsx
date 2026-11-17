import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { CategoryIcon } from '../common/CategoryIcon';
import { PaymentBadge } from '../common/PaymentBadge';
import { ArrowRight, Paperclip, Trash2 } from 'lucide-react';

export const RecentTransactions: React.FC = () => {
  const { transactions, categories, deleteTransaction, setActiveTab, openRecordDetails } = useWallet();

  const recentList = transactions.slice(0, 5);

  const getCategory = (catId: string) => {
    return categories.find((c) => c.id === catId);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Transactions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest income deposits and expenses
          </p>
        </div>

        <button
          onClick={() => setActiveTab('transactions')}
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center gap-1 group"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Transaction list */}
      {recentList.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
          No transactions logged yet. Tap &apos;+&apos; to record your first entry.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {recentList.map((tx) => {
            const category = getCategory(tx.categoryId);
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                onClick={() => openRecordDetails(tx, 'transaction')}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors cursor-pointer"
              >
                {/* Left: Icon and info */}
                <div className="flex items-center gap-3 min-w-0">
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
                      <p className="text-xs md:text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {tx.title}
                      </p>
                      {tx.attachments && tx.attachments.length > 0 && (
                        <span title="Has attachment" className="text-slate-400 dark:text-slate-500">
                          <Paperclip className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PaymentBadge method={tx.paymentMethod} />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDate(tx.transactionDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount and Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p
                      className={`text-xs md:text-sm font-bold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {formatRupees(tx.amount, { showSign: true })}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                      {category?.name || 'General'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTransaction(tx.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
