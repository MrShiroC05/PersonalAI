import { getDatabase } from './database';

export type MemoryCategory =
  | 'project'
  | 'preference'
  | 'goal'
  | 'general';

export type Memory = {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: number;
  updatedAt: number;
};

type MemoryRow = {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: number;
  updatedAt: number;
};

function createId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = await getDatabase();

  return db.getAllAsync<MemoryRow>(`
    SELECT
      id,
      content,
      category,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM memories
    ORDER BY updated_at DESC
  `);
}

export async function createMemory(
  content: string,
  category: MemoryCategory = 'general',
): Promise<Memory> {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('กรุณากรอกเนื้อหาความจำ');
  }

  const db = await getDatabase();
  const now = Date.now();
  const id = createId();

  await db.runAsync(
    `INSERT INTO memories (
      id, content, category, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?)`,
    id,
    normalizedContent,
    category,
    now,
    now,
  );

  return {
    id,
    content: normalizedContent,
    category,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateMemory(
  id: string,
  content: string,
  category: MemoryCategory,
): Promise<void> {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error('กรุณากรอกเนื้อหาความจำ');
  }

  const db = await getDatabase();

  await db.runAsync(
    `UPDATE memories
     SET content = ?, category = ?, updated_at = ?
     WHERE id = ?`,
    normalizedContent,
    category,
    Date.now(),
    id,
  );
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'DELETE FROM memories WHERE id = ?',
    id,
  );
}
