import React, { useState, useEffect } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import { AudioRecorder } from '../services/AudioRecorder';
import { Audio } from 'expo-av';

export default function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder] = useState(new AudioRecorder());
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);

  const handleRecord = async () => {
    if (isRecording) {
      try {
        const uri = await audioRecorder.stopRecording();
        setLastRecordingUri(uri);
        setIsRecording(false);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    } else {
      try {
        await audioRecorder.startRecording();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handlePlay = async () => {
    if (!lastRecordingUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: lastRecordingUri }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
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
      {lastRecordingUri && (
        <Button
          title="Play Recording"
          onPress={handlePlay}
        />
      )}
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
}); 