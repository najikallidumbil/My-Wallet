import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { Transaction } from '../../../types';

interface CashFlowLineChartProps {
  transactions: Transaction[];
  initialBalance?: number;
}

export const CashFlowLineChart: React.FC<CashFlowLineChartProps> = ({
  transactions,
  initialBalance = 0,
}) => {
  const [containerWidth, setContainerWidth] = useState(320);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 5) {
      setContainerWidth(w);
    }
  };

  // Build 7 recent points of cumulative balance
  const points = React.useMemo(() => {
    const now = new Date();
    const result: { label: string; balance: number }[] = [];

    // Sort transactions by date ascending
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });

      // Transactions up to this date
      const txsUpToDate = sortedTxs.filter((t) => t.transactionDate <= dateStr);
      const inc = txsUpToDate
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const exp = txsUpToDate
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const bal = initialBalance + inc - exp;
      result.push({ label, balance: bal });
    }
    return result;
  }, [transactions, initialBalance]);

  const balances = points.map((p) => p.balance);
  const minBal = Math.min(0, ...balances);
  const maxBal = Math.max(100, ...balances);
  const range = maxBal - minBal || 1;

  const chartHeight = 150;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const innerWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const stepX = innerWidth / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingTop + innerHeight - ((p.balance - minBal) / range) * innerHeight;
    return { x, y, label: p.label, balance: p.balance };
  });

  // Build SVG path
  let pathD = '';
  if (coords.length > 0) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Bezier curve smoothing
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  // Area path for gradient fill
  const areaD = coords.length > 0
    ? `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + innerHeight} L ${coords[0].x} ${paddingTop + innerHeight} Z`
    : '';

  const latestBal = points[points.length - 1]?.balance || 0;
  const startingBal = points[0]?.balance || 0;
  const trendDiff = latestBal - startingBal;

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cash Flow Trend</Text>
          <Text style={styles.subtitle}>7-Day Available Trajectory</Text>
        </View>

        <View
          style={[
            styles.trendBadge,
            { backgroundColor: trendDiff >= 0 ? colors.income.bg : colors.expense.bg },
          ]}
        >
          <Text
            style={[
              styles.trendText,
              { color: trendDiff >= 0 ? colors.income.text : colors.expense.text },
            ]}
          >
            {trendDiff >= 0 ? '+' : ''}{formatRupees(trendDiff)}
          </Text>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={containerWidth - 32} height={chartHeight}>
          <Defs>
            <LinearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.brand[500]} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.brand[500]} stopOpacity="0.01" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 1].map((ratio, idx) => {
            const y = paddingTop + innerHeight * (1 - ratio);
            const val = Math.round(minBal + range * ratio);
            return (
              <G key={idx}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke={colors.slate[200]}
                  strokeDasharray="4,4"
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
                  {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                </SvgText>
              </G>
            );
          })}

          {/* Area Fill */}
          {areaD ? <Path d={areaD} fill="url(#cashGrad)" /> : null}

          {/* Smooth Line */}
          {pathD ? (
            <Path
              d={pathD}
              fill="none"
              stroke={colors.brand[600]}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Dots and Labels */}
          {coords.map((c, i) => (
            <G key={i}>
              <Circle
                cx={c.x}
                cy={c.y}
                r={i === coords.length - 1 ? 4.5 : 3}
                fill={colors.white}
                stroke={colors.brand[600]}
                strokeWidth={2}
              />
              <SvgText
                x={c.x}
                y={chartHeight - 6}
                fontSize="10"
                fill={colors.slate[500]}
                textAnchor="middle"
                fontWeight="600"
              >
                {c.label}
              </SvgText>
            </G>
          ))}
        </Svg>
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
    marginBottom: 8,
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
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
