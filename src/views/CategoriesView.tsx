import React, { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { Category, TransactionType, SubCategory } from '../types';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { formatRupees } from '../lib/currency';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

const AVAILABLE_ICONS = [
  'Briefcase',
  'TrendingUp',
  'Coins',
  'Gift',
  'Home',
  'Wallet',
  'Utensils',
  'ShoppingCart',
  'Building',
  'Zap',
  'Car',
  'ShoppingBag',
  'HeartPulse',
  'Film',
  'GraduationCap',
  'Plane',
  'Coffee',
  'Dumbbell',
  'Fuel',
  'MoreHorizontal',
];

const AVAILABLE_COLORS = [
  '#10b981', // emerald
  '#059669', // green
  '#047857', // dark green
  '#34d399', // mint
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#e11d48', // red
  '#f59e0b', // amber
  '#fb923c', // orange
  '#64748b', // slate
];

export const CategoriesView: React.FC = () => {
  const {
    categories,
    transactions,
    budgets,
    addCategory,
    updateCategory,
    deleteCategory,
    setSelectedCategoryId,
  } = useWallet();

  const [activeTypeTab, setActiveTypeTab] = useState<TransactionType>('expense');
  const [search, setSearch] = useState('');

  // Category Modal state (Add / Edit)
  const [modalCategory, setModalCategory] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catColor, setCatColor] = useState('#6366f1');
  const [catBudget, setCatBudget] = useState('');
  const [catSubcategories, setCatSubcategories] = useState<SubCategory[]>([]);
  const [newSubName, setNewSubName] = useState('');

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Compute category-wise spending and transaction counts for current month
  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    const spentMap = new Map<string, number>();

    transactions.forEach((tx) => {
      counts.set(tx.categoryId, (counts.get(tx.categoryId) || 0) + 1);
      if (tx.transactionDate.startsWith(currentMonth)) {
        spentMap.set(tx.categoryId, (spentMap.get(tx.categoryId) || 0) + tx.amount);
      }
    });

    return { counts, spentMap };
  }, [transactions, currentMonth]);

  // Active budget lookup
  const activeBudget = useMemo(() => {
    return budgets.find((b) => b.month === currentMonth);
  }, [budgets, currentMonth]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => c.type === activeTypeTab)
      .filter((c) => (search.trim() ? c.name.toLowerCase().includes(search.toLowerCase()) : true))
      .map((c) => {
        const spent = categoryStats.spentMap.get(c.id) || 0;
        const budget = activeBudget?.categoryBudgets?.[c.id] ?? (c.budget || 0);
        return {
          ...c,
          txCount: categoryStats.counts.get(c.id) || 0,
          spent,
          budget,
          remaining: Math.max(0, budget - spent),
          percentage: budget > 0 ? (spent / budget) * 100 : 0,
        };
      })
      .sort((a, b) => b.txCount - a.txCount);
  }, [categories, activeTypeTab, search, categoryStats, activeBudget]);

  const handleOpenAdd = () => {
    setModalCategory(null);
    setCatName('');
    setCatType(activeTypeTab);
    setCatIcon('ShoppingBag');
    setCatColor(activeTypeTab === 'income' ? '#10b981' : '#f43f5e');
    setCatBudget('');
    setCatSubcategories([]);
    setNewSubName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setModalCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setCatBudget(cat.budget ? String(cat.budget) : '');
    setCatSubcategories(cat.subcategories || []);
    setNewSubName('');
    setIsModalOpen(true);
  };

  const handleAddSubcatToModal = () => {
    if (!newSubName.trim()) return;
    setCatSubcategories((prev) => [
      ...prev,
      { id: `sub-${Date.now()}`, name: newSubName.trim() },
    ]);
    setNewSubName('');
  };

  const handleRemoveSubcatFromModal = (id: string) => {
    setCatSubcategories((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const budgetVal = parseFloat(catBudget) || undefined;

    if (modalCategory) {
      updateCategory(modalCategory.id, {
        name: catName.trim(),
        type: catType,
        icon: catIcon,
        color: catColor,
        budget: budgetVal,
        subcategories: catSubcategories,
      });
    } else {
      addCategory({
        name: catName.trim(),
        type: catType,
        icon: catIcon,
        color: catColor,
        isDefault: false,
        budget: budgetVal,
        subcategories: catSubcategories,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      deleteCategory(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            Smart Categories & Subcategories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize personal expenses, configure monthly budgets, and analyze spending patterns
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 self-start sm:self-auto active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Custom Category</span>
        </button>
      </div>

      {/* 2. Type Tabs & Search */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTypeTab('expense')}
            className={cn(
              'flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
              activeTypeTab === 'expense'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Expense Categories ({categories.filter((c) => c.type === 'expense').length})</span>
          </button>

          <button
            onClick={() => setActiveTypeTab('income')}
            className={cn(
              'flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
              activeTypeTab === 'income'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income Categories ({categories.filter((c) => c.type === 'income').length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* 3. Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCategories.map((cat) => {
          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-400 dark:hover:border-brand-600 cursor-pointer transition-all flex flex-col justify-between space-y-3.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  >
                    <CategoryIcon name={cat.icon} className="w-5 h-5" color="#ffffff" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {cat.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {cat.txCount} transactions logged
                      {cat.subcategories && cat.subcategories.length > 0 && ` · ${cat.subcategories.length} subcategories`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEdit(e, cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Category"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={(e) => handleDelete(e, cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Monthly Spending & Budget status */}
              {cat.type === 'expense' && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">
                      Spent: <strong className="text-slate-900 dark:text-white">{formatRupees(cat.spent)}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Budget: {cat.budget > 0 ? formatRupees(cat.budget) : 'None'}
                    </span>
                  </div>

                  {cat.budget > 0 && (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          cat.percentage >= 100
                            ? 'bg-rose-500'
                            : cat.percentage >= 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Prompt */}
              <div className="flex items-center justify-between text-xs text-brand-600 dark:text-brand-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>View Category Details & Trends</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Category Modal (Add / Edit) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {modalCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Online Shopping"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Budget Limit (Optional ₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={catBudget}
                  onChange={(e) => setCatBudget(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Subcategories Management */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategories
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add subcategory (e.g. Vegetables)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcatToModal}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>
                {catSubcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {catSubcategories.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300"
                      >
                        <span>{sub.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcatFromModal(sub.id)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Category Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={cn(
                        'w-7 h-7 rounded-xl transition-transform flex items-center justify-center',
                        catColor === c ? 'scale-110 ring-2 ring-slate-900 dark:ring-white ring-offset-2' : 'hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {catColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Category Icon
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCatIcon(iconName)}
                      className={cn(
                        'p-2.5 rounded-xl flex items-center justify-center transition-all',
                        catIcon === iconName
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      <CategoryIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
