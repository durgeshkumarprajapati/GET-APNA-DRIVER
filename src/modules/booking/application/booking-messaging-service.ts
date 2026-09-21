import 'server-only';
import { BookingStatus, type BookingMessage } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import {
  BookingNotFoundError,
  MessagingNotAuthorizedError,
  MessagingNotAllowedError,
} from '../domain/errors';

const MESSAGE_BODY_MAX_LENGTH = 2000;
const MESSAGE_PREVIEW_LENGTH = 140;

// Sending a NEW message no longer makes sense once the booking is in one of
// these terminal states. Reading existing history is unaffected — this only
// gates sendBookingMessage.
const SENDABLE_STATUSES: BookingStatus[] = [
  BookingStatus.SEARCHING_DRIVER,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_IN_PROGRESS,
  BookingStatus.TRIP_COMPLETED,
];

export interface BookingMessageDTO {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderRole: 'CUSTOMER' | 'DRIVER';
  body: string;
  createdAt: Date;
}

interface MessagingParticipant {
  role: 'CUSTOMER' | 'DRIVER';
  /** The other party's userId — who a new message notifies and who "the driver"/"the customer" resolves to. */
  counterpartUserId: string | null;
}

/**
 * Resolves whether `userId` may participate in this booking's message
 * thread, and as which role. A driver qualifies once they have ANY
 * association with the booking — assigned, currently preferred/selected, or
 * having ever received a BookingAssignmentAttempt for it — not only after
 * accepting, since the customer may already be messaging them while their
 * offer is still pending (see the "waiting for confirmation" flow).
 */
async function resolveMessagingParticipant(
  userId: string,
  booking: {
    id: string;
    customerId: string;
    driverProfileId: string | null;
    preferredDriverProfileId: string | null;
  },
  db: Db,
): Promise<MessagingParticipant | null> {
  if (booking.customerId === userId) {
    const driverProfileId = booking.driverProfileId ?? booking.preferredDriverProfileId;
    if (!driverProfileId) return null; // No driver associated with this booking yet.
    const driverProfile = await db.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { userId: true },
    });
    return { role: 'CUSTOMER', counterpartUserId: driverProfile?.userId ?? null };
  }

  const callerDriverProfile = await db.driverProfile.findUnique({ where: { userId } });
  if (!callerDriverProfile) return null;

  const isAssigned = booking.driverProfileId === callerDriverProfile.id;
  const isPreferred = booking.preferredDriverProfileId === callerDriverProfile.id;
  const hasAttempt = isAssigned
    ? true
    : !!(await db.bookingAssignmentAttempt.findFirst({
        where: { bookingId: booking.id, driverProfileId: callerDriverProfile.id },
        select: { id: true },
      }));

  if (!isAssigned && !isPreferred && !hasAttempt) return null;
  return { role: 'DRIVER', counterpartUserId: booking.customerId };
}

/**
 * Sends a direct text message on a booking's thread, from whichever
 * participant (customer or driver) `senderUserId` resolves to, and
 * notifies the other party.
 */
export async function sendBookingMessage(
  senderUserId: string,
  bookingId: string,
  body: string,
  db: Db = prisma,
): Promise<BookingMessageDTO> {
  const trimmedBody = body.trim();
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const participant = await resolveMessagingParticipant(senderUserId, booking, db);
  if (!participant) {
    throw new MessagingNotAuthorizedError(bookingId);
  }
  if (!SENDABLE_STATUSES.includes(booking.status)) {
    throw new MessagingNotAllowedError(bookingId, booking.status);
  }

  const message = await db.bookingMessage.create({
    data: {
      bookingId,
      senderUserId,
      body: trimmedBody.slice(0, MESSAGE_BODY_MAX_LENGTH),
    },
  });

  if (participant.counterpartUserId) {
    await insertOutboxEvent(db, {
      eventType: 'booking.message.sent',
      aggregateType: 'BookingMessage',
      aggregateId: message.id,
      payload: {
        bookingId,
        messageId: message.id,
        senderUserId,
        recipientUserId: participant.counterpartUserId,
        recipientRole: participant.role === 'CUSTOMER' ? 'DRIVER' : 'CUSTOMER',
        bodyPreview: message.body.slice(0, MESSAGE_PREVIEW_LENGTH),
      },
    });
  }

  return toDTO(message, participant.role);
}

/**
 * Lists a booking's message thread, oldest first, for either participant.
 */
export async function listBookingMessages(
  userId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<BookingMessageDTO[]> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const participant = await resolveMessagingParticipant(userId, booking, db);
  if (!participant) {
    throw new MessagingNotAuthorizedError(bookingId);
  }

  const messages = await db.bookingMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'asc' },
  });

  return messages.map((m) =>
    toDTO(m, m.senderUserId === booking.customerId ? 'CUSTOMER' : 'DRIVER'),
  );
}

function toDTO(message: BookingMessage, senderRole: 'CUSTOMER' | 'DRIVER'): BookingMessageDTO {
  return {
    id: message.id,
    bookingId: message.bookingId,
    senderUserId: message.senderUserId,
    senderRole,
    body: message.body,
    createdAt: message.createdAt,
  };
}
