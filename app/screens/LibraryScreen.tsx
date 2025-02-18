import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { deleteRecording } from '../database/Database';

type Recording = {
  id: string;
  filename: string;
  filepath: string;
  duration: number;
  created_at: string;
};

export default function LibraryScreen() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

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
      // TODO: Replace with actual database query
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory || ''
      );
      const audioFiles = files.filter(file => file.endsWith('.m4a'));
      
      const recordingsData = audioFiles.map(filename => ({
        id: filename,
        filename,
        filepath: `${FileSystem.documentDirectory}${filename}`,
        duration: 0, // We'll implement duration fetching later
        created_at: new Date().toISOString(),
      }));

      setRecordings(recordingsData);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const handlePlay = async (recording: Recording) => {
    try {
      // Stop current playback if any
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.filepath }
      );
      setSound(newSound);
      setPlayingId(recording.id);
      
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status && 'didJustFinish' in status && status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
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

  const renderItem = ({ item }: { item: Recording }) => (
    <View style={styles.recordingItem}>
      <TouchableOpacity 
        style={styles.recordingContent}
        onPress={() => handlePlay(item)}
      >
        <Text style={styles.filename}>{item.filename}</Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.playStatus}>
          {playingId === item.id ? 'Playing...' : 'Tap to play'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
      >
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No recordings yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recordingContent: {
    flex: 1,
  },
  filename: {
    fontSize: 16,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  playStatus: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  deleteButton: {
    padding: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
}); 