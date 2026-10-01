import { QuietHoursSettings, NON_URGENT_CATEGORIES } from '../domain/notification-intelligence-types';
import { getLocalMinutesFromMidnight } from '@/modules/driver/application/services/driver-schedule-service';

/**
 * Checks if a specific Date/time falls within quiet hours based on HH:mm start & end settings.
 * Handles overnight time ranges (e.g. 22:00 to 07:00).
 */
export function isInQuietHours(
  currentTime: Date,
  config: QuietHoursSettings,
): boolean {
  if (!config.quietHoursEnabled) {
    return false;
  }

  // Parse start and end hours/minutes
  const [startH, startM] = config.quietHoursStart.split(':').map(Number);
  const [endH, endM] = config.quietHoursEnd.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return false;
  }

  // In the user's own timezone, not the server process's — otherwise a
  // server running in UTC checks "22:00-07:00" against UTC clock time,
  // shifting the effective window by the server/user UTC offset.
  const currentMinutes = getLocalMinutesFromMidnight(currentTime, config.timezone);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    // Single-day span (e.g. 13:00 to 16:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight span (e.g. 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Determines whether a notification category should be suppressed during quiet hours.
 * Non-urgent notifications (promotions, rewards, offers) are suppressed during quiet hours.
 * Critical notifications (safety, active trips, booking dispatch) bypass quiet hours.
 */
export function shouldSuppressForQuietHours(
  category: string,
  priority: string | undefined,
  currentTime: Date,
  config: QuietHoursSettings,
): boolean {
  // HIGH and URGENT priority notifications always bypass quiet hours
  if (priority === 'HIGH' || priority === 'URGENT') {
    return false;
  }

  // Only suppress if category is non-urgent
  if (!NON_URGENT_CATEGORIES.has(category)) {
    return false;
  }

  return isInQuietHours(currentTime, config);
}
