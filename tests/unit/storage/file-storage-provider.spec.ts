import { redis } from '@/shared/redis/client';

jest.mock('@/shared/redis/client', () => ({
  redis: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('file-bytes')),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs/promises';
import { LocalPrivateStorageProvider } from '@/shared/storage/file-storage-provider';

const mockedGet = redis.get as jest.Mock;
const mockedSet = redis.set as jest.Mock;

describe('LocalPrivateStorageProvider — upload/download token issuance & verification', () => {
  let provider: LocalPrivateStorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new LocalPrivateStorageProvider('/tmp/test-storage');
  });

  it('generateUploadUrl stores a token in Redis with the requested TTL and returns a URL carrying it', async () => {
    const result = await provider.generateUploadUrl('drivers/dp-1/license.png', 'image/png', 300);

    expect(result.storageKey).toBe('drivers/dp-1/license.png');
    expect(result.uploadUrl).toContain('/api/driver/documents/upload-payload');
    expect(result.uploadUrl).toContain('key=');
    expect(result.uploadUrl).toContain('token=');
    expect(mockedSet).toHaveBeenCalledWith(
      'storage:upload-token:drivers/dp-1/license.png',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('verifyUploadToken succeeds only when the token matches what was issued', async () => {
    mockedGet.mockResolvedValue('the-real-token');

    await expect(
      provider.verifyUploadToken('drivers/dp-1/license.png', 'the-real-token'),
    ).resolves.toBe(true);
    await expect(
      provider.verifyUploadToken('drivers/dp-1/license.png', 'a-guessed-token'),
    ).resolves.toBe(false);
  });

  it('verifyUploadToken fails once the token has expired (no longer in Redis)', async () => {
    mockedGet.mockResolvedValue(null);
    await expect(provider.verifyUploadToken('drivers/dp-1/license.png', 'anything')).resolves.toBe(
      false,
    );
  });

  it('generateDownloadUrl stores a separate token namespace from upload tokens', async () => {
    await provider.generateDownloadUrl('drivers/dp-1/license.png', 300);
    expect(mockedSet).toHaveBeenCalledWith(
      'storage:download-token:drivers/dp-1/license.png',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('saveFile writes using only the basename of the storageKey (matching fileExists/deleteFile)', async () => {
    await provider.saveFile('drivers/dp-1/nested/license.png', Buffer.from('data'));
    const writeFileMock = fs.writeFile as jest.Mock;
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('license.png'),
      Buffer.from('data'),
    );
    expect(writeFileMock.mock.calls[0][0]).not.toContain('nested');
  });

  it('readFile reads back the same basename-keyed file', async () => {
    const data = await provider.readFile('drivers/dp-1/license.png');
    expect(data.toString()).toBe('file-bytes');
  });
});
