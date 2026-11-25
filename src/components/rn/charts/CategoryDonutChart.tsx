import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';
import { CategorySpendSummary } from '../../../types';

interface CategoryDonutChartProps {
  categorySpending: CategorySpendSummary[];
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ categorySpending }) => {
  const [containerWidth, setContainerWidth] = useState(320);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 5) {
      setContainerWidth(w);
    }
  };

  const topCategories = categorySpending.slice(0, 5);
  const totalAmount = topCategories.reduce((sum, c) => sum + c.totalAmount, 0);

  // SVG Donut geometry
  const size = 140;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeOffset = 0;
  const slices = topCategories.map((item) => {
    const fraction = totalAmount > 0 ? item.totalAmount / totalAmount : 0;
    const strokeDashoffset = circumference * (1 - fraction);
    const rotation = cumulativeOffset * 360;
    cumulativeOffset += fraction;

    return {
      ...item,
      strokeDashoffset,
      rotation,
    };
  });

  if (categorySpending.length === 0 || totalAmount === 0) {
    return null;
  }

  return (
    <View style={styles.card} onLayout={onLayout}>
      <View style={styles.header}>
        <Text style={styles.title}>Spending by Category</Text>
        <Text style={styles.subtitle}>Top expense distribution</Text>
      </View>

      <View style={styles.contentRow}>
        {/* SVG Donut */}
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

              {/* Slices */}
              {slices.map((slice, idx) => (
                <Circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.categoryColor || colors.brand[500]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  rotation={slice.rotation}
                  origin={`${center}, ${center}`}
                />
              ))}
            </G>
            {/* Center label */}
            <SvgText
              x={center}
              y={center - 4}
              fontSize="12"
              fontWeight="800"
              fill={colors.slate[800]}
              textAnchor="middle"
            >
              100%
            </SvgText>
            <SvgText
              x={center}
              y={center + 12}
              fontSize="9"
              fontWeight="600"
              fill={colors.slate[400]}
              textAnchor="middle"
            >
              Expense
            </SvgText>
          </Svg>
        </View>

        {/* Legend Breakdown */}
        <View style={styles.legendCol}>
          {topCategories.map((item) => (
            <View key={item.categoryId} style={styles.legendRow}>
              <View
                style={[
                  styles.catColorDot,
                  { backgroundColor: item.categoryColor || colors.brand[500] },
                ]}
              />
              <View style={styles.catInfo}>
                <Text style={styles.catName} numberOfLines={1}>
                  {item.categoryName}
                </Text>
                <Text style={styles.catPct}>{item.percentage.toFixed(0)}%</Text>
              </View>
              <Text style={styles.catAmount}>{formatRupees(item.totalAmount)}</Text>
            </View>
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  donutBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCol: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[700],
    maxWidth: 90,
  },
  catPct: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '600',
  },
  catAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate[800],
  },
});
