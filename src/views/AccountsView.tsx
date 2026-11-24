import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { formatRupees } from '../lib/currency';
import { formatDate, formatTime } from '../lib/date';
import { Account, AccountType } from '../types';
import {
  WalletCards,
  Building2,
  Smartphone,
  Banknote,
  Landmark,
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  History,
} from 'lucide-react';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    accountTransfers,
    addAccount,
    updateAccount,
    deleteAccount,
    transferBetweenAccounts,
    setSelectedAccountId,
  } = useWallet();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accBalance, setAccBalance] = useState('');
  const [accNumber, setAccNumber] = useState('');

  // Transfer Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferTime, setTransferTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [transferNotes, setTransferNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccBalance('');
    setAccNumber('');
    setIsAddAccountOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.openingBalance.toString());
    setAccNumber(acc.accountNumber || '');
    setIsAddAccountOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: accName.trim(),
        type: accType,
        openingBalance: parseFloat(accBalance) || 0,
        accountNumber: accNumber.trim() || undefined,
      });
    } else {
      addAccount({
        name: accName.trim(),
        type: accType,
        openingBalance: parseFloat(accBalance) || 0,
        accountNumber: accNumber.trim() || undefined,
        color:
          accType === 'cash'
            ? '#10b981'
            : accType === 'bank'
            ? '#3b82f6'
            : accType === 'upi'
            ? '#6366f1'
            : '#f59e0b',
      });
    }

    setIsAddAccountOpen(false);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0 || fromAccountId === toAccountId) {
      alert('Please select different accounts and a positive amount.');
      return;
    }

    transferBetweenAccounts(
      fromAccountId,
      toAccountId,
      amount,
      transferDate,
      transferTime,
      transferNotes.trim() || undefined
    );

    setTransferAmount('');
    setTransferNotes('');
    setIsTransferModalOpen(false);
  };

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

  const totalAcrossAccounts = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Multiple Accounts & Portfolios
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain independent balances for Cash, Banks, and UPI wallets with internal transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Aggregate Balance Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-1">
            Total Balance Across All Accounts
          </span>
          <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {formatRupees(totalAcrossAccounts)}
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
          {accounts.length} Active Accounts
        </span>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccountId(acc.id)}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-xs">
                  {getAccountIcon(acc.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {acc.name}
                  </h4>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">
                    {acc.type} {acc.accountNumber ? `· ${acc.accountNumber}` : ''}
                  </span>
                </div>
              </div>

              {acc.isDefault && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 shrink-0">
                  Default
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Current Balance</span>
              <span className="text-xl font-black text-slate-900 dark:text-white block mt-0.5">
                {formatRupees(acc.currentBalance)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Opening: {formatRupees(acc.openingBalance)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFromAccountId(acc.id);
                  setIsTransferModalOpen(true);
                }}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Transfer</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(acc)}
                  className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit account"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {!acc.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this account?')) {
                        deleteAccount(acc.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Delete account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Internal Transfer History Ledger */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Internal Account Transfer History ({accountTransfers.length})
          </h3>
        </div>

        {accountTransfers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No transfers recorded yet. Internal transfers move money between your own accounts without affecting Net Worth.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {accountTransfers.map((tr) => {
              const fromAcc = accounts.find((a) => a.id === tr.fromAccountId);
              const toAcc = accounts.find((a) => a.id === tr.toAccountId);

              return (
                <div key={tr.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-600">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {fromAcc?.name || 'Account'} → {toAcc?.name || 'Account'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(tr.date)} at {formatTime(tr.time)}{' '}
                        {tr.notes ? `· ${tr.notes}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {formatRupees(tr.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Funds Modal */}
      {isTransferModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsTransferModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Transfer Funds Between Accounts
                </h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    From Account *
                  </label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupees(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To Account *
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupees(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={transferTime}
                    onChange={(e) => setTransferTime(e.target.value)}
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
                  placeholder="e.g. Bank transfer to cash withdrawal"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {isAddAccountOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAddAccountOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Create New Account'}
              </h3>
              <button
                onClick={() => setIsAddAccountOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis Bank Salary Account"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Type
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="bank">Bank Account</option>
                    <option value="upi">UPI Wallet</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Number / Identifier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. •••• 9920 or upi@id"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
