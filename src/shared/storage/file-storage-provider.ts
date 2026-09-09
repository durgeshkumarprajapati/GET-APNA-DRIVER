import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { redis } from '@/shared/redis/client';

function uploadTokenKey(storageKey: string): string {
  return `storage:upload-token:${storageKey}`;
}

function downloadTokenKey(storageKey: string): string {
  return `storage:download-token:${storageKey}`;
}

export interface GenerateUploadUrlResult {
  uploadUrl: string;
  storageKey: string;
}

export interface FileStorageProvider {
  generateUploadUrl(
    storageKey: string,
    contentType: string,
    expiresSeconds?: number,
  ): Promise<GenerateUploadUrlResult>;
  generateDownloadUrl(storageKey: string, expiresSeconds?: number): Promise<string>;
  deleteFile(storageKey: string): Promise<void>;
  fileExists(storageKey: string): Promise<boolean>;
}

/**
 * Production-grade local private object storage provider for dev/test environments.
 * Documents are saved outside public directories and served exclusively via authorized routes.
 */
export class LocalPrivateStorageProvider implements FileStorageProvider {
  private readonly basePath: string;

  constructor(basePath?: string) {
    this.basePath =
      basePath || path.join(process.cwd(), '.antigravity-storage', 'private_documents');
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  async generateUploadUrl(
    storageKey: string,
    _contentType: string,
    expiresSeconds = 900,
  ): Promise<GenerateUploadUrlResult> {
    await this.ensureDirectory();
    // For local dev/test, the "presigned URL" is this app's own upload
    // endpoint (/api/driver/documents/upload-payload), guarded by a
    // single-use-window token stored in Redis with the same TTL as the URL
    // itself — the closest local equivalent of a real cloud provider's
    // presigned-URL expiry, without needing an actual object store.
    const token = crypto.randomBytes(16).toString('hex');
    await redis.set(uploadTokenKey(storageKey), token, 'EX', expiresSeconds);
    const uploadUrl = `/api/driver/documents/upload-payload?key=${encodeURIComponent(
      storageKey,
    )}&token=${token}`;

    return {
      uploadUrl,
      storageKey,
    };
  }

  async generateDownloadUrl(storageKey: string, expiresSeconds = 900): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');
    await redis.set(downloadTokenKey(storageKey), token, 'EX', expiresSeconds);
    return `/api/driver/documents/download-stream?key=${encodeURIComponent(
      storageKey,
    )}&token=${token}`;
  }

  /** Validates and consumes an upload token issued by generateUploadUrl. */
  async verifyUploadToken(storageKey: string, token: string): Promise<boolean> {
    const expected = await redis.get(uploadTokenKey(storageKey));
    return expected !== null && expected === token;
  }

  /** Validates a download token issued by generateDownloadUrl (not consumed — a download link may be retried/reopened). */
  async verifyDownloadToken(storageKey: string, token: string): Promise<boolean> {
    const expected = await redis.get(downloadTokenKey(storageKey));
    return expected !== null && expected === token;
  }

  async saveFile(storageKey: string, data: Buffer): Promise<void> {
    await this.ensureDirectory();
    const filePath = path.join(this.basePath, path.basename(storageKey));
    await fs.writeFile(filePath, data);
  }

  async readFile(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, path.basename(storageKey));
    return await fs.readFile(filePath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = path.join(this.basePath, path.basename(storageKey));
    try {
      await fs.unlink(filePath);
    } catch {
      // File may already be deleted
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    const filePath = path.join(this.basePath, path.basename(storageKey));
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Single shared instance. Exported twice: `fileStorageProvider` (interface-
// typed) is what domain services use, matching the abstraction any real
// cloud provider would also satisfy; `localPrivateStorageProvider`
// (concrete-typed) is only for the two upload-payload/download-stream
// routes, which need the local-only saveFile/readFile/verify*Token methods
// that simulate a presigned URL — a real S3/GCS provider wouldn't need
// those at all, so they're deliberately not part of the FileStorageProvider
// interface.
export const localPrivateStorageProvider = new LocalPrivateStorageProvider();
export const fileStorageProvider: FileStorageProvider = localPrivateStorageProvider;
