import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Platform } from 'react-native';
import { COLORS, GLASS } from '../styles/globalStyles';

const petImages = {
  muscular: require('../assets/pet-strong.png'),
  happy: require('../assets/pet-happy.png'),
  normal: require('../assets/pet-happy.png'),
  sad: require('../assets/pet-sad.png'),
  sick: require('../assets/pet-fat.png'),
  dizzy: require('../assets/pet-fat.png'),
};

const STATUS_LABELS = {
  muscular: '💪 Hustle Mode',
  happy: '😊 Happy',
  normal: '😊 Happy',
  sad: '😢 Feeling Down',
  sick: '🍔 Overfed',
  dizzy: '🥴 Dizzy',
};

function NeonBar({ value, maxValue = 100, color, label, valueLabel }) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: Math.min(value / maxValue, 1),
      duration: 800,
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, [value]);

  const widthPercent = animWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.value, { color }]}>{valueLabel}</Text>
      </View>
      <View style={barStyles.track}>
        <Animated.View
          style={[
            barStyles.fill,
            { width: widthPercent, backgroundColor: color, opacity: glowAnim },
          ]}
        />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  value: { fontSize: 12, fontWeight: '700' },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});

export function PetCard({ petData }) {
  if (!petData) return null;
  const petImage = petImages[petData.status] || petImages.happy;
  const statusLabel = STATUS_LABELS[petData.status] || '😊 Happy';

  return (
    <View style={styles.card}>
      <Image source={petImage} style={styles.petImage} resizeMode="contain" />
      <Text style={styles.statusLabel}>{statusLabel}</Text>

      <View style={styles.barsContainer}>
        <NeonBar
          value={petData.mood}
          maxValue={100}
          color={COLORS.neonCyan}
          label="Mood"
          valueLabel={`${Math.min(petData.mood, 100)}%`}
        />
        <NeonBar
          value={petData.hp}
          maxValue={200}
          color={COLORS.neonGreen}
          label="HP"
          valueLabel={`${petData.hp}/200`}
        />
        <NeonBar
          value={68}
          maxValue={100}
          color={COLORS.neonPurple}
          label="Level 4 • XP"
          valueLabel="340/500"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...GLASS,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  petImage: { width: 180, height: 180, marginBottom: 12 },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  barsContainer: { width: '100%' },
});
