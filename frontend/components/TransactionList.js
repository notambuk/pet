import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { TransactionItem } from './TransactionItem';

export function TransactionList({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <TransactionItem transaction={item} />}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
});
