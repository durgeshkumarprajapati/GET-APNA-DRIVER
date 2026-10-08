export interface PersonalizedShortcutCardDTO {
  id: string;
  title: string;
  subtitle: string;
  actionUrl: string;
  whyAmISeeingThisReason: string;
}

export interface CustomerPersonalizationSettingsDTO {
  customerId: string;
  isPersonalizationEnabled: boolean;
  preferredService: string;
  preferredBookingTimeOfDay: string;
  preferredPickupLocation: string;
  preferredDriverName?: string;
  shortcuts: PersonalizedShortcutCardDTO[];
}
