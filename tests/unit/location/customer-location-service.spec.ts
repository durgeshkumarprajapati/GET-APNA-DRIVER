import {
  updateCustomerCurrentLocation,
  getCustomerCurrentLocation,
} from '@/modules/location/application/customer-location-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    customerCurrentLocation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/shared/database/prisma';

const mockUpsert = prisma.customerCurrentLocation.upsert as jest.Mock;
const mockFindUnique = prisma.customerCurrentLocation.findUnique as jest.Mock;

describe('CustomerLocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCustomerCurrentLocation', () => {
    it('upserts customer current location for valid coordinates', async () => {
      const mockRecord = {
        id: 'ccl-1',
        userId: 'user-1',
        latitude: 28.6139,
        longitude: 77.209,
        address: 'Connaught Place',
      };
      mockUpsert.mockResolvedValue(mockRecord);

      const res = await updateCustomerCurrentLocation('user-1', {
        latitude: 28.6139,
        longitude: 77.209,
        address: 'Connaught Place',
      });

      expect(res).toEqual(mockRecord);
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('getCustomerCurrentLocation', () => {
    it('returns customer current location if found', async () => {
      const mockRecord = { id: 'ccl-1', userId: 'user-1', latitude: 28.6139, longitude: 77.209 };
      mockFindUnique.mockResolvedValue(mockRecord);

      const res = await getCustomerCurrentLocation('user-1');

      expect(res).toEqual(mockRecord);
    });

    it('returns null if no current location session exists', async () => {
      mockFindUnique.mockResolvedValue(null);

      const res = await getCustomerCurrentLocation('user-99');

      expect(res).toBeNull();
    });
  });
});
