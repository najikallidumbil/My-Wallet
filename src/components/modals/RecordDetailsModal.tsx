import React, { useState } from 'react';
import { Transaction, CreditDebtRecord, Attachment } from '../../types';
import { formatRupees } from '../../lib/currency';
import { formatDate, formatFullDate } from '../../lib/date';
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
  Paperclip,
  Trash2,
  Plus,
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
  const [activeLightbox, setActiveLightbox] = useState<Attachment | null>(null);
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);

  // Initialize attachments whenever modal opens with a record
  React.useEffect(() => {
    if (record) {
      setCurrentAttachments(record.attachments || []);
      setIsEditingAttachments(false);
      setActiveLightbox(null);
    }
  }, [record]);

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

  const handleDownload = (item: Attachment) => {
    if (!item.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.fileName;
    a.click();
  };

  const handleOpenPdf = (item: Attachment) => {
    if (!item.dataUrl) return;
    // Open in a new tab
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${item.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

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

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Main Hero Summary */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                {isTransaction
                  ? tx?.type === 'income' ? 'Income Amount' : 'Expense Amount'
                  : cd?.type === 'credit' ? 'Money Lent (Credit)' : 'Money Borrowed (Debt)'}
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
                {formatRupees(isTransaction ? (tx?.amount || 0) : (cd?.originalAmount || 0))}
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
            <div className="flex items-start justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {isTransaction ? 'Title' : 'Counterpart Person'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white text-right">
                {isTransaction ? tx?.title : cd?.counterpartName}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-start justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Date</span>
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatFullDate(isTransaction ? (tx?.transactionDate || '') : (cd?.createdAt || ''))}
              </span>
            </div>

            {/* Credit/Debt specific info */}
            {!isTransaction && cd && (
              <>
                <div className="flex items-start justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Settled Amount</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatRupees(cd.settledAmount)}
                  </span>
                </div>
                <div className="flex items-start justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Remaining Balance</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatRupees(cd.remainingAmount)}
                  </span>
                </div>
                {cd.dueDate && (
                  <div className="flex items-start justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Due Date</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(cd.dueDate)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Notes / Description */}
            {(tx?.description || cd?.notes) && (
              <div className="py-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs block mb-1">
                  Notes / Description
                </span>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
                  {tx?.description || cd?.notes}
                </p>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="pt-2">
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
                  const isPdf = item.fileType.includes('pdf') || item.fileName.toLowerCase().endsWith('.pdf');

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
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.fileName}>
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
