import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values';
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

let isInitialized = false;

export const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_starred INTEGER DEFAULT 0
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
    `);
    isInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Add this helper function
const ensureDbInitialized = async () => {
  if (!isInitialized) {
    await initDatabase();
  }
};

export const saveRecording = async (
  id: string,
  filename: string,
  filepath: string,
  duration: number,
  transcription: string | null = null
) => {
  try {
    await db.execAsync(`
      INSERT INTO recordings (id, filename, filepath, duration, is_starred) 
      VALUES ('${id}', '${filename}', '${filepath}', ${duration}, 0);
    `);

    if (transcription) {
      const transcriptionId = uuidv4();
      const escapedText = transcription.replace(/'/g, "''");
      await db.execAsync(`
        INSERT INTO transcriptions (id, recording_id, text, language) 
        VALUES ('${transcriptionId}', '${id}', '${escapedText}', 'en');
      `);
    }
  } catch (error) {
    console.error('Error saving recording with transcription:', error);
    throw error;
  }
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
    await ensureDbInitialized();
    
    // Get files from filesystem
    const filePaths = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory || ''
    );
    const audioFiles = filePaths.filter(file => file.endsWith('.m4a'));

    // If no audio files, return empty array
    if (audioFiles.length === 0) {
      return [];
    }

    // Get database records
    const result = (await db.execAsync(`
      SELECT r.*, t.text as transcription_text
      FROM recordings r
      LEFT JOIN transcriptions t ON t.recording_id = r.id;
    `) as unknown) as any[];

    const dbRecordings = result?.[0]?.rows?._array || [];

    // Map filesystem files to recordings
    return audioFiles.map(filename => {
      const dbRecord = dbRecordings.find((r: DBRecord) => r.filename === filename);
      
      return {
        id: filename,
        filename,
        filepath: `${FileSystem.documentDirectory}${filename}`,
        duration: dbRecord?.duration || 0,
        created_at: dbRecord?.created_at || new Date().toISOString(),
        is_starred: Boolean(dbRecord?.is_starred),
        transcription: dbRecord?.transcription_text || null
      };
    });

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
  is_starred: boolean;
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

// Simplify starRecording to just update is_starred
export const starRecording = async (id: string, isStarred: boolean) => {
  try {
    console.log(`Starring recording ${id}, isStarred: ${isStarred}`);
    
    await db.execAsync(`
      UPDATE recordings 
      SET is_starred = ${isStarred ? 1 : 0}
      WHERE filename = '${id}';
    `);

    // Verify the update
    const result = await db.execAsync(`
      SELECT filename, is_starred FROM recordings 
      WHERE filename = '${id}';
    `);
    console.log('Star update verification:', result);

  } catch (error) {
    console.error('Star recording error:', error);
    throw error;
  }
};

export const renameRecording = async (id: string, newName: string) => {
  try {
    // Keep the extension from the original filename
    const extension = id.split('.').pop();
    const newFilename = `${newName}.${extension}`;
    const newFilepath = `${FileSystem.documentDirectory}${newFilename}`;

    // First check if the file exists
    const oldFilepath = `${FileSystem.documentDirectory}${id}`;
    const fileInfo = await FileSystem.getInfoAsync(oldFilepath);
    
    if (!fileInfo.exists) {
      throw new Error('Original file not found');
    }

    // Rename the actual file
    await FileSystem.moveAsync({
      from: oldFilepath,
      to: newFilepath
    });

    // Update database
    await db.execAsync(`
      UPDATE recordings 
      SET filename = '${newFilename}',
          filepath = '${newFilepath}'
      WHERE filename = '${id}';
    `);

    return newFilename;
  } catch (error) {
    console.error('Rename error:', error);
    throw error;
  }
};

// Add function to get transcription for a recording
export const getTranscriptionForRecording = async (recordingId: string): Promise<string | null> => {
  try {
    const result = (await db.execAsync(`
      SELECT text FROM transcriptions 
      WHERE recording_id = '${recordingId}'
      ORDER BY created_at DESC
      LIMIT 1;
    `) as unknown) as any[];

    // More defensive handling of SQLite result
    const transcriptions = Array.isArray(result) && result.length > 0 
      ? (result[0]?.rows?._array || [])
      : [];

    console.log('Transcription result:', transcriptions); // Debug log
    return transcriptions[0]?.text || null;
  } catch (error) {
    console.error('Error getting transcription:', error);
    return null;
  }
};

type DBRecord = {
  filename: string;
  duration: number;
  created_at: string;
  is_starred: number;
  transcription_text: string | null;
}; 