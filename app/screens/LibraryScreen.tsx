import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRecordings, deleteRecording, starRecording, renameRecording, getTranscriptionForRecording } from '../database/Database';
import { GestureResponderEvent } from 'react-native';

type Recording = {
  id: string;
  filename: string;
  filepath: string;
  duration: number;
  created_at: string;
  is_starred: boolean;
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
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({});
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);
  const [optionsPosition, setOptionsPosition] = useState<{ top: number; right: number } | null>(null);

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
      
      // Fetch transcriptions for each recording
      const recordingsWithTranscriptions = await Promise.all(
        recordingsData.map(async (recording) => {
          const transcription = await getTranscriptionForRecording(recording.id);
          return {
            ...recording,
            transcription
          };
        })
      );

      setRecordings(recordingsWithTranscriptions);
      
      // Load durations for all recordings
      const durations: { [key: string]: number } = {};
      for (const recording of recordingsWithTranscriptions) {
        try {
          const { sound } = await Audio.Sound.createAsync({ uri: recording.filepath });
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            durations[recording.id] = status.durationMillis || 0;
          }
          await sound.unloadAsync();
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
    if (showOptions === recording.id) {
      setShowOptions(null);
      setOptionsPosition(null);
    } else {
      // Set position relative to the recording card
      setOptionsPosition({
        top: 50,  // Height of the recording header
        right: 20,
      });
      setShowOptions(recording.id);
    }
  };

  const handleStar = async (recording: Recording) => {
    try {
      const newStarredStatus = !recording.is_starred;
      await starRecording(recording.id, newStarredStatus);
      
      // Update local state
      setRecordings(prevRecordings => 
        prevRecordings.map(r => 
          r.id === recording.id 
            ? { ...r, is_starred: newStarredStatus }
            : r
        )
      );
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
      const newFilename = await renameRecording(recording.id, newName);
      // Update the recording in the local state
      setRecordings(recordings.map(r => 
        r.id === recording.id 
          ? { ...r, filename: newFilename }
          : r
      ));
      setIsRenaming(false);
      setNewName('');
    } catch (error) {
      console.error('Failed to rename recording:', error);
      Alert.alert('Error', 'Failed to rename recording');
    }
  };

  const handleShowTranscription = async (recording: Recording) => {
    console.log('Showing transcription for recording:', recording);
    const transcription = await getTranscriptionForRecording(recording.id);
    console.log('Retrieved transcription:', transcription);
    setSelectedTranscription(transcription);
    setShowTranscriptionModal(true);
    setShowOptions(null);
  };

  const renderRecording = (recording: Recording) => {
    const isExpanded = expandedId === recording.id;
    const isPlaying = playingId === recording.id;
    const duration = audioDurations[recording.id] || 0;

    return (
      <View 
        style={[
          styles.recordingCard,
          showOptions === recording.id && styles.activeCard
        ]} 
        key={recording.id}
      >
        <TouchableOpacity 
          style={styles.recordingHeader}
          onPress={() => setExpandedId(isExpanded ? null : recording.id)}
        >
          <View style={styles.titleRow}>
            <Text style={styles.filename}>
              {recording.filename}
            </Text>
            {recording.is_starred && (
              <Ionicons name="star" size={20} color="#FACC15" />
            )}
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOptionsPress(recording)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#1E3A8A" />
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
              onPress={() => {
                const recording = recordings.find(r => r.id === showOptions);
                if (recording) handleStar(recording);
              }}
            >
              <Ionicons 
                name={recordings.find(r => r.id === showOptions)?.is_starred ? "star" : "star-outline"} 
                size={20} 
                color="#FFD700" 
              />
              <Text style={styles.optionText}>
                {recordings.find(r => r.id === showOptions)?.is_starred ? 'Unstar' : 'Star'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => handleShowTranscription(recordings.find(r => r.id === showOptions) as Recording)}
            >
              <Ionicons name="document-text" size={20} color="#007AFF" />
              <Text style={styles.optionText}>Show Transcription</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => handleRename(recordings.find(r => r.id === showOptions) as Recording)}
            >
              <Ionicons name="pencil-outline" size={20} color="#007AFF" />
              <Text style={styles.optionText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => handleDelete(recordings.find(r => r.id === showOptions) as Recording)}
            >
              <Ionicons name="trash-outline" size={20} color="red" />
              <Text style={styles.optionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        {recordings.map(renderRecording)}
        {recordings.length === 0 && (
          <Text style={styles.emptyText}>No recordings yet</Text>
        )}
      </ScrollView>

      {/* Add transcription modal */}
      <Modal
        visible={showTranscriptionModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transcription</Text>
            <ScrollView style={styles.transcriptionScroll}>
              {selectedTranscription ? (
                <Text style={styles.transcriptionText}>{selectedTranscription}</Text>
              ) : (
                <Text style={styles.noTranscriptionText}>No transcription available</Text>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowTranscriptionModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    position: 'relative',
  },
  recordingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  activeCard: {
    zIndex: 2,
  },
  recordingHeader: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginLeft: 0,
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginLeft: 0,
    marginTop: 8,
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
  transcriptionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#666',
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
    top: '55%',
    right: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
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
  transcriptionScroll: {
    maxHeight: 300,
    marginVertical: 10,
  },
  noTranscriptionText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
}); 