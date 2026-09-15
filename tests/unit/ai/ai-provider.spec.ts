import { DevelopmentProvider } from '@/modules/ai/providers/development-provider';
import { LLMProvider } from '@/modules/ai/providers/llm-provider';
import { getAIProvider } from '@/modules/ai/ai-provider';

describe('AI Provider Unit Tests', () => {
  it('DevelopmentProvider should return structured booking draft for BOOK_RIDE intent', async () => {
    const devProvider = new DevelopmentProvider();
    const res = await devProvider.generateResponse({
      role: 'CUSTOMER',
      intent: 'BOOK_RIDE',
      message: 'Book me a sedan tomorrow to Vadodara Airport',
      context: { pickupAddress: 'Railway Station', dropoffAddress: 'Airport' },
    });

    expect(res.intent).toBe('BOOK_RIDE');
    expect(res.actions).toBeDefined();
    expect(res.actions?.length).toBeGreaterThan(0);
    expect(res.actions?.[0].type).toBe('PREFILL_BOOKING');
  });

  it('DevelopmentProvider should return earnings summary for EARNINGS_SUMMARY driver intent', async () => {
    const devProvider = new DevelopmentProvider();
    const res = await devProvider.generateResponse({
      role: 'DRIVER',
      intent: 'EARNINGS_SUMMARY',
      message: 'How much did I earn today?',
      context: { earnings: { todayEarnings: 1850, completedTrips: 7 } },
    });

    expect(res.intent).toBe('EARNINGS_SUMMARY');
    expect(res.actions?.[0].type).toBe('SHOW_EARNINGS');
    expect((res.actions?.[0] as { payload: { todayEarnings: number } }).payload.todayEarnings).toBe(1850);
  });

  it('LLMProvider should fallback to DevelopmentProvider when API key is unconfigured', async () => {
    const llmProvider = new LLMProvider();
    const res = await llmProvider.generateResponse({
      role: 'CUSTOMER',
      intent: 'CHECK_FARE',
      message: 'What is the fare estimate?',
      context: {},
      model: 'gemini-1.5-flash',
      timeoutMs: 5000,
    });

    expect(res.intent).toBe('CHECK_FARE');
    expect(res.actions?.[0].type).toBe('SHOW_PRICING');
  });

  it('getAIProvider should return a working provider instance', () => {
    const provider = getAIProvider();
    expect(provider).toBeDefined();
  });
});
