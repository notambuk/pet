import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BottomNavigation } from '../components/BottomNavigation';
import { COLORS } from '../styles/globalStyles';

const API_URL = 'http://192.168.68.103:8000';

const petImages = {
  muscular: require('../assets/pet-strong.png'),
  happy: require('../assets/pet-happy.png'),
  ecstatic: require('../assets/pet-happy.png'),
  normal: require('../assets/pet-happy.png'),
  sad: require('../assets/pet-sad.png'),
  sick: require('../assets/pet-fat.png'),
  dizzy: require('../assets/pet-fat.png'),
};

export default function PetStatusScreen({ navigation }) {
  const [pet, setPet] = useState({ status: 'normal', hp: 100, mood: 100, level: 1, xp: 0, streak: 0, xp_required: 100 });

  useEffect(() => {
    fetchPet();
  }, []);

  const fetchPet = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/pet-status/`);
      const data = await res.json();
      setPet(data);
    } catch (e) {
      console.error('Error fetching pet:', e);
    }
  };

  const petImage = petImages[pet.status] || petImages.happy;

  const getHealthGrade = (hp) => {
    if (hp >= 80) return { grade: 'A', color: COLORS.neonGreen };
    if (hp >= 60) return { grade: 'B', color: COLORS.neonCyan };
    if (hp >= 40) return { grade: 'C', color: COLORS.neonYellow };
    if (hp >= 20) return { grade: 'D', color: COLORS.neonOrange };
    return { grade: 'F', color: COLORS.neonRed };
  };

  const health = getHealthGrade(pet.hp);

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      style={styles.container}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Муурын төлөв</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Pet Image */}
        <View style={styles.petContainer}>
          <Image source={petImage} style={styles.petImage} resizeMode="contain" />
          <Text style={styles.statusLabel}>
            {pet.status === 'muscular'
              ? '💪 Булчинлаг'
              : pet.status === 'sick'
              ? '🤢 Өвдсөн'
              : pet.status === 'dizzy'
              ? '😵 Толгой эргэж байна'
              : pet.status === 'sad'
              ? '😢 Гунигтай'
              : pet.status === 'ecstatic'
              ? '🤩 Маш жаргалтай'
              : '😊 Аз жаргалтай'}
          </Text>
        </View>

        {/* Emotion */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Сэтгэл</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderEmoji}>😢</Text>
            <View style={styles.sliderTrack}>
              <LinearGradient
                colors={[COLORS.neonPink, COLORS.neonCyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.sliderFill,
                  { width: `${Math.min(pet.mood, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.sliderEmoji}>😊</Text>
          </View>
          <Text style={styles.moodValue}>Сэтгэл: {pet.mood}%</Text>
        </View>

        {/* Health Grade */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Эрүүл Мэндийн Зэрэг</Text>
          <View style={styles.gradeRow}>
            <Text style={[styles.gradeText, { color: health.color }]}>
              {health.grade}
            </Text>
            <Text style={styles.hpText}>HP: {pet.hp}/100</Text>
          </View>
          <View style={styles.hpTrack}>
            <View
              style={[
                styles.hpFill,
                {
                  width: `${Math.min((pet.hp / 100) * 100, 100)}%`,
                  backgroundColor: health.color,
                },
              ]}
            />
          </View>
        </View>

        {/* XP Progress */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>XP Дэвшил</Text>
          <View style={styles.gradeRow}>
            <Text style={[styles.gradeText, { color: COLORS.neonPurple, fontSize: 32 }]}>
              Lv.{pet.level}
            </Text>
            <Text style={styles.hpText}>{pet.xp}/{pet.xp_required} XP</Text>
          </View>
          <View style={styles.hpTrack}>
            <View
              style={[
                styles.hpFill,
                {
                  width: `${pet.xp_required > 0 ? Math.min((pet.xp / pet.xp_required) * 100, 100) : 0}%`,
                  backgroundColor: COLORS.neonPurple,
                },
              ]}
            />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>❤️</Text>
            <Text style={styles.statValue}>{pet.hp}</Text>
            <Text style={styles.statLabel}>HP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>😊</Text>
            <Text style={styles.statValue}>{pet.mood}</Text>
            <Text style={styles.statLabel}>Сэтгэл</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{pet.level}</Text>
            <Text style={styles.statLabel}>Түвшин</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={[styles.glassCard, { alignItems: 'center' }]}>
          <Text style={{ fontSize: 32 }}>🔥</Text>
          <Text style={[styles.statValue, { marginTop: 8 }]}>{pet.streak}</Text>
          <Text style={styles.statLabel}>Өдрийн цуваа</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <LinearGradient
              colors={['#ff6b9d', '#ff4757']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionIcon}>🍖</Text>
              <Text style={styles.actionLabel}>Тэжээх</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <LinearGradient
              colors={['#00d4ff', '#00ff88']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionIcon}>🧹</Text>
              <Text style={styles.actionLabel}>Цэвэрлэх</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <LinearGradient
              colors={['#fbbf24', '#ff9f43']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionIcon}>🎮</Text>
              <Text style={styles.actionLabel}>Тоглох</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation active="PetStatus" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  petContainer: { alignItems: 'center', marginBottom: 24 },
  petImage: { width: 220, height: 220, marginBottom: 12 },
  statusLabel: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderEmoji: { fontSize: 20 },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: { height: '100%', borderRadius: 4 },
  moodValue: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeText: { fontSize: 48, fontWeight: '800' },
  hpText: { fontSize: 14, color: COLORS.textSecondary },
  hpTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 14,
  },
  hpFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1 },
  actionGradient: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});
