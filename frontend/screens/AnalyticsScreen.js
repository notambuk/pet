import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { BottomNavigation } from '../components/BottomNavigation';
import { COLORS, CATEGORY_META } from '../styles/globalStyles';

const API_URL = 'http://192.168.68.103:8000';
const screenWidth = Dimensions.get('window').width - 64;

const NEON_COLORS = [
  '#ff6b9d', '#00d4ff', '#00ff88', '#c084fc',
  '#fbbf24', '#ff9f43', '#ff4757', '#818cf8', '#94a3b8',
];

const TIMEFRAMES = [
  { key: 'daily', label: 'Өдөр' },
  { key: 'weekly', label: '7 хоног' },
  { key: 'monthly', label: 'Сар' },
];

/* ─── Donut Chart (expense-only) ─────────────────────────────────────────── */
function DonutChart({ data, size = 200, strokeWidth = 24, total }) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const displayTotal =
    total >= 1000000
      ? `₮${(total / 1000000).toFixed(1)}M`
      : total >= 1000
        ? `₮${(total / 1000).toFixed(0)}K`
        : `₮${total}`;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {data.map((item, i) => {
        const percent = total > 0 ? item.amount / total : 0;
        const dashArray = circumference * percent;
        const dashOffset = -circumference * cumulativePercent;
        cumulativePercent += percent;
        return (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth={strokeWidth - 2}
            strokeDasharray={`${dashArray} ${circumference - dashArray}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        );
      })}
      <SvgText
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="#FFF"
        fontSize="20"
        fontWeight="700"
      >
        {displayTotal}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize="11"
      >
        Нийт зарлага
      </SvgText>
    </Svg>
  );
}

/* ─── Main Screen ────────────────────────────────────────────────────────── */
export default function AnalyticsScreen() {
  const [timeframe, setTimeframe] = useState('daily');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchInsights(timeframe);
    }, [timeframe])
  );

  const fetchInsights = async (tf) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/insights/?timeframe=${tf}`);
      const data = await res.json();
      setInsights(data);
    } catch (e) {
      console.error('Error fetching insights:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = insights?.summary?.total_income ?? 0;
  const totalExpense = insights?.summary?.total_expense ?? 0;
  const net = insights?.summary?.net ?? 0;

  // Build expense donut data from backend expense_by_category
  const donutData = (insights?.expense_by_category || []).map((cat, i) => ({
    name: cat.name,
    amount: cat.amount,
    percentage: cat.percentage,
    color:
      CATEGORY_META[cat.name.toLowerCase()]?.color ||
      NEON_COLORS[i % NEON_COLORS.length],
  }));

  // Bar chart: income vs expense per bucket
  const barLabels = insights?.labels || [];
  const incomeData = insights?.datasets?.[0]?.data || [];
  const expenseData = insights?.datasets?.[1]?.data || [];
  const hasBarData =
    incomeData.some((v) => v > 0) || expenseData.some((v) => v > 0);

  const petMessage = insights?.pet_message || '';

  const formatAmount = (v) =>
    v >= 1000000
      ? `₮${(v / 1000000).toFixed(1)}M`
      : v >= 1000
        ? `₮${(v / 1000).toFixed(0)}K`
        : `₮${v}`;

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>Тайлан</Text>

        {/* ── Timeframe Selector Pills ─────────────────────────────────── */}
        <View style={styles.pillRow}>
          {TIMEFRAMES.map((tf) => (
            <TouchableOpacity
              key={tf.key}
              onPress={() => setTimeframe(tf.key)}
              style={[
                styles.pill,
                timeframe === tf.key && styles.pillActive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  timeframe === tf.key && styles.pillTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.neonCyan}
            style={{ marginTop: 60 }}
          />
        ) : (
          <>
            {/* ── Summary Cards (Income green / Expense red) ───────────── */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { marginRight: 8 }]}>
                <Ionicons
                  name="arrow-up-circle"
                  size={22}
                  color={COLORS.neonGreen}
                />
                <Text style={[styles.summaryAmount, { color: COLORS.neonGreen }]}>
                  {formatAmount(totalIncome)}
                </Text>
                <Text style={styles.summaryLabel}>Нийт орлого</Text>
              </View>
              <View style={[styles.summaryCard, { marginLeft: 8 }]}>
                <Ionicons
                  name="arrow-down-circle"
                  size={22}
                  color={COLORS.neonPink}
                />
                <Text style={[styles.summaryAmount, { color: COLORS.neonPink }]}>
                  {formatAmount(totalExpense)}
                </Text>
                <Text style={styles.summaryLabel}>Нийт зарлага</Text>
              </View>
            </View>

            {/* ── Net balance row ──────────────────────────────────────── */}
            <View style={styles.netRow}>
              <Ionicons
                name={net >= 0 ? 'trending-up' : 'trending-down'}
                size={18}
                color={net >= 0 ? COLORS.neonGreen : COLORS.neonRed}
              />
              <Text
                style={[
                  styles.netText,
                  { color: net >= 0 ? COLORS.neonGreen : COLORS.neonRed },
                ]}
              >
                {net >= 0 ? '+' : ''}
                {formatAmount(net)} цэвэр
              </Text>
            </View>

            {/* ── Donut Chart (expense only) ───────────────────────────── */}
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>Зарлагын задаргаа</Text>
              {donutData.length > 0 ? (
                <>
                  <View style={styles.donutContainer}>
                    <DonutChart
                      data={donutData}
                      size={200}
                      strokeWidth={24}
                      total={totalExpense}
                    />
                  </View>

                  <View style={styles.legend}>
                    {donutData.map((cat) => (
                      <View key={cat.name} style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: cat.color },
                          ]}
                        />
                        <Text style={styles.legendName}>
                          {CATEGORY_META[cat.name.toLowerCase()]?.label ||
                            cat.name}
                        </Text>
                        <Text style={styles.legendAmount}>
                          ₮{cat.amount.toLocaleString()}
                        </Text>
                        <Text style={styles.legendPercent}>
                          {cat.percentage}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>Зарлага алга</Text>
              )}
            </View>

            {/* ── Income vs Expense Bar Chart ──────────────────────────── */}
            <View style={styles.glassCard}>
              <Text style={styles.cardTitle}>Орлого & Зарлага</Text>
              {hasBarData ? (
                <>
                  <BarChart
                    data={{
                      labels: barLabels,
                      datasets: [
                        { data: expenseData },
                      ],
                    }}
                    width={screenWidth}
                    height={200}
                    fromZero
                    showValuesOnTopOfBars={false}
                    chartConfig={{
                      backgroundColor: 'transparent',
                      backgroundGradientFrom: 'transparent',
                      backgroundGradientTo: 'transparent',
                      decimalCount: 0,
                      color: (opacity = 1) =>
                        `rgba(255, 107, 157, ${opacity})`,
                      labelColor: () => 'rgba(255, 255, 255, 0.6)',
                      barPercentage: 0.5,
                      propsForBackgroundLines: {
                        stroke: 'rgba(255, 255, 255, 0.06)',
                      },
                      style: { borderRadius: 16 },
                    }}
                    style={{ borderRadius: 16, marginLeft: -16 }}
                    withInnerLines
                    withHorizontalLabels
                  />
                  {/* Inline legend */}
                  <View style={styles.barLegend}>
                    <View style={styles.barLegendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: COLORS.neonGreen },
                        ]}
                      />
                      <Text style={styles.barLegendText}>Орлого</Text>
                      <Text
                        style={[
                          styles.barLegendAmount,
                          { color: COLORS.neonGreen },
                        ]}
                      >
                        {formatAmount(totalIncome)}
                      </Text>
                    </View>
                    <View style={styles.barLegendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: COLORS.neonPink },
                        ]}
                      />
                      <Text style={styles.barLegendText}>Зарлага</Text>
                      <Text
                        style={[
                          styles.barLegendAmount,
                          { color: COLORS.neonPink },
                        ]}
                      >
                        {formatAmount(totalExpense)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>Өгөгдөл байхгүй байна</Text>
              )}
            </View>

            {/* ── Dynamic Pet Message ──────────────────────────────────── */}
            {petMessage ? (
              <View style={styles.petBubble}>
                <Text style={styles.petBubbleText}>{petMessage}</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation active="Analytics" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: 1,
  },

  /* Timeframe pills */
  pillRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  pillTextActive: {
    color: COLORS.textPrimary,
  },

  /* Summary */
  summaryRow: { flexDirection: 'row', marginBottom: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },

  /* Net balance */
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  netText: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* Glass cards */
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  /* Donut */
  donutContainer: { alignItems: 'center', marginBottom: 16 },

  /* Category legend */
  legend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  legendAmount: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  legendPercent: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: 36,
    textAlign: 'right',
  },

  /* Bar chart legend */
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLegendText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  barLegendAmount: { fontSize: 12, fontWeight: '700' },

  /* Pet bubble */
  petBubble: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  petBubbleText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
