
import type { AIAdapter, AIRequest } from './types';

function getLastUserMessage(request: AIRequest): string {
  const lastMessage = [...request.messages]
    .reverse()
    .find((message) => message.role === 'user');

  return lastMessage?.content.trim() ?? '';
}

const mockAI: AIAdapter = {
  async generateReply(request) {
    const message = getLastUserMessage(request);

    if (!message) {
      return {
        text: 'ลองพิมพ์ข้อความคุยกับฉันดูก่อนนะ 💜',
        provider: 'mock',
      };
    }

    let reply: string;

    if (/สวัสดี|หวัดดี|hello|hi/i.test(message)) {
      reply = 'สวัสดี! 💜 วันนี้มีอะไรอยากคุยกับ Mira บ้าง?';
    } else if (/ชื่ออะไร|เธอชื่ออะไร/i.test(message)) {
      reply = 'ฉันชื่อ Mira เป็น Personal AI Companion ของเธอไง 💜';
    } else {
      reply =
        `Mira ได้รับข้อความว่า "${message}" แล้วนะ 💜\n\n` +
        'ตอนนี้ฉันยังเป็น Mock AI อยู่ แต่ระบบพร้อมสำหรับเชื่อมต่อ AI จริงในขั้นต่อไปแล้ว!';
    }

    return {
      text: reply,
      provider: 'mock',
    };
  },
};

export default mockAI;
