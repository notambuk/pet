import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DynamicMascot } from '../components/DynamicMascot';
import { TransactionList } from '../components/TransactionList';
import { BottomNavigation } from '../components/BottomNavigation';
import { COLORS } from '../styles/globalStyles';

const API_URL = 'http://192.168.68.103:8000';
const MONTHLY_BUDGET = 1000000;

export default function HomeScreen() {
  const navigation = useNavigation();
  const [petData, setPetData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchPetStatus();
      fetchTransactions();
    }, [])
  );

  const fetchPetStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/pet-status/`);
      const data = await res.json();
      setPetData(data);
    } catch (e) {
      console.error('Error fetching pet:', e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/transactions/`);
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const todaySpent = transactions
    .filter((t) => t.created_at?.startsWith(today) && t.type !== 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyExpense = transactions
    .filter((t) => t.created_at?.startsWith(monthKey) && t.type !== 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = transactions
    .filter((t) => t.created_at?.startsWith(monthKey) && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = monthlyIncome - monthlyExpense;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const safeSpend = Math.max(0, Math.round((MONTHLY_BUDGET - monthlyExpense) / daysLeft));
  const budgetPercent = Math.min((monthlyExpense / MONTHLY_BUDGET) * 100, 100);

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>FINA</Text>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardLabel}>Нийт үлдэгдэл</Text>
          <Text style={[styles.bigAmount, { color: balance >= 0 ? COLORS.neonGreen : COLORS.neonRed }]}>
            {balance >= 0 ? '+' : ''}₮{balance.toLocaleString()}
          </Text>
          <Text style={styles.subLabel}>Өнөөдрийн зарлага: ₮{todaySpent.toLocaleString()}</Text>
        </View>

        {/* Income / Expense Row */}
        <View style={styles.incomeExpenseRow}>
          <View style={[styles.miniCard, { marginRight: 8 }]}>
            <Ionicons name="arrow-down-circle" size={20} color={COLORS.neonGreen} />
            <Text style={styles.miniAmount}>₮{monthlyIncome.toLocaleString()}</Text>
            <Text style={styles.miniLabel}>Сарын орлого</Text>
          </View>
          <View style={[styles.miniCard, { marginLeft: 8 }]}>
            <Ionicons name="arrow-up-circle" size={20} color={COLORS.neonRed} />
            <Text style={styles.miniAmount}>₮{monthlyExpense.toLocaleString()}</Text>
            <Text style={styles.miniLabel}>Сарын зарлага</Text>
          </View>
        </View>

        {/* Pet Card */}
        <DynamicMascot petData={petData} />

        {/* Mic Quick Action */}
        <TouchableOpacity
          style={styles.micRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AddExpense')}
        >
          <View style={styles.micDot}>
            <Ionicons name="mic" size={20} color={COLORS.neonPink} />
          </View>
          <Text style={styles.micText}>Зарлага бүртгэх</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Budget Progress */}
        <View style={styles.glassCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.cardLabel}>Сарын төсөв</Text>
            <Text style={styles.budgetDays}>{daysLeft} хоног үлдсэн</Text>
          </View>
          <Text style={styles.budgetText}>
            ₮{monthlyExpense.toLocaleString()}{' '}
            <Text style={styles.budgetMax}>/ ₮{MONTHLY_BUDGET.toLocaleString()}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={
                budgetPercent > 80
                  ? ['#ff4757', '#ff6b9d']
                  : [COLORS.neonGreen, COLORS.neonCyan]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${budgetPercent}%` }]}
            />
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Сүүлийн гүйлгээнүүд</Text>
          <TransactionList transactions={transactions.slice(0, 10)} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation active="Home" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
  cardLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  bigAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  micDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  micText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetDays: {
    fontSize: 12,
    color: COLORS.neonCyan,
    fontWeight: '600',
  },
  budgetText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  budgetMax: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: { marginTop: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  miniCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    padding: 16,
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
  miniAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  miniLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
});
