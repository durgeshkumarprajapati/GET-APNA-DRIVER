import type { AIRole, AIIntent, CustomerAIIntent, DriverAIIntent } from './ai-types';

export class AIIntentService {
  classifyIntent(role: AIRole, message: string): AIIntent {
    const text = message.toLowerCase().trim();

    if (role === 'CUSTOMER') {
      return this.classifyCustomerIntent(text);
    } else {
      return this.classifyDriverIntent(text);
    }
  }

  private classifyCustomerIntent(text: string): CustomerAIIntent {
    if (text.includes('sos') || text.includes('emergency') || text.includes('threat') || text.includes('danger') || text.includes('police')) {
      return 'EMERGENCY_SOS';
    }
    if (text.includes('usual') || text.includes('regular') || text.includes('frequent') || text.includes('again')) {
      return 'REBOOK_RIDE';
    }
    if (text.includes('schedule') || text.includes('tomorrow') || text.includes('later') || text.includes('recurring')) {
      return 'SCHEDULE_RIDE';
    }
    if (text.includes('fare') || text.includes('cost') || text.includes('price') || text.includes('how much')) {
      return 'CHECK_FARE';
    }
    if (text.includes('discount') || text.includes('promo') || text.includes('coupon') || text.includes('offer')) {
      return 'FIND_PROMOTION';
    }
    if (text.includes('point') || text.includes('reward') || text.includes('loyalty') || text.includes('gold') || text.includes('tier')) {
      return 'CHECK_LOYALTY';
    }
    if (text.includes('where is my driver') || text.includes('track') || text.includes('location') || text.includes('eta')) {
      return 'TRACK_RIDE';
    }
    if (text.includes('book') || text.includes('ride') || text.includes('cab') || text.includes('taxi') || text.includes('airport')) {
      return 'BOOK_RIDE';
    }
    if (text.includes('help') || text.includes('support') || text.includes('issue') || text.includes('complain')) {
      return 'CONTACT_SUPPORT';
    }
    return 'GENERAL_ASSISTANCE';
  }

  private classifyDriverIntent(text: string): DriverAIIntent {
    if (text.includes('earn') || text.includes('money') || text.includes('payout') || text.includes('wallet')) {
      return 'EARNINGS_SUMMARY';
    }
    if (text.includes('briefing') || text.includes('today') || text.includes('summary') || text.includes('overview')) {
      return 'SHIFT_SUMMARY';
    }
    if (text.includes('incentive') || text.includes('bonus') || text.includes('target') || text.includes('surge')) {
      return 'INCENTIVE_PROGRESS';
    }
    if (text.includes('goal') || text.includes('weekly') || text.includes('milestone')) {
      return 'GOAL_PROGRESS';
    }
    if (text.includes('shift') || text.includes('schedule') || text.includes('available') || text.includes('online')) {
      return 'SCHEDULE_STATUS';
    }
    if (text.includes('document') || text.includes('license') || text.includes('rc') || text.includes('compliance')) {
      return 'COMPLIANCE_STATUS';
    }
    if (text.includes('pickup') || text.includes('customer') || text.includes('route') || text.includes('destination')) {
      return 'CUSTOMER_PICKUP';
    }
    if (text.includes('safety') || text.includes('sos') || text.includes('support')) {
      return 'SUPPORT';
    }
    return 'GENERAL_ASSISTANCE';
  }
}
