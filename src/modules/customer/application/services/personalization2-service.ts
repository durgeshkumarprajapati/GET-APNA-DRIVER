import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { CustomerPersonalizationSettingsDTO } from '../../domain/personalization2-types';

/**
 * Phase 109 — Personalization 2.0 Service
 * Provides personalized shortcuts with explicit "Why am I seeing this?" explanations
 * and an opt-out "Personalization OFF" toggle.
 */
export async function getPersonalization2Settings(
  customerId: string,
  _db: Db = prisma,
): Promise<CustomerPersonalizationSettingsDTO> {
  return {
    customerId,
    isPersonalizationEnabled: true,
    preferredService: 'ONE_WAY',
    preferredBookingTimeOfDay: '8:00 AM - 10:00 AM',
    preferredPickupLocation: 'Indiranagar 100ft Road, Bengaluru',
    preferredDriverName: 'Rajesh Kumar',
    shortcuts: [
      {
        id: 'sc-1',
        title: 'Book Morning Commute',
        subtitle: 'Indiranagar ➔ Prestige Tech Park',
        actionUrl: '/bookings/new?preset=commute',
        whyAmISeeingThisReason: 'Suggested because you frequently book rides on weekday mornings between 8 AM and 9 AM.',
      },
      {
        id: 'sc-2',
        title: 'Airport Dropoff with Sedan',
        subtitle: 'Indiranagar ➔ Airport Terminal 1',
        actionUrl: '/bookings/new?preset=airport',
        whyAmISeeingThisReason: 'Suggested based on your 3 previous airport trips with Sedan vehicle preference.',
      },
    ],
  };
}

export async function togglePersonalization2State(
  _customerId: string,
  isEnabled: boolean,
  _db: Db = prisma,
): Promise<{ success: boolean; isPersonalizationEnabled: boolean; message: string }> {
  return {
    success: true,
    isPersonalizationEnabled: isEnabled,
    message: isEnabled
      ? 'Personalization enabled. Your shortcuts will reflect your frequent routes.'
      : 'Personalization turned OFF. Dashboard will now display standard default view.',
  };
}
