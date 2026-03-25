import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/globalStyles';

/* ── Pet image map (replace with Lottie when ready) ────────────────────── */
const petImages = {
  muscular: require('../assets/pet-strong.png'),
  happy: require('../assets/pet-happy.png'),
  ecstatic: require('../assets/pet-happy.png'),
  normal: require('../assets/pet-happy.png'),
  sad: require('../assets/pet-sad.png'),
  sick: require('../assets/pet-fat.png'),
  dizzy: require('../assets/pet-fat.png'),
};

/*
 * ── Lottie Boilerplate (uncomment when you have .json files) ────────────
 *
 * import LottieView from 'lottie-react-native';
 *
 * const lottieMap = {
 *   happy:    require('../assets/lottie/cat-happy.json'),
 *   ecstatic: require('../assets/lottie/cat-ecstatic.json'),
 *   sad:      require('../assets/lottie/cat-sad.json'),
 *   sick:     require('../assets/lottie/cat-sick.json'),
 *   muscular: require('../assets/lottie/cat-muscular.json'),
 *   dizzy:    require('../assets/lottie/cat-dizzy.json'),
 *   normal:   require('../assets/lottie/cat-normal.json'),
 * };
 *
 * In the render, replace <Image> with:
 * <LottieView
 *   source={lottieMap[status] || lottieMap.normal}
 *   autoPlay
 *   loop
 *   style={{ width: 180, height: 180 }}
 * />
 */

/* ── Status → Aura gradient + shadow glow ────────────────────────────── */
const AURA_MAP = {
  ecstatic: {
    gradient: ['rgba(255, 215, 0, 0.25)', 'rgba(255, 107, 157, 0.20)'],
    shadow: '#fbbf24',
  },
  sick: {
    gradient: ['rgba(76, 175, 80, 0.15)', 'rgba(50, 50, 50, 0.25)'],
    shadow: '#4caf50',
  },
  sad: {
    gradient: ['rgba(30, 60, 120, 0.25)', 'rgba(80, 80, 120, 0.20)'],
    shadow: '#5c6bc0',
  },
  muscular: {
    gradient: ['rgba(255, 87, 34, 0.20)', 'rgba(255, 159, 67, 0.18)'],
    shadow: '#ff5722',
  },
  dizzy: {
    gradient: ['rgba(156, 39, 176, 0.22)', 'rgba(63, 81, 181, 0.18)'],
    shadow: '#9c27b0',
  },
  happy: {
    gradient: ['rgba(0, 212, 255, 0.12)', 'rgba(0, 255, 136, 0.10)'],
    shadow: '#00d4ff',
  },
  normal: {
    gradient: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'],
    shadow: 'rgba(255,255,255,0.15)',
  },
};

/* ── Status → Mongolian pill label ───────────────────────────────────── */
const STATUS_PILL = {
  ecstatic: '🤩 Маш жаргалтай',
  happy: '😊 Аз жаргалтай',
  normal: '😐 Хэвийн',
  sad: '😢 Гунигтай',
  sick: '🤢 Өвдсөн',
  muscular: '💪 Булчинлаг',
  dizzy: '😵 Толгой эргэж байна',
};

/* ── Smart Progress Bar ──────────────────────────────────────────────── */
function SmartBar({ value, maxValue = 100, label, icon }) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pct = Math.min(value / maxValue, 1);

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // Pulse when critical (<= 20%)
  useEffect(() => {
    if (pct <= 0.2 && pct > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pct]);

  const barColor =
    pct <= 0.2 ? '#ff4757' : pct <= 0.6 ? '#fbbf24' : COLORS.neonGreen;

  const widthInterp = animWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>
          {icon} {label}
        </Text>
        <Text style={[barStyles.value, { color: barColor }]}>
          {value}/{maxValue}
        </Text>
      </View>
      <View style={barStyles.track}>
        <Animated.View
          style={[
            barStyles.fill,
            {
              width: widthInterp,
              backgroundColor: barColor,
              opacity: pulseAnim,
            },
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
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
});

/* ── XP Progress Bar ─────────────────────────────────────────────────── */
function XPBar({ xp, xpRequired, level }) {
  const animWidth = useRef(new Animated.Value(0)).current;
  const pct = xpRequired > 0 ? Math.min(xp / xpRequired, 1) : 0;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const widthInterp = animWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>⭐ Түвшин {level} • XP</Text>
        <Text style={[barStyles.value, { color: COLORS.neonPurple }]}>
          {xp}/{xpRequired}
        </Text>
      </View>
      <View style={barStyles.track}>
        <Animated.View
          style={[
            barStyles.fill,
            { width: widthInterp, backgroundColor: COLORS.neonPurple },
          ]}
        />
      </View>
    </View>
  );
}

/* ── Main DynamicMascot Component ────────────────────────────────────── */
export function DynamicMascot({ petData }) {
  if (!petData) return null;

  const status = petData.status || 'normal';
  const hp = petData.hp ?? 100;
  const mood = petData.mood ?? 100;
  const level = petData.level ?? 1;
  const xp = petData.xp ?? 0;
  const xpRequired = petData.xp_required ?? 100;
  const streak = petData.streak ?? 0;

  const aura = AURA_MAP[status] || AURA_MAP.normal;
  const pillLabel = STATUS_PILL[status] || STATUS_PILL.normal;
  const petImage = petImages[status] || petImages.normal;

  return (
    <View
      style={[
        styles.card,
        Platform.OS === 'ios' && { shadowColor: aura.shadow, shadowOpacity: 0.5 },
      ]}
    >
      {/* Aura glow background */}
      <LinearGradient
        colors={aura.gradient}
        style={styles.auraGlow}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Pet image (swap for LottieView when ready) */}
      <Image source={petImage} style={styles.petImage} resizeMode="contain" />

      {/* Status pill */}
      <View style={styles.statusPill}>
        <Text style={styles.statusPillText}>{pillLabel}</Text>
      </View>

      {/* Streak badge */}
      {streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {streak} өдрийн цуваа</Text>
        </View>
      )}

      {/* Progress bars */}
      <View style={styles.barsContainer}>
        <SmartBar value={hp} maxValue={100} label="HP" icon="❤️" />
        <SmartBar value={mood} maxValue={100} label="Сэтгэл" icon="😊" />
        <XPBar xp={xp} xpRequired={xpRequired} level={level} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 30,
      },
      android: { elevation: 10 },
    }),
  },
  auraGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  petImage: {
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 10,
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 159, 67, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 14,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.neonOrange,
  },
  barsContainer: {
    width: '100%',
  },
});
