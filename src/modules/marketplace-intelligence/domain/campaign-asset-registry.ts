import 'server-only';

export type CampaignSignalCategory = 'PROMOTION' | 'REFERRAL' | 'REWARD' | 'SCRATCH';

export interface CampaignAssetDefinition {
  category: CampaignSignalCategory;
  primaryImage: string;
  secondaryImage: string;
  defaultAlt: string;
}

/**
 * Reusable registry of existing image assets located in public/ directory.
 * Rules:
 * - Promotion/Coupons -> /DiscountImg.png & /DiscountImg1.png
 * - Referral/Rewards -> /GiftBox.png & /GiftBox1.png
 * - Scratch Rewards -> /scratchCard.png & /ScratchCard1.png
 */
export const CAMPAIGN_ASSET_REGISTRY: Record<CampaignSignalCategory, CampaignAssetDefinition> = {
  PROMOTION: {
    category: 'PROMOTION',
    primaryImage: '/DiscountImg.png',
    secondaryImage: '/DiscountImg1.png',
    defaultAlt: 'Discount promotion demand signal illustration',
  },
  REFERRAL: {
    category: 'REFERRAL',
    primaryImage: '/GiftBox.png',
    secondaryImage: '/GiftBox1.png',
    defaultAlt: 'Referral growth reward illustration',
  },
  REWARD: {
    category: 'REWARD',
    primaryImage: '/GiftBox1.png',
    secondaryImage: '/GiftBox.png',
    defaultAlt: 'Loyalty reward engagement illustration',
  },
  SCRATCH: {
    category: 'SCRATCH',
    primaryImage: '/scratchCard.png',
    secondaryImage: '/ScratchCard1.png',
    defaultAlt: 'Scratch reward engagement illustration',
  },
};

export function getCampaignAsset(category: CampaignSignalCategory): CampaignAssetDefinition {
  return CAMPAIGN_ASSET_REGISTRY[category] || CAMPAIGN_ASSET_REGISTRY.PROMOTION;
}
