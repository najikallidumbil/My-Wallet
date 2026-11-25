import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';

interface KhataAnalyticsChartProps {
  totalReceivable: number;
  totalPayable: number;
  overdueCount: number;
}

export const KhataAnalyticsChart: React.FC<KhataAnalyticsChartProps> = ({
  totalReceivable,
  totalPayable,
  overdueCount,
}) => {
  const [containerWidth, setContainerWidth] = useState(320);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 5) {
      setContainerWidth(w);
    }
  };

  const totalKhata = totalReceivable + totalPayable || 1;
  const receivablePct = Math.round((totalReceivable / totalKhata) * 100);
  const payablePct = 100 - receivablePct;

  const barHeight = 24;
  const innerWidth = Math.max(100, containerWidth - 32);

  const receivableBarW = Math.max(8, (receivablePct / 100) * innerWidth);
  const payableBarW = innerWidth - receivableBarW;

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Khata Distribution</Text>
          <Text style={styles.subtitle}>Receivable vs Payable Ratio</Text>
        </View>

        {overdueCount > 0 && (
          <View style={styles.overdueBadge}>
            <Text style={styles.overdueText}>{overdueCount} Overdue</Text>
          </View>
        )}
      </View>

      {/* Visual Proportional SVG Bar */}
      <View style={styles.chartWrapper}>
        <Svg width={innerWidth} height={barHeight}>
          {/* Receivable segment */}
          <Rect
            x={0}
            y={0}
            width={receivableBarW}
            height={barHeight}
            rx={8}
            fill={colors.receivable.solid}
          />
          {/* Payable segment */}
          <Rect
            x={receivableBarW}
            y={0}
            width={payableBarW}
            height={barHeight}
            rx={8}
            fill={colors.payable.solid}
          />
        </Svg>
      </View>

      {/* Legend & Percentages */}
      <View style={styles.legendRow}>
        <View style={styles.legendCol}>
          <View style={styles.legendTag}>
            <View style={[styles.dot, { backgroundColor: colors.receivable.solid }]} />
            <Text style={styles.tagText}>Receivable ({receivablePct}%)</Text>
          </View>
          <Text style={[styles.amountText, { color: colors.receivable.text }]}>
            {formatRupees(totalReceivable)}
          </Text>
        </View>

        <View style={[styles.legendCol, styles.alignRight]}>
          <View style={styles.legendTag}>
            <View style={[styles.dot, { backgroundColor: colors.payable.solid }]} />
            <Text style={styles.tagText}>Payable ({payablePct}%)</Text>
          </View>
          <Text style={[styles.amountText, { color: colors.payable.text }]}>
            {formatRupees(totalPayable)}
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
  overdueBadge: {
    backgroundColor: colors.expense.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  overdueText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.expense.text,
  },
  chartWrapper: {
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  legendCol: {
    gap: 3,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  legendTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[500],
  },
  amountText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
