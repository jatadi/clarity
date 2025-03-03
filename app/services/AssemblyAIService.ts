import * as FileSystem from 'expo-file-system';

type Utterance = {
  confidence: number;
  end: number;
  speaker: string;
  start: number;
  text: string;
  words: {
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string;
  }[];
};

type Entity = {
  text: string;
  type: string;
  start: number;
  end: number;
};

type TranscriptionResponse = {
  text: string;
  language_code?: string;
  confidence?: number;
  utterances?: Utterance[];
  entities?: Entity[];
  error?: string;
};

export class AssemblyAIService {
  private apiKey = 'dac8d7b59ac9423e8b02f598509188b1';
  private baseUrl = 'https://api.assemblyai.com/v2';

  constructor() {
    this.apiKey = 'dac8d7b59ac9423e8b02f598509188b1';
  }

  async uploadAudio(fileUri: string | null): Promise<string> {
    if (!fileUri) {
      throw new Error('No audio file provided');
    }

    try {
      console.log('Starting audio upload:', fileUri);
      const response = await fetch(fileUri);
      const blob = await response.blob();
      console.log('Audio blob size:', blob.size);

      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/octet-stream'
        },
        body: blob
      });

      const responseText = await uploadResponse.text();
      console.log('Upload response:', responseText);

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Upload successful, URL:', data.upload_url);
      return data.upload_url;
    } catch (error) {
      console.error('Upload error:', error);
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

  async transcribeAndTranslate(audioUrl: string): Promise<{
    transcription: string;
    sourceLanguage: string;
    confidence: number;
    utterances?: Utterance[];
    error?: string;
  }> {
    try {
      console.log('Starting transcription with diarization...', audioUrl);
      const response = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'Authorization': `${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_detection: true,
          speaker_labels: true,
          format_text: false
        })
      });

      const responseText = await response.text();
      console.log('Initial response:', responseText);

      if (!response.ok) {
        console.error('Response not OK:', response.status, responseText);
        return {
          transcription: '',
          sourceLanguage: 'en',
          confidence: 0,
          error: `Transcription failed: ${responseText}`
        };
      }

      const data = JSON.parse(responseText);
      console.log('Starting transcription with ID:', data.id);

      const result = await this.pollTranscriptionResult(data.id);
      console.log('Got transcription result:', result);

      if (!result.text || result.text.trim() === '') {
        return {
          transcription: '',
          sourceLanguage: 'en',
          confidence: 0,
          error: 'No transcription received'
        };
      }

      let formattedText = result.text;
      if (result.utterances && result.utterances.length > 0) {
        const speakerNames = new Map<string, string>();
        
        result.utterances.forEach(utterance => {
          const nameMatch = utterance.text.match(/(?:I am|My name is|I'm|This is) ([A-Z][a-z]+ ?(?:[A-Z][a-z]+)?)/i);
          if (nameMatch && nameMatch[1]) {
            speakerNames.set(utterance.speaker, nameMatch[1].trim());
          } else if (result.entities) {
            const nameEntity = result.entities.find(entity => 
              entity.type === 'person' && 
              utterance.text.includes(entity.text)
            );
            if (nameEntity) {
              speakerNames.set(utterance.speaker, nameEntity.text);
            }
          }
        });

        formattedText = result.utterances
          .map(u => {
            const speakerName = speakerNames.get(u.speaker);
            const speakerLabel = speakerName || `Speaker ${u.speaker.charCodeAt(0) - 64}`;
            return `${speakerLabel}: ${u.text.trim()}`;
          })
          .join('\n');

        console.log('Detected speaker names:', Object.fromEntries(speakerNames));
      }

      return {
        transcription: formattedText,
        sourceLanguage: result.language_code || 'en',
        confidence: result.confidence || 1.0,
        utterances: result.utterances
      };
    } catch (error) {
      console.error('Full transcription error:', error);
      return {
        transcription: '',
        sourceLanguage: 'en',
        confidence: 0,
        error: 'Transcription failed'
      };
    }
  }

  private async pollTranscriptionResult(transcriptId: string): Promise<TranscriptionResponse> {
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
          return {
            text: '',
            language_code: 'en',
            confidence: 0,
            error: 'No spoken audio detected'
          };
        }

        const data = await response.json();
        console.log('Transcription status:', data.status);
        
        if (data.status === 'completed') {
          return data;
        } else if (data.status === 'error' || data.error) {
          return {
            text: '',
            language_code: 'en',
            confidence: 0,
            error: data.error || 'No spoken audio detected'
          };
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        return {
          text: '',
          language_code: 'en',
          confidence: 0,
          error: 'No spoken audio detected'
        };
      }
    }

    return {
      text: '',
      language_code: 'en',
      confidence: 0,
      error: 'Transcription timed out'
    };
  }
} 