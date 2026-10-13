// AI Service Types
export type AIProvider = 'mock' | 'online' | 'offline';

// ใช้ประวัติการสนทนาเพื่อให้ Ai เข้าใจบริบทของการสนทนาและสร้างข้อความตอบกลับ
export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// ใช้สำหรับส่งคำขอไปยัง AI Service เพื่อสร้างข้อความตอบกลับ
export type AIRequest = {
  messages: AIMessage[];
  memoryContext?: string;
  calendarContext?: {
    localDateTime: string;
    timeZone: string;
  };
};

export type CalendarAction = {
  kind: 'none' | 'create' | 'update' | 'delete';
  title: string;
  targetTitle: string;
  targetStartAt: string;
  startAt: string;
  endAt: string;
  location: string;
  notes: string;
};

// ใช้สำหรับรับข้อความตอบกลับจาก AI Service
export type AIResponse = {
  text: string;
  provider: AIProvider;
  calendarAction?: CalendarAction;
};

// กำหนด interface สำหรับ AIAdapter เพื่อให้สามารถสร้างข้อความตอบกลับจาก AI Service ได้
export interface AIAdapter {
  generateReply(request: AIRequest): Promise<AIResponse>;
}
