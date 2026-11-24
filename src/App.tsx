import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { colors } from './theme/colors';
import { Header } from './components/rn/Header';
import { ModeSwitcher } from './components/rn/ModeSwitcher';
import { FloatingAddButton } from './components/rn/FloatingAddButton';
import { FinanceScreen } from './views/rn/FinanceScreen';
import { KhataScreen } from './views/rn/KhataScreen';
import { OverviewScreen } from './views/rn/OverviewScreen';
import { QuickAddModal } from './components/rn/QuickAddModal';
import { TypeSelectorModal } from './components/rn/TypeSelectorModal';
import { KhataSettleModal } from './components/rn/KhataSettleModal';
import { ReminderModal } from './components/rn/ReminderModal';
import { PersonLedgerModal } from './components/rn/PersonLedgerModal';
import { TransferModal } from './components/rn/TransferModal';
import { AddAccountModal } from './components/rn/AddAccountModal';
import { SettingsModal } from './components/rn/SettingsModal';
import { TransactionDetailsModal } from './components/rn/TransactionDetailsModal';
import { AddPersonModal } from './components/rn/AddPersonModal';
import { Transaction, PersonSummary } from './types';

const MainScreen: React.FC = () => {
  const {
    isHydrated,
    currentMode,
    setCurrentMode,
    reminderModalRecord,
    closeReminderModal,
  } = useWallet();

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<'income' | 'expense' | 'credit' | 'debt'>('expense');
  const [quickAddPersonName, setQuickAddPersonName] = useState('');
  const [quickAddPersonPhone, setQuickAddPersonPhone] = useState('');
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const [isKhataSettleOpen, setIsKhataSettleOpen] = useState(false);
  const [khataSettleMode, setKhataSettleMode] = useState<'receive' | 'repay'>('receive');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  // Details state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);

  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.loadingText}>Opening your secure wallet...</Text>
      </View>
    );
  }

  const handleOpenQuickAdd = (
    mode: 'income' | 'expense' | 'credit' | 'debt',
    personName: string = '',
    personPhone: string = ''
  ) => {
    setQuickAddMode(mode);
    setQuickAddPersonName(personName);
    setQuickAddPersonPhone(personPhone);
    setIsQuickAddOpen(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 3-Mode Primary Switcher */}
      <ModeSwitcher
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
      />

      {/* Main View for Active Mode */}
      <View style={styles.content}>
        {currentMode === 'income_expense' && (
          <FinanceScreen
            onAddIncome={() => handleOpenQuickAdd('income')}
            onAddExpense={() => handleOpenQuickAdd('expense')}
            onSelectTransaction={(tx) => setSelectedTx(tx)}
          />
        )}

        {currentMode === 'khata_book' && (
          <KhataScreen
            onLendMoney={() => handleOpenQuickAdd('credit')}
            onReceiveMoney={() => {
              setKhataSettleMode('receive');
              setIsKhataSettleOpen(true);
            }}
            onBorrowMoney={() => handleOpenQuickAdd('debt')}
            onRepayMoney={() => {
              setKhataSettleMode('repay');
              setIsKhataSettleOpen(true);
            }}
            onAddPerson={() => setIsAddPersonOpen(true)}
            onSelectPerson={(p) => setSelectedPerson(p)}
          />
        )}

        {currentMode === 'financial_overview' && (
          <OverviewScreen
            onOpenTransfer={() => setIsTransferOpen(true)}
            onAddAccount={() => setIsAddAccountOpen(true)}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <FloatingAddButton
        onPress={() => {
          if (currentMode === 'income_expense') {
            handleOpenQuickAdd('expense');
          } else if (currentMode === 'khata_book') {
            handleOpenQuickAdd('credit');
          } else {
            // In Combined Overview: open explicit 4-type selector modal
            setIsTypeSelectorOpen(true);
          }
        }}
      />

      {/* Modals */}
      <QuickAddModal
        visible={isQuickAddOpen}
        initialMode={quickAddMode}
        initialPersonName={quickAddPersonName}
        initialPersonPhone={quickAddPersonPhone}
        onClose={() => {
          setIsQuickAddOpen(false);
          setQuickAddPersonName('');
          setQuickAddPersonPhone('');
        }}
      />

      <TypeSelectorModal
        visible={isTypeSelectorOpen}
        onClose={() => setIsTypeSelectorOpen(false)}
        onSelectType={(type) => handleOpenQuickAdd(type)}
      />

      <KhataSettleModal
        visible={isKhataSettleOpen}
        mode={khataSettleMode}
        onClose={() => setIsKhataSettleOpen(false)}
      />

      <ReminderModal
        visible={!!reminderModalRecord}
        record={reminderModalRecord}
        onClose={closeReminderModal}
      />

      <PersonLedgerModal
        visible={!!selectedPerson}
        personSummary={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onOpenQuickAdd={(mode) =>
          handleOpenQuickAdd(
            mode,
            selectedPerson?.name || '',
            selectedPerson?.phone || ''
          )
        }
      />

      <TransferModal
        visible={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
      />

      <AddAccountModal
        visible={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
      />

      <AddPersonModal
        visible={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
      />

      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <TransactionDetailsModal
        visible={!!selectedTx}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </SafeAreaView>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user, isLoading, isGuestMode } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.loadingText}>Verifying secure session...</Text>
      </View>
    );
  }

  if (!user && !isGuestMode) {
    return <AuthScreen />;
  }

  return (
    <WalletProvider>
      <MainScreen />
    </WalletProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.slate[500],
    fontWeight: '600',
  },
});
