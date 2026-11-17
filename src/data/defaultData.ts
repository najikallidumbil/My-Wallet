import { Category, Transaction, CreditDebtRecord } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-inc-1', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10b981', isDefault: true },
  { id: 'cat-inc-2', name: 'Freelance & Projects', type: 'income', icon: 'TrendingUp', color: '#059669', isDefault: true },
  { id: 'cat-inc-3', name: 'Investments & Dividends', type: 'income', icon: 'Coins', color: '#047857', isDefault: true },
  { id: 'cat-inc-4', name: 'Cashback & Rewards', type: 'income', icon: 'Gift', color: '#34d399', isDefault: true },
  { id: 'cat-inc-5', name: 'Other Income', type: 'income', icon: 'Wallet', color: '#6ee7b7', isDefault: true },

  // Expense
  { id: 'cat-exp-1', name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#f43f5e', isDefault: true },
  { id: 'cat-exp-2', name: 'Groceries & Mart', type: 'expense', icon: 'ShoppingCart', color: '#e11d48', isDefault: true },
  { id: 'cat-exp-3', name: 'Rent & Housing', type: 'expense', icon: 'Home', color: '#be123c', isDefault: true },
  { id: 'cat-exp-4', name: 'Bills & Utilities', type: 'expense', icon: 'Zap', color: '#9f1239', isDefault: true },
  { id: 'cat-exp-5', name: 'Fuel & Transportation', type: 'expense', icon: 'Car', color: '#fb7185', isDefault: true },
  { id: 'cat-exp-6', name: 'Shopping & Electronics', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', isDefault: true },
  { id: 'cat-exp-7', name: 'Healthcare & Medicine', type: 'expense', icon: 'HeartPulse', color: '#d946ef', isDefault: true },
  { id: 'cat-exp-8', name: 'Entertainment & OTT', type: 'expense', icon: 'Film', color: '#8b5cf6', isDefault: true },
  { id: 'cat-exp-9', name: 'Miscellaneous', type: 'expense', icon: 'MoreHorizontal', color: '#64748b', isDefault: true },
];

const today = new Date();
const formatDateOffset = (days: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    amount: 85000,
    type: 'income',
    categoryId: 'cat-inc-1',
    paymentMethod: 'bank_transfer',
    title: 'Monthly Tech Salary',
    description: 'Direct credit for senior engineering role',
    transactionDate: formatDateOffset(-2),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'tx-2',
    amount: 18500,
    type: 'income',
    categoryId: 'cat-inc-2',
    paymentMethod: 'upi',
    title: 'Client UI Design Milestone',
    description: 'Payment from client for dashboard Figma project',
    transactionDate: formatDateOffset(-4),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'tx-3',
    amount: 22000,
    type: 'expense',
    categoryId: 'cat-exp-3',
    paymentMethod: 'bank_transfer',
    title: 'Apartment Rent',
    description: 'Monthly rent for 2BHK flat',
    transactionDate: formatDateOffset(-5),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'tx-4',
    amount: 3450,
    type: 'expense',
    categoryId: 'cat-exp-2',
    paymentMethod: 'upi',
    title: 'Blinkit & Nature Basket Groceries',
    description: 'Weekly organic veggies, milk, fruits',
    transactionDate: formatDateOffset(-1),
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'tx-5',
    amount: 1820,
    type: 'expense',
    categoryId: 'cat-exp-1',
    paymentMethod: 'card',
    title: 'Dinner at Social Cafe',
    description: 'Team outing pizza and beverages',
    transactionDate: formatDateOffset(0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tx-6',
    amount: 2400,
    type: 'expense',
    categoryId: 'cat-exp-5',
    paymentMethod: 'upi',
    title: 'Petrol at Indian Oil',
    description: 'Full tank refill for car',
    transactionDate: formatDateOffset(-3),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'tx-7',
    amount: 1499,
    type: 'expense',
    categoryId: 'cat-exp-4',
    paymentMethod: 'upi',
    title: 'Airtel Broadband Fiber Bill',
    description: 'High-speed monthly home fiber plan',
    transactionDate: formatDateOffset(-6),
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

export const INITIAL_CREDIT_DEBT: CreditDebtRecord[] = [
  // Credit: Money others owe me
  {
    id: 'cd-1',
    type: 'credit',
    counterpartName: 'Rahul Sharma',
    counterpartPhone: '+91 98765 43210',
    counterpartEmail: 'rahul.s@example.com',
    originalAmount: 15000,
    settledAmount: 5000,
    remainingAmount: 10000,
    status: 'partial',
    dueDate: formatDateOffset(3), // Due in 3 days
    notes: 'Lent for flight tickets booking to Bengaluru',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cd-2',
    type: 'credit',
    counterpartName: 'Pooja Patel',
    counterpartPhone: '+91 91234 56789',
    counterpartEmail: 'pooja.p@example.com',
    originalAmount: 8500,
    settledAmount: 0,
    remainingAmount: 8500,
    status: 'overdue',
    dueDate: formatDateOffset(-2), // Overdue by 2 days
    notes: 'Emergency laptop service expense assistance',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'cd-3',
    type: 'credit',
    counterpartName: 'Amit Verma',
    counterpartPhone: '+91 99887 76655',
    originalAmount: 3200,
    settledAmount: 0,
    remainingAmount: 3200,
    status: 'pending',
    dueDate: formatDateOffset(12),
    notes: 'Goa resort group booking split',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },

  // Debt: Money I owe others
  {
    id: 'cd-4',
    type: 'debt',
    counterpartName: 'Vikram Singh',
    counterpartPhone: '+91 98112 23344',
    originalAmount: 4500,
    settledAmount: 0,
    remainingAmount: 4500,
    status: 'pending',
    dueDate: formatDateOffset(1), // Due tomorrow
    notes: 'Shared concert ticket passes paid upfront by Vikram',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'cd-5',
    type: 'debt',
    counterpartName: 'Kavita Reddy',
    counterpartPhone: '+91 94455 66778',
    originalAmount: 2500,
    settledAmount: 1000,
    remainingAmount: 1500,
    status: 'partial',
    dueDate: formatDateOffset(8),
    notes: 'Gift contribution for colleague farewell',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];
