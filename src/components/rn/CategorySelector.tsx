import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Plus,
  Check,
  Settings2,
  X,
} from 'lucide-react-native';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme/colors';
import { Category, SubCategory, TransactionType } from '../../types';
import { CategoryIcon } from './CategoryIcon';
import { CategoryManagementModal } from './CategoryManagementModal';

interface CategorySelectorProps {
  mode: TransactionType; // 'income' | 'expense'
  selectedCategoryId: string;
  selectedSubcategoryId?: string;
  onSelect: (categoryId: string, subcategoryId?: string, subcategoryName?: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  mode,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelect,
}) => {
  const { categories, addSubcategory } = useWallet();

  const [isManagementOpen, setIsManagementOpen] = useState(false);

  // Inline quick-add subcategory state
  const [isAddingSubInline, setIsAddingSubInline] = useState(false);
  const [inlineSubName, setInlineSubName] = useState('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Filter categories by transaction type
  const availableCategories = useMemo(() => {
    return categories.filter((c) => c.type === mode);
  }, [categories, mode]);

  // Selected category object
  const activeCategory = useMemo(() => {
    return (
      availableCategories.find((c) => c.id === selectedCategoryId) ||
      availableCategories[0] ||
      null
    );
  }, [availableCategories, selectedCategoryId]);

  // Available subcategories for active category
  const activeSubcategories = useMemo(() => {
    return activeCategory?.subcategories || [];
  }, [activeCategory]);

  // Handle selecting a category
  const handleSelectCategory = (cat: Category) => {
    // If switching main category, clear selected subcategory unless it belongs to new category
    onSelect(cat.id, undefined, undefined);
    setIsAddingSubInline(false);
    setInlineSubName('');
  };

  // Handle toggling subcategory
  const handleToggleSubcategory = (sub: SubCategory) => {
    if (!activeCategory) return;
    if (selectedSubcategoryId === sub.id) {
      // Deselect subcategory (keep main category only)
      onSelect(activeCategory.id, undefined, undefined);
    } else {
      // Select subcategory
      onSelect(activeCategory.id, sub.id, sub.name);
    }
  };

  // Quick Inline Subcategory Addition
  const handleSaveInlineSubcategory = async () => {
    if (!activeCategory) return;
    const clean = inlineSubName.trim();
    if (!clean) {
      Alert.alert('Required', 'Please enter a subcategory name.');
      return;
    }

    setIsSubmittingSub(true);
    try {
      const created = await addSubcategory(activeCategory.id, clean);
      // Auto-select the newly created subcategory immediately
      onSelect(activeCategory.id, created.id, created.name);
      setInlineSubName('');
      setIsAddingSubInline(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save subcategory.');
    } finally {
      setIsSubmittingSub(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Manage Link */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>
          CATEGORY {mode === 'income' ? '(INCOME SOURCE)' : '(EXPENSE PURPOSE)'} *
        </Text>
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => setIsManagementOpen(true)}
          activeOpacity={0.7}
        >
          <Settings2 size={12} color={colors.brand[600]} />
          <Text style={styles.manageBtnText}>Manage Categories</Text>
        </TouchableOpacity>
      </View>

      {/* Main Categories Horizontal Scroll / Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
        style={styles.categoryScroll}
      >
        {availableCategories.map((c) => {
          const isSelected = activeCategory?.id === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.categoryCard,
                isSelected && styles.categoryCardSelected,
                isSelected && { borderColor: c.color, backgroundColor: `${c.color}0c` },
              ]}
              onPress={() => handleSelectCategory(c)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.categoryIconWrap,
                  { backgroundColor: `${c.color}18` },
                  isSelected && { backgroundColor: c.color },
                ]}
              >
                <CategoryIcon
                  name={c.icon}
                  size={18}
                  color={isSelected ? colors.white : c.color}
                />
              </View>
              <Text
                style={[
                  styles.categoryNameText,
                  isSelected && { color: colors.slate[900], fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {c.name}
              </Text>
              {isSelected && (
                <View style={[styles.activeDot, { backgroundColor: c.color }]} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* "+ Custom" Add Category Pill */}
        <TouchableOpacity
          style={styles.addCategoryCard}
          onPress={() => setIsManagementOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.addCategoryIconWrap}>
            <Plus size={16} color={colors.brand[700]} />
          </View>
          <Text style={styles.addCategoryText}>+ Custom</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Subcategories Section (Immediately underneath selected main category) */}
      {activeCategory && (
        <View style={styles.subcategoriesContainer}>
          <View style={styles.subHeaderRow}>
            <View style={styles.subTitleWrap}>
              <Text style={styles.subSectionLabel}>SUBCATEGORY</Text>
              <View style={[styles.activeCatBadge, { backgroundColor: `${activeCategory.color}15` }]}>
                <Text style={[styles.activeCatBadgeText, { color: activeCategory.color }]}>
                  {activeCategory.name}
                </Text>
              </View>
            </View>

            {/* Quick Add Subcategory Toggle */}
            {!isAddingSubInline && (
              <TouchableOpacity
                style={styles.quickAddSubBtn}
                onPress={() => setIsAddingSubInline(true)}
                activeOpacity={0.7}
              >
                <Plus size={12} color={colors.brand[700]} />
                <Text style={styles.quickAddSubBtnText}>Add Subcategory</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Inline Quick Add Input */}
          {isAddingSubInline && (
            <View style={styles.inlineAddBox}>
              <TextInput
                style={styles.inlineSubInput}
                placeholder={`New subcategory for ${activeCategory.name}...`}
                placeholderTextColor={colors.slate[400]}
                value={inlineSubName}
                onChangeText={setInlineSubName}
                autoFocus
              />
              <TouchableOpacity
                style={styles.inlineSaveBtn}
                onPress={handleSaveInlineSubcategory}
                disabled={isSubmittingSub}
                activeOpacity={0.7}
              >
                {isSubmittingSub ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Check size={14} color={colors.white} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inlineCancelBtn}
                onPress={() => {
                  setIsAddingSubInline(false);
                  setInlineSubName('');
                }}
              >
                <X size={15} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Subcategories Pills Flow */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subPillsScroll}
          >
            {activeSubcategories.length === 0 && !isAddingSubInline ? (
              <TouchableOpacity
                style={styles.noSubPill}
                onPress={() => setIsAddingSubInline(true)}
                activeOpacity={0.7}
              >
                <Plus size={12} color={colors.slate[400]} />
                <Text style={styles.noSubPillText}>No subcategories yet — Tap to add one</Text>
              </TouchableOpacity>
            ) : (
              activeSubcategories.map((sub) => {
                const isSelected = selectedSubcategoryId === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[
                      styles.subPill,
                      isSelected && styles.subPillActive,
                      isSelected && {
                        backgroundColor: activeCategory.color,
                        borderColor: activeCategory.color,
                      },
                    ]}
                    onPress={() => handleToggleSubcategory(sub)}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <Check size={12} color={colors.white} style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[
                        styles.subPillText,
                        isSelected && styles.subPillTextActive,
                      ]}
                    >
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* Category Management Modal */}
      <CategoryManagementModal
        visible={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        initialType={mode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[600],
    letterSpacing: 0.5,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
  },
  manageBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand[700],
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 8,
    paddingVertical: 2,
  },
  categoryCard: {
    width: 82,
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.slate[50],
    borderWidth: 1.5,
    borderColor: colors.slate[200],
  },
  categoryCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryNameText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.slate[700],
    textAlign: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  addCategoryCard: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brand[200],
    borderStyle: 'dashed',
  },
  addCategoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addCategoryText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.brand[700],
  },
  subcategoriesContainer: {
    marginTop: 12,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 14,
    padding: 10,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSectionLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.slate[500],
    letterSpacing: 0.5,
  },
  activeCatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeCatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickAddSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.brand[50],
  },
  quickAddSubBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand[700],
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand[300],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    gap: 6,
  },
  inlineSubInput: {
    flex: 1,
    fontSize: 12,
    color: colors.slate[800],
    paddingVertical: 4,
  },
  inlineSaveBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtn: {
    padding: 4,
  },
  subPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  subPillActive: {
    borderColor: 'transparent',
  },
  subPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
  },
  subPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  noSubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderStyle: 'dashed',
  },
  noSubPillText: {
    fontSize: 11,
    color: colors.slate[500],
    fontStyle: 'italic',
  },
});
