import mockAI from './mockAI';
import type {
  AIAdapter,
  AIProvider,
  AIRequest,
  AIResponse,
} from './types';

const adapters: Partial<Record<AIProvider, AIAdapter>> = {
  mock: mockAI,
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
