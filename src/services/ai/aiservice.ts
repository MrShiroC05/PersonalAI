import mockAI from './mockAI';
import onlineAI from './onlineAI';

import type {
  AIAdapter,
  AIProvider,
  AIRequest,
  AIResponse,
} from './types';

const adapters: Partial<Record<AIProvider, AIAdapter>> = {
  mock: mockAI,
  online: onlineAI,
  // offline: offlineAI, // เพิ่มเมื่อสร้าง Offline Adapter
};

export async function sendToAI(
  request: AIRequest,
  provider: AIProvider = 'mock',
): Promise<AIResponse> {
  const adapter = adapters[provider];

  if (!adapter) {
    throw new Error(
      `AI provider "${provider}" is not configured yet.`,
    );
  }

  return adapter.generateReply(request);
}
