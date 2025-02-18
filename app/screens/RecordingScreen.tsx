import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Text, TextInput, Modal } from 'react-native';
import { Audio } from 'expo-av';
import { AudioRecorder } from '../services/AudioRecorder';
import * as FileSystem from 'expo-file-system';

export default function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder] = useState(new AudioRecorder());
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [tempRecordingUri, setTempRecordingUri] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordingName, setRecordingName] = useState('');

  const handleRecord = async () => {
    if (isRecording) {
      try {
        const uri = await audioRecorder.stopRecording();
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
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: tempRecordingUri }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  };

  const handleSave = async () => {
    if (!tempRecordingUri || !recordingName) return;

    try {
      const newFilename = `${recordingName.replace(/\s+/g, '_')}_${Date.now()}.m4a`;
      const newPath = `${FileSystem.documentDirectory}${newFilename}`;
      
      await FileSystem.moveAsync({
        from: tempRecordingUri,
        to: newPath
      });

      // Clear the temporary recording and name
      setTempRecordingUri(null);
      setRecordingName('');
      setShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
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
        <View style={styles.buttonContainer}>
          <Button
            title="Play Recording"
            onPress={handlePlay}
          />
          <Button
            title="Save Recording"
            onPress={() => setShowSaveModal(true)}
          />
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
}); 