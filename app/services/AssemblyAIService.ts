import * as FileSystem from 'expo-file-system';

export class AssemblyAIService {
  private apiKey: string;
  private baseUrl = 'https://api.assemblyai.com/v2';

  constructor() {
    this.apiKey = 'dac8d7b59ac9423e8b02f598509188b1';
  }

  async uploadAudio(fileUri: string | null): Promise<string> {
    if (!fileUri) {
      throw new Error('No audio file provided');
    }

    try {
      // Read file as binary data
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/octet-stream'
        },
        body: blob
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      const data = await uploadResponse.json();
      return data.upload_url;
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  }

  async transcribe(audioUrl: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`Transcription request failed with status ${response.status}`);
      }

      const data = await response.json();
      return this.pollTranscriptionStatus(data.id);
    } catch (error) {
      console.error('Transcription request error details:', error);
      throw error;
    }
  }

  private async pollTranscriptionStatus(transcriptId: string): Promise<string> {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`Polling failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Polling status:', data.status); // Debug log
        
        if (data.status === 'completed') {
          return data.text;
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Transcription failed');
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        console.error('Polling attempt error details:', error);
        throw error;
      }
    }

    throw new Error('Transcription timed out');
  }

  async transcribeAndTranslate(audioUrl: string, sourceLanguage: string = 'auto', targetLanguage: string = 'en'): Promise<{
    transcription: string;
    sourceLanguage: string;
    confidence: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_detection: true,
          language_code: null,
          format_text: true
        })
      });

      if (!response.ok) {
        throw new Error(`Translation request failed with status ${response.status}`);
      }

      const data = await response.json();
      return this.pollTranscriptionAndTranslation(data.id, targetLanguage);
    } catch (error) {
      console.error('Translation request error:', error);
      throw error;
    }
  }

  private async pollTranscriptionAndTranslation(transcriptId: string, targetLanguage: string): Promise<{
    transcription: string;
    sourceLanguage: string;
    confidence: number;
  }> {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
          headers: {
            'Authorization': this.apiKey
          }
        });

        if (!response.ok) {
          throw new Error(`Polling failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log('Translation status:', data.status);
        
        if (data.status === 'completed') {
          return {
            transcription: data.text,
            sourceLanguage: data.language_code,
            confidence: data.confidence || 1.0
          };
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Translation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        console.error('Translation polling error:', error);
        throw error;
      }
    }

    throw new Error('Translation timed out');
  }
} 