import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

export class AudioRecorder {
  private recording: Audio.Recording | null = null;

  async setupAudioSession() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to setup audio session:', error);
      throw error;
    }
  }

  getNewAudioFileURL(): string {
    const timestamp = Date.now();
    return `${FileSystem.documentDirectory}recording_${timestamp}.m4a`;
  }

  async startRecording(): Promise<string> {
    try {
      await this.setupAudioSession();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;
      return this.getNewAudioFileURL();
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri || '';
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }
} 