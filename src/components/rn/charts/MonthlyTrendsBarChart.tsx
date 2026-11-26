import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { Transaction } from '../../../types';
import {
  calculateMonthlyTrends,
  MonthlyTrendBarItem,
} from '../../../lib/analyticsEngine';
import { Calendar } from 'lucide-react-native';

interface MonthlyTrendsBarChartProps {
  transactions: Transaction[];
}

export const MonthlyTrendsBarChart: React.FC<MonthlyTrendsBarChartProps> = ({
  transactions,
}) => {
  const [containerWidth, setContainerWidth] = useState(340);
  const [monthRange, setMonthRange] = useState<6 | 12>(6);
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 4) {
      setContainerWidth(w);
    }
  };

  const data: MonthlyTrendBarItem[] = useMemo(() => {
    return calculateMonthlyTrends(transactions, monthRange);
  }, [transactions, monthRange]);

  // Find active or default to current month
  const activeMonth = useMemo(() => {
    if (activeMonthKey) {
      const found = data.find((d) => d.monthKey === activeMonthKey);
      if (found) return found;
    }
    return data.find((d) => d.isCurrentMonth) || data[data.length - 1] || null;
  }, [data, activeMonthKey]);

  // Chart Dimensions
  const chartHeight = 180;
  const paddingLeft = 36;
  const paddingRight = 14;
  const paddingTop = 26;
  const paddingBottom = 28;

  const innerWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Max value calculation for bar height scale
  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of data) {
      if (d.income > m) m = d.income;
      if (d.expense > m) m = d.expense;
      if (Math.abs(d.savings) > m) m = Math.abs(d.savings);
    }
    return m > 0 ? m * 1.15 : 100;
  }, [data]);

  const numMonths = data.length;
  const clusterWidth = innerWidth / numMonths;
  const barWidth = Math.max(3, Math.min(10, (clusterWidth - 10) / 3));

  const gridSteps = [0, 0.33, 0.66, 1];

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Monthly Trends</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>6M / 12M</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Income, Expense & Savings comparison</Text>
        </View>

        {/* 6M vs 12M Switcher */}
        <View style={styles.pillsRow}>
          <TouchableOpacity
            style={[styles.pill, monthRange === 6 && styles.pillActive]}
            onPress={() => {
              setMonthRange(6);
              setActiveMonthKey(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, monthRange === 6 && styles.pillTextActive]}>
              Last 6M
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, monthRange === 12 && styles.pillActive]}
            onPress={() => {
              setMonthRange(12);
              setActiveMonthKey(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, monthRange === 12 && styles.pillTextActive]}>
              Last 12M
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income.solid }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense.solid }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.overview.solid }]} />
          <Text style={styles.legendText}>Net Savings</Text>
        </View>
      </View>

      {/* Interactive Tooltip Card for Active Month */}
      {activeMonth && (
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipHeader}>
            <Calendar size={11} color={colors.slate[400]} />
            <Text style={styles.tooltipMonth}>
              {activeMonth.label} {activeMonth.year}
              {activeMonth.isCurrentMonth ? ' (Current Month)' : ''}
            </Text>
          </View>
          <View style={styles.tooltipValues}>
            <View style={styles.tooltipValBox}>
              <Text style={styles.tooltipValLabel}>Income</Text>
              <Text style={[styles.tooltipValAmount, { color: colors.income.text }]}>
                +{formatRupees(activeMonth.income)}
              </Text>
            </View>
            <View style={styles.tooltipValBox}>
              <Text style={styles.tooltipValLabel}>Expense</Text>
              <Text style={[styles.tooltipValAmount, { color: colors.expense.text }]}>
                -{formatRupees(activeMonth.expense)}
              </Text>
            </View>
            <View style={styles.tooltipValBox}>
              <Text style={styles.tooltipValLabel}>Savings</Text>
              <Text
                style={[
                  styles.tooltipValAmount,
                  { color: activeMonth.savings >= 0 ? colors.overview.text : colors.expense.text },
                ]}
              >
                {activeMonth.savings >= 0 ? '+' : ''}
                {formatRupees(activeMonth.savings)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* SVG Canvas */}
      <View style={styles.chartContainer}>
        <Svg width={containerWidth - 28} height={chartHeight}>
          {/* Horizontal Grid Lines */}
          {gridSteps.map((step, idx) => {
            const y = paddingTop + innerHeight - step * innerHeight;
            const val = Math.round(step * maxVal);
            return (
              <G key={idx}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke={colors.slate[200]}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 3}
                  fontSize="9"
                  fill={colors.slate[400]}
                  textAnchor="end"
                  fontWeight="600"
                >
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </SvgText>
              </G>
            );
          })}

          {/* Bar Clusters per Month */}
          {data.map((m, idx) => {
            const clusterX = paddingLeft + idx * clusterWidth;
            const centerX = clusterX + clusterWidth / 2;
            const isSelected = activeMonth?.monthKey === m.monthKey;

            // Bar heights
            const hInc = Math.max(0, (m.income / maxVal) * innerHeight);
            const hExp = Math.max(0, (m.expense / maxVal) * innerHeight);
            const hSav = Math.max(0, (Math.max(0, m.savings) / maxVal) * innerHeight);

            const yInc = paddingTop + innerHeight - hInc;
            const yExp = paddingTop + innerHeight - hExp;
            const ySav = paddingTop + innerHeight - hSav;

            // X offsets for the 3 bars inside cluster
            const totalBarsWidth = barWidth * 3 + 4;
            const startBarsX = centerX - totalBarsWidth / 2;
            const xInc = startBarsX;
            const xExp = startBarsX + barWidth + 2;
            const xSav = startBarsX + (barWidth + 2) * 2;

            return (
              <G key={m.monthKey}>
                {/* Highlight Background Box for Current or Selected Month */}
                {(m.isCurrentMonth || isSelected) && (
                  <Rect
                    x={clusterX + 2}
                    y={paddingTop - 6}
                    width={clusterWidth - 4}
                    height={innerHeight + 10}
                    rx="8"
                    fill={
                      isSelected
                        ? `${colors.brand[500]}16`
                        : `${colors.slate[200]}40`
                    }
                  />
                )}

                {/* Indicator Pill above current month */}
                {m.isCurrentMonth && (
                  <SvgText
                    x={centerX}
                    y={paddingTop - 10}
                    fontSize="8"
                    fill={colors.brand[600]}
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    NOW
                  </SvgText>
                )}

                {/* Income Bar */}
                {hInc > 0 && (
                  <Rect
                    x={xInc}
                    y={yInc}
                    width={barWidth}
                    height={hInc}
                    rx="3"
                    fill={colors.income.solid}
                  />
                )}

                {/* Expense Bar */}
                {hExp > 0 && (
                  <Rect
                    x={xExp}
                    y={yExp}
                    width={barWidth}
                    height={hExp}
                    rx="3"
                    fill={colors.expense.solid}
                  />
                )}

                {/* Savings Bar */}
                {hSav > 0 && (
                  <Rect
                    x={xSav}
                    y={ySav}
                    width={barWidth}
                    height={hSav}
                    rx="3"
                    fill={colors.overview.solid}
                  />
                )}

                {/* Month Label */}
                <SvgText
                  x={centerX}
                  y={paddingTop + innerHeight + 16}
                  fontSize={monthRange === 12 ? '8' : '9'}
                  fill={
                    isSelected
                      ? colors.brand[600]
                      : m.isCurrentMonth
                      ? colors.slate[900]
                      : colors.slate[400]
                  }
                  fontWeight={m.isCurrentMonth || isSelected ? '800' : '600'}
                  textAnchor="middle"
                >
                  {m.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Invisible Tap Overlay Columns */}
        <View style={styles.touchOverlay}>
          {data.map((m) => (
            <TouchableOpacity
              key={m.monthKey}
              style={[styles.touchColumn, { width: `${100 / numMonths}%` }]}
              onPress={() => setActiveMonthKey(m.monthKey)}
              activeOpacity={0.6}
            />
          ))}
        </View>
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
    marginBottom: 10,
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
    backgroundColor: `${colors.overview.solid}14`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.overview.text,
  },
  pillsRow: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[500],
  },
  pillTextActive: {
    color: colors.slate[900],
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
  },
  tooltipCard: {
    backgroundColor: colors.slate[900],
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tooltipMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[200],
  },
  tooltipValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tooltipValBox: {
    alignItems: 'flex-start',
  },
  tooltipValLabel: {
    fontSize: 9,
    color: colors.slate[400],
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  tooltipValAmount: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchOverlay: {
    position: 'absolute',
    top: 20,
    left: 36,
    right: 14,
    bottom: 28,
    flexDirection: 'row',
  },
  touchColumn: {
    height: '100%',
  },
});
