import React, { useState, useMemo } from 'react';
import { useWallet } from '../../context/WalletContext';
import { Attachment } from '../../types';
import { formatRupees } from '../../lib/currency';
import { formatDate, formatTime, getDueStatus } from '../../lib/date';
import { StatusBadge } from '../common/StatusBadge';
import { AttachmentUploader } from '../common/AttachmentUploader';
import {
  X,
  Phone,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Send,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { generateWhatsAppUrl, generateSmsUrl } from '../../lib/reminders';

interface PersonLedgerModalProps {
  personId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PersonLedgerModal: React.FC<PersonLedgerModalProps> = ({
  personId,
  isOpen,
  onClose,
}) => {
  const {
    personSummaries,
    creditDebtRecords,
    addCreditDebt,
    settleCreditDebt,
    openRecordDetails,
  } = useWallet();

  // Find person summary
  const person = useMemo(() => {
    if (!personId) return null;
    return personSummaries.find((p) => p.id === personId || p.name.toLowerCase() === personId.toLowerCase()) || null;
  }, [personSummaries, personId]);

  // Person transactions
  const personRecords = useMemo(() => {
    if (!person) return [];
    const pName = person.name.trim().toLowerCase();
    return creditDebtRecords
      .filter((r) => (r.counterpartName || '').trim().toLowerCase() === pName)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [creditDebtRecords, person]);

  // Action Drawer State: 'give' | 'receive' | 'borrow' | 'repay' | null
  const [activeAction, setActiveAction] = useState<'give' | 'receive' | 'borrow' | 'repay' | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [actionTime, setActionTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [actionDueDate, setActionDueDate] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionAttachments, setActionAttachments] = useState<Attachment[]>([]);
  const [selectedRecordToSettle, setSelectedRecordToSettle] = useState<string>('');

  // Unsettled records for settlement dropdown
  const unsettledCredits = useMemo(() => {
    return personRecords.filter((r) => r.type === 'credit' && r.remainingAmount > 0);
  }, [personRecords]);

  const unsettledDebts = useMemo(() => {
    return personRecords.filter((r) => r.type === 'debt' && r.remainingAmount > 0);
  }, [personRecords]);

  if (!isOpen || !person) return null;

  const isNetReceivable = person.netBalance > 0;
  const isNetPayable = person.netBalance < 0;

  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0) return;

    if (activeAction === 'give') {
      // Lending money (Credit)
      addCreditDebt({
        type: 'credit',
        counterpartName: person.name,
        counterpartPhone: person.phone,
        personId: person.id,
        originalAmount: amount,
        settledAmount: 0,
        transactionDate: actionDate,
        transactionTime: actionTime,
        dueDate: actionDueDate || undefined,
        notes: actionNotes.trim() || undefined,
        status: 'pending',
        attachments: actionAttachments,
        repayments: [],
      });
    } else if (activeAction === 'borrow') {
      // Borrowing money (Debt)
      addCreditDebt({
        type: 'debt',
        counterpartName: person.name,
        counterpartPhone: person.phone,
        personId: person.id,
        originalAmount: amount,
        settledAmount: 0,
        transactionDate: actionDate,
        transactionTime: actionTime,
        dueDate: actionDueDate || undefined,
        notes: actionNotes.trim() || undefined,
        status: 'pending',
        attachments: actionAttachments,
        repayments: [],
      });
    } else if (activeAction === 'receive') {
      // Receiving payment back from money given
      const targetId = selectedRecordToSettle || unsettledCredits[0]?.id;
      if (targetId) {
        settleCreditDebt(
          targetId,
          amount,
          actionAttachments,
          actionNotes.trim() || undefined,
          actionDate,
          actionTime
        );
      }
    } else if (activeAction === 'repay') {
      // Repaying money borrowed
      const targetId = selectedRecordToSettle || unsettledDebts[0]?.id;
      if (targetId) {
        settleCreditDebt(
          targetId,
          amount,
          actionAttachments,
          actionNotes.trim() || undefined,
          actionDate,
          actionTime
        );
      }
    }

    // Reset
    setActiveAction(null);
    setActionAmount('');
    setActionNotes('');
    setActionDueDate('');
    setActionAttachments([]);
    setSelectedRecordToSettle('');
  };

  const handleSendQuickWhatsApp = () => {
    if (!person.phone) {
      alert('No phone number saved for this person.');
      return;
    }
    const msg = isNetReceivable
      ? `Hi ${person.name}, this is a gentle reminder regarding the outstanding balance of ${formatRupees(
          person.outstandingReceivable
        )} on your Khata account. Thank you!`
      : `Hi ${person.name}, just confirming the Khata balance statement. Thank you!`;

    const url = generateWhatsAppUrl(person.phone, msg);
    window.open(url, '_blank');
  };

  const handleSendQuickSMS = () => {
    if (!person.phone) {
      alert('No phone number saved for this person.');
      return;
    }
    const msg = `Hi ${person.name}, outstanding Khata balance: ${formatRupees(
      person.netBalance > 0 ? person.outstandingReceivable : person.outstandingPayable
    )}.`;
    const url = generateSmsUrl(person.phone, msg);
    window.location.href = url;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with Person Initials, Name, Phone & Close */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md">
              {person.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {person.name}
                </h3>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    isNetReceivable
                      ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                      : isNetPayable
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  )}
                >
                  {isNetReceivable ? 'You will get' : isNetPayable ? 'You will pay' : 'All Settled'}
                </span>
              </div>
              {person.phone ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{person.phone}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">No phone number</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {person.phone && (
              <>
                <button
                  onClick={handleSendQuickWhatsApp}
                  title="Send WhatsApp Message"
                  className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendQuickSMS}
                  title="Send SMS"
                  className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Hero Balance Card */}
        <div
          className={cn(
            'p-5 rounded-3xl border shadow-sm relative overflow-hidden',
            isNetReceivable
              ? 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60'
              : isNetPayable
              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Current Outstanding Balance
              </span>
              <p
                className={cn(
                  'text-2xl sm:text-3xl font-black mt-1',
                  isNetReceivable
                    ? 'text-sky-600 dark:text-sky-400'
                    : isNetPayable
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-900 dark:text-white'
                )}
              >
                {formatRupees(Math.abs(person.netBalance))}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                {isNetReceivable
                  ? `${person.name} owes you this amount.`
                  : isNetPayable
                  ? `You owe ${person.name} this amount.`
                  : 'All credits and debts are settled.'}
              </span>
            </div>

            {/* 4 Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setActiveAction('give')}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Give Money (Lend)</span>
              </button>

              <button
                onClick={() => setActiveAction('receive')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Record Payment Received</span>
              </button>

              <button
                onClick={() => setActiveAction('borrow')}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Borrow Money</span>
              </button>

              <button
                onClick={() => setActiveAction('repay')}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <History className="w-3.5 h-3.5" />
                <span>Record Repayment</span>
              </button>
            </div>
          </div>

          {/* Ledger Breakdown Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Total Given</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formatRupees(person.totalGiven)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Received Back</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupees(person.totalReceivedBack)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Total Borrowed</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formatRupees(person.totalBorrowed)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Total Repaid</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formatRupees(person.totalRepaid)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Action Form Drawer */}
        {activeAction && (
          <form
            onSubmit={handleExecuteAction}
            className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {activeAction === 'give'
                  ? `Give Money (Lend) to ${person.name}`
                  : activeAction === 'receive'
                  ? `Receive Repayment from ${person.name}`
                  : activeAction === 'borrow'
                  ? `Borrow Money from ${person.name}`
                  : `Repay Money to ${person.name}`}
              </span>
              <button
                type="button"
                onClick={() => setActiveAction(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(activeAction === 'receive' && unsettledCredits.length > 1) && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Apply to specific credit entry
                </label>
                <select
                  value={selectedRecordToSettle}
                  onChange={(e) => setSelectedRecordToSettle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  {unsettledCredits.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatRupees(c.remainingAmount)} remaining ({formatDate(c.transactionDate)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(activeAction === 'repay' && unsettledDebts.length > 1) && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Apply to specific debt entry
                </label>
                <select
                  value={selectedRecordToSettle}
                  onChange={(e) => setSelectedRecordToSettle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  {unsettledDebts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatRupees(d.remainingAmount)} remaining ({formatDate(d.transactionDate)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={actionTime}
                  onChange={(e) => setActionTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            {(activeAction === 'give' || activeAction === 'borrow') && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Notes / Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. UPI transfer, cash loan, partial return"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Receipts & Attachments
              </label>
              <AttachmentUploader
                attachments={actionAttachments}
                onChange={setActionAttachments}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveAction(null)}
                className="px-3.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Record</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. Complete Chronological Ledger Entries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Ledger History ({personRecords.length} records)
            </h4>
            <span className="text-xs text-slate-400">Chronological statement</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {personRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                No credit or debt transactions recorded with {person.name} yet.
              </div>
            ) : (
              personRecords.map((record) => {
                const isCredit = record.type === 'credit';
                const dueStatus = getDueStatus(record.dueDate);

                return (
                  <div
                    key={record.id}
                    onClick={() => openRecordDetails(record, 'credit-debt')}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'p-2 rounded-xl text-white',
                            isCredit ? 'bg-sky-500' : 'bg-amber-500'
                          )}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {isCredit ? 'Money Given (Lent)' : 'Money Borrowed'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(record.transactionDate)} · {formatTime(record.transactionTime)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={cn(
                            'text-sm font-black block',
                            isCredit ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {formatRupees(record.originalAmount)}
                        </span>
                        <StatusBadge status={record.status} />
                      </div>
                    </div>

                    {/* Repayments summary & Remaining balance */}
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-50 dark:border-slate-800 text-slate-500">
                      <span>
                        Remaining: <strong className="text-slate-800 dark:text-slate-200">{formatRupees(record.remainingAmount)}</strong>
                      </span>
                      {record.dueDate && (
                        <span
                          className={cn(
                            'font-semibold',
                            dueStatus.isOverdue ? 'text-rose-500' : 'text-slate-400'
                          )}
                        >
                          Due: {formatDate(record.dueDate)} ({dueStatus.label})
                        </span>
                      )}
                    </div>

                    {/* Repayment History timeline snippet */}
                    {record.repayments && record.repayments.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-50 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Repayments Recorded ({record.repayments.length}):
                        </span>
                        {record.repayments.map((rep) => (
                          <div
                            key={rep.id}
                            className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-lg"
                          >
                            <span>
                              {formatDate(rep.paymentDate)} {rep.notes ? `· ${rep.notes}` : ''}
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatRupees(rep.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
