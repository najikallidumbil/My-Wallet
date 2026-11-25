import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { formatRupees } from '../lib/currency';
import {
  Database,
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Bell,
  Sparkles,
  Wallet,
  Check,
} from 'lucide-react';
import { ClearDataOtpModal } from '../components/rn/ClearDataOtpModal';

export const SettingsView: React.FC = () => {
  const {
    isSupabaseMode,
    resetToDefaults,
    transactions,
    creditDebtRecords,
    accounts,
    categories,
    people,
    recurringTransactions,
    accountTransfers,
    openingBalance,
    setOpeningBalance,
    reminderPreferences,
    setReminderPreferences,
  } = useWallet();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [resetMessage, setResetMessage] = useState(false);
  const [isClearDataOtpModalOpen, setIsClearDataOtpModalOpen] = useState(false);
  const [notificationTestMessage, setNotificationTestMessage] = useState<string | null>(null);

  // Opening balance editor state
  const [editingOpening, setEditingOpening] = useState(false);
  const [tempOpening, setTempOpening] = useState(openingBalance.toString());

  const handleSaveOpening = () => {
    const parsed = parseFloat(tempOpening);
    if (!isNaN(parsed) && parsed >= 0) {
      setOpeningBalance(parsed);
      setEditingOpening(false);
    }
  };

  const handleTestNotification = async () => {
    if (!('Notification' in window)) {
      setNotificationTestMessage('Browser notifications are not supported on this device/browser.');
      setTimeout(() => setNotificationTestMessage(null), 4000);
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification('Personal Wallet Tracker', {
          body: 'Reminder: ₹5,000 credit collection from Rahul Sharma is due today!',
          icon: '/favicon.ico',
        });
        setNotificationTestMessage('Test notification sent successfully!');
      } catch (e) {
        setNotificationTestMessage('Notification displayed (or simulated).');
      }
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Personal Wallet Tracker', {
          body: 'Test notification: Wallet reminders are now enabled!',
          icon: '/favicon.ico',
        });
        setReminderPreferences((prev) => ({ ...prev, browserNotifications: true }));
        setNotificationTestMessage('Notifications permitted and test notification sent!');
      } else {
        setNotificationTestMessage('Notification permission was not granted.');
      }
    }
    setTimeout(() => setNotificationTestMessage(null), 4000);
  };

  const handleExportData = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      currency: 'INR',
      openingBalance,
      accounts,
      accountTransfers,
      categories,
      people,
      recurringTransactions,
      transactions,
      creditDebtRecords,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_wallet_backup_v3_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions && Array.isArray(json.transactions)) {
          localStorage.setItem('my_wallet_transactions_v3', JSON.stringify(json.transactions));
        }
        if (json.creditDebtRecords && Array.isArray(json.creditDebtRecords)) {
          localStorage.setItem('my_wallet_credit_debt_v3', JSON.stringify(json.creditDebtRecords));
        }
        if (json.accounts && Array.isArray(json.accounts)) {
          localStorage.setItem('my_wallet_accounts_v3', JSON.stringify(json.accounts));
        }
        if (json.categories && Array.isArray(json.categories)) {
          localStorage.setItem('my_wallet_categories_v3', JSON.stringify(json.categories));
        }
        if (json.people && Array.isArray(json.people)) {
          localStorage.setItem('my_wallet_people_v3', JSON.stringify(json.people));
        }
        if (json.recurringTransactions && Array.isArray(json.recurringTransactions)) {
          localStorage.setItem('my_wallet_recurring_v3', JSON.stringify(json.recurringTransactions));
        }
        if (json.openingBalance !== undefined) {
          localStorage.setItem('my_wallet_opening_balance_v3', json.openingBalance.toString());
        }

        alert('Backup data successfully restored! Reloading application...');
        window.location.reload();
      } catch (err) {
        alert('Failed to parse backup file. Please ensure it is a valid My Wallet JSON export.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setIsClearDataOtpModalOpen(true);
  };

  const handleConfirmedClearAllData = async () => {
    await resetToDefaults();
    setResetMessage(true);
    setTimeout(() => setResetMessage(false), 3000);
  };

  const copyEnvSnippet = () => {
    const snippet = `VITE_SUPABASE_URL=https://your-project-id.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-public-key`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Settings & Configuration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Preferences, Opening Balance, Supabase integration, data backup, and security
        </p>
      </div>

      {/* Opening Balance Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Opening Cash Balance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Baseline starting cash used in Mode 1 & Mode 3 Available Cash calculation
              </p>
            </div>
          </div>

          <span className="text-lg font-black text-slate-900 dark:text-white">
            {formatRupees(openingBalance)}
          </span>
        </div>

        {editingOpening ? (
          <div className="flex items-center gap-2 pt-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={tempOpening}
              onChange={(e) => setTempOpening(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
            />
            <button
              onClick={handleSaveOpening}
              className="px-3.5 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              onClick={() => {
                setTempOpening(openingBalance.toString());
                setEditingOpening(false);
              }}
              className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setEditingOpening(true)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Edit Opening Balance
            </button>
          </div>
        )}
      </div>

      {/* Supabase Connection Status Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isSupabaseMode
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Supabase Backend Integration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSupabaseMode
                  ? 'Connected to live Supabase PostgreSQL database'
                  : 'Currently operating in Local Storage mode (Ready for Supabase cloud sync)'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isSupabaseMode
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {isSupabaseMode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{isSupabaseMode ? 'Online' : 'Local Ready'}</span>
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3 text-xs">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            The project includes complete Supabase PostgreSQL schema with Row Level Security (RLS) policies at{' '}
            <code className="text-brand-600 dark:text-brand-400 font-mono font-bold">
              supabase/schema.sql
            </code>.
          </p>

          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
            <span className="text-slate-600 dark:text-slate-300 truncate">
              VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in .env
            </span>
            <button
              onClick={copyEnvSnippet}
              className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ml-2 shrink-0"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy Template'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Due Date Reminders & Notification Preferences */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Due Date Reminders & Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure advance warnings, due date alerts, and WhatsApp message templates
              </p>
            </div>
          </div>
        </div>

        {notificationTestMessage && (
          <div className="p-3 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs rounded-xl border border-brand-200 dark:border-brand-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{notificationTestMessage}</span>
          </div>
        )}

        <div className="space-y-3 pt-1">
          {/* Remind On Due Date Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Remind on Due Date
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Highlight khata records and send alerts on the exact due date
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reminderPreferences.remindOnDueDate}
                onChange={(e) =>
                  setReminderPreferences((prev) => ({
                    ...prev,
                    remindOnDueDate: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* Advance Reminder Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Advance Reminder Notice
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trigger dashboard warnings before payments become due
              </p>
            </div>
            <select
              value={reminderPreferences.remindDaysBefore}
              onChange={(e) =>
                setReminderPreferences((prev) => ({
                  ...prev,
                  remindDaysBefore: parseInt(e.target.value, 10),
                }))
              }
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={1}>1 Day Before</option>
              <option value={2}>2 Days Before</option>
              <option value={3}>3 Days Before</option>
              <option value={7}>7 Days Before (1 Week)</option>
            </select>
          </div>

          {/* Browser Desktop Notifications & Test */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Web Notifications
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Receive browser alert notifications for pending and overdue repayments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestNotification}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Test Notification</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Preferences */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Appearance & Theme
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select your preferred visual style or sync with your system theme
        </p>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
              theme === 'light'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
              theme === 'dark'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-xs">Dark</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
              theme === 'system'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Laptop className="w-5 h-5 text-slate-400" />
            <span className="text-xs">System</span>
          </button>
        </div>
      </div>

      {/* Currency Settings */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Primary Currency
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          All balances and amounts are rendered with standard Indian numbering formatting (Lakhs & Crores)
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold text-sm flex items-center justify-center">
              ₹
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Indian Rupee (INR)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Default system currency
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        </div>
      </div>

      {/* Data Management, Complete Backup & Restore */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Data Backup, Import & Reset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export a complete JSON vault of your transactions, khata records, accounts, and categories
          </p>
        </div>

        {resetMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800">
            All transactions and records have been cleared.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="px-4 py-2.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-xl text-xs font-semibold border border-brand-200 dark:border-brand-800 flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Full JSON Vault</span>
          </button>

          <label className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Restore From File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>

          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      <ClearDataOtpModal
        visible={isClearDataOtpModalOpen}
        onClose={() => setIsClearDataOtpModalOpen(false)}
        onConfirmDelete={handleConfirmedClearAllData}
      />
    </div>
  );
};
