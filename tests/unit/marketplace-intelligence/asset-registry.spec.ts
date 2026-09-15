import {
  getCampaignAsset,
  CampaignSignalCategory,
} from '@/modules/marketplace-intelligence/domain/campaign-asset-registry';

describe('Campaign Asset Registry Tests', () => {
  it('should return correct image assets for PROMOTION category', () => {
    const asset = getCampaignAsset('PROMOTION');
    expect(asset.primaryImage).toBe('/DiscountImg.png');
    expect(asset.secondaryImage).toBe('/DiscountImg1.png');
  });

  it('should return correct image assets for REFERRAL category', () => {
    const asset = getCampaignAsset('REFERRAL');
    expect(asset.primaryImage).toBe('/GiftBox.png');
    expect(asset.secondaryImage).toBe('/GiftBox1.png');
  });

  it('should return correct image assets for REWARD category', () => {
    const asset = getCampaignAsset('REWARD');
    expect(asset.primaryImage).toBe('/GiftBox1.png');
    expect(asset.secondaryImage).toBe('/GiftBox.png');
  });

  it('should return correct image assets for SCRATCH category', () => {
    const asset = getCampaignAsset('SCRATCH');
    expect(asset.primaryImage).toBe('/scratchCard.png');
    expect(asset.secondaryImage).toBe('/ScratchCard1.png');
  });

  it('should fall back to PROMOTION asset for unknown category', () => {
    const asset = getCampaignAsset('UNKNOWN' as unknown as CampaignSignalCategory);
    expect(asset.primaryImage).toBe('/DiscountImg.png');
  });
});
