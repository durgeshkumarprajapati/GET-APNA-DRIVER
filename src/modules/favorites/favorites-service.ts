import { prisma } from '@/shared/database/prisma';

export interface FavoriteDriverResponse {
  favoriteId: string;
  driverProfileId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  ratingAverage: number;
  reviewCount: number;
  addedAt: string;
}

export async function addFavoriteDriver(
  customerId: string,
  driverProfileId: string,
): Promise<FavoriteDriverResponse> {
  const driverProfile = await prisma.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { ratingSummary: true },
  });

  if (!driverProfile) {
    throw new Error('DRIVER_NOT_FOUND');
  }

  if (driverProfile.approvalStatus !== 'APPROVED') {
    throw new Error('DRIVER_NOT_APPROVED');
  }

  // Create or retrieve favorite record (handles duplicate clicks safely)
  const favorite = await prisma.customerFavoriteDriver.upsert({
    where: {
      customerId_driverProfileId: {
        customerId,
        driverProfileId,
      },
    },
    update: {},
    create: {
      customerId,
      driverProfileId,
    },
  });

  return {
    favoriteId: favorite.id,
    driverProfileId: driverProfile.id,
    firstName: driverProfile.firstName,
    lastName: driverProfile.lastName,
    displayName: driverProfile.displayName,
    profileImageUrl: driverProfile.profileImageUrl,
    drivingExperienceYears: driverProfile.drivingExperienceYears,
    primaryServiceArea: driverProfile.primaryServiceArea,
    ratingAverage: Number(driverProfile.ratingSummary?.averageRating ?? 5.0),
    reviewCount: driverProfile.ratingSummary?.totalReviews ?? 0,
    addedAt: favorite.createdAt.toISOString(),
  };
}

export async function removeFavoriteDriver(
  customerId: string,
  driverProfileId: string,
): Promise<void> {
  await prisma.customerFavoriteDriver.deleteMany({
    where: {
      customerId,
      driverProfileId,
    },
  });
}

export async function getCustomerFavoriteDrivers(
  customerId: string,
): Promise<FavoriteDriverResponse[]> {
  const favorites = await prisma.customerFavoriteDriver.findMany({
    where: { customerId },
    include: {
      driverProfile: {
        include: {
          ratingSummary: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites.map((fav) => ({
    favoriteId: fav.id,
    driverProfileId: fav.driverProfileId,
    firstName: fav.driverProfile.firstName,
    lastName: fav.driverProfile.lastName,
    displayName: fav.driverProfile.displayName,
    profileImageUrl: fav.driverProfile.profileImageUrl,
    drivingExperienceYears: fav.driverProfile.drivingExperienceYears,
    primaryServiceArea: fav.driverProfile.primaryServiceArea,
    ratingAverage: Number(fav.driverProfile.ratingSummary?.averageRating ?? 5.0),
    reviewCount: fav.driverProfile.ratingSummary?.totalReviews ?? 0,
    addedAt: fav.createdAt.toISOString(),
  }));
}
