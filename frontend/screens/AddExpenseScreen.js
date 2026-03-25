import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';
import { COLORS } from '../styles/globalStyles';

const API_URL = 'http://192.168.68.103:8000';

const EXPENSE_CATEGORIES = [
  { key: 'food', icon: 'fast-food', color: '#ff6b9d', label: 'Хоол' },
  { key: 'transport', icon: 'car', color: '#00d4ff', label: 'Тээвэр' },
  { key: 'fitness', icon: 'barbell', color: '#00ff88', label: 'Фитнесс' },
  { key: 'alcohol', icon: 'wine', color: '#c084fc', label: 'Архи' },
  { key: 'shopping', icon: 'bag-handle', color: '#fbbf24', label: 'Дэлгүүр' },
  { key: 'gifts', icon: 'gift', color: '#ff6b9d', label: 'Бэлэг' },
  { key: 'entertainment', icon: 'game-controller', color: '#ff9f43', label: 'Зугаа' },
  { key: 'savings', icon: 'wallet', color: '#00d4ff', label: 'Хадгаламж' },
  { key: 'health', icon: 'heart', color: '#ff4757', label: 'Эрүүл мэнд' },
];

const INCOME_CATEGORIES = [
  { key: 'salary', icon: 'cash', color: '#00ff88', label: 'Цалин' },
  { key: 'freelance', icon: 'laptop', color: '#00d4ff', label: 'Фриланс' },
  { key: 'business', icon: 'briefcase', color: '#fbbf24', label: 'Бизнес' },
  { key: 'investment', icon: 'trending-up', color: '#c084fc', label: 'Хөрөнгө оруулалт' },
  { key: 'gift_received', icon: 'gift', color: '#ff6b9d', label: 'Бэлэг' },
  { key: 'allowance', icon: 'wallet', color: '#818cf8', label: 'Тэтгэлэг' },
  { key: 'bonus', icon: 'trophy', color: '#fbbf24', label: 'Шагнал' },
  { key: 'refund', icon: 'arrow-undo', color: '#00d4ff', label: 'Буцаалт' },
  { key: 'other_income', icon: 'ellipsis-horizontal', color: '#94a3b8', label: 'Бусад' },
];

function SoundWave({ isActive }) {
  const bars = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (isActive) {
      bars.forEach((bar, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: 0.5 + Math.random() * 0.5,
              duration: 300 + i * 80,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: 0.2 + Math.random() * 0.2,
              duration: 300 + i * 80,
              useNativeDriver: false,
            }),
          ])
        ).start();
      });
    } else {
      bars.forEach((bar) => {
        bar.stopAnimation();
        bar.setValue(0.3);
      });
    }
  }, [isActive]);

  return (
    <View style={waveStyles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 40],
              }),
              backgroundColor: i % 2 === 0 ? COLORS.neonPink : COLORS.neonCyan,
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: 6,
  },
  bar: { width: 4, borderRadius: 2 },
});

