import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { PaymentMethod, QuickAddPayload } from '../../types';
import { X, ArrowDownRight, ArrowUpRight, HandCoins, Landmark, Upload, Paperclip } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../../lib/currency';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, closeQuickAdd, quickAddInitialMode, categories, quickAdd } = useWallet();

  const [mode, setMode] = useState<'income' | 'expense' | 'credit' | 'debt'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [counterpartName, setCounterpartName] = useState<string>('');
  const [counterpartPhone, setCounterpartPhone] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [hasReceipt, setHasReceipt] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode with trigger
  useEffect(() => {
    if (isQuickAddOpen) {
      setMode(quickAddInitialMode);
      setAmount('');
      setTitle('');
      setCounterpartName('');
      setCounterpartPhone('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setHasReceipt(false);
      setError(null);
    }
  }, [isQuickAddOpen, quickAddInitialMode]);

  // Set default category when mode or categories change
  useEffect(() => {
    const validCategories = categories.filter((c) =>
      mode === 'income' ? c.type === 'income' : c.type === 'expense'
    );
    if (validCategories.length > 0 && !categoryId) {
      setCategoryId(validCategories[0].id);
    }
  }, [mode, categories, categoryId]);

  if (!isQuickAddOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (mode === 'income' || mode === 'expense') {
      if (!title.trim()) {
        setError('Please enter a transaction title');
        return;
      }
    } else {
      if (!counterpartName.trim()) {
        setError('Please enter the contact person or business name');
        return;
      }
    }

    const payload: QuickAddPayload = {
      mode,
      amount: numAmount,
      title: title.trim() || counterpartName.trim(),
      categoryId: (mode === 'income' || mode === 'expense') ? categoryId : undefined,
      paymentMethod: (mode === 'income' || mode === 'expense') ? paymentMethod : undefined,
      counterpartName: (mode === 'credit' || mode === 'debt') ? counterpartName.trim() : undefined,
      counterpartPhone: (mode === 'credit' || mode === 'debt') ? counterpartPhone.trim() : undefined,
      date,
      dueDate: (mode === 'credit' || mode === 'debt') ? (dueDate || undefined) : undefined,
      description: description.trim() || undefined,
    };

    quickAdd(payload);
  };

  const filteredCategories = categories.filter((c) =>
    mode === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Record New Transaction
          </h2>
          <button
            onClick={closeQuickAdd}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => { setMode('expense'); setCategoryId(''); }}
              className={`py-2 px-1 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all ${
                mode === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode('income'); setCategoryId(''); }}
              className={`py-2 px-1 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all ${
                mode === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('credit')}
              className={`py-2 px-1 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all ${
                mode === 'credit'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HandCoins className="w-3.5 h-3.5" />
              <span>Credit</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('debt')}
              className={`py-2 px-1 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all ${
                mode === 'debt'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Debt</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900/60">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                {CURRENCY_SYMBOL}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Title or Counterpart Details */}
          {(mode === 'income' || mode === 'expense') ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Title / Reason
                </label>
                <input
                  type="text"
                  placeholder={mode === 'expense' ? 'e.g. Swiggy Food, D-Mart Grocery' : 'e.g. Salary, Client Milestone'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="cash">Cash</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="bank_transfer">Net Banking / NEFT</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Credit or Debt Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {mode === 'credit' ? 'Person who owes you' : 'Person you owe to'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={counterpartName}
                    onChange={(e) => setCounterpartName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={counterpartPhone}
                    onChange={(e) => setCounterpartPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Expected Return / Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Add any context or reminder"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Attachment placeholder (Phase 3 Supabase Storage ready) */}
          <div className="pt-2">
            <div
              onClick={() => setHasReceipt(!hasReceipt)}
              className={`p-3 rounded-xl border border-dashed cursor-pointer flex items-center justify-between text-xs transition-colors ${
                hasReceipt
                  ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {hasReceipt ? (
                  <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>
                  {hasReceipt ? 'Bill receipt attached (sample_bill.pdf)' : 'Attach Bill or Payment Screenshot'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {hasReceipt ? 'Tap to remove' : 'Phase 3 Ready'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeQuickAdd}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md active:scale-95 transition-all ${
                mode === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : mode === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : mode === 'credit'
                  ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              }`}
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
