import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRecordings, deleteRecording, starRecording, renameRecording } from '../database/Database';

type Recording = {
  id: string;
  filename: string;
  filepath: string;
  duration: number;
  created_at: string;
  transcription: string | null;
  is_starred: boolean;
  starred_at: string | null;
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
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({});
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

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
      
      // Load durations for all recordings
      const durations: { [key: string]: number } = {};
      for (const recording of recordingsData) {
        try {
          const { sound } = await Audio.Sound.createAsync({ uri: recording.filepath });
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            durations[recording.id] = status.durationMillis || 0;
          }
          await sound.unloadAsync(); // Important: unload after getting duration
        } catch (error) {
          console.error(`Failed to get duration for ${recording.id}:`, error);
        }
      }
      setAudioDurations(durations);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlayRecording = async (recording: Recording) => {
    try {
      if (sound && playingId === recording.id) {
        // If the same recording is playing, toggle play/pause
        if (playbackStatus?.isPlaying) {
          await sound.pauseAsync();
          setPlaybackStatus(prev => prev ? {
            ...prev,
            isPlaying: false
          } : null);
        } else {
          await sound.playAsync();
          setPlaybackStatus(prev => prev ? {
            ...prev,
            isPlaying: true
          } : null);
        }
        return;
      }

      // If different recording or no sound, create new sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.filepath },
        { shouldPlay: true }
      );
      setSound(newSound);
      
      await newSound.setVolumeAsync(1.0);
      
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setPlaybackStatus({
          isPlaying: true,
          positionMillis: 0,
          durationMillis: status.durationMillis || audioDurations[recording.id] || 0
        });
      }
      setPlayingId(recording.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackStatus({
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis || audioDurations[recording.id] || 0
          });
          
          if (status.didJustFinish) {
            setPlayingId(null);
            setPlaybackStatus(prev => prev ? { ...prev, isPlaying: false } : null);
          }
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
      setPlayingId(null);
      setPlaybackStatus(null);
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

  const handleOptionsPress = (recording: Recording) => {
    setShowOptions(recording.id);
  };

  const handleStar = async (recording: Recording) => {
    try {
      await starRecording(recording.id, !recording.is_starred);
      loadRecordings();
    } catch (error) {
      console.error('Failed to star recording:', error);
      Alert.alert('Error', 'Failed to star recording');
    }
    setShowOptions(null);
  };

  const handleRename = (recording: Recording) => {
    // Remove extension from filename for editing
    const nameWithoutExtension = recording.filename.replace(/\.[^/.]+$/, '');
    setNewName(nameWithoutExtension);
    setIsRenaming(true);
    setShowOptions(null);
  };

  const handleRenameSubmit = async (recording: Recording) => {
    try {
      await renameRecording(recording.id, newName);
      await loadRecordings(); // Reload the list
      setIsRenaming(false);
    } catch (error) {
      console.error('Failed to rename recording:', error);
      Alert.alert('Error', 'Failed to rename recording');
    }
  };

  const renderRecording = (recording: Recording) => {
    const isExpanded = expandedId === recording.id;
    const isPlaying = playingId === recording.id;
    const duration = audioDurations[recording.id] || 0;

    return (
      <View style={styles.recordingItem} key={recording.id}>
        <TouchableOpacity 
          style={styles.recordingHeader}
          onPress={() => setExpandedId(isExpanded ? null : recording.id)}
        >
          <View style={styles.titleRow}>
            <Text style={styles.filename}>
              {recording.is_starred && <Ionicons name="star" size={16} color="#FFD700" />}
              {recording.filename}
            </Text>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOptionsPress(recording)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#666" />
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
                onPress={() => handlePlayRecording(recording)}
                style={styles.playButton}
              >
                <Ionicons 
                  name={isPlaying && playbackStatus?.isPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#007AFF"
                />
              </TouchableOpacity>
              
              <Text style={styles.duration}>
                {isPlaying && playbackStatus 
                  ? `${formatDuration(playbackStatus.positionMillis)} / ${formatDuration(playbackStatus.durationMillis)}`
                  : formatDuration(duration)}
              </Text>
            </View>

            {recording.transcription && (
              <View style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionTitle}>Transcription</Text>
                <Text style={styles.transcriptionText}>{recording.transcription}</Text>
              </View>
            )}
          </View>
        )}

        {showOptions === recording.id && (
          <View style={styles.optionsMenu}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => handleStar(recording)}
            >
              <Ionicons 
                name={recording.is_starred ? "star" : "star-outline"} 
                size={20} 
                color="#FFD700" 
              />
              <Text style={styles.optionText}>
                {recording.is_starred ? 'Unstar' : 'Star'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => handleRename(recording)}
            >
              <Ionicons name="pencil-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => handleDelete(recording)}
            >
              <Ionicons name="trash-outline" size={20} color="red" />
              <Text style={styles.optionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rename Modal */}
        <Modal
          visible={isRenaming}
          transparent
          animationType="fade"
          onRequestClose={() => setIsRenaming(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rename Recording</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  onPress={() => setIsRenaming(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleRenameSubmit(recording)}
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    Rename
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  optionsButton: {
    padding: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  optionsMenu: {
    position: 'absolute',
    right: 10,
    top: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 10,
    padding: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  modalButtonText: {
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    color: 'white',
  },
}); 