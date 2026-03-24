import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
} from "react-native";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Replace with your machine's local IP (run `ipconfig` → Wi-Fi IPv4 address)
const API_URL = "http://192.168.68.103:8000/api/v1/record-expense/";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── COLOR PALETTE ───────────────────────────────────────────────────────────
const C = {
  bg: "#0B0F1A",           // deep dark blue-black
  card: "#141929",         // slightly lighter card background
  cardBorder: "#1E2540",   // subtle border for cards
  accent: "#8B5CF6",       // vivid violet primary accent
  accentGlow: "#A78BFA",   // lighter glow variant
  red: "#EF4444",          // HP color & danger
  redSoft: "#FCA5A5",
  green: "#34D399",        // positive / HP high
  greenDark: "#059669",
  blue: "#60A5FA",         // mood high
  blueDark: "#2563EB",
  yellow: "#FBBF24",       // mood mid
  orange: "#FB923C",       // mood low / warning
  textPrimary: "#F1F5F9",  // bright text
  textSecondary: "#94A3B8", // muted text
  textMuted: "#64748B",     // very muted
  bubbleBg: "#1E293B",     // chat bubble bg
  overlay: "rgba(0,0,0,0.7)",
};

// ─── LOTTIE ANIMATION MAP ────────────────────────────────────────────────────
// Replace these with your own local Lottie JSON files:
//   e.g.  require("./assets/lottie/idle.json")
// For now, we use remote placeholder URLs from LottieFiles.
const LOTTIE_MAP = {
  idle: "https://lottie.host/d9396734-11c6-4096-9b1e-0990891e8e8a/7JwBH5hJVz.lottie",
  happy: "https://lottie.host/0266b4d6-4986-48c8-a40b-6147b8e6acea/lqb9IHVQ3l.lottie",
  sad: "https://lottie.host/f3252725-d14c-4ad1-98f2-71e7d7da0e0a/gYSqZzN6EQ.lottie",
  thinking: "https://lottie.host/d6c78893-6cf5-43ce-9c44-4da61030e53d/kJHF5b0g5f.lottie",
};

// Map pet.status → Lottie key
function getLottieForStatus(status) {
  switch (status) {
    case "happy":
    case "muscular":
      return LOTTIE_MAP.happy;
    case "dizzy":
    case "sick":
      return LOTTIE_MAP.sad;
    default:
      return LOTTIE_MAP.idle;
  }
}

// ─── ANIMATED PROGRESS BAR ──────────────────────────────────────────────────
function ProgressBar({ label, icon, value, maxValue = 200 }) {
  const pct = Math.min(value / maxValue, 1);
  const animWidth = useRef(new Animated.Value(pct)).current;

  // Determine color based on percentage
  let barColor, glowColor;
  if (pct > 0.6) {
    barColor = label === "HP" ? C.green : C.blue;
    glowColor = label === "HP" ? C.greenDark : C.blueDark;
  } else if (pct > 0.3) {
    barColor = C.yellow;
    glowColor = C.orange;
  } else {
    barColor = C.red;
    glowColor = C.red;
  }

  // Smoothly animate width changes
  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: pct,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const widthInterpolated = animWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.barContainer}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>
          {icon} {label}
        </Text>
        <Text style={[styles.barValue, { color: barColor }]}>
          {value} / {maxValue}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: widthInterpolated,
              backgroundColor: barColor,
              shadowColor: glowColor,
              shadowOpacity: 0.6,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─── EXPANDING WAVE RINGS (recording visualizer) ─────────────────────────────
function WaveRings({ active }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      [ring1, ring2, ring3].forEach((r) => {
        r.stopAnimation();
        r.setValue(0);
      });
      return;
    }

    const createLoop = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    createLoop(ring1, 0).start();
    createLoop(ring2, 400).start();
    createLoop(ring3, 800).start();
  }, [active]);

  if (!active) return null;

  const renderRing = (anim) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0],
    });
    return (
      <Animated.View
        style={[
          styles.waveRing,
          { transform: [{ scale }], opacity },
        ]}
      />
    );
  };

  return (
    <View style={styles.waveContainer}>
      {renderRing(ring1)}
      {renderRing(ring2)}
      {renderRing(ring3)}
    </View>
  );
}

