import React, { useMemo } from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { formatDate, formatTime } from '../../lib/date';
import { AccountType } from '../../types';
import {
  X,
  Building2,
  Smartphone,
  Banknote,
  Landmark,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  History,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccountDetailsModalProps {
  accountId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTransfer: (fromAccId?: string) => void;
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  accountId,
  isOpen,
  onClose,
  onOpenTransfer,
}) => {
  const { accounts, transactions, accountTransfers, openRecordDetails } = useWallet();

  const account = useMemo(() => {
    return accounts.find((a) => a.id === accountId) || null;
  }, [accounts, accountId]);

  // Account Inflows, Outflows, and Internal Transfers
  const accountActivity = useMemo(() => {
    if (!account) return { items: [], totalInflow: 0, totalOutflow: 0 };

    interface AccountActivityItem {
      id: string;
      title: string;
      date: string;
      time: string;
      amount: number;
      type: 'inflow' | 'outflow' | 'transfer_in' | 'transfer_out';
      source: 'income' | 'expense' | 'transfer' | 'credit_repay' | 'debt_repay';
      refRecord?: any;
    }

    const items: AccountActivityItem[] = [];
    let totalInflow = 0;
    let totalOutflow = 0;

    // 1. Transactions tagged with this account
    for (const tx of transactions) {
      if (tx.accountId === account.id) {
        if (tx.type === 'income') {
          totalInflow += tx.amount;
          items.push({
            id: `tx-${tx.id}`,
            title: tx.title,
            date: tx.transactionDate,
            time: tx.transactionTime || '12:00',
            amount: tx.amount,
            type: 'inflow',
            source: 'income',
            refRecord: tx,
          });
        } else if (tx.type === 'expense') {
          totalOutflow += tx.amount;
          items.push({
            id: `tx-${tx.id}`,
            title: tx.title,
            date: tx.transactionDate,
            time: tx.transactionTime || '12:00',
            amount: tx.amount,
            type: 'outflow',
            source: 'expense',
            refRecord: tx,
          });
        }
      }
    }

    // 2. Transfers involving this account
    for (const tr of accountTransfers) {
      if (tr.fromAccountId === account.id) {
        const destAcc = accounts.find((a) => a.id === tr.toAccountId);
        totalOutflow += tr.amount;
        items.push({
          id: `tr-out-${tr.id}`,
          title: `Transfer to ${destAcc?.name || 'Account'}`,
          date: tr.date,
          time: tr.time || '12:00',
          amount: tr.amount,
          type: 'transfer_out',
          source: 'transfer',
        });
      } else if (tr.toAccountId === account.id) {
        const srcAcc = accounts.find((a) => a.id === tr.fromAccountId);
        totalInflow += tr.amount;
        items.push({
          id: `tr-in-${tr.id}`,
          title: `Transfer from ${srcAcc?.name || 'Account'}`,
          date: tr.date,
          time: tr.time || '12:00',
          amount: tr.amount,
          type: 'transfer_in',
          source: 'transfer',
        });
      }
    }

    // Sort descending by date and time
    items.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    });

    return { items, totalInflow, totalOutflow };
  }, [account, transactions, accountTransfers, accounts]);

  if (!isOpen || !account) return null;

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'upi':
        return <Smartphone className="w-5 h-5 text-indigo-500" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-emerald-500" />;
      default:
        return <Landmark className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with Account Type & Balance */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs">
              {getAccountIcon(account.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {account.name}
                </h3>
                {account.isDefault && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    Default
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {account.type.toUpperCase()} {account.accountNumber ? `· ${account.accountNumber}` : ''}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Hero Account Card */}
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Available Account Balance
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {formatRupees(account.currentBalance)}
              </p>
            </div>

            <button
              onClick={() => {
                onOpenTransfer(account.id);
                onClose();
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Funds</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block">Opening Balance</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatRupees(account.openingBalance)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Total Inflow</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +{formatRupees(accountActivity.totalInflow)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block">Total Outflow</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                -{formatRupees(accountActivity.totalOutflow)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Chronological Account Ledger History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              <span>Account Statement ({accountActivity.items.length})</span>
            </h4>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {accountActivity.items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                No recorded transactions or transfers on this account yet.
              </div>
            ) : (
              accountActivity.items.map((item) => {
                const isInflow = item.type === 'inflow' || item.type === 'transfer_in';
                const isTransfer = item.source === 'transfer';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.refRecord) {
                        openRecordDetails(item.refRecord, 'transaction');
                        onClose();
                      }
                    }}
                    className={cn(
                      'p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all',
                      item.refRecord && 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={cn(
                          'p-2 rounded-xl text-white shrink-0',
                          isTransfer
                            ? 'bg-indigo-500'
                            : isInflow
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        )}
                      >
                        {isTransfer ? (
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        ) : isInflow ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(item.date)} · {formatTime(item.time)}
                          {isTransfer && ' · Internal Transfer'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-xs font-black shrink-0',
                        isTransfer
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : isInflow
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {isInflow ? '+' : '-'}
                      {formatRupees(item.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
