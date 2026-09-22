import {
  useAutoWebPush,
  GAD_WEB_PUSH_ENABLED_KEY,
  syncWebPush,
} from '@/components/use-auto-web-push';

describe('Phase 68: Client-Side Auto Web Push Hook & Persistence', () => {
  const originalFetch = global.fetch;
  let mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    mockLocalStorage = {};
    jest.clearAllMocks();

    const winObj = global as unknown as Record<string, unknown>;
    winObj.window = winObj;

    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] ?? null,
        setItem: (key: string, val: string) => {
          mockLocalStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          mockLocalStorage = {};
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('detects unsupported environment gracefully', async () => {
    delete (global as unknown as Record<string, unknown>).Notification;

    const syncRes = await syncWebPush();
    expect(syncRes).toBe(false);
  });

  it('automatically syncs existing granted permission without re-prompting user', async () => {
    const mockSubscribe = jest.fn().mockResolvedValue({
      endpoint: 'https://push.example.com/sub-123',
      getKey: (type: string) => {
        if (type === 'p256dh') return new Uint8Array([1, 2, 3]).buffer;
        if (type === 'auth') return new Uint8Array([4, 5, 6]).buffer;
        return null;
      },
    });

    const mockGetSubscription = jest.fn().mockResolvedValue(null);
    const mockRegister = jest.fn().mockResolvedValue({
      pushManager: {
        getSubscription: mockGetSubscription,
        subscribe: mockSubscribe,
      },
    });

    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'granted',
        requestPermission: jest.fn().mockResolvedValue('granted'),
      },
      writable: true,
      configurable: true,
    });

    const mockPushManager = function PushManager() {};
    Object.defineProperty(global, 'PushManager', {
      value: mockPushManager,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: { register: mockRegister },
        PushManager: mockPushManager,
        userAgent: 'Jest Browser',
      },
      writable: true,
      configurable: true,
    });

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/push/vapid-public-key')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              publicKey:
                'BNcR1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890',
            }),
        });
      }
      if (url.includes('/api/push/subscribe')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as jest.Mock;

    const result = await syncWebPush().catch((e) => {
      console.error('syncWebPush error in test:', e);
      return false;
    });

    expect(result).toBe(true);
    expect(mockLocalStorage[GAD_WEB_PUSH_ENABLED_KEY]).toBe('true');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/push/subscribe',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('does NOT automatically prompt user when permission is default', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue('default');
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
      writable: true,
      configurable: true,
    });
    const mockPM = function PushManager() {};
    Object.defineProperty(global, 'PushManager', {
      value: mockPM,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: { register: jest.fn() },
        PushManager: mockPM,
        userAgent: 'Jest Browser',
      },
      writable: true,
      configurable: true,
    });

    const result = await syncWebPush();

    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('prompts user and syncs when enablePush is explicitly called with promptIfDefault', async () => {
    const mockSubscribe = jest.fn().mockResolvedValue({
      endpoint: 'https://push.example.com/sub-456',
      getKey: (type: string) => {
        if (type === 'p256dh') return new Uint8Array([1, 2, 3]).buffer;
        if (type === 'auth') return new Uint8Array([4, 5, 6]).buffer;
        return null;
      },
    });

    const mockRequestPermission = jest.fn().mockResolvedValue('granted');
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
      writable: true,
      configurable: true,
    });
    const mockPM = function PushManager() {};
    Object.defineProperty(global, 'PushManager', {
      value: mockPM,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: jest.fn().mockResolvedValue({
            pushManager: {
              getSubscription: jest.fn().mockResolvedValue(null),
              subscribe: mockSubscribe,
            },
          }),
        },
        PushManager: mockPM,
        userAgent: 'Jest Browser',
      },
      writable: true,
      configurable: true,
    });

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/push/vapid-public-key')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              publicKey:
                'BNcR1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890',
            }),
        });
      }
      if (url.includes('/api/push/subscribe')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as jest.Mock;

    const result = await syncWebPush({ promptIfDefault: true });

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(mockLocalStorage[GAD_WEB_PUSH_ENABLED_KEY]).toBe('true');
  });

  it('hook exports useAutoWebPush correctly', () => {
    expect(typeof useAutoWebPush).toBe('function');
  });
});
