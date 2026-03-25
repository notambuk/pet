import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://192.168.1.223:8000';
const screenWidth = Dimensions.get('window').width - 64;

const CATEGORY_COLORS = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  shopping: '#FFD93D',
  fitness: '#66BB6A',
  alcohol: '#AB47BC',
  junk_food: '#FF7043',
  gambling: '#EF5350',
  savings: '#42A5F5',
  entertainment: '#FFA726',
  cigarette: '#78909C',
  smoking: '#78909C',
  waste: '#8D6E63',
};

export default function AnalyticsScreen() {
  const [transactions, setTransactions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/transactions/`);
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  // Monthly total
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyTxns = transactions.filter(t => t.created_at && t.created_at.startsWith(monthStart));
  const monthlyTotal = monthlyTxns.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown for pie chart
  const categoryMap = {};
  monthlyTxns.forEach(t => {
    const cat = t.category || 'other';
    categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
  });

  const pieData = Object.entries(categoryMap).map(([name, amount]) => ({
    name,
    amount,
    color: CATEGORY_COLORS[name.toLowerCase()] || '#9E9E9E',
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  // Daily spending for line chart (last 7 days)
  const dailyData = [];
  const dayLabels = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayTotal = transactions
      .filter(t => t.created_at && t.created_at.startsWith(dateStr))
      .reduce((sum, t) => sum + t.amount, 0);
    dailyData.push(dayTotal);
    dayLabels.push(dayNames[d.getDay()]);
  }

  // Avoid empty chart crash
  const hasLineData = dailyData.some(v => v > 0);
  const hasPieData = pieData.length > 0;

  return (
    <LinearGradient colors={['#B3E5FC', '#E1BEE7']} style={styles.container}>
      <ScrollView style={styles.scroll}>
        {/* Total */}
        <View style={styles.card}>
          <Text style={styles.amount}>₮{monthlyTotal.toLocaleString()}</Text>
          <Text style={styles.label}>Total this month</Text>
        </View>

        {/* Pie Chart */}
        <View style={styles.card}>
          <Text style={styles.title}>Spending Breakdown</Text>
          {hasPieData ? (
            <PieChart
              data={pieData}
              width={screenWidth}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          ) : (
            <Text style={styles.emptyText}>No expenses yet this month</Text>
          )}
        </View>

        {/* Line Chart */}
        <View style={styles.card}>
          <Text style={styles.title}>Daily Spending (Last 7 Days)</Text>
          {hasLineData ? (
            <LineChart
              data={{
                labels: dayLabels,
                datasets: [{ data: dailyData }],
              }}
              width={screenWidth}
              height={200}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalCount: 0,
                color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={{ borderRadius: 16 }}
            />
          ) : (
            <Text style={styles.emptyText}>No spending data yet</Text>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, padding: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  amount: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 12, color: '#999' },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 20 },
});
