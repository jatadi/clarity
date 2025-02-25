import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AssemblyAIService } from '../services/AssemblyAIService';
import { DeepLService } from '../services/DeepLService';
import { ElevenLabsService } from '../services/ElevenLabsService';
import AudioPlayer from '../components/AudioPlayer';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

type TranscriptionViewProps = {
  audioUri: string | null;
};

type TranscriptionResult = {
  text: string;
  detectedLanguage?: string;
  confidence?: number;
  englishTranslation?: string;
  isTranslating?: boolean;
};

export default function TranscriptionView({ audioUri }: TranscriptionViewProps) {
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [enhancedAudioUri, setEnhancedAudioUri] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [enhancedSound, setEnhancedSound] = useState<Audio.Sound | null>(null);
  const [enhancedPlaybackStatus, setEnhancedPlaybackStatus] = useState<{
    isPlaying: boolean;
    positionMillis: number;
    durationMillis: number;
  } | null>(null);
  const deeplService = new DeepLService();
  const elevenLabsService = new ElevenLabsService();

  useEffect(() => {
    if (!audioUri) {
      setTranscription(null);
      return;
    }

    const transcribeAudio = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const assemblyAI = new AssemblyAIService();
        const uploadUrl = await assemblyAI.uploadAudio(audioUri);
        
        // Get initial transcription with language detection
        const { transcription: text, sourceLanguage, confidence } = 
          await assemblyAI.transcribeAndTranslate(uploadUrl);
        
        // If English, we're done
        if (sourceLanguage === 'en') {
          setTranscription({
            text,
            detectedLanguage: sourceLanguage,
            confidence
          });
          return;
        }

        // If not English, show original text and start translation
        setTranscription({
          text,
          detectedLanguage: sourceLanguage,
          confidence,
          isTranslating: true
        });

        // Translate in background
        try {
          const englishText = await deeplService.translateToEnglish(text, sourceLanguage);
          setTranscription(prev => prev ? {
            ...prev,
            englishTranslation: englishText,
            isTranslating: false
          } : null);
        } catch (err) {
          console.error('Translation error:', err);
          setTranscription(prev => prev ? {
            ...prev,
            isTranslating: false
          } : null);
        }

      } catch (err: any) {
        setError('Failed to transcribe audio');
        console.error('Transcription error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    transcribeAudio();
  }, [audioUri]);

  const handleEnhanceAudio = async () => {
    if (!transcription?.text) return;
    
    setIsGeneratingVoice(true);
    try {
      const audioUri = await elevenLabsService.synthesizeSpeech(transcription.text);
      setEnhancedAudioUri(audioUri);
    } catch (error) {
      console.error('Failed to enhance audio:', error);
      Alert.alert('Error', 'Failed to generate enhanced audio');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const handleEnhancedPlay = async () => {
    if (!enhancedAudioUri) return;

    try {
      if (enhancedSound) {
        if (enhancedPlaybackStatus?.isPlaying) {
          await enhancedSound.pauseAsync();
          setEnhancedPlaybackStatus(prev => prev ? { ...prev, isPlaying: false } : null);
        } else {
          if (enhancedPlaybackStatus?.positionMillis === enhancedPlaybackStatus?.durationMillis) {
            await enhancedSound.setPositionAsync(0);
          }
          await enhancedSound.playAsync();
          setEnhancedPlaybackStatus(prev => prev ? { ...prev, isPlaying: true } : null);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: enhancedAudioUri },
          { shouldPlay: true }
        );
        
        setEnhancedSound(newSound);
        
        const status = await newSound.getStatusAsync();
        if (status.isLoaded) {
          setEnhancedPlaybackStatus({
            isPlaying: true,
            positionMillis: 0,
            durationMillis: status.durationMillis || 0
          });
        }

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setEnhancedPlaybackStatus({
              isPlaying: status.isPlaying,
              positionMillis: status.positionMillis,
              durationMillis: status.durationMillis || 0
            });

            if (status.didJustFinish) {
              setEnhancedPlaybackStatus(prev => prev ? {
                ...prev,
                isPlaying: false,
                positionMillis: 0
              } : null);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to play enhanced audio:', error);
    }
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      // Add more as needed
    };
    return languages[code] || code;
  };

  useEffect(() => {
    return () => {
      if (enhancedSound) {
        enhancedSound.unloadAsync();
      }
    };
  }, [enhancedSound]);

  if (!audioUri) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transcription</Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Transcribing audio...</Text>
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
          
          {transcription.detectedLanguage !== 'en' && (
            <View style={styles.translationContainer}>
              <Text style={styles.translationTitle}>English Translation</Text>
              {transcription.isTranslating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.loadingText}>Translating...</Text>
                </View>
              ) : transcription.englishTranslation ? (
                <Text style={styles.transcriptionText}>
                  {transcription.englishTranslation}
                </Text>
              ) : null}
            </View>
          )}
          <View style={styles.enhanceContainer}>
            <TouchableOpacity 
              style={styles.enhanceButton}
              onPress={handleEnhanceAudio}
              disabled={isGeneratingVoice}
            >
              <Text style={styles.enhanceButtonText}>
                {isGeneratingVoice ? 'Generating...' : 'Play Enhanced Audio'}
              </Text>
            </TouchableOpacity>
            {enhancedAudioUri && (
              <TouchableOpacity 
                style={styles.playButton}
                onPress={handleEnhancedPlay}
              >
                <Ionicons 
                  name={enhancedPlaybackStatus?.isPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#007AFF" 
                />
                {enhancedPlaybackStatus && (
                  <Text style={styles.durationText}>
                    {formatDuration(enhancedPlaybackStatus.positionMillis)} / 
                    {formatDuration(enhancedPlaybackStatus.durationMillis)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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
  translationContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  translationTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    color: '#666',
  },
  enhanceContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  enhanceButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  enhanceButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 10,
  },
  durationText: {
    marginLeft: 10,
    color: '#666',
  },
}); 