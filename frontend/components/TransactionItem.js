import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY_META } from '../styles/globalStyles';

export function TransactionItem({ transaction }) {
  const isIncome = transaction.type === 'income';
  const meta = CATEGORY_META[transaction.category?.toLowerCase()] || {
    icon: 'cash',
    color: isIncome ? COLORS.neonGreen : COLORS.neonBlue,
    label: transaction.category || 'Бусад',
  };

  const dateStr = transaction.created_at
    ? new Date(transaction.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Өнөөдөр';

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: meta.color + '20' }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.category}>{meta.label}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      <Text style={[styles.amount, isIncome && { color: COLORS.neonGreen }]}>
        {isIncome ? '+' : '-'}₮{transaction.amount?.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: { flex: 1 },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
