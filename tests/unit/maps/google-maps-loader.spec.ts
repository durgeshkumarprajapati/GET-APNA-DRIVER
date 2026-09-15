import {
  loadGoogleMapsScript,
  resetGoogleMapsLoaderForTest,
} from '@/modules/maps/infrastructure/google-maps-loader';

describe('Google Maps Script Loader Tests', () => {
  let originalWindow: unknown;

  beforeAll(() => {
    originalWindow = global.window;
  });

  afterAll(() => {
    if (originalWindow !== undefined) {
      global.window = originalWindow as Window & typeof globalThis;
    } else {
      delete (global as unknown as { window?: unknown }).window;
    }
  });

  beforeEach(() => {
    resetGoogleMapsLoaderForTest();

    const mockElement = {
      src: '',
      async: false,
      defer: false,
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    const mockDocument = {
      querySelector: jest.fn().mockReturnValue(null),
      createElement: jest.fn().mockReturnValue(mockElement),
      head: {
        appendChild: jest.fn(),
      },
    };

    global.window = {
      document: mockDocument,
    } as unknown as Window & typeof globalThis;

    global.document = mockDocument as unknown as Document;
  });

  it('should reject if API key is missing and env var is not set', async () => {
    const originalKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    await expect(loadGoogleMapsScript()).rejects.toThrow('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.');

    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalKey;
  });

  it('should append script element to document head when API key is present', async () => {
    const apiKey = 'AIzaSyTestApiKeyForUnitTesting';

    const promise = loadGoogleMapsScript(apiKey);

    expect(global.document.createElement).toHaveBeenCalledWith('script');
    expect(global.document.head.appendChild).toHaveBeenCalled();

    // Simulate window.google script load callback
    (global.window as unknown as { google: { maps: { importLibrary: jest.Mock } } }).google = {
      maps: {
        importLibrary: jest.fn().mockResolvedValue({}),
      },
    };

    const createdScript = (global.document.createElement as jest.Mock).mock.results[0].value;
    createdScript.onload();

    await expect(promise).resolves.toBeUndefined();
  });

  it('should return existing resolved promise on duplicate load calls', async () => {
    const apiKey = 'AIzaSyTestApiKeyForUnitTesting';

    const promise1 = loadGoogleMapsScript(apiKey);
    const promise2 = loadGoogleMapsScript(apiKey);

    expect(promise1).toBe(promise2);

    const createdScript = (global.document.createElement as jest.Mock).mock.results[0].value;
    createdScript.onload();

    await promise1;
    await promise2;
  });
});
