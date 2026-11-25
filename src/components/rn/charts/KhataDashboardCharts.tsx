import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Rect, Line, Circle, Path, G } from 'react-native-svg';
import { CreditDebtRecord } from '../../../types';
import { colors } from '../../../theme/colors';
import { formatRupees } from '../../../lib/currency';

interface KhataDashboardChartsProps {
  creditDebtRecords: CreditDebtRecord[];
  totalReceivable: number;
  totalPayable: number;
}

export const KhataDashboardCharts: React.FC<KhataDashboardChartsProps> = ({
  creditDebtRecords,
  totalReceivable,
  totalPayable,
}) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'given_received' | 'borrowed_repaid' | 'trend'>('monthly');
  const [containerWidth, setContainerWidth] = useState(320);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 5) {
      setContainerWidth(w);
    }
  };

  const chartWidth = Math.max(260, containerWidth - 32);

  // 1. Monthly Credit vs Debt Breakdown (last 6 months)
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { credit: number; debt: number }> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[key] = { credit: 0, debt: 0 };
    }

    for (const r of creditDebtRecords) {
      const dateStr = r.transactionDate || (r.createdAt ? r.createdAt.slice(0, 10) : '');
      const mKey = dateStr.slice(0, 7);
      if (monthsMap[mKey]) {
        if (r.type === 'credit') {
          monthsMap[mKey].credit += r.originalAmount;
        } else {
          monthsMap[mKey].debt += r.originalAmount;
        }
      }
    }

    return Object.entries(monthsMap).map(([monthStr, data]) => {
      const [year, month] = monthStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      return {
        month: label,
        credit: data.credit,
        debt: data.debt,
      };
    });
  }, [creditDebtRecords]);

  // Max value for monthly chart
  const maxMonthlyVal = useMemo(() => {
    let max = 1000;
    for (const d of monthlyData) {
      if (d.credit > max) max = d.credit;
      if (d.debt > max) max = d.debt;
    }
    return max * 1.15;
  }, [monthlyData]);

  // 2. Amount Given vs Received Stats
  const givenVsReceived = useMemo(() => {
    let totalGiven = 0;
    let totalReceived = 0;
    for (const r of creditDebtRecords) {
      if (r.type === 'credit') {
        totalGiven += r.originalAmount;
        totalReceived += r.settledAmount || 0;
      }
    }
    const pending = Math.max(0, totalGiven - totalReceived);
    const recoveryRate = totalGiven > 0 ? Math.round((totalReceived / totalGiven) * 100) : 0;
    return { totalGiven, totalReceived, pending, recoveryRate };
  }, [creditDebtRecords]);

  // 3. Amount Borrowed vs Repaid Stats
  const borrowedVsRepaid = useMemo(() => {
    let totalBorrowed = 0;
    let totalRepaid = 0;
    for (const r of creditDebtRecords) {
      if (r.type === 'debt') {
        totalBorrowed += r.originalAmount;
        totalRepaid += r.settledAmount || 0;
      }
    }
    const pending = Math.max(0, totalBorrowed - totalRepaid);
    const repaymentRate = totalBorrowed > 0 ? Math.round((totalRepaid / totalBorrowed) * 100) : 0;
    return { totalBorrowed, totalRepaid, pending, repaymentRate };
  }, [creditDebtRecords]);

  // 4. Outstanding Balance Trend Line Data
  const trendPoints = useMemo(() => {
    // Sort transactions chronologically
    const sorted = [...creditDebtRecords].sort((a, b) => {
      const dateA = a.transactionDate || (a.createdAt ? a.createdAt.slice(0, 10) : '');
      const dateB = b.transactionDate || (b.createdAt ? b.createdAt.slice(0, 10) : '');
      return dateA.localeCompare(dateB);
    });

    if (sorted.length === 0) {
      return [
        { label: 'Start', balance: 0 },
        { label: 'Now', balance: totalReceivable - totalPayable },
      ];
    }

    let runningBal = 0;
    const points: { label: string; balance: number }[] = [];

    // Sample up to 6 points
    const step = Math.max(1, Math.floor(sorted.length / 6));
    for (let i = 0; i < sorted.length; i += step) {
      const r = sorted[i];
      const remaining = Math.max(0, r.originalAmount - (r.settledAmount || 0));
      if (r.type === 'credit') runningBal += remaining;
      else runningBal -= remaining;

      const dateStr = r.transactionDate || (r.createdAt ? r.createdAt.slice(0, 10) : '');
      const label = dateStr.slice(5); // MM-DD
      points.push({ label, balance: runningBal });
    }

    // Always include current point
    points.push({ label: 'Current', balance: totalReceivable - totalPayable });
    return points;
  }, [creditDebtRecords, totalReceivable, totalPayable]);

  return (
    <View style={styles.card} onLayout={onLayout}>
      {/* Chart Selector Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'monthly' && styles.tabActive]}
          onPress={() => setActiveTab('monthly')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
            Credit vs Debt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'given_received' && styles.tabActive]}
          onPress={() => setActiveTab('given_received')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'given_received' && styles.tabTextActive]}>
            Lent vs Received
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'borrowed_repaid' && styles.tabActive]}
          onPress={() => setActiveTab('borrowed_repaid')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'borrowed_repaid' && styles.tabTextActive]}>
            Borrowed vs Repaid
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'trend' && styles.tabActive]}
          onPress={() => setActiveTab('trend')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'trend' && styles.tabTextActive]}>
            Balance Trend
          </Text>
        </TouchableOpacity>
      </View>

      {/* CHART 1: Monthly Credit vs Debt */}
      {activeTab === 'monthly' && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Monthly Credit vs Debt Activity</Text>
              <Text style={styles.chartSub}>Lending (Credit) vs Borrowing (Debt) by month</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendDotBox}>
                <View style={[styles.legendDot, { backgroundColor: colors.receivable.solid }]} />
                <Text style={styles.legendText}>Credit</Text>
              </View>
              <View style={styles.legendDotBox}>
                <View style={[styles.legendDot, { backgroundColor: colors.payable.solid }]} />
                <Text style={styles.legendText}>Debt</Text>
              </View>
            </View>
          </View>

          <Svg width={chartWidth} height={160}>
            {/* Grid baseline */}
            <Line
              x1={0}
              y1={130}
              x2={chartWidth}
              y2={130}
              stroke={colors.slate[200]}
              strokeWidth={1}
            />

            {monthlyData.map((d, index) => {
              const colW = chartWidth / monthlyData.length;
              const barW = Math.max(8, colW * 0.32);
              const xBase = index * colW + colW * 0.15;

              const creditH = Math.max(2, (d.credit / maxMonthlyVal) * 110);
              const debtH = Math.max(2, (d.debt / maxMonthlyVal) * 110);

              const creditY = 130 - creditH;
              const debtY = 130 - debtH;

              return (
                <G key={d.month + index}>
                  {/* Credit Bar */}
                  <Rect
                    x={xBase}
                    y={creditY}
                    width={barW}
                    height={creditH}
                    rx={3}
                    fill={colors.receivable.solid}
                  />
                  {/* Debt Bar */}
                  <Rect
                    x={xBase + barW + 3}
                    y={debtY}
                    width={barW}
                    height={debtH}
                    rx={3}
                    fill={colors.payable.solid}
                  />
                </G>
              );
            })}
          </Svg>

          {/* Month labels under bars */}
          <View style={[styles.monthLabelsRow, { width: chartWidth }]}>
            {monthlyData.map((d, i) => (
              <Text key={i} style={styles.monthLabelText}>
                {d.month}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* CHART 2: Amount Given vs Amount Received */}
      {activeTab === 'given_received' && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Amount Given vs Received Back</Text>
              <Text style={styles.chartSub}>Total money lent vs repayments collected</Text>
            </View>
            <View style={styles.ratePill}>
              <Text style={styles.ratePillText}>{givenVsReceived.recoveryRate}% Recovered</Text>
            </View>
          </View>

          {/* Proportional Recovery Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(2, givenVsReceived.recoveryRate))}%`,
                    backgroundColor: colors.income.solid,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.metricsGrid3}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Lent (Given)</Text>
              <Text style={[styles.metricVal, { color: colors.receivable.text }]}>
                {formatRupees(givenVsReceived.totalGiven)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Received Back</Text>
              <Text style={[styles.metricVal, { color: colors.income.text }]}>
                {formatRupees(givenVsReceived.totalReceived)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Remaining Due</Text>
              <Text style={[styles.metricVal, { color: colors.payable.text }]}>
                {formatRupees(givenVsReceived.pending)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* CHART 3: Amount Borrowed vs Amount Repaid */}
      {activeTab === 'borrowed_repaid' && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Amount Borrowed vs Repaid</Text>
              <Text style={styles.chartSub}>Total loans taken vs payments cleared by you</Text>
            </View>
            <View style={[styles.ratePill, { backgroundColor: colors.income.bg }]}>
              <Text style={[styles.ratePillText, { color: colors.income.text }]}>
                {borrowedVsRepaid.repaymentRate}% Repaid
              </Text>
            </View>
          </View>

          {/* Proportional Repayment Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(2, borrowedVsRepaid.repaymentRate))}%`,
                    backgroundColor: colors.income.solid,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.metricsGrid3}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Borrowed</Text>
              <Text style={[styles.metricVal, { color: colors.payable.text }]}>
                {formatRupees(borrowedVsRepaid.totalBorrowed)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>You Repaid</Text>
              <Text style={[styles.metricVal, { color: colors.income.text }]}>
                {formatRupees(borrowedVsRepaid.totalRepaid)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Pending to Pay</Text>
              <Text style={[styles.metricVal, { color: colors.expense.text }]}>
                {formatRupees(borrowedVsRepaid.pending)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* CHART 4: Outstanding Balance Trend */}
      {activeTab === 'trend' && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Net Khata Position Trend</Text>
              <Text style={styles.chartSub}>Net receivable / payable movement over time</Text>
            </View>
            <View
              style={[
                styles.ratePill,
                {
                  backgroundColor:
                    totalReceivable >= totalPayable ? colors.receivable.bg : colors.payable.bg,
                },
              ]}
            >
              <Text
                style={[
                  styles.ratePillText,
                  {
                    color:
                      totalReceivable >= totalPayable
                        ? colors.receivable.text
                        : colors.payable.text,
                  },
                ]}
              >
                Net: {formatRupees(totalReceivable - totalPayable)}
              </Text>
            </View>
          </View>

          <Svg width={chartWidth} height={150}>
            {/* Zero line */}
            <Line
              x1={0}
              y1={75}
              x2={chartWidth}
              y2={75}
              stroke={colors.slate[200]}
              strokeWidth={1}
              strokeDasharray="4, 4"
            />

            {/* Plot Trend Line */}
            {(() => {
              const pts = trendPoints;
              if (pts.length < 2) return null;

              const maxAbs =
                Math.max(
                  1000,
                  ...pts.map((p) => Math.abs(p.balance))
                ) * 1.25;

              const stepX = chartWidth / (pts.length - 1);
              const coords = pts.map((p, idx) => {
                const x = idx * stepX;
                const y = 75 - (p.balance / maxAbs) * 60;
                return { x, y, bal: p.balance };
              });

              const pathD = coords.reduce(
                (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                ''
              );

              return (
                <G>
                  <Path
                    d={pathD}
                    fill="none"
                    stroke={colors.brand[600]}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {coords.map((c, i) => (
                    <Circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={3.5}
                      fill={c.bal >= 0 ? colors.receivable.solid : colors.payable.solid}
                      stroke={colors.white}
                      strokeWidth={1.5}
                    />
                  ))}
                </G>
              );
            })()}
          </Svg>

          <View style={[styles.monthLabelsRow, { width: chartWidth }]}>
            {trendPoints.map((p, i) => (
              <Text key={i} style={styles.monthLabelText} numberOfLines={1}>
                {p.label}
              </Text>
            ))}
          </View>
        </View>
      )}
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
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: colors.slate[900],
    fontWeight: '800',
  },
  chartContainer: {
    gap: 10,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.slate[900],
  },
  chartSub: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDotBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[600],
  },
  monthLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  monthLabelText: {
    fontSize: 10,
    color: colors.slate[400],
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  ratePill: {
    backgroundColor: colors.brand[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand[700],
  },
  progressContainer: {
    paddingVertical: 6,
  },
  progressBg: {
    height: 12,
    backgroundColor: colors.slate[100],
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  metricsGrid3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
});
