import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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
    // For local dev/test, upload URL is directed to internal document upload endpoint or direct key token
    const token = crypto.randomBytes(16).toString('hex');
    const uploadUrl = `/api/driver/documents/upload-payload?key=${encodeURIComponent(
      storageKey,
    )}&token=${token}&expires=${Date.now() + expiresSeconds * 1000}`;

    return {
      uploadUrl,
      storageKey,
    };
  }

  async generateDownloadUrl(storageKey: string, expiresSeconds = 900): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + expiresSeconds * 1000;
    return `/api/driver/documents/download-stream?key=${encodeURIComponent(
      storageKey,
    )}&token=${token}&expires=${expiresAt}`;
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

export const fileStorageProvider: FileStorageProvider = new LocalPrivateStorageProvider();
