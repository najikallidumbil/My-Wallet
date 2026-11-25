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
    isDefault: true,
    subcategories: [
      { id: 'sub-1', name: 'Restaurants & Dining Out' },
      { id: 'sub-2', name: 'Food Delivery (Swiggy/Zomato)' },
      { id: 'sub-3', name: 'Cafes & Snacks' },
    ],
  },
  {
    id: 'cat-exp-2',
    name: 'Groceries & Mart',
    type: 'expense',
    icon: 'ShoppingCart',
    color: '#e11d48',
    isDefault: true,
    subcategories: [
      { id: 'sub-4', name: 'Supermarket Supplies' },
      { id: 'sub-5', name: 'Vegetables & Fruits' },
      { id: 'sub-6', name: 'Dairy & Bakery' },
    ],
  },
  {
    id: 'cat-exp-3',
    name: 'Rent & Housing',
    type: 'expense',
    icon: 'Building',
    color: '#be123c',
    isDefault: true,
    subcategories: [
      { id: 'sub-7', name: 'Apartment Rent' },
      { id: 'sub-8', name: 'Society Maintenance' },
    ],
  },
  {
    id: 'cat-exp-4',
    name: 'Bills & Utilities',
    type: 'expense',
    icon: 'Zap',
    color: '#9f1239',
    isDefault: true,
    subcategories: [
      { id: 'sub-9', name: 'Electricity Bill' },
      { id: 'sub-10', name: 'Fiber Wi-Fi Broadband' },
      { id: 'sub-11', name: 'Mobile Postpaid/Prepaid' },
    ],
  },
  {
    id: 'cat-exp-5',
    name: 'Fuel & Transportation',
    type: 'expense',
    icon: 'Car',
    color: '#fb7185',
    isDefault: true,
    subcategories: [
      { id: 'sub-12', name: 'Petrol & Diesel' },
      { id: 'sub-13', name: 'Ola / Uber Cabs' },
      { id: 'sub-14', name: 'Metro & Bus Smart Card' },
    ],
  },
  {
    id: 'cat-exp-6',
    name: 'Shopping & Electronics',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#ec4899',
    isDefault: true,
    subcategories: [
      { id: 'sub-15', name: 'Clothing & Apparel' },
      { id: 'sub-16', name: 'Gadgets & Accessories' },
    ],
  },
  {
    id: 'cat-exp-7',
    name: 'Healthcare & Medicine',
    type: 'expense',
    icon: 'HeartPulse',
    color: '#d946ef',
    isDefault: true,
    subcategories: [
      { id: 'sub-17', name: 'Pharmacy & Medicines' },
      { id: 'sub-18', name: 'Doctor Consultation & Lab' },
    ],
  },
  {
    id: 'cat-exp-8',
    name: 'Entertainment & OTT',
    type: 'expense',
    icon: 'Film',
    color: '#8b5cf6',
    isDefault: true,
    subcategories: [
      { id: 'sub-19', name: 'OTT Subscriptions (Netflix/Prime)' },
      { id: 'sub-20', name: 'Movie Tickets & Outings' },
    ],
  },
  {
    id: 'cat-exp-9',
    name: 'Education & Learning',
    type: 'expense',
    icon: 'GraduationCap',
    color: '#6366f1',
    isDefault: true,
  },
  {
    id: 'cat-exp-10',
    name: 'Miscellaneous',
    type: 'expense',
    icon: 'MoreHorizontal',
    color: '#64748b',
    isDefault: true,
  },
];

export const INITIAL_BUDGETS: Budget[] = [];

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
