import 'server-only';
import {
  DriverDocumentStatus,
  DriverDocumentType,
  DriverVerificationStatus,
  type DriverDocument,
} from '@prisma/client';
import path from 'path';
import crypto from 'crypto';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getInteger, getJson } from '@/shared/config/configuration-service';
import { fileStorageProvider } from '@/shared/storage/file-storage-provider';
import {
  DocumentNotFoundError,
  FileTooLargeError,
  InvalidContentTypeError,
  InvalidDocumentTypeError,
} from '../../domain/errors';
import { getOrCreateDriverProfile } from './driver-profile-service';

export interface CreateDocumentUploadUrlInput {
  documentType: DriverDocumentType;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface RegisterDocumentInput {
  documentType: DriverDocumentType;
  storageKey: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  documentNumber?: string | null;
  expiresAt?: Date | string | null;
}

/**
 * Validates file parameters and generates a presigned/private upload URL for driver document upload.
 */
export async function createDocumentUploadUrl(
  userId: string,
  input: CreateDocumentUploadUrlInput,
  db: Db = prisma,
): Promise<{ uploadUrl: string; storageKey: string }> {
  if (!Object.values(DriverDocumentType).includes(input.documentType)) {
    throw new InvalidDocumentTypeError(input.documentType);
  }

  const allowedTypes = await getJson<string[]>(
    'driver.document.allowed_content_types',
    ['image/jpeg', 'image/png', 'application/pdf'],
    db,
  );

  if (!allowedTypes.includes(input.contentType)) {
    throw new InvalidContentTypeError(input.contentType, allowedTypes);
  }

  const maxBytes = await getInteger('driver.document.max_file_size_bytes', 10485760, db);
  if (input.fileSizeBytes > maxBytes) {
    throw new FileTooLargeError(input.fileSizeBytes, maxBytes);
  }

  const profile = await getOrCreateDriverProfile(userId, db);
  const ext = path.extname(input.fileName) || '.bin';
  const random = crypto.randomBytes(8).toString('hex');
  const storageKey = `drivers/${profile.id}/${input.documentType.toLowerCase()}_${Date.now()}_${random}${ext}`;

  return await fileStorageProvider.generateUploadUrl(storageKey, input.contentType);
}

/**
 * Registers an uploaded document record, replacing any existing active version as SUPERSEDED.
 */
export async function registerUploadedDocument(
  userId: string,
  input: RegisterDocumentInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverDocument> {
  return await dbClient.$transaction(async (tx) => {
    const profile = await getOrCreateDriverProfile(userId, tx);

    const existingCurrent = await tx.driverDocument.findFirst({
      where: {
        driverProfileId: profile.id,
        documentType: input.documentType,
        isCurrent: true,
      },
    });

    let nextVersion = 1;
    if (existingCurrent) {
      nextVersion = existingCurrent.version + 1;
      await tx.driverDocument.update({
        where: { id: existingCurrent.id },
        data: {
          isCurrent: false,
          status: DriverDocumentStatus.SUPERSEDED,
        },
      });
    }

    const created = await tx.driverDocument.create({
      data: {
        driverProfileId: profile.id,
        documentType: input.documentType,
        documentNumber: input.documentNumber ?? null,
        storageKey: input.storageKey,
        originalFileName: input.originalFileName,
        contentType: input.contentType,
        fileSizeBytes: input.fileSizeBytes,
        status: DriverDocumentStatus.UPLOADED,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        version: nextVersion,
        isCurrent: true,
      },
    });

    await tx.driverProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: DriverVerificationStatus.PENDING_VERIFICATION,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'driver.document.uploaded',
      entityType: 'DriverDocument',
      entityId: created.id,
      beforeState: existingCurrent
        ? { id: existingCurrent.id, version: existingCurrent.version }
        : null,
      afterState: { id: created.id, documentType: created.documentType, version: created.version },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.document.uploaded',
      aggregateType: 'DriverDocument',
      aggregateId: created.id,
      payload: { userId, documentId: created.id, documentType: created.documentType },
    });

    return created;
  });
}

/**
 * Admin action to verify a driver document.
 */
export async function verifyDocument(
  adminUserId: string,
  documentId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverDocument> {
  return await dbClient.$transaction(async (tx) => {
    const doc = await tx.driverDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const updated = await tx.driverDocument.update({
      where: { id: documentId },
      data: {
        status: DriverDocumentStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        rejectionReason: null,
      },
    });

    const requiredDocTypes = await getJson<string[]>(
      'driver.onboarding.required_documents',
      ['DRIVING_LICENSE', 'AADHAAR_CARD'],
      tx,
    );

    const currentDocs = await tx.driverDocument.findMany({
      where: { driverProfileId: doc.driverProfileId, isCurrent: true },
    });

    const allVerified = requiredDocTypes.every((type) =>
      currentDocs.some(
        (d) => d.documentType === type && d.status === DriverDocumentStatus.VERIFIED,
      ),
    );

    if (allVerified) {
      await tx.driverProfile.update({
        where: { id: doc.driverProfileId },
        data: { verificationStatus: DriverVerificationStatus.VERIFIED },
      });
    }

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.document.verified',
      entityType: 'DriverDocument',
      entityId: documentId,
      beforeState: { status: doc.status },
      afterState: { status: updated.status },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.document.verified',
      aggregateType: 'DriverDocument',
      aggregateId: documentId,
      payload: { documentId, verifiedBy: adminUserId },
    });

    return updated;
  });
}

/**
 * Admin action to reject a driver document with reason.
 */
export async function rejectDocument(
  adminUserId: string,
  documentId: string,
  reason: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverDocument> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required when rejecting a document.');
  }

  return await dbClient.$transaction(async (tx) => {
    const doc = await tx.driverDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new DocumentNotFoundError(documentId);
    }

    const updated = await tx.driverDocument.update({
      where: { id: documentId },
      data: {
        status: DriverDocumentStatus.REJECTED,
        rejectionReason: reason,
      },
    });

    await tx.driverProfile.update({
      where: { id: doc.driverProfileId },
      data: { verificationStatus: DriverVerificationStatus.REJECTED },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.document.rejected',
      entityType: 'DriverDocument',
      entityId: documentId,
      beforeState: { status: doc.status },
      afterState: { status: updated.status, reason },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.document.rejected',
      aggregateType: 'DriverDocument',
      aggregateId: documentId,
      payload: { documentId, reason },
    });

    return updated;
  });
}

/**
 * Generates an authorized temporary download URL for a private driver document.
 */
export async function getAuthorizedDocumentDownloadUrl(
  actorUserId: string,
  documentId: string,
  isAdmin = false,
  db: Db = prisma,
): Promise<string> {
  const doc = await db.driverDocument.findUnique({
    where: { id: documentId },
    include: { driverProfile: true },
  });

  if (!doc) {
    throw new DocumentNotFoundError(documentId);
  }

  if (!isAdmin && doc.driverProfile.userId !== actorUserId) {
    throw new Error('Unauthorized access to private driver document.');
  }

  return await fileStorageProvider.generateDownloadUrl(doc.storageKey, 900);
}

/**
 * Lists documents for a driver profile.
 */
export async function listDriverDocuments(
  driverProfileId: string,
  currentOnly = true,
  db: Db = prisma,
): Promise<DriverDocument[]> {
  return await db.driverDocument.findMany({
    where: {
      driverProfileId,
      ...(currentOnly ? { isCurrent: true } : {}),
    },
    orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
  });
}
