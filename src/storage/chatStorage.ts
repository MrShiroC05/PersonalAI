import { getDatabase } from './database';
import type { Chat } from '../types/chat';

type ChatRow = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
};

function mapChat(row: ChatRow): Chat {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// สร้างห้องแชตใหม่
export async function createChat(
  title = 'New Chat',
): Promise<Chat> {
  const db = await getDatabase();
  const now = Date.now();

  const chat: Chat = {
    id: createId(),
    title,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO chats (id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    chat.id,
    chat.title,
    chat.createdAt,
    chat.updatedAt,
  );

  return chat;
}

// ดึงห้องแชตทั้งหมด เรียงจากห้องที่มีการใช้งานล่าสุด
export async function getAllChats(): Promise<Chat[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ChatRow>(
    `SELECT id, title, created_at, updated_at
     FROM chats
     ORDER BY updated_at DESC`,
  );

  return rows.map(mapChat);
}

// ค้นหาห้องแชตจาก ID
export async function getChatById(
  chatId: string,
): Promise<Chat | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<ChatRow>(
    `SELECT id, title, created_at, updated_at
     FROM chats
     WHERE id = ?`,
    chatId,
  );

  return row ? mapChat(row) : null;
}

// เปลี่ยนชื่อห้องแชต
export async function renameChat(
  chatId: string,
  title: string,
): Promise<void> {
  const newTitle = title.trim();

  if (!newTitle) {
    throw new Error('Chat title cannot be empty');
  }

  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE chats
     SET title = ?, updated_at = ?
     WHERE id = ?`,
    newTitle,
    Date.now(),
    chatId,
  );

  if (result.changes === 0) {
    throw new Error('Chat not found');
  }
}

// ลบห้องแชต
export async function deleteChat(
  chatId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'DELETE FROM chats WHERE id = ?',
    chatId,
  );
}

export async function setAutoChatTitle(
  chatId: string,
  firstMessage: string,
): Promise<Chat | null> {
  const normalizedText = firstMessage.trim().replace(/\s+/g, ' ');

  if (!normalizedText) return null;

  const maxLength = 36;
  const title =
    normalizedText.length > maxLength
      ? `${normalizedText.slice(0, maxLength - 3).trimEnd()}...`
      : normalizedText;

  const db = await getDatabase();

  await db.runAsync(
    `UPDATE chats
     SET title = ?, updated_at = ?
     WHERE id = ? AND title = ?`,
    title,
    Date.now(),
    chatId,
    'New Chat',
  );

  return getChatById(chatId);
}
