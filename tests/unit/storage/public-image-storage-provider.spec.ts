jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('image-bytes')),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs/promises';
import { LocalPublicImageStorageProvider } from '@/shared/storage/public-image-storage-provider';

describe('LocalPublicImageStorageProvider — profile picture storage (public, no token gate)', () => {
  let provider: LocalPublicImageStorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new LocalPublicImageStorageProvider('/tmp/test-avatars', '/api/uploads/avatars');
  });

  it('saveImage writes the file and returns a publicUrl pointing at the serving route', async () => {
    const result = await provider.saveImage(Buffer.from('bytes'), 'image/png');

    expect(result.storageKey).toMatch(/\.png$/);
    expect(result.publicUrl).toBe(`/api/uploads/avatars/${result.storageKey}`);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(result.storageKey),
      Buffer.from('bytes'),
    );
  });

  it('rejects an unsupported content type rather than silently saving an arbitrary file', async () => {
    await expect(provider.saveImage(Buffer.from('bytes'), 'application/pdf')).rejects.toThrow(
      'Unsupported image content type',
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('readImage reads back by basename only (defends against a path-traversal key)', async () => {
    const data = await provider.readImage('../../etc/passwd.jpg');
    expect(data.toString()).toBe('image-bytes');
    const readFileMock = fs.readFile as jest.Mock;
    expect(readFileMock.mock.calls[0][0]).not.toContain('..');
  });

  it('storageKeyFromPublicUrl extracts the key only for URLs this provider actually issued', () => {
    expect(provider.storageKeyFromPublicUrl('/api/uploads/avatars/abc123.jpg')).toBe('abc123.jpg');
    // The upload routes store an absolute URL (scheme+host prepended) so it
    // satisfies a z.string().url() field elsewhere — must still match.
    expect(
      provider.storageKeyFromPublicUrl('https://app.example.com/api/uploads/avatars/abc123.jpg'),
    ).toBe('abc123.jpg');
    // An externally-pasted avatar URL (the old customer "paste a URL" field)
    // must never be treated as a local file this provider can delete.
    expect(provider.storageKeyFromPublicUrl('https://example.com/avatar.jpg')).toBeNull();
    expect(provider.storageKeyFromPublicUrl(null)).toBeNull();
  });

  it('contentTypeForStorageKey maps the file extension back to a real MIME type, or null for anything unrecognized', () => {
    expect(provider.contentTypeForStorageKey('abc.jpg')).toBe('image/jpeg');
    expect(provider.contentTypeForStorageKey('abc.webp')).toBe('image/webp');
    expect(provider.contentTypeForStorageKey('abc.exe')).toBeNull();
  });

  it('deleteImage never throws even if the underlying file is already gone', async () => {
    (fs.unlink as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));
    await expect(provider.deleteImage('missing.jpg')).resolves.toBeUndefined();
  });
});