// ─── LOADING OVERLAY ─────────────────────────────────────────────────────────
function LoadingOverlay({ visible }) {
  const spin = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotScale, {
          toValue: 0.8,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [visible]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlayBg}>
        <View style={styles.overlayCard}>
          {/* Animated spinner ring */}
          <Animated.View
            style={[styles.spinnerRing, { transform: [{ rotate }] }]}
          >
            <View style={styles.spinnerDot} />
          </Animated.View>

          {/* Lottie thinking animation */}
          <LottieView
            source={{ uri: LOTTIE_MAP.thinking }}
            autoPlay
            loop
            style={styles.thinkingLottie}
          />

          <Animated.Text
            style={[
              styles.overlayText,
              { transform: [{ scale: dotScale }] },
            ]}
          >
            Амьтан бодож байна...
          </Animated.Text>
          <Text style={styles.overlaySubText}>AI хариу боловсруулж байна</Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── CHAT BUBBLE ─────────────────────────────────────────────────────────────
function ChatBubble({ message }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.spring(fadeAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [message]);

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{message}</Text>
      </View>
      {/* Small triangle tail pointing down toward the pet */}
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [pet, setPet] = useState({ status: "normal", hp: 100, mood: 100 });
  const [petMessage, setPetMessage] = useState(
    "Сайн уу! Өнөөдөр юу худалдаж авсан бэ? 🐾"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const prevHp = useRef(pet.hp);

  // ── expo-audio recorder ──────────────────────────────────────────────────
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lottieRef = useRef(null);

  // ── Pulse animation on the record button while recording ─────────────────
  useEffect(() => {
    if (recorder.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [recorder.isRecording]);

  // ── Start recording with haptic feedback ─────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          "Зөвшөөрөл хэрэгтэй",
          "Микрофон ашиглах зөвшөөрөл өгнө үү."
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Light haptic when recording starts
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error("startRecording error:", err);
      Alert.alert("Алдаа", "Бичлэг эхлүүлж чадсангүй.");
    }
  }, [recorder]);

  // ── Stop recording, upload, and trigger haptic on result ─────────────────
  const stopRecordingAndUpload = useCallback(async () => {
    // Light haptic when recording stops
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        Alert.alert("Алдаа", "Аудио файл олдсонгүй.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/mp4",
        name: "audio.m4a",
      });

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Server ${response.status}: ${errBody}`);
      }

      const data = await response.json();

      // Determine if HP went up or down for haptic feedback
      const newHp = data.pet.hp;
      const oldHp = prevHp.current;

      setPet({
        status: data.pet.status,
        hp: newHp,
        mood: data.pet.mood,
      });
      setPetMessage(data.pet_message);
      setLastTransaction(data.transaction);
      prevHp.current = newHp;

      // Haptic feedback based on HP change
      if (newHp > oldHp) {
        // HP went up → success notification
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } else if (newHp < oldHp) {
        // HP went down → heavy/error vibration
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error("Upload error:", err);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
      Alert.alert("Алдаа", `Серверт холбогдож чадсангүй.\n${err.message}`);
      setPetMessage("Уучлаарай, ямар нэг зүйл буруу боллоо... 😿");
    } finally {
      setIsLoading(false);
    }
  }, [recorder]);

  // ── Toggle handler ──────────────────────────────────────────────────────
  function handleRecordPress() {
    if (recorder.isRecording) {
      stopRecordingAndUpload();
    } else {
      startRecording();
    }
  }

  // ── Derived values ──────────────────────────────────────────────────────
  const lottieSource = getLottieForStatus(pet.status);

  // Category label map (for nicer display)
  const categoryLabels = {
    food: "🍔 Хоол",
    transport: "🚌 Тээвэр",
    entertainment: "🎮 Зугаа",
    shopping: "🛍 Дэлгүүр",
    fitness: "🏋️ Фитнесс",
    savings: "💰 Хуримтлал",
    alcohol: "🍺 Архи",
    junk_food: "🍟 Хог хоол",
    general: "📦 Ерөнхий",
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LoadingOverlay visible={isLoading} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🐾 PET</Text>
          <Text style={styles.headerSub}>Finance Tracker</Text>
        </View>

        {/* ── Stats Card (HP + Mood) ───────────────────────────────────── */}
        <View style={styles.statsCard}>
          <ProgressBar label="HP" icon="❤️" value={pet.hp} />
          <View style={{ height: 12 }} />
          <ProgressBar label="Mood" icon="😊" value={pet.mood} />
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {pet.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Chat Bubble (above pet) ──────────────────────────────────── */}
        <ChatBubble message={petMessage} />

        {/* ── Pet Lottie Animation ─────────────────────────────────────── */}
        <View style={styles.petSection}>
          <LottieView
            ref={lottieRef}
            source={{ uri: lottieSource }}
            autoPlay
            loop
            style={styles.petLottie}
          />
        </View>

        {/* ── Last Transaction Card ────────────────────────────────────── */}
        {lastTransaction && (
          <View style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionLabel}>СҮҮЛИЙН ГҮЙЛГЭЭ</Text>
              <Text style={styles.transactionId}>
                #{lastTransaction.id}
              </Text>
            </View>
            <View style={styles.transactionBody}>
              <Text style={styles.transactionAmount}>
                {lastTransaction.amount.toLocaleString()}₮
              </Text>
              <View style={styles.transactionCatBadge}>
                <Text style={styles.transactionCatText}>
                  {categoryLabels[lastTransaction.category] ||
                    lastTransaction.category}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom: Record Button + Wave Rings ─────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.recordArea}>
          {/* Expanding wave rings while recording */}
          <WaveRings active={recorder.isRecording} />

          <TouchableOpacity
            onPress={handleRecordPress}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Animated.View
              style={[
                styles.recordBtn,
                recorder.isRecording && styles.recordBtnActive,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.recordBtnIcon}>
                {recorder.isRecording ? "⏹" : "🎙"}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
        <Text style={styles.recordLabel}>
          {recorder.isRecording
            ? "Сонсож байна... Зогсоохын тулд дарна уу"
            : "Зарлага бичихийн тулд дарна уу"}
        </Text>
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 160, // space for the bottom bar
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: C.textPrimary,
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: "600",
    color: C.accent,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginTop: 2,
  },

  // ── Stats Card ──────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  barContainer: {},
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  barLabel: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  barValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  statusBadge: {
    alignSelf: "center",
    marginTop: 14,
    backgroundColor: C.accent + "20",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  statusBadgeText: {
    color: C.accentGlow,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // ── Pet Section ─────────────────────────────────────────────────────────
  petSection: {
    alignItems: "center",
    marginVertical: 4,
  },
  petLottie: {
    width: 180,
    height: 180,
  },

  // ── Chat Bubble ─────────────────────────────────────────────────────────
  bubbleWrapper: {
    alignItems: "center",
    marginBottom: 4,
  },
  bubble: {
    backgroundColor: C.bubbleBg,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    maxWidth: SCREEN_W * 0.85,
    borderWidth: 1,
    borderColor: C.cardBorder,

    // Soft glow
    shadowColor: C.accent,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bubbleText: {
    color: C.textPrimary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: C.bubbleBg,
  },

  // ── Transaction Card ────────────────────────────────────────────────────
  transactionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  transactionLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  transactionId: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  transactionBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionAmount: {
    color: C.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
  transactionCatBadge: {
    backgroundColor: C.accent + "20",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  transactionCatText: {
    color: C.accentGlow,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Bottom Bar + Record Button ──────────────────────────────────────────
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: C.bg + "EE", // semi-transparent
  },
  recordArea: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",

    // Glow shadow
    shadowColor: C.accent,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  recordBtnActive: {
    backgroundColor: C.red,
    shadowColor: C.red,
  },
  recordBtnIcon: {
    fontSize: 30,
  },
  recordLabel: {
    color: C.textSecondary,
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Wave Rings (recording visualizer) ───────────────────────────────────
  waveContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  waveRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: C.red + "80",
  },

  // ── Loading Overlay ─────────────────────────────────────────────────────
  overlayBg: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  spinnerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: C.accent + "30",
    borderTopColor: C.accent,
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  spinnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    marginTop: -4,
  },
  thinkingLottie: {
    width: 100,
    height: 100,
  },
  overlayText: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  overlaySubText: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
});
