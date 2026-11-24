import React, { useState, useEffect } from 'react';
import { Transaction, CreditDebtRecord, Attachment, PaymentMethod } from '../../types';
import { useWallet } from '../../context/WalletContext';
import { formatRupees } from '../../lib/currency';
import { formatDate, formatFullDate, formatTime, getDueStatus } from '../../lib/date';
import { formatFileSize } from '../../services/attachmentStorage';
import { PaymentBadge } from '../common/PaymentBadge';
import { StatusBadge } from '../common/StatusBadge';
import { AttachmentUploader } from '../common/AttachmentUploader';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Clock,
  Paperclip,
  Trash2,
  Plus,
  Edit3,
  Check,
  Phone,
  MessageSquare,
  History,
} from 'lucide-react';

interface RecordDetailsModalProps {
  record: (Transaction | CreditDebtRecord) | null;
  recordKind: 'transaction' | 'credit-debt';
  isOpen: boolean;
  onClose: () => void;
  onUpdateAttachments?: (recordId: string, attachments: Attachment[]) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const RecordDetailsModal: React.FC<RecordDetailsModalProps> = ({
  record,
  recordKind,
  isOpen,
  onClose,
  onUpdateAttachments,
  onDeleteRecord,
}) => {
  const { categories, updateTransaction, updateCreditDebt, openReminderModal } = useWallet();

  const [activeLightbox, setActiveLightbox] = useState<Attachment | null>(null);
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);

  // Edit record state
  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');

  // Initialize state when record changes or modal opens
  useEffect(() => {
    if (record) {
      setCurrentAttachments(record.attachments || []);
      setIsEditingAttachments(false);
      setIsEditingRecord(false);
      setActiveLightbox(null);

      if (recordKind === 'transaction') {
        const tx = record as Transaction;
        setEditTitle(tx.title);
        setEditAmount(tx.amount.toString());
        setEditDate(tx.transactionDate);
        setEditTime(tx.transactionTime || '12:00');
        setEditNotes(tx.description || '');
        setEditCategoryId(tx.categoryId);
        setEditPaymentMethod(tx.paymentMethod);
      } else {
        const cd = record as CreditDebtRecord;
        setEditTitle(cd.counterpartName);
        setEditAmount(cd.originalAmount.toString());
        setEditDate(cd.transactionDate || cd.createdAt.split('T')[0]);
        setEditTime(cd.transactionTime || '12:00');
        setEditDueDate(cd.dueDate || '');
        setEditPhone(cd.counterpartPhone || '');
        setEditNotes(cd.notes || '');
      }
    }
  }, [record, recordKind, isOpen]);

  if (!isOpen || !record) return null;

  const isTransaction = recordKind === 'transaction';
  const tx = isTransaction ? (record as Transaction) : null;
  const cd = !isTransaction ? (record as CreditDebtRecord) : null;

  const handleSaveAttachments = () => {
    if (onUpdateAttachments && record) {
      onUpdateAttachments(record.id, currentAttachments);
    }
    setIsEditingAttachments(false);
  };

