import React, { useState, useEffect } from 'react';
import { CreditDebtRecord } from '../../types';
import {
  REMINDER_TEMPLATES,
  ReminderTemplateKey,
  createWhatsAppUrl,
  createSmsUrl,
} from '../../lib/reminders';
import { formatRupees } from '../../lib/currency';
import { formatDate } from '../../lib/date';
import { X, MessageSquare, Send, Phone, Info, Check } from 'lucide-react';

interface SendReminderModalProps {
  record: CreditDebtRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SendReminderModal: React.FC<SendReminderModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplateKey>('gentle');
  const [phone, setPhone] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (record) {
      setPhone(record.counterpartPhone || '');

      // Default template selection based on record status
      let defaultKey: ReminderTemplateKey = 'gentle';
      if (record.status === 'overdue') {
        defaultKey = 'overdue';
      } else if (record.dueDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (record.dueDate === todayStr) {
          defaultKey = 'due_today';
        }
      }
      setSelectedTemplate(defaultKey);

      const templateFn = REMINDER_TEMPLATES[defaultKey].text;
      setCustomMessage(
        templateFn({
          name: record.counterpartName,
          phone: record.counterpartPhone,
          amount: record.remainingAmount,
          dueDate: record.dueDate,
          type: record.type,
        })
      );
    }
  }, [record, isOpen]);

  const handleTemplateChange = (key: ReminderTemplateKey) => {
    setSelectedTemplate(key);
    if (!record) return;

    const templateFn = REMINDER_TEMPLATES[key].text;
    setCustomMessage(
      templateFn({
        name: record.counterpartName,
        phone,
        amount: record.remainingAmount,
        dueDate: record.dueDate,
        type: record.type,
      })
    );
  };

  if (!isOpen || !record) return null;

  const handleOpenWhatsApp = () => {
    const url = createWhatsAppUrl(phone, customMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenSms = () => {
    const url = createSmsUrl(phone, customMessage);
    window.location.href = url;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Send Khata Reminder
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send a payment reminder via WhatsApp or SMS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Recipient summary card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Recipient
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {record.counterpartName}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                Pending Balance
              </span>
              <p className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400">
                {formatRupees(record.remainingAmount)}
              </p>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Recipient Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {!phone && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Enter a valid phone number to open direct WhatsApp chat or SMS.
              </p>
            )}
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Choose Message Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(Object.keys(REMINDER_TEMPLATES) as ReminderTemplateKey[])
                .filter((k) => k !== 'custom')
                .map((key) => {
                  const t = REMINDER_TEMPLATES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTemplateChange(key)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        selectedTemplate === key
                          ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-800 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Customizable Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Message Content (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : null}
                <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                setSelectedTemplate('custom');
              }}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-sans"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>{customMessage.length} characters</span>
              {record.dueDate && (
                <span>Due Date: {formatDate(record.dueDate)}</span>
              )}
            </div>
          </div>

          {/* User Confirmation Disclosure */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <p className="leading-snug">
              Clicking either button opens WhatsApp or your phone SMS application with this prefilled message so you can review before sending.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* SMS Button */}
            <button
              type="button"
              onClick={handleOpenSms}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Send className="w-3.5 h-3.5 text-slate-500" />
              <span>Send SMS</span>
            </button>

            {/* WhatsApp Button */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
