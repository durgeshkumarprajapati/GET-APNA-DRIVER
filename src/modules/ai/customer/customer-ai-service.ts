import type { AIRequestInput, AIResponse } from '../ai-types';
import { getAIProvider } from '../ai-provider';
import { AIIntentService } from '../ai-intent-service';
import { AIContextService } from '../ai-context-service';
import { AIRedactionService } from '../ai-redaction-service';

export class CustomerAIService {
  private intentService = new AIIntentService();
  private contextService = new AIContextService();
  private redactionService = new AIRedactionService();
  private provider = getAIProvider();

  async processCustomerMessage(input: AIRequestInput): Promise<AIResponse> {
    const sanitizedMsg = this.redactionService.redactText(input.message);
    const intent = this.intentService.classifyIntent('CUSTOMER', sanitizedMsg);
    const rawContext = await this.contextService.buildContext(input.userId, 'CUSTOMER', intent);
    const sanitizedContext = this.redactionService.redactContext(rawContext);

    return this.provider.generateResponse({
      role: 'CUSTOMER',
      intent,
      message: sanitizedMsg,
      context: sanitizedContext,
      locale: input.locale,
    });
  }
}
