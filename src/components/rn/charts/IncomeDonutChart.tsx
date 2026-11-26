import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { Transaction, Category } from '../../../types';
import {
  calculateCategoryAnalytics,
  getComparisonDateRange,
} from '../../../lib/analyticsEngine';
import { CategoryIcon } from '../CategoryIcon';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  TrendingUp,
} from 'lucide-react-native';

interface IncomeDonutChartProps {
  transactions: Transaction[];
  categories: Category[];
  startDate: string;
  endDate: string;
  onSelectCategoryTransactions?: (
    categoryId: string,
    categoryName: string,
    subcategoryName?: string
  ) => void;
}

export const IncomeDonutChart: React.FC<IncomeDonutChartProps> = ({
  transactions,
  categories,
  startDate,
  endDate,
  onSelectCategoryTransactions,
}) => {
  const [containerWidth, setContainerWidth] = useState(340);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 4) {
      setContainerWidth(w);
    }
  };

  const { items, totalAmount, highestCategory } = useMemo(() => {
    const curRange = { startDate, endDate, label: 'Current' };
    const prevRange = getComparisonDateRange('this_month', startDate, endDate);
    return calculateCategoryAnalytics(transactions, categories, 'income', curRange, prevRange);
  }, [transactions, categories, startDate, endDate]);

  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeOffset = 0;
  const slices = useMemo(() => {
    return items.map((item) => {
      const fraction = totalAmount > 0 ? item.totalAmount / totalAmount : 0;
      const strokeDashoffset = circumference * (1 - fraction);
      const rotation = cumulativeOffset * 360;
      cumulativeOffset += fraction;

      return {
        ...item,
        strokeDashoffset,
        rotation,
        fraction,
      };
    });
  }, [items, totalAmount, circumference]);

  const isEmpty = totalAmount === 0 || items.length === 0;

  const handleToggleCategoryExpand = (catId: string) => {
    if (expandedCatId === catId) {
      setExpandedCatId(null);
    } else {
      setExpandedCatId(catId);
      setSelectedCatId(catId);
    }
  };

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Income Breakdown</Text>
            <View style={[styles.badge, { backgroundColor: colors.income.bg }]}>
              <Text style={[styles.badgeText, { color: colors.income.text }]}>
                {items.length} {items.length === 1 ? 'Source' : 'Sources'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Inflow streams by source & category</Text>
        </View>
      </View>

      {/* Donut Graphic & Center Metric */}
      <View style={styles.donutRow}>
        <View style={styles.donutBox}>
          <Svg width={size} height={size}>
            <G rotation="-90" origin={`${center}, ${center}`}>
              {/* Background ring */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.slate[100]}
                strokeWidth={strokeWidth}
                fill="none"
              />

              {!isEmpty &&
                slices.map((slice, idx) => {
                  const isSelected = selectedCatId === slice.categoryId;
                  return (
                    <Circle
                      key={idx}
                      cx={center}
                      cy={center}
                      r={radius}
                      stroke={slice.categoryColor}
                      strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      rotation={slice.rotation}
                      origin={`${center}, ${center}`}
                      opacity={selectedCatId && !isSelected ? 0.45 : 1}
                    />
                  );
                })}
            </G>
          </Svg>

          {/* Donut Center Display */}
          <View style={styles.donutCenter}>
            <Text style={styles.donutCenterLabel}>TOTAL INCOME</Text>
            <Text style={styles.donutCenterAmount} numberOfLines={1}>
              {formatRupees(totalAmount)}
            </Text>
            <Text style={styles.donutCenterSub}>
              {isEmpty ? 'No income' : `${items.reduce((s, i) => s + i.transactionCount, 0)} deposits`}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Earning Stream Highlight Card */}
      {highestCategory && (
        <View style={styles.highlightCard}>
          <View style={styles.highlightLeft}>
            <View
              style={[
                styles.highlightIcon,
                { backgroundColor: `${highestCategory.categoryColor}18` },
              ]}
            >
              <CategoryIcon
                name={highestCategory.categoryIcon}
                size={16}
                color={highestCategory.categoryColor}
              />
            </View>
            <View>
              <Text style={styles.highlightTitle}>
                Primary Inflow: {highestCategory.categoryName}
              </Text>
              <Text style={styles.highlightSub}>
                {highestCategory.percentage}% of all income • {formatRupees(highestCategory.totalAmount)}
              </Text>
            </View>
          </View>
          <View style={styles.highlightBadge}>
            <TrendingUp size={12} color={colors.income.text} />
            <Text style={styles.highlightBadgeText}>#1 Source</Text>
          </View>
        </View>
      )}

      {/* Income Source List */}
      <View style={styles.categoryList}>
        {items.map((cat, idx) => {
          const isExpanded = expandedCatId === cat.categoryId;
          const isSelected = selectedCatId === cat.categoryId;

          return (
            <View
              key={cat.categoryId}
              style={[
                styles.categoryCard,
                isSelected && styles.categoryCardSelected,
                isSelected && { borderColor: cat.categoryColor },
              ]}
            >
              <TouchableOpacity
                style={styles.categoryRow}
                onPress={() => handleToggleCategoryExpand(cat.categoryId)}
                activeOpacity={0.7}
              >
                <View style={styles.catLeft}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: `${cat.categoryColor}16` },
                    ]}
                  >
                    <CategoryIcon
                      name={cat.categoryIcon}
                      size={16}
                      color={cat.categoryColor}
                    />
                  </View>
                  <View style={styles.catNameBox}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {cat.categoryName}
                    </Text>
                    <Text style={styles.catMeta}>
                      {cat.transactionCount} {cat.transactionCount === 1 ? 'deposit' : 'deposits'} •{' '}
                      {cat.subcategories.length}{' '}
                      {cat.subcategories.length === 1 ? 'stream' : 'streams'}
                    </Text>
                  </View>
                </View>

                <View style={styles.catRight}>
                  <Text style={[styles.catAmount, { color: colors.income.text }]}>
                    +{formatRupees(cat.totalAmount)}
                  </Text>
                  <View style={styles.pctBadgeRow}>
                    <View
                      style={[
                        styles.catPctBadge,
                        { backgroundColor: `${cat.categoryColor}16` },
                      ]}
                    >
                      <Text style={[styles.catPctText, { color: cat.categoryColor }]}>
                        {cat.percentage}%
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={16} color={colors.slate[400]} />
                    ) : (
                      <ChevronDown size={16} color={colors.slate[400]} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(4, cat.percentage)}%`,
                      backgroundColor: cat.categoryColor,
                    },
                  ]}
                />
              </View>

              {/* Subcategories Breakdown */}
              {isExpanded && (
                <View style={styles.subcategoriesBox}>
                  <View style={styles.subHeader}>
                    <View style={styles.subHeaderTitleRow}>
                      <Layers size={13} color={colors.slate[500]} />
                      <Text style={styles.subHeaderTitle}>Income Streams</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewTxsBtn}
                      onPress={() =>
                        onSelectCategoryTransactions?.(
                          cat.categoryId,
                          cat.categoryName
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewTxsBtnText}>All Deposits</Text>
                      <ExternalLink size={11} color={colors.brand[600]} />
                    </TouchableOpacity>
                  </View>

                  {cat.subcategories.length === 0 ? (
                    <Text style={styles.noSubsText}>
                      No sub-streams specified for this income source.
                    </Text>
                  ) : (
                    cat.subcategories.map((sub, sIdx) => (
                      <TouchableOpacity
                        key={sIdx}
                        style={styles.subItemRow}
                        onPress={() =>
                          onSelectCategoryTransactions?.(
                            cat.categoryId,
                            cat.categoryName,
                            sub.name
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <View style={styles.subLeft}>
                          <View
                            style={[
                              styles.subBullet,
                              { backgroundColor: cat.categoryColor },
                            ]}
                          />
                          <View>
                            <Text style={styles.subName}>{sub.name}</Text>
                            <Text style={styles.subMeta}>
                              {sub.count} {sub.count === 1 ? 'deposit' : 'deposits'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.subRight}>
                          <Text style={[styles.subAmount, { color: colors.income.text }]}>
                            +{formatRupees(sub.amount)}
                          </Text>
                          <Text style={styles.subPct}>
                            {sub.percentage}% of source
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })}

        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No income recorded for this period.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  donutRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  donutBox: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  donutCenterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.slate[400],
    letterSpacing: 0.8,
  },
  donutCenterAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.income.text,
    marginVertical: 2,
  },
  donutCenterSub: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  highlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate[900],
  },
  highlightSub: {
    fontSize: 10,
    color: colors.slate[500],
    marginTop: 1,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.income.bg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.income.text,
  },
  categoryList: {
    gap: 8,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate[100],
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryCardSelected: {
    borderWidth: 1.5,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.slate[400],
    width: 18,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameBox: {
    flex: 1,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.slate[900],
  },
  catMeta: {
    fontSize: 10,
    color: colors.slate[400],
    marginTop: 1,
  },
  catRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  pctBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  catPctText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  subcategoriesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[600],
    textTransform: 'uppercase',
  },
  viewTxsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: `${colors.brand[500]}10`,
  },
  viewTxsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand[600],
  },
  noSubsText: {
    fontSize: 11,
    color: colors.slate[400],
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[50],
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[800],
  },
  subMeta: {
    fontSize: 9,
    color: colors.slate[400],
  },
  subRight: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  subPct: {
    fontSize: 9,
    color: colors.slate[400],
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
});
