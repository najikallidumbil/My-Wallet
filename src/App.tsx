import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider, useWallet } from './context/WalletContext';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppLockScreen } from './components/security/AppLockScreen';
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
import { DesktopSidebar } from './components/rn/DesktopSidebar';
import { MobileBottomNav } from './components/rn/MobileBottomNav';
import { useResponsive } from './lib/useResponsive';
import { Transaction, PersonSummary } from './types';

const MainScreen: React.FC = () => {
  const {
    isHydrated,
    currentMode,
    setCurrentMode,
    reminderModalRecord,
    closeReminderModal,
    khataSummary,
    personSummaries,
  } = useWallet();

  const { isMobile, isTablet, isDesktop } = useResponsive();
  const isWide = isTablet || isDesktop;

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<'income' | 'expense' | 'credit' | 'debt'>('expense');
  const [quickAddPersonName, setQuickAddPersonName] = useState('');
  const [quickAddPersonPhone, setQuickAddPersonPhone] = useState('');
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const [isKhataSettleOpen, setIsKhataSettleOpen] = useState(false);
  const [khataSettleMode, setKhataSettleMode] = useState<'receive' | 'repay'>('receive');
  const [khataSettlePersonId, setKhataSettlePersonId] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  // Details state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);

  // Fast hydration fallback to guarantee instant startup without blocking the UI
  const [hydrationTimeout, setHydrationTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHydrationTimeout(true), 600);
    return () => clearTimeout(timer);
  }, []);

  if (!isHydrated && !hydrationTimeout) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.loadingText}>Opening MY WALLET...</Text>
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

  const handleFabPress = () => {
    if (currentMode === 'income_expense') {
      handleOpenQuickAdd('expense');
    } else if (currentMode === 'khata_book') {
      handleOpenQuickAdd('credit');
    } else {
      setIsTypeSelectorOpen(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
        {/* Desktop / Tablet Sidebar Navigation */}
        {isWide && (
          <DesktopSidebar
            currentMode={currentMode}
            onSelectMode={(mode) => setCurrentMode(mode)}
            onOpenQuickAdd={() => setIsTypeSelectorOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Content Pane */}
        <View style={styles.rightPane}>
          {/* Top Header */}
          <Header
            currentMode={currentMode}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* 3-Mode Primary Switcher (Rendered on Mobile, or as top breadcrumb on Desktop) */}
          <ModeSwitcher
            currentMode={currentMode}
            onSelectMode={(mode) => setCurrentMode(mode)}
          />

          {/* Main View for Active Mode: Keep tabs alive with display: none for instant 0ms switching */}
          <View style={styles.content}>
            <View style={[styles.screenTab, currentMode === 'income_expense' ? styles.screenTabActive : styles.screenTabInactive]}>
              <FinanceScreen
                onAddIncome={() => handleOpenQuickAdd('income')}
                onAddExpense={() => handleOpenQuickAdd('expense')}
                onSelectTransaction={(tx) => setSelectedTx(tx)}
              />
            </View>

            <View style={[styles.screenTab, currentMode === 'khata_book' ? styles.screenTabActive : styles.screenTabInactive]}>
              <KhataScreen
                onLendMoney={() => handleOpenQuickAdd('credit')}
                onReceiveMoney={() => {
                  setKhataSettleMode('receive');
                  setKhataSettlePersonId(undefined);
                  setIsKhataSettleOpen(true);
                }}
                onBorrowMoney={() => handleOpenQuickAdd('debt')}
                onRepayMoney={() => {
                  setKhataSettleMode('repay');
                  setKhataSettlePersonId(undefined);
                  setIsKhataSettleOpen(true);
                }}
                onAddPerson={() => setIsAddPersonOpen(true)}
                onSelectPerson={(p) => setSelectedPerson(p)}
              />
            </View>

            <View style={[styles.screenTab, currentMode === 'financial_overview' ? styles.screenTabActive : styles.screenTabInactive]}>
              <OverviewScreen
                onOpenTransfer={() => setIsTransferOpen(true)}
                onAddAccount={() => setIsAddAccountOpen(true)}
              />
            </View>
          </View>

          {/* Mobile Bottom Navigation (Only on mobile width < 768px) */}
          {isMobile && (
            <MobileBottomNav
              currentMode={currentMode}
              onSelectMode={(mode) => setCurrentMode(mode)}
              onOpenQuickAdd={handleFabPress}
              onOpenSettings={() => setIsSettingsOpen(true)}
              overdueCount={khataSummary.overdueCount}
            />
          )}
        </View>
      </View>

      {/* Floating Action Button (Tablet/Desktop or fallback) */}
      {!isMobile && (
        <FloatingAddButton onPress={handleFabPress} />
      )}

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
        initialPersonId={khataSettlePersonId}
        onClose={() => {
          setIsKhataSettleOpen(false);
          setKhataSettlePersonId(undefined);
        }}
      />

      {reminderModalRecord && (
        <ReminderModal
          visible={!!reminderModalRecord}
          record={reminderModalRecord}
          onClose={closeReminderModal}
        />
      )}

      {selectedPerson && (
        <PersonLedgerModal
          visible={!!selectedPerson}
          personSummary={
            personSummaries.find((p) => p.id === selectedPerson.id) || selectedPerson
          }
          onClose={() => setSelectedPerson(null)}
          onOpenQuickAdd={(mode, name, phone) =>
            handleOpenQuickAdd(
              mode,
              name || selectedPerson?.name || '',
              phone || selectedPerson?.phone || ''
            )
          }
          onOpenSettleModal={(mode, personId) => {
            setKhataSettleMode(mode);
            setKhataSettlePersonId(personId || selectedPerson?.id);
            setIsKhataSettleOpen(true);
          }}
        />
      )}

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

      {selectedTx && (
        <TransactionDetailsModal
          visible={!!selectedTx}
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </SafeAreaView>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user, isLoading, isGuestMode } = useAuth();
  const { isLocked, isInitialized } = useSecurity();

  // Maximum startup grace timer: never display a loading screen longer than 800ms
  const [maxLoadingElapsed, setMaxLoadingElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMaxLoadingElapsed(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const showLoader = (isLoading || !isInitialized) && !maxLoadingElapsed;

  if (showLoader) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.loadingText}>Opening MY WALLET...</Text>
      </View>
    );
  }

  if (!user && !isGuestMode) {
    return <AuthScreen />;
  }

  return (
    <WalletProvider>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={isLocked ? 'none' : 'auto'}>
          <MainScreen />
        </View>
        {isLocked && <AppLockScreen />}
      </View>
    </WalletProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SecurityProvider>
          <AuthenticatedApp />
        </SecurityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  mainLayoutWide: {
    flexDirection: 'row',
  },
  rightPane: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  screenTab: {
    flex: 1,
  },
  screenTabActive: {
    display: 'flex',
  },
  screenTabInactive: {
    display: 'none',
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
