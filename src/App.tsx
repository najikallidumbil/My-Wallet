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

const AppContent: React.FC = () => {
  const { activeTab } = useWallet();

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
