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

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS
        idx_memories_updated
      ON memories(updated_at);

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        start_at INTEGER NOT NULL,
        end_at INTEGER NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'completed', 'cancelled')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS
        idx_appointments_start
      ON appointments(start_at);
    `);

    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}
