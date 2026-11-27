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
  calculateBalanceGrowth,
  BalanceGrowthPoint,
} from '../../../lib/analyticsEngine';
import { TrendingUp, TrendingDown, Calendar, Sparkles } from 'lucide-react-native';

interface BalanceGrowthAreaChartProps {
  transactions: Transaction[];
  currentBalance: number;
  startDate: string;
  endDate: string;
}

export const BalanceGrowthAreaChart: React.FC<BalanceGrowthAreaChartProps> = ({
  transactions,
  currentBalance,
  startDate,
  endDate,
}) => {
  const [containerWidth, setContainerWidth] = useState(340);
  const [viewMetric, setViewMetric] = useState<'balance' | 'savings'>('balance');
  const [grouping, setGrouping] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 4) {
      setContainerWidth(w);
    }
  };

  const points: BalanceGrowthPoint[] = useMemo(() => {
    return calculateBalanceGrowth(transactions, currentBalance, startDate, endDate, grouping);
  }, [transactions, currentBalance, startDate, endDate, grouping]);

  const chartHeight = 180;
  const paddingLeft = 38;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 30;

  const innerWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Values array based on selected metric
  const values = useMemo(() => {
    return points.map((p) => (viewMetric === 'balance' ? p.balance : p.cumulativeSavings));
  }, [points, viewMetric]);

  const minVal = useMemo(() => Math.min(0, ...values), [values]);
  const maxVal = useMemo(() => {
    const m = Math.max(100, ...values);
    return m * 1.15;
  }, [values]);

  const range = maxVal - minVal || 1;

  // Compute (x, y) coordinates
  const coords = useMemo(() => {
    const n = points.length;
    return points.map((p, i) => {
      const x = n > 1 ? paddingLeft + (i / (n - 1)) * innerWidth : paddingLeft + innerWidth / 2;
      const val = viewMetric === 'balance' ? p.balance : p.cumulativeSavings;
      const y = paddingTop + innerHeight - ((val - minVal) / range) * innerHeight;
      return {
        x,
        y,
        val,
        ...p,
      };
    });
  }, [points, innerWidth, innerHeight, paddingLeft, paddingTop, minVal, range, viewMetric]);

  // Build Cubic Bezier Curve and Gradient Area
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '' };

    let line = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];

      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;

      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    const bottomY = paddingTop + innerHeight;
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const area = `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { linePath: line, areaPath: area };
  }, [coords, paddingTop, innerHeight]);

  // PanResponder for touch interaction
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

  // Trend growth over period
  const startVal = coords[0]?.val || 0;
  const endVal = coords[coords.length - 1]?.val || 0;
  const netDelta = endVal - startVal;
  const isPositiveGrowth = netDelta >= 0;

  const gridSteps = [0, 0.33, 0.66, 1];

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleArea}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Growth & Wealth Trajectory</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: isPositiveGrowth ? colors.income.bg : colors.expense.bg },
              ]}
            >
              {isPositiveGrowth ? (
                <TrendingUp size={11} color={colors.income.text} />
              ) : (
                <TrendingDown size={11} color={colors.expense.text} />
              )}
              <Text
                style={[
                  styles.badgeText,
                  { color: isPositiveGrowth ? colors.income.text : colors.expense.text },
                ]}
              >
                {netDelta >= 0 ? '+' : ''}
                {formatRupees(netDelta)}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {viewMetric === 'balance' ? 'Available liquid capital curve' : 'Cumulative savings momentum'}
          </Text>
        </View>

        {/* Grouping Filter */}
        <View style={styles.groupingPills}>
          {(['daily', 'monthly', 'yearly'] as ('daily' | 'monthly' | 'yearly')[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.groupingPill, grouping === g && styles.groupingPillActive]}
              onPress={() => {
                setGrouping(g);
                setActiveIndex(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.groupingText, grouping === g && styles.groupingTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1, 2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Metric Mode Toggle (Balance vs Cumulative Savings) */}
      <View style={styles.metricSwitcher}>
        <TouchableOpacity
          style={[styles.metricTab, viewMetric === 'balance' && styles.metricTabActive]}
          onPress={() => {
            setViewMetric('balance');
            setActiveIndex(null);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.metricTabText,
              viewMetric === 'balance' && styles.metricTabTextActive,
            ]}
          >
            Total Balance ({formatRupees(currentBalance)})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metricTab, viewMetric === 'savings' && styles.metricTabActive]}
          onPress={() => {
            setViewMetric('savings');
            setActiveIndex(null);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.metricTabText,
              viewMetric === 'savings' && styles.metricTabTextActive,
            ]}
          >
            Net Period Savings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Tooltip Card */}
      {activeCoord ? (
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipHeader}>
            <Calendar size={11} color={colors.slate[400]} />
            <Text style={styles.tooltipDate}>{activeCoord.fullDate}</Text>
          </View>
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipLabel}>
              {viewMetric === 'balance' ? 'Liquid Balance' : 'Cumulative Savings'}
            </Text>
            <Text
              style={[
                styles.tooltipAmount,
                { color: activeCoord.val >= 0 ? colors.income.text : colors.expense.text },
              ]}
            >
              {activeCoord.val >= 0 ? '+' : ''}
              {formatRupees(activeCoord.val)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.tooltipHint}>
          <Sparkles size={11} color={colors.brand[500]} />
          <Text style={styles.tooltipHintText}>Tap or drag curve to inspect wealth timeline</Text>
        </View>
      )}

      {/* SVG Curve with PanResponder */}
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <Svg width={containerWidth - 28} height={chartHeight}>
          <Defs>
            <LinearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={isPositiveGrowth ? colors.income.solid : colors.brand[500]}
                stopOpacity="0.36"
              />
              <Stop
                offset="80%"
                stopColor={isPositiveGrowth ? colors.income.solid : colors.brand[500]}
                stopOpacity="0.04"
              />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {gridSteps.map((step, idx) => {
            const y = paddingTop + innerHeight - step * innerHeight;
            const val = Math.round(minVal + step * range);
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

          {/* Shaded Area */}
          <Path d={areaPath} fill="url(#growthGrad)" />

          {/* Stroke Curve */}
          <Path
            d={linePath}
            fill="none"
            stroke={isPositiveGrowth ? colors.income.solid : colors.brand[600]}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Touch Cursor Node */}
          {activeCoord && (
            <G>
              <Line
                x1={activeCoord.x}
                y1={paddingTop}
                x2={activeCoord.x}
                y2={paddingTop + innerHeight}
                stroke={colors.slate[400]}
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <Circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r={8}
                fill={isPositiveGrowth ? colors.income.solid : colors.brand[600]}
                opacity="0.25"
              />
              <Circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r={4}
                fill={colors.white}
                stroke={isPositiveGrowth ? colors.income.solid : colors.brand[600]}
                strokeWidth="2"
              />
            </G>
          )}

          {/* X Axis Labels */}
          {coords.map((p, idx) => {
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  headerTitleArea: {
    flex: 1,
    minWidth: 160,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  groupingPills: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    padding: 2,
    gap: 2,
    alignSelf: 'flex-start',
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
  metricSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    gap: 4,
    flexWrap: 'wrap',
  },
  metricTab: {
    flex: 1,
    minWidth: 130,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  metricTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[500],
  },
  metricTabTextActive: {
    color: colors.slate[900],
    fontWeight: '800',
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
    marginBottom: 4,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[300],
  },
  tooltipContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipLabel: {
    fontSize: 10,
    color: colors.slate[400],
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  tooltipAmount: {
    fontSize: 14,
    fontWeight: '800',
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
