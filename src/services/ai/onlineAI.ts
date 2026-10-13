import type {
  AIAdapter,
  AIResponse,
  AIRequest,
} from './types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

const onlineAI: AIAdapter = {
  async generateReply(request: AIRequest) {
    if (!API_BASE_URL) {
      throw new Error(
        'Missing EXPO_PUBLIC_API_BASE_URL in the Expo environment.',
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: request.messages,
        memoryContext: request.memoryContext,
        appointmentsContext: request.appointmentsContext,
        calendarContext: request.calendarContext,
      }),
    });

    const data: {
      text?: string;
      error?: string;
      calendarAction?: AIResponse['calendarAction'];
    } =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? `AI request failed (${response.status})`,
      );
    }

    if (typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error('AI returned an empty response.');
    }

    return {
      text: data.text,
      provider: 'online',
      calendarAction: data.calendarAction,
    };
  },
};

export default onlineAI;