export default function AddExpenseScreen({ navigation }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [txType, setTxType] = useState('expense');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const categories = txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    if (pulseLoop.current) pulseLoop.current.stop();
    pulseAnim.setValue(1);
  };

  const startRecording = async () => {
    try {
      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission needed', 'Microphone access is required.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const rec = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await rec.prepareToRecordAsync();
      rec.record();
      setRecording(rec);
      setIsRecording(true);
      setResult(null);
      startPulse();
    } catch (err) {
      console.error('Recording error:', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      stopPulse();
      setIsRecording(false);
      await recording.stop();
      const uri = recording.uri;
      setRecording(null);
      await sendAudioToBackend(uri);
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  };

  const sendAudioToBackend = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'audio/m4a',
        name: 'expense.m4a',
      });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_URL}/api/v1/record-expense/`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Server error');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.message || 'Failed to process.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!amount || !selectedCategory) {
      Alert.alert('Missing info', 'Please enter amount and select a category.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/add-expense/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(amount, 10),
          category: selectedCategory,
          type: txType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Server error');
      }
      const data = await res.json();
      setResult(data);
      setAmount('');
      setSelectedCategory(null);
    } catch (err) {
      console.error('Manual submit error:', err);
      Alert.alert('Error', err.message || 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>{txType === 'expense' ? 'Зарлага нэмэх' : 'Орлого нэмэх'}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Income / Expense Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, txType === 'expense' && styles.toggleBtnActiveExpense]}
              onPress={() => { setTxType('expense'); setSelectedCategory(null); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, txType === 'expense' && styles.toggleTextActiveExpense]}>Зарлага</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, txType === 'income' && styles.toggleBtnActiveIncome]}
              onPress={() => { setTxType('income'); setSelectedCategory(null); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, txType === 'income' && styles.toggleTextActiveIncome]}>Орлого</Text>
            </TouchableOpacity>
          </View>

          {/* Pet Feedback */}
          <View style={styles.petBubble}>
            <Text style={styles.petBubbleText}>
              {result?.pet_message
                ? `🐱 ${result.pet_message}`
                : txType === 'expense'
                ? '🐱 Юу авсан бэ? Хэлээч!'
                : '🐱 Орлого нэмж байна уу? Гоё!'}
            </Text>
          </View>

          {/* Voice Recording - Only for expenses */}
          {txType === 'expense' && (
          <View style={styles.glassCard}>
            <Text style={styles.sectionLabel}>Дуут Оруулах</Text>
            <View style={styles.micArea}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={
                      isRecording
                        ? ['#ff4757', '#ff6b9d']
                        : [COLORS.neonPink, COLORS.neonPurple]
                    }
                    style={styles.micBtn}
                  >
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={32}
                      color="#FFF"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              {isRecording && <SoundWave isActive={isRecording} />}
              <Text style={styles.micLabel}>
                {loading
                  ? 'Боловсруулж байна...'
                  : isRecording
                  ? 'Зогсоох'
                  : 'Бичлэг эхлүүлэх'}
              </Text>
              {isRecording && (
                <TouchableOpacity
                  onPress={() => {
                    stopPulse();
                    setIsRecording(false);
                    if (recording) recording.stop();
                    setRecording(null);
                  }}
                >
                  <Text style={styles.cancelText}>Цуцлах</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>гараар оруулах</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Manual Input */}
          <View style={styles.glassCard}>
            {/* Amount */}
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>₮</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Category Grid */}
            <Text style={styles.sectionLabel}>Ангилал</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryItem,
                      isSelected && { borderColor: cat.color, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: cat.color + (isSelected ? '40' : '18') },
                      ]}
                    >
                      <Ionicons name={cat.icon} size={24} color={cat.color} />
                    </View>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleManualSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={
                  txType === 'income'
                    ? [COLORS.neonGreen, COLORS.neonCyan]
                    : [COLORS.neonPink, COLORS.neonPurple]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtn}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.confirmText}>Баталгаажуулах</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Result Card */}
          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>✨ {txType === 'income' ? 'Орлого бүртгэгдлээ!' : 'Зарлага бүртгэгдлээ!'}</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Дүн</Text>
                <Text style={styles.resultValue}>
                  ₮{result.transaction?.amount?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Ангилал</Text>
                <Text style={styles.resultValue}>{result.transaction?.category}</Text>
              </View>
              <View style={styles.resultPet}>
                <Text style={styles.resultPetText}>🐱 {result.pet_message}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Муурын төлөв</Text>
                <Text style={styles.resultValue}>
                  {result.pet?.status} • HP {result.pet?.hp} • Сэтгэл {result.pet?.mood}
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleBtnActiveExpense: {
    backgroundColor: 'rgba(255, 107, 157, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.45)',
  },
  toggleBtnActiveIncome: {
    backgroundColor: 'rgba(0, 255, 136, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.45)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  toggleTextActiveExpense: {
    color: COLORS.neonPink,
  },
  toggleTextActiveIncome: {
    color: COLORS.neonGreen,
  },
  petBubble: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  petBubbleText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  micArea: { alignItems: 'center', paddingVertical: 8 },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.neonPink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  micLabel: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  cancelText: {
    fontSize: 13,
    color: COLORS.neonRed,
    marginTop: 8,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: 12,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.neonCyan,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    padding: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.neonGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  resultCard: {
    backgroundColor: 'rgba(0, 255, 136, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.25)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  resultTitle: { fontSize: 18, fontWeight: '700', color: COLORS.neonGreen, marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultLabel: { fontSize: 13, color: COLORS.textSecondary },
  resultValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  resultPet: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
  },
  resultPetText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
