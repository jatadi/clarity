import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRecordings, deleteRecording } from '../database/Database';

type Recording = {
  id: string;
  filename: string;
  filepath: string;
  duration: number;
  created_at: string;
  transcription: string | null;
};

type PlaybackStatus = {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
};

export default function LibraryScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadRecordings();
      return () => {
        if (sound) {
          sound.unloadAsync();
        }
      };
    }, [])
  );

  const loadRecordings = async () => {
    try {
      const recordingsData = await getRecordings();
      setRecordings(recordingsData);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlayPause = async (recording: Recording) => {
    try {
      if (playingId === recording.id && sound) {
        // Toggle play/pause for current recording
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
          } else {
            await sound.playAsync();
          }
        }
      } else {
        // Stop current playback if any
        if (sound) {
          await sound.unloadAsync();
        }

        // Start new playback
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recording.filepath },
          { progressUpdateIntervalMillis: 1000 },
          (status) => {
            if (status.isLoaded) {
              setPlaybackStatus({
                isPlaying: status.isPlaying || false,
                positionMillis: status.positionMillis || 0,
                durationMillis: status.durationMillis || 0
              });
            }
          }
        );

        setSound(newSound);
        setPlayingId(recording.id);
        await newSound.playAsync();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleDelete = (recording: Recording) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecording(recording.id);
              loadRecordings(); // Refresh the list
            } catch (error) {
              console.error('Failed to delete recording:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          }
        }
      ]
    );
  };

  const renderRecording = (recording: Recording) => {
    const isExpanded = expandedId === recording.id;
    const isPlaying = playingId === recording.id;

    return (
      <View style={styles.recordingItem} key={recording.id}>
        <TouchableOpacity 
          style={styles.recordingHeader}
          onPress={() => setExpandedId(isExpanded ? null : recording.id)}
        >
          <View style={styles.titleRow}>
            <Text style={styles.filename}>{recording.filename}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(recording)}
            >
              <Ionicons name="trash-outline" size={24} color="red" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.date}>
            {new Date(recording.created_at).toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.playbackControls}>
              <TouchableOpacity
                onPress={() => handlePlayPause(recording)}
                style={styles.playButton}
              >
                <Ionicons 
                  name={isPlaying && playbackStatus?.isPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#007AFF"
                />
              </TouchableOpacity>
              
              {playbackStatus && (
                <Text style={styles.duration}>
                  {formatDuration(playbackStatus.positionMillis)} / 
                  {formatDuration(playbackStatus.durationMillis)}
                </Text>
              )}
            </View>

            {recording.transcription && (
              <View style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionTitle}>Transcription</Text>
                <Text style={styles.transcriptionText}>{recording.transcription}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {recordings.map(renderRecording)}
      {recordings.length === 0 && (
        <Text style={styles.emptyText}>No recordings yet</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  recordingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recordingHeader: {
    padding: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filename: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  expandedContent: {
    padding: 15,
    backgroundColor: '#f8f8f8',
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  playButton: {
    marginRight: 10,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  transcriptionContainer: {
    marginTop: 10,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  transcriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  deleteButton: {
    padding: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
}); 