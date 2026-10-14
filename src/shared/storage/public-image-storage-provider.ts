import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/** Allowlisted upload content types -> file extension and served Content-Type. */
export const ALLOWED_AVATAR_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface SavedPublicImage {
  storageKey: string;
  publicUrl: string;
}

/**
 * Local public object storage for profile pictures (driver & customer
 * avatars). Unlike LocalPrivateStorageProvider (file-storage-provider.ts),
 * these files are meant to be viewed by anyone who can see the profile —
 * the counterpart in a booking, an admin, etc. — so there is no
 * token-gated access check on read, only on the owning user's ability to
 * upload/replace their own avatar (enforced by the route, not this class).
 *
 * The storage key is a server-generated random UUID + extension, never a
 * user-supplied path, so there's nothing to path-traverse; `path.basename`
 * is still applied defensively on every disk access.
 */
export class LocalPublicImageStorageProvider {
  private readonly basePath: string;
  private readonly publicUrlPrefix: string;

  constructor(basePath?: string, publicUrlPrefix = '/api/uploads/avatars') {
    this.basePath = basePath || path.join(process.cwd(), '.antigravity-storage', 'public_avatars');
    this.publicUrlPrefix = publicUrlPrefix;
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  async saveImage(data: Buffer, contentType: string): Promise<SavedPublicImage> {
    const extension = ALLOWED_AVATAR_CONTENT_TYPES[contentType];
    if (!extension) {
      throw new Error(`Unsupported image content type: ${contentType}`);
    }

    await this.ensureDirectory();
    const storageKey = `${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(this.basePath, path.basename(storageKey));
    await fs.writeFile(filePath, data);

    return {
      storageKey,
      publicUrl: `${this.publicUrlPrefix}/${storageKey}`,
    };
  }

  async readImage(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, path.basename(storageKey));
    return await fs.readFile(filePath);
  }

  /** Best-effort — deleting a prior avatar must never block replacing it. */
  async deleteImage(storageKey: string): Promise<void> {
    const filePath = path.join(this.basePath, path.basename(storageKey));
    try {
      await fs.unlink(filePath);
    } catch {
      // Already gone, or never existed under this provider — ignore.
    }
  }

  /**
   * Extracts the storage key from a previously issued publicUrl, only when
   * it was actually issued by this provider — an externally-pasted avatar
   * URL (e.g. the old "paste a URL" customer field) must never be treated
   * as a local file to delete. Matches the prefix anywhere in the string
   * (not just at the start) since publicUrl may be stored as either a
   * relative path or an absolute URL (scheme+host prepended by the caller
   * so it satisfies a z.string().url() field elsewhere) — both contain the
   * same `{prefix}/{key}` suffix.
   */
  storageKeyFromPublicUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const marker = `${this.publicUrlPrefix}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    const key = url.slice(index + marker.length);
    return key || null;
  }

  contentTypeForStorageKey(storageKey: string): string | null {
    const extension = path.extname(storageKey).slice(1).toLowerCase();
    const entry = Object.entries(ALLOWED_AVATAR_CONTENT_TYPES).find(([, ext]) => ext === extension);
    return entry ? entry[0] : null;
  }
}

export const localPublicImageStorageProvider = new LocalPublicImageStorageProvider();
