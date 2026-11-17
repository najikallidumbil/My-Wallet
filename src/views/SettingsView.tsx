import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import {
  Database,
  Moon,
  Sun,
  Laptop,
  Download,
  RotateCcw,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { isSupabaseMode, resetToDefaults, transactions, creditDebtRecords } = useWallet();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [resetMessage, setResetMessage] = useState(false);

  const handleExportData = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      currency: 'INR',
      transactions,
      creditDebtRecords,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_wallet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm('Reset all transaction and khata data to default seed data?')) {
      resetToDefaults();
      setResetMessage(true);
      setTimeout(() => setResetMessage(false), 3000);
    }
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
          Preferences, Supabase backend integration, data backup, and security
        </p>
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
                  : 'Currently operating in Local Storage mode (Ready for Supabase Phase 2)'}
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
            <span>{isSupabaseMode ? 'Online' : 'Phase 1 Local Ready'}</span>
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

      {/* Data Management & Backup */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Data Backup & Restore
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export a standalone offline JSON file of all your transactions and khata records
          </p>
        </div>

        {resetMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800">
            Demo data successfully restored.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={handleExportData}
            className="px-4 py-2.5 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 rounded-xl text-xs font-semibold border border-brand-200 dark:border-brand-800 flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Security Roadmap Preview */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Security & Privacy (Phase 5)
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          PIN code protection, biometric Face/Fingerprint unlock via WebAuthn, and automatic screen privacy blur are planned in Phase 5.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                4-Digit Security PIN
              </p>
              <p className="text-[10px] text-slate-400">Configurable in Phase 5</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
            <Shield className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Biometric Face / Touch Unlock
              </p>
              <p className="text-[10px] text-slate-400">WebAuthn API integration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
