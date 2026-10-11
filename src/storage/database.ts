import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'personal-ai.db';

let databasePromise:
  | Promise<SQLite.SQLiteDatabase>
  | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL
          CHECK (role IN ('user', 'assistant')),
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,

        FOREIGN KEY (chat_id)
          REFERENCES chats(id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS
        idx_messages_chat_created
      ON messages(chat_id, created_at);
    `);

    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}