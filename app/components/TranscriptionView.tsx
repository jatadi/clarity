import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AssemblyAIService } from '../services/AssemblyAIService';

type TranscriptionViewProps = {
  audioUri: string | null;
};


export default function TranscriptionView({ audioUri}: TranscriptionViewProps) {
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!audioUri) {
      setTranscription('');
      setError('');
      return;
    }

    const transcribeAudio = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const assemblyAI = new AssemblyAIService();
        
        // First upload the audio file
        const uploadUrl = await assemblyAI.uploadAudio(audioUri);
        
        // Then get the transcription
        const text = await assemblyAI.transcribe(uploadUrl);
        setTranscription(text);

        // Save to database
        
      } catch (err) {
        setError('Failed to transcribe audio');
        console.error('Transcription error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    transcribeAudio();
  }, [audioUri]);

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
      ) : (
        <Text style={styles.transcriptionText}>{transcription || 'No transcription available'}</Text>
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
}); 