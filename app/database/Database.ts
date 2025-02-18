import * as SQLite from 'expo-sqlite';

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
    db.execAsync(
      `CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`
    ).then(() => resolve(true))
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