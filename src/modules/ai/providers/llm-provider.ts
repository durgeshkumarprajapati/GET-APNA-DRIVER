import type { AIResponse, AIRole, AIIntent } from '../ai-types';
import { DevelopmentProvider } from './development-provider';

export interface LLMProviderInput {
  role: AIRole;
  intent: AIIntent;
  message: string;
  context: Record<string, unknown>;
  apiKey?: string;
  model: string;
  timeoutMs: number;
}

export class LLMProvider {
  private fallbackDevProvider = new DevelopmentProvider();

  async generateResponse(input: LLMProviderInput): Promise<AIResponse> {
    if (!input.apiKey) {
      // If API key is not configured, fall back to DevelopmentProvider gracefully
      return this.fallbackDevProvider.generateResponse({
        role: input.role,
        intent: input.intent,
        message: input.message,
        context: input.context,
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs);

      // Attempt call to Gemini REST API endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`;

      const systemPrompt = `You are GET APNA DRIVER AI ${input.role === 'CUSTOMER' ? 'Concierge' : 'Copilot'}.
You assist users factually.
Role: ${input.role}
Detected Intent: ${input.intent}
Authoritative Context: ${JSON.stringify(input.context)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: input.message },
              ],
            },
          ],
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM provider HTTP error ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('LLM provider returned empty response');
      }

      // Delegate action structuring to dev provider helper to ensure 100% schema safety
      const devRes = await this.fallbackDevProvider.generateResponse({
        role: input.role,
        intent: input.intent,
        message: input.message,
        context: input.context,
      });

      return {
        message: text,
        intent: input.intent,
        confidence: 0.9,
        actions: devRes.actions,
        citations: devRes.citations,
      };
    } catch {
      // Graceful fallback if API fails, times out, or throws
      return this.fallbackDevProvider.generateResponse({
        role: input.role,
        intent: input.intent,
        message: input.message,
        context: input.context,
      });
    }
  }
}
