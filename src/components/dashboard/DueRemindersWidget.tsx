import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { getDueStatus } from '../../lib/date';
import { Bell, AlertTriangle, Clock, Check, ArrowRight, MessageSquare } from 'lucide-react';

export const DueRemindersWidget: React.FC = () => {
  const { creditDebtRecords, settleCreditDebt, setActiveTab, openReminderModal } = useWallet();

  // Filter records that have a due date and are not settled
  const activeDueRecords = creditDebtRecords
    .filter((r) => r.status !== 'settled' && r.dueDate)
    .map((record) => ({
      ...record,
      dueInfo: getDueStatus(record.dueDate),
    }))
    // Sort: overdue first, then closest upcoming due date
    .sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining)
    .slice(0, 3); // top 3 urgent reminders

  if (activeDueRecords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Due Date Reminders
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upcoming collections & payments
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('credit-debt')}
          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          <span>View Khata</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5">
        {activeDueRecords.map((item) => {
          const isCredit = item.type === 'credit';
          const isOverdue = item.dueInfo.isOverdue;

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                isOverdue
                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isOverdue
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/80 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-900/80 dark:text-amber-300'
                  }`}
                >
                  {isOverdue ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.counterpartName}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        isCredit
                          ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {isCredit ? 'To Collect' : 'To Pay'}
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {item.dueInfo.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs md:text-sm font-bold text-slate-900 dark:text-white mr-1">
                  {formatRupees(item.remainingAmount)}
                </span>

                <button
                  onClick={() => openReminderModal(item)}
                  title="Send WhatsApp / SMS reminder"
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/80 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden sm:inline">Remind</span>
                </button>

                <button
                  onClick={() => settleCreditDebt(item.id, item.remainingAmount)}
                  title="Mark fully settled"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
