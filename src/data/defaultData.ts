import {
  Category,
  Transaction,
  CreditDebtRecord,
  Account,
  Person,
  RecurringTransaction,
  Budget,
} from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-inc-1', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10b981', isDefault: true },
  { id: 'cat-inc-2', name: 'Freelance & Projects', type: 'income', icon: 'TrendingUp', color: '#059669', isDefault: true },
  { id: 'cat-inc-3', name: 'Investments & Dividends', type: 'income', icon: 'Coins', color: '#047857', isDefault: true },
  { id: 'cat-inc-4', name: 'Cashback & Rewards', type: 'income', icon: 'Gift', color: '#34d399', isDefault: true },
  { id: 'cat-inc-5', name: 'Rental Income', type: 'income', icon: 'Home', color: '#2dd4bf', isDefault: true },
  { id: 'cat-inc-6', name: 'Other Income', type: 'income', icon: 'Wallet', color: '#6ee7b7', isDefault: true },

  // Expense
  {
    id: 'cat-exp-1',
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    color: '#f43f5e',
    budget: 8000,
    isDefault: true,
    subcategories: [
      { id: 'sub-1', name: 'Restaurants & Dining Out', budget: 4000 },
      { id: 'sub-2', name: 'Food Delivery (Swiggy/Zomato)', budget: 2500 },
      { id: 'sub-3', name: 'Cafes & Snacks', budget: 1500 },
    ],
  },
  {
    id: 'cat-exp-2',
    name: 'Groceries & Mart',
    type: 'expense',
    icon: 'ShoppingCart',
    color: '#e11d48',
    budget: 10000,
    isDefault: true,
    subcategories: [
      { id: 'sub-4', name: 'Supermarket Supplies', budget: 5000 },
      { id: 'sub-5', name: 'Vegetables & Fruits', budget: 3000 },
      { id: 'sub-6', name: 'Dairy & Bakery', budget: 2000 },
    ],
  },
  {
    id: 'cat-exp-3',
    name: 'Rent & Housing',
    type: 'expense',
    icon: 'Building',
    color: '#be123c',
    budget: 20000,
    isDefault: true,
    subcategories: [
      { id: 'sub-7', name: 'Apartment Rent', budget: 18000 },
      { id: 'sub-8', name: 'Society Maintenance', budget: 2000 },
    ],
  },
  {
    id: 'cat-exp-4',
    name: 'Bills & Utilities',
    type: 'expense',
    icon: 'Zap',
    color: '#9f1239',
    budget: 5000,
    isDefault: true,
    subcategories: [
      { id: 'sub-9', name: 'Electricity Bill', budget: 2500 },
      { id: 'sub-10', name: 'Fiber Wi-Fi Broadband', budget: 1500 },
      { id: 'sub-11', name: 'Mobile Postpaid/Prepaid', budget: 1000 },
    ],
  },
  {
    id: 'cat-exp-5',
    name: 'Fuel & Transportation',
    type: 'expense',
    icon: 'Car',
    color: '#fb7185',
    budget: 4000,
    isDefault: true,
    subcategories: [
      { id: 'sub-12', name: 'Petrol & Diesel', budget: 2500 },
      { id: 'sub-13', name: 'Ola / Uber Cabs', budget: 1000 },
      { id: 'sub-14', name: 'Metro & Bus Smart Card', budget: 500 },
    ],
  },
  {
    id: 'cat-exp-6',
    name: 'Shopping & Electronics',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#ec4899',
    budget: 6000,
    isDefault: true,
    subcategories: [
      { id: 'sub-15', name: 'Clothing & Apparel', budget: 4000 },
      { id: 'sub-16', name: 'Gadgets & Accessories', budget: 2000 },
    ],
  },
  {
    id: 'cat-exp-7',
    name: 'Healthcare & Medicine',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#d946ef',
    budget: 3000,
    isDefault: true,
    subcategories: [
      { id: 'sub-17', name: 'Pharmacy & Medicines', budget: 1500 },
      { id: 'sub-18', name: 'Doctor Consultation & Lab', budget: 1500 },
    ],
  },
  {
    id: 'cat-exp-8',
    name: 'Entertainment & OTT',
    type: 'expense',
    icon: 'Film',
    color: '#8b5cf6',
    budget: 2000,
    isDefault: true,
    subcategories: [
      { id: 'sub-19', name: 'OTT Subscriptions (Netflix/Prime)', budget: 1000 },
      { id: 'sub-20', name: 'Movie Tickets & Outings', budget: 1000 },
    ],
  },
  {
    id: 'cat-exp-9',
    name: 'Education & Learning',
    type: 'expense',
    icon: 'GraduationCap',
    color: '#6366f1',
    budget: 2000,
    isDefault: true,
  },
  {
    id: 'cat-exp-10',
    name: 'Miscellaneous',
    type: 'expense',
    icon: 'MoreHorizontal',
    color: '#64748b',
    budget: 2000,
    isDefault: true,
  },
];

const currentMonth = new Date().toISOString().slice(0, 7);

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: `budget-${currentMonth}`,
    month: currentMonth,
    totalBudget: 62000,
    categoryBudgets: {
      'cat-exp-1': 8000,
      'cat-exp-2': 10000,
      'cat-exp-3': 20000,
      'cat-exp-4': 5000,
      'cat-exp-5': 4000,
      'cat-exp-6': 6000,
      'cat-exp-7': 3000,
      'cat-exp-8': 2000,
      'cat-exp-9': 2000,
      'cat-exp-10': 2000,
    },
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'Cash in Hand',
    type: 'cash',
    openingBalance: 0,
    currentBalance: 0,
    color: '#10b981',
    icon: 'Banknote',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-bank',
    name: 'Primary Bank Account',
    type: 'bank',
    openingBalance: 0,
    currentBalance: 0,
    color: '#3b82f6',
    icon: 'Building2',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-upi',
    name: 'UPI Wallet',
    type: 'upi',
    openingBalance: 0,
    currentBalance: 0,
    color: '#6366f1',
    icon: 'Smartphone',
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_PEOPLE: Person[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_CREDIT_DEBT: CreditDebtRecord[] = [];

export const INITIAL_RECURRING: RecurringTransaction[] = [];
