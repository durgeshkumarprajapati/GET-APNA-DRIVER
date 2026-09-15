import type { AIResponse, AIRole, AIIntent } from './ai-types';
import { getAIConfig } from './ai-config';
import { DevelopmentProvider } from './providers/development-provider';
import { LLMProvider } from './providers/llm-provider';

export interface AIProviderInput {
  role: AIRole;
  intent: AIIntent;
  message: string;
  context: Record<string, unknown>;
  locale?: string;
}

export interface AIProvider {
  generateResponse(input: AIProviderInput): Promise<AIResponse>;
}

class UnifiedAIProvider implements AIProvider {
  private devProvider = new DevelopmentProvider();
  private llmProvider = new LLMProvider();

  async generateResponse(input: AIProviderInput): Promise<AIResponse> {
    const config = getAIConfig();

    if (!config.enabled) {
      return {
        message: 'The AI Assistant is currently disabled. You can continue using the normal booking and driver features.',
        intent: 'GENERAL_ASSISTANCE',
        confidence: 0.0,
        actions: [],
        citations: [],
      };
    }

    if (config.provider === 'development') {
      return this.devProvider.generateResponse(input);
    }

    return this.llmProvider.generateResponse({
      role: input.role,
      intent: input.intent,
      message: input.message,
      context: input.context,
      apiKey: config.apiKey,
      model: config.model,
      timeoutMs: config.timeoutMs,
    });
  }
}

export function getAIProvider(): AIProvider {
  return new UnifiedAIProvider();
}
