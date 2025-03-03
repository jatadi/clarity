import * as FileSystem from 'expo-file-system';

export class ElevenLabsService {
  private apiKey = 'sk_f4ebe2c15acce02e6ac60a286eb991e83b100225ba302e6a';
  private femaleVoiceId = '21m00Tcm4TlvDq8ikWAM';
  private maleVoiceId = 'iP95p4xoKVk53GoZ742B';

  async synthesizeSpeech(text: string, gender: 'male' | 'female' = 'female'): Promise<string> {
    try {
      const voiceId = gender === 'male' ? this.maleVoiceId : this.femaleVoiceId;
      const baseUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        console.error('Response:', await response.text());
        throw new Error(`Voice synthesis failed with status ${response.status}`);
      }

      // Save the audio data directly
      const audioData = await response.blob();
      const fileName = `enhanced_${Date.now()}.mp3`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(audioData);
      });

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      return fileUri;
    } catch (error) {
      console.error('Voice synthesis error:', error);
      throw error;
    }
  }

  async getVoices(): Promise<Array<{ id: string, name: string }>> {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get voices with status ${response.status}`);
      }

      const data = await response.json();
      return data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name
      }));
    } catch (error) {
      console.error('Failed to get voices:', error);
      throw error;
    }
  }
} 