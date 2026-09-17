import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { isDriverHireBooking, supportsDropLocation } from './booking-policy';

export const locationCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1, 'Pickup address is required'),
  label: z.string().nullable().optional(),
});

export const createBookingSchema = z
  .object({
    bookingType: z.nativeEnum(BookingType).default(BookingType.POINT_TO_POINT),
    pickupLocation: locationCoordinatesSchema,
    dropoffLocation: locationCoordinatesSchema.nullable().optional(),
    requestedStartTime: z.string().datetime().nullable().optional(),
    hireDurationValue: z.number().min(1).optional(),
    numberOfDays: z.number().min(1).optional(),
    hourlyPackageHours: z.number().min(1).optional(),
    preferredDriverProfileId: z.string().uuid().nullable().optional(),
    promotionCode: z.string().trim().min(1).nullable().optional(),
    customerNotes: z.string().max(500).nullable().optional(),
    organizationId: z.string().uuid().nullable().optional(),
    costCenterId: z.string().uuid().nullable().optional(),
    departmentId: z.string().uuid().nullable().optional(),
    bookedForUserId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate driver hire modes
    if (isDriverHireBooking(data.bookingType)) {
      if (!data.hireDurationValue && !data.numberOfDays && !data.hourlyPackageHours) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duration is required for driver hire bookings',
          path: ['hireDurationValue'],
        });
      }
    }

    // Dropoff location validation: Dropoff is optional for point-to-point, forbidden/omitted for hire
    if (!supportsDropLocation(data.bookingType) && data.dropoffLocation) {
      // Normalize dropoff to null for hire modes
      data.dropoffLocation = null;
    }
  });

export type CreateBookingSchemaInput = z.infer<typeof createBookingSchema>;
