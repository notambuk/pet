import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/globalStyles';

export function BottomNavigation({ active = 'Home' }) {
  const navigation = useNavigation();

  const tabs = [
    { name: 'Home', icon: 'home', iconOutline: 'home-outline', label: 'Нүүр' },
    { name: 'AddExpense', isCenter: true, label: 'Нэмэх' },
    { name: 'Analytics', icon: 'stats-chart', iconOutline: 'stats-chart-outline', label: 'Тайлан' },
    { name: 'PetStatus', icon: 'paw', iconOutline: 'paw-outline', label: 'Муур' },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          if (tab.isCenter) {
            return (
              <View key={tab.name} style={styles.centerWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(tab.name)}
                >
                  <LinearGradient
                    colors={[COLORS.neonPink, COLORS.neonPurple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerBtn}
                  >
                    <Ionicons name="mic" size={26} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            );
          }
          const isActive = active === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.icon : tab.iconOutline}
                size={22}
                color={isActive ? COLORS.neonCyan : 'rgba(255,255,255,0.45)'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    paddingVertical: 8,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.neonCyan,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    marginTop: -30,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.neonPink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
});
