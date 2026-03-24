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
  ActivityIndicator,
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
import { BarChart } from "react-native-chart-kit";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Replace with your machine's local IP (run `ipconfig` → Wi-Fi IPv4 address)
const API_BASE = "http://192.168.68.103:8000/api/v1";

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
  income: "#34D399",       // green for income
  expense: "#EF4444",      // red for expense
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

// ─── DASHBOARD SCREEN ────────────────────────────────────────────────────────
function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stats/`);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      Alert.alert("Алдаа", "Статистик ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.dashboardLoading}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.dashboardLoadingText}>Ачааллаж байна...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.dashboardLoading}>
        <Text style={styles.dashboardLoadingText}>Мэдээлэл олдсонгүй</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
          <Text style={styles.retryBtnText}>Дахин оролдох</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const chartData = {
    labels: ["Долоо хоног", "Сар"],
    datasets: [
      {
        data: [stats.week.income, stats.month.income],
        color: () => C.income,
      },
      {
        data: [stats.week.expenses, stats.month.expenses],
        color: () => C.expense,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: C.card,
    backgroundGradientTo: C.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: () => C.textSecondary,
    barPercentage: 0.6,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: C.cardBorder,
    },
  };

  function formatMNT(val) {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}сая₮`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}мянга₮`;
    return `${val}₮`;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.dashboardContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Text style={styles.headerSub}>Орлого & Зарлага</Text>
      </View>

      {/* ── Weekly Summary Card ────────────────────────────────────────── */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📅 Энэ долоо хоног</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Орлого</Text>
            <Text style={[styles.summaryValue, { color: C.income }]}>
              {stats.week.income.toLocaleString()}₮
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Зарлага</Text>
            <Text style={[styles.summaryValue, { color: C.expense }]}>
              {stats.week.expenses.toLocaleString()}₮
            </Text>
          </View>
        </View>
        <View style={styles.summaryNetRow}>
          <Text style={styles.summaryNetLabel}>Цэвэр:</Text>
          <Text
            style={[
              styles.summaryNetValue,
              {
                color:
                  stats.week.income - stats.week.expenses >= 0
                    ? C.income
                    : C.expense,
              },
            ]}
          >
            {stats.week.income - stats.week.expenses >= 0 ? "+" : ""}
            {(stats.week.income - stats.week.expenses).toLocaleString()}₮
          </Text>
        </View>
      </View>

      {/* ── Monthly Summary Card ───────────────────────────────────────── */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>🗓 Энэ сар</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Орлого</Text>
            <Text style={[styles.summaryValue, { color: C.income }]}>
              {stats.month.income.toLocaleString()}₮
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Зарлага</Text>
            <Text style={[styles.summaryValue, { color: C.expense }]}>
              {stats.month.expenses.toLocaleString()}₮
            </Text>
          </View>
        </View>
        <View style={styles.summaryNetRow}>
          <Text style={styles.summaryNetLabel}>Цэвэр:</Text>
          <Text
            style={[
              styles.summaryNetValue,
              {
                color:
                  stats.month.income - stats.month.expenses >= 0
                    ? C.income
                    : C.expense,
              },
            ]}
          >
            {stats.month.income - stats.month.expenses >= 0 ? "+" : ""}
            {(stats.month.income - stats.month.expenses).toLocaleString()}₮
          </Text>
        </View>
      </View>

      {/* ── Bar Chart ──────────────────────────────────────────────────── */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Орлого vs Зарлага</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.income }]} />
            <Text style={styles.legendText}>Орлого</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.expense }]} />
            <Text style={styles.legendText}>Зарлага</Text>
          </View>
        </View>
        <BarChart
          data={{
            labels: ["Долоо хоног", "Сар"],
            datasets: [
              {
                data: [stats.week.income, stats.month.income],
              },
            ],
          }}
          width={SCREEN_W - 72}
          height={200}
          yAxisSuffix=""
          formatYLabel={(v) => formatMNT(Number(v))}
          chartConfig={{
            ...chartConfig,
            color: () => C.income,
            fillShadowGradientFrom: C.income,
            fillShadowGradientTo: C.income,
            fillShadowGradientOpacity: 0.8,
          }}
          style={styles.chart}
          fromZero
          showBarTops={false}
        />
        <BarChart
          data={{
            labels: ["Долоо хоног", "Сар"],
            datasets: [
              {
                data: [stats.week.expenses, stats.month.expenses],
              },
            ],
          }}
          width={SCREEN_W - 72}
          height={200}
          yAxisSuffix=""
          formatYLabel={(v) => formatMNT(Number(v))}
          chartConfig={{
            ...chartConfig,
            color: () => C.expense,
            fillShadowGradientFrom: C.expense,
            fillShadowGradientTo: C.expense,
            fillShadowGradientOpacity: 0.8,
          }}
          style={styles.chart}
          fromZero
          showBarTops={false}
        />
      </View>

      {/* ── Refresh button ─────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.refreshBtn} onPress={fetchStats}>
        <Text style={styles.refreshBtnText}>🔄 Шинэчлэх</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [pet, setPet] = useState({ status: "normal", hp: 100, mood: 100 });
  const [petMessage, setPetMessage] = useState(
    "Сайн уу! Өнөөдөр юу хийсэн бэ? 🐾"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const prevHp = useRef(pet.hp);

  // ── Fetch pet status on app load ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/pet-status/`);
        if (!res.ok) return;
        const data = await res.json();
        setPet({ status: data.status, hp: data.hp, mood: data.mood });
        prevHp.current = data.hp;
      } catch (err) {
        console.error("Failed to fetch pet status:", err);
      }
    })();
  }, []);

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

      const response = await fetch(`${API_BASE}/record-expense/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Server ${response.status}: ${errBody}`);
      }

      const data = await response.json();

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

      if (newHp > oldHp) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } else if (newHp < oldHp) {
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

  // Category label map
  const categoryLabels = {
    food: "🍔 Хоол",
    transport: "🚌 Тээвэр",
    entertainment: "🎮 Зугаа",
    shopping: "🛍 Дэлгүүр",
    fitness: "🏋️ Фитнесс",
    bills: "🧾 Төлбөр",
    alcohol: "🍺 Архи",
    salary: "💰 Цалин",
    bonus: "🎁 Урамшуулал",
    gift: "🎀 Бэлэг",
    investment: "📈 Хөрөнгө оруулалт",
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LoadingOverlay visible={isLoading} />

      {activeTab === "home" ? (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🐾 PET</Text>
              <Text style={styles.headerSub}>Finance Tracker</Text>
            </View>

            {/* ── Stats Card (HP + Mood) ───────────────────────────────── */}
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

            {/* ── Chat Bubble (above pet) ──────────────────────────────── */}
            <ChatBubble message={petMessage} />

            {/* ── Pet Lottie Animation ─────────────────────────────────── */}
            <View style={styles.petSection}>
              <LottieView
                ref={lottieRef}
                source={{ uri: lottieSource }}
                autoPlay
                loop
                style={styles.petLottie}
              />
            </View>

            {/* ── Last Transaction Card ────────────────────────────────── */}
            {lastTransaction && (
              <View style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionLabel}>СҮҮЛИЙН ГҮЙЛГЭЭ</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          lastTransaction.type === "income"
                            ? C.income + "20"
                            : C.expense + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color:
                            lastTransaction.type === "income"
                              ? C.income
                              : C.expense,
                        },
                      ]}
                    >
                      {lastTransaction.type === "income"
                        ? "↑ ОРЛОГО"
                        : "↓ ЗАРЛАГА"}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionBody}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          lastTransaction.type === "income"
                            ? C.income
                            : C.textPrimary,
                      },
                    ]}
                  >
                    {lastTransaction.type === "income" ? "+" : "-"}
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

          {/* ── Bottom: Record Button + Wave Rings ─────────────────────── */}
          <View style={styles.bottomBar}>
            <View style={styles.recordArea}>
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
                : "Орлого эсвэл зарлагаа бичихийн тулд дарна уу"}
            </Text>
          </View>
        </>
      ) : (
        <DashboardScreen />
      )}

      {/* ── Bottom Tab Bar ────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "home" && styles.tabItemActive]}
          onPress={() => setActiveTab("home")}
        >
          <Text style={styles.tabIcon}>🐾</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "home" && styles.tabLabelActive,
            ]}
          >
            Нүүр
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "dashboard" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "dashboard" && styles.tabLabelActive,
            ]}
          >
            Тайлан
          </Text>
        </TouchableOpacity>
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
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 16,
    paddingTop: 16,
    backgroundColor: C.bg + "EE",
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

  // ── Transaction Type Badge ──────────────────────────────────────────────
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // ── Tab Bar ─────────────────────────────────────────────────────────────
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: C.accent,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textMuted,
  },
  tabLabelActive: {
    color: C.accent,
  },

  // ── Dashboard ───────────────────────────────────────────────────────────
  dashboardContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  dashboardLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  dashboardLoadingText: {
    color: C.textSecondary,
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: C.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Summary Cards ───────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  summaryTitle: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.cardBorder,
  },
  summaryLabel: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  summaryNetRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  summaryNetLabel: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginRight: 8,
  },
  summaryNetValue: {
    fontSize: 18,
    fontWeight: "900",
  },

  // ── Chart Card ──────────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  chartTitle: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  chart: {
    borderRadius: 12,
    marginVertical: 4,
  },
  refreshBtn: {
    alignSelf: "center",
    backgroundColor: C.accent + "20",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  refreshBtnText: {
    color: C.accentGlow,
    fontSize: 14,
    fontWeight: "700",
  },
});
