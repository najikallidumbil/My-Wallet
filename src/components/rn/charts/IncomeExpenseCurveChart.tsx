import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  PanResponder,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { Transaction } from '../../../types';
import {
  calculateCurveData,
  ChartGrouping,
  getAutoGrouping,
} from '../../../lib/analyticsEngine';
import { Calendar, Sparkles } from 'lucide-react-native';

interface IncomeExpenseCurveChartProps {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
}

export const IncomeExpenseCurveChart: React.FC<IncomeExpenseCurveChartProps> = ({
  transactions,
  startDate,
  endDate,
}) => {
  const [containerWidth, setContainerWidth] = useState(340);
  const autoGrouping = useMemo(() => getAutoGrouping(startDate, endDate), [startDate, endDate]);
  const [selectedGrouping, setSelectedGrouping] = useState<ChartGrouping | null>(null);

  const activeGrouping = selectedGrouping || autoGrouping;

  // Active touch tooltip index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 4) {
      setContainerWidth(w);
    }
  };

  // Grouped curve points
  const points = useMemo(() => {
    return calculateCurveData(transactions, startDate, endDate, activeGrouping);
  }, [transactions, startDate, endDate, activeGrouping]);

  const totalIncome = useMemo(() => points.reduce((sum, p) => sum + p.income, 0), [points]);
  const totalExpense = useMemo(() => points.reduce((sum, p) => sum + p.expense, 0), [points]);

  // SVG Chart Geometry
  const chartHeight = 180;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 30;

  const innerWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    let m = 0;
    for (const p of points) {
      if (p.income > m) m = p.income;
      if (p.expense > m) m = p.expense;
    }
    return m > 0 ? m * 1.15 : 100; // 15% headroom for aesthetic spacing
  }, [points]);

  // Compute (x, y) coordinates for all points
  const coords = useMemo(() => {
    const n = points.length;
    return points.map((p, i) => {
      const x = n > 1 ? paddingLeft + (i / (n - 1)) * innerWidth : paddingLeft + innerWidth / 2;
      const yInc = paddingTop + innerHeight - (p.income / maxVal) * innerHeight;
      const yExp = paddingTop + innerHeight - (p.expense / maxVal) * innerHeight;
      return {
        x,
        yInc,
        yExp,
        ...p,
      };
    });
  }, [points, innerWidth, innerHeight, paddingLeft, paddingTop, maxVal]);

  // Build Smooth Cubic Bezier Curves
  const { incomePath, expensePath, incomeAreaPath, expenseAreaPath } = useMemo(() => {
    if (coords.length === 0) {
      return { incomePath: '', expensePath: '', incomeAreaPath: '', expenseAreaPath: '' };
    }

    const buildBezier = (type: 'inc' | 'exp') => {
      let d = `M ${coords[0].x} ${type === 'inc' ? coords[0].yInc : coords[0].yExp}`;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const prevY = type === 'inc' ? prev.yInc : prev.yExp;
        const currY = type === 'inc' ? curr.yInc : curr.yExp;

        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prevY;
        const cp2x = prev.x + (curr.x - prev.x) / 2;
        const cp2y = currY;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${currY}`;
      }
      return d;
    };

    const incLine = buildBezier('inc');
    const expLine = buildBezier('exp');

    const bottomY = paddingTop + innerHeight;
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;

    const incArea = `${incLine} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    const expArea = `${expLine} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return {
      incomePath: incLine,
      expensePath: expLine,
      incomeAreaPath: incArea,
      expenseAreaPath: expArea,
    };
  }, [coords, paddingTop, innerHeight]);

  // Touch Gesture Handling with PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const handleTouch = (touchX: number) => {
    if (coords.length <= 1) {
      setActiveIndex(0);
      return;
    }
    const clampedX = Math.max(paddingLeft, Math.min(paddingLeft + innerWidth, touchX));
    const ratio = (clampedX - paddingLeft) / innerWidth;
    const closestIdx = Math.round(ratio * (coords.length - 1));
    setActiveIndex(Math.max(0, Math.min(coords.length - 1, closestIdx)));
  };

  const activeCoord = activeIndex !== null && coords[activeIndex] ? coords[activeIndex] : null;

  // Horizontal Grid Lines
  const gridSteps = [0, 0.33, 0.66, 1];

  const isEmpty = totalIncome === 0 && totalExpense === 0;

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Income vs Expense</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Real-time Flow</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Curved cashflow comparison</Text>
        </View>

        {/* Grouping Filters */}
        <View style={styles.groupingPills}>
          {(['daily', 'weekly', 'monthly'] as ChartGrouping[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.groupingPill, activeGrouping === g && styles.groupingPillActive]}
              onPress={() => {
                setSelectedGrouping(g);
                setActiveIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.groupingText,
                  activeGrouping === g && styles.groupingTextActive,
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* KPI Mini-Header */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiItem}>
          <View style={[styles.kpiDot, { backgroundColor: colors.income.solid }]} />
          <Text style={styles.kpiLabel}>Income: </Text>
          <Text style={[styles.kpiValue, { color: colors.income.text }]}>
            {formatRupees(totalIncome)}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <View style={[styles.kpiDot, { backgroundColor: colors.expense.solid }]} />
          <Text style={styles.kpiLabel}>Expense: </Text>
          <Text style={[styles.kpiValue, { color: colors.expense.text }]}>
            {formatRupees(totalExpense)}
          </Text>
        </View>
      </View>

      {/* Interactive Floating Tooltip Bar */}
      {activeCoord ? (
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipHeader}>
            <Calendar size={11} color={colors.slate[500]} />
            <Text style={styles.tooltipDate}>{activeCoord.fullDate}</Text>
          </View>
          <View style={styles.tooltipMetrics}>
            <View style={styles.tooltipMetricItem}>
              <Text style={styles.tooltipMetricLabel}>Income</Text>
              <Text style={[styles.tooltipMetricVal, { color: colors.income.text }]}>
                +{formatRupees(activeCoord.income)}
              </Text>
            </View>
            <View style={styles.tooltipMetricItem}>
              <Text style={styles.tooltipMetricLabel}>Expense</Text>
              <Text style={[styles.tooltipMetricVal, { color: colors.expense.text }]}>
                -{formatRupees(activeCoord.expense)}
              </Text>
            </View>
            <View style={styles.tooltipMetricItem}>
              <Text style={styles.tooltipMetricLabel}>Net Flow</Text>
              <Text
                style={[
                  styles.tooltipMetricVal,
                  { color: activeCoord.net >= 0 ? colors.income.text : colors.expense.text },
                ]}
              >
                {activeCoord.net >= 0 ? '+' : ''}
                {formatRupees(activeCoord.net)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.tooltipHint}>
          <Sparkles size={11} color={colors.brand[500]} />
          <Text style={styles.tooltipHintText}>Tap or drag anywhere on the chart for details</Text>
        </View>
      )}

      {/* SVG Canvas with PanResponder */}
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <Svg width={containerWidth - 28} height={chartHeight}>
          <Defs>
            {/* Income Gradient */}
            <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.income.solid} stopOpacity="0.32" />
              <Stop offset="80%" stopColor={colors.income.solid} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={colors.income.solid} stopOpacity="0" />
            </LinearGradient>

            {/* Expense Gradient */}
            <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.expense.solid} stopOpacity="0.28" />
              <Stop offset="80%" stopColor={colors.expense.solid} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={colors.expense.solid} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
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

          {!isEmpty && (
            <>
              {/* Shaded Areas */}
              <Path d={incomeAreaPath} fill="url(#incomeGrad)" />
              <Path d={expenseAreaPath} fill="url(#expenseGrad)" />

              {/* Stroke Lines */}
              <Path
                d={incomePath}
                fill="none"
                stroke={colors.income.solid}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={expensePath}
                fill="none"
                stroke={colors.expense.solid}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Cursor Indicator */}
              {activeCoord && (
                <G>
                  {/* Vertical Guideline */}
                  <Line
                    x1={activeCoord.x}
                    y1={paddingTop}
                    x2={activeCoord.x}
                    y2={paddingTop + innerHeight}
                    stroke={colors.slate[400]}
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />

                  {/* Income Point Node */}
                  <Circle
                    cx={activeCoord.x}
                    cy={activeCoord.yInc}
                    r={7}
                    fill={colors.income.solid}
                    opacity="0.3"
                  />
                  <Circle
                    cx={activeCoord.x}
                    cy={activeCoord.yInc}
                    r={4}
                    fill={colors.white}
                    stroke={colors.income.solid}
                    strokeWidth="2"
                  />

                  {/* Expense Point Node */}
                  <Circle
                    cx={activeCoord.x}
                    cy={activeCoord.yExp}
                    r={7}
                    fill={colors.expense.solid}
                    opacity="0.3"
                  />
                  <Circle
                    cx={activeCoord.x}
                    cy={activeCoord.yExp}
                    r={4}
                    fill={colors.white}
                    stroke={colors.expense.solid}
                    strokeWidth="2"
                  />
                </G>
              )}
            </>
          )}

          {/* X Axis Labels */}
          {coords.map((p, idx) => {
            // Filter labels to prevent horizontal overlap on narrow screens
            const showLabel =
              coords.length <= 7 ||
              idx === 0 ||
              idx === coords.length - 1 ||
              idx % Math.ceil(coords.length / 5) === 0;

            if (!showLabel) return null;

            return (
              <SvgText
                key={idx}
                x={p.x}
                y={paddingTop + innerHeight + 16}
                fontSize="9"
                fill={activeIndex === idx ? colors.brand[600] : colors.slate[400]}
                fontWeight={activeIndex === idx ? '800' : '600'}
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            );
          })}
        </Svg>
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
    backgroundColor: `${colors.brand[500]}14`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brand[600],
    textTransform: 'uppercase',
  },
  groupingPills: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  groupingPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  groupingPillActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  groupingText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[500],
  },
  groupingTextActive: {
    color: colors.slate[900],
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
  },
  kpiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.slate[500],
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  kpiDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.slate[200],
  },
  tooltipCard: {
    backgroundColor: colors.slate[900],
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[200],
  },
  tooltipMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tooltipMetricItem: {
    alignItems: 'flex-start',
  },
  tooltipMetricLabel: {
    fontSize: 9,
    color: colors.slate[400],
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  tooltipMetricVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  tooltipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.brand[500]}0d`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  tooltipHintText: {
    fontSize: 10,
    color: colors.brand[700],
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
