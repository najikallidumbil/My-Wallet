import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { Transaction } from '../../../types';

interface BarDataPoint {
  label: string;
  income: number;
  expense: number;
}

interface IncomeExpenseBarChartProps {
  transactions: Transaction[];
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({ transactions }) => {
  const [containerWidth, setContainerWidth] = useState(320);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m'>('7d');

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 5) {
      setContainerWidth(w);
    }
  };

  // Group transactions based on selected timeRange
  const data: BarDataPoint[] = React.useMemo(() => {
    const now = new Date();

    if (timeRange === '7d') {
      // Last 7 days
      const days: BarDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

        const dayTxs = transactions.filter((t) => t.transactionDate === dateStr);
        const inc = dayTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = dayTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        days.push({ label: dayLabel, income: inc, expense: exp });
      }
      return days;
    } else if (timeRange === '30d') {
      // 4 weeks
      const weeks: BarDataPoint[] = [];
      for (let w = 3; w >= 0; w--) {
        const start = new Date(now);
        start.setDate(start.getDate() - (w + 1) * 7);
        const end = new Date(now);
        end.setDate(end.getDate() - w * 7);

        const wTxs = transactions.filter((t) => {
          const tDate = new Date(t.transactionDate);
          return tDate >= start && tDate <= end;
        });

        const inc = wTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = wTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        weeks.push({ label: `W${4 - w}`, income: inc, expense: exp });
      }
      return weeks;
    } else {
      // 6 months
      const months: BarDataPoint[] = [];
      for (let m = 5; m >= 0; m--) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        const yr = d.getFullYear();
        const mon = d.getMonth();

        const mTxs = transactions.filter((t) => {
          const tDate = new Date(t.transactionDate);
          return tDate.getFullYear() === yr && tDate.getMonth() === mon;
        });

        const inc = mTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = mTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        months.push({ label: monthLabel, income: inc, expense: exp });
      }
      return months;
    }
  }, [transactions, timeRange]);

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);

  // SVG dimensions
  const chartHeight = 160;
  const paddingLeft = 36;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 26;

  const innerWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(
    100,
    ...data.map((d) => Math.max(d.income, d.expense))
  );

  const groupWidth = innerWidth / data.length;
  const barWidth = Math.max(4, Math.min(16, (groupWidth - 8) / 2));

  const formatYAxis = (num: number) => {
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(0)}k`;
    return `₹${num}`;
  };

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Text style={styles.title}>Income vs Expense</Text>
          <Text style={styles.subtitle}>Comparison Analytics</Text>
        </View>

        <View style={styles.rangeTabs}>
          {(['7d', '30d', '6m'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeTab, timeRange === r && styles.rangeTabActive]}
              onPress={() => setTimeRange(r)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rangeTabText,
                  timeRange === r && styles.rangeTabTextActive,
                ]}
              >
                {r === '7d' ? '7D' : r === '30d' ? '4W' : '6M'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SVG Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={containerWidth - 32} height={chartHeight}>
          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = paddingTop + innerHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <G key={idx}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke={colors.slate[200]}
                  strokeDasharray={ratio === 0 ? undefined : '4,4'}
                  strokeWidth={1}
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 4}
                  fontSize="9"
                  fill={colors.slate[400]}
                  textAnchor="end"
                  fontWeight="600"
                >
                  {formatYAxis(val)}
                </SvgText>
              </G>
            );
          })}

          {/* Bar Groups */}
          {data.map((item, idx) => {
            const groupX = paddingLeft + idx * groupWidth;
            const centerX = groupX + groupWidth / 2;

            const incomeHeight = maxVal > 0 ? (item.income / maxVal) * innerHeight : 0;
            const expenseHeight = maxVal > 0 ? (item.expense / maxVal) * innerHeight : 0;

            const incX = centerX - barWidth - 1;
            const incY = paddingTop + innerHeight - incomeHeight;

            const expX = centerX + 1;
            const expY = paddingTop + innerHeight - expenseHeight;

            return (
              <G key={idx}>
                {/* Income Bar (Green) */}
                <Rect
                  x={incX}
                  y={incY}
                  width={barWidth}
                  height={Math.max(2, incomeHeight)}
                  rx={3}
                  fill={colors.income.solid}
                />
                {/* Expense Bar (Red) */}
                <Rect
                  x={expX}
                  y={expY}
                  width={barWidth}
                  height={Math.max(2, expenseHeight)}
                  rx={3}
                  fill={colors.expense.solid}
                />
                {/* X-axis label */}
                <SvgText
                  x={centerX}
                  y={chartHeight - 6}
                  fontSize="10"
                  fill={colors.slate[500]}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend & Totals */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income.solid }]} />
          <Text style={styles.legendLabel}>Income: </Text>
          <Text style={[styles.legendValue, { color: colors.income.text }]}>
            {formatRupees(totalIncome)}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense.solid }]} />
          <Text style={styles.legendLabel}>Expense: </Text>
          <Text style={[styles.legendValue, { color: colors.expense.text }]}>
            {formatRupees(totalExpense)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate[900],
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate[400],
    fontWeight: '500',
    marginTop: 1,
  },
  rangeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  rangeTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rangeTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[500],
  },
  rangeTabTextActive: {
    color: colors.brand[700],
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});
