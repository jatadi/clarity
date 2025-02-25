import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Text, TextInput, Modal, Alert, TouchableOpacity } from 'react-native';
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
      const timestamp = new Date().toISOString().split('T')[0]; // Get just the date part
      const filename = `${recordingName || 'Recording'}_${timestamp}.m4a`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.copyAsync({
        from: tempRecordingUri,
        to: newUri
      });

      // Save to database
      await saveRecording(
        filename,
        filename,
        newUri,
        recordingDuration
      );

      // Clear recording name
      setRecordingName('');
      setTempRecordingUri(null);
      setShowSaveModal(false);
      
      // Show success message
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

  return (
    <View style={styles.container}>
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={handleRecord}
      />
      
      {tempRecordingUri && (
        <>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={handlePlay}
            >
              <Ionicons 
                name={playbackStatus?.isPlaying ? "pause" : "play"} 
                size={24} 
                color="#007AFF" 
              />
              {playbackStatus && (
                <Text style={styles.durationText}>
                  {formatDuration(playbackStatus.positionMillis)} / {formatDuration(playbackStatus.durationMillis)}
                </Text>
              )}
            </TouchableOpacity>
            <Button
              title="Save Recording"
              onPress={() => setShowSaveModal(true)}
            />
          </View>
          
          <TranscriptionView audioUri={tempRecordingUri} />
        </>
      )}

      <Modal
        visible={showSaveModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Recording</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter recording name"
              value={recordingName}
              onChangeText={setRecordingName}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowSaveModal(false);
                  setRecordingName('');
                }}
              />
              <Button
                title="Save"
                onPress={handleSave}
                disabled={!recordingName}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  durationText: {
    marginLeft: 10,
    color: '#666',
  },
}); 