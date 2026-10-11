import { getDatabase } from './database';
import type {
  ChatMessage,
  MessageRole,
} from '../types/chat';

type MessageRow = {
  id: string;
  chat_id: string;
  role: MessageRole;
  text: string;
  created_at: number;
};

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
  };
}

function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function saveMessage(
  chatId: string,
  role: MessageRole,
  text: string,
): Promise<ChatMessage> {
  const db = await getDatabase();
  const now = Date.now();

  const message: ChatMessage = {
    id: createId(),
    chatId,
    role,
    text,
    createdAt: now,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO messages
        (id, chat_id, role, text, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      message.id,
      message.chatId,
      message.role,
      message.text,
      message.createdAt,
    );

    await db.runAsync(
      `UPDATE chats
       SET updated_at = ?
       WHERE id = ?`,
      now,
      chatId,
    );
  });

  return message;
}

export async function getMessagesByChatId(
  chatId: string,
): Promise<ChatMessage[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<MessageRow>(
    `SELECT id, chat_id, role, text, created_at
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at ASC, rowid ASC`,
    chatId,
  );

  return rows.map(mapMessage);
}

export async function deleteMessage(
  messageId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'DELETE FROM messages WHERE id = ?',
    messageId,
  );
}