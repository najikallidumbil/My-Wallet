import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { CreditDebtView } from './views/CreditDebtView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { RecordDetailsModal } from './components/modals/RecordDetailsModal';

const AppContent: React.FC = () => {
  const {
    activeTab,
    selectedRecord,
    selectedRecordKind,
    closeRecordDetails,
    updateTransactionAttachments,
    updateCreditDebtAttachments,
    deleteTransaction,
    deleteCreditDebt,
  } = useWallet();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'credit-debt':
        return <CreditDebtView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppLayout>
      {renderActiveView()}
      <QuickAddModal />
      <RecordDetailsModal
        record={selectedRecord}
        recordKind={selectedRecordKind}
        isOpen={Boolean(selectedRecord)}
        onClose={closeRecordDetails}
        onUpdateAttachments={(id, atts) => {
          if (selectedRecordKind === 'transaction') {
            updateTransactionAttachments(id, atts);
          } else {
            updateCreditDebtAttachments(id, atts);
          }
        }}
        onDeleteRecord={(id) => {
          if (selectedRecordKind === 'transaction') {
            deleteTransaction(id);
          } else {
            deleteCreditDebt(id);
          }
        }}
      />
    </AppLayout>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </ThemeProvider>
  );
}

export default App;
