import {
  createDocumentUploadUrl,
  registerUploadedDocument,
  verifyDocument,
} from '@/modules/driver/application/services/driver-document-service';
import { DriverDocumentStatus, DriverDocumentType, DriverVerificationStatus } from '@prisma/client';
import { FileTooLargeError, InvalidContentTypeError } from '@/modules/driver/domain/errors';

const mockTx = {
  driverProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  driverDocument: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    driverDocument: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getJson: jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
    if (key === 'driver.document.allowed_content_types') {
      return Promise.resolve(['image/jpeg', 'image/png', 'application/pdf']);
    }
    if (key === 'driver.onboarding.required_documents') {
      return Promise.resolve(['DRIVING_LICENSE', 'AADHAAR_CARD']);
    }
    return Promise.resolve(defaultValue);
  }),
  getInteger: jest.fn().mockResolvedValue(10485760),
}));

jest.mock('@/shared/storage/file-storage-provider', () => ({
  fileStorageProvider: {
    generateUploadUrl: jest.fn().mockResolvedValue({
      uploadUrl: '/api/upload-mock',
      storageKey: 'drivers/dp-1/driving_license_123.pdf',
    }),
    generateDownloadUrl: jest.fn().mockResolvedValue('/api/download-mock'),
  },
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({ id: 'dp-1', userId: 'user-1' }),
}));

describe('DriverDocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDocumentUploadUrl', () => {
    it('generates upload URL for valid document parameters', async () => {
      const result = await createDocumentUploadUrl('user-1', {
        documentType: DriverDocumentType.DRIVING_LICENSE,
        fileName: 'dl.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 2048,
      });

      expect(result.uploadUrl).toBeDefined();
      expect(result.storageKey).toBeDefined();
    });

    it('rejects upload URL for invalid content type', async () => {
      await expect(
        createDocumentUploadUrl('user-1', {
          documentType: DriverDocumentType.DRIVING_LICENSE,
          fileName: 'executable.exe',
          contentType: 'application/x-executable',
          fileSizeBytes: 2048,
        }),
      ).rejects.toThrow(InvalidContentTypeError);
    });

    it('rejects upload URL for excessive file size', async () => {
      await expect(
        createDocumentUploadUrl('user-1', {
          documentType: DriverDocumentType.DRIVING_LICENSE,
          fileName: 'large.pdf',
          contentType: 'application/pdf',
          fileSizeBytes: 50000000,
        }),
      ).rejects.toThrow(FileTooLargeError);
    });
  });

  describe('registerUploadedDocument', () => {
    it('creates first document version when no previous document exists', async () => {
      mockTx.driverDocument.findFirst.mockResolvedValue(null);
      mockTx.driverDocument.create.mockResolvedValue({
        id: 'doc-1',
        driverProfileId: 'dp-1',
        documentType: DriverDocumentType.DRIVING_LICENSE,
        version: 1,
        isCurrent: true,
        status: DriverDocumentStatus.UPLOADED,
      });

      const doc = await registerUploadedDocument('user-1', {
        documentType: DriverDocumentType.DRIVING_LICENSE,
        storageKey: 'drivers/dp-1/dl_1.pdf',
        originalFileName: 'dl.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 2048,
      });

      expect(doc.version).toBe(1);
      expect(mockTx.driverDocument.create).toHaveBeenCalled();
    });

    it('supersedes existing current document and increments version', async () => {
      mockTx.driverDocument.findFirst.mockResolvedValue({
        id: 'doc-old',
        version: 1,
        isCurrent: true,
      });

      mockTx.driverDocument.create.mockResolvedValue({
        id: 'doc-2',
        driverProfileId: 'dp-1',
        documentType: DriverDocumentType.DRIVING_LICENSE,
        version: 2,
        isCurrent: true,
        status: DriverDocumentStatus.UPLOADED,
      });

      const doc = await registerUploadedDocument('user-1', {
        documentType: DriverDocumentType.DRIVING_LICENSE,
        storageKey: 'drivers/dp-1/dl_2.pdf',
        originalFileName: 'dl2.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 3000,
      });

      expect(mockTx.driverDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-old' },
        data: { isCurrent: false, status: DriverDocumentStatus.SUPERSEDED },
      });
      expect(doc.version).toBe(2);
    });
  });

  describe('verifyDocument', () => {
    it('verifies document and updates profile verification status if all required docs are verified', async () => {
      mockTx.driverDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        driverProfileId: 'dp-1',
        documentType: DriverDocumentType.DRIVING_LICENSE,
      });

      mockTx.driverDocument.update.mockResolvedValue({
        id: 'doc-1',
        status: DriverDocumentStatus.VERIFIED,
      });

      mockTx.driverDocument.findMany.mockResolvedValue([
        { documentType: DriverDocumentType.DRIVING_LICENSE, status: DriverDocumentStatus.VERIFIED },
        { documentType: DriverDocumentType.AADHAAR_CARD, status: DriverDocumentStatus.VERIFIED },
      ]);

      const doc = await verifyDocument('admin-1', 'doc-1');

      expect(doc.status).toBe(DriverDocumentStatus.VERIFIED);
      expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
        data: { verificationStatus: DriverVerificationStatus.VERIFIED },
      });
    });
  });
});
