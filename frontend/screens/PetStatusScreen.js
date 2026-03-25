import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = 'http://192.168.1.223:8000';

const petImages = {
  muscular: require('../assets/pet-strong.png'),
  happy: require('../assets/pet-happy.png'),
  normal: require('../assets/pet-happy.png'),
  sad: require('../assets/pet-sad.png'),
  sick: require('../assets/pet-fat.png'),
  dizzy: require('../assets/pet-fat.png'),
};

export default function PetStatusScreen({ navigation }) {
  const [pet, setPet] = useState({ status: 'normal', hp: 100, mood: 100 });

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
    if (hp >= 80) return { grade: 'A', color: '#4CAF50' };
    if (hp >= 60) return { grade: 'B', color: '#8BC34A' };
    if (hp >= 40) return { grade: 'C', color: '#FFC107' };
    if (hp >= 20) return { grade: 'D', color: '#FF9800' };
    return { grade: 'F', color: '#F44336' };
  };

  const health = getHealthGrade(pet.hp);

  return (
    <LinearGradient colors={['#B3E5FC', '#E1BEE7']} style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Pet Status</Text>

        {/* Pet Image */}
        <View style={styles.petContainer}>
          <Image source={petImage} style={styles.petImage} resizeMode="contain" />
          <Text style={styles.statusLabel}>
            {pet.status === 'muscular' ? '💪 Hustle Mode' :
             pet.status === 'sick' ? '🍔 Junk Food Mode' :
             pet.status === 'dizzy' ? '🥴 Dizzy' :
             pet.status === 'sad' ? '😢 Feeling Down' :
             '😊 Happy & Healthy'}
          </Text>
        </View>

        {/* Emotion Slider */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emotion</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>😢</Text>
            <View style={styles.sliderTrack}>
              <View
                style={[styles.sliderFill, { width: `${Math.min(pet.mood, 100)}%` }]}
              />
            </View>
            <Text style={styles.sliderLabel}>😊</Text>
          </View>
          <Text style={styles.moodValue}>Mood: {pet.mood}%</Text>
        </View>

        {/* Health Grade */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Health Grade</Text>
          <View style={styles.gradeContainer}>
            <Text style={[styles.grade, { color: health.color }]}>{health.grade}</Text>
            <Text style={styles.hpText}>HP: {pet.hp}/200</Text>
          </View>
          <View style={styles.hpBar}>
            <View
              style={[
                styles.hpFill,
                { width: `${Math.min((pet.hp / 200) * 100, 100)}%`, backgroundColor: health.color },
              ]}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>❤️</Text>
            <Text style={styles.statValue}>{pet.hp}</Text>
            <Text style={styles.statLabel}>HP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>😊</Text>
            <Text style={styles.statValue}>{pet.mood}</Text>
            <Text style={styles.statLabel}>Mood</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.actionIcon}>🍖</Text>
            <Text style={styles.actionLabel}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4ECDC4' }]}>
            <Text style={styles.actionIcon}>🧹</Text>
            <Text style={styles.actionLabel}>Clean</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFD93D' }]}>
            <Text style={styles.actionIcon}>🎮</Text>
            <Text style={styles.actionLabel}>Play</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, padding: 16, paddingTop: 50 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#333' },
  title: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 20 },
  petContainer: { alignItems: 'center', marginBottom: 20 },
  petImage: { width: 240, height: 240, marginBottom: 12 },
  statusLabel: { fontSize: 18, fontWeight: '600', color: '#333' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#333' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontSize: 20 },
  sliderTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  sliderFill: { height: '100%', backgroundColor: '#4ECDC4', borderRadius: 5 },
  moodValue: { fontSize: 12, color: '#999', marginTop: 8, textAlign: 'center' },
  gradeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grade: { fontSize: 48, fontWeight: '800' },
  hpText: { fontSize: 14, color: '#666' },
  hpBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 12,
  },
  hpFill: { height: '100%', borderRadius: 5 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    elevation: 4,
  },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
