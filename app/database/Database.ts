import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system';

// First, install the required package:
// npx expo install expo-sqlite

// Define types for SQLite transaction and result
type SQLTransaction = {
  executeSql: (
    sqlStatement: string,
    args?: any[],
    success?: (transaction: SQLTransaction, resultSet: SQLResultSet) => void,
    error?: (transaction: SQLTransaction, error: Error) => boolean
  ) => void;
};

type SQLResultSet = {
  insertId: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
};

const db = SQLite.openDatabaseSync('clarity.db');

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transcriptions (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL,
        text TEXT NOT NULL,
        language TEXT NOT NULL,
        confidence_score REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id)
      );

      CREATE TABLE IF NOT EXISTS enhanced_audio (
        id TEXT PRIMARY KEY,
        recording_id TEXT,
        voice_id TEXT,
        filepath TEXT,
        created_at TEXT,
        FOREIGN KEY (recording_id) REFERENCES recordings (id)
      );
    `).then(() => resolve(true))
    .catch((error: Error) => reject(error));
  });
};

export const saveRecording = (
  id: string,
  filename: string,
  filepath: string,
  duration: number
) => {
  return db.execAsync(
    `INSERT INTO recordings (id, filename, filepath, duration) 
     VALUES ('${id}', '${filename}', '${filepath}', ${duration});`
  );
};

export const saveTranscription = (
  recordingId: string,
  text: string,
  language: string = 'en',
  confidenceScore: number = 1.0
) => {
  return db.execAsync(
    `INSERT INTO transcriptions (id, recording_id, text, language, confidence_score) 
     VALUES ('${uuidv4()}', '${recordingId}', '${text}', '${language}', ${confidenceScore});`
  );
};

export const deleteRecording = async (id: string) => {
  try {
    // Delete recording and get filepath in one query
    await db.execAsync(`
      DELETE FROM recordings 
      WHERE id = '${id}' 
      RETURNING filepath;
    `);
    
    // Delete associated transcription
    await db.execAsync(`
      DELETE FROM transcriptions 
      WHERE recording_id = '${id}';
    `);

    // Delete file if it exists
    const filePath = `${FileSystem.documentDirectory}${id}`;
    if (await FileSystem.getInfoAsync(filePath).then(info => info.exists)) {
      await FileSystem.deleteAsync(filePath);
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

export const getRecordings = async () => {
  try {
    // Get filepath first
    const filePaths = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory || ''
    );
    
    const audioFiles = filePaths.filter(file => file.endsWith('.m4a'));
    
    return audioFiles.map(filename => ({
      id: filename,
      filename,
      filepath: `${FileSystem.documentDirectory}${filename}`,
      duration: 0,
      created_at: new Date().toISOString(),
      transcription: null
    }));
  } catch (error) {
    console.error('Failed to load recordings:', error);
    return [];
  }
};

// Add this type at the top of the file
type Recording = {
  id: string;
  filename: string;
  filepath: string;
  duration: number;
  created_at: string;
  transcription: string | null;
};

// Add new type
type EnhancedAudio = {
  id: string;
  recording_id: string;
  voice_id: string;
  filepath: string;
  created_at: string;
};

// Update saveEnhancedAudio to use execAsync
export const saveEnhancedAudio = async (enhancedAudio: EnhancedAudio): Promise<void> => {
  const { id, recording_id, voice_id, filepath, created_at } = enhancedAudio;
  await db.execAsync(`
    INSERT INTO enhanced_audio (id, recording_id, voice_id, filepath, created_at) 
    VALUES ('${id}', '${recording_id}', '${voice_id}', '${filepath}', '${created_at}');
  `);
};

// Get enhanced audio for a recording
export const getEnhancedAudio = async (recordingId: string): Promise<EnhancedAudio | null> => {
  const result = (await db.execAsync(`
    SELECT * FROM enhanced_audio 
    WHERE recording_id = '${recordingId}'
    ORDER BY created_at DESC
    LIMIT 1;
  `) as unknown) as any[];
  
  return result?.[0] || null;
};

// Delete enhanced audio
export const deleteEnhancedAudio = async (id: string): Promise<void> => {
  try {
    const result = (await db.execAsync(`
      SELECT filepath FROM enhanced_audio 
      WHERE id = '${id}';
    `) as unknown) as any[];
    
    if (result?.[0]) {
      const filepath = result[0].filepath;
      
      // Delete from database
      await db.execAsync(`
        DELETE FROM enhanced_audio 
        WHERE id = '${id}';
      `);

      // Delete file if it exists
      if (await FileSystem.getInfoAsync(filepath).then(info => info.exists)) {
        await FileSystem.deleteAsync(filepath);
      }
    }
  } catch (error) {
    console.error('Delete enhanced audio error:', error);
    throw error;
  }
}; 