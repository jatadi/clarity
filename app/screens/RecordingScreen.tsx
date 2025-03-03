import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, Modal, Alert, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { AudioRecorder } from '../services/AudioRecorder';
import * as FileSystem from 'expo-file-system';
import TranscriptionView from '../components/TranscriptionView';
import { saveRecording } from '../database/Database';
import { Ionicons } from '@expo/vector-icons';

export default function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder] = useState(new AudioRecorder());
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [tempRecordingUri, setTempRecordingUri] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [playbackStatus, setPlaybackStatus] = useState<{
    isPlaying: boolean;
    positionMillis: number;
    durationMillis: number;
  } | null>(null);

  const transcriptionRef = useRef<{ getText: () => string | null }>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleRecord = async () => {
    if (isRecording) {
      try {
        const uri = await audioRecorder.stopRecording();
        const { sound } = await Audio.Sound.createAsync({ uri });
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setRecordingDuration(status.durationMillis ?? 0);
        }
        await sound.unloadAsync();
        setTempRecordingUri(uri);
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    } else {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      try {
        await audioRecorder.startRecording();
        setIsRecording(true);
        // Clear previous temporary recording
        setTempRecordingUri(null);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handlePlay = async () => {
    if (!tempRecordingUri) return;

    try {
      if (sound) {
        if (playbackStatus?.isPlaying) {
          await sound.pauseAsync();
          setPlaybackStatus(prev => prev ? { ...prev, isPlaying: false } : null);
        } else {
          if (playbackStatus?.positionMillis === playbackStatus?.durationMillis) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setPlaybackStatus(prev => prev ? { ...prev, isPlaying: true } : null);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: tempRecordingUri },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        
        // Initialize status after creating sound
        const status = await newSound.getStatusAsync();
        if (status.isLoaded) {
          setPlaybackStatus({
            isPlaying: true,
            positionMillis: 0,
            durationMillis: status.durationMillis || 0
          });
        }

        // Set up status updates
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlaybackStatus({
              isPlaying: status.isPlaying,
              positionMillis: status.positionMillis,
              durationMillis: status.durationMillis || 0
            });

            if (status.didJustFinish) {
              setPlaybackStatus(prev => prev ? {
                ...prev,
                isPlaying: false,
                positionMillis: 0
              } : null);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  };

  const handleSave = async () => {
    if (!tempRecordingUri || !recordingName) return;

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${recordingName || 'Recording'}_${timestamp}.m4a`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.copyAsync({
        from: tempRecordingUri,
        to: newUri
      });

      // Get the transcription from the TranscriptionView component
      const currentTranscription = transcriptionRef.current?.getText();
      console.log('Current transcription:', currentTranscription); // Debug log

      await saveRecording(
        filename, // Using filename as ID
        filename,
        newUri,
        recordingDuration,
        currentTranscription
      );

      setRecordingName('');
      setTempRecordingUri(null);
      setShowSaveModal(false);
      Alert.alert('Success', 'Recording saved successfully');
    } catch (error) {
      console.error('Failed to save recording:', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
      bounces={true}
    >
      <View style={styles.container}>
        <View style={styles.recordingContainer}>
          <Animated.View style={[styles.recordButtonContainer, {
            transform: [{ scale: pulseAnim }]
          }]}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingActive
              ]}
              onPress={handleRecord}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={40} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {tempRecordingUri && (
          <View style={styles.playbackContainer}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={handlePlay}
            >
              <Ionicons 
                name={playbackStatus?.isPlaying ? "pause" : "play"} 
                size={24} 
                color="#3B82F6" 
              />
              {playbackStatus && (
                <Text style={styles.durationText}>
                  {formatDuration(playbackStatus.positionMillis)} / {formatDuration(playbackStatus.durationMillis)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowSaveModal(true)}
            >
              <Text style={styles.primaryButtonText}>Save Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={showSaveModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Save Recording</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter recording name"
                value={recordingName}
                onChangeText={setRecordingName}
                placeholderTextColor="#666"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setShowSaveModal(false);
                    setRecordingName('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, !recordingName && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={!recordingName}
                >
                  <Text style={styles.primaryButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {tempRecordingUri && (
          <TranscriptionView 
            ref={transcriptionRef}
            audioUri={tempRecordingUri} 
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    minHeight: '100%',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // More padding at bottom
  },
  recordingContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  recordButtonContainer: {
    alignItems: 'center',
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  recordingActive: {
    backgroundColor: '#1E3A8A',
    transform: [{ scale: 1.05 }],
  },
  playbackContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
    maxWidth: 200,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  secondaryButtonText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  durationText: {
    marginLeft: 15,
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '500',
  },
}); 