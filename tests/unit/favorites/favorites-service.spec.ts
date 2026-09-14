import { addFavoriteDriver, removeFavoriteDriver, getCustomerFavoriteDrivers } from '@/modules/favorites/favorites-service';
import { prisma } from '@/shared/database/prisma';

describe('Phase 31 Objective D — Customer Favorites Service', () => {
  let testCustomerId: string;
  let testDriverProfileId: string;
  let testDriverUserId: string;

  beforeAll(async () => {
    // 1. Create customer user
    const customerUser = await prisma.user.create({
      data: {
        accountStatus: 'ACTIVE',
        customerProfile: { create: { firstName: 'FavTest', lastName: 'Customer' } },
      },
    });
    testCustomerId = customerUser.id;

    // 2. Create driver user & profile
    const driverUser = await prisma.user.create({
      data: {
        accountStatus: 'ACTIVE',
        driverProfile: {
          create: {
            firstName: 'Super',
            lastName: 'Chauffeur',
            displayName: 'Super Driver',
            approvalStatus: 'APPROVED',
            availabilityStatus: 'AVAILABLE',
            drivingExperienceYears: 7,
            primaryServiceArea: 'South Delhi',
          },
        },
      },
      include: { driverProfile: true },
    });
    testDriverUserId = driverUser.id;
    testDriverProfileId = driverUser.driverProfile!.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testCustomerId) {
      await prisma.customerFavoriteDriver.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.user.delete({ where: { id: testCustomerId } }).catch(() => {});
    }
    if (testDriverUserId) {
      await prisma.user.delete({ where: { id: testDriverUserId } }).catch(() => {});
    }
  });

  it('allows customer to add an approved driver to favorites', async () => {
    const favorite = await addFavoriteDriver(testCustomerId, testDriverProfileId);
    expect(favorite).toBeDefined();
    expect(favorite.driverProfileId).toBe(testDriverProfileId);
    expect(favorite.displayName).toBe('Super Driver');
    expect(favorite.drivingExperienceYears).toBe(7);
  });

  it('handles duplicate add attempts gracefully without throwing duplicate key errors', async () => {
    const favorite2 = await addFavoriteDriver(testCustomerId, testDriverProfileId);
    expect(favorite2).toBeDefined();
    expect(favorite2.driverProfileId).toBe(testDriverProfileId);
  });

  it('lists favorite drivers for authenticated customer', async () => {
    const favorites = await getCustomerFavoriteDrivers(testCustomerId);
    expect(favorites).toHaveLength(1);
    expect(favorites[0].driverProfileId).toBe(testDriverProfileId);
    const favObj = favorites[0] as unknown as Record<string, unknown>;
    expect(favObj.phoneNumber).toBeUndefined();
    expect(favObj.passwordHash).toBeUndefined();
    expect(favObj.documents).toBeUndefined();
  });

  it('allows customer to remove driver from favorites', async () => {
    await removeFavoriteDriver(testCustomerId, testDriverProfileId);
    const favorites = await getCustomerFavoriteDrivers(testCustomerId);
    expect(favorites).toHaveLength(0);
  });

  it('rejects adding non-existent driver to favorites', async () => {
    const randomUuid = '00000000-0000-4000-8000-000000000000';
    await expect(addFavoriteDriver(testCustomerId, randomUuid)).rejects.toThrow('DRIVER_NOT_FOUND');
  });
});
