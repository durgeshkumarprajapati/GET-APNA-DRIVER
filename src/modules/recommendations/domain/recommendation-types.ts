export enum RecommendationType {
  USUAL_ROUTE = 'USUAL_ROUTE',
  RECENT_RIDE = 'RECENT_RIDE',
  BOOK_AGAIN = 'BOOK_AGAIN',
  FAVORITE_DRIVER = 'FAVORITE_DRIVER',
  SAVED_PLACE = 'SAVED_PLACE',
  UPCOMING_SCHEDULED_RIDE = 'UPCOMING_SCHEDULED_RIDE',
  SCHEDULE_SUGGESTION = 'SCHEDULE_SUGGESTION',
  VEHICLE_PREFERENCE = 'VEHICLE_PREFERENCE',
  LOYALTY_PROGRESS = 'LOYALTY_PROGRESS',
  LOYALTY_REWARD = 'LOYALTY_REWARD',
  PROMOTION = 'PROMOTION',
}

export enum RecommendationActionType {
  BOOK_NOW = 'BOOK_NOW',
  BOOK_AGAIN = 'BOOK_AGAIN',
  SCHEDULE_RIDE = 'SCHEDULE_RIDE',
  VIEW_DRIVER = 'VIEW_DRIVER',
  VIEW_REWARD = 'VIEW_REWARD',
  VIEW_PROMOTION = 'VIEW_PROMOTION',
  VIEW_SCHEDULED_RIDE = 'VIEW_SCHEDULED_RIDE',
  VIEW_LOYALTY = 'VIEW_LOYALTY',
  OPEN_SAVED_LOCATION = 'OPEN_SAVED_LOCATION',
}

export enum RecommendationPriority {
  P0 = 'P0', // Critical / Time-sensitive
  P1 = 'P1', // High frequency / Favorite
  P2 = 'P2', // Contextual / Saved Place / Preferences
  P3 = 'P3', // Growth / Rewards / Promotions
}

export interface RecommendationActionDTO {
  type: RecommendationActionType;
  href: string;
  prefillParams?: Record<string, string | number | boolean>;
}

export interface RecommendationDTO {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  score: number; // 0.00 to 100.00
  titleKey: string;
  descriptionKey?: string;
  explanationKey: string;
  explanationArgs?: Record<string, string | number>;
  action: RecommendationActionDTO;
  metadata?: Record<string, unknown>;
}

export interface CandidateRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  rawScore: number;
  titleKey: string;
  descriptionKey?: string;
  explanationKey: string;
  explanationArgs?: Record<string, string | number>;
  action: RecommendationActionDTO;
  metadata?: Record<string, unknown>;
  routeKey?: string;
}

export interface RecommendationContextInput {
  customerId: string;
  currentTimestamp?: Date;
  dayOfWeek?: number; // 1=Mon .. 7=Sun
  timeOfDayMinutes?: number; // 0..1439
}
