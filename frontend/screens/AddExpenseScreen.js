import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { setAudioModeAsync, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';

const API_URL = 'http://192.168.1.223:8000';

export default function AddExpenseScreen({ navigation }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
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
        Alert.alert('Permission needed', 'Microphone access is required to record expenses.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const rec = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await rec.prepareToRecordAsync();
      rec.record();
      setRecording(rec);
      setIsRecording(true);
      setResult(null);
      startPulse();
    } catch (err) {
      console.error('Failed to start recording:', err);
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
      console.error('Failed to stop recording:', err);
    }
  };

  const sendAudioToBackend = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'expense.m4a',
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_URL}/api/v1/record-expense/`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Server error');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.message || 'Failed to process expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#B3E5FC', '#E1BEE7']} style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Add Expense</Text>
        <Text style={styles.subtitle}>
          Tap the mic and describe your expense in Mongolian
        </Text>

        {/* Mic Button */}
        <View style={styles.micArea}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={loading}
            >
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.micLabel}>
            {loading
              ? 'Processing...'
              : isRecording
              ? 'Tap to stop'
              : 'Tap to record'}
          </Text>
        </View>

        {/* Result Card */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Expense Recorded!</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Amount:</Text>
              <Text style={styles.resultValue}>
                ₮{result.transaction.amount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Category:</Text>
              <Text style={styles.resultValue}>{result.transaction.category}</Text>
            </View>
            <View style={styles.petMessageBox}>
              <Text style={styles.petMessage}>🐱 {result.pet_message}</Text>
            </View>
            <View style={styles.petStatusRow}>
              <Text style={styles.petStatusLabel}>
                Pet: {result.pet.status} | HP: {result.pet.hp} | Mood: {result.pet.mood}
              </Text>
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16, paddingTop: 50 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 16, color: '#333' },
  title: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 40 },
  micArea: { alignItems: 'center', marginBottom: 40 },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9C27B0',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  micButtonRecording: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },
  micIcon: { fontSize: 48 },
  micLabel: { fontSize: 14, color: '#666', marginTop: 16 },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  resultTitle: { fontSize: 18, fontWeight: '700', color: '#4CAF50', marginBottom: 16 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: { fontSize: 14, color: '#666' },
  resultValue: { fontSize: 16, fontWeight: '600', color: '#000' },
  petMessageBox: {
    backgroundColor: '#F5F5FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  petMessage: { fontSize: 14, color: '#333', lineHeight: 20 },
  petStatusRow: { marginTop: 12, alignItems: 'center' },
  petStatusLabel: { fontSize: 12, color: '#999' },
});