  const handleSaveRecordEdits = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !editTitle.trim()) {
      alert('Please provide a valid title and positive amount');
      return;
    }

    if (isTransaction) {
      updateTransaction(record.id, {
        title: editTitle.trim(),
        amount: parsedAmount,
        transactionDate: editDate || new Date().toISOString().split('T')[0],
        transactionTime: editTime || '12:00',
        description: editNotes.trim() || undefined,
        categoryId: editCategoryId,
        paymentMethod: editPaymentMethod,
      });
    } else {
      updateCreditDebt(record.id, {
        counterpartName: editTitle.trim(),
        originalAmount: parsedAmount,
        transactionDate: editDate || new Date().toISOString().split('T')[0],
        transactionTime: editTime || '12:00',
        dueDate: editDueDate || undefined,
        counterpartPhone: editPhone.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
    }
    setIsEditingRecord(false);
  };

  const handleDownload = (item: Attachment) => {
    if (!item.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.fileName;
    a.click();
  };

  const handleOpenPdf = (item: Attachment) => {
    if (!item.dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${item.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const dueInfo = cd?.dueDate ? getDueStatus(cd.dueDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isTransaction ? 'Transaction Details' : 'Khata Record Details'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditingRecord && (
              <button
                type="button"
                onClick={() => setIsEditingRecord(true)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1"
                title="Edit this record"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {isEditingRecord ? (
            /* Edit Record Form */
            <form onSubmit={handleSaveRecordEdits} className="space-y-4">
              <div className="p-3 bg-brand-50/60 dark:bg-brand-950/40 rounded-2xl border border-brand-200/60 dark:border-brand-800/60 text-xs font-medium text-brand-700 dark:text-brand-300">
                Edit Record Information
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isTransaction ? 'Transaction Title' : 'Counterpart Person Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {!isTransaction && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}
              </div>

              {/* Date & Time Side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Credit/Debt: Due Date */}
              {!isTransaction && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              {/* Transaction: Category & Payment Method */}
              {isTransaction && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional remarks or bill details..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingRecord(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            /* View Record Mode */
            <>
              {/* Main Hero Summary */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    {isTransaction
                      ? tx?.type === 'income'
                        ? 'Income Amount'
                        : 'Expense Amount'
                      : cd?.type === 'credit'
                      ? 'Money Lent (Credit)'
                      : 'Money Borrowed (Debt)'}
                  </span>
                  <p
                    className={`text-2xl md:text-3xl font-extrabold ${
                      isTransaction
                        ? tx?.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                        : cd?.type === 'credit'
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {formatRupees(isTransaction ? tx?.amount || 0 : cd?.originalAmount || 0)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {isTransaction && tx && <PaymentBadge method={tx.paymentMethod} />}
                  {!isTransaction && cd && <StatusBadge status={cd.status} />}
                </div>
              </div>

              {/* Details Fields */}
              <div className="space-y-3 text-sm">
                {/* Title / Counterpart */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {isTransaction ? 'Title' : 'Counterpart Person'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-right">
                      {isTransaction ? tx?.title : cd?.counterpartName}
                    </span>
                    {!isTransaction && cd?.counterpartPhone && (
                      <a
                        href={`tel:${cd.counterpartPhone}`}
                        className="p-1 text-slate-400 hover:text-brand-600 rounded"
                        title={`Call ${cd.counterpartPhone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Mobile Number for Credit/Debt */}
                {!isTransaction && cd?.counterpartPhone && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Phone Number</span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {cd.counterpartPhone}
                    </span>
                  </div>
                )}

                {/* Date & Time */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date & Time</span>
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                    <span>
                      {formatFullDate(
                        isTransaction
                          ? tx?.transactionDate || ''
                          : cd?.transactionDate || cd?.createdAt || ''
                      )}
                    </span>
                    {(isTransaction ? tx?.transactionTime : cd?.transactionTime) && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatTime(
                              isTransaction ? tx?.transactionTime : cd?.transactionTime
                            )}
                          </span>
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {/* Credit/Debt specific info */}
                {!isTransaction && cd && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 text-xs">
                        Settled Amount
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatRupees(cd.settledAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 text-xs">
                        Remaining Balance
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupees(cd.remainingAmount)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="py-1">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              (cd.settledAmount / Math.max(1, cd.originalAmount)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>{Math.round((cd.settledAmount / Math.max(1, cd.originalAmount)) * 100)}% Repaid</span>
                        <span>{formatRupees(cd.remainingAmount)} Left</span>
                      </div>
                    </div>

                    {cd.dueDate && (
                      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">Due Date</span>
                        <div className="text-right">
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-xs block">
                            {formatDate(cd.dueDate)}
                          </span>
                          {dueInfo && (
                            <span
                              className={`text-[11px] font-semibold ${
                                dueInfo.isOverdue
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {dueInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Remind Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          openReminderModal(cd);
                        }}
                        className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Send Reminder (WhatsApp / SMS)</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Notes / Description */}
                {(tx?.description || cd?.notes) && (
                  <div className="py-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs block mb-1">
                      Notes / Description
                    </span>
                    <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {tx?.description || cd?.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Repayments History (for Credit / Debt) */}
              {!isTransaction && cd && cd.repayments && cd.repayments.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Repayment History ({cd.repayments.length})
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {cd.repayments.map((rep, idx) => (
                      <div
                        key={rep.id || idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatRupees(rep.amount)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDate(rep.paymentDate)}{' '}
                            {rep.paymentTime ? `at ${formatTime(rep.paymentTime)}` : ''}
                          </span>
                        </div>

                        {rep.notes && (
                          <p className="text-slate-600 dark:text-slate-300 italic text-[11px]">
                            &quot;{rep.notes}&quot;
                          </p>
                        )}

                        {rep.attachments && rep.attachments.length > 0 && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              <span>{rep.attachments.length} receipt(s)</span>
                            </span>
                            {rep.attachments.map((att) => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => {
                                  if (att.fileType.startsWith('image/')) setActiveLightbox(att);
                                  else handleOpenPdf(att);
                                }}
                                className="text-[10px] text-brand-600 dark:text-brand-400 underline font-medium"
                              >
                                {att.fileName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Attachments & Receipts ({currentAttachments.length})
                    </h4>
                  </div>

                  {!isEditingAttachments && onUpdateAttachments && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAttachments(true)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add / Edit</span>
                    </button>
                  )}
                </div>

                {isEditingAttachments ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <AttachmentUploader
                      attachments={currentAttachments}
                      onChange={setCurrentAttachments}
                      onPreviewClick={(item) => setActiveLightbox(item)}
                    />
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentAttachments(record.attachments || []);
                          setIsEditingAttachments(false);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAttachments}
                        className="px-4 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                      >
                        Save Attachments
                      </button>
                    </div>
                  </div>
                ) : currentAttachments.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    No receipts or documents attached to this entry.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {currentAttachments.map((item) => {
                      const isImage = item.fileType.startsWith('image/');
                      const isPdf =
                        item.fileType.includes('pdf') ||
                        item.fileName.toLowerCase().endsWith('.pdf');

                      return (
                        <div
                          key={item.id}
                          className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 overflow-hidden flex flex-col justify-between hover:border-brand-400 dark:hover:border-brand-600 transition-all shadow-xs"
                        >
                          {/* Thumbnail */}
                          <div
                            className="cursor-pointer"
                            onClick={() => {
                              if (isImage) setActiveLightbox(item);
                              else handleOpenPdf(item);
                            }}
                          >
                            {isImage && item.dataUrl ? (
                              <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                                <img
                                  src={item.dataUrl}
                                  alt={item.fileName}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ) : isPdf ? (
                              <div className="h-28 w-full rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center justify-center p-2 text-center group-hover:bg-rose-100/50 transition-colors">
                                <FileText className="w-9 h-9 text-rose-500 mb-1" />
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                                  PDF Document
                                </span>
                              </div>
                            ) : (
                              <div className="h-28 w-full rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <FileText className="w-8 h-8 text-slate-400" />
                              </div>
                            )}

                            <div className="mt-2">
                              <p
                                className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                                title={item.fileName}
                              >
                                {item.fileName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatFileSize(item.fileSize)}
                              </p>
                            </div>
                          </div>

                          {/* Download / Open Action Buttons */}
                          <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                if (isImage) setActiveLightbox(item);
                                else handleOpenPdf(item);
                              }}
                              className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                              title="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {onDeleteRecord ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this record?')) {
                  onDeleteRecord(record.id);
                  onClose();
                }
              }}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Record</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Images */}
      {activeLightbox && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setActiveLightbox(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] flex flex-col items-center bg-slate-900 rounded-2xl p-2 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2 text-white text-xs border-b border-slate-800 mb-2">
              <span className="font-semibold truncate max-w-xs">{activeLightbox.fileName}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(activeLightbox)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLightbox(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {activeLightbox.dataUrl && (
              <img
                src={activeLightbox.dataUrl}
                alt={activeLightbox.fileName}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
