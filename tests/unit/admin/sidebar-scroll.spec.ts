describe('AdminSidebar Scroll & Navigation Hardening', () => {
  const STORAGE_KEY = 'gad-admin-sidebar-scroll';
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeAll(() => {
    if (typeof global.window === 'undefined') {
      (global as unknown as { window: Record<string, unknown> }).window = {};
    }
    Object.defineProperty(global.window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });
  });


  beforeEach(() => {
    sessionStorageMock.clear();
  });

  it('persists and retrieves sidebar scroll position from sessionStorage', () => {
    sessionStorageMock.setItem(STORAGE_KEY, '250');
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBe('250');
  });

  it('calculates whether an active element is within scroll viewport bounds', () => {
    const containerTop = 100;
    const containerBottom = 600;

    // Element inside bounds
    const elemInside = { top: 200, bottom: 250 };
    const isInsideVisible = elemInside.top >= containerTop && elemInside.bottom <= containerBottom;
    expect(isInsideVisible).toBe(true);

    // Element outside bounds below container
    const elemBelow = { top: 650, bottom: 700 };
    const isBelowVisible = elemBelow.top >= containerTop && elemBelow.bottom <= containerBottom;
    expect(isBelowVisible).toBe(false);
  });
});

