import {
  generateSecureRidePin,
  validatePinPolicy,
  setCustomerRidePin,
  verifyCustomerRidePin,
  InvalidRidePinFormatError,
  CustomerPinNotSetError,
} from '@/modules/customer/application/services/ride-pin-service';

describe('Phase 26 — Customer 6-Digit Ride PIN Service', () => {
  it('generates a valid 6-digit numeric Ride PIN', () => {
    const pin = generateSecureRidePin();
    expect(pin).toMatch(/^\d{6}$/);
    expect(typeof pin).toBe('string');
  });

  it('validates pin policy correctly', () => {
    expect(() => validatePinPolicy('729104')).not.toThrow();
    expect(() => validatePinPolicy('004821')).not.toThrow();

    // Rejects weak repeating / sequential PINs
    expect(() => validatePinPolicy('000000')).toThrow(InvalidRidePinFormatError);
    expect(() => validatePinPolicy('111111')).toThrow(InvalidRidePinFormatError);
    expect(() => validatePinPolicy('123456')).toThrow(InvalidRidePinFormatError);
    expect(() => validatePinPolicy('654321')).toThrow(InvalidRidePinFormatError);

    // Rejects non-6-digit or non-numeric PINs
    expect(() => validatePinPolicy('12345')).toThrow(InvalidRidePinFormatError);
    expect(() => validatePinPolicy('1234567')).toThrow(InvalidRidePinFormatError);
    expect(() => validatePinPolicy('ABCDEF')).toThrow(InvalidRidePinFormatError);
  });

  it('hashes and verifies customer Ride PIN securely', async () => {
    let storedHash: string | null = null;
    const mockDb = {
      customerProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'profile-1',
          userId: 'user-1',
          customerRidePinHash: storedHash,
        }),
        update: jest.fn().mockImplementation(async ({ data }) => {
          storedHash = data.customerRidePinHash;
          return {
            id: 'profile-1',
            customerRidePinCreatedAt: new Date(),
            customerRidePinUpdatedAt: new Date(),
          };
        }),
      },
    };

    const setRes = await setCustomerRidePin('user-1', '849201', mockDb as unknown as Parameters<typeof setCustomerRidePin>[2]);
    expect(setRes.isPinSet).toBe(true);

    mockDb.customerProfile.findFirst.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      customerRidePinHash: storedHash,
    });

    const isValid = await verifyCustomerRidePin('user-1', '849201', mockDb as unknown as Parameters<typeof verifyCustomerRidePin>[2]);
    expect(isValid).toBe(true);

    const isWrong = await verifyCustomerRidePin('user-1', '999999', mockDb as unknown as Parameters<typeof verifyCustomerRidePin>[2]);
    expect(isWrong).toBe(false);
  });

  it('throws CustomerPinNotSetError if PIN has not been configured', async () => {
    const mockDb = {
      customerProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'profile-null',
          userId: 'user-null',
          customerRidePinHash: null,
        }),
      },
    };

    await expect(
      verifyCustomerRidePin('user-null', '123456', mockDb as unknown as Parameters<typeof verifyCustomerRidePin>[2]),
    ).rejects.toThrow(CustomerPinNotSetError);
  });
});
