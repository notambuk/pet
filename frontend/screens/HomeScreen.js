import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { PetCard } from '../components/PetCard';
import { StatCard } from '../components/StatCard';
import { TransactionList } from '../components/TransactionList';
import { BottomNavigation } from '../components/BottomNavigation';

export default function HomeScreen() {
  const [petData, setPetData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const MONTHLY_BUDGET = 1000000; // 1,000,000₮ monthly budget — adjust as needed

  // Refetch every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPetStatus();
      fetchTransactions();
    }, [])
  );

  const fetchPetStatus = async () => {
    try {
      const response = await fetch('http://192.168.1.223:8000/api/v1/pet-status/');
      const data = await response.json();
      setPetData(data);
    } catch (error) {
      console.error('Error fetching pet:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://192.168.1.223:8000/api/v1/transactions/');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Calculate today's spending from transactions
  const today = new Date().toISOString().split('T')[0];
  const todaySpent = transactions
    .filter(t => t.created_at && t.created_at.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate monthly spending
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlySpent = transactions
    .filter(t => t.created_at && t.created_at.startsWith(monthStart))
    .reduce((sum, t) => sum + t.amount, 0);

  // Days remaining in month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const safeSpend = Math.max(0, Math.round((MONTHLY_BUDGET - monthlySpent) / daysLeft));

  const budgetPercent = Math.min((monthlySpent / MONTHLY_BUDGET) * 100, 100);

  return (
    <LinearGradient colors={['#B3E5FC', '#E1BEE7']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.notificationIcon}>🔔</Text>
        </View>

        {/* Today's Safe Spend Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Today's Safe Spend:</Text>
          <Text style={styles.amount}>₮{safeSpend.toLocaleString()}</Text>
          <Text style={styles.subLabel}>Today spent: ₮{todaySpent.toLocaleString()}</Text>
        </View>

        {/* Pet Character */}
        <PetCard petData={petData} />

        {/* Budget Progress */}
        <View style={styles.card}>
          <Text style={styles.label}>Spent: ₮{monthlySpent.toLocaleString()} / ₮{MONTHLY_BUDGET.toLocaleString()} (Monthly Budget)</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${budgetPercent}%`, backgroundColor: budgetPercent > 80 ? '#F44336' : '#4CAF50' }]} />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TransactionList transactions={transactions} />
        </View>
      </ScrollView>

      <BottomNavigation />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 12, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  notificationIcon: { fontSize: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  subLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  amount: { fontSize: 32, fontWeight: '700', color: '#000' },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%', backgroundColor: '#4CAF50' },
  transactionSection: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#000' },
});
