import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AssemblyAIService } from '../services/AssemblyAIService';
import { DeepLService } from '../services/DeepLService';

type TranscriptionViewProps = {
  audioUri: string | null;
};

type TranscriptionResult = {
  text: string;
  originalText?: string;
  detectedLanguage?: string;
  confidence?: number;
};

export default function TranscriptionView({ audioUri }: TranscriptionViewProps) {
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const deeplService = new DeepLService();

  useEffect(() => {
    if (!audioUri) {
      setTranscription(null);
      setError('');
      return;
    }

    const transcribeAudio = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const assemblyAI = new AssemblyAIService();
        const uploadUrl = await assemblyAI.uploadAudio(audioUri);
        
        // Get transcription with language detection
        const { transcription: originalText, sourceLanguage, confidence } = 
          await assemblyAI.transcribeAndTranslate(uploadUrl);
        
        // If not English, translate to English
        let englishText = originalText;
        if (sourceLanguage !== 'en') {
          englishText = await deeplService.translateToEnglish(originalText, sourceLanguage);
        }
        
        setTranscription({
          text: englishText,
          originalText: sourceLanguage !== 'en' ? originalText : undefined,
          detectedLanguage: sourceLanguage,
          confidence
        });
      } catch (err: any) {
        let errorMessage = 'Failed to transcribe audio';
        if (err.message.includes('language detection')) {
          errorMessage = 'Could not detect spoken language';
        }
        setError(errorMessage);
        console.error('Transcription error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    transcribeAudio();
  }, [audioUri]);

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      // Add more as needed
    };
    return languages[code] || code;
  };

  if (!audioUri) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transcription</Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Transcribing audio...{'\n'}
            <Text style={styles.subText}>Auto-detecting language and converting to English</Text>
          </Text>
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : transcription ? (
        <View>
          {transcription.detectedLanguage && (
            <View style={styles.languageInfo}>
              <Text style={styles.languageText}>
                Detected Language: {getLanguageName(transcription.detectedLanguage)}
                {transcription.confidence && 
                  ` (${Math.round(transcription.confidence * 100)}% confidence)`
                }
              </Text>
            </View>
          )}
          <Text style={styles.transcriptionText}>{transcription.text}</Text>
        </View>
      ) : (
        <Text style={styles.transcriptionText}>No transcription available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  transcriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  languageInfo: {
    backgroundColor: '#e8e8e8',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  languageText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  subText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  }
}); 