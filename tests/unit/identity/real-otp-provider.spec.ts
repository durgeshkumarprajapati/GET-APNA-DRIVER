import {
  maskPhoneNumber,
  DevelopmentOtpDeliveryProvider,
  MockOtpDeliveryProvider,
  TwilioSmsProvider,
  Msg91SmsProvider,
  Fast2SmsProvider,
  createOtpDeliveryProvider,
} from '@/modules/identity/infrastructure/otp-provider';

describe('Real OTP Provider Abstraction', () => {
  describe('maskPhoneNumber', () => {
    it('masks middle digits of standard E.164 Indian phone numbers', () => {
      const masked = maskPhoneNumber('+919876543210');
      expect(masked).toBe('+919****10');
    });

    it('handles short strings safely', () => {
      expect(maskPhoneNumber('123')).toBe('***');
    });
  });

  describe('DevelopmentOtpDeliveryProvider', () => {
    it('logs masked phone number and OTP without throwing', async () => {
      const provider = new DevelopmentOtpDeliveryProvider();
      await expect(provider.sendOtp('+919876543210', '123456')).resolves.not.toThrow();
    });
  });

  describe('MockOtpDeliveryProvider', () => {
    it('records sent OTP messages in memory and retrieves last OTP', async () => {
      const mockProvider = new MockOtpDeliveryProvider();
      await mockProvider.sendOtp('+919876543210', '111111');
      await mockProvider.sendOtp('+919876543210', '222222');

      expect(mockProvider.sentMessages).toHaveLength(2);
      expect(mockProvider.getLastOtp('+919876543210')).toBe('222222');

      mockProvider.clear();
      expect(mockProvider.sentMessages).toHaveLength(0);
      expect(mockProvider.getLastOtp('+919876543210')).toBeUndefined();
    });
  });

  describe('TwilioSmsProvider', () => {
    it('falls back to dev provider if credentials are missing', async () => {
      const twilio = new TwilioSmsProvider('', '', '');
      await expect(twilio.sendOtp('+919876543210', '654321')).resolves.not.toThrow();
    });

    it('dispatches HTTP request when credentials are provided', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ sid: 'SM123' }),
      } as Response);

      const twilio = new TwilioSmsProvider('AC123', 'AUTH_TOKEN', '+1234567890');
      await twilio.sendOtp('+919876543210', '654321');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );

      fetchSpy.mockRestore();
    });
  });

  describe('Msg91SmsProvider', () => {
    it('falls back to dev provider if auth key is missing', async () => {
      const msg91 = new Msg91SmsProvider('', '');
      await expect(msg91.sendOtp('+919876543210', '123456')).resolves.not.toThrow();
    });

    it('dispatches POST request when auth key is present', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ type: 'success' }),
      } as Response);

      const msg91 = new Msg91SmsProvider('MSG91_KEY', 'TEMP123');
      await msg91.sendOtp('+919876543210', '123456');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://control.msg91.com/api/v5/otp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authkey: 'MSG91_KEY',
          }),
        }),
      );

      fetchSpy.mockRestore();
    });
  });

  describe('Fast2SmsProvider', () => {
    it('falls back to dev provider if API key is missing', async () => {
      const fast2sms = new Fast2SmsProvider('');
      await expect(fast2sms.sendOtp('+919876543210', '123456')).resolves.not.toThrow();
    });

    it('dispatches POST request when API key is present', async () => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ return: true }),
      } as Response);

      const fast2sms = new Fast2SmsProvider('FAST_KEY');
      await fast2sms.sendOtp('+919876543210', '123456');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://www.fast2sms.com/dev/bulkV2',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            authorization: 'FAST_KEY',
          }),
        }),
      );

      fetchSpy.mockRestore();
    });
  });

  describe('createOtpDeliveryProvider', () => {
    it('returns a MockOtpDeliveryProvider in test environment', () => {
      const provider = createOtpDeliveryProvider();
      expect(provider).toBeInstanceOf(MockOtpDeliveryProvider);
    });
  });
});
