import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const categoryEmojis = {
  restaurant: '🍽️',
  groceries: '🛒',
  transport: '🚗',
  entertainment: '🎬',
  shopping: '🛍️',
  fitness: '💪',
};

export function TransactionItem({ transaction }) {
  const emoji = categoryEmojis[transaction.category] || '💰';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.category}>{transaction.category}</Text>
        <Text style={styles.date}>Today</Text>
      </View>
      <Text style={styles.amount}>₹{transaction.amount.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  category: { fontSize: 14, fontWeight: '600', color: '#000' },
  date: { fontSize: 12, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700', color: '#000' },
});
