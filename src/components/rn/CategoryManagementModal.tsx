import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Search,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { Category, SubCategory, TransactionType } from '../../types';
import { CategoryIcon } from './CategoryIcon';

interface CategoryManagementModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: TransactionType;
}

export const CATEGORY_PALETTE_COLORS = [
  '#10b981', // emerald
  '#059669', // green
  '#047857', // dark green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#e11d48', // red
  '#f59e0b', // amber
  '#f97316', // orange
  '#64748b', // slate
  '#334155', // dark slate
];

export const CATEGORY_ICONS = [
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
  'Coffee',
  'Fuel',
  'Plane',
  'Dumbbell',
  'BookOpen',
  'Shield',
  'Smile',
  'Music',
  'Tv',
  'Gamepad2',
  'Wrench',
  'Truck',
  'Scissors',
  'Package',
  'Folder',
  'Banknote',
  'Building2',
  'CreditCard',
  'Tag',
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  visible,
  onClose,
  initialType = 'expense',
}) => {
  const {
    categories,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<TransactionType>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // Category Edit / Create Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<TransactionType>('expense');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catColor, setCatColor] = useState('#6366f1');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Subcategory Add / Edit state
  const [subModalTargetCatId, setSubModalTargetCatId] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<SubCategory | null>(null);
  const [subName, setSubName] = useState('');
  const [isSavingSub, setIsSavingSub] = useState(false);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesType = c.type === activeTab;
      if (!searchQuery.trim()) return matchesType;
      const q = searchQuery.toLowerCase();
      const matchesName = c.name.toLowerCase().includes(q);
      const matchesSub = (c.subcategories || []).some((s) => s.name.toLowerCase().includes(q));
      return matchesType && (matchesName || matchesSub);
    });
  }, [categories, activeTab, searchQuery]);

  // Open Create Category Dialog
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType(activeTab);
    setCatIcon('Tag');
    setCatColor(activeTab === 'income' ? '#10b981' : '#f43f5e');
    setIsEditModalOpen(true);
  };

  // Open Edit Category Dialog
  const handleOpenEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatType(c.type);
    setCatIcon(c.icon || 'Tag');
    setCatColor(c.color || '#6366f1');
    setIsEditModalOpen(true);
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async () => {
    const clean = catName.trim();
    if (!clean) {
      Alert.alert('Required Field', 'Please enter a category name.');
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: clean,
          type: catType,
          icon: catIcon,
          color: catColor,
        });
        Alert.alert('Category Updated', `"${clean}" has been updated.`);
      } else {
        await addCategory({
          name: clean,
          type: catType,
          icon: catIcon,
          color: catColor,
          isDefault: false,
          subcategories: [],
        });
        Alert.alert('Category Created', `"${clean}" added to ${catType} categories.`);
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Delete Category with Reassignment Guard
  const handleDeleteCategory = (cat: Category) => {
    const associatedTx = transactions.filter((t) => t.categoryId === cat.id);
    const count = associatedTx.length;

    if (count > 0) {
      // Find other categories of the same type for reassignment
      const otherCats = categories.filter((c) => c.id !== cat.id && c.type === cat.type);

      Alert.alert(
        'Category In Use',
        `"${cat.name}" has ${count} existing transaction(s). How would you like to handle them?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unassign Transactions',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteCategory(cat.id);
                Alert.alert('Category Deleted', `"${cat.name}" was deleted.`);
              } catch (err: any) {
                Alert.alert('Delete Failed', err.message);
              }
            },
          },
          ...(otherCats.length > 0
            ? [
                {
                  text: `Reassign to "${otherCats[0].name}"`,
                  onPress: async () => {
                    try {
                      await deleteCategory(cat.id, otherCats[0].id);
                      Alert.alert(
                        'Reassigned & Deleted',
                        `Transactions reassigned to "${otherCats[0].name}" and "${cat.name}" was deleted.`
                      );
                    } catch (err: any) {
                      Alert.alert('Delete Failed', err.message);
                    }
                  },
                },
              ]
            : []),
        ]
      );
      return;
    }

    Alert.alert('Delete Category', `Are you sure you want to delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message);
          }
        },
      },
    ]);
  };

  // Open Subcategory Create Dialog
  const handleOpenAddSubcategory = (catId: string) => {
    setSubModalTargetCatId(catId);
    setEditingSubcategory(null);
    setSubName('');
  };

  // Open Subcategory Edit Dialog
  const handleOpenEditSubcategory = (catId: string, sub: SubCategory) => {
    setSubModalTargetCatId(catId);
    setEditingSubcategory(sub);
    setSubName(sub.name);
  };

  // Save Subcategory
  const handleSaveSubcategory = async () => {
    if (!subModalTargetCatId) return;
    const clean = subName.trim();
    if (!clean) {
      Alert.alert('Required', 'Please enter a subcategory name.');
      return;
    }

    setIsSavingSub(true);
    try {
      if (editingSubcategory) {
        await updateSubcategory(subModalTargetCatId, editingSubcategory.id, {
          name: clean,
        });
        Alert.alert('Subcategory Updated', `Renamed to "${clean}".`);
      } else {
        await addSubcategory(subModalTargetCatId, clean);
        Alert.alert('Subcategory Added', `"${clean}" added.`);
      }
      setSubModalTargetCatId(null);
      setEditingSubcategory(null);
      setSubName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save subcategory.');
    } finally {
      setIsSavingSub(false);
    }
  };

  // Delete Subcategory with Reassignment Guard
  const handleDeleteSubcategory = (catId: string, sub: SubCategory) => {
    const associatedTx = transactions.filter((t) => t.subcategoryId === sub.id);
    const count = associatedTx.length;

    const doDelete = async (reassignId?: string, reassignName?: string) => {
      try {
        await deleteSubcategory(catId, sub.id, reassignId, reassignName);
      } catch (err: any) {
        Alert.alert('Delete Failed', err.message);
      }
    };

    if (count > 0) {
      Alert.alert(
        'Subcategory In Use',
        `"${sub.name}" is attached to ${count} transaction(s). Deleting it will keep the transactions under the main category. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete & Keep Transactions',
            style: 'destructive',
            onPress: () => doDelete(),
          },
        ]
      );
      return;
    }

    Alert.alert('Delete Subcategory', `Delete "${sub.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleIconBox}>
                <Tag size={18} color={colors.brand[600]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title} numberOfLines={1}>Categories & Subcategories</Text>
                <Text style={styles.subtitle}>Customize your finance structure</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* Type Switcher Tabs (Income vs Expense) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'expense' && styles.tabBtnActiveExpense]}
              onPress={() => setActiveTab('expense')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'expense' && styles.tabTextActive,
                ]}
              >
                Expense Categories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'income' && styles.tabBtnActiveIncome]}
              onPress={() => setActiveTab('income')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'income' && styles.tabTextActive,
                ]}
              >
                Income Categories
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search & Add Action Strip */}
          <View style={styles.actionStrip}>
            <View style={styles.searchBox}>
              <Search size={14} color={colors.slate[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories & subcategories..."
                placeholderTextColor={colors.slate[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.addCategoryBtn}
              onPress={handleOpenCreateCategory}
              activeOpacity={0.7}
            >
              <Plus size={16} color={colors.white} />
              <Text style={styles.addCategoryBtnText}>+ Category</Text>
            </TouchableOpacity>
          </View>

          {/* Categories List */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {filteredCategories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Tag size={32} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No categories found</Text>
                <Text style={styles.emptySub}>
                  Tap "+ Category" to create your first custom category.
                </Text>
              </View>
            ) : (
              filteredCategories.map((cat) => {
                const subs = cat.subcategories || [];
                const isExpanded = expandedCatId === cat.id;

                return (
                  <View key={cat.id} style={styles.catCard}>
                    {/* Card Header Row */}
                    <TouchableOpacity
                      style={styles.catHeaderRow}
                      onPress={() => setExpandedCatId(isExpanded ? null : cat.id)}
                      activeOpacity={0.7}
                    >
                      {/* Icon */}
                      <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}18` }]}>
                        <CategoryIcon name={cat.icon} size={20} color={cat.color} />
                      </View>

                      {/* Info */}
                      <View style={styles.catInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.catName}>{cat.name}</Text>
                          {cat.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.subCountText}>
                          {subs.length === 1
                            ? '1 subcategory'
                            : `${subs.length} subcategories`}
                        </Text>
                      </View>

                      {/* Action Icons */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.actionIconBtn}
                          onPress={() => handleOpenEditCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Edit3 size={15} color={colors.slate[600]} />
                        </TouchableOpacity>

                        {!cat.isDefault && (
                          <TouchableOpacity
                            style={[styles.actionIconBtn, styles.deleteActionBtn]}
                            onPress={() => handleDeleteCategory(cat)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={15} color={colors.expense.solid} />
                          </TouchableOpacity>
                        )}

                        <View style={styles.expandChevron}>
                          {isExpanded ? (
                            <ChevronUp size={16} color={colors.slate[400]} />
                          ) : (
                            <ChevronDown size={16} color={colors.slate[400]} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Subcategories Accordion Section */}
                    {isExpanded && (
                      <View style={styles.subAccordion}>
                        <View style={styles.subDivider} />
                        <View style={styles.subHeader}>
                          <Text style={styles.subSectionTitle}>
                            Subcategories in {cat.name}
                          </Text>
                          <TouchableOpacity
                            style={styles.addSubBtnSmall}
                            onPress={() => handleOpenAddSubcategory(cat.id)}
                            activeOpacity={0.7}
                          >
                            <Plus size={13} color={colors.brand[700]} />
                            <Text style={styles.addSubBtnSmallText}>Add Subcategory</Text>
                          </TouchableOpacity>
                        </View>

                        {subs.length === 0 ? (
                          <Text style={styles.noSubsText}>
                            No subcategories added yet. Tap "Add Subcategory" to create one.
                          </Text>
                        ) : (
                          <View style={styles.subList}>
                            {subs.map((sub) => (
                              <View key={sub.id} style={styles.subItemRow}>
                                <View style={styles.subDot} />
                                <Text style={styles.subItemName}>{sub.name}</Text>
                                <View style={styles.subActionBtns}>
                                  <TouchableOpacity
                                    onPress={() => handleOpenEditSubcategory(cat.id, sub)}
                                    style={styles.subSmallBtn}
                                  >
                                    <Edit3 size={13} color={colors.slate[500]} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteSubcategory(cat.id, sub)}
                                    style={styles.subSmallBtn}
                                  >
                                    <Trash2 size={13} color={colors.expense.solid} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      {/* MODAL 1: ADD / EDIT MAIN CATEGORY */}
      {isEditModalOpen && (
        <Modal visible={isEditModalOpen} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.innerModalBackdrop}
          >
            <View style={styles.innerModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingCategory ? 'Edit Category' : 'Create Custom Category'}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color={colors.slate[600]} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Category Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>CATEGORY NAME *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Healthcare, Pets, Subscriptions..."
                    placeholderTextColor={colors.slate[400]}
                    value={catName}
                    onChangeText={setCatName}
                    autoCapitalize="words"
                  />
                </View>

                {/* Color Palette */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>SELECT COLOR</Text>
                  <View style={styles.colorPaletteGrid}>
                    {CATEGORY_PALETTE_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          catColor === c && styles.colorCircleSelected,
                        ]}
                        onPress={() => setCatColor(c)}
                        activeOpacity={0.8}
                      >
                        {catColor === c && <Check size={14} color={colors.white} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Icon Picker */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>SELECT ICON</Text>
                  <View style={styles.iconPickerGrid}>
                    {CATEGORY_ICONS.map((iconKey) => {
                      const isSelected = catIcon.toLowerCase() === iconKey.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={iconKey}
                          style={[
                            styles.iconPickBox,
                            isSelected && {
                              backgroundColor: `${catColor}20`,
                              borderColor: catColor,
                            },
                          ]}
                          onPress={() => setCatIcon(iconKey)}
                          activeOpacity={0.7}
                        >
                          <CategoryIcon
                            name={iconKey}
                            size={18}
                            color={isSelected ? catColor : colors.slate[600]}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, isSavingCategory && { opacity: 0.7 }]}
                  onPress={handleSaveCategory}
                  disabled={isSavingCategory}
                  activeOpacity={0.8}
                >
                  {isSavingCategory ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Check size={16} color={colors.white} />
                      <Text style={styles.saveBtnText}>
                        {editingCategory ? 'Update Category' : 'Save Category'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* MODAL 2: ADD / EDIT SUBCATEGORY */}
      {subModalTargetCatId && (
        <Modal visible={!!subModalTargetCatId} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.innerModalBackdrop}
          >
            <View style={styles.subModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingSubcategory ? 'Rename Subcategory' : 'Add Subcategory'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSubModalTargetCatId(null);
                    setEditingSubcategory(null);
                  }}
                  style={styles.closeBtn}
                >
                  <X size={18} color={colors.slate[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>SUBCATEGORY NAME *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Swiggy, Gym Membership, WiFi..."
                  placeholderTextColor={colors.slate[400]}
                  value={subName}
                  onChangeText={setSubName}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.saveBtn, isSavingSub && { opacity: 0.7 }]}
                  onPress={handleSaveSubcategory}
                  disabled={isSavingSub}
                  activeOpacity={0.8}
                >
                  {isSavingSub ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Check size={16} color={colors.white} />
                      <Text style={styles.saveBtnText}>
                        {editingSubcategory ? 'Update Subcategory' : 'Add Subcategory'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  titleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    flexShrink: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnActiveExpense: {
    backgroundColor: colors.expense.solid,
  },
  tabBtnActiveIncome: {
    backgroundColor: colors.income.solid,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[600],
  },
  tabTextActive: {
    color: colors.white,
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.slate[800],
    padding: 0,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[600],
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 4,
  },
  addCategoryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  scrollList: {
    maxHeight: 460,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate[600],
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
    textAlign: 'center',
  },
  catCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  catHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[900],
  },
  defaultBadge: {
    backgroundColor: colors.slate[100],
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate[500],
  },
  subCountText: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  deleteActionBtn: {
    backgroundColor: colors.expense.bg,
  },
  expandChevron: {
    padding: 4,
    marginLeft: 2,
  },
  subAccordion: {
    backgroundColor: colors.slate[50],
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  subDivider: {
    height: 1,
    backgroundColor: colors.slate[200],
    marginBottom: 10,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addSubBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  addSubBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  noSubsText: {
    fontSize: 11,
    color: colors.slate[400],
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  subList: {
    gap: 6,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand[500],
    marginRight: 8,
  },
  subItemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[800],
  },
  subActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSmallBtn: {
    padding: 4,
  },
  innerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  innerModalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
  },
  subModalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate[900],
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.slate[900],
    backgroundColor: colors.slate[50],
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  iconPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxHeight: 180,
  },
  iconPickBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate[50],
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  modalActions: {
    marginTop: 4,
  },
});
