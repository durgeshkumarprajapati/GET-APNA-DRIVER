import { prisma } from '@/shared/database/prisma';
import type { AIRequestInput, AIResponse } from './ai-types';
import { getAIConfig } from './ai-config';
import { AIRateLimitService } from './ai-rate-limit-service';
import { AIPolicyService } from './ai-policy';
import { AISafetyService } from './ai-safety-service';
import { AIActionService } from './ai-action-service';
import { AIAuditService } from './ai-audit-service';
import { CustomerAIService } from './customer/customer-ai-service';
import { DriverAIService } from './driver/driver-ai-service';

export class AIService {
  private rateLimitService = new AIRateLimitService();
  private policyService = new AIPolicyService();
  private safetyService = new AISafetyService();
  private actionService = new AIActionService();
  private auditService = new AIAuditService();
  private customerAIService = new CustomerAIService();
  private driverAIService = new DriverAIService();

  async handleUserMessage(input: AIRequestInput): Promise<AIResponse> {
    const startTime = Date.now();
    const config = getAIConfig();

    if (!config.enabled || (input.role === 'CUSTOMER' && !config.customerEnabled) || (input.role === 'DRIVER' && !config.driverEnabled)) {
      return {
        message: 'AI Assistant is currently unavailable.',
        intent: 'GENERAL_ASSISTANCE',
        confidence: 0,
        actions: [],
        citations: [],
      };
    }

    // 1. Rate limiting check
    const rateCheck = this.rateLimitService.checkRateLimit(input.userId, input.role);
    if (!rateCheck.allowed) {
      return {
        message: `You've sent too many messages. Please try again in ${rateCheck.retryAfterSeconds || 60} seconds.`,
        intent: 'GENERAL_ASSISTANCE',
        confidence: 0,
        actions: [],
        citations: [],
      };
    }

    // 2. Safety / Prompt Injection check
    if (this.safetyService.isPromptInjection(input.message)) {
      await this.auditService.logEvent({
        userId: input.userId,
        role: input.role,
        intent: 'PROMPT_INJECTION',
        provider: config.provider,
        model: config.model,
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage: 'Prompt injection attempt rejected',
      });

      return {
        message: 'Security Alert: Prompt instructions cannot override application safety rules.',
        intent: 'GENERAL_ASSISTANCE',
        confidence: 0,
        actions: [],
        citations: [],
      };
    }

    // 3. Process role AI message
    let response: AIResponse;
    if (input.role === 'CUSTOMER') {
      response = await this.customerAIService.processCustomerMessage(input);
    } else {
      response = await this.driverAIService.processDriverMessage(input);
    }

    // 4. Policy enforcement check
    if (!this.policyService.isIntentAllowed(input.role, response.intent)) {
      response.intent = 'GENERAL_ASSISTANCE';
      response.actions = [];
    }

    // 5. Zod Action validation
    if (response.actions) {
      response.actions = this.actionService.validateActions(response.actions);
    }

    // 6. Conversation & Message Persistence
    try {
      let convId = input.conversationId;
      if (!convId) {
        const conv = await prisma.aIConversation.create({
          data: {
            userId: input.userId,
            role: input.role === 'CUSTOMER' ? 'CUSTOMER' : 'DRIVER',
            title: input.message.slice(0, 40),
          },
        });
        convId = conv.id;
      }

      response.conversationId = convId;

      await prisma.aIMessage.createMany({
        data: [
          {
            conversationId: convId,
            sender: 'USER',
            content: input.message,
          },
          {
            conversationId: convId,
            sender: 'ASSISTANT',
            content: response.message,
            intent: response.intent,
            actions: response.actions ? JSON.parse(JSON.stringify(response.actions)) : null,
            citations: response.citations ? JSON.parse(JSON.stringify(response.citations)) : null,
          },
        ],
      });
    } catch {
      // Non-blocking persistence failure
    }

    // 7. Audit log
    await this.auditService.logEvent({
      userId: input.userId,
      role: input.role,
      intent: response.intent,
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - startTime,
      success: true,
      actionType: response.actions?.[0]?.type,
    });

    return response;
  }
}
