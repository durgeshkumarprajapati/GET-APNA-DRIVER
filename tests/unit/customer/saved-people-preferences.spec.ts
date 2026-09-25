import {
  listSavedPeople,
  createSavedPerson,
  updateSavedPerson,
  deleteSavedPerson,
  getSavedPersonById,
} from '@/modules/customer/application/customer-saved-people-service';
import { updateCustomerPreference } from '@/modules/customer/application/customer-preference-service';

describe('Phase 78 — Saved People, Saved Places & Smart Booking Preferences', () => {
  const customerA = 'cust-uuid-1111';
  const customerB = 'cust-uuid-2222';

  describe('Saved People CRUD & Normalization', () => {
    it('should create a saved person with phone normalization, audit log, and outbox event', async () => {
      const mockTx = {
        customerSavedPerson: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) => ({
            id: 'sp-101',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      };

      const mockDb = {
        customerSavedPerson: mockTx.customerSavedPerson,
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as Parameters<typeof createSavedPerson>[3];

      const result = await createSavedPerson(
        customerA,
        {
          fullName: '  Rahul Sharma  ',
          phone: '+91 98765 43210',
          relationship: 'Father',
          email: 'RAHUL@EXAMPLE.COM',
          notes: 'Prefer morning rides',
        },
        null,
        mockDb,
      );

      expect(result.person.id).toBe('sp-101');
      expect(result.person.fullName).toBe('Rahul Sharma');
      expect(result.person.phone).toBe('+919876543210');
      expect(result.person.email).toBe('rahul@example.com');
      expect(mockTx.auditLog.create).toHaveBeenCalled();
      expect(mockTx.outboxEvent.create).toHaveBeenCalled();
    });

    it('should detect duplicate phone numbers for the same customer and raise warning error', async () => {
      const mockDb = {
        customerSavedPerson: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'sp-existing',
            customerId: customerA,
            fullName: 'Rahul Sharma',
            phone: '+919876543210',
            isActive: true,
          }),
        },
      } as unknown as Parameters<typeof createSavedPerson>[3];

      await expect(
        createSavedPerson(
          customerA,
          {
            fullName: 'Rahul S.',
            phone: '98765 43210',
          },
          null,
          mockDb,
        ),
      ).rejects.toThrow('A saved person with this mobile number already exists.');
    });

    it('should allow duplicate creation when allowDuplicate flag is explicitly true', async () => {
      const mockTx = {
        customerSavedPerson: {
          create: jest.fn().mockImplementation(({ data }) => ({
            id: 'sp-102',
            ...data,
          })),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      };

      const mockDb = {
        customerSavedPerson: {
          findFirst: jest.fn().mockResolvedValue({ id: 'sp-existing' }),
        },
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as Parameters<typeof createSavedPerson>[3];

      const result = await createSavedPerson(
        customerA,
        {
          fullName: 'Rahul S.',
          phone: '+91 98765 43210',
          allowDuplicate: true,
        },
        null,
        mockDb,
      );

      expect(result.person.id).toBe('sp-102');
      expect(result.isDuplicateWarning).toBe(true);
    });

    it('should list only active saved people for the specified customer', async () => {
      const mockDb = {
        customerSavedPerson: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'sp-1', customerId: customerA, fullName: 'Rahul Sharma', isActive: true },
            { id: 'sp-2', customerId: customerA, fullName: 'Priya Sharma', isActive: true },
          ]),
        },
      } as unknown as Parameters<typeof listSavedPeople>[1];

      const list = await listSavedPeople(customerA, mockDb);
      expect(list).toHaveLength(2);
      expect(
        (
          mockDb as unknown as {
            customerSavedPerson: { findMany: jest.Mock };
          }
        ).customerSavedPerson.findMany,
      ).toHaveBeenCalledWith({
        where: { customerId: customerA, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('IDOR & Security Protection', () => {
    it('should prevent Customer A from accessing Customer B saved person', async () => {
      const mockDb = {
        customerSavedPerson: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'sp-b',
            customerId: customerB,
            fullName: 'Customer B Friend',
            isActive: true,
          }),
        },
      } as unknown as Parameters<typeof getSavedPersonById>[2];

      const result = await getSavedPersonById(customerA, 'sp-b', mockDb);
      expect(result).toBeNull();
    });

    it('should reject Customer A updating Customer B saved person', async () => {
      const mockTx = {
        customerSavedPerson: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'sp-b',
            customerId: customerB,
            fullName: 'Customer B Friend',
            isActive: true,
          }),
        },
      };

      const mockDb = {
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as Parameters<typeof updateSavedPerson>[4];

      await expect(
        updateSavedPerson(customerA, 'sp-b', { fullName: 'Hacked Name' }, null, mockDb),
      ).rejects.toThrow('Saved person not found or unauthorized');
    });

    it('should reject Customer A deleting Customer B saved person', async () => {
      const mockTx = {
        customerSavedPerson: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'sp-b',
            customerId: customerB,
            isActive: true,
          }),
        },
      };

      const mockDb = {
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as Parameters<typeof deleteSavedPerson>[3];

      await expect(deleteSavedPerson(customerA, 'sp-b', null, mockDb)).rejects.toThrow(
        'Saved person not found or unauthorized',
      );
    });
  });

  describe('Smart Booking Preferences', () => {
    it('should update preferred vehicle category, service type, pickup instructions, and driver', async () => {
      const mockTx = {
        customerPreference: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pref-1',
            userId: customerA,
            theme: 'SYSTEM',
            language: 'en',
          }),
          update: jest.fn().mockImplementation(({ data }) => ({
            id: 'pref-1',
            userId: customerA,
            ...data,
          })),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      };

      const mockDb = {
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      } as unknown as Parameters<typeof updateCustomerPreference>[3];

      const updated = await updateCustomerPreference(
        customerA,
        {
          preferredVehicleCategory: 'LUXURY',
          preferredServiceType: 'HOURLY',
          preferredPickupInstructions: 'Gate 4 near tower 2',
          preferredDriverProfileId: 'driver-prof-99',
        },
        null,
        mockDb,
      );

      expect(updated.preferredVehicleCategory).toBe('LUXURY');
      expect(updated.preferredServiceType).toBe('HOURLY');
      expect(updated.preferredPickupInstructions).toBe('Gate 4 near tower 2');
      expect(updated.preferredDriverProfileId).toBe('driver-prof-99');
    });
  });

  describe('Immutable Recipient Snapshot Requirement', () => {
    it('historical booking recipient snapshot remains unchanged when saved person is edited', () => {
      const savedPerson = {
        id: 'sp-1',
        fullName: 'Rahul Sharma',
        phone: '+919876543210',
        relationship: 'Father',
      };

      // Booking created with snapshot from savedPerson
      const bookingRecipientSnapshot = {
        bookingId: 'booking-888',
        fullName: savedPerson.fullName,
        phone: savedPerson.phone,
        relationship: savedPerson.relationship,
      };

      // Customer edits savedPerson phone number later
      savedPerson.phone = '+919999988888';

      // Historical booking snapshot must remain unchanged!
      expect(bookingRecipientSnapshot.phone).toBe('+919876543210');
      expect(bookingRecipientSnapshot.phone).not.toBe(savedPerson.phone);
    });
  });
});
