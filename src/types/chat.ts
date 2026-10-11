export type MessageRole = 'user' | 'assistant';

export type Chat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  role: MessageRole;
  text: string;
  createdAt: number;
};