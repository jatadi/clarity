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
      DROP TABLE IF EXISTS enhanced_audio;
      DROP TABLE IF EXISTS transcriptions;
      DROP TABLE IF EXISTS recordings;

      CREATE TABLE recordings (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_starred INTEGER DEFAULT 0,
        starred_at TIMESTAMP
      );

      CREATE TABLE transcriptions (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL,
        text TEXT NOT NULL,
        language TEXT NOT NULL,
        confidence_score REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id)
      );

      CREATE TABLE enhanced_audio (
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
  return db.execAsync(`
    INSERT INTO recordings (id, filename, filepath, duration, is_starred, starred_at) 
    VALUES ('${id}', '${filename}', '${filepath}', ${duration}, 0, NULL);
  `);
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
    // Get files from filesystem first
    const filePaths = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory || ''
    );
    
    const audioFiles = filePaths.filter(file => file.endsWith('.m4a'));
    
    let dbRecordingsMap = new Map();
    
    try {
      // Try to get database records
      const dbRecordings = (await db.execAsync(`
        SELECT id, filename, filepath, duration, created_at, is_starred, starred_at 
        FROM recordings;
      `) as unknown) as any[];

      // Create a map of database records if query succeeds
      dbRecordingsMap = new Map(
        dbRecordings.map(record => [record.filename, record])
      );
    } catch (dbError) {
      console.warn('Database query failed, using filesystem data only:', dbError);
      // Continue with empty database map
    }

    // Combine filesystem and database data
    const recordings = audioFiles.map(filename => {
      const dbRecord = dbRecordingsMap.get(filename);
      
      // If no database record exists, create one
      if (!dbRecord) {
        const newRecording = {
          id: filename,
          filename,
          filepath: `${FileSystem.documentDirectory}${filename}`,
          duration: 0,
          created_at: new Date().toISOString(),
          is_starred: false,
          starred_at: null,
          transcription: null
        };

        // Try to save the new recording to database
        try {
          saveRecording(
            newRecording.id,
            newRecording.filename,
            newRecording.filepath,
            newRecording.duration
          );
        } catch (saveError) {
          console.warn('Failed to save recording to database:', saveError);
        }

        return newRecording;
      }

      return {
        id: filename,
        filename,
        filepath: `${FileSystem.documentDirectory}${filename}`,
        duration: dbRecord.duration || 0,
        created_at: dbRecord.created_at || new Date().toISOString(),
        is_starred: dbRecord.is_starred === 1,
        starred_at: dbRecord.starred_at || null,
        transcription: null
      };
    });

    // Sort recordings
    return recordings.sort((a, b) => {
      if (a.is_starred && !b.is_starred) return -1;
      if (!a.is_starred && b.is_starred) return 1;
      if (a.is_starred && b.is_starred && a.starred_at && b.starred_at) {
        return new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
  starred_at: string | null;
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

// Update starRecording to handle errors better
export const starRecording = async (id: string, isStarred: boolean) => {
  try {
    const starredAt = isStarred ? new Date().toISOString() : null;
    await db.execAsync(`
      INSERT OR REPLACE INTO recordings (
        id, 
        filename, 
        filepath, 
        duration, 
        is_starred, 
        starred_at,
        created_at
      ) 
      SELECT 
        id,
        filename,
        filepath,
        duration,
        ${isStarred ? 1 : 0},
        ${starredAt ? `'${starredAt}'` : 'NULL'},
        COALESCE(created_at, CURRENT_TIMESTAMP)
      FROM recordings 
      WHERE id = '${id}';
    `);
  } catch (error) {
    console.error('Star recording error:', error);
    throw error;
  }
};

export const renameRecording = async (id: string, newName: string) => {
  try {
    // Get the old filepath using filename as id (since that's how we store it)
    const result = (await db.execAsync(`
      SELECT filepath FROM recordings WHERE filename = '${id}';
    `) as unknown) as any[];
    
    if (!result?.[0]) throw new Error('Recording not found');
    
    const oldFilepath = result[0].filepath;
    const extension = oldFilepath.split('.').pop(); // Get file extension
    const timestamp = id.split('_').pop()?.split('.')[0]; // Get timestamp from old filename
    const newFilename = `${newName}_${timestamp}.${extension}`;
    const newFilepath = `${FileSystem.documentDirectory}${newFilename}`;

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
  } catch (error) {
    console.error('Rename error:', error);
    throw error;
  }
}; 