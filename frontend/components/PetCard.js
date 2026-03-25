import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Pet images mapped to backend status values
const petImages = {
  muscular: require('../assets/pet-strong.png'),
  happy: require('../assets/pet-happy.png'),
  normal: require('../assets/pet-happy.png'),
  sad: require('../assets/pet-sad.png'),
  sick: require('../assets/pet-fat.png'),
  dizzy: require('../assets/pet-fat.png'),
};

export function PetCard({ petData }) {
  if (!petData) return null;

  const getEmotionColor = (mood) => {
    if (mood < 30) return '#FF6B6B';
    if (mood < 60) return '#FFA500';
    return '#4ECDC4';
  };

  const petImage = petImages[petData.status] || petImages.happy;

  return (
    <View style={styles.card}>
      {/* Pet Image — changes based on status */}
      <Image source={petImage} style={styles.petImage} resizeMode="contain" />

      {/* Status Label */}
      <Text style={styles.statusLabel}>
        {petData.status === 'muscular' ? '💪 Hustle Mode' :
         petData.status === 'sick' ? '🍔 Junk Food Mode' :
         petData.status === 'dizzy' ? '🥴 Dizzy' :
         petData.status === 'sad' ? '😢 Sad' :
         '😊 Happy'}
      </Text>

      {/* Mood Slider Display */}
      <View style={styles.moodContainer}>
        <Text style={styles.moodLabel}>Anxious</Text>
        <View style={styles.moodBar}>
          <View
            style={[
              styles.moodFill,
              {
                width: `${Math.min(petData.mood, 100)}%`,
                backgroundColor: getEmotionColor(petData.mood),
              },
            ]}
          />
        </View>
        <Text style={styles.moodLabel}>Happy</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Level {petData.level || 4}</Text>
          <Text style={styles.statValue}>XP: {petData.xp || '340/500'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Energy</Text>
          <Text style={styles.statValue}>{petData.hp || 40}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    elevation: 8,
  },
  petImage: { width: 220, height: 220, marginBottom: 12 },
  statusLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  moodContainer: { width: '100%', marginBottom: 16 },
  moodLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  moodBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodFill: { height: '100%' },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statCard: { flex: 1, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 12 },
  statLabel: { fontSize: 12, color: '#999' },
  statValue: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
