import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function StatCard({ label, value, icon }) {
  return (
    <View style={styles.card}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: { fontSize: 24, marginBottom: 8 },
  value: { fontSize: 20, fontWeight: '700', color: '#000' },
  label: { fontSize: 12, color: '#999', marginTop: 4 },
});
