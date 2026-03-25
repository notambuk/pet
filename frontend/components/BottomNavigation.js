import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function BottomNavigation({ active = 'Home' }) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <NavItem icon="🏠" label="Home" active={active === 'Home'} onPress={() => navigation.navigate('Home')} />
      <NavItem icon="➕" label="Add" active={active === 'Add'} onPress={() => navigation.navigate('AddExpense')} />
      <NavItem icon="📊" label="Insights" active={active === 'Insights'} onPress={() => navigation.navigate('Analytics')} />
      <NavItem icon="🐱" label="Pet" active={active === 'Pet'} onPress={() => navigation.navigate('PetStatus')} />
    </View>
  );
}

function NavItem({ icon, label, active = false, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 8,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  icon: { fontSize: 20, marginBottom: 4 },
  label: { fontSize: 11, color: '#999' },
  labelActive: { color: '#2196F3' },
});
